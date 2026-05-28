import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities, calendarEvents, crmSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { recomputeContact } from "@/lib/fit-recompute";
import { fireTriggers } from "@/lib/triggers";
import { notifyUsers } from "@/lib/notify";

interface DaptaPayload {
  meetingId: string;
  meetLink?: string;
  title?: string;
  startedAt?: string;
  endedAt?: string;
  durationMin?: number;
  participants?: string[];
  transcript?: string;
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative";
  actionItems?: string[];
  topics?: string[];
  nextSteps?: string;
}

const BLACKSCALE_DOMAINS = ["blackscale.consulting", "blackscale.co"];

function isBlackScaleEmail(email: string) {
  return BLACKSCALE_DOMAINS.some(d => email.toLowerCase().endsWith(`@${d}`));
}

function getSecret(): string | null {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, "dapta_webhook_secret")).get();
  return row?.value ?? null;
}

export async function GET() {
  // Returns the current webhook secret (for the settings UI to display).
  // Auto-generates one on first call.
  let secret = getSecret();
  if (!secret) {
    secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    db.insert(crmSettings).values({ key: "dapta_webhook_secret", value: secret })
      .onConflictDoUpdate({ target: crmSettings.key, set: { value: secret } })
      .run();
  }

  // Count unmatched payloads stored in crmSettings
  const allSettings = db.select({ key: crmSettings.key }).from(crmSettings).all();
  const unmatched = allSettings.filter(r => r.key.startsWith("dapta_unmatched_")).length;

  return NextResponse.json({ secret, unmatched });
}

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = getSecret();
  if (secret) {
    const incoming = request.headers.get("x-dapta-secret") ?? request.headers.get("x-webhook-secret");
    if (incoming !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: DaptaPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (!body.meetingId) {
    return NextResponse.json({ error: "meetingId requerido" }, { status: 400 });
  }

  // ── Idempotency: skip if already processed ───────────────────────────────
  const existing = db.select({ id: activities.id })
    .from(activities)
    .where(eq(activities.daptaMeetingId, body.meetingId))
    .get();
  if (existing) {
    return NextResponse.json({ ok: true, skipped: true, activityId: existing.id });
  }

  // ── Match contact ────────────────────────────────────────────────────────
  let contactId: string | null = null;

  // 1. Try calendarEvents.meetLink match → parse participants → find contact
  if (body.meetLink) {
    const calEvent = db.select()
      .from(calendarEvents)
      .where(eq(calendarEvents.meetLink, body.meetLink))
      .get();
    if (calEvent) {
      let parts: string[] = [];
      try { parts = JSON.parse(calEvent.participants); } catch { /* ignore */ }
      const contactEmail = parts.find(e => !isBlackScaleEmail(e));
      if (contactEmail) {
        const c = db.select({ id: contacts.id })
          .from(contacts)
          .where(eq(contacts.email, contactEmail))
          .get();
        if (c) contactId = c.id;
      }
    }
  }

  // 2. Fallback: match by participant email directly
  if (!contactId && body.participants?.length) {
    const externalEmails = body.participants.filter(e => !isBlackScaleEmail(e));
    for (const email of externalEmails) {
      const c = db.select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.email, email))
        .get();
      if (c) { contactId = c.id; break; }
    }
  }

  if (!contactId) {
    // Store as unmatched for later review
    const now = new Date();
    db.insert(crmSettings).values({
      key: `dapta_unmatched_${body.meetingId}`,
      value: JSON.stringify({ ...body, receivedAt: now.toISOString() }),
    }).onConflictDoUpdate({
      target: crmSettings.key,
      set: { value: JSON.stringify({ ...body, receivedAt: now.toISOString() }) },
    }).run();
    return NextResponse.json({ ok: true, matched: false, note: "No contact found — stored for manual review" });
  }

  // ── Create activity with transcript ─────────────────────────────────────
  const now = new Date();
  const startedAt = body.startedAt ? new Date(body.startedAt) : now;
  const endedAt = body.endedAt ? new Date(body.endedAt) : now;

  const parts = body.participants?.filter(e => !isBlackScaleEmail(e)).join(", ") ?? "";
  const durationLabel = body.durationMin ? ` (${body.durationMin} min)` : "";
  const topicsLabel = body.topics?.length ? ` · Temas: ${body.topics.join(", ")}` : "";
  const description = body.summary
    ? `${body.summary}${topicsLabel}`
    : `Reunión Dapta${parts ? ` con ${parts}` : ""}${durationLabel}`;

  const newActivity = db.insert(activities).values({
    type: "meeting",
    description,
    contactId,
    scheduledAt: startedAt,
    completedAt: endedAt,
    transcriptText: body.transcript ?? null,
    daptaMeetingId: body.meetingId,
    createdAt: now,
  }).returning().get();

  // ── Follow-up activities from action items ───────────────────────────────
  const followUpDelay = 2 * 24 * 60 * 60 * 1000; // 2 days in ms
  for (const item of body.actionItems ?? []) {
    db.insert(activities).values({
      type: "followup",
      description: item,
      contactId,
      scheduledAt: new Date(now.getTime() + followUpDelay),
      createdAt: now,
    }).run();
  }

  // ── Score + lifecycle ────────────────────────────────────────────────────
  // Positive sentiment → treat as a positive reply (intent signal for SQL)
  if (body.sentiment === "positive") {
    const contact = db.select({
      lifecycleStage: contacts.lifecycleStage,
      temperature: contacts.temperature,
    }).from(contacts).where(eq(contacts.id, contactId)).get();

    if (contact) {
      const LIFECYCLE = ["subscriber", "lead", "MQL", "SQL", "opportunity", "customer", "evangelist"];
      const currentIdx = LIFECYCLE.indexOf(contact.lifecycleStage ?? "lead");
      const updates: Record<string, unknown> = { temperature: "hot", updatedAt: now };

      // Promote to SQL if currently MQL or below
      if (currentIdx < LIFECYCLE.indexOf("SQL")) {
        updates.lifecycleStage = "SQL";
      }
      db.update(contacts).set(updates).where(eq(contacts.id, contactId)).run();
    }
  } else if (!body.sentiment || body.sentiment === "neutral") {
    // At minimum mark as warm if cold
    const contact = db.select({ temperature: contacts.temperature })
      .from(contacts).where(eq(contacts.id, contactId)).get();
    if (contact?.temperature === "cold") {
      db.update(contacts).set({ temperature: "warm", updatedAt: now })
        .where(and(eq(contacts.id, contactId), eq(contacts.temperature, "cold"))).run();
    }
  }

  // Recompute full engagement score
  try { recomputeContact(contactId); } catch { /* non-fatal */ }

  // ── Fire triggers ────────────────────────────────────────────────────────
  const contact = db.select({ name: contacts.name, email: contacts.email })
    .from(contacts).where(eq(contacts.id, contactId)).get();

  const triggerData = {
    contactId,
    contactName: contact?.name ?? "",
    name: contact?.name ?? "",
    meetingId: body.meetingId,
    sentiment: body.sentiment ?? "neutral",
    summary: body.summary ?? "",
    durationMin: String(body.durationMin ?? 0),
  };
  fireTriggers({ event: "meeting_booked", data: triggerData }).catch(() => {});
  if (body.sentiment === "positive") {
    fireTriggers({ event: "became_sql", data: triggerData }).catch(() => {});
  }

  notifyUsers({
    type: "meeting_booked",
    title: "Reunión agendada",
    body: `${contact?.name ?? "Contacto"}${body.durationMin ? ` · ${body.durationMin} min` : ""}`,
    priority: "high",
    resourceType: "contact", resourceId: contactId,
    link: `/contacts/${contactId}`,
  }).catch(() => {});

  if (body.sentiment === "positive") {
    notifyUsers({
      type: "lifecycle_sql",
      title: "Lead calificado a SQL",
      body: `${contact?.name ?? "Contacto"} pasó a SQL tras reunión positiva`,
      priority: "high",
      resourceType: "contact", resourceId: contactId,
      link: `/contacts/${contactId}`,
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    matched: true,
    activityId: newActivity.id,
    contactId,
    followUpsCreated: body.actionItems?.length ?? 0,
    sentiment: body.sentiment ?? "neutral",
  });
}
