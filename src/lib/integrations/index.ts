import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AdPlatform, AdPlatformClient, PlatformMetrics, EMPTY_METRICS, SyncResult } from "./types";
import { metaClient } from "./meta";
import { linkedinClient } from "./linkedin";
import { googleAdsClient } from "./google-ads";

export * from "./types";

export const AD_CLIENTS: Record<AdPlatform, AdPlatformClient> = {
  meta: metaClient,
  linkedin: linkedinClient,
  google: googleAdsClient,
};

const CACHE_KEY = "ad_metrics_cache";   // last live sync results per platform
const MANUAL_KEY = "ad_metrics_manual"; // manual entry (M2) per platform

function readJson<T>(key: string, fallback: T): T {
  try {
    const row = db.select().from(crmSettings).where(eq(crmSettings.key, key)).get();
    return row?.value ? { ...fallback, ...(JSON.parse(row.value) as T) } : fallback;
  } catch { return fallback; }
}
function writeJson(key: string, value: unknown) {
  const v = JSON.stringify(value);
  const exists = db.select().from(crmSettings).where(eq(crmSettings.key, key)).get();
  if (exists) db.update(crmSettings).set({ value: v }).where(eq(crmSettings.key, key)).run();
  else db.insert(crmSettings).values({ key, value: v }).run();
}

type CacheShape = Partial<Record<AdPlatform, SyncResult>>;
type ManualShape = Partial<Record<AdPlatform, Partial<PlatformMetrics>>>;

export function loadCache(): CacheShape { return readJson<CacheShape>(CACHE_KEY, {}); }
export function saveCache(platform: AdPlatform, result: SyncResult) {
  const cache = loadCache(); cache[platform] = result; writeJson(CACHE_KEY, cache);
}
export function loadManual(): ManualShape { return readJson<ManualShape>(MANUAL_KEY, {}); }
export function saveManual(data: ManualShape) { writeJson(MANUAL_KEY, data); }

export interface MergedPlatform {
  platform: AdPlatform;
  configured: boolean;          // credentials present
  source: "live" | "manual" | "none";
  metrics: PlatformMetrics;
  lastSyncAt: number | null;
  error?: string;
}

/** Per-platform metrics, preferring live sync, then manual entry, then empty. */
export function getMergedMetrics(): Record<AdPlatform, MergedPlatform> {
  const cache = loadCache();
  const manual = loadManual();
  const out = {} as Record<AdPlatform, MergedPlatform>;
  for (const platform of Object.keys(AD_CLIENTS) as AdPlatform[]) {
    const client = AD_CLIENTS[platform];
    const configured = client.isConfigured();
    const live = cache[platform];
    const man = manual[platform];
    let source: MergedPlatform["source"] = "none";
    let metrics: PlatformMetrics = { ...EMPTY_METRICS };
    if (live?.connected && live.ok) { source = "live"; metrics = { ...EMPTY_METRICS, ...live.metrics }; }
    else if (man && Object.keys(man).length) { source = "manual"; metrics = { ...EMPTY_METRICS, ...man }; }
    out[platform] = { platform, configured, source, metrics, lastSyncAt: live?.fetchedAt ?? null, error: live?.error };
  }
  return out;
}

/** Trigger a live sync for one platform and cache the result. */
export async function syncPlatform(platform: AdPlatform, periodDays = 30): Promise<SyncResult> {
  const client = AD_CLIENTS[platform];
  const result = await client.fetchMetrics(periodDays);
  if (result.ok && result.connected) saveCache(platform, result);
  return result;
}

/** Sync every configured platform — used by the nightly scheduler and the sync-all route. */
export async function syncAll(periodDays = 30): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const platform of Object.keys(AD_CLIENTS) as AdPlatform[]) {
    if (!AD_CLIENTS[platform].isConfigured()) continue; // skip platforms without credentials
    try { results.push(await syncPlatform(platform, periodDays)); } catch { /* one platform failing must not block the rest */ }
  }
  return results;
}
