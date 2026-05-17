import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mktDb } from "@/db/mkt-db";
import { fireTriggers } from "@/lib/triggers";
import { notifySlackCampaignLaunched } from "@/lib/slack";

export const dynamic = "force-dynamic";

type MktCampaignRow = {
  id: string; name: string; status: string; start_date: number;
  target_segment: string; cadence_type: string; open_rate: number;
  click_rate: number; reply_rate: number; total_contacts: number;
  conversions: number; last_sent: number | null;
  channel: string; brevo_campaign_id: string;
  owner_id: string | null;
  outcome_reason_id: string | null;
  outcome_notes: string | null;
  closed_at: number | null;
};

function mapRow(row: MktCampaignRow) {
  return {
    id: row.id, name: row.name, status: row.status, startDate: row.start_date,
    targetSegment: row.target_segment, cadenceType: row.cadence_type,
    openRate: row.open_rate ?? 0, clickRate: row.click_rate ?? 0, replyRate: row.reply_rate ?? 0,
    totalContacts: row.total_contacts, conversions: row.conversions, lastSent: row.last_sent,
    channel: row.channel ?? "brevo_email", brevoCampaignId: row.brevo_campaign_id ?? "",
    ownerId: row.owner_id ?? null,
    outcomeReasonId: row.outcome_reason_id ?? null,
    outcomeNotes: row.outcome_notes ?? null,
    closedAt: row.closed_at ?? null,
  };
}

export async function GET() {
  try {
    const rows = mktDb.prepare("SELECT * FROM mkt_campaigns ORDER BY start_date DESC").all() as MktCampaignRow[];
    return NextResponse.json(rows.map(mapRow));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const id = crypto.randomUUID();
    const ownerId = body.ownerId ?? session?.user?.id ?? null;
    mktDb.prepare(`
      INSERT INTO mkt_campaigns
        (id, name, status, start_date, target_segment, cadence_type, open_rate, click_rate,
         reply_rate, total_contacts, conversions, last_sent, channel, brevo_campaign_id, owner_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, body.name, body.status ?? "active",
      body.startDate ?? Date.now(), body.targetSegment ?? "",
      body.cadenceType ?? "outreach", 0, 0, 0,
      body.totalContacts ?? 0, 0, null,
      body.channel ?? "brevo_email",
      body.brevoCampaignId ?? "",
      ownerId
    );
    const row = mktDb.prepare("SELECT * FROM mkt_campaigns WHERE id = ?").get(id) as MktCampaignRow;
    const mapped = mapRow(row);

    // Fire workflow + slack — non-blocking
    fireTriggers({
      event: "campaign_created",
      data: {
        campaignId: id,
        campaignName: mapped.name,
        status: mapped.status,
        channel: mapped.channel,
        targetSegment: mapped.targetSegment,
        totalContacts: String(mapped.totalContacts),
      },
    }).catch(() => {});
    if (mapped.status === "active") {
      notifySlackCampaignLaunched({
        id, name: mapped.name, channel: mapped.channel,
        targetSegment: mapped.targetSegment, totalContacts: mapped.totalContacts,
      }).catch(() => {});
    }

    return NextResponse.json(mapped, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
