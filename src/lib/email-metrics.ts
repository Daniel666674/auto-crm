import { db } from "@/db";
import { emailEvents } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";

/**
 * Email performance metrics computed from the local email_events store.
 *
 * Opens from Gmail/Apple are unreliable: Gmail proxies images and Apple Mail
 * Privacy Protection auto-opens every message. So clicks and replies are the
 * primary intent signals here; opens are reported separately and machine/
 * prefetch opens are filtered out (and surfaced as `filteredOpens`).
 */

// Non-human openers: security scanners, link-preview bots, mail gateways.
// NB: "GoogleImageProxy" is a *real* Gmail open (fired when the user opens the
// message), so it is intentionally NOT treated as a bot.
const RX_BOT_UA = /bot|crawler|spider|monitor|preview|scanner|proofpoint|barracuda|mimecast|fortinet|microsoftpreview|googleweblight/i;

// Opens within this window of the send are almost certainly machine prefetch
// (Apple MPP / gateway scan), not a human opening the mail.
const PREFETCH_MS = 5000;

export interface EmailMetricsFilter {
  windowDays?: number;
  campaignId?: string;
  sequenceId?: string;
}

export interface EmailMetrics {
  windowDays: number;
  sent: number;
  delivered: number;
  uniqueOpens: number;
  totalOpens: number;
  filteredOpens: number;
  uniqueClicks: number;
  totalClicks: number;
  replies: number;
  unsubscribes: number;
  bounces: number;
  complaints: number;
  rates: {
    openRate: number;   // unique opens / delivered — indicative only
    clickRate: number;  // unique clicks / delivered — primary signal
    ctor: number;       // unique clicks / unique opens
    replyRate: number;  // replies / delivered — primary signal
    bounceRate: number;
    unsubRate: number;
  };
  topLinks: { url: string; clicks: number }[];
  daily: { date: string; sent: number; opens: number; clicks: number; replies: number }[];
}

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 0;
}

interface Ev {
  type: string;
  messageId: string | null;
  contactId: string | null;
  url: string | null;
  userAgent: string | null;
  createdAt: Date | null;
}

export function computeEmailMetrics(filter: EmailMetricsFilter = {}): EmailMetrics {
  const windowDays = filter.windowDays ?? 30;
  const since = new Date(Date.now() - windowDays * 86400_000);

  const conds = [gte(emailEvents.createdAt, since)];
  if (filter.campaignId) conds.push(eq(emailEvents.campaignId, filter.campaignId));
  if (filter.sequenceId) conds.push(eq(emailEvents.sequenceId, filter.sequenceId));

  const rows = db
    .select({
      type: emailEvents.type,
      messageId: emailEvents.messageId,
      contactId: emailEvents.contactId,
      url: emailEvents.url,
      userAgent: emailEvents.userAgent,
      createdAt: emailEvents.createdAt,
    })
    .from(emailEvents)
    .where(conds.length > 1 ? and(...conds) : conds[0])
    .all() as Ev[];

  // Send time per message — used to flag prefetch opens.
  const sentAt = new Map<string, number>();
  for (const e of rows) {
    if (e.type === "sent" && e.messageId && e.createdAt) {
      const ts = e.createdAt.getTime();
      const prev = sentAt.get(e.messageId);
      if (prev == null || ts < prev) sentAt.set(e.messageId, ts);
    }
  }

  const sentMsgs = new Set<string>();
  const bounceMsgs = new Set<string>();
  const openMsgs = new Set<string>();
  const clickMsgs = new Set<string>();
  let totalOpens = 0, filteredOpens = 0, totalClicks = 0;
  let replies = 0, unsubscribes = 0, bounces = 0, complaints = 0;
  const linkClicks = new Map<string, number>();

  const dayKey = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");
  const daily = new Map<string, { sent: number; opens: number; clicks: number; replies: number }>();
  const bump = (d: Date | null, k: "sent" | "opens" | "clicks" | "replies") => {
    const key = dayKey(d);
    const cur = daily.get(key) ?? { sent: 0, opens: 0, clicks: 0, replies: 0 };
    cur[k]++; daily.set(key, cur);
  };

  for (const e of rows) {
    switch (e.type) {
      case "sent":
        if (e.messageId) sentMsgs.add(e.messageId);
        bump(e.createdAt, "sent");
        break;
      case "open": {
        totalOpens++;
        const isBot = e.userAgent ? RX_BOT_UA.test(e.userAgent) : false;
        const st = e.messageId ? sentAt.get(e.messageId) : undefined;
        const isPrefetch = st != null && e.createdAt != null && e.createdAt.getTime() - st < PREFETCH_MS;
        if (isBot || isPrefetch) { filteredOpens++; break; }
        if (e.messageId) openMsgs.add(e.messageId);
        bump(e.createdAt, "opens");
        break;
      }
      case "click":
        totalClicks++;
        if (e.messageId) clickMsgs.add(e.messageId);
        if (e.url) linkClicks.set(e.url, (linkClicks.get(e.url) ?? 0) + 1);
        bump(e.createdAt, "clicks");
        break;
      case "reply": replies++; bump(e.createdAt, "replies"); break;
      case "unsubscribe": unsubscribes++; break;
      case "bounce": bounces++; if (e.messageId) bounceMsgs.add(e.messageId); break;
      case "complaint": complaints++; break;
    }
  }

  const sent = sentMsgs.size;
  const delivered = Math.max(0, sent - bounceMsgs.size);
  const uniqueOpens = openMsgs.size;
  const uniqueClicks = clickMsgs.size;
  const denom = delivered > 0 ? delivered : sent;

  const topLinks = [...linkClicks.entries()]
    .map(([url, clicks]) => ({ url, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const dailyArr = [...daily.entries()]
    .filter(([k]) => k !== "—")
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({ date, ...v }));

  return {
    windowDays,
    sent,
    delivered,
    uniqueOpens,
    totalOpens,
    filteredOpens,
    uniqueClicks,
    totalClicks,
    replies,
    unsubscribes,
    bounces,
    complaints,
    rates: {
      openRate: pct(uniqueOpens, denom),
      clickRate: pct(uniqueClicks, denom),
      ctor: pct(uniqueClicks, uniqueOpens),
      replyRate: pct(replies, denom),
      bounceRate: pct(bounceMsgs.size, sent),
      unsubRate: pct(unsubscribes, denom),
    },
    topLinks,
    daily: dailyArr,
  };
}
