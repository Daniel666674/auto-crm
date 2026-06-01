import { AdPlatformClient, SyncResult, EMPTY_METRICS } from "./types";

// Google Ads API (REST v17) — searchStream with GAQL.
// Add to .env.local:  GOOGLE_ADS_DEVELOPER_TOKEN
//                     GOOGLE_ADS_ACCESS_TOKEN      (OAuth access token; refresh handled upstream)
//                     GOOGLE_ADS_CUSTOMER_ID       (10-digit, no dashes)
// Optional:           GOOGLE_ADS_LOGIN_CUSTOMER_ID (manager account id)
// Note: developer token needs Google approval (~3 business days). Inert until set.

function duringClause(days: number): string {
  if (days <= 7) return "LAST_7_DAYS";
  if (days <= 30) return "LAST_30_DAYS";
  return "LAST_30_DAYS";
}

export const googleAdsClient: AdPlatformClient = {
  platform: "google",
  isConfigured() {
    return Boolean(
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_ACCESS_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID
    );
  },
  async fetchMetrics(periodDays: number): Promise<SyncResult> {
    const fetchedAt = Date.now();
    if (!this.isConfigured()) {
      return { platform: "google", ok: true, connected: false, metrics: { ...EMPTY_METRICS }, fetchedAt };
    }
    try {
      const customer = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, "");
      const headers: Record<string, string> = {
        Authorization: `Bearer ${process.env.GOOGLE_ADS_ACCESS_TOKEN}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
      };
      if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers["login-customer-id"] = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, "");
      const query = `SELECT metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc FROM customer WHERE segments.date DURING ${duringClause(periodDays)}`;
      const res = await fetch(`https://googleads.googleapis.com/v17/customers/${customer}/googleAds:searchStream`, {
        method: "POST", cache: "no-store", headers, body: JSON.stringify({ query }),
      });
      const json = await res.json();
      const err = Array.isArray(json) ? json[0]?.error : json.error;
      if (err) return { platform: "google", ok: false, connected: true, metrics: { ...EMPTY_METRICS }, error: err.message ?? "Google Ads error", fetchedAt };
      // searchStream returns an array of chunks, each with results[]
      const chunks = Array.isArray(json) ? json : [json];
      let impressions = 0, clicks = 0, costMicros = 0, conversions = 0;
      for (const chunk of chunks) {
        for (const r of chunk.results ?? []) {
          impressions += Number(r.metrics?.impressions ?? 0);
          clicks += Number(r.metrics?.clicks ?? 0);
          costMicros += Number(r.metrics?.costMicros ?? r.metrics?.cost_micros ?? 0);
          conversions += Number(r.metrics?.conversions ?? 0);
        }
      }
      const spendCop = costMicros / 1_000_000; // micros are in account currency (assume COP)
      return {
        platform: "google", ok: true, connected: true, fetchedAt,
        metrics: {
          ...EMPTY_METRICS,
          impressions, clicks, conversions, leads: Math.round(conversions),
          ctr: impressions > 0 ? +((clicks / impressions) * 100).toFixed(1) : null,
          spendCents: Math.round(spendCop * 100),
          cpmCents: impressions > 0 ? Math.round((spendCop / impressions) * 1000 * 100) : null,
        },
      };
    } catch (e) {
      return { platform: "google", ok: false, connected: true, metrics: { ...EMPTY_METRICS }, error: String(e), fetchedAt };
    }
  },
};
