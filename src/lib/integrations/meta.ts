import { AdPlatformClient, SyncResult, EMPTY_METRICS } from "./types";

// Meta Marketing API (Graph v21) — insights endpoint.
// Add to .env.local:  META_ACCESS_TOKEN  (System User token)
//                     META_AD_ACCOUNT_ID (without the "act_" prefix)
// Optional:           META_USD_COP_RATE  (to convert spend/CPM to COP cents; default 4000)

function datePreset(days: number): string {
  if (days <= 7) return "last_7d";
  if (days <= 30) return "last_30d";
  if (days <= 90) return "last_90d";
  return "last_30d";
}

export const metaClient: AdPlatformClient = {
  platform: "meta",
  isConfigured() {
    return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);
  },
  async fetchMetrics(periodDays: number): Promise<SyncResult> {
    const fetchedAt = Date.now();
    if (!this.isConfigured()) {
      return { platform: "meta", ok: true, connected: false, metrics: { ...EMPTY_METRICS }, fetchedAt };
    }
    try {
      const token = process.env.META_ACCESS_TOKEN!;
      const acct = process.env.META_AD_ACCOUNT_ID!.replace(/^act_/, "");
      const rate = Number(process.env.META_USD_COP_RATE ?? 4000); // spend comes in account currency; treat as USD→COP if needed
      const fields = "impressions,reach,frequency,cpm,spend,clicks,ctr,actions";
      const url = `https://graph.facebook.com/v21.0/act_${acct}/insights?fields=${fields}&date_preset=${datePreset(periodDays)}&access_token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.error) return { platform: "meta", ok: false, connected: true, metrics: { ...EMPTY_METRICS }, error: json.error.message, fetchedAt };
      const row = json.data?.[0] ?? {};
      const spend = Number(row.spend ?? 0);
      const cpm = Number(row.cpm ?? 0);
      // Pixel/lead actions
      let leads: number | null = null;
      let pixel: number | null = null;
      if (Array.isArray(row.actions)) {
        for (const a of row.actions) {
          if (a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped") leads = (leads ?? 0) + Number(a.value);
          if (a.action_type === "landing_page_view" || a.action_type === "page_engagement") pixel = (pixel ?? 0) + Number(a.value);
        }
      }
      return {
        platform: "meta", ok: true, connected: true, fetchedAt,
        metrics: {
          ...EMPTY_METRICS,
          impressions: Number(row.impressions ?? 0),
          reach: Number(row.reach ?? 0),
          frequency: row.frequency != null ? +Number(row.frequency).toFixed(1) : null,
          cpmCents: cpm ? Math.round(cpm * rate * 100) : null,
          spendCents: spend ? Math.round(spend * rate * 100) : null,
          clicks: Number(row.clicks ?? 0),
          ctr: row.ctr != null ? +Number(row.ctr).toFixed(1) : null,
          leads, pixelEvents: pixel,
        },
      };
    } catch (e) {
      return { platform: "meta", ok: false, connected: true, metrics: { ...EMPTY_METRICS }, error: String(e), fetchedAt };
    }
  },
};
