import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { blastCampaigns, emailEvents } from "@/db/schema";
import { desc, isNotNull } from "drizzle-orm";
import {
  resolveAudience,
  eligibleRecipients,
  sendBlast,
  MAX_RECIPIENTS,
  type AudienceRules,
} from "@/lib/campaigns";

export const dynamic = "force-dynamic";

// GET /api/campaigns/blast — list blasts with open/click aggregates
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const camps = db.select().from(blastCampaigns).orderBy(desc(blastCampaigns.createdAt)).all();

  const events = db
    .select({ campaignId: emailEvents.campaignId, type: emailEvents.type, contactId: emailEvents.contactId })
    .from(emailEvents)
    .where(isNotNull(emailEvents.campaignId))
    .all();

  const stats = new Map<string, { opens: number; clicks: number; uniqueOpens: Set<string> }>();
  for (const e of events) {
    if (!e.campaignId) continue;
    const s = stats.get(e.campaignId) ?? { opens: 0, clicks: 0, uniqueOpens: new Set<string>() };
    if (e.type === "open") {
      s.opens++;
      if (e.contactId) s.uniqueOpens.add(e.contactId);
    } else if (e.type === "click") {
      s.clicks++;
    }
    stats.set(e.campaignId, s);
  }

  return NextResponse.json(
    camps.map((c) => {
      const s = stats.get(c.id);
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        status: c.status,
        totalRecipients: c.totalRecipients,
        sentCount: c.sentCount,
        failedCount: c.failedCount,
        skippedCount: c.skippedCount,
        lastError: c.lastError,
        createdAt: c.createdAt,
        sentAt: c.sentAt,
        opens: s?.opens ?? 0,
        uniqueOpens: s?.uniqueOpens.size ?? 0,
        clicks: s?.clicks ?? 0,
      };
    })
  );
}

// POST /api/campaigns/blast
//   preview: { preview: true, audience }          → recipient counts + sample
//   send:    { name, subject, body, audience }     → create + start sending
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { name?: string; subject?: string; body?: string; audience?: AudienceRules; preview?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rules = body.audience ?? {};

  if (body.preview) {
    const matched = resolveAudience(rules);
    const eligible = eligibleRecipients(matched);
    return NextResponse.json({
      preview: true,
      matched: matched.length,
      eligible: eligible.length,
      max: MAX_RECIPIENTS,
      sample: eligible.slice(0, 5).map((c) => ({ id: c.id, name: c.name, company: c.company, email: c.email })),
    });
  }

  const name = body.name?.trim();
  const subject = body.subject?.trim();
  const emailBody = body.body?.trim();
  if (!name || !subject || !emailBody) {
    return NextResponse.json({ error: "name, subject y body son requeridos" }, { status: 400 });
  }

  const eligible = eligibleRecipients(resolveAudience(rules));
  if (eligible.length === 0) {
    return NextResponse.json({ error: "La audiencia no tiene destinatarios con email válido" }, { status: 400 });
  }
  if (eligible.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `La audiencia (${eligible.length}) supera el máximo de ${MAX_RECIPIENTS} por envío. Acota los filtros.` },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  db.insert(blastCampaigns)
    .values({
      id,
      name,
      subject,
      body: emailBody,
      audienceJson: JSON.stringify(rules),
      status: "draft",
      totalRecipients: eligible.length,
      createdBy: session.user.id,
      createdAt: new Date(),
    })
    .run();

  // Fire-and-forget on the persistent server; the UI polls GET for progress.
  void sendBlast(id).catch((err) => console.error("[campaigns:sendBlast]", err));

  return NextResponse.json({ ok: true, id, recipients: eligible.length });
}
