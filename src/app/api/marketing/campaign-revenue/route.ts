import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { mktDb } from "@/db/mkt-db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { isNotNull, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

function buildCampaignNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const rows = mktDb
      .prepare("SELECT id, name FROM mkt_campaigns")
      .all() as Array<{ id: string; name: string }>;
    for (const r of rows) {
      if (r.id) map.set(r.id, r.name);
    }
  } catch { /* table may not exist yet */ }
  return map;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Get all pipeline stages to know which are "won"
  const stages = db.select().from(pipelineStages).all();
  const wonStageIds = new Set(stages.filter((s) => s.isWon).map((s) => s.id));

  // Get all contacts that have a firstTouchCampaignId
  const campaignContacts = db
    .select({
      id: contacts.id,
      firstTouchCampaignId: contacts.firstTouchCampaignId,
      lifecycleStage: contacts.lifecycleStage,
    })
    .from(contacts)
    .where(isNotNull(contacts.firstTouchCampaignId))
    .all();

  // Get all deals for those contacts
  const contactIds = campaignContacts.map((c) => c.id);

  let contactDeals: Array<{
    contactId: string;
    value: number;
    stageId: string;
  }> = [];

  if (contactIds.length > 0) {
    contactDeals = db
      .select({
        contactId: deals.contactId,
        value: deals.value,
        stageId: deals.stageId,
      })
      .from(deals)
      .where(inArray(deals.contactId, contactIds))
      .all();
  }

  // Build a map: contactId → deals[]
  const dealsByContact = new Map<string, typeof contactDeals>();
  for (const deal of contactDeals) {
    const existing = dealsByContact.get(deal.contactId) ?? [];
    existing.push(deal);
    dealsByContact.set(deal.contactId, existing);
  }

  // Group contacts by firstTouchCampaignId
  const MQL_STAGES = new Set(["MQL", "SQL", "opportunity", "customer"]);
  const SQL_STAGES = new Set(["SQL", "opportunity", "customer"]);

  const campaignMap = new Map<
    string,
    {
      campaignId: string;
      contactSet: Set<string>;
      mqls: number;
      sqls: number;
      wonDeals: number;
      wonRevenue: number;
      openRevenue: number;
    }
  >();

  for (const contact of campaignContacts) {
    const cid = contact.firstTouchCampaignId!;

    if (!campaignMap.has(cid)) {
      campaignMap.set(cid, {
        campaignId: cid,
        contactSet: new Set(),
        mqls: 0,
        sqls: 0,
        wonDeals: 0,
        wonRevenue: 0,
        openRevenue: 0,
      });
    }

    const entry = campaignMap.get(cid)!;

    if (!entry.contactSet.has(contact.id)) {
      entry.contactSet.add(contact.id);

      const stage = contact.lifecycleStage ?? "lead";
      if (MQL_STAGES.has(stage)) entry.mqls++;
      if (SQL_STAGES.has(stage)) entry.sqls++;

      // Tally deals
      const cDeals = dealsByContact.get(contact.id) ?? [];
      for (const deal of cDeals) {
        if (wonStageIds.has(deal.stageId)) {
          entry.wonDeals++;
          entry.wonRevenue += deal.value;
        } else {
          // Active (not won, not specifically filtered to lost — include all non-won)
          const stage = stages.find((s) => s.id === deal.stageId);
          if (!stage?.isLost) {
            entry.openRevenue += deal.value;
          }
        }
      }
    }
  }

  const nameMap = buildCampaignNameMap();

  const result = Array.from(campaignMap.values())
    .map((entry) => {
      const contacts = entry.contactSet.size;
      // ROI proxy: won revenue relative to open + won pipeline touched.
      const pipelineTouched = entry.wonRevenue + entry.openRevenue;
      const sqlRate = contacts > 0 ? entry.sqls / contacts : 0;
      const winRate = entry.sqls > 0 ? entry.wonDeals / entry.sqls : 0;
      return {
        campaignId: entry.campaignId,
        campaignName: nameMap.get(entry.campaignId) ?? entry.campaignId,
        contacts,
        mqls: entry.mqls,
        sqls: entry.sqls,
        wonDeals: entry.wonDeals,
        wonRevenue: entry.wonRevenue,
        openRevenue: entry.openRevenue,
        pipelineTouched,
        sqlRate,
        winRate,
      };
    })
    .sort((a, b) => b.wonRevenue - a.wonRevenue);

  return NextResponse.json(result);
}
