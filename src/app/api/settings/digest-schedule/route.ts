import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const KEY = "digest_schedule";

interface DigestSchedule {
  enabled: boolean;
  hour: number;      // 0-23
  frequency: "daily" | "weekly" | "monthly";
  weekday?: number;  // 0-6, only for weekly
  email: string;
}

const DEFAULT: DigestSchedule = {
  enabled: false,
  hour: 7,
  frequency: "daily",
  email: process.env.DIGEST_EMAIL ?? "",
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const row = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  const schedule: DigestSchedule = row ? { ...DEFAULT, ...JSON.parse(row.value) } : DEFAULT;
  return NextResponse.json(schedule);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  let body: Partial<DigestSchedule>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const hour = Number(body.hour ?? 7);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
    return NextResponse.json({ error: "hour debe ser 0-23" }, { status: 400 });
  }
  if (body.frequency && !["daily", "weekly", "monthly"].includes(body.frequency)) {
    return NextResponse.json({ error: "frequency invalida" }, { status: 400 });
  }

  const schedule: DigestSchedule = {
    enabled: Boolean(body.enabled),
    hour: Math.round(hour),
    frequency: body.frequency ?? "daily",
    weekday: body.weekday !== undefined ? Number(body.weekday) : undefined,
    email: String(body.email ?? "").trim(),
  };

  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  if (existing) {
    db.update(crmSettings).set({ value: JSON.stringify(schedule) }).where(eq(crmSettings.key, KEY)).run();
  } else {
    db.insert(crmSettings).values({ key: KEY, value: JSON.stringify(schedule) }).run();
  }

  return NextResponse.json(schedule);
}
