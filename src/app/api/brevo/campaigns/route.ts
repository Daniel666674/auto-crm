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

async function fetchCampaignStats(id: number): Promise<any> {
  try {
    const r = await fetchWithTimeout(`https://api.brevo.com/v3/emailCampaigns/${id}`);
    if (!r.ok) return null;
    const d = await r.json();
    // Treat Brevo error payloads (rate limit, auth) as null so we fall back to list data
    if (d?.code) return null;
    return d;
  } catch {
    return null;
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
    // Brevo list API does NOT include statistics — fetch list first, then enrich each campaign individually
    const [sent, queued, draft, archive] = await Promise.all([
      listCampaigns('sent'),
      listCampaigns('queued'),
      listCampaigns('draft'),
      listCampaigns('archive'),
    ]);
    const allCampaigns = [...sent, ...queued, ...draft, ...archive];

    // Enrich with individual fetches (parallel, capped at 10 concurrent)
    const enriched: any[] = [];
    const chunkSize = 10;
    for (let i = 0; i < allCampaigns.length; i += chunkSize) {
      const chunk = allCampaigns.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map(c => fetchCampaignStats(c.id)));
      for (let j = 0; j < chunk.length; j++) {
        enriched.push(results[j] ?? chunk[j]);
      }
    }

    return NextResponse.json({ campaigns: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
