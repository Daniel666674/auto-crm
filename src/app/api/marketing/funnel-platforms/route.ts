import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages, crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/marketing/funnel-platforms
// "Funnel por Plataforma" — maps each ad channel to the funnel stage it runs in
// (Awareness/TOFU -> Consideration/MOFU -> Conversion/BOFU) and reports health vs.
// stage-gate criteria, plus automatic gap detection.
//
// Honesty model: leads / conversions / revenue are REAL (derived from contacts +
// won deals attributed to each platform). Ad-only metrics (impressions, CPM,
// followers, frequency, CTR) come from editable config in crmSettings — null until
// a platform API is connected or the value is entered manually. Nothing is faked.

export const dynamic = "force-dynamic";

const CONFIG_KEY = "funnel_platforms_config";

type Stage = "awareness" | "consideration" | "conversion";
type PlatformId = "linkedin" | "meta" | "google_ads";

interface PlatformConfig {
  stage: Stage;
  badge: string;
  activeCampaigns: number;
  connected: boolean;
  // Manual/ad-API metrics (null = not available until connected/entered)
  impressions: number | null;
  followers: number | null;
  reach: number | null;
  frequency: number | null;
  cpmCents: number | null;
  engagementRate: number | null;
  ctr: number | null;
  spendCents: number | null;
  // Goals / stage gates
  goalKey: "impressions" | "followers" | "leads";
  goalValue: number;
  gateImpressions: number;
  gateFrequency: number;
  gateCpmCents: number;
}

type Config = { periodDays: number; lastSyncAt: number | null; platforms: Record<PlatformId, PlatformConfig> };

// Seeded to match Julian's layout — structure only, no fabricated ad metrics.
const DEFAULT_CONFIG: Config = {
  periodDays: 30,
  lastSyncAt: null,
  platforms: {
    linkedin: {
      stage: "awareness", badge: "Brand", activeCampaigns: 0, connected: false,
      impressions: null, followers: null, reach: null, frequency: null, cpmCents: null,
      engagementRate: null, ctr: null, spendCents: null,
      goalKey: "impressions", goalValue: 250000,
      gateImpressions: 250000, gateFrequency: 2.5, gateCpmCents: 35000 * 100,
    },
    meta: {
      stage: "awareness", badge: "Followers", activeCampaigns: 0, connected: false,
      impressions: null, followers: null, reach: null, frequency: null, cpmCents: null,
      engagementRate: null, ctr: null, spendCents: null,
      goalKey: "followers", goalValue: 500,
      gateImpressions: 200000, gateFrequency: 3, gateCpmCents: 30000 * 100,
    },
    google_ads: {
      stage: "conversion", badge: "Search", activeCampaigns: 0, connected: false,
      impressions: null, followers: null, reach: null, frequency: null, cpmCents: null,
      engagementRate: null, ctr: null, spendCents: null,
      goalKey: "leads", goalValue: 30,
      gateImpressions: 0, gateFrequency: 0, gateCpmCents: 0,
    },
  },
};

const PLATFORM_LABELS: Record<PlatformId, string> = { linkedin: "LinkedIn", meta: "Meta", google_ads: "Google Ads" };
const STAGE_LABELS: Record<Stage, string> = { awareness: "Awareness", consideration: "Consideration", conversion: "Conversion" };

// Maps a contact to a platform bucket (same heuristics the lifecycle funnel uses).
function detectPlatform(c: { source: string | null; notes: string | null }): PlatformId | "other" {
  const source = (c.source ?? "").toLowerCase();
  const notes = (c.notes ?? "").toLowerCase();
  const utmMatch = notes.match(/utm_source[=:\s]+([a-z0-9_\-.]+)/);
  const utm = utmMatch ? utmMatch[1] : "";
  const meta = ["meta", "facebook", "instagram", "fb", "ig"];
  const google = ["google", "google_ads", "googleads", "adwords", "google-ads"];
  const linkedin = ["linkedin", "linkedin_ads", "linkedin-ads"];
  if (meta.includes(source) || meta.includes(utm)) return "meta";
  if (google.includes(source) || google.includes(utm)) return "google_ads";
  if (linkedin.includes(source) || linkedin.includes(utm)) return "linkedin";
  return "other";
}

