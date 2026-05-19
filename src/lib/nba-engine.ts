import { db } from "@/db";
import { contacts, deals, activities, pipelineStages } from "@/db/schema";
import { isNull } from "drizzle-orm";

export interface NBAItem {
  contactId: string;
  contactName: string;
  company: string | null;
  action: string;
  reason: string;
  urgency: "high" | "medium" | "low";
  score: number;
  daysInStage: number;
  openDealValue: number;
  lifecycleStage: string | null;
  temperature: string;
}

function toMs(val: Date | number | null | undefined): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  return val < 1e10 ? val * 1000 : val;
}

export function computeNextBestActions(limit = 20): NBAItem[] {
  const now = Date.now();
  const day = 86_400_000;
  const sevenDaysAgo = now - 7 * day;
  const threeDaysAgo = now - 3 * day;
  const twoDaysAgo = now - 2 * day;

  const activeContacts = db.select({
    id: contacts.id,
    name: contacts.name,
    company: contacts.company,
    score: contacts.score,
    temperature: contacts.temperature,
    lifecycleStage: contacts.lifecycleStage,
    email: contacts.email,
    updatedAt: contacts.updatedAt,
  }).from(contacts).where(isNull(contacts.returnedToMarketingAt)).all()
    .filter(c => !["customer", "evangelist"].includes(c.lifecycleStage ?? ""));

  const allStages = db.select().from(pipelineStages).all();
  const wonStageIds = new Set(allStages.filter(s => s.isWon).map(s => s.id));
  const lostStageIds = new Set(allStages.filter(s => s.isLost).map(s => s.id));

  const allDeals = db.select({
    id: deals.id, contactId: deals.contactId, stageId: deals.stageId, value: deals.value,
  }).from(deals).all();

  const allActivities = db.select({
    id: activities.id, contactId: activities.contactId, type: activities.type,
    createdAt: activities.createdAt, completedAt: activities.completedAt,
  }).from(activities).all();

  // Index activities and deals per contact
  const lastActivityByContact = new Map<string, number>();
  const activityCountLast7 = new Map<string, number>();

  for (const a of allActivities) {
    const ts = toMs(a.createdAt);
    const prev = lastActivityByContact.get(a.contactId) ?? 0;
    if (ts > prev) lastActivityByContact.set(a.contactId, ts);
    if (ts >= sevenDaysAgo) {
      activityCountLast7.set(a.contactId, (activityCountLast7.get(a.contactId) ?? 0) + 1);
    }
  }

  const openDealValueByContact = new Map<string, number>();
  const dealStageByContact = new Map<string, string>();

  for (const d of allDeals) {
    if (!wonStageIds.has(d.stageId) && !lostStageIds.has(d.stageId)) {
      openDealValueByContact.set(d.contactId, (openDealValueByContact.get(d.contactId) ?? 0) + (d.value ?? 0));
      // track highest-value deal's stage
      const existing = openDealValueByContact.get(d.contactId) ?? 0;
      if ((d.value ?? 0) >= existing) dealStageByContact.set(d.contactId, d.stageId);
    }
  }

  const results: NBAItem[] = [];

  for (const c of activeContacts) {
    const updatedMs = toMs(c.updatedAt);
    const daysInStage = updatedMs > 0 ? Math.floor((now - updatedMs) / day) : 0;
    const lastActivity = lastActivityByContact.get(c.id) ?? 0;
    const daysSinceActivity = lastActivity > 0 ? Math.floor((now - lastActivity) / day) : 999;
    const recentActivity = activityCountLast7.get(c.id) ?? 0;
    const openDealValue = openDealValueByContact.get(c.id) ?? 0;
    const lifecycle = c.lifecycleStage ?? "lead";
    const score = c.score ?? 0;

    let action: string | null = null;
    let reason = "";
    let urgency: "high" | "medium" | "low" = "low";

    // Rule 1: High score + no recent activity → call today
    if (score >= 70 && daysSinceActivity >= 3) {
      action = "Llamar hoy";
      reason = `Score ${score} · sin actividad hace ${daysSinceActivity}d`;
      urgency = "high";
    }
    // Rule 2: MQL stuck > 7 days → assign to sales
    else if (lifecycle === "MQL" && daysInStage >= 7) {
      action = "Asignar a ventas";
      reason = `Lleva ${daysInStage}d en MQL sin avanzar`;
      urgency = "high";
    }
    // Rule 3: Deal in Propuesta > 5 days → confirm proposal
    else if (openDealValue > 0 && daysInStage >= 5 && lifecycle === "opportunity") {
      action = "Confirmar propuesta";
      reason = `Deal activo · ${daysInStage}d en etapa sin movimiento`;
      urgency = "high";
    }
    // Rule 4: Hot temperature + no activity in 2 days → follow-up email
    else if (c.temperature === "hot" && daysSinceActivity >= 2) {
      action = "Email de follow-up";
      reason = `Lead caliente · sin contacto hace ${daysSinceActivity}d`;
      urgency = "medium";
    }
    // Rule 5: Warm + high score + recent engagement
    else if (c.temperature === "warm" && score >= 55 && recentActivity >= 2) {
      action = "Llamar esta semana";
      reason = `Score ${score} · ${recentActivity} interacciones recientes`;
      urgency = "medium";
    }
    // Rule 6: No email captured
    else if (!c.email) {
      action = "Capturar email";
      reason = "Sin email · no se puede nutrir";
      urgency = "low";
    }

    if (!action) continue;

    results.push({
      contactId: c.id,
      contactName: c.name,
      company: c.company,
      action,
      reason,
      urgency,
      score,
      daysInStage,
      openDealValue,
      lifecycleStage: c.lifecycleStage,
      temperature: c.temperature,
    });
  }

  // Sort: high → medium → low, then score desc, then deal value desc
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  results.sort((a, b) => {
    const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (uDiff !== 0) return uDiff;
    const sDiff = b.score - a.score;
    if (sDiff !== 0) return sDiff;
    return b.openDealValue - a.openDealValue;
  });

  return results.slice(0, limit);
}
