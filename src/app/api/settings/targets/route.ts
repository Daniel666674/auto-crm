import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { salesTargets, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin" && role !== "marketing") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const results = db
    .select({
      id: salesTargets.id,
      userId: salesTargets.userId,
      period: salesTargets.period,
      year: salesTargets.year,
      month: salesTargets.month,
      quarter: salesTargets.quarter,
      targetValue: salesTargets.targetValue,
      createdAt: salesTargets.createdAt,
      updatedAt: salesTargets.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(salesTargets)
    .leftJoin(users, eq(salesTargets.userId, users.id))
    .all();

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  let body: {
    userId?: string;
    period?: string;
    year?: number;
    month?: number;
    quarter?: number;
    targetValue?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { userId, period, year, targetValue, month, quarter } = body;

  if (!userId || !period || !year) {
    return NextResponse.json(
      { error: "userId, period y year son requeridos" },
      { status: 400 }
    );
  }

  if (!["monthly", "quarterly", "annual"].includes(period)) {
    return NextResponse.json(
      { error: 'period debe ser "monthly", "quarterly" o "annual"' },
      { status: 400 }
    );
  }

  if (period === "monthly" && (!month || month < 1 || month > 12)) {
    return NextResponse.json(
      { error: "month (1-12) es requerido para period monthly" },
      { status: 400 }
    );
  }

  if (period === "quarterly" && (!quarter || quarter < 1 || quarter > 4)) {
    return NextResponse.json(
      { error: "quarter (1-4) es requerido para period quarterly" },
      { status: 400 }
    );
  }

  // Verify user exists
  const userExists = db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!userExists) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const now = new Date();
  const created = db
    .insert(salesTargets)
    .values({
      userId,
      period,
      year: Number(year),
      month: period === "monthly" ? Number(month) : null,
      quarter: period === "quarterly" ? Number(quarter) : null,
      targetValue: Math.max(0, Number(targetValue) || 0),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return NextResponse.json(created, { status: 201 });
}
