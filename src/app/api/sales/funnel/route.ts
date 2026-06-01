import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, pipelineStages, contacts, salesTargets } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/sales/funnel?period=quarter|month|all
// The action-focused Sales Funnel: KPI strip (incl. sales velocity), stage-by-stage
// funnel with conversion + days-in-stage, quota coverage, forecast bands, health
// flags (stuck / slipping / recently won-lost), a ranked Next-Best-Action hot list,
// and win-rate by source (the signal that feeds marketing's budget decisions).

export const dynamic = "force-dynamic";

const DAY = 86400000;
const STUCK_DAYS = 14;
const HOT_LIST_SIZE = 10;

function periodStart(period: string): number {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (period === "all") return 0;
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1).getTime();
}
function quarterEnd(): number {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59).getTime();
}
function ms(d: Date | number | null): number | null {
  if (d == null) return null;
  return d instanceof Date ? d.getTime() : Number(d);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get("period") ?? "quarter";
    const start = periodStart(period);
    const now = Date.now();

    const stages = db.select().from(pipelineStages).all().sort((a, b) => a.order - b.order);
    const wonStageIds = new Set(stages.filter(s => s.isWon).map(s => s.id));
    const lostStageIds = new Set(stages.filter(s => s.isLost).map(s => s.id));
    const openStageList = stages.filter(s => !s.isWon && !s.isLost);

    const rows = db.select({
      id: deals.id, title: deals.title, value: deals.value, stageId: deals.stageId,
      probability: deals.probability, expectedClose: deals.expectedClose,
      closedAt: deals.closedAt, createdAt: deals.createdAt, updatedAt: deals.updatedAt,
      contactName: contacts.name, company: contacts.company, source: contacts.source,
    }).from(deals).leftJoin(contacts, eq(deals.contactId, contacts.id)).all();

    type Row = typeof rows[number];
    const stageById = new Map(stages.map(s => [s.id, s]));
    const isOpen = (r: Row) => !wonStageIds.has(r.stageId) && !lostStageIds.has(r.stageId);
    const isWon = (r: Row) => wonStageIds.has(r.stageId);
    const isLost = (r: Row) => lostStageIds.has(r.stageId);

    const open = rows.filter(isOpen);
    const wonAll = rows.filter(isWon);
    const lostAll = rows.filter(isLost);
    // period-scoped closes (by closedAt, fall back to updatedAt)
    const closedIn = (r: Row) => { const c = ms(r.closedAt) ?? ms(r.updatedAt) ?? 0; return c >= start; };
    const wonPeriod = wonAll.filter(closedIn);
    const lostPeriod = lostAll.filter(closedIn);

    // ── KPI strip ─────────────────────────────────────────────────────────────
    const openValue = open.reduce((s, r) => s + r.value, 0);
    const weightedValue = open.reduce((s, r) => s + Math.round(r.value * (r.probability / 100)), 0);
    const wonValue = wonPeriod.reduce((s, r) => s + r.value, 0);
    const avgDeal = wonAll.length ? Math.round(wonAll.reduce((s, r) => s + r.value, 0) / wonAll.length) : 0;
    const winRate = (wonPeriod.length + lostPeriod.length) > 0
      ? Math.round((wonPeriod.length / (wonPeriod.length + lostPeriod.length)) * 100) : 0;
    // avg cycle from createdAt → closedAt across won deals
    const cycles = wonAll.map(r => { const c = ms(r.closedAt) ?? ms(r.updatedAt); const cr = ms(r.createdAt); return c && cr ? (c - cr) / DAY : null; }).filter((x): x is number => x != null && x >= 0);
    const avgCycleDays = cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0;
    // Sales velocity (monthly COP): (#open × avgDeal × winRate%) / cycleDays × 30
    const velocityMonthly = avgCycleDays > 0
      ? Math.round((open.length * avgDeal * (winRate / 100)) / avgCycleDays * 30) : 0;

    // ── Quota coverage (current quarter target, summed across reps) ────────────
    const nowD = new Date();
    const curQuarter = Math.floor(nowD.getMonth() / 3) + 1;
    const targets = db.select().from(salesTargets).all();
    const quarterTargets = targets.filter(t => t.period === "quarterly" && t.year === nowD.getFullYear() && t.quarter === curQuarter);
    const quotaCents = quarterTargets.reduce((s, t) => s + (t.targetValue ?? 0), 0);
    const attainmentPct = quotaCents > 0 ? Math.round((wonValue / quotaCents) * 100) : null;
    const remainingQuota = Math.max(quotaCents - wonValue, 0);
    const coverageRatio = remainingQuota > 0 ? +(openValue / remainingQuota).toFixed(1) : null; // healthy ≥ 3x
    const qEnd = quarterEnd();
    const daysLeftInQuarter = Math.max(Math.ceil((qEnd - now) / DAY), 0);

    // ── Forecast bands ────────────────────────────────────────────────────────
    const commitCents = open.filter(r => r.probability >= 80).reduce((s, r) => s + r.value, 0);
    const bestCaseCents = open.filter(r => r.probability >= 50).reduce((s, r) => s + r.value, 0);
    const forecast = {
      wonSoFarCents: wonValue,
      commitCents,                                  // already-won + high-confidence open
      bestCaseCents,                                // + mid-confidence
      pipelineCents: openValue,
      projectedQuarterCents: wonValue + commitCents,
    };

    // ── Stage funnel: count / value / weighted / conversion / days-in-stage ────
    // days-in-stage uses time since last update as a staleness proxy.
    const orderedFlow = [...openStageList, ...stages.filter(s => s.isWon)];
    const stageBreakdown = orderedFlow.map((s, i) => {
      const inStage = rows.filter(r => r.stageId === s.id);
      const cnt = inStage.length;
      const val = inStage.reduce((a, r) => a + r.value, 0);
      const weighted = inStage.reduce((a, r) => a + Math.round(r.value * (r.probability / 100)), 0);
      const days = inStage.map(r => { const u = ms(r.updatedAt); return u ? (now - u) / DAY : 0; });
      const avgDays = days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0;
      const prev = i > 0 ? orderedFlow[i - 1] : null;
      const prevCnt = prev ? rows.filter(r => r.stageId === prev.id).length : null;
      const convFromPrev = prevCnt && prevCnt > 0 ? Math.round((cnt / prevCnt) * 100) : null;
      return {
        id: s.id, name: s.name, color: s.color, isWon: s.isWon,
        count: cnt, valueCents: val, weightedCents: weighted, avgDaysInStage: avgDays, convFromPrev,
      };
    });

    // ── Health: stuck / slipping / recent ─────────────────────────────────────
    const daysSince = (r: Row) => { const u = ms(r.updatedAt); return u ? Math.floor((now - u) / DAY) : 0; };
    const stuck = open.filter(r => daysSince(r) >= STUCK_DAYS)
      .sort((a, b) => daysSince(b) - daysSince(a)).slice(0, 8)
      .map(r => ({ id: r.id, title: r.title, contactName: r.contactName, valueCents: r.value, stageName: stageById.get(r.stageId)?.name ?? "", days: daysSince(r) }));
    const slipping = open.filter(r => { const ec = ms(r.expectedClose); return ec != null && ec < now; })
      .sort((a, b) => (ms(a.expectedClose)! - ms(b.expectedClose)!)).slice(0, 8)
      .map(r => ({ id: r.id, title: r.title, contactName: r.contactName, valueCents: r.value, stageName: stageById.get(r.stageId)?.name ?? "", overdueDays: Math.floor((now - ms(r.expectedClose)!) / DAY) }));
    const recentWon = wonPeriod.sort((a, b) => (ms(b.closedAt) ?? 0) - (ms(a.closedAt) ?? 0)).slice(0, 5)
      .map(r => ({ id: r.id, title: r.title, contactName: r.contactName, valueCents: r.value }));
    const recentLost = lostPeriod.sort((a, b) => (ms(b.closedAt) ?? 0) - (ms(a.closedAt) ?? 0)).slice(0, 5)
      .map(r => ({ id: r.id, title: r.title, contactName: r.contactName, valueCents: r.value }));

    // ── Next-Best-Action hot list: rank by prob × value × staleness/closeness ──
    const hotList = open.map(r => {
      const d = daysSince(r);
      const ec = ms(r.expectedClose);
      const closingSoon = ec != null && ec >= now && ec < now + 14 * DAY;
      const goingStale = d >= STUCK_DAYS;
      // score blends value, probability, urgency
      const urgency = (closingSoon ? 1.4 : 1) * (goingStale ? 1.3 : 1);
      const score = (r.value / 100) * (r.probability / 100) * urgency;
      let reason = "Alto valor + probabilidad";
      if (closingSoon) reason = `Cierra en ${Math.ceil((ec! - now) / DAY)} días`;
      else if (goingStale) reason = `Sin movimiento ${d} días`;
      return {
        id: r.id, title: r.title, contactName: r.contactName, company: r.company,
        valueCents: r.value, probability: r.probability, stageName: stageById.get(r.stageId)?.name ?? "",
        daysStale: d, reason, score,
      };
    }).sort((a, b) => b.score - a.score).slice(0, HOT_LIST_SIZE);

    // ── Win-rate by source (feeds marketing budget allocation) ─────────────────
    const bySourceMap = new Map<string, { deals: number; won: number; lost: number; wonValue: number }>();
    for (const r of rows) {
      const src = (r.source ?? "otro").toLowerCase();
      const e = bySourceMap.get(src) ?? { deals: 0, won: 0, lost: 0, wonValue: 0 };
      e.deals++;
      if (isWon(r)) { e.won++; e.wonValue += r.value; }
      else if (isLost(r)) e.lost++;
      bySourceMap.set(src, e);
    }
    const bySource = [...bySourceMap.entries()].map(([source, e]) => ({
      source, deals: e.deals, won: e.won,
      winRate: (e.won + e.lost) > 0 ? Math.round((e.won / (e.won + e.lost)) * 100) : 0,
      wonValueCents: e.wonValue,
    })).sort((a, b) => b.wonValueCents - a.wonValueCents);

    return NextResponse.json({
      period,
      kpis: {
        openPipelineCents: openValue,
        weightedPipelineCents: weightedValue,
        avgDealCents: avgDeal,
        velocityMonthlyCents: velocityMonthly,
        winRate,
        avgCycleDays,
        wonPeriodCents: wonValue,
        wonPeriodCount: wonPeriod.length,
        openCount: open.length,
      },
      quota: { quotaCents, wonValue, attainmentPct, remainingQuota, coverageRatio, daysLeftInQuarter, hasTarget: quotaCents > 0 },
      forecast,
      stages: stageBreakdown,
      health: { stuck, slipping, recentWon, recentLost },
      hotList,
      bySource,
      updatedAt: now,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
