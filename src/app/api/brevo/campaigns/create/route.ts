import { NextResponse } from 'next/server';

const KEY = process.env.BREVO_API_KEY || '';
const H = { 'api-key': KEY, 'Content-Type': 'application/json' };

const SENDERS: Record<string, { name: string; email: string }> = {
  'daniel.acosta@blackscale.consulting': { name: 'Daniel — BlackScale', email: 'daniel.acosta@blackscale.consulting' },
  'julian.vallejo@blackscale.consulting': { name: 'Julian — BlackScale', email: 'julian.vallejo@blackscale.consulting' },
};

async function createCampaign(payload: object) {
  const res = await fetch('https://api.brevo.com/v3/emailCampaigns', {
    method: 'POST', headers: H, body: JSON.stringify(payload),
  });
  return res.json();
}

export async function POST(req: Request) {
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
      });
      if (result.code) return NextResponse.json({ error: result.message }, { status: 400 });
      return NextResponse.json({ success: true, id: result.id });
    }

    // Split: two campaigns, 50/50
    const [c1, c2] = await Promise.all([
      createCampaign({
        name: `${name} — Daniel (50%)`, subject, htmlContent,
        sender: SENDERS['daniel.acosta@blackscale.consulting'],
        recipients: { listIds: [listIds[0]] }, // first half of lists
        ...(scheduled ? { scheduledAt: scheduled } : {}),
      }),
      createCampaign({
        name: `${name} — Julian (50%)`, subject, htmlContent,
        sender: SENDERS['julian.vallejo@blackscale.consulting'],
        recipients: { listIds: listIds.slice(1).length ? listIds.slice(1) : listIds },
        ...(scheduled ? { scheduledAt: scheduled } : {}),
      }),
    ]);

    return NextResponse.json({ success: true, campaigns: [c1, c2] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
