import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

type CampaignRow = {
  open_rate: number; click_rate: number; total_contacts: number;
  conversions: number; start_date: number; name: string;
};
type ContactRow = { last_activity: number; ready_for_sales: number; passed_to_sales_at: number | null; };

export async function GET() {
  try {
    const campaigns = mktDb.prepare("SELECT * FROM mkt_campaigns ORDER BY start_date DESC").all() as CampaignRow[];
    const contacts  = mktDb.prepare("SELECT last_activity, ready_for_sales, passed_to_sales_at FROM mkt_contacts").all() as ContactRow[];

    const totalSent   = campaigns.reduce((s, c) => s + (Number(c.total_contacts) || 0), 0);
    const avgOpen     = campaigns.length > 0
      ? campaigns.reduce((s, c) => s + (Number(c.open_rate) || 0), 0) / campaigns.length : 0;
    const avgClick    = campaigns.length > 0
      ? campaigns.reduce((s, c) => s + (Number(c.click_rate) || 0), 0) / campaigns.length : 0;
    const totalConv   = campaigns.reduce((s, c) => s + (Number(c.conversions) || 0), 0);

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newThisWeek     = contacts.filter(c => c.last_activity >= weekAgo).length;
    const handoffsThisWeek = contacts.filter(c =>
      c.ready_for_sales && c.passed_to_sales_at && c.passed_to_sales_at >= weekAgo
    ).length;

    const bestCampaign = campaigns.reduce((best: CampaignRow | null, c) =>
      !best || (Number(c.open_rate) || 0) > (Number(best.open_rate) || 0) ? c : best, null);

    return NextResponse.json({
      campaigns: {
        total: campaigns.length,
        totalSent,
        avgOpenRate: Math.round(avgOpen * 10) / 10,
        avgClickRate: Math.round(avgClick * 10) / 10,
        totalConversions: totalConv,
      },
      contacts: {
        total: contacts.length,
        newThisWeek,
        handoffsThisWeek,
      },
      best: bestCampaign ? {
        name: bestCampaign.name,
        openRate: Number(bestCampaign.open_rate) || 0,
        clickRate: Number(bestCampaign.click_rate) || 0,
        conversions: Number(bestCampaign.conversions) || 0,
      } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
