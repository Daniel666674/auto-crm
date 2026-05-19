import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pipelineStages, deals, contacts, clients } from "@/db/schema";
import { eq, asc, isNull } from "drizzle-orm";

export async function GET() {
  const stages = db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.order))
    .all();

  // Exclude deals whose contact has been returned to marketing
  const allDeals = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      stageId: deals.stageId,
      contactId: deals.contactId,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      notes: deals.notes,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactName: contacts.name,
      contactTemperature: contacts.temperature,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .where(isNull(contacts.returnedToMarketingAt))
    .all();

  const pipeline = stages.map((stage) => ({
    ...stage,
    deals: allDeals.filter((d) => d.stageId === stage.id),
  }));

  return NextResponse.json(pipeline);
}

export async function PUT(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  // Update a single deal's stage (drag and drop)
  if (body.dealId && body.stageId) {
    const existing = db.select().from(deals).where(eq(deals.id, body.dealId)).get();
    if (!existing) {
      return NextResponse.json({ error: "Deal no encontrado" }, { status: 404 });
    }

    const stage = db.select().from(pipelineStages).where(eq(pipelineStages.id, body.stageId)).get();

    const result = db
      .update(deals)
      .set({
        stageId: body.stageId,
        probability: stage?.defaultProbability ?? existing.probability,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, body.dealId))
      .returning()
      .get();

    // Auto-create client when deal moves to a won stage
    if (stage?.isWon) {
      try {
        const alreadyClient = db.select({ id: clients.id })
          .from(clients).where(eq(clients.dealId, body.dealId)).get();
        if (!alreadyClient) {
          const deal = db.select().from(deals).where(eq(deals.id, body.dealId)).get();
          const contact = deal
            ? db.select().from(contacts).where(eq(contacts.id, deal.contactId)).get()
            : null;
          const now = new Date();
          db.insert(clients).values({
            id: crypto.randomUUID(),
            dealId: body.dealId,
            contactId: deal?.contactId || null,
            company: contact?.company || deal?.title || "—",
            name: contact?.name || "—",
            contractValue: deal?.value || 0,
            startDate: now,
            endDate: new Date(now.getTime() + 365 * 86400000),
            healthScore: 8,
            renewalStage: "Saludable",
            notes: null,
            createdAt: now,
            updatedAt: now,
          }).run();
        }
      } catch { /* skip on error */ }
    }

    return NextResponse.json(result);
  }

  // Bulk update stages (from /setup or /customize)
  if (body.stages && Array.isArray(body.stages)) {
    // Delete existing stages (only if no deals reference them)
    const existingDeals = db.select().from(deals).all();
    if (existingDeals.length > 0) {
      return NextResponse.json(
        {
          error:
            "No se pueden reemplazar etapas cuando hay deals activos. Elimina los deals primero.",
        },
        { status: 400 }
      );
    }

    db.delete(pipelineStages).run();

    for (const stage of body.stages) {
      db.insert(pipelineStages)
        .values({
          name: stage.name,
          order: stage.order,
          color: stage.color || "#64748b",
          isWon: stage.isWon || false,
          isLost: stage.isLost || false,
        })
        .run();
    }

    const updated = db
      .select()
      .from(pipelineStages)
      .orderBy(asc(pipelineStages.order))
      .all();

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Request invalido" }, { status: 400 });
}
