import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Firmographic / ICP "Fit Score" — fully driven by the Apollo export plus the
 * VA-enriched marketing signals. Mirrors the BlackScale_Scoring_Prospectos
 * weighting sheet. Max 100. Engagement is intentionally NOT part of this score
 * (that lives in lead-qualification.ts) so the two can be reasoned about apart.
 */
export interface FitWeights {
  // Marketing signals (VA-enriched, 64 max)
  linkedinAds: number;
  postsWeekly: number;
  postsMonthly: number;
  dmActiveLinkedin: number;
  metaAds: number;
  googleAds: number;
  mgrNoHead: number;
  vacancy: number;
  // Company size (firmographic, Apollo)
  size1to10: number;
  size11to50: number;
  size51to200: number;
  // Industry (firmographic, Apollo)
  industryTech: number;
  industryOther: number;
  // Decision-maker role (firmographic, Apollo title)
  roleCeo: number;
  roleCmo: number;
  roleMktMgr: number;
  roleCsuite: number;
  roleOther: number;
}

export interface TierThresholds {
  a: number;
  b: number;
  c: number;
}

export const DEFAULT_FIT_WEIGHTS: FitWeights = {
  // Marketing signals — VA-enriched. Strong weights so VA-worked contacts reliably reach Tier A.
  linkedinAds: 12,
  postsWeekly: 12,
  postsMonthly: 4,
  dmActiveLinkedin: 12,
  metaAds: 4,
  googleAds: 8,
  mgrNoHead: 8,
  vacancy: 8,
  // Company size — 1-50 both prime; 51-200 some value
  size1to10: 20,
  size11to50: 18,
  size51to200: 6,
  // Industry — tech best, but B2B services/finance/consulting are valid targets
  industryTech: 15,
  industryOther: 8,
  // Role — CMO/CEO equal top; ops C-suite meaningful at small companies
  roleCeo: 20,
  roleCmo: 20,
  roleMktMgr: 12,
  roleCsuite: 10,
  roleOther: 0,
};

export const DEFAULT_TIERS: TierThresholds = { a: 60, b: 40, c: 24 };

const WEIGHTS_KEY = "fit_scoring_weights";
const TIERS_KEY = "fit_scoring_tiers";

export interface FitInput {
  title?: string | null;
  seniority?: string | null; // Apollo seniority — role fallback when title is ambiguous
  industry?: string | null;
  employeeCount?: number | null;
  sigLinkedinAds?: boolean | null;
  sigPostFreq?: string | null; // "semanal" | "mensual" | null
  sigDmActive?: boolean | null;
  sigMetaAds?: boolean | null;
  sigGoogleAds?: boolean | null;
  sigMgrNoHead?: boolean | null;
  sigVacancy?: boolean | null;
}

export interface FitResult {
  fitScore: number;
  fitTier: "A" | "B" | "C" | "D";
  breakdown: { role: number; size: number; industry: number; signals: number };
}

/** Decision-maker role points. Marketing leadership is checked before generic
 * C-level so a CMO never falls through to the ops bucket. When the title is
 * ambiguous, the Apollo `seniority` field is used as a fallback so a Founder /
 * C-suite contact still scores as a decision-maker. */
export function roleScore(title: string | null | undefined, w: FitWeights, seniority?: string | null): number {
  const t = (title || "").toLowerCase();

  // Marketing leadership — highest priority (they BUY marketing services)
  const isMktLeader =
    /\bcmo\b/.test(t) ||
    /\bchief marketing\b/.test(t) ||
    (/(marketing|mercadeo|growth)/.test(t) &&
      /(director|head|jefe|vp\b|vice president|chief|subdirector|líder|lider)/.test(t));
  if (isMktLeader) return w.roleCmo;

  // Marketing manager / growth practitioner
  const isMktMgr =
    (/(marketing|mercadeo)/.test(t) && /(manager|gerente|lead|líder|lider|coordinador|specialist|especialista)/.test(t)) ||
    /\b(growth hacker|demand gen|demand generation|brand manager|content manager|digital manager|performance\b)/.test(t);
  if (isMktMgr) return w.roleMktMgr;

  // CEO / Founder — decision-maker at small companies (often doubles as CMO)
  const isCeo =
    /\b(ceo|founder|co-?founder|cofounder|owner|president|presidente|socio|partner)\b/.test(t) ||
    /(chief executive|director general|managing director|fundador|propietario|due[ñn]o|gerente general|general manager)/.test(t);
  if (isCeo) return w.roleCeo;

  // Ops/Finance/Tech C-suite — can be decision-maker at small companies
  const isCsuite =
    /\b(coo|cfo|cto|cio|ciso|cao|cro|cso)\b/.test(t) ||
    /(chief operating|chief financial|chief technology|chief revenue|chief sales|chief information|director de operaciones|director financiero|director de tecnolog)/.test(t) ||
    /\b(vp|vice president|vicepresidente)\b/.test(t);
  if (isCsuite) return w.roleCsuite;

  // Fallback to Apollo seniority when the title alone is inconclusive.
  const s = (seniority || "").toLowerCase();
  if (s) {
    if (/founder|owner/.test(s)) return w.roleCeo;
    if (/c.?suite|cxo|partner/.test(s)) return w.roleCsuite;
    if (/head|director|vp/.test(s)) return /marketing|mercadeo|growth/.test(t) ? w.roleCmo : w.roleCsuite;
    if (/manager/.test(s) && /marketing|mercadeo|growth/.test(t)) return w.roleMktMgr;
  }

  return w.roleOther;
}

