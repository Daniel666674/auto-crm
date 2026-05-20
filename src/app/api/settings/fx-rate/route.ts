import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const KEY = "default_fx_rate";
const DEFAULT_RATE = 4000; // COP per 1 USD

// Stored as JSON to leave room for a future live-rate API integration:
// { rate, source: "manual" | "api", provider?, updatedAt }
interface FxConfig {
  rate: number;
  source: "manual" | "api";
  provider?: string;
  updatedAt: string;
}

function readFx(): FxConfig {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  if (!row?.value) {
    return { rate: DEFAULT_RATE, source: "manual", updatedAt: new Date().toISOString() };
  }
  try {
    const parsed = JSON.parse(row.value) as Partial<FxConfig>;
    return {
      rate: Number(parsed.rate) > 0 ? Number(parsed.rate) : DEFAULT_RATE,
      source: parsed.source === "api" ? "api" : "manual",
      provider: parsed.provider,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    // Legacy plain-number value
    const n = Number(row.value);
    return { rate: n > 0 ? n : DEFAULT_RATE, source: "manual", updatedAt: new Date().toISOString() };
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json(readFx());
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin" && role !== "sales") {
    return NextResponse.json({ error: "Sin permiso para editar la tasa" }, { status: 403 });
  }

  const body = await req.json() as { rate?: number; source?: string; provider?: string };
  const rate = Number(body.rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1_000_000) {
    return NextResponse.json({ error: "La tasa debe ser un número positivo válido" }, { status: 400 });
  }

  const config: FxConfig = {
    rate,
    source: body.source === "api" ? "api" : "manual",
    provider: body.provider,
    updatedAt: new Date().toISOString(),
  };
  const val = JSON.stringify(config);

  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  if (existing) {
    db.update(crmSettings).set({ value: val }).where(eq(crmSettings.key, KEY)).run();
  } else {
    db.insert(crmSettings).values({ key: KEY, value: val }).run();
  }

  return NextResponse.json(config);
}
