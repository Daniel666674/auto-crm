import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { pipelineStages, deals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  const { id } = await params;
  const stage = db.select().from(pipelineStages).where(eq(pipelineStages.id, id)).get();
  if (!stage) return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = String(body.name).trim().slice(0, 80);
  if (body.color !== undefined) update.color = String(body.color);
  if (body.order !== undefined) update.order = Number(body.order);
  if (body.isWon !== undefined) update.isWon = Boolean(body.isWon);
  if (body.isLost !== undefined) update.isLost = Boolean(body.isLost);

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });

  const updated = db.update(pipelineStages).set(update).where(eq(pipelineStages.id, id)).returning().get();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  const { id } = await params;
  const stage = db.select().from(pipelineStages).where(eq(pipelineStages.id, id)).get();
  if (!stage) return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });

  const dealsInStage = db.select().from(deals).where(eq(deals.stageId, id)).all();
  if (dealsInStage.length > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: hay ${dealsInStage.length} deal(s) en esta etapa. Muévelos primero.` },
      { status: 400 }
    );
  }

  db.delete(pipelineStages).where(eq(pipelineStages.id, id)).run();
  return NextResponse.json({ ok: true });
}
