import { NextResponse } from 'next/server';

const KEY = process.env.BREVO_API_KEY || '';
const H = { 'api-key': KEY, 'Content-Type': 'application/json' };

async function safeJson(r: Response): Promise<any> {
  const text = await r.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

async function listCampaigns(status: string) {
  try {
    const r = await fetch(`https://api.brevo.com/v3/emailCampaigns?limit=50&offset=0&status=${status}`, { headers: H });
    const d = await safeJson(r);
    return (d.campaigns || []) as any[];
  } catch {
    return [];
  }
}

async function getCampaignDetail(id: number) {
  try {
    const r = await fetch(`https://api.brevo.com/v3/emailCampaigns/${id}`, { headers: H });
    return safeJson(r);
  } catch {
    return { id };
  }
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'BREVO_API_KEY not configured' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

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
    const detailed = await Promise.all(all.map(c => getCampaignDetail(c.id)));
    return NextResponse.json({ campaigns: detailed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
