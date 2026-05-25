/**
 * Lead qualification — combines firmographic Fit Score with live engagement.
 *
 *   MQL  = good firmographic fit            (fitScore >= MQL_THRESHOLD, Tier A)
 *   HOT  = driven by engagement, not score  (reply / meeting / demo / clicks / repeat opens)
 *   SQL  = MQL AND a positive intent signal  (reply / meeting / demo)
 *
 * Positive replies and booked meetings push a contact HOT and, when the fit is
 * already there, promote it straight to SQL.
 */

export const MQL_THRESHOLD = 60;

export interface QualInput {
  fitScore: number;
  opens: number;
  clicks: number;
  replies: number;
  meetingBooked: boolean;
  demoed: boolean;
  hasOpenDeal: boolean;
  hasWonDeal: boolean;
  currentLifecycle?: string | null;
  // VA signals — contribute to temperature even without email engagement
  sigDmActive?: boolean | null;
  sigLinkedinAds?: boolean | null;
  sigPostFreq?: string | null;
}

export interface QualResult {
  isMQL: boolean;
  isSQL: boolean;
  temperature: "hot" | "warm" | "cold";
  lifecycleStage: string;
  engagementScore: number;
}

// Lifecycle stages ordered so we never downgrade a contact that already moved
// further down the funnel (e.g. a customer must never fall back to "lead").
const STAGE_RANK: Record<string, number> = {
  subscriber: 0,
  lead: 1,
  MQL: 2,
  SQL: 3,
  opportunity: 4,
  customer: 5,
  evangelist: 6,
};

export function qualifyLead(i: QualInput): QualResult {
  const positiveIntent = i.replies > 0 || i.meetingBooked || i.demoed;
  const isMQL = i.fitScore >= MQL_THRESHOLD;
  const isSQL = isMQL && positiveIntent;

  // Engagement points — what "raises the score" when a prospect responds.
  // Clicks/replies/meetings dominate; opens contribute little (unreliable).
  const engagementScore = Math.min(
    100,
    i.replies * 25 +
      (i.meetingBooked ? 30 : 0) +
      (i.demoed ? 20 : 0) +
      i.clicks * 8 +
      Math.min(i.opens, 5) * 2
  );

  // Clicks and replies are the trustworthy intent signals (Gmail/Apple inflate
  // and fake opens), so they alone drive HOT. Opens are a secondary, warm-only
  // signal. VA behavioral signals (active ads, DM-reachable, weekly posts) are
  // also warm even before any email engagement.
  let temperature: QualResult["temperature"] = "cold";
  if (positiveIntent || i.clicks > 0) temperature = "hot";
  else if (i.opens > 0 || i.sigDmActive || i.sigLinkedinAds || i.sigPostFreq === "semanal" || i.sigPostFreq === "weekly") temperature = "warm";

  // Compute the funnel stage this contact's signals justify, then keep whichever
  // is further along between that and where the contact already sits.
  let derived = "lead";
  if (i.hasWonDeal) derived = "customer";
  else if (i.hasOpenDeal) derived = "opportunity";
  else if (isSQL) derived = "SQL";
  else if (isMQL) derived = "MQL";

  const current = i.currentLifecycle || "lead";
  const lifecycleStage =
    (STAGE_RANK[current] ?? 1) > (STAGE_RANK[derived] ?? 1) ? current : derived;

  return { isMQL, isSQL, temperature, lifecycleStage, engagementScore };
}
