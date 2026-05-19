import { db } from "@/db";
import { contacts, crmSettings } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

export type LifecycleStage = "lead" | "MQL" | "SQL" | "opportunity" | "customer";

export interface HandoffRule {
  id: string;
  name: string;
  active: boolean;
  // Conditions
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  minScore?: number;
  temperature?: "cold" | "warm" | "hot";
  source?: string;
  minDaysInStage?: number;
  maxDaysInStage?: number;
}

export interface HandoffResult {
  contactId: string;
  contactName: string;
  fromStage: string;
  toStage: string;
  ruleId: string;
  ruleName: string;
}

const RULES_KEY = "handoff_rules";

const STAGE_ORDER: LifecycleStage[] = ["lead", "MQL", "SQL", "opportunity", "customer"];

function stageIndex(s: string): number {
  return STAGE_ORDER.indexOf(s as LifecycleStage);
}

export function loadRules(): HandoffRule[] {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, RULES_KEY)).get();
  if (!row?.value) return defaultRules();
  try { return JSON.parse(row.value) as HandoffRule[]; } catch { return defaultRules(); }
}

export function saveRules(rules: HandoffRule[]) {
  const val = JSON.stringify(rules);
  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, RULES_KEY)).get();
  if (existing) {
    db.update(crmSettings).set({ value: val }).where(eq(crmSettings.key, RULES_KEY)).run();
  } else {
    db.insert(crmSettings).values({ key: RULES_KEY, value: val }).run();
  }
}

export function runHandoffRules(): HandoffResult[] {
  const rules = loadRules().filter(r => r.active);
  if (rules.length === 0) return [];

  const now = Date.now();
  const dayMs = 86_400_000;

  const activeContacts = db.select({
    id: contacts.id,
    name: contacts.name,
    score: contacts.score,
    temperature: contacts.temperature,
    source: contacts.source,
    lifecycleStage: contacts.lifecycleStage,
    updatedAt: contacts.updatedAt,
    returnedToMarketingAt: contacts.returnedToMarketingAt,
  }).from(contacts).where(isNull(contacts.returnedToMarketingAt)).all();

  const results: HandoffResult[] = [];

  for (const contact of activeContacts) {
    const updatedMs = typeof contact.updatedAt === "number"
      ? (contact.updatedAt < 1e10 ? contact.updatedAt * 1000 : contact.updatedAt)
      : contact.updatedAt instanceof Date ? contact.updatedAt.getTime() : 0;

    const daysInStage = updatedMs > 0 ? Math.floor((now - updatedMs) / dayMs) : 0;

    for (const rule of rules) {
      if (contact.lifecycleStage !== rule.fromStage) continue;

      // Validate promotion direction (can only move forward)
      if (stageIndex(rule.toStage) <= stageIndex(rule.fromStage)) continue;

      // Check conditions
      if (rule.minScore !== undefined && (contact.score ?? 0) < rule.minScore) continue;
      if (rule.temperature && contact.temperature !== rule.temperature) continue;
      if (rule.source && contact.source !== rule.source) continue;
      if (rule.minDaysInStage !== undefined && daysInStage < rule.minDaysInStage) continue;
      if (rule.maxDaysInStage !== undefined && daysInStage > rule.maxDaysInStage) continue;

      // Apply: update lifecycle stage
      db.update(contacts)
        .set({ lifecycleStage: rule.toStage, updatedAt: new Date() })
        .where(eq(contacts.id, contact.id))
        .run();

      results.push({
        contactId: contact.id,
        contactName: contact.name,
        fromStage: rule.fromStage,
        toStage: rule.toStage,
        ruleId: rule.id,
        ruleName: rule.name,
      });

      break; // Apply only first matching rule per contact
    }
  }

  return results;
}

function defaultRules(): HandoffRule[] {
  return [
    {
      id: "rule-lead-to-mql",
      name: "Lead caliente con score alto → MQL",
      active: true,
      fromStage: "lead",
      toStage: "MQL",
      minScore: 60,
      temperature: "hot",
    },
    {
      id: "rule-mql-to-sql",
      name: "MQL con score muy alto → SQL",
      active: true,
      fromStage: "MQL",
      toStage: "SQL",
      minScore: 80,
    },
  ];
}
