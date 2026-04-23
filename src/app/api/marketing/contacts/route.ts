import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

type MktContactRow = {
  id: string; name: string; company: string; email: string; phone: string;
  source: string; tier: number; temperature: string; score: number;
  brevo_cadence: string; engagement_status: string; email_opens: number;
  email_clicks: number; lead_source_detail: string; marketing_notes: string;
  ready_for_sales: number; passed_to_sales_at: number | null;
  industry: string; last_activity: number;
};

function mapRow(row: MktContactRow) {
  return {
    id: row.id, name: row.name, company: row.company, email: row.email,
    phone: row.phone, source: row.source, tier: row.tier, temperature: row.temperature,
    score: row.score, brevoCadence: row.brevo_cadence, engagementStatus: row.engagement_status,
    emailOpens: row.email_opens, emailClicks: row.email_clicks,
    leadSourceDetail: row.lead_source_detail, marketingNotes: row.marketing_notes,
    readyForSales: Boolean(row.ready_for_sales), passedToSalesAt: row.passed_to_sales_at,
    industry: row.industry, lastActivity: row.last_activity,
  };
}

export async function GET() {
  try {
    const rows = mktDb.prepare("SELECT * FROM mkt_contacts ORDER BY last_activity DESC").all() as MktContactRow[];
    return NextResponse.json(rows.map(mapRow));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = crypto.randomUUID();
    const now = Date.now();
    mktDb.prepare(`
      INSERT INTO mkt_contacts
        (id, name, company, email, phone, source, tier, temperature, score, brevo_cadence,
         engagement_status, email_opens, email_clicks, lead_source_detail, marketing_notes,
         ready_for_sales, passed_to_sales_at, industry, last_activity)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      id, body.name, body.company ?? "", body.email ?? "", body.phone ?? "",
      body.source ?? "website", body.tier ?? 2, "cold",
      body.tier === 1 ? 60 : body.tier === 3 ? 15 : 35,
      body.brevoCadence ?? "Cold Welcome", "cold", 0, 0,
      body.leadSourceDetail ?? "", body.marketingNotes ?? "",
      0, null, body.industry ?? "", now
    );
    const row = mktDb.prepare("SELECT * FROM mkt_contacts WHERE id = ?").get(id) as MktContactRow;
    return NextResponse.json(mapRow(row), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
