import { db } from "@/db";
import { workflowTriggers, crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type TriggerEvent =
  | "deal_stage_changed"
  | "contact_score_reached"
  | "lead_created"
  | "deal_created"
  | "followup_overdue";

export interface TriggerPayload {
  event: TriggerEvent;
  data: Record<string, unknown>;
}

interface Action {
  type: "send_webhook" | "notify_slack" | "log";
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;       // template with {{field}} placeholders
  message?: string;
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(data[key] ?? ""));
}

function matchesConditions(
  conditions: Record<string, unknown>,
  data: Record<string, unknown>
): boolean {
  for (const [key, expected] of Object.entries(conditions)) {
    if (String(data[key]) !== String(expected)) return false;
  }
  return true;
}

async function executeAction(action: Action, data: Record<string, unknown>): Promise<void> {
  if (action.type === "send_webhook" && action.url) {
    const bodyStr = action.body ? renderTemplate(action.body, data) : JSON.stringify(data);
    const method = (action.method ?? "POST").toUpperCase();
    await fetch(action.url, {
      method,
      headers: { "Content-Type": "application/json", ...(action.headers ?? {}) },
      body: method !== "GET" ? bodyStr : undefined,
    });
  } else if (action.type === "notify_slack") {
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
  }
  // "log" type: no-op in production (useful for testing)
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
