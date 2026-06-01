// Shared shape for every ad-platform client. Each platform fills what it can;
// missing fields stay null and the funnel renders them as "—" / connect-prompts.

export type AdPlatform = "meta" | "linkedin" | "google";

export interface PlatformMetrics {
  impressions: number | null;
  reach: number | null;
  frequency: number | null;
  cpmCents: number | null;      // COP cents
  spendCents: number | null;    // COP cents
  clicks: number | null;
  ctr: number | null;           // %
  followers: number | null;
  engagementRate: number | null; // %
  conversions: number | null;
  leads: number | null;
  pixelEvents: number | null;
  qualityScore: number | null;
}

export const EMPTY_METRICS: PlatformMetrics = {
  impressions: null, reach: null, frequency: null, cpmCents: null, spendCents: null,
  clicks: null, ctr: null, followers: null, engagementRate: null, conversions: null,
  leads: null, pixelEvents: null, qualityScore: null,
};

export interface SyncResult {
  platform: AdPlatform;
  ok: boolean;
  connected: boolean;   // were credentials present?
  metrics: PlatformMetrics;
  error?: string;
  fetchedAt: number;
}

export interface AdPlatformClient {
  platform: AdPlatform;
  /** True when the required env credentials are present. */
  isConfigured(): boolean;
  /** Pulls metrics for the trailing N days. Never throws — returns ok:false on error. */
  fetchMetrics(periodDays: number): Promise<SyncResult>;
}
