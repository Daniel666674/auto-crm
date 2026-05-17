import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { marketingTargets, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

const VALID_METRICS = ["leads", "handoffs", "qualified", "engagement_rate"] as const;
const VALID_PERIODS = ["monthly", "quarterly", "annual"] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = db
    .select({
      id: marketingTargets.id,
      userId: marketingTargets.userId,
      userName: users.name,
      userEmail: users.email,
      metric: marketingTargets.metric,
      period: marketingTargets.period,
      year: marketingTargets.year,
      month: marketingTargets.month,
      quarter: marketingTargets.quarter,
      targetValue: marketingTargets.targetValue,
      updatedAt: marketingTargets.updatedAt,
    })
    .from(marketingTargets)
    .leftJoin(users, eq(marketingTargets.userId, users.id))
    .orderBy(desc(marketingTargets.updatedAt))
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.userId || !body.metric || !body.period) {
    return NextResponse.json({ error: "userId, metric y period son requeridos" }, { status: 400 });
  }
  if (!VALID_METRICS.includes(body.metric)) {
    return NextResponse.json({ error: `metric invalido. Opciones: ${VALID_METRICS.join(", ")}` }, { status: 400 });
  }
  if (!VALID_PERIODS.includes(body.period)) {
    return NextResponse.json({ error: `period invalido. Opciones: ${VALID_PERIODS.join(", ")}` }, { status: 400 });
  }

  const now = new Date();
  const result = db.insert(marketingTargets).values({
    userId: body.userId,
    metric: body.metric,
    period: body.period,
    year: Number(body.year ?? new Date().getFullYear()),
    month: body.month !== undefined && body.month !== null ? Number(body.month) : null,
    quarter: body.quarter !== undefined && body.quarter !== null ? Number(body.quarter) : null,
    targetValue: Math.max(0, Math.round(Number(body.targetValue ?? 0))),
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  return NextResponse.json(result, { status: 201 });
}
