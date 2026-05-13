import { NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

const KEY = process.env.BREVO_API_KEY || '';
const H = { 'api-key': KEY, 'Content-Type': 'application/json' };

async function jsonOrThrow(r: Response) {
  const ct = r.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error(`Brevo no disponible (HTTP ${r.status}). Verifica la conexión del servidor.`);
  }
  return r.json();
}

async function listCampaigns(status: string) {
  const r = await fetch(
    `https://api.brevo.com/v3/emailCampaigns?limit=50&offset=0&status=${status}`,
    { headers: H, signal: AbortSignal.timeout(12_000) },
  );
  const d = await jsonOrThrow(r);
  return (d.campaigns || []) as Record<string, unknown>[];
}

async function getCampaignDetail(id: number) {
  const r = await fetch(`https://api.brevo.com/v3/emailCampaigns/${id}`, {
    headers: H,
    signal: AbortSignal.timeout(8_000),
  });
  return jsonOrThrow(r);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    try {
      const campaign = await getCampaignDetail(Number(id));
      return NextResponse.json({ campaigns: [campaign] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      return NextResponse.json({ error: msg }, { status: 503 });
    }
  }

  try {
    const [sent, scheduled, draft] = await Promise.all([
      listCampaigns('sent'),
      listCampaigns('scheduled'),
      listCampaigns('draft'),
    ]);
    const all = [...sent, ...scheduled, ...draft];
    const detailed = await Promise.all(all.map(c => getCampaignDetail(c.id as number)));
    return NextResponse.json({ campaigns: detailed });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
