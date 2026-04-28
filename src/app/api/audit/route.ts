import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { desc, gte, lte, eq, and, sql } from "drizzle-orm";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.role !== "sales" && session.user.role !== "superadmin") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const action = searchParams.get("action");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions = [];
  if (action) conditions.push(eq(auditLog.action, action));
  if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
  if (to) conditions.push(lte(auditLog.createdAt, new Date(to)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();

  const total = (
    db
      .select({ count: sql<number>`count(*)` })
      .from(auditLog)
      .where(where)
      .get() as { count: number }
  ).count;

  return NextResponse.json({ rows, total, page, pageSize: PAGE_SIZE });
}
