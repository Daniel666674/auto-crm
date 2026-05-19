import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { isNotNull, isNull, inArray, and, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function getLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 65) return "Bueno";
  if (score >= 45) return "Regular";
  return "Crítico";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = Date.now();
  const ms30 = 30 * 24 * 3600 * 1000;
  const ms60 = 60 * 24 * 3600 * 1000;
  const ms14 = 14 * 24 * 3600 * 1000;

  const cutoff30 = new Date(now - ms30);
  const cutoff60 = new Date(now - ms60);
  const cutoff14 = new Date(now - ms14);

  // Fetch all contacts (we need several different slices)
  const allContacts = db.select({
    id: contacts.id,
    lifecycleStage: contacts.lifecycleStage,
    returnedToMarketingAt: contacts.returnedToMarketingAt,
    updatedAt: contacts.updatedAt,
    createdAt: contacts.createdAt,
  }).from(contacts).all();

  // ── Component 1: Handoff Acceptance Rate (25 pts) ────────────────────────
  // Proxy: contacts at SQL+ / contacts at MQL+
  const MQL_AND_ABOVE = ["MQL", "SQL", "opportunity", "customer", "won"];
  const SQL_AND_ABOVE = ["SQL", "opportunity", "customer", "won"];

  const mqlAndAbove = allContacts.filter((c) =>
    MQL_AND_ABOVE.includes(c.lifecycleStage ?? "lead")
  );
  const sqlAndAbove = allContacts.filter((c) =>
    SQL_AND_ABOVE.includes(c.lifecycleStage ?? "lead")
  );

  const handoffRate =
    mqlAndAbove.length > 0 ? sqlAndAbove.length / mqlAndAbove.length : 0;
  const handoffPts = Math.min(25, Math.round(handoffRate * 25));

  // ── Component 2: Return-to-marketing rate (20 pts — lower is better) ─────
  const returnedLast30 = allContacts.filter((c) => {
    if (!c.returnedToMarketingAt) return false;
    const t =
      c.returnedToMarketingAt instanceof Date
        ? c.returnedToMarketingAt.getTime()
        : Number(c.returnedToMarketingAt);
    return t >= cutoff30.getTime();
  }).length;

  // Total handed to sales in last 30 days = contacts that became SQL+ in last 30 days
  // Proxy: contacts currently at SQL+ that were updated in last 30 days
  const handedLast30 = allContacts.filter((c) => {
    if (!SQL_AND_ABOVE.includes(c.lifecycleStage ?? "lead")) return false;
    const t =
      c.updatedAt instanceof Date
        ? c.updatedAt.getTime()
        : Number(c.updatedAt);
    return t >= cutoff30.getTime();
  }).length;

  const returnRate =
    handedLast30 > 0 ? returnedLast30 / handedLast30 : 0;
  let returnPts: number;
  if (returnRate <= 0.1) returnPts = 20;
  else if (returnRate <= 0.2) returnPts = 10;
  else returnPts = 0;

  // ── Component 3: MQL→SQL conversion (20 pts) ─────────────────────────────
  // MQLs created/updated in last 60 days
  const mqlLast60 = allContacts.filter((c) => {
    const stage = c.lifecycleStage ?? "lead";
    if (!MQL_AND_ABOVE.includes(stage)) return false;
    const t =
      c.updatedAt instanceof Date
        ? c.updatedAt.getTime()
        : Number(c.updatedAt);
    return t >= cutoff60.getTime();
  }).length;

  const sqlLast60 = allContacts.filter((c) => {
    const stage = c.lifecycleStage ?? "lead";
    if (!SQL_AND_ABOVE.includes(stage)) return false;
    const t =
      c.updatedAt instanceof Date
        ? c.updatedAt.getTime()
        : Number(c.updatedAt);
    return t >= cutoff60.getTime();
  }).length;

  const mqlToSqlRate = mqlLast60 > 0 ? sqlLast60 / mqlLast60 : 0;
  const TARGET_CONVERSION = 0.35;
  const mqlToSqlPts = Math.min(
    20,
    Math.round((mqlToSqlRate / TARGET_CONVERSION) * 20)
  );

  // ── Component 4: Stale lead rate (15 pts — lower is better) ──────────────
  const STALE_STAGES = ["lead", "MQL", "SQL"];
  const activeContacts = allContacts.filter((c) =>
    STALE_STAGES.includes(c.lifecycleStage ?? "lead")
  );
  const staleContacts = activeContacts.filter((c) => {
    if (c.returnedToMarketingAt) return false; // exclude returned
    const t =
      c.updatedAt instanceof Date
        ? c.updatedAt.getTime()
        : Number(c.updatedAt);
    return t < cutoff14.getTime();
  });

  const staleRate =
    activeContacts.length > 0 ? staleContacts.length / activeContacts.length : 0;
  let stalePts: number;
  if (staleRate <= 0.1) stalePts = 15;
  else if (staleRate <= 0.2) stalePts = 8;
  else stalePts = 0;

  // ── Component 5: Volume bonus (20 pts) ───────────────────────────────────
  const newLast30 = allContacts.filter((c) => {
    const t =
      c.createdAt instanceof Date
        ? c.createdAt.getTime()
        : Number(c.createdAt);
    return t >= cutoff30.getTime();
  }).length;

  let volumePts: number;
  if (newLast30 > 10) volumePts = 20;
  else if (newLast30 > 5) volumePts = 10;
  else volumePts = 5;

  // ── Final score ───────────────────────────────────────────────────────────
  const score = Math.min(
    100,
    handoffPts + returnPts + mqlToSqlPts + stalePts + volumePts
  );

  return NextResponse.json({
    score,
    breakdown: {
      handoffAcceptance: { pts: handoffPts, max: 25, rate: handoffRate },
      returnRate: { pts: returnPts, max: 20, rate: returnRate },
      mqlToSql: { pts: mqlToSqlPts, max: 20, rate: mqlToSqlRate },
      staleLead: { pts: stalePts, max: 15, rate: staleRate },
      volume: { pts: volumePts, max: 20, count: newLast30 },
    },
    label: getLabel(score),
    trend: "stable",
  });
}
