import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deals, pipelineStages, contacts } from "@/db/schema";
import { eq, and, isNotNull, gte, lte } from "drizzle-orm";

// Company start date: April 1, 2026
const COMPANY_START = new Date("2026-04-01").getTime();

// Monthly targets (COP cents stored as integers, display in COP)
// Months 1-6: 20M COP, months 7-12: 40M COP, months 13-24: 90M COP
function getMonthTarget(monthIndex: number): number {
  if (monthIndex < 6) return 20_000_000;
  if (monthIndex < 12) return 40_000_000;
  return 90_000_000;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("es-CO", { month: "short", year: "2-digit" });
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") ?? "6m";
  const months = range === "12m" ? 12 : 6;

  // Get all won stages
  const wonStages = await db.select().from(pipelineStages).where(eq(pipelineStages.isWon, true));
  const wonIds = wonStages.map(s => s.id);

  // Get closed deals (has closedAt) or in won stage
  const allDeals = await db
    .select({
      id: deals.id,
      value: deals.value,
      closedAt: deals.closedAt,
      closedBy: deals.closedBy,
      createdAt: deals.createdAt,
      stageId: deals.stageId,
      contactId: deals.contactId,
      title: deals.title,
    })
    .from(deals);

  // A deal is "closed/paid" if it has closedAt set
  // A deal is "won" if it's in a won stage (pipeline won, not yet marked paid)
  const closedDeals = allDeals.filter(d => d.closedAt != null);
  const wonDeals = allDeals.filter(d => wonIds.includes(d.stageId) && !d.closedAt);

  // Build monthly buckets for the past N months
  const now = new Date();
  const buckets: Array<{
    key: string;
    label: string;
    monthStart: Date;
    monthEnd: Date;
    monthIndex: number; // months since company start
    revenue: number;
    target: number;
  }> = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    const msFromStart = monthStart.getTime() - COMPANY_START;
    const monthIndex = Math.max(0, Math.floor(msFromStart / (30 * 24 * 60 * 60 * 1000)));

    buckets.push({
      key: monthKey(monthStart),
      label: monthLabel(monthStart),
      monthStart,
      monthEnd,
      monthIndex,
      revenue: 0,
      target: getMonthTarget(monthIndex),
    });
  }

  // Sum closed deals into buckets
  for (const deal of closedDeals) {
    if (!deal.closedAt) continue;
    const closedDate = deal.closedAt instanceof Date ? deal.closedAt : new Date(Number(deal.closedAt));
    const bucket = buckets.find(b => closedDate >= b.monthStart && closedDate <= b.monthEnd);
    if (bucket) bucket.revenue += deal.value;
  }

  // Total closed revenue
  const totalRevenue = closedDeals.reduce((s, d) => s + d.value, 0);
  const totalWonPipeline = wonDeals.reduce((s, d) => s + d.value, 0);

  // Client concentration from closed deals
  const clientMap = new Map<string, { name: string; value: number }>();
  for (const deal of closedDeals) {
    const existing = clientMap.get(deal.contactId);
    if (existing) {
      existing.value += deal.value;
    } else {
      clientMap.set(deal.contactId, { name: deal.title.split(" - ")[0] || deal.title, value: deal.value });
    }
  }

  // Fetch contact names for concentration
  const contactIds = [...clientMap.keys()];
  const contactRows = contactIds.length
    ? await db.select({ id: contacts.id, name: contacts.name, company: contacts.company }).from(contacts)
    : [];

  const concentration = [...clientMap.entries()]
    .map(([contactId, data]) => {
      const contact = contactRows.find(c => c.id === contactId);
      return { label: contact?.company || contact?.name || data.name, value: data.value };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Current month target
  const currentMonthMs = new Date().getTime() - COMPANY_START;
  const currentMonthIndex = Math.max(0, Math.floor(currentMonthMs / (30 * 24 * 60 * 60 * 1000)));
  const currentTarget = getMonthTarget(currentMonthIndex);

  return NextResponse.json({
    months: buckets.map(b => ({
      label: b.label,
      revenue: b.revenue,
      target: b.target,
    })),
    summary: {
      totalRevenue,
      totalWonPipeline,
      currentTarget,
      closedCount: closedDeals.length,
      wonCount: wonDeals.length,
    },
    concentration,
  });
}

// Mark a deal as paid (closedAt stamp)
export async function POST(req: NextRequest) {
  const { dealId, closedBy } = await req.json();
  if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

  await db
    .update(deals)
    .set({ closedAt: new Date(), closedBy: closedBy ?? null, updatedAt: new Date() })
    .where(eq(deals.id, dealId));

  return NextResponse.json({ ok: true });
}
