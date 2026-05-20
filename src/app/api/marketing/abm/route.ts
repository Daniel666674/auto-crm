import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mktDb } from "@/db/mkt-db";
import { buildAccountSummaries } from "@/app/api/accounts/route";

export const dynamic = "force-dynamic";

interface AbmAccount {
  company: string;
  industry: string | null;
  // Sales side
  stakeholders: number;
  pipelineValue: number;
  wonValue: number;
  openDeals: number;
  lastActivityAt: number | null;
  // Marketing side
  mktContacts: number;
  hot: number;
  warm: number;
  cold: number;
  avgEngagementScore: number;
  // Blended
  engagementLevel: "high" | "medium" | "low";
  hasPipeline: boolean;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // ── Sales side: account summaries grouped by company ──────────────────────
  const salesAccounts = buildAccountSummaries();
  const byCompany = new Map<string, AbmAccount>();

  for (const a of salesAccounts) {
    byCompany.set(a.company.toLowerCase(), {
      company: a.company,
      industry: a.industry,
      stakeholders: a.contactCount,
      pipelineValue: a.pipelineValue,
      wonValue: a.wonValue,
      openDeals: a.openDealsCount,
      lastActivityAt: a.lastActivityAt,
      mktContacts: 0, hot: 0, warm: 0, cold: 0, avgEngagementScore: 0,
      engagementLevel: "low", hasPipeline: a.openDealsCount > 0 || a.pipelineValue > 0,
    });
  }

  // ── Marketing side: engagement per company from mkt_contacts ──────────────
  try {
    const mktRows = mktDb.prepare(`
      SELECT company, engagement_status, score
      FROM mkt_contacts
      WHERE company IS NOT NULL AND company != ''
    `).all() as Array<{ company: string; engagement_status: string; score: number }>;

    const mktAgg = new Map<string, { company: string; count: number; hot: number; warm: number; cold: number; scoreSum: number }>();
    for (const r of mktRows) {
      const key = r.company.toLowerCase();
      const e = mktAgg.get(key) ?? { company: r.company, count: 0, hot: 0, warm: 0, cold: 0, scoreSum: 0 };
      e.count++;
      e.scoreSum += r.score ?? 0;
      const s = (r.engagement_status ?? "cold").toLowerCase();
      if (s === "hot") e.hot++;
      else if (s === "warm") e.warm++;
      else e.cold++;
      mktAgg.set(key, e);
    }

    for (const [key, m] of mktAgg) {
      const existing = byCompany.get(key);
      if (existing) {
        existing.mktContacts = m.count;
        existing.hot = m.hot;
        existing.warm = m.warm;
        existing.cold = m.cold;
        existing.avgEngagementScore = m.count > 0 ? Math.round(m.scoreSum / m.count) : 0;
      } else {
        // Marketing-only account (no sales pipeline yet) — still an ABM target
        byCompany.set(key, {
          company: m.company, industry: null,
          stakeholders: m.count, pipelineValue: 0, wonValue: 0, openDeals: 0, lastActivityAt: null,
          mktContacts: m.count, hot: m.hot, warm: m.warm, cold: m.cold,
          avgEngagementScore: m.count > 0 ? Math.round(m.scoreSum / m.count) : 0,
          engagementLevel: "low", hasPipeline: false,
        });
      }
    }
  } catch { /* mkt_contacts may be empty */ }

  // ── Blended engagement level ──────────────────────────────────────────────
  const accounts = Array.from(byCompany.values()).map(a => {
    const engaged = a.hot * 2 + a.warm;
    a.engagementLevel = engaged >= 4 || a.hot >= 2 ? "high" : engaged >= 1 ? "medium" : "low";
    return a;
  });

  // Sort: pipeline value desc, then engagement, then stakeholders
  accounts.sort((a, b) => {
    if (b.pipelineValue !== a.pipelineValue) return b.pipelineValue - a.pipelineValue;
    const lvl = { high: 0, medium: 1, low: 2 };
    if (lvl[a.engagementLevel] !== lvl[b.engagementLevel]) return lvl[a.engagementLevel] - lvl[b.engagementLevel];
    return b.stakeholders - a.stakeholders;
  });

  const totals = {
    accounts: accounts.length,
    withPipeline: accounts.filter(a => a.hasPipeline).length,
    totalPipeline: accounts.reduce((s, a) => s + a.pipelineValue, 0),
    totalWon: accounts.reduce((s, a) => s + a.wonValue, 0),
    highEngagement: accounts.filter(a => a.engagementLevel === "high").length,
  };

  return NextResponse.json({ accounts, totals });
}
