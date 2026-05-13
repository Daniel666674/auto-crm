import { NextResponse } from 'next/server';

const KEY = (process.env.BREVO_API_KEY || '').replace(/^\[|\]$/g, '');
const H = { 'api-key': KEY, 'Content-Type': 'application/json' };

const TIMEOUT_MS = 20_000;

function fetchWithTimeout(url: string, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { headers: H, cache: 'no-store', signal: ctrl.signal })
    .finally(() => clearTimeout(t));
}

async function listCampaigns(status: string): Promise<any[]> {
  try {
    const r = await fetchWithTimeout(
      `https://api.brevo.com/v3/emailCampaigns?limit=50&offset=0&status=${status}`
    );
    if (!r.ok) return [];
    const d = await r.json();
    return d.campaigns || [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'BREVO_API_KEY no configurada en .env' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // Single-campaign path — used by LiveStatsPanel
  if (id) {
    try {
      const r = await fetchWithTimeout(`https://api.brevo.com/v3/emailCampaigns/${id}`);
      if (!r.ok) return NextResponse.json({ campaigns: [] });
      const campaign = await r.json();
      return NextResponse.json({ campaigns: [campaign] });
    } catch {
      return NextResponse.json({ campaigns: [] });
    }
  }

  try {
    // Fetch all statuses in parallel — list response already includes statistics
    const [sent, queued, draft] = await Promise.all([
      listCampaigns('sent'),
      listCampaigns('queued'),
      listCampaigns('draft'),
    ]);
    const campaigns = [...sent, ...queued, ...draft];
    return NextResponse.json({ campaigns });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
