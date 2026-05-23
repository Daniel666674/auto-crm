import { db } from "@/db";
import { workflowTriggers, crmSettings, contacts, activities, notifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type TriggerEvent =
  | "deal_stage_changed"
  | "deal_won"
  | "deal_lost"
  | "deal_created"
  | "contact_score_reached"
  | "contact_tier_reached"
  | "lead_created"
  | "contact_replied"
  | "meeting_booked"
  | "lifecycle_changed"
  | "became_mql"
  | "became_sql"
  | "followup_overdue"
  // Marketing events
  | "campaign_created"
  | "campaign_completed"
  | "mkt_handoff"
  | "mkt_engagement_changed";

export interface TriggerPayload {
  event: TriggerEvent;
  data: Record<string, unknown>;
}

export type ActionType =
  | "send_webhook"
  | "notify_slack"
  | "notify_inapp"
  | "create_followup"
  | "set_temperature"
  | "set_lifecycle"
  | "add_tag"
  | "log";

interface Action {
  type: ActionType;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;        // template with {{field}} placeholders
  message?: string;     // slack / in-app body template
  value?: string;       // generic value (temperature, lifecycle, tag, followup text)
  delayDays?: number;   // for create_followup scheduling
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ""));
}

/**
 * Condition matching with simple operators. A condition value may be a plain
 * string (exact match, back-compatible) or carry a leading operator:
 *   ">=60"  ">10"  "<=5"  "<3"  "!=true"  "contains:fintech"
 */
function matchOne(actual: unknown, expected: string): boolean {
  const a = String(actual ?? "");
  const e = expected.trim();
  const numA = parseFloat(a);

  if (e.startsWith(">=")) return numA >= parseFloat(e.slice(2));
  if (e.startsWith("<=")) return numA <= parseFloat(e.slice(2));
  if (e.startsWith(">")) return numA > parseFloat(e.slice(1));
  if (e.startsWith("<")) return numA < parseFloat(e.slice(1));
  if (e.startsWith("!=")) return a.toLowerCase() !== e.slice(2).trim().toLowerCase();
  if (e.startsWith("contains:")) return a.toLowerCase().includes(e.slice(9).trim().toLowerCase());
  return a.toLowerCase() === e.toLowerCase();
}

function matchesConditions(
  conditions: Record<string, unknown>,
  data: Record<string, unknown>
): boolean {
  for (const [key, expected] of Object.entries(conditions)) {
    if (!matchOne(data[key], String(expected))) return false;
  }
  return true;
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function executeAction(action: Action, data: Record<string, unknown>): Promise<void> {
  const contactId = typeof data.contactId === "string" ? data.contactId : undefined;

  switch (action.type) {
    case "send_webhook": {
      if (!action.url) return;
      const bodyStr = action.body ? renderTemplate(action.body, data) : JSON.stringify(data);
      const method = (action.method ?? "POST").toUpperCase();
      await fetch(action.url, {
        method,
        headers: { "Content-Type": "application/json", ...(action.headers ?? {}) },
        body: method !== "GET" ? bodyStr : undefined,
      });
      return;
    }
    case "notify_slack": {
      const slackRow = db.select().from(crmSettings).where(eq(crmSettings.key, "slack_config")).get();
      if (!slackRow) return;
      const config = JSON.parse(slackRow.value);
      if (!config.webhookUrl) return;
      const text = action.message ? renderTemplate(action.message, data) : `Trigger fired: ${data.event}`;
      await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return;
    }
    case "notify_inapp": {
      // In-app notification to every active user (sales/marketing team).
      const team = db.select({ id: users.id }).from(users).all();
      const title = "Automatización";
      const bodyText = action.message ? renderTemplate(action.message, data) : `Evento: ${data.event}`;
      for (const u of team) {
        db.insert(notifications).values({
          userId: u.id,
          type: "automation",
          title,
          body: bodyText,
          resourceType: contactId ? "contact" : null,
          resourceId: contactId ?? null,
          read: false,
        }).run();
      }
      return;
    }
    case "create_followup": {
      if (!contactId) return;
      const days = action.delayDays ?? 1;
      const when = new Date(Date.now() + days * 86400000);
      db.insert(activities).values({
        type: "follow_up",
        description: action.value ? renderTemplate(action.value, data) : "Seguimiento automático",
        contactId,
        scheduledAt: when,
        createdAt: new Date(),
      }).run();
      return;
    }
    case "set_temperature": {
      if (!contactId || !action.value) return;
      db.update(contacts).set({ temperature: action.value, updatedAt: new Date() }).where(eq(contacts.id, contactId)).run();
      return;
    }
    case "set_lifecycle": {
      if (!contactId || !action.value) return;
      db.update(contacts).set({ lifecycleStage: action.value, updatedAt: new Date() }).where(eq(contacts.id, contactId)).run();
      return;
    }
    case "add_tag": {
      if (!contactId || !action.value) return;
      const row = db.select({ tags: contacts.tags }).from(contacts).where(eq(contacts.id, contactId)).get();
      const tags = parseTags(row?.tags);
      if (!tags.includes(action.value)) {
        tags.push(action.value);
        db.update(contacts).set({ tags: JSON.stringify(tags), updatedAt: new Date() }).where(eq(contacts.id, contactId)).run();
      }
      return;
    }
    case "log":
    default:
      return;
  }
}

export async function fireTriggers(payload: TriggerPayload): Promise<void> {
  try {
    const active = db
      .select()
      .from(workflowTriggers)
      .where(eq(workflowTriggers.eventType, payload.event))
      .all();

    const matching = active.filter((t) => {
      if (!t.active) return false;
      const conditions = JSON.parse(t.conditions ?? "{}") as Record<string, unknown>;
      return matchesConditions(conditions, payload.data);
    });

    const combined = { ...payload.data, event: payload.event };
    await Promise.allSettled(
      matching.flatMap((t) => {
        const actions = JSON.parse(t.actions ?? "[]") as Action[];
        return actions.map((a) => executeAction(a, combined));
      })
    );
  } catch {
    // triggers are non-critical — never throw
  }
}
