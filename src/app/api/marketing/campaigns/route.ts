import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

type MktCampaignRow = {
  id: string; name: string; status: string; start_date: number;
  target_segment: string; cadence_type: string; open_rate: number;
  click_rate: number; reply_rate: number; total_contacts: number;
  conversions: number; last_sent: number | null;
};

function mapRow(row: MktCampaignRow) {
  return {
    id: row.id, name: row.name, status: row.status, startDate: row.start_date,
    targetSegment: row.target_segment, cadenceType: row.cadence_type,
    openRate: row.open_rate, clickRate: row.click_rate, replyRate: row.reply_rate,
    totalContacts: row.total_contacts, conversions: row.conversions, lastSent: row.last_sent,
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
    const body = await req.json();
    const id = crypto.randomUUID();
    mktDb.prepare(`
      INSERT INTO mkt_campaigns
        (id, name, status, start_date, target_segment, cadence_type, open_rate, click_rate,
         reply_rate, total_contacts, conversions, last_sent)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, body.name, body.status ?? "active",
      body.startDate ?? Date.now(), body.targetSegment ?? "",
      body.cadenceType ?? "outreach", 0, 0, 0,
      body.totalContacts ?? 0, 0, null
    );
    const row = mktDb.prepare("SELECT * FROM mkt_campaigns WHERE id = ?").get(id) as MktCampaignRow;
    return NextResponse.json(mapRow(row), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
