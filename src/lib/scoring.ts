import type { Temperature } from "@/types";

interface ScoringInput {
  temperature: Temperature;
  hasEmail: boolean;
  hasPhone: boolean;
  hasCompany: boolean;
  activityCount: number;
  daysSinceLastActivity: number;
  hasDeals: boolean;
  dealValue: number;
}

export interface ScoringWeights {
  /** Points for hot temperature */
  tempHot: number;
  /** Points for warm temperature */
  tempWarm: number;
  /** Points for cold temperature */
  tempCold: number;
  /** Points for having an email */
  contactEmail: number;
  /** Points for having a phone */
  contactPhone: number;
  /** Points for having a company */
  contactCompany: number;
  /** Points per activity */
  perActivity: number;
  /** Maximum bonus from activities */
  maxActivityBonus: number;
  /** Penalty when last activity > 30 days ago */
  recency30d: number;
  /** Penalty when last activity > 14 days ago */
  recency14d: number;
  /** Penalty when last activity > 7 days ago */
  recency7d: number;
  /** Points for having at least one deal */
  hasDeals: number;
  /** Extra points for deal value > 100,000 cents ($1,000) */
  dealValue100k: number;
  /** Extra points for deal value > 500,000 cents ($5,000) */
  dealValue500k: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  tempHot: 40,
  tempWarm: 25,
  tempCold: 10,
  contactEmail: 10,
  contactPhone: 10,
  contactCompany: 5,
  perActivity: 5,
  maxActivityBonus: 20,
  recency30d: -15,
  recency14d: -10,
  recency7d: -5,
  hasDeals: 10,
  dealValue100k: 5,
  dealValue500k: 5,
};

export function calculateLeadScore(
  input: ScoringInput,
  weights: Partial<ScoringWeights> = {}
): number {
  const w: ScoringWeights = { ...DEFAULT_WEIGHTS, ...weights };

  let score = 0;

  // Temperature base score
  switch (input.temperature) {
    case "hot":
      score += w.tempHot;
      break;
    case "warm":
      score += w.tempWarm;
      break;
    case "cold":
      score += w.tempCold;
      break;
  }

  // Contact completeness
  if (input.hasEmail) score += w.contactEmail;
  if (input.hasPhone) score += w.contactPhone;
  if (input.hasCompany) score += w.contactCompany;

  // Engagement
  score += Math.min(input.activityCount * w.perActivity, w.maxActivityBonus);

  // Recency penalty
  if (input.daysSinceLastActivity > 30) score += w.recency30d;
  else if (input.daysSinceLastActivity > 14) score += w.recency14d;
  else if (input.daysSinceLastActivity > 7) score += w.recency7d;

  // Deal value bonus
  if (input.hasDeals) score += w.hasDeals;
  if (input.dealValue > 100000) score += w.dealValue100k;
  if (input.dealValue > 500000) score += w.dealValue500k;

  return Math.max(0, Math.min(100, score));
}

export function suggestTemperature(score: number): Temperature {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
