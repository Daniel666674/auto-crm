import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { deals, contacts, pipelineStages, crmSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_AGING_DAYS = 7;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Read aging threshold from settings
  const settingRow = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, "deal_aging_days"))
    .get();

  let agingDays = DEFAULT_AGING_DAYS;
  if (settingRow) {
    const parsed = Number(settingRow.value);
    if (Number.isFinite(parsed) && parsed > 0) {
      agingDays = parsed;
    }
  }

  const cutoffMs = Date.now() - agingDays * 86400 * 1000;
  const cutoffDate = new Date(cutoffMs);

  // Join deals with contacts and stages, filter active (not won/lost) deals
  const results = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      updatedAt: deals.updatedAt,
      stageName: pipelineStages.name,
      stageIsWon: pipelineStages.isWon,
      stageIsLost: pipelineStages.isLost,
      contactName: contacts.name,
      contactCompany: contacts.company,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .where(
      and(
        eq(pipelineStages.isWon, false),
        eq(pipelineStages.isLost, false)
      )
    )
    .all();

  const now = Date.now();

  const agingDeals = results
    .filter((row) => {
      if (!row.updatedAt) return false;
      const updatedMs =
        row.updatedAt instanceof Date
          ? row.updatedAt.getTime()
          : Number(row.updatedAt);
      return updatedMs < cutoffDate.getTime();
    })
    .map((row) => {
      const updatedMs =
        row.updatedAt instanceof Date
          ? row.updatedAt.getTime()
          : Number(row.updatedAt);
      const daysSinceUpdate = Math.floor((now - updatedMs) / (86400 * 1000));
      return {
        id: row.id,
        title: row.title,
        value: row.value,
        stageName: row.stageName ?? null,
        contactName: row.contactName ?? null,
        contactCompany: row.contactCompany ?? null,
        daysSinceUpdate,
        updatedAt: row.updatedAt,
      };
    })
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);

  return NextResponse.json({ agingDays, deals: agingDeals });
}
