import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// Bumped to v2 when pricing moved from CRM-vendor tiers to BlackScale's
// marketing + sales enablement service tiers (Colombia).
const PRICING_KEY = "pricing_config_v2";

const DEFAULT_PRICING = {
  packages: [
    { id: "starter", label: "Starter — Digital Ads", priceUSD: 750, description: "Campaña en 1 plataforma · workshops de alineación con ventas · 1 SDR o AE · creativos paid/orgánico (opcional) · entrega y análisis" },
    { id: "growth", label: "Growth — Ads + SDR", priceUSD: 1650, description: "Campaña en 2 plataformas · workshops semanales + scripts · 1 SDR + AE dedicado · creativos paid/orgánico (opcional) · entrega y análisis" },
    { id: "enterprise", label: "Enterprise — Full Stack", priceUSD: 3000, description: "Campaña en 3+ plataformas · sesiones 1:1 con ventas (hasta 10) · 2 SDRs + AE dedicado · creativos paid/orgánico · entrega y análisis" },
  ],
  // Add-on COP prices are editable placeholders (Editar precios) — confirm before quoting.
  scopeItems: [
    { id: "creativos-paid", label: "Generación de creativos — Paid (por plataforma)", price: 800000 },
    { id: "creativos-organico", label: "Generación de creativos — Orgánico", price: 500000 },
    { id: "plataforma-extra", label: "Plataforma de ads adicional", price: 600000 },
    { id: "sdr-extra", label: "SDR adicional (mensual)", price: 2500000 },
    { id: "scripts", label: "Desarrollo de scripts de ventas", price: 700000 },
    { id: "sesiones-1a1", label: "Sesiones 1:1 con equipo de ventas", price: 900000 },
  ],
  usdToCop: 3800,
};

export async function GET() {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, PRICING_KEY)).get();
  let config = DEFAULT_PRICING;
  if (row) {
    try { config = JSON.parse(row.value); } catch { config = DEFAULT_PRICING; }
  }
  // Overlay the global FX rate so the calculator and deals share one rate.
  return NextResponse.json({ ...config, usdToCop: globalFxRate(config.usdToCop ?? DEFAULT_PRICING.usdToCop) });
}

// Single source of truth for USD→COP: the global FX rate (Ajustes → Negocio).
function globalFxRate(fallback: number): number {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, "default_fx_rate")).get();
  if (!row?.value) return fallback;
  try {
    const parsed = JSON.parse(row.value) as { rate?: number };
    return Number(parsed.rate) > 0 ? Number(parsed.rate) : fallback;
  } catch {
    const n = Number(row.value);
    return n > 0 ? n : fallback;
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const value = JSON.stringify(body);

  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, PRICING_KEY)).get();
  if (existing) {
    db.update(crmSettings).set({ value }).where(eq(crmSettings.key, PRICING_KEY)).run();
  } else {
    db.insert(crmSettings).values({ key: PRICING_KEY, value }).run();
  }

  return NextResponse.json({ ok: true });
}
