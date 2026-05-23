import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { sql } from "drizzle-orm";
import { recomputeAllScores } from "@/lib/fit-recompute";

export const dynamic = "force-dynamic";

// GET — fit-score / tier distribution across all contacts (for the settings UI).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = db
    .select({ tier: contacts.fitTier, count: sql<number>`count(*)` })
    .from(contacts)
    .groupBy(contacts.fitTier)
    .all();

  const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of rows) {
    const t = (r.tier || "D") as keyof typeof dist;
    if (t in dist) dist[t] = Number(r.count);
  }
  return NextResponse.json({ distribution: dist });
}

// POST — recompute fit score + qualification for every contact.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin" && role !== "marketing") {
    return NextResponse.json({ error: "Solo superadmin o marketing" }, { status: 403 });
  }

  try {
    const result = recomputeAllScores();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al recalcular";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
