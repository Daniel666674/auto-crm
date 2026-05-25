import { db } from "@/db";
import { contacts, activities, emailEvents } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getGmailSenderUserId, listInboundMessages } from "./google-gmail";
import { logEmailEvent } from "./email";
import { recomputeContact } from "./fit-recompute";
import { fireTriggers } from "./triggers";

function parseFromEmail(from: string): string {
  const m = from.match(/<([^>]+)>/);
  return (m ? m[1] : from).trim().toLowerCase();
}

const RX_BOUNCE_FROM = /mailer-daemon|postmaster|mail delivery (subsystem|system)/i;
const RX_BOUNCE_SUBJECT = /delivery (status notification|failure)|undeliverable|returned mail|failure notice|mail delivery failed|no se pudo entregar/i;

/** A bounce/complaint notice is a system message, not a real reply. Detect it so
 * it's logged as a bounce against the failed recipient rather than counted as
 * engagement. The failed address is recovered from the notice body/snippet. */
function detectBounceRecipient(m: { from: string; subject: string; snippet: string }, byEmail: Map<string, string>): string | null {
  const isBounce = RX_BOUNCE_FROM.test(m.from) || RX_BOUNCE_SUBJECT.test(m.subject || "");
  if (!isBounce) return null;
  const candidates = (m.snippet || "").toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) ?? [];
  for (const addr of candidates) {
    const id = byEmail.get(addr.trim());
    if (id) return id;
  }
  return null;
}

/**
 * Polls the connected Workspace inbox for messages from known contacts and logs
 * each as an inbound "reply" on that contact's timeline. Deduped by Gmail
 * message id, so it's safe to run on a schedule. No-op if Google isn't connected.
 */
export async function pollInboundReplies(): Promise<{ logged: number }> {
  const userId = getGmailSenderUserId();
  if (!userId) return { logged: 0 };

  let msgs;
  try {
    msgs = await listInboundMessages(userId, "in:inbox newer_than:2d -from:me", 50);
  } catch {
    return { logged: 0 };
  }
  if (!msgs.length) return { logged: 0 };

  const all = db.select({ id: contacts.id, email: contacts.email }).from(contacts).all();
  const byEmail = new Map<string, string>();
  for (const c of all) {
    if (c.email) byEmail.set(c.email.trim().toLowerCase(), c.id);
  }

  let logged = 0;
  for (const m of msgs) {
    // Bounce / delivery-failure notices: log as a bounce + suppress, not a reply.
    const bouncedId = detectBounceRecipient(m, byEmail);
    if (bouncedId) {
      const dup = db
        .select({ id: emailEvents.id })
        .from(emailEvents)
        .where(and(eq(emailEvents.messageId, m.id), eq(emailEvents.type, "bounce")))
        .get();
      if (dup) continue;
      logEmailEvent({ contactId: bouncedId, messageId: m.id, type: "bounce" });
      logged++;
      continue;
    }

    const contactId = byEmail.get(parseFromEmail(m.from));
    if (!contactId) continue;

    const exists = db
      .select({ id: emailEvents.id })
      .from(emailEvents)
      .where(and(eq(emailEvents.messageId, m.id), eq(emailEvents.type, "reply")))
      .get();
    if (exists) continue;

    const parsed = m.date ? new Date(m.date) : new Date();
    const when = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

    logEmailEvent({ contactId, messageId: m.id, type: "reply" });
    try {
      db.insert(activities)
        .values({
          id: crypto.randomUUID(),
          type: "email",
          description: `Respuesta recibida: ${m.subject || "(sin asunto)"}`,
          contactId,
          completedAt: when,
          createdAt: new Date(),
        })
        .run();
    } catch {
      /* non-fatal */
    }
    // A reply is a positive intent signal — re-score so the contact jumps HOT
    // and, if the fit is already there, gets promoted to SQL.
    try {
      recomputeContact(contactId);
    } catch {
      /* non-fatal */
    }
    void fireTriggers({
      event: "contact_replied",
      data: { contactId, subject: m.subject || "", from: parseFromEmail(m.from) },
    });
    logged++;
  }

  return { logged };
}
