import { db } from "@/db";
import { contacts, deals, pipelineStages, crmSettings } from "@/db/schema";
import { eq, and, gte, inArray, isNotNull } from "drizzle-orm";

export const LEARNED_WEIGHTS_KEY = "scoring_learned_weights";

export interface CategoryWeight {
  wins: number;
  losses: number;
  score: number;
}

export interface LearnedWeights {
  computedAt: string;
  wonDealsCount: number;
  lostDealsCount: number;
  campaignWeights: Record<string, CategoryWeight>;
  industryWeights: Record<string, CategoryWeight>;
  sourceWeights: Record<string, CategoryWeight>;
}

function toMs(val: Date | number | null | undefined): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  return val < 1e10 ? val * 1000 : val;
}

function bumpCount(map: Map<string, { wins: number; losses: number }>, key: string | null | undefined, kind: "wins" | "losses"): void {
  if (!key) return;
  const cur = map.get(key) ?? { wins: 0, losses: 0 };
  cur[kind]++;
  map.set(key, cur);
}

function finalize(map: Map<string, { wins: number; losses: number }>): Record<string, CategoryWeight> {
  const out: Record<string, CategoryWeight> = {};
  for (const [k, v] of map.entries()) {
    const total = v.wins + v.losses;
    const score = total > 0 ? Math.round((v.wins / total) * 100) : 0;
    out[k] = { wins: v.wins, losses: v.losses, score };
  }
  return out;
}

export function runScoringLoop(): LearnedWeights {
  const now = Date.now();
  const cutoff = new Date(now - 180 * 24 * 3600 * 1000);

  const stages = db.select().from(pipelineStages).all();
  const wonStageIds = stages.filter(s => s.isWon).map(s => s.id);
  const lostStageIds = stages.filter(s => s.isLost).map(s => s.id);

  const wonDeals = wonStageIds.length > 0
    ? db.select({
        id: deals.id,
        contactId: deals.contactId,
        stageId: deals.stageId,
        closedAt: deals.closedAt,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(and(inArray(deals.stageId, wonStageIds), gte(deals.updatedAt, cutoff)))
      .all()
    : [];

  const lostDeals = lostStageIds.length > 0
    ? db.select({
        id: deals.id,
        contactId: deals.contactId,
        stageId: deals.stageId,
        closedAt: deals.closedAt,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(and(inArray(deals.stageId, lostStageIds), gte(deals.updatedAt, cutoff)))
      .all()
    : [];

  const allContactIds = Array.from(new Set([...wonDeals, ...lostDeals].map(d => d.contactId)));

  const contactRows = allContactIds.length > 0
    ? db.select({
        id: contacts.id,
        firstTouchCampaignId: contacts.firstTouchCampaignId,
        industry: contacts.industry,
        source: contacts.source,
      })
      .from(contacts)
      .where(inArray(contacts.id, allContactIds))
      .all()
    : [];

  const contactById = new Map(contactRows.map(c => [c.id, c]));

  const campaignMap = new Map<string, { wins: number; losses: number }>();
  const industryMap = new Map<string, { wins: number; losses: number }>();
  const sourceMap = new Map<string, { wins: number; losses: number }>();

  for (const d of wonDeals) {
    const c = contactById.get(d.contactId);
    if (!c) continue;
    bumpCount(campaignMap, c.firstTouchCampaignId, "wins");
    bumpCount(industryMap, c.industry, "wins");
    bumpCount(sourceMap, c.source, "wins");
  }
  for (const d of lostDeals) {
    const c = contactById.get(d.contactId);
    if (!c) continue;
    bumpCount(campaignMap, c.firstTouchCampaignId, "losses");
    bumpCount(industryMap, c.industry, "losses");
    bumpCount(sourceMap, c.source, "losses");
  }

  const result: LearnedWeights = {
    computedAt: new Date().toISOString(),
    wonDealsCount: wonDeals.length,
    lostDealsCount: lostDeals.length,
    campaignWeights: finalize(campaignMap),
    industryWeights: finalize(industryMap),
    sourceWeights: finalize(sourceMap),
  };

  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, LEARNED_WEIGHTS_KEY)).get();
  if (existing) {
    db.update(crmSettings)
      .set({ value: JSON.stringify(result) })
      .where(eq(crmSettings.key, LEARNED_WEIGHTS_KEY))
      .run();
  } else {
    db.insert(crmSettings)
      .values({ key: LEARNED_WEIGHTS_KEY, value: JSON.stringify(result) })
      .run();
  }

  // silence unused-import warning while preserving the import for future filters
  void isNotNull;
  void toMs;

  return result;
}

export function getLearnedWeights(): LearnedWeights | null {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, LEARNED_WEIGHTS_KEY)).get();
  if (!row) return null;
  try {
    return JSON.parse(row.value) as LearnedWeights;
  } catch {
    return null;
  }
}
