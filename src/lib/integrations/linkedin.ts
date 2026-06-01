import { AdPlatformClient, SyncResult, EMPTY_METRICS } from "./types";

// LinkedIn Marketing API — adAnalytics endpoint.
// Add to .env.local:  LINKEDIN_ACCESS_TOKEN
//                     LINKEDIN_AD_ACCOUNT_ID  (numeric sponsored account id)
// Optional:           LINKEDIN_USD_COP_RATE (default 4000)
// Note: requires Marketing Developer Platform approval. Until then this stays inert.

function range(days: number) {
  const end = new Date();
  const startD = new Date(Date.now() - days * 86400000);
  const p = (d: Date) => ({ day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() });
  return { start: p(startD), end: p(end) };
}

export const linkedinClient: AdPlatformClient = {
  platform: "linkedin",
  isConfigured() {
    return Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AD_ACCOUNT_ID);
  },
  async fetchMetrics(periodDays: number): Promise<SyncResult> {
    const fetchedAt = Date.now();
    if (!this.isConfigured()) {
      return { platform: "linkedin", ok: true, connected: false, metrics: { ...EMPTY_METRICS }, fetchedAt };
    }
    try {
      const token = process.env.LINKEDIN_ACCESS_TOKEN!;
      const acct = process.env.LINKEDIN_AD_ACCOUNT_ID!;
      const rate = Number(process.env.LINKEDIN_USD_COP_RATE ?? 4000);
      const { start, end } = range(periodDays);
      const accountUrn = encodeURIComponent(`urn:li:sponsoredAccount:${acct}`);
      const fields = "impressions,clicks,costInUsd,likes,comments,shares,follows,landingPageClicks";
      const url = `https://api.linkedin.com/rest/adAnalytics?q=analytics&pivot=ACCOUNT&timeGranularity=ALL` +
        `&dateRange.start.day=${start.day}&dateRange.start.month=${start.month}&dateRange.start.year=${start.year}` +
        `&dateRange.end.day=${end.day}&dateRange.end.month=${end.month}&dateRange.end.year=${end.year}` +
        `&accounts[0]=${accountUrn}&fields=${fields}`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, "LinkedIn-Version": "202410", "X-Restli-Protocol-Version": "2.0.0" },
      });
      const json = await res.json();
      if (json.message && !json.elements) return { platform: "linkedin", ok: false, connected: true, metrics: { ...EMPTY_METRICS }, error: json.message, fetchedAt };
      const row = json.elements?.[0] ?? {};
      const impressions = Number(row.impressions ?? 0);
      const clicks = Number(row.clicks ?? 0);
      const cost = Number(row.costInUsd ?? 0);
      const engagements = Number(row.likes ?? 0) + Number(row.comments ?? 0) + Number(row.shares ?? 0);
      return {
        platform: "linkedin", ok: true, connected: true, fetchedAt,
        metrics: {
          ...EMPTY_METRICS,
          impressions, clicks,
          ctr: impressions > 0 ? +((clicks / impressions) * 100).toFixed(1) : null,
          cpmCents: impressions > 0 ? Math.round((cost / impressions) * 1000 * rate * 100) : null,
          spendCents: Math.round(cost * rate * 100),
          followers: row.follows != null ? Number(row.follows) : null,
          engagementRate: impressions > 0 ? +((engagements / impressions) * 100).toFixed(1) : null,
        },
      };
    } catch (e) {
      return { platform: "linkedin", ok: false, connected: true, metrics: { ...EMPTY_METRICS }, error: String(e), fetchedAt };
    }
  },
};
