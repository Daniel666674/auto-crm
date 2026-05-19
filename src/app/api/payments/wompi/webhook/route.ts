import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, pipelineStages, contacts, activities } from "@/db/schema";
import { eq } from "drizzle-orm";

// POST /api/payments/wompi/webhook
// MOCKUP: Receives Wompi's transaction.updated event payload.
// In production this validates HMAC signature against WOMPI_EVENTS_KEY.
// Body (mock): { event: "transaction.updated"; data: { transaction: { reference: string; status: "APPROVED"|"DECLINED"|"PENDING" } } }
//
// Real Wompi webhook payload reference:
// https://docs.wompi.co/docs/colombia/eventos/
// {
//   "event": "transaction.updated",
//   "data": { "transaction": { "id": "...", "reference": "...", "status": "APPROVED", "amount_in_cents": 50000, ... } },
//   "sent_at": "2024-01-01T00:00:00Z",
//   "signature": { "properties": [...], "checksum": "<sha256>" },
//   "environment": "prod"
// }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const txn = body?.data?.transaction;
    if (!txn?.reference || !txn?.status) {
      return NextResponse.json({ error: "missing transaction.reference or status" }, { status: 400 });
    }

    // TODO: validate HMAC signature in production
    // const valid = verifyWompiSignature(body, process.env.WOMPI_EVENTS_KEY);
    // if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

    const deal = db.select().from(deals).where(eq(deals.paymentReference, txn.reference)).get();
    if (!deal) {
      return NextResponse.json({ ok: false, reason: "no matching deal" });
    }

    const newStatus = String(txn.status).toUpperCase();
    const updateData: Record<string, unknown> = {
      paymentStatus: newStatus,
      updatedAt: new Date(),
    };

    let movedToWon = false;
    if (newStatus === "APPROVED") {
      updateData.paidAt = new Date();
      const wonStage = db.select().from(pipelineStages).where(eq(pipelineStages.isWon, true)).get();
      if (wonStage && deal.stageId !== wonStage.id) {
        updateData.stageId = wonStage.id;
        updateData.closedAt = new Date();
        movedToWon = true;
      }
    }

    db.update(deals).set(updateData).where(eq(deals.id, deal.id)).run();

    // Audit activity
    try {
      db.insert(activities).values({
        type: "note",
        description: `Pago Wompi ${newStatus} — ref ${txn.reference}${movedToWon ? " (deal movido a Ganado)" : ""}`,
        contactId: deal.contactId,
        dealId: deal.id,
        completedAt: new Date(),
      }).run();
    } catch { /* non-fatal */ }

    // If approved, sync contact lifecycle → customer
    if (newStatus === "APPROVED") {
      try {
        const contact = db.select().from(contacts).where(eq(contacts.id, deal.contactId)).get();
        if (contact && contact.lifecycleStage !== "customer" && contact.lifecycleStage !== "evangelist") {
          db.update(contacts).set({ lifecycleStage: "customer", updatedAt: new Date() }).where(eq(contacts.id, contact.id)).run();
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ ok: true, dealId: deal.id, newStatus, movedToWon });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
