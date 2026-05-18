import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { mktDb } from "@/db/mkt-db";

interface Body {
  contactId: string;
  dealId?: string;
  reason?: string;
  moveToLost?: boolean;
}

export async function POST(req: Request) {
  try {
    const { contactId, dealId, reason, moveToLost }: Body = await req.json();
    if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

    const contact = db.select().from(contacts).where(eq(contacts.id, contactId)).get();
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    if (!contact.email) return NextResponse.json({ error: "Contact has no email — cannot match to marketing" }, { status: 400 });

    // Reset ready_for_sales in marketing DB so the contact reappears in marketing pipeline.
    // Non-fatal if marketing DB doesn't exist or has no matching contact.
    try {
      mktDb
        .prepare("UPDATE mkt_contacts SET ready_for_sales = 0, passed_to_sales_at = NULL WHERE email = ?")
        .run(contact.email);
    } catch {
      // continue
    }

    // Flag sales contact as returned to marketing — this hides it from the sales contacts list
    // and is the canonical truth that the contact is no longer "in sales".
    const now = new Date();
    const updateFields: Record<string, unknown> = {
      returnedToMarketingAt: now,
      returnedToMarketingReason: reason || null,
      updatedAt: now,
    };
    if (reason) {
      const prefix = `[Devuelto a marketing ${now.toISOString().slice(0, 10)}] `;
      updateFields.notes = contact.notes ? `${prefix}${reason}\n\n${contact.notes}` : `${prefix}${reason}`;
    }
    db.update(contacts).set(updateFields).where(eq(contacts.id, contactId)).run();

    // If a deal is provided, handle the deal-side action
    if (dealId) {
      const deal = db.select().from(deals).where(eq(deals.id, dealId)).get();
      if (deal) {
        if (moveToLost) {
          const lostStage = db.select().from(pipelineStages).where(eq(pipelineStages.isLost, true)).get();
          if (lostStage) {
            db.update(deals).set({
              stageId: lostStage.id,
              notes: reason ? `${deal.notes ?? ""}\n\nDevuelto a marketing: ${reason}`.trim() : deal.notes,
              updatedAt: new Date(),
            }).where(eq(deals.id, dealId)).run();
          }
        } else if (reason) {
          db.update(deals).set({
            notes: `${deal.notes ?? ""}\n\nDevuelto a marketing: ${reason}`.trim(),
            updatedAt: new Date(),
          }).where(eq(deals.id, dealId)).run();
        }
      }

      // Activity record for audit trail
      try {
        db.insert(activities).values({
          type: "note",
          description: `Devuelto a marketing${reason ? `: ${reason}` : ""}${moveToLost ? " (movido a Cerrado Perdido)" : ""}`,
          contactId,
          dealId,
          completedAt: new Date(),
        }).run();
      } catch {
        // non-fatal
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
