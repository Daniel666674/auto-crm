import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { salesTargets } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
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

  const existing = db.select().from(salesTargets).where(eq(salesTargets.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
  }

  let body: {
    targetValue?: number;
    period?: string;
    year?: number;
    month?: number | null;
    quarter?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  if (body.targetValue !== undefined) {
    const tv = Number(body.targetValue);
    if (!Number.isFinite(tv) || tv < 0) {
      return NextResponse.json({ error: "targetValue debe ser un numero positivo" }, { status: 400 });
    }
    updateData.targetValue = Math.round(tv);
  }

  if (body.period !== undefined) {
    if (!["monthly", "quarterly", "annual"].includes(body.period)) {
      return NextResponse.json(
        { error: 'period debe ser "monthly", "quarterly" o "annual"' },
        { status: 400 }
      );
    }
    updateData.period = body.period;
  }

  if (body.year !== undefined) {
    const yr = Number(body.year);
    if (!Number.isInteger(yr) || yr < 2000 || yr > 2100) {
      return NextResponse.json({ error: "year invalido" }, { status: 400 });
    }
    updateData.year = yr;
  }

  if (body.month !== undefined) {
    if (body.month === null) {
      updateData.month = null;
    } else {
      const m = Number(body.month);
      if (!Number.isInteger(m) || m < 1 || m > 12) {
        return NextResponse.json({ error: "month debe ser entre 1 y 12" }, { status: 400 });
      }
      updateData.month = m;
    }
  }

  if (body.quarter !== undefined) {
    if (body.quarter === null) {
      updateData.quarter = null;
    } else {
      const q = Number(body.quarter);
      if (!Number.isInteger(q) || q < 1 || q > 4) {
        return NextResponse.json({ error: "quarter debe ser entre 1 y 4" }, { status: 400 });
      }
      updateData.quarter = q;
    }
  }

  const updated = db
    .update(salesTargets)
    .set(updateData)
    .where(eq(salesTargets.id, id))
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

  const existing = db.select().from(salesTargets).where(eq(salesTargets.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Objetivo no encontrado" }, { status: 404 });
  }

  db.delete(salesTargets).where(eq(salesTargets.id, id)).run();

  return NextResponse.json({ ok: true });
}
