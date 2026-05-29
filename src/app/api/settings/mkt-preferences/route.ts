import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BRAND_PRESET_ORDER, MARKETING_DEFAULT_PRESET, getBrandPreset } from "@/lib/brand-presets";

const defaultPreset = getBrandPreset(MARKETING_DEFAULT_PRESET);

const DEFAULTS = {
  theme: MARKETING_DEFAULT_PRESET,
  accentPrimary: defaultPreset.accent,
  accentSecondary: defaultPreset.accentSecondary,
  textColor: defaultPreset.text,
  fontFamily: "inter",
  sidebarBg: defaultPreset.sidebar,
  sidebarBgType: "solid",
  uiDensity: "comfortable",
  borderRadius: "rounded",
};

const ALLOWED_PRESETS = new Set<string>(BRAND_PRESET_ORDER);

function keyFor(userId: string): string {
  return `mkt_prefs:${userId}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, keyFor(session.user.id))).get();
  if (!row) return NextResponse.json(DEFAULTS);
  try {
    const parsed = JSON.parse(row.value);
    const merged = { ...DEFAULTS, ...parsed };
    if (!ALLOWED_PRESETS.has(merged.theme)) merged.theme = MARKETING_DEFAULT_PRESET;
    return NextResponse.json(merged);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }
  const allowed = ["theme", "accentPrimary", "accentSecondary", "textColor", "fontFamily", "sidebarBg", "sidebarBgType", "sidebarBgImage", "uiDensity", "borderRadius"];
  const k = keyFor(session.user.id);
  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, k)).get();
  const current = existing ? (() => { try { return JSON.parse(existing.value); } catch { return {}; } })() : {};
  const merged: Record<string, unknown> = { ...DEFAULTS, ...current };
  for (const key of allowed) if (body[key] !== undefined) merged[key] = body[key];
  if (typeof merged.theme === "string" && !ALLOWED_PRESETS.has(merged.theme)) {
    merged.theme = MARKETING_DEFAULT_PRESET;
  }
  const value = JSON.stringify(merged);
  if (existing) db.update(crmSettings).set({ value }).where(eq(crmSettings.key, k)).run();
  else db.insert(crmSettings).values({ key: k, value }).run();
  return NextResponse.json(merged);
}
