import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings, contacts } from "@/db/schema";
import { eq, isNull, and, lt, inArray } from "drizzle-orm";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

const KEY = "mkt_stale_days";
const DEFAULT_DAYS = 30;

interface StaleContact {
  id: string; name: string; email: string; company: string;
  tier: number; score: number; engagement_status: string;
  last_activity: number;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const row = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  const staleDays = row ? Math.max(1, Number(row.value) || DEFAULT_DAYS) : DEFAULT_DAYS;
  const threshold = Date.now() - staleDays * 86400000;

  // Exclude contacts already handed off, bounced, or unsubscribed
  const rows = mktDb.prepare(`
    SELECT id, name, email, company, tier, score, engagement_status, last_activity
    FROM mkt_contacts
    WHERE last_activity < ?
      AND ready_for_sales = 0
      AND email_bounced = 0
      AND email_unsubscribed = 0
    ORDER BY last_activity ASC
  `).all(threshold) as StaleContact[];

  // Stuck leads by lifecycle stage (main CRM contacts)
  const stuckStages = ["lead", "MQL", "SQL"] as const;
  const stuckCutoff = new Date(Date.now() - 14 * 86400000);

  const stuckRows = db
    .select({
      lifecycleStage: contacts.lifecycleStage,
    })
    .from(contacts)
    .where(
      and(
        inArray(contacts.lifecycleStage, [...stuckStages]),
        isNull(contacts.returnedToMarketingAt),
        lt(contacts.updatedAt, stuckCutoff)
      )
    )
    .all();

  const stuckByStage: Record<string, number> = { lead: 0, MQL: 0, SQL: 0 };
  for (const row of stuckRows) {
    const stage = row.lifecycleStage ?? "lead";
    if (stage in stuckByStage) {
      stuckByStage[stage]++;
    }
  }
  const stuckTotal = stuckRows.length;

  return NextResponse.json({
    staleDays,
    contacts: rows.map((c) => ({
      id: c.id, name: c.name, email: c.email, company: c.company,
      tier: c.tier, score: c.score, engagementStatus: c.engagement_status,
      lastActivity: c.last_activity,
      daysSinceActivity: Math.floor((Date.now() - c.last_activity) / 86400000),
    })),
    stuckByStage,
    stuckTotal,
  });
}
