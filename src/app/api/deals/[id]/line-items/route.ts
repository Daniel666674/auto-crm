import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { dealLineItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = db
    .select()
    .from(dealLineItems)
    .where(eq(dealLineItems.dealId, id))
    .orderBy(asc(dealLineItems.order))
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { label?: string; quantity?: number; unitPrice?: number };
  if (!body.label?.trim()) return NextResponse.json({ error: "label requerido" }, { status: 400 });

  const existing = db.select().from(dealLineItems).where(eq(dealLineItems.dealId, id)).all();
  const maxOrder = existing.reduce((m, r) => Math.max(m, r.order), 0);

  const created = db.insert(dealLineItems).values({
    dealId: id,
    label: body.label.trim(),
    quantity: Math.max(1, Math.round(Number(body.quantity) || 1)),
    unitPrice: Math.max(0, Math.round(Number(body.unitPrice) || 0)),
    order: maxOrder + 1,
    createdAt: new Date(),
  }).returning().get();

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as { id?: string; label?: string; quantity?: number; unitPrice?: number };
  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.label !== undefined) patch.label = body.label.trim();
  if (body.quantity !== undefined) patch.quantity = Math.max(1, Math.round(Number(body.quantity) || 1));
  if (body.unitPrice !== undefined) patch.unitPrice = Math.max(0, Math.round(Number(body.unitPrice) || 0));

  db.update(dealLineItems).set(patch).where(eq(dealLineItems.id, body.id)).run();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const lineId = new URL(req.url).searchParams.get("lineId");
  if (!lineId) return NextResponse.json({ error: "lineId requerido" }, { status: 400 });
  db.delete(dealLineItems).where(eq(dealLineItems.id, lineId)).run();
  return NextResponse.json({ ok: true });
}
