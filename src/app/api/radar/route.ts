import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { radarEntries } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(radarEntries)
    .where(isNull(radarEntries.removedAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    contactName, company, tier, reason, trigger,
    estimatedValue, bantBlocking, nextAction, priority, reengageDate,
  } = body;

  if (!contactName || !company || !reason || !trigger || !reengageDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [row] = await db.insert(radarEntries).values({
    contactName,
    company,
    tier: Number(tier) || 2,
    reason,
    trigger,
    estimatedValue: estimatedValue ? Number(estimatedValue) : null,
    bantBlocking: bantBlocking || null,
    nextAction: nextAction || null,
    priority: priority || "medium",
    reengageDate: Number(reengageDate),
  }).returning();

  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db
    .update(radarEntries)
    .set({ removedAt: Date.now() })
    .where(eq(radarEntries.id, id));

  return NextResponse.json({ ok: true });
}
