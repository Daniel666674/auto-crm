import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { deals, pipelineStages, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifySlackDealClosed } from "@/lib/slack";
import { fireTriggers } from "@/lib/triggers";

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
  if (body.contactId !== undefined) updateData.contactId = body.contactId;
  if (body.closeReasonId !== undefined) updateData.closeReasonId = body.closeReasonId || null;
  if (body.expectedClose !== undefined) {
    updateData.expectedClose = body.expectedClose ? new Date(body.expectedClose) : null;
  }
  if (body.probability !== undefined) {
    updateData.probability = Math.max(0, Math.min(100, Number(body.probability)));
  }
  if (body.notes !== undefined) updateData.notes = body.notes;

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
      fireTriggers({
        event: "deal_stage_changed",
        data: {
          dealId: existing.id,
          dealTitle: body.title ?? existing.title,
          stageId: body.stageId,
          stageName: newStage.name,
          isWon: newStage.isWon ? "true" : "false",
          isLost: newStage.isLost ? "true" : "false",
          contactName: contact?.name ?? "",
          value: String(body.value ?? existing.value),
        },
      }).catch(() => {});
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
