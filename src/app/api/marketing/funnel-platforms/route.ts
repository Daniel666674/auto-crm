import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { FP_OVERVIEW, FP_PLATFORMS, type PlatformKey } from "@/components/marketing/mkt-funnel-platforms-data";
import { getMergedMetrics } from "@/lib/integrations";

// GET /api/marketing/funnel-platforms?period=30|90
// Julian's funnel structure, OVERLAID with real data:
//   • leads / won / revenue per platform  ← real, from contacts + won deals
//   • impressions / CPM / followers / spend / CTR ← live API or manual entry (M2/M3)
//   • CPL = spend / leads, budget split = real spend
// Anything not yet wired falls back to the seeded example values, and usingExampleData
// flags it so the UI can show a "datos de ejemplo" hint.

export const dynamic = "force-dynamic";

const DAY = 86400000;

function detectPlatform(c: { source: string | null; notes: string | null }): PlatformKey | "other" {
  const source = (c.source ?? "").toLowerCase();
  const notes = (c.notes ?? "").toLowerCase();
  const m = notes.match(/utm_source[=:\s]+([a-z0-9_\-.]+)/);
  const utm = m ? m[1] : "";
  const meta = ["meta", "facebook", "instagram", "fb", "ig"];
  const google = ["google", "google_ads", "googleads", "adwords", "google-ads"];
  const linkedin = ["linkedin", "linkedin_ads", "linkedin-ads"];
  if (meta.includes(source) || meta.includes(utm)) return "meta";
  if (google.includes(source) || google.includes(utm)) return "google";
  if (linkedin.includes(source) || linkedin.includes(utm)) return "linkedin";
  return "other";
}

