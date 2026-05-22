import { db } from "@/db";
import { contacts, blastCampaigns, activities } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { sendEmail, buildTrackedHtml, renderTemplate, isSuppressed, logEmailEvent } from "./email";

const SENDER_NAME = process.env.SENDER_NAME || "BlackScale";

// Hard cap per blast to stay well within Workspace daily send limits.
export const MAX_RECIPIENTS = 500;

export interface AudienceRules {
  temperature?: string[];
  lifecycleStage?: string[];
  industry?: string[];
  source?: string[];
  scoreMin?: number;
  scoreMax?: number;
}

type Contact = typeof contacts.$inferSelect;

export function evalAudience(c: Contact, rules: AudienceRules): boolean {
  if (rules.temperature?.length && !rules.temperature.includes(c.temperature)) return false;
  if (rules.lifecycleStage?.length && !rules.lifecycleStage.includes(c.lifecycleStage ?? "lead")) return false;
  if (rules.industry?.length && !rules.industry.includes(c.industry ?? "")) return false;
  if (rules.source?.length && !rules.source.includes(c.source)) return false;
  if (rules.scoreMin != null && (c.score ?? 0) < rules.scoreMin) return false;
  if (rules.scoreMax != null && (c.score ?? 0) > rules.scoreMax) return false;
  return true;
}

/** Contacts matching the audience rules, excluding any returned to marketing. */
export function resolveAudience(rules: AudienceRules): Contact[] {
  const all = db.select().from(contacts).where(isNull(contacts.returnedToMarketingAt)).all();
  return all.filter((c) => evalAudience(c, rules));
}

/** Of an audience, the ones that can actually be mailed (have email, not suppressed). */
export function eligibleRecipients(matched: Contact[]): Contact[] {
  return matched.filter((c) => {
    const to = (c.email || "").trim();
    return !!to && !isSuppressed(to);
  });
}

function mergeVars(c: Contact): Record<string, string> {
  const firstName = (c.name || "").trim().split(/\s+/)[0] || "";
  return {
    firstName,
    name: c.name || "",
    company: c.company || "",
    senderName: SENDER_NAME,
  };
}

/**
 * Sends a blast to its audience via BlackScale email. Designed to run detached
 * (not awaited by the request) on the persistent PM2 process; it streams its
 * progress into the blast_campaigns row so the UI can poll status.
 */
export async function sendBlast(campaignId: string): Promise<{ sent: number; failed: number; skipped: number }> {
  const camp = db.select().from(blastCampaigns).where(eq(blastCampaigns.id, campaignId)).get();
  if (!camp) throw new Error("Campaña no encontrada");

  let rules: AudienceRules = {};
  try { rules = JSON.parse(camp.audienceJson); } catch { /* empty audience */ }

  const recipients = resolveAudience(rules).slice(0, MAX_RECIPIENTS);

  db.update(blastCampaigns)
    .set({ status: "sending", totalRecipients: recipients.length, sentCount: 0, failedCount: 0, skippedCount: 0, lastError: null })
    .where(eq(blastCampaigns.id, campaignId))
    .run();

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let lastError: string | null = null;

  for (const c of recipients) {
    const to = (c.email || "").trim();
    if (!to || isSuppressed(to)) {
      skipped++;
      db.update(blastCampaigns).set({ skippedCount: skipped }).where(eq(blastCampaigns.id, campaignId)).run();
      continue;
    }

    const vars = mergeVars(c);
    const subject = renderTemplate(camp.subject, vars);
    const bodyText = renderTemplate(camp.body, vars);
    const messageId = crypto.randomUUID();
    const html = buildTrackedHtml(bodyText, { contactId: c.id, campaignId, messageId, unsubEmail: to });

    try {
      await sendEmail({ to, subject, html });
      logEmailEvent({ contactId: c.id, campaignId, messageId, type: "sent" });
      try {
        db.insert(activities)
          .values({
            id: crypto.randomUUID(),
            type: "email",
            description: `Campaña "${camp.name}": ${subject}`,
            contactId: c.id,
            completedAt: new Date(),
            createdAt: new Date(),
          })
          .run();
      } catch { /* non-fatal */ }
      sent++;
    } catch (err) {
      failed++;
      lastError = err instanceof Error ? err.message : "Error al enviar";
    }
    db.update(blastCampaigns)
      .set({ sentCount: sent, failedCount: failed, skippedCount: skipped, lastError })
      .where(eq(blastCampaigns.id, campaignId))
      .run();
  }

  db.update(blastCampaigns)
    .set({
      status: sent === 0 && failed > 0 ? "failed" : "sent",
      sentAt: new Date(),
      sentCount: sent,
      failedCount: failed,
      skippedCount: skipped,
      lastError,
    })
    .where(eq(blastCampaigns.id, campaignId))
    .run();

  return { sent, failed, skipped };
}
