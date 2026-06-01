import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { FP_OVERVIEW, FP_PLATFORMS, type PlatformKey } from "@/components/marketing/mkt-funnel-platforms-data";
import { getMergedMetrics } from "@/lib/integrations";

// GET /api/marketing/funnel-platforms?period=30|90
// Builds the funnel from REAL data only — no hardcoded numbers. Starts from the
// empty template and fills: leads/won/revenue (CRM), ad metrics (live/manual),
// derived CPL/ROAS, dynamic gap banner, tallies, budget. Anything without a value
// stays "—".

export const dynamic = "force-dynamic";
const DAY = 86400000;
const DASH = "—";

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
const relTime = (ts: number | null) => {
  if (!ts) return "sin sincronizar";
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "hace segundos";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} d`;
};

export async function GET(req: Request) {
  try {
    const period = Number(new URL(req.url).searchParams.get("period") ?? 30);
    const since = period > 0 ? Date.now() - period * DAY : 0;

    // ── Real CRM: leads / won / revenue per platform ──────────────────────────
    const rows = db.select({ id: contacts.id, source: contacts.source, notes: contacts.notes, createdAt: contacts.createdAt }).from(contacts).all();
    const leads: Record<PlatformKey, number> = { meta: 0, linkedin: 0, google: 0 };
    const byContact = new Map<string, PlatformKey | "other">();
    for (const c of rows) {
      const p = detectPlatform(c);
      byContact.set(c.id, p);
      const created = c.createdAt instanceof Date ? c.createdAt.getTime() : Number(c.createdAt ?? 0);
      if (p !== "other" && created >= since) leads[p]++;
    }
    const wonStageIds = new Set(db.select().from(pipelineStages).all().filter(s => s.isWon).map(s => s.id));
    const won: Record<PlatformKey, number> = { meta: 0, linkedin: 0, google: 0 };
    const revenue: Record<PlatformKey, number> = { meta: 0, linkedin: 0, google: 0 };
    for (const d of db.select({ stageId: deals.stageId, value: deals.value, contactId: deals.contactId }).from(deals).all()) {
      if (!wonStageIds.has(d.stageId)) continue;
      const p = d.contactId ? byContact.get(d.contactId) : "other";
      if (p && p !== "other") { won[p]++; revenue[p] += d.value; }
    }

    const merged = getMergedMetrics();
    const M = (p: PlatformKey) => merged[p].metrics;
    const stageOf: Record<PlatformKey, "awareness" | "conversion"> = { linkedin: "awareness", meta: "awareness", google: "conversion" };
    const active = (p: PlatformKey) => (M(p).spendCents ?? 0) > 0 || leads[p] > 0 || merged[p].source === "live";
    const activePlatforms = (["linkedin", "meta", "google"] as PlatformKey[]).filter(active);
    let lastSyncAt: number | null = null;
    for (const p of ["meta", "linkedin", "google"] as PlatformKey[]) if (merged[p].lastSyncAt) lastSyncAt = Math.max(lastSyncAt ?? 0, merged[p].lastSyncAt!);

    const overview = JSON.parse(JSON.stringify(FP_OVERVIEW)) as typeof FP_OVERVIEW;
    const platforms = JSON.parse(JSON.stringify(FP_PLATFORMS)) as typeof FP_PLATFORMS;

    overview.header.pill = `${activePlatforms.length} plataforma${activePlatforms.length === 1 ? "" : "s"} activa${activePlatforms.length === 1 ? "" : "s"}`;
    overview.lastSync = relTime(lastSyncAt);

    // Headline value per platform: leads (google), impressions (linkedin), followers (meta)
    const headline = (p: PlatformKey): string => {
      if (p === "google") return leads.google > 0 ? nf(leads.google) : DASH;
      if (p === "linkedin") return M("linkedin").impressions != null ? nf(M("linkedin").impressions!) : DASH;
      return M("meta").followers != null ? `+${nf(M("meta").followers!)}` : DASH;
    };
    const cpl = (p: PlatformKey): string => {
      const s = M(p).spendCents; return s != null && leads[p] > 0 ? copK(Math.round(s / leads[p])) : DASH;
    };

    // ── Pucks ─────────────────────────────────────────────────────────────────
    for (const puck of overview.pucks) {
      const p = puck.platform;
      puck.value = p === "linkedin" ? (M("linkedin").impressions != null ? compact(M("linkedin").impressions!) : DASH) : headline(p);
      if (M(p).spendCents != null) { puck.footer = "Inversión: "; puck.delta = copK(M(p).spendCents!); puck.deltaUp = true; }
    }

    // ── Health cards ──────────────────────────────────────────────────────────
    for (const card of overview.health) {
      const p = card.platform;
      card.value = headline(p);
      if (active(p)) card.sub = `${won[p]} ganados · ${copK(revenue[p])}`;
      if (p === "linkedin") {
        if (M("linkedin").cpmCents != null) card.metrics[0].value = copK(M("linkedin").cpmCents!);
        if (M("linkedin").frequency != null) card.metrics[1].value = String(M("linkedin").frequency);
      } else if (p === "meta") {
        if (M("meta").cpmCents != null) card.metrics[0].value = copK(M("meta").cpmCents!);
        if (M("meta").engagementRate != null) card.metrics[1].value = `${M("meta").engagementRate}%`;
      } else {
        card.metrics[0].value = cpl("google");
        if (M("google").ctr != null) card.metrics[1].value = `${M("google").ctr}%`;
      }
    }

    // ── Tallies (real active counts per stage) ────────────────────────────────
    const inStage = (st: "awareness" | "consideration" | "conversion") => activePlatforms.filter(p => stageOf[p] === st);
    overview.tallies = (["awareness", "consideration", "conversion"] as const).map(st => {
      const list = inStage(st);
      const empty = list.length === 0;
      return {
        label: `Plataformas en ${st}`, value: String(list.length), color: st,
        note: empty ? (st === "consideration" && activePlatforms.length > 0 ? "⚠ Hueco crítico" : "—") : list.map(p => platforms[p].name.split(" ")[0]).join(", "),
        noteColor: (empty && st === "consideration" && activePlatforms.length > 0 ? "retention" : "muted"),
        dashed: empty && st === "consideration" && activePlatforms.length > 0,
      };
    }) as typeof overview.tallies;

    // ── Dynamic gap banner (no hardcoded copy) ────────────────────────────────
    if (activePlatforms.length === 0) {
      // keep the default "connect" banner from the template
    } else if (inStage("consideration").length === 0) {
      overview.banner = {
        title: "Tu funnel tiene un hueco en Consideration",
        pill: "Detección automática",
        body: [
          { t: `Tienes ${activePlatforms.length} plataforma(s) activas en awareness/conversion pero ninguna en consideration (retargeting, lead magnets, mid-funnel). Los leads de conversión llegan en frío. ` },
          { t: "Recomendación:", em: "gold" },
          { t: " lanza una campaña de retargeting hacia tus audiencias de awareness antes de que se enfríen." },
        ],
        button: "Crear tarea de campaña",
      };
    } else {
      overview.banner = {
        title: "Funnel cubierto en las 3 etapas",
        pill: "Saludable",
        body: [{ t: "Tienes presencia en awareness, consideration y conversion. Vigila CPL y ROAS por plataforma para reasignar presupuesto." }],
        button: "Crear tarea de campaña",
      };
    }

    // ── Budget split from real spend ──────────────────────────────────────────
    const spend = { meta: M("meta").spendCents ?? 0, linkedin: M("linkedin").spendCents ?? 0, google: M("google").spendCents ?? 0 };
    const totalSpend = spend.meta + spend.linkedin + spend.google;
    if (totalSpend > 0) {
      const aw = spend.linkedin + spend.meta, cv = spend.google;
      const pctOf = (v: number) => Math.round((v / totalSpend) * 100);
      overview.budget.distribution = [
        { stage: "awareness", label: "Awareness", amount: copK(aw), pct: pctOf(aw) },
        { stage: "consideration", label: "Consideration", amount: "$0", pct: 0 },
        { stage: "conversion", label: "Conversion", amount: copK(cv), pct: pctOf(cv) },
      ];
      overview.budget.total = {
        amount: copK(totalSpend), note: "datos en vivo",
        breakdown: [
          { platform: "linkedin", label: "LinkedIn", amount: copK(spend.linkedin) },
          { platform: "google", label: "Google", amount: copK(spend.google) },
          { platform: "meta", label: "Meta", amount: copK(spend.meta) },
        ],
      };
    }

    // ── Per-platform detail: KPIs + progression + subtitle + dynamic recs ──────
    for (const p of ["linkedin", "meta", "google"] as PlatformKey[]) {
      const det = platforms[p]; const m = M(p);
      det.subtitle = active(p) ? `${won[p]} deals ganados · ${copK(revenue[p])} revenue` : (merged[p].configured ? "Conectado · sin datos aún" : "Sin conectar");
      const set = (label: string, value: string) => { const k = det.kpis.find(x => x.label === label); if (k && value !== DASH) k.value = value; };
      if (p === "linkedin") {
        if (m.impressions != null) set("Impresiones", nf(m.impressions));
        if (m.reach != null) set("Reach", nf(m.reach));
        if (m.frequency != null) set("Frecuencia", String(m.frequency));
        if (m.cpmCents != null) set("CPM", copK(m.cpmCents));
        if (m.engagementRate != null) set("Engagement Rate", `${m.engagementRate}%`);
        if (m.impressions != null) det.progression.cols[0].detailStrong = `${nf(m.impressions)} imp${m.reach != null ? ` · ${nf(m.reach)} reach` : ""}${m.frequency != null ? ` · ${m.frequency} freq` : ""}`;
      } else if (p === "meta") {
        if (m.followers != null) set("Seguidores nuevos", `+${nf(m.followers)}`);
        if (m.reach != null) set("Alcance", nf(m.reach));
        if (m.cpmCents != null) set("CPM", copK(m.cpmCents));
        if (m.engagementRate != null) set("Engagement Rate", `${m.engagementRate}%`);
        if (m.pixelEvents != null) set("Pixel events", nf(m.pixelEvents));
        if (m.followers != null) det.progression.cols[0].detailStrong = `+${nf(m.followers)} fans${m.engagementRate != null ? ` · ${m.engagementRate}% eng` : ""}`;
      } else {
        if (leads.google > 0) set("Leads", nf(leads.google));
        set("CPL", cpl("google"));
        if (m.ctr != null) set("CTR Search", `${m.ctr}%`);
        if (m.qualityScore != null) set("Quality Score", `${m.qualityScore}/10`);
        if (leads.google > 0) det.progression.cols[2].detailStrong = `${nf(leads.google)} leads${cpl("google") !== DASH ? ` · CPL ${cpl("google")}` : ""}`;
      }
      // dynamic, honest recommendations
      const recs = det.recommendations as { variant: string; eyebrow: string; title: string; body: { t: string }[]; button?: string }[];
      if (!merged[p].configured && merged[p].source !== "manual") {
        recs.push({ variant: "banner", eyebrow: "Configuración", title: `Conecta ${det.name} para datos en vivo`, body: [{ t: "Agrega las credenciales en .env.local o ingresa tu inversión en Datos de Pauta para ver CPM, CPL y ROAS reales." }], button: "Cómo conectar" });
      }
      if (won[p] > 0) recs.push({ variant: "success", eyebrow: "Revenue atribuido", title: `${won[p]} deal(s) ganados desde ${det.name}`, body: [{ t: `Este canal ya generó ${copK(revenue[p])} en revenue cerrado. ${leads[p]} leads atribuidos.` }] });
    }

    return NextResponse.json({
      overview, platforms,
      connections: Object.fromEntries((["meta", "linkedin", "google"] as PlatformKey[]).map(p => [p, { configured: merged[p].configured, source: merged[p].source, lastSyncAt: merged[p].lastSyncAt, error: merged[p].error }])),
      real: { leads, won, revenue },
      hasAnyData: activePlatforms.length > 0,
      updatedAt: Date.now(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
