import { db } from "@/db";
import { sequences, sequenceEnrollments, contacts, activities } from "@/db/schema";
import { and, eq, lte } from "drizzle-orm";
import {
  sendEmail,
  buildTrackedHtml,
  renderTemplate,
  isSuppressed,
  logEmailEvent,
} from "./email";

const DAY_MS = 86_400_000;
const MAX_PER_TICK = 50;
const SENDER_NAME = process.env.SENDER_NAME || "BlackScale";

export interface SequenceStep {
  delay: number; // days to wait before this step
  type: string; // email | call | task | follow_up
  description?: string;
  subject?: string;
  body?: string;
}

export function parseSteps(stepsJson: string | null | undefined): SequenceStep[] {
  if (!stepsJson) return [];
  try {
    const arr = JSON.parse(stepsJson);
    return Array.isArray(arr) ? (arr as SequenceStep[]) : [];
  } catch {
    return [];
  }
}

/** When step `index` should fire, measured from `from`. */
export function computeNextActionAt(steps: SequenceStep[], index: number, from: Date): Date | null {
  if (index < 0 || index >= steps.length) return null;
  const delayDays = Math.max(0, Number(steps[index]?.delay) || 0);
  return new Date(from.getTime() + delayDays * DAY_MS);
}

function mergeVars(contact: { name: string; company: string | null }): Record<string, string> {
  const firstName = (contact.name || "").trim().split(/\s+/)[0] || "";
  return {
    firstName,
    name: contact.name || "",
    company: contact.company || "",
    senderName: SENDER_NAME,
  };
}

/**
 * Core engine tick. Sends due email steps via BlackScale email, surfaces
 * non-email steps as tasks, advances enrollments. Safe to call repeatedly.
 */
export async function processSequenceSends(now: Date = new Date()): Promise<{ sent: number; tasks: number; paused: number }> {
  let sent = 0;
  let tasks = 0;
  let paused = 0;

  const due = db
    .select()
    .from(sequenceEnrollments)
    .where(and(eq(sequenceEnrollments.status, "active"), lte(sequenceEnrollments.nextActionAt, now)))
    .limit(MAX_PER_TICK)
    .all();

  for (const en of due) {
    const seq = db.select().from(sequences).where(eq(sequences.id, en.sequenceId)).get();
    if (!seq || !seq.active) continue;

    const steps = parseSteps(seq.stepsJson);
    if (en.currentStep >= steps.length) {
      db.update(sequenceEnrollments)
        .set({ status: "completed", completedAt: now, nextActionAt: null })
        .where(eq(sequenceEnrollments.id, en.id))
        .run();
      continue;
    }

    const contact = db.select().from(contacts).where(eq(contacts.id, en.contactId)).get();
    if (!contact) {
      db.update(sequenceEnrollments)
        .set({ status: "paused", nextActionAt: null, lastError: "Contacto no encontrado" })
        .where(eq(sequenceEnrollments.id, en.id))
        .run();
      paused++;
      continue;
    }

    // A contact returned to marketing has left the sales motion — stop the sequence.
    if (contact.returnedToMarketingAt) {
      db.update(sequenceEnrollments)
        .set({ status: "paused", nextActionAt: null, lastError: "Contacto devuelto a marketing" })
        .where(eq(sequenceEnrollments.id, en.id))
        .run();
      paused++;
      continue;
    }

    const step = steps[en.currentStep];

    if (step.type === "email") {
      const to = (contact.email || "").trim();
      if (!to) {
        db.update(sequenceEnrollments)
          .set({ status: "paused", nextActionAt: null, lastError: "El contacto no tiene email" })
          .where(eq(sequenceEnrollments.id, en.id))
          .run();
        paused++;
        continue;
      }
      if (isSuppressed(to)) {
        db.update(sequenceEnrollments)
          .set({ status: "paused", nextActionAt: null, lastError: "Email en lista de exclusión" })
          .where(eq(sequenceEnrollments.id, en.id))
          .run();
        paused++;
        continue;
      }

      const vars = mergeVars(contact);
      const subject = renderTemplate(step.subject || step.description || "", vars);
      const bodyText = renderTemplate(step.body || "", vars);
      const messageId = crypto.randomUUID();
      const html = buildTrackedHtml(bodyText, {
        contactId: contact.id,
        enrollmentId: en.id,
        sequenceId: seq.id,
        messageId,
        unsubEmail: to,
      });

      try {
        await sendEmail({ to, subject, html });
      } catch (err) {
        // Transient failure — retry in ~1h, keep enrollment active.
        const msg = err instanceof Error ? err.message : "Error al enviar";
        db.update(sequenceEnrollments)
          .set({ nextActionAt: new Date(now.getTime() + 3_600_000), lastError: msg })
          .where(eq(sequenceEnrollments.id, en.id))
          .run();
        continue;
      }

      logEmailEvent({
        contactId: contact.id,
        sequenceId: seq.id,
        enrollmentId: en.id,
        messageId,
        type: "sent",
      });
      try {
        db.insert(activities)
          .values({
            id: crypto.randomUUID(),
            type: "email",
            description: `Secuencia "${seq.name}": ${subject}`,
            contactId: contact.id,
            completedAt: now,
            createdAt: now,
          })
          .run();
      } catch {
        /* non-fatal */
      }

      const nextStep = en.currentStep + 1;
      if (nextStep < steps.length) {
        db.update(sequenceEnrollments)
          .set({
            currentStep: nextStep,
            lastSentAt: now,
            lastError: null,
            nextActionAt: computeNextActionAt(steps, nextStep, now),
          })
          .where(eq(sequenceEnrollments.id, en.id))
          .run();
      } else {
        db.update(sequenceEnrollments)
          .set({ status: "completed", completedAt: now, lastSentAt: now, lastError: null, nextActionAt: null })
          .where(eq(sequenceEnrollments.id, en.id))
          .run();
      }
      sent++;
    } else {
      // Manual step (call / task / follow_up): create a reminder activity and
      // wait for the rep to complete it (existing "Completar paso" advances it).
      try {
        db.insert(activities)
          .values({
            id: crypto.randomUUID(),
            type: step.type === "call" ? "call" : "follow_up",
            description: `Secuencia "${seq.name}" · Paso ${en.currentStep + 1}: ${step.description || step.type}`,
            contactId: contact.id,
            scheduledAt: now,
            createdAt: now,
          })
          .run();
      } catch {
        /* non-fatal */
      }
      // Stop auto-processing until the rep advances the step manually.
      db.update(sequenceEnrollments)
        .set({ nextActionAt: null, lastError: null })
        .where(eq(sequenceEnrollments.id, en.id))
        .run();
      tasks++;
    }
  }

  return { sent, tasks, paused };
}
