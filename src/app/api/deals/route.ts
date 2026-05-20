import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { deals, contacts, pipelineStages } from "@/db/schema";
import { eq, desc, isNull } from "drizzle-orm";
import { fireTriggers } from "@/lib/triggers";

export async function GET(request: NextRequest) {
  const includeReturned = new URL(request.url).searchParams.get("includeReturned") === "true";

  const query = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      usdValue: deals.usdValue,
      fxRate: deals.fxRate,
      stageId: deals.stageId,
      contactId: deals.contactId,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      notes: deals.notes,
      ownerId: deals.ownerId,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactTemperature: contacts.temperature,
      stageName: pipelineStages.name,
      stageColor: pipelineStages.color,
      stageOrder: pipelineStages.order,
      stageIsWon: pipelineStages.isWon,
      stageIsLost: pipelineStages.isLost,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id));

  const results = includeReturned
    ? query.orderBy(desc(deals.createdAt)).all()
    : query.where(isNull(contacts.returnedToMarketingAt)).orderBy(desc(deals.createdAt)).all();

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }
  const { title, value, usdValue, fxRate, stageId, contactId, expectedClose, probability, notes, ownerId } = body;

  if (!title || !contactId) {
    return NextResponse.json(
      { error: "Titulo y contacto son requeridos" },
      { status: 400 }
    );
  }

  // Get first stage if none provided
  let finalStageId = stageId;
  if (!finalStageId) {
    const firstStage = db
      .select()
      .from(pipelineStages)
      .orderBy(pipelineStages.order)
      .limit(1)
      .get();
    finalStageId = firstStage?.id;
  }

  if (!finalStageId) {
    return NextResponse.json(
      { error: "No hay etapas de pipeline configuradas" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const result = db
      .insert(deals)
      .values({
        title,
        value: value || 0,
        usdValue: Number.isFinite(Number(usdValue)) && Number(usdValue) > 0 ? Math.round(Number(usdValue)) : null,
        fxRate: Number.isFinite(Number(fxRate)) && Number(fxRate) > 0 ? Number(fxRate) : null,
        stageId: finalStageId,
        contactId,
        expectedClose: expectedClose ? new Date(expectedClose) : null,
        probability: Math.max(0, Math.min(100, Number(probability) || 0)),
        notes: notes || null,
        ownerId: ownerId || session?.user?.id || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    fireTriggers({
      event: "deal_created",
      data: { dealId: result.id, dealTitle: result.title, value: String(result.value) },
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    if (msg.includes("FOREIGN KEY")) {
      return NextResponse.json(
        { error: "Contacto no encontrado" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Error al crear deal: ${msg}` },
      { status: 500 }
    );
  }
}