const nf = (n: number) => n.toLocaleString("es-CO");
const compact = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);
const copK = (cents: number) => {
  const v = cents / 100;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(v >= 1e4 ? 0 : 2)}K`;
  return `$${Math.round(v)}`;
};

export async function GET(req: Request) {
  try {
    const period = Number(new URL(req.url).searchParams.get("period") ?? 30);
    const since = period > 0 ? Date.now() - period * DAY : 0;

    // ── Real CRM data per platform ────────────────────────────────────────────
    const rows = db.select({
      id: contacts.id, source: contacts.source, notes: contacts.notes, createdAt: contacts.createdAt,
    }).from(contacts).all();
    const leads: Record<PlatformKey, number> = { meta: 0, linkedin: 0, google: 0 };
    const platformByContact = new Map<string, PlatformKey | "other">();
    for (const c of rows) {
      const p = detectPlatform(c);
      platformByContact.set(c.id, p);
      const created = c.createdAt instanceof Date ? c.createdAt.getTime() : Number(c.createdAt ?? 0);
      if (p !== "other" && created >= since) leads[p]++;
    }

    const wonStageIds = new Set(db.select().from(pipelineStages).all().filter(s => s.isWon).map(s => s.id));
    const dealRows = db.select({ stageId: deals.stageId, value: deals.value, contactId: deals.contactId }).from(deals).all();
    const won: Record<PlatformKey, number> = { meta: 0, linkedin: 0, google: 0 };
    const revenue: Record<PlatformKey, number> = { meta: 0, linkedin: 0, google: 0 };
    for (const d of dealRows) {
      if (!wonStageIds.has(d.stageId)) continue;
      const p = d.contactId ? platformByContact.get(d.contactId) : "other";
      if (p && p !== "other") { won[p]++; revenue[p] += d.value; }
    }

    // ── Live / manual ad metrics ──────────────────────────────────────────────
    const merged = getMergedMetrics();
    let usedReal = false;
    let lastSyncAt: number | null = null;
    for (const p of ["meta", "linkedin", "google"] as PlatformKey[]) {
      if (merged[p].source !== "none") usedReal = true;
      if (merged[p].lastSyncAt) lastSyncAt = Math.max(lastSyncAt ?? 0, merged[p].lastSyncAt!);
      if (leads[p] > 0) usedReal = true;
    }

    // ── Clone seed and overlay real values where present ──────────────────────
    const overview = JSON.parse(JSON.stringify(FP_OVERVIEW));
    const platforms = JSON.parse(JSON.stringify(FP_PLATFORMS));

    for (const card of overview.health as Array<Record<string, unknown>>) {
      const p = card.platform as PlatformKey;
      const m = merged[p].metrics;
      if (p === "google") {
        // Google headline = real leads from CRM
        if (leads.google > 0) { card.value = nf(leads.google); }
        if (m.spendCents != null && leads.google > 0) (card.metrics as Array<{ label: string; value: string }>)[0].value = copK(Math.round(m.spendCents / leads.google));
        if (m.ctr != null) (card.metrics as Array<{ label: string; value: string }>)[1].value = `${m.ctr}%`;
      }
      if (p === "linkedin") {
        if (m.impressions != null) card.value = nf(m.impressions);
        if (m.cpmCents != null) (card.metrics as Array<{ label: string; value: string }>)[0].value = copK(m.cpmCents);
        if (m.frequency != null) (card.metrics as Array<{ label: string; value: string }>)[1].value = String(m.frequency);
      }
      if (p === "meta") {
        if (m.followers != null) card.value = `+${nf(m.followers)}`;
        if (m.cpmCents != null) (card.metrics as Array<{ label: string; value: string }>)[0].value = copK(m.cpmCents);
        if (m.engagementRate != null) (card.metrics as Array<{ label: string; value: string }>)[1].value = `${m.engagementRate}%`;
      }
    }

    for (const puck of overview.pucks as Array<Record<string, unknown>>) {
      const p = puck.platform as PlatformKey;
      const m = merged[p].metrics;
      if (p === "google" && leads.google > 0) puck.value = nf(leads.google);
      if (p === "linkedin" && m.impressions != null) puck.value = compact(m.impressions);
      if (p === "meta" && m.followers != null) puck.value = `+${nf(m.followers)}`;
    }

    // Real won revenue per platform → into platform detail KPIs (append a Revenue KPI note)
    for (const p of ["linkedin", "meta", "google"] as PlatformKey[]) {
      const det = platforms[p];
      if (won[p] > 0) {
        det.subtitle = `${won[p]} deal${won[p] === 1 ? "" : "s"} ganados · ${copK(revenue[p])} revenue`;
      }
    }

    // ── Budget split from real spend (if any) ─────────────────────────────────
    const spend = {
      meta: merged.meta.metrics.spendCents ?? 0,
      linkedin: merged.linkedin.metrics.spendCents ?? 0,
      google: merged.google.metrics.spendCents ?? 0,
    };
    const totalSpend = spend.meta + spend.linkedin + spend.google;
    if (totalSpend > 0) {
      const awareness = spend.linkedin + spend.meta;   // both run TOFU
      const conversion = spend.google;                  // BOFU
      const pctOf = (v: number) => Math.round((v / totalSpend) * 100);
      overview.budget.distribution = [
        { stage: "awareness", label: "Awareness", amount: copK(awareness), pct: pctOf(awareness) },
        { stage: "consideration", label: "Consideration", amount: "$0", pct: 0 },
        { stage: "conversion", label: "Conversion", amount: copK(conversion), pct: pctOf(conversion) },
      ];
      overview.budget.total.amount = copK(totalSpend);
      overview.budget.total.note = "datos en vivo";
      overview.budget.total.breakdown = [
        { platform: "linkedin", label: "LinkedIn", amount: copK(spend.linkedin) },
        { platform: "google", label: "Google", amount: copK(spend.google) },
        { platform: "meta", label: "Meta", amount: copK(spend.meta) },
      ];
    }

    return NextResponse.json({
      overview,
      platforms,
      connections: {
        meta: { configured: merged.meta.configured, source: merged.meta.source, lastSyncAt: merged.meta.lastSyncAt, error: merged.meta.error },
        linkedin: { configured: merged.linkedin.configured, source: merged.linkedin.source, lastSyncAt: merged.linkedin.lastSyncAt, error: merged.linkedin.error },
        google: { configured: merged.google.configured, source: merged.google.source, lastSyncAt: merged.google.lastSyncAt, error: merged.google.error },
      },
      real: { leads, won, revenue },
      usingExampleData: !usedReal,
      updatedAt: Date.now(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
