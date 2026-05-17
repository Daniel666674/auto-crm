import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { deals, contacts, pipelineStages, users, closeReasons } from "@/db/schema";
import { asc } from "drizzle-orm";

const DAY = 86400000;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const months = Math.min(36, Math.max(3, Number(searchParams.get("months") ?? 12)));

  const now = Date.now();
  const fromTs = now - months * 30 * DAY;

  const allDeals = db.select().from(deals).all();
  const allContacts = db.select().from(contacts).all();
  const allStages = db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)).all();
  const allUsers = db.select().from(users).all();
  const allReasons = db.select().from(closeReasons).all();

  const contactMap = new Map(allContacts.map((c) => [c.id, c]));
  const stageMap = new Map(allStages.map((s) => [s.id, s]));
  const userMap = new Map(allUsers.map((u) => [u.id, u]));
  const reasonMap = new Map(allReasons.map((r) => [r.id, r]));

  const tsOf = (d: Date | number | null): number => {
    if (!d) return 0;
    return d instanceof Date ? d.getTime() : Number(d);
  };

  // --------------------------------------------------------------------------
  // Win Rate (overall + by source + by rep)
  // --------------------------------------------------------------------------
  const closedDealsInPeriod = allDeals.filter((d) => {
    const ts = tsOf(d.closedAt);
    return ts >= fromTs && ts <= now;
  });

  const wonStages = new Set(allStages.filter((s) => s.isWon).map((s) => s.id));
  const lostStages = new Set(allStages.filter((s) => s.isLost).map((s) => s.id));

  const won = closedDealsInPeriod.filter((d) => wonStages.has(d.stageId));
  const lost = closedDealsInPeriod.filter((d) => lostStages.has(d.stageId));

  const wonCount = won.length;
  const lostCount = lost.length;
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0;
  const totalRevenue = won.reduce((s, d) => s + d.value, 0);

  // By source
  const bySource = new Map<string, { won: number; lost: number; revenue: number }>();
  for (const d of closedDealsInPeriod) {
    const contact = contactMap.get(d.contactId);
    const source = contact?.source ?? "otro";
    if (!bySource.has(source)) bySource.set(source, { won: 0, lost: 0, revenue: 0 });
    const entry = bySource.get(source)!;
    if (wonStages.has(d.stageId)) {
      entry.won += 1;
      entry.revenue += d.value;
    } else if (lostStages.has(d.stageId)) {
      entry.lost += 1;
    }
  }
  const sourceBreakdown = Array.from(bySource.entries())
    .map(([source, v]) => ({
      source,
      won: v.won,
      lost: v.lost,
      revenue: v.revenue,
      winRate: v.won + v.lost > 0 ? (v.won / (v.won + v.lost)) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // By rep (closedBy)
  const byRep = new Map<string, { won: number; lost: number; revenue: number }>();
  for (const d of closedDealsInPeriod) {
    const repId = d.closedBy ?? "unassigned";
    if (!byRep.has(repId)) byRep.set(repId, { won: 0, lost: 0, revenue: 0 });
    const entry = byRep.get(repId)!;
    if (wonStages.has(d.stageId)) {
      entry.won += 1;
      entry.revenue += d.value;
    } else if (lostStages.has(d.stageId)) {
      entry.lost += 1;
    }
  }
  const repBreakdown = Array.from(byRep.entries())
    .map(([repId, v]) => {
      const user = userMap.get(repId);
      return {
        repId,
        repName: user?.name ?? user?.email ?? "Sin asignar",
        won: v.won,
        lost: v.lost,
        revenue: v.revenue,
        winRate: v.won + v.lost > 0 ? (v.won / (v.won + v.lost)) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // --------------------------------------------------------------------------
  // Conversion Funnel (snapshot — current count of deals at each stage)
  // --------------------------------------------------------------------------
  const orderedStages = allStages.filter((s) => !s.isWon && !s.isLost);
  const stageCounts = orderedStages.map((s) => ({
    stageId: s.id,
    stageName: s.name,
    count: allDeals.filter((d) => d.stageId === s.id).length,
    value: allDeals.filter((d) => d.stageId === s.id).reduce((sum, d) => sum + d.value, 0),
  }));
  // Add Won column at end
  stageCounts.push({
    stageId: "won",
    stageName: "Ganados",
    count: won.length,
    value: won.reduce((s, d) => s + d.value, 0),
  });

  // --------------------------------------------------------------------------
  // Monthly Trend (won, lost, revenue per month)
  // --------------------------------------------------------------------------
  const monthlyTrend: Array<{ label: string; year: number; month: number; won: number; lost: number; revenue: number; avgVelocity: number | null }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now);
    ref.setMonth(ref.getMonth() - i);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();

    const closedInMonth = allDeals.filter((d) => {
      const ts = tsOf(d.closedAt);
      return ts >= start && ts < end;
    });
    const monthWon = closedInMonth.filter((d) => wonStages.has(d.stageId));
    const monthLost = closedInMonth.filter((d) => lostStages.has(d.stageId));

    const velocities = monthWon
      .map((d) => {
        const closed = tsOf(d.closedAt);
        const created = tsOf(d.createdAt);
        return closed && created ? (closed - created) / DAY : null;
      })
      .filter((v): v is number => v !== null);
    const avgVelocity = velocities.length > 0 ? Math.round(velocities.reduce((s, v) => s + v, 0) / velocities.length) : null;

    monthlyTrend.push({
      label: ref.toLocaleDateString("es-CO", { month: "short", year: "2-digit" }),
      year,
      month: month + 1,
      won: monthWon.length,
      lost: monthLost.length,
      revenue: monthWon.reduce((s, d) => s + d.value, 0),
      avgVelocity,
    });
  }

  // --------------------------------------------------------------------------
  // Forecast Accuracy: of deals with expectedClose in period, how many closed
  // on-time (within ±7 days), late, or still open
  // --------------------------------------------------------------------------
  const dealsWithExpected = allDeals.filter((d) => {
    const expTs = tsOf(d.expectedClose);
    return expTs >= fromTs && expTs <= now;
  });

  let onTime = 0;
  let late = 0;
  let stillOpen = 0;
  let missedClosed = 0; // expected to close in past but moved to lost

  for (const d of dealsWithExpected) {
    const expTs = tsOf(d.expectedClose);
    const closedTs = tsOf(d.closedAt);
    if (!closedTs) {
      stillOpen += 1;
      continue;
    }
    if (lostStages.has(d.stageId)) {
      missedClosed += 1;
      continue;
    }
    const deltaDays = Math.abs(closedTs - expTs) / DAY;
    if (deltaDays <= 7) onTime += 1;
    else late += 1;
  }

  const forecastAccuracy = {
    total: dealsWithExpected.length,
    onTime,
    late,
    stillOpen,
    missedClosed,
    accuracy: dealsWithExpected.length > 0 ? (onTime / dealsWithExpected.length) * 100 : 0,
  };

  // --------------------------------------------------------------------------
  // Velocity overall
  // --------------------------------------------------------------------------
  const allVelocities = won
    .map((d) => {
      const closed = tsOf(d.closedAt);
      const created = tsOf(d.createdAt);
      return closed && created ? (closed - created) / DAY : null;
    })
    .filter((v): v is number => v !== null);
  const avgVelocityDays = allVelocities.length > 0
    ? Math.round(allVelocities.reduce((s, v) => s + v, 0) / allVelocities.length)
    : null;

  // Avg deal size (won)
  const avgDealSize = won.length > 0 ? Math.round(totalRevenue / won.length) : 0;

  // --------------------------------------------------------------------------
  // Loss reasons breakdown
  // --------------------------------------------------------------------------
  const lossReasonCounts = new Map<string, number>();
  for (const d of lost) {
    const reason = d.closeReasonId ? (reasonMap.get(d.closeReasonId)?.label ?? "Otro") : "Sin razón";
    lossReasonCounts.set(reason, (lossReasonCounts.get(reason) ?? 0) + 1);
  }
  const lossReasons = Array.from(lossReasonCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    period: { months, fromTs, toTs: now },
    summary: {
      winRate,
      wonCount,
      lostCount,
      totalRevenue,
      avgDealSize,
      avgVelocityDays,
    },
    sourceBreakdown,
    repBreakdown,
    stageCounts,
    monthlyTrend,
    forecastAccuracy,
    lossReasons,
  });
}
