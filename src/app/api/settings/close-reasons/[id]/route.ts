import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { closeReasons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const { id } = await params;

  const existing = db.select().from(closeReasons).where(eq(closeReasons.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Razon no encontrada" }, { status: 404 });
  }

  let body: { label?: string; order?: number; active?: boolean; type?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (body.label !== undefined) {
    if (typeof body.label !== "string" || body.label.trim().length === 0) {
      return NextResponse.json({ error: "label no puede estar vacio" }, { status: 400 });
    }
    updateData.label = body.label.trim();
  }

  if (body.order !== undefined) {
    const ord = Number(body.order);
    if (!Number.isFinite(ord)) {
      return NextResponse.json({ error: "order debe ser un numero" }, { status: 400 });
    }
    updateData.order = ord;
  }

  if (body.active !== undefined) {
    updateData.active = Boolean(body.active);
  }

  if (body.type !== undefined) {
    if (body.type !== "won" && body.type !== "lost") {
      return NextResponse.json({ error: 'type debe ser "won" o "lost"' }, { status: 400 });
    }
    updateData.type = body.type;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  const updated = db
    .update(closeReasons)
    .set(updateData)
    .where(eq(closeReasons.id, id))
    .returning()
    .get();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const { id } = await params;

  const existing = db.select().from(closeReasons).where(eq(closeReasons.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Razon no encontrada" }, { status: 404 });
  }

  db.delete(closeReasons).where(eq(closeReasons.id, id)).run();

  return NextResponse.json({ ok: true });
}
