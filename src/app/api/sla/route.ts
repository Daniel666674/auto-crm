import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const SLA_KEY = "ms_sla_config";
const SLA_HISTORY_KEY = "ms_sla_history";

interface SLAConfig {
  version: number;
  mqlResponseHours: number;
  formQualificationHours: number;
  maxReturnsPerMonth: number;
  allowedReturnReasons: string[];
  lastAcceptedBySalesAt: string | null;
  lastAcceptedByMarketingAt: string | null;
  updatedAt: string;
}

const DEFAULT_SLA: SLAConfig = {
  version: 1,
  mqlResponseHours: 24,
  formQualificationHours: 1,
  maxReturnsPerMonth: 5,
  allowedReturnReasons: [
    "No es buen fit",
    "Mal timing",
    "Necesita educación",
    "Duplicado",
    "Sin presupuesto",
  ],
  lastAcceptedBySalesAt: null,
  lastAcceptedByMarketingAt: null,
  updatedAt: new Date().toISOString(),
};

function readSla(): SLAConfig {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, SLA_KEY)).get();
  if (!row?.value) return DEFAULT_SLA;
  try { return { ...DEFAULT_SLA, ...JSON.parse(row.value) }; } catch { return DEFAULT_SLA; }
}

function writeSla(config: SLAConfig) {
  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, SLA_KEY)).get();
  const val = JSON.stringify(config);
  if (existing) {
    db.update(crmSettings).set({ value: val }).where(eq(crmSettings.key, SLA_KEY)).run();
  } else {
    db.insert(crmSettings).values({ key: SLA_KEY, value: val }).run();
  }
}

function readHistory(): SLAConfig[] {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, SLA_HISTORY_KEY)).get();
  if (!row?.value) return [];
  try { return JSON.parse(row.value); } catch { return []; }
}

function appendHistory(old: SLAConfig) {
  const history = readHistory();
  history.unshift(old);
  const trimmed = history.slice(0, 5);
  const val = JSON.stringify(trimmed);
  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, SLA_HISTORY_KEY)).get();
  if (existing) {
    db.update(crmSettings).set({ value: val }).where(eq(crmSettings.key, SLA_HISTORY_KEY)).run();
  } else {
    db.insert(crmSettings).values({ key: SLA_HISTORY_KEY, value: val }).run();
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ sla: readSla(), history: readHistory() });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const current = readSla();
  appendHistory(current);

  const updated: SLAConfig = {
    ...current,
    mqlResponseHours: Number(body.mqlResponseHours) || current.mqlResponseHours,
    formQualificationHours: Number(body.formQualificationHours) || current.formQualificationHours,
    maxReturnsPerMonth: Number(body.maxReturnsPerMonth) || current.maxReturnsPerMonth,
    allowedReturnReasons: Array.isArray(body.allowedReturnReasons) ? body.allowedReturnReasons : current.allowedReturnReasons,
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };
  writeSla(updated);
  return NextResponse.json({ sla: updated });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json() as { role: "sales" | "marketing" };
  const current = readSla();
  const now = new Date().toISOString();

  if (body.role === "sales") current.lastAcceptedBySalesAt = now;
  else if (body.role === "marketing") current.lastAcceptedByMarketingAt = now;
  else return NextResponse.json({ error: "role must be sales or marketing" }, { status: 400 });

  writeSla(current);
  return NextResponse.json({ sla: current });
}
