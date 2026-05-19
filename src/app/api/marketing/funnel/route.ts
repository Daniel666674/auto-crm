import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";

const LIFECYCLE_ORDER = ["subscriber", "lead", "MQL", "SQL", "opportunity", "customer", "evangelist"];

// GET /api/marketing/funnel
// Returns the full funnel: lifecycle stage counts + deal stage counts + conversion rates.
export async function GET() {
  try {
    const allContacts = db.select({
      id: contacts.id,
      lifecycleStage: contacts.lifecycleStage,
      returnedToMarketingAt: contacts.returnedToMarketingAt,
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

    return NextResponse.json({
      lifecycleCounts,
      conversionRates,
      dealStageBreakdown,
      returnedCount,
      totalContacts: allContacts.length,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
