import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages, emailEvents } from "@/db/schema";

const LIFECYCLE_ORDER = ["subscriber", "lead", "MQL", "SQL", "opportunity", "customer", "evangelist"];

const PLATFORMS = ["meta", "google", "linkedin", "brevo", "organic", "otro"] as const;
type Platform = typeof PLATFORMS[number];

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function detectPlatform(c: { source: string | null; notes: string | null; tags: string | null }): Platform {
  const source = (c.source ?? "").toLowerCase();
  const notes = (c.notes ?? "").toLowerCase();
  const tags = parseTags(c.tags).map(t => t.toLowerCase());

  if (tags.includes("brevo")) return "brevo";

  const utmMatch = notes.match(/utm_source[=:\s]+([a-z0-9_\-.]+)/);
  const utm = utmMatch ? utmMatch[1] : "";

  const isMeta = (v: string) => ["meta", "facebook", "instagram", "fb", "ig"].includes(v);
  const isGoogle = (v: string) => ["google", "google_ads", "googleads", "adwords", "google-ads"].includes(v);
  const isLinkedin = (v: string) => ["linkedin", "linkedin_ads", "linkedin-ads"].includes(v);
  const isOrganic = (v: string) => ["website", "organic", "seo", "direct"].includes(v);

  if (isMeta(source) || isMeta(utm)) return "meta";
  if (isGoogle(source) || isGoogle(utm)) return "google";
  if (isLinkedin(source) || isLinkedin(utm)) return "linkedin";
  if (isOrganic(source) && !utm) return "organic";
  return "otro";
}

// GET /api/marketing/funnel?platform=all|meta|google|linkedin|brevo|organic|otro
// Returns the full funnel: lifecycle stage counts + deal stage counts + conversion rates.
// When platform is set, every metric (contacts, deals, email events) is filtered to
// contacts attributed to that platform via source / utm_source in notes / brevo tag.
export async function GET(req: NextRequest) {
  try {
    const rawPlatform = req.nextUrl.searchParams.get("platform")?.toLowerCase() ?? "all";
    const platform: Platform | "all" = (PLATFORMS as readonly string[]).includes(rawPlatform)
      ? (rawPlatform as Platform)
      : "all";

    const allContacts = db.select({
      id: contacts.id,
      lifecycleStage: contacts.lifecycleStage,
      returnedToMarketingAt: contacts.returnedToMarketingAt,
      fitTier: contacts.fitTier,
      temperature: contacts.temperature,
      source: contacts.source,
      notes: contacts.notes,
      tags: contacts.tags,
    }).from(contacts).all();

    // Distribution by platform across ALL contacts — chips render these counts.
    const platformCounts: Record<Platform, number> = { meta: 0, google: 0, linkedin: 0, brevo: 0, organic: 0, otro: 0 };
    for (const c of allContacts) platformCounts[detectPlatform(c)]++;

    const filteredContacts = platform === "all"
      ? allContacts
      : allContacts.filter(c => detectPlatform(c) === platform);
    const filteredIds = new Set(filteredContacts.map(c => c.id));

    // Lifecycle counts (cumulative — a customer is also counted as having passed all earlier stages)
    const lifecycleCounts: Record<string, number> = {};
    for (const s of LIFECYCLE_ORDER) lifecycleCounts[s] = 0;
    for (const c of filteredContacts) {
      const stage = c.lifecycleStage ?? "lead";
      const idx = LIFECYCLE_ORDER.indexOf(stage);
      if (idx >= 0) {
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

    // Deal stage breakdown — filtered to deals belonging to filtered contacts
    const allDealsRaw = db.select({ stageId: deals.stageId, value: deals.value, contactId: deals.contactId }).from(deals).all();
    const allDeals = platform === "all" ? allDealsRaw : allDealsRaw.filter(d => filteredIds.has(d.contactId));
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
    const returnedCount = filteredContacts.filter(c => c.returnedToMarketingAt).length;

    // Fit tier counts (missing → "D")
    const tierCounts = { A: 0, B: 0, C: 0, D: 0 };
    for (const c of filteredContacts) {
      const tier = (c.fitTier ?? "D") as "A" | "B" | "C" | "D";
      if (tier in tierCounts) tierCounts[tier]++;
      else tierCounts.D++;
    }

    // Temperature counts
    const tempCounts = { hot: 0, warm: 0, cold: 0 };
    for (const c of filteredContacts) {
      const t = c.temperature as "hot" | "warm" | "cold";
      if (t in tempCounts) tempCounts[t]++;
    }

    // Source counts (raw source values within the filtered set)
    const sourceCounts: Record<string, number> = {};
    for (const c of filteredContacts) {
      const src = c.source ?? "otro";
      sourceCounts[src] = (sourceCounts[src] ?? 0) + 1;
    }

    // Email performance — filtered to events from filtered contacts
    const emailEventsRows = db.select({ type: emailEvents.type, contactId: emailEvents.contactId }).from(emailEvents).all();
    const relevantEvents = platform === "all"
      ? emailEventsRows
      : emailEventsRows.filter(e => e.contactId && filteredIds.has(e.contactId));
    let sent = 0, opens = 0, clicks = 0, replies = 0;
    for (const ev of relevantEvents) {
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

    // Win rate from deals joined to pipeline stages (within filtered set)
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
      platform,
      platformCounts,
      lifecycleCounts,
      conversionRates,
      dealStageBreakdown,
      returnedCount,
      totalContacts: filteredContacts.length,
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
