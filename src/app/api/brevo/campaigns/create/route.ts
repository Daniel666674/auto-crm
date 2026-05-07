import { NextResponse } from 'next/server';

const SENDERS: Record<string, { name: string; email: string }> = {
  'daniel.acosta@blackscale.consulting': { name: 'Daniel — BlackScale', email: 'daniel.acosta@blackscale.consulting' },
  'julian.vallejo@blackscale.consulting': { name: 'Julian — BlackScale', email: 'julian.vallejo@blackscale.consulting' },
};

async function createCampaign(payload: object, key: string) {
  const res = await fetch('https://api.brevo.com/v3/emailCampaigns', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Brevo ${res.status}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  const KEY = process.env.BREVO_API_KEY || '';
  if (!KEY) return NextResponse.json({ error: 'BREVO_API_KEY not configured' }, { status: 500 });
  try {
    const { name, subject, htmlContent, listIds, scheduledAt, senderEmail, splitSend } = await req.json();

    if (!name || !subject || !htmlContent || !listIds?.length) {
      return NextResponse.json({ error: 'Nombre, asunto, contenido y lista son requeridos' }, { status: 400 });
    }

    const scheduled = scheduledAt || null;

    if (!splitSend) {
      const sender = SENDERS[senderEmail] || SENDERS['daniel.acosta@blackscale.consulting'];
      const result = await createCampaign({
        name, subject, htmlContent, sender,
        recipients: { listIds },
        ...(scheduled ? { scheduledAt: scheduled } : {}),
      }, KEY);
      return NextResponse.json({ success: true, id: result.id });
    }

    // Split: two campaigns, 50/50
    const [c1, c2] = await Promise.all([
      createCampaign({
        name: `${name} — Daniel (50%)`, subject, htmlContent,
        sender: SENDERS['daniel.acosta@blackscale.consulting'],
        recipients: { listIds: [listIds[0]] },
        ...(scheduled ? { scheduledAt: scheduled } : {}),
      }, KEY),
      createCampaign({
        name: `${name} — Julian (50%)`, subject, htmlContent,
        sender: SENDERS['julian.vallejo@blackscale.consulting'],
        recipients: { listIds: listIds.slice(1).length ? listIds.slice(1) : listIds },
        ...(scheduled ? { scheduledAt: scheduled } : {}),
      }, KEY),
    ]);

    return NextResponse.json({ success: true, campaigns: [c1, c2] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
