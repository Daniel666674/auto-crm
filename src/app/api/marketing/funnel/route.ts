import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages, emailEvents } from "@/db/schema";

const LIFECYCLE_ORDER = ["subscriber", "lead", "MQL", "SQL", "opportunity", "customer", "evangelist"];

// GET /api/marketing/funnel
// Returns the full funnel: lifecycle stage counts + deal stage counts + conversion rates.
export async function GET() {
  try {
    const allContacts = db.select({
      id: contacts.id,
      lifecycleStage: contacts.lifecycleStage,
      returnedToMarketingAt: contacts.returnedToMarketingAt,
      fitTier: contacts.fitTier,
      temperature: contacts.temperature,
      source: contacts.source,
    }).from(contacts).all();

    // Lifecycle counts (cumulative — a customer is also counted as having passed all earlier stages)
    const lifecycleCounts: Record<string, number> = {};
    for (const s of LIFECYCLE_ORDER) lifecycleCounts[s] = 0;
    for (const c of allContacts) {
      const stage = c.lifecycleStage ?? "lead";
      const idx = LIFECYCLE_ORDER.indexOf(stage);
      if (idx >= 0) {
        // Cumulative: counts as having reached this stage or further
        for (let i = 0; i <= idx; i++) {
          lifecycleCounts[LIFECYCLE_ORDER[i]]++;
        }
      }
    }

    // Conversion rates between consecutive stages
    const conversionRates: { from: string; to: string; rate: number; dropoff: number }[] = [];
    for (let i = 0; i < LIFECYCLE_ORDER.length - 1; i++) {
      const from = LIFECYCLE_ORDER[i];
      const to = LIFECYCLE_ORDER[i + 1];
      const fromCount = lifecycleCounts[from];
      const toCount = lifecycleCounts[to];
      const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
      const dropoff = fromCount - toCount;
      conversionRates.push({ from, to, rate, dropoff });
    }

    // Deal stage breakdown
    const allDeals = db.select({ stageId: deals.stageId, value: deals.value }).from(deals).all();
    const allStages = db.select().from(pipelineStages).all().sort((a, b) => a.order - b.order);
    const dealStageBreakdown = allStages.map(s => {
      const stageDeals = allDeals.filter(d => d.stageId === s.id);
      return {
        id: s.id,
        name: s.name,
        order: s.order,
        color: s.color,
        isWon: s.isWon,
        isLost: s.isLost,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      };
    });

    // Returned to marketing count (re-engagement opportunity size)
    const returnedCount = allContacts.filter(c => c.returnedToMarketingAt).length;

    // Fit tier counts (missing → "D")
    const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
    for (const c of allContacts) {
      const tier = (c.fitTier ?? "D") as "A" | "B" | "C" | "D";
      if (tier in tierCounts) tierCounts[tier]++;
      else tierCounts.D++;
    }

    // Temperature counts
    const tempCounts = { hot: 0, warm: 0, cold: 0 };
    for (const c of allContacts) {
      const t = c.temperature as "hot" | "warm" | "cold";
      if (t in tempCounts) tempCounts[t]++;
    }

    // Source counts
    const sourceCounts: Record<string, number> = {};
    for (const c of allContacts) {
      const src = c.source ?? "otro";
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
    }

    // Email performance
    const allEmailEvents = db.select({ type: emailEvents.type }).from(emailEvents).all();
    let sent = 0, opens = 0, clicks = 0, replies = 0;
    for (const ev of allEmailEvents) {
      if (ev.type === "sent") sent++;
      else if (ev.type === "open") opens++;
      else if (ev.type === "click") clicks++;
      else if (ev.type === "reply") replies++;
    }
    const pct = (num: number, den: number) => den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0;
    const emailPerf = {
      sent, opens, clicks, replies,
      openRate: pct(opens, sent),
      clickRate: pct(clicks, sent),
      replyRate: pct(replies, sent),
    };

    // MQL / SQL surfaced + conversion
    const mqlCount = lifecycleCounts.MQL;
    const sqlCount = lifecycleCounts.SQL;
    const mqlToSqlRate = mqlCount > 0 ? Math.round((sqlCount / mqlCount) * 100) : 0;

    // Win rate from deals joined to pipeline stages
    const wonStageIds = new Set(allStages.filter(s => s.isWon).map(s => s.id));
    const lostStageIds = new Set(allStages.filter(s => s.isLost).map(s => s.id));
    let wonCount = 0, lostCount = 0;
    for (const d of allDeals) {
      if (wonStageIds.has(d.stageId)) wonCount++;
      else if (lostStageIds.has(d.stageId)) lostCount++;
    }
    const closedCount = wonCount + lostCount;
    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    return NextResponse.json({
      lifecycleCounts,
      conversionRates,
      dealStageBreakdown,
      returnedCount,
      totalContacts: allContacts.length,
      tierCounts,
      tempCounts,
      sourceCounts,
      emailPerf,
      mqlCount,
      sqlCount,
      mqlToSqlRate,
      winRate,
      wonCount,
      lostCount,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
