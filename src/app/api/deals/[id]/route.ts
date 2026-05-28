import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { deals, pipelineStages, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifySlackDealClosed } from "@/lib/slack";
import { fireTriggers } from "@/lib/triggers";
import { notifyUsers } from "@/lib/notify";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const deal = db.select().from(deals).where(eq(deals.id, id)).get();

  if (!deal) {
    return NextResponse.json(
      { error: "Deal no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(deal);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const existing = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updateData.title = body.title;
  if (body.value !== undefined) updateData.value = body.value;
  if (body.usdValue !== undefined) updateData.usdValue = body.usdValue === null ? null : Math.round(Number(body.usdValue));
  if (body.fxRate !== undefined) updateData.fxRate = body.fxRate === null ? null : Number(body.fxRate);
  if (body.contactId !== undefined) updateData.contactId = body.contactId;
  if (body.closeReasonId !== undefined) updateData.closeReasonId = body.closeReasonId || null;
  if (body.ownerId !== undefined) updateData.ownerId = body.ownerId || null;
  if (body.expectedClose !== undefined) {
    updateData.expectedClose = body.expectedClose ? new Date(body.expectedClose) : null;
  }
  if (body.probability !== undefined) {
    updateData.probability = Math.max(0, Math.min(100, Number(body.probability)));
  }
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.competitor !== undefined) updateData.competitor = body.competitor || null;
  if (body.isRecurring !== undefined) updateData.isRecurring = Boolean(body.isRecurring);
  if (body.recurringInterval !== undefined) updateData.recurringInterval = body.recurringInterval || null;
  if (body.customFields !== undefined) updateData.customFields = body.customFields ? JSON.stringify(body.customFields) : null;

  // Handle stage change — detect won/lost to set closedAt/closedBy
  if (body.stageId !== undefined && body.stageId !== existing.stageId) {
    updateData.stageId = body.stageId;
    const newStage = db.select().from(pipelineStages).where(eq(pipelineStages.id, body.stageId)).get();
    const wasAlreadyClosed = existing.closedAt != null;

    if (newStage && (newStage.isWon || newStage.isLost) && !wasAlreadyClosed) {
      updateData.closedAt = new Date();
      updateData.closedBy = session?.user?.id ?? null;

      // Fire Slack notification async (don't await — don't block the response)
      const contact = db.select().from(contacts).where(eq(contacts.id, existing.contactId)).get();
      const dealForSlack = {
        id: existing.id,
        title: body.title ?? existing.title,
        value: body.value ?? existing.value,
      };
      notifySlackDealClosed(dealForSlack, newStage, contact?.name ?? "—").catch(() => {});
      const triggerData = {
        dealId: existing.id,
        dealTitle: body.title ?? existing.title,
        stageId: body.stageId,
        stageName: newStage.name,
        isWon: newStage.isWon ? "true" : "false",
        isLost: newStage.isLost ? "true" : "false",
        contactId: existing.contactId,
        contactName: contact?.name ?? "",
        name: contact?.name ?? "",
        value: String(body.value ?? existing.value),
      };
      fireTriggers({ event: "deal_stage_changed", data: triggerData }).catch(() => {});
      if (newStage.isWon) fireTriggers({ event: "deal_won", data: triggerData }).catch(() => {});
      if (newStage.isLost) fireTriggers({ event: "deal_lost", data: triggerData }).catch(() => {});

      const dealLabel = triggerData.dealTitle || "Deal";
      const contactPart = triggerData.contactName ? ` · ${triggerData.contactName}` : "";
      if (newStage.isWon) {
        notifyUsers({
          type: "deal_won",
          title: "Deal ganado",
          body: `${dealLabel}${contactPart}`,
          priority: "high",
          resourceType: "deal", resourceId: existing.id,
          link: `/pipeline`,
        }).catch(() => {});
      } else if (newStage.isLost) {
        notifyUsers({
          type: "deal_lost",
          title: "Deal perdido",
          body: `${dealLabel}${contactPart}`,
          priority: "medium",
          resourceType: "deal", resourceId: existing.id,
          link: `/pipeline`,
        }).catch(() => {});
      } else {
        notifyUsers({
          type: "deal_stage_changed",
          title: "Deal movido",
          body: `${dealLabel} → ${newStage.name}${contactPart}`,
          priority: "medium",
          resourceType: "deal", resourceId: existing.id,
          link: `/pipeline`,
        }).catch(() => {});
      }
    } else if (newStage && !newStage.isWon && !newStage.isLost) {
      // Moving back to an active stage — clear closure
      updateData.closedAt = null;
      updateData.closedBy = null;
    }
  } else if (body.stageId !== undefined) {
    updateData.stageId = body.stageId;
  }

  const result = db
    .update(deals)
    .set(updateData)
    .where(eq(deals.id, id))
    .returning()
    .get();

  // M2: lifecycle auto-promotion — keep the contact's lifecycle stage in sync with deal progress
  if (body.stageId !== undefined && body.stageId !== existing.stageId) {
    try {
      const newStage = db.select().from(pipelineStages).where(eq(pipelineStages.id, body.stageId)).get();
      if (newStage) {
        const contact = db.select().from(contacts).where(eq(contacts.id, existing.contactId)).get();
        if (contact) {
          const LIFECYCLE = ["subscriber", "lead", "MQL", "SQL", "opportunity", "customer", "evangelist"];
          const currentIdx = LIFECYCLE.indexOf(contact.lifecycleStage ?? "lead");
          const contactUpdate: Record<string, unknown> = {};

          if (newStage.isWon) {
            // Won → promote to customer
            if (currentIdx < LIFECYCLE.indexOf("customer")) {
              contactUpdate.lifecycleStage = "customer";
            }
          } else if (newStage.isLost) {
            // Lost → check if no other active deals, then queue for re-engagement
            const allStages = db.select().from(pipelineStages).all();
            const closedStageIds = new Set(allStages.filter(s => s.isWon || s.isLost).map(s => s.id));
            const allDeals = db.select({ stageId: deals.stageId, id: deals.id }).from(deals).where(eq(deals.contactId, contact.id)).all();
            const hasOtherActiveDeal = allDeals.some(d => d.id !== id && !closedStageIds.has(d.stageId));
            if (!hasOtherActiveDeal && !contact.reengagementQueuedAt) {
              contactUpdate.reengagementQueuedAt = new Date();
            }
          } else {
            // Active stage move → promote to at least SQL if not already there
            const sqlIdx = LIFECYCLE.indexOf("SQL");
            if (currentIdx < sqlIdx) {
              contactUpdate.lifecycleStage = "SQL";
            }
          }

          if (Object.keys(contactUpdate).length > 0) {
            contactUpdate.updatedAt = new Date();
            db.update(contacts).set(contactUpdate).where(eq(contacts.id, contact.id)).run();
          }
        }
      }
    } catch { /* non-fatal lifecycle sync */ }
  }

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = db.select().from(deals).where(eq(deals.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });
  }

  db.delete(deals).where(eq(deals.id, id)).run();
  return NextResponse.json({ success: true });
}
