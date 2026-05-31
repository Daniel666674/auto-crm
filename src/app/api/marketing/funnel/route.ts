import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

// GET /api/marketing/funnel
// Executive marketing funnel for the CMO/CEO. Computed 100% from real data in
// the shared crm.db: lead lifecycle from mkt_contacts, and bottom-of-funnel
// Won revenue / open pipeline by joining marketing handoffs to actual sales deals.
//
// A deal counts as "marketing-attributed" when its sales contact either was
// created by the marketing handoff (source LIKE 'marketing%') or shares an email
// with a marketing contact that was passed to sales.

type StageRow = {
  leads: number;
  engaged: number;
  mql: number;
  handoff: number;
};

type RevenueRow = {
  won_count: number;
  won_value_cents: number;
  open_count: number;
  open_value_cents: number;
};

type SourceStageRow = {
  source: string;
  leads: number;
  engaged: number;
  mql: number;
  handoff: number;
};

type SourceWonRow = {
  source: string;
  won: number;
  won_value_cents: number;
};

// Engaged: opened/clicked at least once, or already warm/hot.
const ENGAGED_SQL = "email_opens > 0 OR email_clicks > 0 OR engagement_status IN ('hot','warm')";
// MQL (marketing-qualified): hot, high score, or explicitly marked ready.
const MQL_SQL = "engagement_status = 'hot' OR score >= 60 OR ready_for_sales = 1";

// Marketing-attributed deals filter (shared by revenue + per-source queries).
const MKT_ATTRIBUTED_SQL = `
  c.source LIKE 'marketing%'
  OR (c.email IS NOT NULL AND c.email != '' AND c.email IN (
    SELECT email FROM mkt_contacts WHERE passed_to_sales_at IS NOT NULL AND email != ''
  ))
`;

function safeGet<T>(sql: string, fallback: T): T {
  try {
    const row = mktDb.prepare(sql).get() as T | undefined;
    return row ?? fallback;
  } catch {
    return fallback;
  }
}

function safeAll<T>(sql: string): T[] {
  try {
    return mktDb.prepare(sql).all() as T[];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // ── Lifecycle counts from marketing contacts ──────────────────────────────
    const stages = safeGet<StageRow>(
      `SELECT
         COUNT(*) AS leads,
         SUM(CASE WHEN ${ENGAGED_SQL} THEN 1 ELSE 0 END) AS engaged,
         SUM(CASE WHEN ${MQL_SQL} THEN 1 ELSE 0 END) AS mql,
         SUM(CASE WHEN passed_to_sales_at IS NOT NULL THEN 1 ELSE 0 END) AS handoff
       FROM mkt_contacts`,
      { leads: 0, engaged: 0, mql: 0, handoff: 0 }
    );

    // ── Bottom of funnel: real Won revenue + open pipeline from sales deals ────
    const revenue = safeGet<RevenueRow>(
      `SELECT
         COUNT(CASE WHEN ps.is_won = 1 THEN 1 END) AS won_count,
         COALESCE(SUM(CASE WHEN ps.is_won = 1 THEN d.value ELSE 0 END), 0) AS won_value_cents,
         COUNT(CASE WHEN ps.is_won = 0 AND ps.is_lost = 0 THEN 1 END) AS open_count,
         COALESCE(SUM(CASE WHEN ps.is_won = 0 AND ps.is_lost = 0 THEN d.value ELSE 0 END), 0) AS open_value_cents
       FROM deals d
       JOIN contacts c ON d.contact_id = c.id
       JOIN pipeline_stages ps ON d.stage_id = ps.id
       WHERE ${MKT_ATTRIBUTED_SQL}`,
      { won_count: 0, won_value_cents: 0, open_count: 0, open_value_cents: 0 }
    );

    // ── Per-source breakdown (lifecycle) ──────────────────────────────────────
    const sourceStages = safeAll<SourceStageRow>(
      `SELECT
         source,
         COUNT(*) AS leads,
         SUM(CASE WHEN ${ENGAGED_SQL} THEN 1 ELSE 0 END) AS engaged,
         SUM(CASE WHEN ${MQL_SQL} THEN 1 ELSE 0 END) AS mql,
         SUM(CASE WHEN passed_to_sales_at IS NOT NULL THEN 1 ELSE 0 END) AS handoff
       FROM mkt_contacts
       GROUP BY source`
    );

    // ── Per-source Won deals (handoff email → sales deal join) ─────────────────
    const sourceWon = safeAll<SourceWonRow>(
      `SELECT
         m.source AS source,
         COUNT(DISTINCT d.id) AS won,
         COALESCE(SUM(d.value), 0) AS won_value_cents
       FROM mkt_contacts m
       JOIN contacts c ON c.email = m.email
       JOIN deals d ON d.contact_id = c.id
       JOIN pipeline_stages ps ON d.stage_id = ps.id
       WHERE ps.is_won = 1 AND m.email != ''
       GROUP BY m.source`
    );

    const wonBySource = new Map(sourceWon.map(r => [r.source, r]));
    const sources = sourceStages
      .map(s => {
        const won = wonBySource.get(s.source);
        const wonCount = won?.won ?? 0;
        return {
          source: s.source,
          leads: s.leads,
          engaged: s.engaged,
          mql: s.mql,
          handoff: s.handoff,
          won: wonCount,
          wonCents: won?.won_value_cents ?? 0,
          // Conversion = leads that became Won deals
          conversion: s.leads > 0 ? Math.round((wonCount / s.leads) * 100) : 0,
        };
      })
      .sort((a, b) => b.leads - a.leads);

    return NextResponse.json({
      hasData: stages.leads > 0,
      leads: stages.leads,
      engaged: stages.engaged,
      mql: stages.mql,
      handoff: stages.handoff,
      won: revenue.won_count,
      revenue: {
        wonCents: revenue.won_value_cents,
        openCents: revenue.open_value_cents,
        wonCount: revenue.won_count,
        openCount: revenue.open_count,
      },
      sources,
      updatedAt: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
