import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { campaignOutcomes } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

  const update: Record<string, unknown> = {};
  if (body.label !== undefined) update.label = String(body.label).trim();
  if (body.type !== undefined) update.type = String(body.type);
  if (body.order !== undefined) update.order = Number(body.order);
  if (body.active !== undefined) update.active = Boolean(body.active);

  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const result = db.update(campaignOutcomes).set(update).where(eq(campaignOutcomes.id, id)).returning().get();
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

  db.delete(campaignOutcomes).where(eq(campaignOutcomes.id, id)).run();
  return NextResponse.json({ success: true });
}
