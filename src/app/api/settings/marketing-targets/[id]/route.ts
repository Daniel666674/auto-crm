import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { marketingTargets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.targetValue !== undefined) update.targetValue = Math.max(0, Math.round(Number(body.targetValue)));
  if (body.period !== undefined) update.period = String(body.period);
  if (body.metric !== undefined) update.metric = String(body.metric);
  if (body.year !== undefined) update.year = Number(body.year);
  if (body.month !== undefined) update.month = body.month === null ? null : Number(body.month);
  if (body.quarter !== undefined) update.quarter = body.quarter === null ? null : Number(body.quarter);

  const result = db.update(marketingTargets).set(update).where(eq(marketingTargets.id, id)).returning().get();
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  db.delete(marketingTargets).where(eq(marketingTargets.id, id)).run();
  return NextResponse.json({ success: true });
}
