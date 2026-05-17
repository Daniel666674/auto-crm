import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

const DAY = 86400000;

type MktContact = {
  id: string; tier: number; score: number; engagement_status: string;
  ready_for_sales: number; passed_to_sales_at: number | null;
  last_activity: number; source: string; email_opens: number;
  email_clicks: number; email_bounced: number; email_unsubscribed: number;
};

type MktCampaign = {
  id: string; name: string; status: string; start_date: number;
  channel: string; open_rate: number; click_rate: number; reply_rate: number;
  total_contacts: number; conversions: number; last_sent: number | null;
  outcome_reason_id: string | null; closed_at: number | null;
  target_segment: string;
};

type Outcome = { id: string; label: string; type: string };

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const months = Math.min(36, Math.max(3, Number(searchParams.get("months") ?? 12)));
  const now = Date.now();
  const fromTs = now - months * 30 * DAY;

  const contacts = mktDb.prepare("SELECT * FROM mkt_contacts").all() as MktContact[];
  const campaigns = mktDb.prepare("SELECT * FROM mkt_campaigns").all() as MktCampaign[];
  const outcomes = mktDb.prepare("SELECT id, label, type FROM campaign_outcomes").all() as Outcome[];
  const outcomeMap = new Map(outcomes.map((o) => [o.id, o]));

  // --------------------------------------------------------------------------
  // KPIs
  // --------------------------------------------------------------------------
  const totalContacts = contacts.length;
  const handoffsInPeriod = contacts.filter(
    (c) => c.passed_to_sales_at && c.passed_to_sales_at >= fromTs
  );
  const totalHandoffs = handoffsInPeriod.length;
  const handoffRate = totalContacts > 0 ? (totalHandoffs / totalContacts) * 100 : 0;

  const hotContacts = contacts.filter((c) => c.engagement_status === "hot" || c.engagement_status === "warm").length;
  const tierCounts = [1, 2, 3, 4].map((t) => ({
    tier: t,
    count: contacts.filter((c) => c.tier === t).length,
  }));

  // Avg time-to-handoff (days from creation to passed_to_sales_at).
  // Approximated using last_activity as a proxy when no created_at exists.
  const handoffVelocities = handoffsInPeriod
    .map((c) => {
      if (!c.passed_to_sales_at || !c.last_activity) return null;
      // Use earliest known timestamp as proxy for creation
      return Math.max(0, (c.passed_to_sales_at - c.last_activity) / DAY);
    })
    .filter((v): v is number => v !== null && v >= 0);
  const avgHandoffDays = handoffVelocities.length > 0
    ? Math.round(handoffVelocities.reduce((s, v) => s + v, 0) / handoffVelocities.length)
    : null;

  // --------------------------------------------------------------------------
  // Engagement funnel: total → engaged (opens>0) → clicked → hot/warm → handoff
  // --------------------------------------------------------------------------
  const engaged = contacts.filter((c) => c.email_opens > 0 || c.email_clicks > 0).length;
  const clicked = contacts.filter((c) => c.email_clicks > 0).length;
  const hot = contacts.filter((c) => c.engagement_status === "hot").length;
  const handoffs = contacts.filter((c) => c.ready_for_sales === 1).length;
  const funnel = [
    { stage: "Total contactos", count: totalContacts },
    { stage: "Engaged (open o click)", count: engaged },
    { stage: "Clicked", count: clicked },
    { stage: "Hot", count: hot },
    { stage: "Handoff a ventas", count: handoffs },
  ];

  // --------------------------------------------------------------------------
  // Source attribution
  // --------------------------------------------------------------------------
  const bySource = new Map<string, { total: number; handoffs: number; engaged: number; hot: number }>();
  for (const c of contacts) {
    const src = c.source || "unknown";
    if (!bySource.has(src)) bySource.set(src, { total: 0, handoffs: 0, engaged: 0, hot: 0 });
    const entry = bySource.get(src)!;
    entry.total += 1;
    if (c.ready_for_sales === 1) entry.handoffs += 1;
    if (c.email_opens > 0 || c.email_clicks > 0) entry.engaged += 1;
    if (c.engagement_status === "hot") entry.hot += 1;
  }
  const sourceBreakdown = Array.from(bySource.entries())
    .map(([source, v]) => ({
      source,
      total: v.total,
      handoffs: v.handoffs,
      engaged: v.engaged,
      hot: v.hot,
      conversionRate: v.total > 0 ? (v.handoffs / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.handoffs - a.handoffs);

  // --------------------------------------------------------------------------
  // Channel performance (campaigns grouped by channel)
  // --------------------------------------------------------------------------
  const byChannel = new Map<string, { campaigns: number; sent: number; avgOpen: number; avgClick: number; conversions: number }>();
  for (const camp of campaigns) {
    const ch = camp.channel || "unknown";
    if (!byChannel.has(ch)) byChannel.set(ch, { campaigns: 0, sent: 0, avgOpen: 0, avgClick: 0, conversions: 0 });
    const entry = byChannel.get(ch)!;
    entry.campaigns += 1;
    entry.sent += camp.total_contacts;
    entry.avgOpen += camp.open_rate;
    entry.avgClick += camp.click_rate;
    entry.conversions += camp.conversions;
  }
  const channelBreakdown = Array.from(byChannel.entries()).map(([channel, v]) => ({
    channel,
    campaigns: v.campaigns,
    contactsSent: v.sent,
    avgOpenRate: v.campaigns > 0 ? v.avgOpen / v.campaigns : 0,
    avgClickRate: v.campaigns > 0 ? v.avgClick / v.campaigns : 0,
    conversions: v.conversions,
  })).sort((a, b) => b.conversions - a.conversions);

  // --------------------------------------------------------------------------
  // Monthly trend (handoffs + avg open rate per month)
  // --------------------------------------------------------------------------
  const monthlyTrend: Array<{ label: string; year: number; month: number; handoffs: number; avgOpenRate: number; campaignsStarted: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now);
    ref.setMonth(ref.getMonth() - i);
    const year = ref.getFullYear();
    const month = ref.getMonth();
    const start = new Date(year, month, 1).getTime();
    const end = new Date(year, month + 1, 1).getTime();

    const monthHandoffs = contacts.filter(
      (c) => c.passed_to_sales_at && c.passed_to_sales_at >= start && c.passed_to_sales_at < end
    ).length;
    const monthCampaigns = campaigns.filter((c) => c.start_date >= start && c.start_date < end);
    const avgOpen = monthCampaigns.length > 0
      ? monthCampaigns.reduce((s, c) => s + c.open_rate, 0) / monthCampaigns.length
      : 0;

    monthlyTrend.push({
      label: ref.toLocaleDateString("es-CO", { month: "short", year: "2-digit" }),
      year, month: month + 1,
      handoffs: monthHandoffs,
      avgOpenRate: avgOpen,
      campaignsStarted: monthCampaigns.length,
    });
  }

  // --------------------------------------------------------------------------
  // Outcome breakdown (completed campaigns grouped by outcome)
  // --------------------------------------------------------------------------
  const outcomeCounts = new Map<string, { label: string; type: string; count: number }>();
  for (const c of campaigns) {
    if (!c.outcome_reason_id) continue;
    const o = outcomeMap.get(c.outcome_reason_id);
    if (!o) continue;
    if (!outcomeCounts.has(c.outcome_reason_id)) {
      outcomeCounts.set(c.outcome_reason_id, { label: o.label, type: o.type, count: 0 });
    }
    outcomeCounts.get(c.outcome_reason_id)!.count += 1;
  }
  const outcomeBreakdown = Array.from(outcomeCounts.values()).sort((a, b) => b.count - a.count);

  // --------------------------------------------------------------------------
  // Top campaigns by handoffs/conversions
  // --------------------------------------------------------------------------
  const topCampaigns = [...campaigns]
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 5)
    .map((c) => ({
      id: c.id, name: c.name, status: c.status, channel: c.channel,
      openRate: c.open_rate, clickRate: c.click_rate, conversions: c.conversions,
      totalContacts: c.total_contacts,
    }));

  return NextResponse.json({
    period: { months, fromTs, toTs: now },
    summary: {
      totalContacts,
      totalHandoffs,
      handoffRate,
      hotContacts,
      avgHandoffDays,
      tierCounts,
    },
    funnel,
    sourceBreakdown,
    channelBreakdown,
    monthlyTrend,
    outcomeBreakdown,
    topCampaigns,
  });
}
