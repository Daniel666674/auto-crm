import cron from "node-cron";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { lt, eq, and } from "drizzle-orm";

let initialized = false;

export function initCronJobs() {
  if (initialized) return;
  initialized = true;

  // Sequence execution engine: every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      const { processSequenceSends } = await import("./sequences");
      await processSequenceSends();
    } catch (err) {
      console.error("[cron:sequences]", err);
    }
  });

  // Inbound reply capture: log replies from contacts on their timeline, every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    try {
      const { pollInboundReplies } = await import("./email-inbound");
      await pollInboundReplies();
    } catch (err) {
      console.error("[cron:inbound]", err);
    }
  });

  // Data retention check: daily at 03:00
  cron.schedule("0 3 * * *", () => {
    try {
      runRetentionCheck();
    } catch (err) {
      console.error("[cron:retention]", err);
    }
  });

  // Push: daily briefing at 08:00
  cron.schedule("0 8 * * *", async () => {
    try {
      const { sendDailyBriefing } = await import("./push");
      await sendDailyBriefing();
    } catch (err) {
      console.error("[cron:briefing]", err);
    }
  });

  // Push: retention review reminder every Monday at 09:00
  cron.schedule("0 9 * * 1", async () => {
    try {
      const { sendRetentionReviewNotification } = await import("./push");
      await sendRetentionReviewNotification();
    } catch (err) {
      console.error("[cron:retention-push]", err);
    }
  });

  // Run retention check immediately on startup
  setTimeout(() => {
    try { runRetentionCheck(); } catch { /* ignore startup failure */ }
  }, 5000);
}

export function runRetentionCheck() {
  const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
  // Mark contacts with no activity for 730+ days
  db.update(contacts)
    .set({ retentionReviewNeeded: true, updatedAt: new Date() })
    .where(
      and(
        lt(contacts.updatedAt, twoYearsAgo),
        eq(contacts.retentionReviewNeeded, false)
      )
    )
    .run();
}