function loadConfig(): Config {
  try {
    const row = db.select().from(crmSettings).where(eq(crmSettings.key, CONFIG_KEY)).get();
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<Config>;
      // Deep-merge over defaults so new fields survive older saved blobs.
      const platforms = { ...DEFAULT_CONFIG.platforms };
      for (const id of Object.keys(platforms) as PlatformId[]) {
        platforms[id] = { ...DEFAULT_CONFIG.platforms[id], ...(parsed.platforms?.[id] ?? {}) };
      }
      return { periodDays: parsed.periodDays ?? 30, lastSyncAt: parsed.lastSyncAt ?? null, platforms };
    }
  } catch { /* fall through to defaults */ }
  return DEFAULT_CONFIG;
}

export async function GET() {
  try {
    const config = loadConfig();

    // ── Real per-platform leads / conversions / revenue ───────────────────────
    const allContacts = db.select({
      id: contacts.id, source: contacts.source, notes: contacts.notes,
    }).from(contacts).all();

    const leadsByPlatform: Record<PlatformId, number> = { linkedin: 0, meta: 0, google_ads: 0 };
    const contactPlatform = new Map<string, PlatformId | "other">();
    for (const c of allContacts) {
      const p = detectPlatform(c);
      contactPlatform.set(c.id, p);
      if (p !== "other") leadsByPlatform[p]++;
    }

    const wonStageIds = new Set(db.select().from(pipelineStages).all().filter(s => s.isWon).map(s => s.id));
    const allDeals = db.select({ stageId: deals.stageId, value: deals.value, contactId: deals.contactId }).from(deals).all();
    const convByPlatform: Record<PlatformId, number> = { linkedin: 0, meta: 0, google_ads: 0 };
    const revByPlatform: Record<PlatformId, number> = { linkedin: 0, meta: 0, google_ads: 0 };
    for (const d of allDeals) {
      if (!wonStageIds.has(d.stageId)) continue;
      const p = d.contactId ? contactPlatform.get(d.contactId) : "other";
      if (p && p !== "other") { convByPlatform[p]++; revByPlatform[p] += d.value; }
    }

    // ── Build per-platform payload ────────────────────────────────────────────
    const ids: PlatformId[] = ["linkedin", "meta", "google_ads"];
    const platforms = ids.map(id => {
      const cfg = config.platforms[id];
      const leads = leadsByPlatform[id];

      // Headline metric depends on the stage the platform runs in.
      let headlineValue: number | null;
      if (cfg.goalKey === "leads") headlineValue = leads;            // real
      else if (cfg.goalKey === "impressions") headlineValue = cfg.impressions; // ad-only
      else headlineValue = cfg.followers;                            // ad-only
      const pctToGoal = headlineValue != null && cfg.goalValue > 0
        ? Math.round((headlineValue / cfg.goalValue) * 100) : null;

      return {
        id, label: PLATFORM_LABELS[id], stage: cfg.stage, stageLabel: STAGE_LABELS[cfg.stage],
        badge: cfg.badge, activeCampaigns: cfg.activeCampaigns, connected: cfg.connected,
        headline: { key: cfg.goalKey, value: headlineValue, goal: cfg.goalValue, pctToGoal },
        metrics: {
          cpmCents: cfg.cpmCents, frequency: cfg.frequency, engagementRate: cfg.engagementRate,
          ctr: cfg.ctr, impressions: cfg.impressions, followers: cfg.followers, reach: cfg.reach,
        },
        // Real data — always available:
        leads, conversions: convByPlatform[id], revenueCents: revByPlatform[id],
        // Cost-per-lead is real only when spend is known.
        cplCents: cfg.spendCents != null && leads > 0 ? Math.round(cfg.spendCents / leads) : null,
      };
    });

    // ── Stage summary + gap detection ─────────────────────────────────────────
    const byStage: Record<Stage, PlatformId[]> = { awareness: [], consideration: [], conversion: [] };
    for (const p of platforms) byStage[p.stage].push(p.id);

    const gaps: { stage: Stage; severity: "critical" | "warn"; title: string; message: string }[] = [];
    if (byStage.consideration.length === 0 && (byStage.awareness.length > 0 || byStage.conversion.length > 0)) {
      gaps.push({
        stage: "consideration", severity: "critical",
        title: "Tu funnel tiene un hueco en Consideration",
        message: "Tienes plataformas en awareness y/o conversion, pero ninguna corriendo campañas de mid-funnel (retargeting, lead magnets, contenido de consideración). Los leads de conversión llegan en frío sin nutrición previa. Recomendación: lanza una campaña de retargeting hacia tus audiencias de awareness antes de que se enfríen.",
      });
    }
    if (byStage.conversion.length === 0 && byStage.awareness.length > 0) {
      gaps.push({
        stage: "conversion", severity: "critical",
        title: "Sin plataformas en Conversion",
        message: "Estás generando alcance pero ninguna plataforma está cerrando. Activa una campaña de conversión (search/retargeting BOFU) para capturar la demanda creada.",
      });
    }

    // ── Stage gates (graduation criteria) ─────────────────────────────────────
    const fmtCount = (n: number) => n.toLocaleString("es-CO");
    const stageGates = platforms
      .filter(p => p.stage !== "conversion")
      .map(p => {
        const cfg = config.platforms[p.id];
        const imp = cfg.impressions;
        const c1 = { label: "Impresiones", current: imp != null ? fmtCount(imp) : "—", target: fmtCount(cfg.gateImpressions), met: imp != null && imp >= cfg.gateImpressions };
        const c2 = { label: "Frecuencia", current: cfg.frequency != null ? cfg.frequency.toFixed(1) : "—", target: `≤ ${cfg.gateFrequency}`, met: cfg.frequency != null && cfg.frequency <= cfg.gateFrequency };
        const c3 = { label: "CPM", current: cfg.cpmCents != null ? `$${fmtCount(Math.round(cfg.cpmCents / 100))}` : "—", target: `< $${fmtCount(Math.round(cfg.gateCpmCents / 100))}`, met: cfg.cpmCents != null && cfg.cpmCents < cfg.gateCpmCents };
        const criteria = [c1, c2, c3];
        const metCount = criteria.filter(c => c.met).length;
        const nextStage: Stage = p.stage === "awareness" ? "consideration" : "conversion";
        return {
          platform: p.id, label: p.label, from: p.stage, fromLabel: STAGE_LABELS[p.stage],
          to: nextStage, toLabel: STAGE_LABELS[nextStage], criteria,
          pending: criteria.length - metCount, total: criteria.length,
        };
      });

    return NextResponse.json({
      periodDays: config.periodDays,
      lastSyncAt: config.lastSyncAt,
      anyConnected: platforms.some(p => p.connected),
      activePlatforms: platforms.filter(p => p.activeCampaigns > 0 || p.connected || p.leads > 0).length,
      platforms,
      stageSummary: {
        awareness: byStage.awareness.map(id => PLATFORM_LABELS[id]),
        consideration: byStage.consideration.map(id => PLATFORM_LABELS[id]),
        conversion: byStage.conversion.map(id => PLATFORM_LABELS[id]),
      },
      gaps,
      stageGates,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/marketing/funnel-platforms — persist editable config (stage, gates,
// manual metrics) so "Editar reglas" / manual entry survive reloads.
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const current = loadConfig();
    const next: Config = {
      periodDays: typeof body.periodDays === "number" ? body.periodDays : current.periodDays,
      lastSyncAt: typeof body.lastSyncAt === "number" ? body.lastSyncAt : current.lastSyncAt,
      platforms: { ...current.platforms },
    };
    if (body.platforms && typeof body.platforms === "object") {
      for (const id of Object.keys(next.platforms) as PlatformId[]) {
        if (body.platforms[id]) next.platforms[id] = { ...next.platforms[id], ...body.platforms[id] };
      }
    }
    const value = JSON.stringify(next);
    const exists = db.select().from(crmSettings).where(eq(crmSettings.key, CONFIG_KEY)).get();
    if (exists) db.update(crmSettings).set({ value }).where(eq(crmSettings.key, CONFIG_KEY)).run();
    else db.insert(crmSettings).values({ key: CONFIG_KEY, value }).run();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
