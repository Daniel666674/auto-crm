import { syncAll } from "./index";

// In-process nightly-ish scheduler for ad-platform metrics. Started once from
// instrumentation.ts when the Node server boots (production only). No external
// cron needed — but the /api/marketing/funnel/sync-all route is also available
// if you prefer system crontab. Does nothing until a platform has credentials.

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

// Survive Next/HMR module reloads by stashing the flag on globalThis.
const g = globalThis as unknown as { __adSyncStarted?: boolean };

export function startAdSyncScheduler(): void {
  if (g.__adSyncStarted) return;
  g.__adSyncStarted = true;

  // First pull ~45s after boot (lets the server settle), then every 12h.
  setTimeout(() => { syncAll().catch(() => {}); }, 45_000);
  setInterval(() => { syncAll().catch(() => {}); }, TWELVE_HOURS);
}
