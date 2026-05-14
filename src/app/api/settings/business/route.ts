import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_KEYS = ["company_name","company_industry","company_type","company_size","timezone","currency","logo","language"];

function upsertSetting(key: string, value: string) {
  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, key)).get();
  if (existing) {
    db.update(crmSettings).set({ value }).where(eq(crmSettings.key, key)).run();
  } else {
    db.insert(crmSettings).values({ key, value }).run();
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin" && role !== "marketing") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const body = await req.json();
  for (const key of ALLOWED_KEYS) {
    if (body[key] !== undefined) upsertSetting(key, String(body[key]));
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const rows = db.select().from(crmSettings).all();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return NextResponse.json(map);
}
