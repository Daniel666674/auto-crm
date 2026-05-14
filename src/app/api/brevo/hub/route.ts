import { NextResponse } from "next/server";

const KEY = (process.env.BREVO_API_KEY || "").replace(/^\[|\]$/g, "");
const H = { "api-key": KEY, "Content-Type": "application/json" };
const TIMEOUT_MS = 25_000;

function fetchWithTimeout(url: string, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { headers: H, cache: "no-store", signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function safeJson(url: string): Promise<any | null> {
  try {
    const r = await fetchWithTimeout(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function listCampaignsAllStatuses(): Promise<any[]> {
  const statuses = ["sent", "queued", "draft", "archive", "suspended"];
  const lists = await Promise.all(
    statuses.map(s => safeJson(`https://api.brevo.com/v3/emailCampaigns?limit=50&offset=0&status=${s}`).then(d => d?.campaigns || []))
  );
  return lists.flat();
}

async function enrichCampaigns(campaigns: any[]): Promise<any[]> {
  const enriched: any[] = [];
  const chunkSize = 8;
  for (let i = 0; i < campaigns.length; i += chunkSize) {
    const chunk = campaigns.slice(i, i + chunkSize);
    const detailed = await Promise.all(chunk.map(c => safeJson(`https://api.brevo.com/v3/emailCampaigns/${c.id}`)));
    for (let j = 0; j < chunk.length; j++) enriched.push(detailed[j] ?? chunk[j]);
  }
  return enriched;
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  if (!KEY) return NextResponse.json({ error: "BREVO_API_KEY no configurada" }, { status: 500 });

  // Fire all top-level requests in parallel
  const [account, listsRes, sendersRes, attrRes, webhooksRes, smtpAggRes, contactsHead, rawCampaigns] = await Promise.all([
    safeJson("https://api.brevo.com/v3/account"),
    safeJson("https://api.brevo.com/v3/contacts/lists?limit=50&offset=0&sort=desc"),
    safeJson("https://api.brevo.com/v3/senders"),
    safeJson("https://api.brevo.com/v3/contacts/attributes"),
    safeJson("https://api.brevo.com/v3/webhooks?type=transactional"),
    safeJson(`https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=${dateNDaysAgo(30)}&endDate=${dateNDaysAgo(0)}`),
    safeJson("https://api.brevo.com/v3/contacts?limit=1&offset=0"),
    listCampaignsAllStatuses(),
  ]);

  const campaigns = await enrichCampaigns(rawCampaigns);

  // Aggregate campaign totals
  const camp = campaigns.reduce(
    (acc, c) => {
      const gs = c?.statistics?.globalStats ?? {};
      const num = (v: any) => Number(v) || 0;
      acc.sent += num(gs.sent);
      acc.delivered += num(gs.delivered);
      acc.opens += num(gs.uniqueViews);
      acc.clicks += num(gs.uniqueClicks);
      acc.hardBounces += num(gs.hardBounces);
      acc.softBounces += num(gs.softBounces);
      acc.unsubs += num(gs.unsubscriptions);
      acc.complaints += num(gs.complaints);
      return acc;
    },
    { sent: 0, delivered: 0, opens: 0, clicks: 0, hardBounces: 0, softBounces: 0, unsubs: 0, complaints: 0 }
  );

  // Lists summary
  const lists = listsRes?.lists ?? [];
  const totalSubscribers = lists.reduce((s: number, l: any) => s + (l.uniqueSubscribers || 0), 0);
  const totalBlacklisted = lists.reduce((s: number, l: any) => s + (l.totalBlacklisted || 0), 0);

  // Transactional aggregated stats
  const smtp = smtpAggRes ?? null;

  return NextResponse.json({
    account: account
      ? {
          email: account.email,
          companyName: account.companyName,
          plan: account.plan,
          relay: account.relay,
          marketingAutomation: account.marketingAutomation,
          address: account.address,
        }
      : null,
    campaigns: {
      total: campaigns.length,
      byStatus: campaigns.reduce((acc: Record<string, number>, c: any) => {
        acc[c.status || "unknown"] = (acc[c.status || "unknown"] || 0) + 1;
        return acc;
      }, {}),
      totals: camp,
      items: campaigns.map((c: any) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        status: c.status,
        type: c.type,
        sender: c.sender,
        sentDate: c.sentDate,
        scheduledAt: c.scheduledAt,
        createdAt: c.createdAt,
        modifiedAt: c.modifiedAt,
        recipients: c.recipients,
        statistics: c.statistics?.globalStats ?? null,
      })),
    },
    lists: {
      total: lists.length,
      totalSubscribers,
      totalBlacklisted,
      items: lists.map((l: any) => ({
        id: l.id,
        name: l.name,
        totalSubscribers: l.totalSubscribers,
        uniqueSubscribers: l.uniqueSubscribers,
        totalBlacklisted: l.totalBlacklisted,
        folderId: l.folderId,
        createdAt: l.createdAt,
        campaignStats: l.campaignStats,
      })),
    },
    contacts: {
      total: contactsHead?.count ?? null,
      attributes: (attrRes?.attributes ?? []).map((a: any) => ({
        name: a.name,
        category: a.category,
        type: a.type,
      })),
    },
    senders: (sendersRes?.senders ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      active: s.active,
      ips: s.ips,
    })),
    webhooks: (webhooksRes ?? []).map((w: any) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      type: w.type,
      createdAt: w.createdAt,
    })),
    transactional: smtp
      ? {
          range: smtp.range,
          requests: smtp.requests,
          delivered: smtp.delivered,
          hardBounces: smtp.hardBounces,
          softBounces: smtp.softBounces,
          clicks: smtp.clicks,
          uniqueClicks: smtp.uniqueClicks,
          opens: smtp.opens,
          uniqueOpens: smtp.uniqueOpens,
          spamReports: smtp.spamReports,
          blocked: smtp.blocked,
          invalid: smtp.invalid,
          unsubscribed: smtp.unsubscribed,
        }
      : null,
    fetchedAt: new Date().toISOString(),
  });
}
