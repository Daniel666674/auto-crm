import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const [sent, scheduled, draft] = await Promise.all([
      fetch('https://api.brevo.com/v3/emailCampaigns?limit=50&status=sent', { headers: { 'api-key': process.env.BREVO_API_KEY || '' } }).then(r => r.json()),
      fetch('https://api.brevo.com/v3/emailCampaigns?limit=50&status=scheduled', { headers: { 'api-key': process.env.BREVO_API_KEY || '' } }).then(r => r.json()),
      fetch('https://api.brevo.com/v3/emailCampaigns?limit=50&status=draft', { headers: { 'api-key': process.env.BREVO_API_KEY || '' } }).then(r => r.json()),
    ]);
    const all = [...(sent.campaigns||[]), ...(scheduled.campaigns||[]), ...(draft.campaigns||[])];
    return NextResponse.json({ campaigns: all });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
