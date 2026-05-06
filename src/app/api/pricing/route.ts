import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const PRICING_KEY = "pricing_config";

const DEFAULT_PRICING = {
  packages: [
    { id: "inicial", label: "Inicial", priceUSD: 750, description: "Setup básico, hasta 500 contactos, 1 pipeline" },
    { id: "intermedio", label: "Intermedio", priceUSD: 1650, description: "CRM completo, integraciones básicas, hasta 2K contactos" },
    { id: "avanzado", label: "Avanzado", priceUSD: 3000, description: "Enterprise, integraciones premium, contactos ilimitados" },
  ],
  scopeItems: [
    { id: "onboarding", label: "Onboarding y capacitación", price: 500000 },
    { id: "migration", label: "Migración de datos", price: 800000 },
    { id: "whatsapp", label: "Integración WhatsApp Business", price: 600000 },
    { id: "customreport", label: "Dashboard personalizado", price: 1200000 },
    { id: "automation", label: "Automatizaciones avanzadas", price: 900000 },
    { id: "brevo", label: "Setup Brevo + cadences", price: 700000 },
  ],
  usdToCop: 4150,
};

export async function GET() {
  const row = db.select().from(crmSettings).where(eq(crmSettings.key, PRICING_KEY)).get();
  if (!row) return NextResponse.json(DEFAULT_PRICING);
  try {
    return NextResponse.json(JSON.parse(row.value));
  } catch {
    return NextResponse.json(DEFAULT_PRICING);
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
