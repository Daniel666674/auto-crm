import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const KEY = "mkt_stale_days";
const DEFAULT = 30;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const row = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  const staleDays = row ? Math.max(1, Number(row.value) || DEFAULT) : DEFAULT;
  return NextResponse.json({ staleDays });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { staleDays } = await req.json();
  const days = Number(staleDays);
  if (!Number.isFinite(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: "staleDays debe ser 1-365" }, { status: 400 });
  }

  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  if (existing) {
    db.update(crmSettings).set({ value: String(Math.round(days)) }).where(eq(crmSettings.key, KEY)).run();
  } else {
    db.insert(crmSettings).values({ key: KEY, value: String(Math.round(days)) }).run();
  }

  return NextResponse.json({ staleDays: Math.round(days) });
}
