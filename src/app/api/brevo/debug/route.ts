import { NextResponse } from 'next/server';

const KEY = process.env.BREVO_API_KEY || '';

export async function GET() {
  const result: Record<string, unknown> = {
    hasKey: !!KEY,
    keyPrefix: KEY ? KEY.slice(0, 8) + '...' : null,
  };

  // Test list endpoint
  try {
    const r = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=2&offset=0&status=sent', {
      headers: { 'api-key': KEY, 'Content-Type': 'application/json' },
    });
    const text = await r.text();
    result.listStatus = r.status;
    try {
      const json = JSON.parse(text);
      const campaigns = json.campaigns || [];
      result.listCount = campaigns.length;
      if (campaigns.length > 0) {
        result.firstCampaignKeys = Object.keys(campaigns[0]);
        result.firstCampaignStats = campaigns[0].statistics ?? null;
      }
    } catch {
      result.listRawText = text.slice(0, 500);
    }
  } catch (e: any) {
    result.listError = e.message;
  }

  // Test detail endpoint for first campaign if we have one
  if (result.listCount && (result.listCount as number) > 0) {
    try {
      const r2 = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=1&offset=0&status=sent', {
        headers: { 'api-key': KEY, 'Content-Type': 'application/json' },
      });
      const d2 = await r2.json();
      const firstId = d2.campaigns?.[0]?.id;
      if (firstId) {
        const r3 = await fetch(`https://api.brevo.com/v3/emailCampaigns/${firstId}`, {
          headers: { 'api-key': KEY, 'Content-Type': 'application/json' },
        });
        const detail = await r3.json();
        result.detailKeys = Object.keys(detail);
        result.detailStatistics = detail.statistics ?? null;
      }
    } catch (e: any) {
      result.detailError = e.message;
    }
  }

  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
