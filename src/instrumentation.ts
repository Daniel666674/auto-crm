// Next.js instrumentation — runs once when the server process starts.
// Boots the ad-platform auto-sync scheduler in production on the Node runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  const { startAdSyncScheduler } = await import("./lib/integrations/scheduler");
  startAdSyncScheduler();
}
