import { NextResponse } from 'next/server';

// Strip accidental [ ] brackets that some env editors add around values
const KEY = (process.env.BREVO_API_KEY || '').replace(/^\[|\]$/g, '');
const H = { 'api-key': KEY, 'Content-Type': 'application/json' };

async function listCampaigns(status: string) {
  const r = await fetch(
    `https://api.brevo.com/v3/emailCampaigns?limit=50&offset=0&status=${status}`,
    { headers: H, cache: 'no-store' }
  );
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
  const d = await r.json();
  return (d.campaigns || []) as any[];
}

async function getCampaignDetail(id: number) {
  const r = await fetch(`https://api.brevo.com/v3/emailCampaigns/${id}`, {
    headers: H, cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Brevo detail ${r.status} for id ${id}`);
  return r.json();
}

export async function GET(req: Request) {
  if (!KEY) return NextResponse.json({ error: 'BREVO_API_KEY no configurada en .env' }, { status: 500 });

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
    // Brevo v3 valid statuses: sent, queued, draft, inProcess, suspended, archive
    const listResults = await Promise.allSettled([
      listCampaigns('sent'),
      listCampaigns('queued'),
      listCampaigns('draft'),
    ]);
    const all = listResults
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // allSettled: one failing detail doesn't kill all campaigns
    const detailResults = await Promise.allSettled(all.map(c => getCampaignDetail(c.id)));
    const campaigns = detailResults.map((r, i) =>
      r.status === 'fulfilled' ? r.value : all[i]
    );

    return NextResponse.json({ campaigns });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
