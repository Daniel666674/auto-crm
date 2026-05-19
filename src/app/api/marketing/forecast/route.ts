import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";

export const dynamic = "force-dynamic";

const LIFECYCLE_ORDER = ["subscriber", "lead", "MQL", "SQL", "opportunity", "customer", "evangelist"];
const MQL_AND_ABOVE = new Set(["MQL", "SQL", "opportunity", "customer", "evangelist"]);
const SQL_AND_ABOVE = new Set(["SQL", "opportunity", "customer", "evangelist"]);

function toMs(val: Date | number | null | undefined): number {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  return val < 1e10 ? val * 1000 : val;
}

function confidenceFor(sampleSize: number): "low" | "medium" | "high" {
  if (sampleSize < 10) return "low";
  if (sampleSize < 30) return "medium";
  return "high";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = Date.now();
  const window180 = now - 180 * 24 * 3600 * 1000;

  const allContacts = db.select({
    id: contacts.id,
    lifecycleStage: contacts.lifecycleStage,
    createdAt: contacts.createdAt,
    updatedAt: contacts.updatedAt,
  }).from(contacts).all();

  const stages = db.select().from(pipelineStages).all();
  const wonStageIds = new Set(stages.filter(s => s.isWon).map(s => s.id));

  const allDeals = db.select({
    id: deals.id,
    stageId: deals.stageId,
    value: deals.value,
    contactId: deals.contactId,
    createdAt: deals.createdAt,
    updatedAt: deals.updatedAt,
  }).from(deals).all();

  const contactsBecameLead180 = allContacts.filter(c => toMs(c.createdAt) >= window180);
  const contactsBecameMql180 = allContacts.filter(c =>
    MQL_AND_ABOVE.has(c.lifecycleStage ?? "lead") && toMs(c.updatedAt) >= window180
  );
  const contactsBecameSql180 = allContacts.filter(c =>
    SQL_AND_ABOVE.has(c.lifecycleStage ?? "lead") && toMs(c.updatedAt) >= window180
  );

  const wonDeals180 = allDeals.filter(d =>
    wonStageIds.has(d.stageId) && toMs(d.updatedAt) >= window180
  );

  const leadsCount = contactsBecameLead180.length;
  const mqlCount = contactsBecameMql180.length;
  const sqlCount = contactsBecameSql180.length;
  const wonCount = wonDeals180.length;

  const leadsToMql = leadsCount > 0 ? mqlCount / leadsCount : 0.18;
  const mqlToSql = mqlCount > 0 ? sqlCount / mqlCount : 0.32;
  const sqlToWon = sqlCount > 0 ? wonCount / sqlCount : 0.22;

  const avgDealValueCop = wonCount > 0
    ? Math.round(wonDeals180.reduce((sum, d) => sum + (d.value ?? 0), 0) / wonCount)
    : 0;

  let avgDaysLeadToWon = 65;
  if (wonDeals180.length > 0) {
    const contactById = new Map(allContacts.map(c => [c.id, c]));
    const durations: number[] = [];
    for (const d of wonDeals180) {
      const contact = contactById.get(d.contactId);
      if (!contact) continue;
      const start = toMs(contact.createdAt);
      const end = toMs(d.updatedAt);
      if (start > 0 && end > start) {
        durations.push((end - start) / (24 * 3600 * 1000));
      }
    }
    if (durations.length > 0) {
      avgDaysLeadToWon = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
  }

  const currentLeads = allContacts.filter(c => (c.lifecycleStage ?? "lead") === "lead").length;
  const currentMqls = allContacts.filter(c => c.lifecycleStage === "MQL").length;
  const currentSqls = allContacts.filter(c => c.lifecycleStage === "SQL").length;

  const expectedFromLeads = currentLeads * leadsToMql * mqlToSql * sqlToWon;
  const expectedFromMqls = currentMqls * mqlToSql * sqlToWon;
  const expectedFromSqls = currentSqls * sqlToWon;
  const totalExpected = expectedFromLeads + expectedFromMqls + expectedFromSqls;

  const cycleDays = Math.max(15, avgDaysLeadToWon);
  const ramp = (days: number) => {
    if (cycleDays <= 0) return 1;
    const ratio = days / cycleDays;
    return Math.min(1, 1 - Math.exp(-1.4 * ratio));
  };

  const projections = [
    { key: "day30", days: 30 },
    { key: "day60", days: 60 },
    { key: "day90", days: 90 },
  ];

  const forecast: Record<string, { expectedDeals: number; expectedRevenueCop: number; confidence: "low" | "medium" | "high" }> = {};
  const conf = confidenceFor(wonCount);
  for (const p of projections) {
    const factor = ramp(p.days);
    const dealsExp = Math.round(totalExpected * factor);
    const revenueExp = Math.round(dealsExp * avgDealValueCop);
    forecast[p.key] = {
      expectedDeals: dealsExp,
      expectedRevenueCop: revenueExp,
      confidence: conf,
    };
  }

  return NextResponse.json({
    conversionRates: {
      leadsToMql: Number(leadsToMql.toFixed(3)),
      mqlToSql: Number(mqlToSql.toFixed(3)),
      sqlToWon: Number(sqlToWon.toFixed(3)),
    },
    avgDealValueCop,
    avgDaysLeadToWon,
    currentFunnel: {
      leads: currentLeads,
      mqls: currentMqls,
      sqls: currentSqls,
    },
    historicalSample: {
      windowDays: 180,
      newLeads: leadsCount,
      newMqls: mqlCount,
      newSqls: sqlCount,
      wonDeals: wonCount,
    },
    forecast,
    lifecycleOrder: LIFECYCLE_ORDER,
  });
}
