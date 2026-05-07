import { NextResponse } from 'next/server';

const KEY = process.env.BREVO_API_KEY || '';
const H = { 'api-key': KEY, 'Content-Type': 'application/json' };

async function listCampaigns(status: string): Promise<any[]> {
  if (!KEY) return [];
  const r = await fetch(`https://api.brevo.com/v3/emailCampaigns?limit=50&offset=0&status=${status}`, { headers: H });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.campaigns || []) as any[];
}

async function getCampaignDetail(id: number): Promise<any> {
  const r = await fetch(`https://api.brevo.com/v3/emailCampaigns/${id}`, { headers: H });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${r.statusText}`);
  return r.json();
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'BREVO_API_KEY not configured' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // Single-campaign fast path — used by LiveStatsPanel to avoid fetching all campaigns
  if (id) {
    try {
      const campaign = await getCampaignDetail(Number(id));
      return NextResponse.json({ campaigns: [campaign] });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  try {
    const [sent, scheduled, draft] = await Promise.all([
      listCampaigns('sent'),
      listCampaigns('scheduled'),
      listCampaigns('draft'),
    ]);
    const all = [...sent, ...scheduled, ...draft];

    // Fetch full details (with statistics) for each campaign in parallel
    const detailed = await Promise.all(all.map(c => getCampaignDetail(c.id)));

    return NextResponse.json({ campaigns: detailed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