export function sizeScore(employeeCount: number | null | undefined, w: FitWeights): number {
  const n = employeeCount ?? 0;
  if (n >= 1 && n <= 10) return w.size1to10;
  if (n >= 11 && n <= 50) return w.size11to50;
  if (n >= 51 && n <= 200) return w.size51to200;
  return 0;
}

export function industryScore(industry: string | null | undefined, w: FitWeights): number {
  const i = (industry || "").toLowerCase();
  if (!i) return 0;
  // Tech/digital-native — highest marketing maturity
  const isTech =
    /(software|saas|fintech|information technology|computer|internet|telecommunication|telecom|\bit\b|tech\b|technolog|digital|e-?commerce|ecommerce|marketplace|startup|artificial intelligence|\bai\b|machine learning|cybersecurity|cloud)/.test(i);
  return isTech ? w.industryTech : w.industryOther;
}

function signalsScore(i: FitInput, w: FitWeights): number {
  let s = 0;
  if (i.sigLinkedinAds) s += w.linkedinAds;
  const freq = (i.sigPostFreq || "").toLowerCase();
  if (freq === "semanal" || freq === "weekly") s += w.postsWeekly;
  else if (freq === "mensual" || freq === "monthly") s += w.postsMonthly;
  if (i.sigDmActive) s += w.dmActiveLinkedin;
  if (i.sigMetaAds) s += w.metaAds;
  if (i.sigGoogleAds) s += w.googleAds;
  if (i.sigMgrNoHead) s += w.mgrNoHead;
  if (i.sigVacancy) s += w.vacancy;
  return s;
}

export function computeFitScore(
  input: FitInput,
  weights: FitWeights = DEFAULT_FIT_WEIGHTS,
  tiers: TierThresholds = DEFAULT_TIERS
): FitResult {
  const role = roleScore(input.title, weights, input.seniority);
  const size = sizeScore(input.employeeCount, weights);
  const industry = industryScore(input.industry, weights);
  const signals = signalsScore(input, weights);

  const fitScore = Math.min(100, Math.max(0, role + size + industry + signals));
  const fitTier: FitResult["fitTier"] =
    fitScore >= tiers.a ? "A" : fitScore >= tiers.b ? "B" : fitScore >= tiers.c ? "C" : "D";

  return { fitScore, fitTier, breakdown: { role, size, industry, signals } };
}

export function getFitWeights(): FitWeights {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, WEIGHTS_KEY)).get();
  if (!row?.value) return DEFAULT_FIT_WEIGHTS;
  try {
    return { ...DEFAULT_FIT_WEIGHTS, ...(JSON.parse(row.value) as Partial<FitWeights>) };
  } catch {
    return DEFAULT_FIT_WEIGHTS;
  }
}

export function getTierThresholds(): TierThresholds {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, TIERS_KEY)).get();
  if (!row?.value) return DEFAULT_TIERS;
  try {
    return { ...DEFAULT_TIERS, ...(JSON.parse(row.value) as Partial<TierThresholds>) };
  } catch {
    return DEFAULT_TIERS;
  }
}

export function saveFitWeights(w: Partial<FitWeights>): void {
  const merged = { ...getFitWeights(), ...w };
  db.insert(crmSettings)
    .values({ key: WEIGHTS_KEY, value: JSON.stringify(merged) })
    .onConflictDoUpdate({ target: crmSettings.key, set: { value: JSON.stringify(merged) } })
    .run();
}

export function saveTierThresholds(t: Partial<TierThresholds>): void {
  const merged = { ...getTierThresholds(), ...t };
  db.insert(crmSettings)
    .values({ key: TIERS_KEY, value: JSON.stringify(merged) })
    .onConflictDoUpdate({ target: crmSettings.key, set: { value: JSON.stringify(merged) } })
    .run();
}
