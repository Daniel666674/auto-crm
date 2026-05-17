import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ScoringWeights } from "@/lib/scoring";

const SCORING_KEY = "scoring_weights";

const DEFAULT_WEIGHTS: ScoringWeights = {
  tempHot: 40,
  tempWarm: 25,
  tempCold: 10,
  contactEmail: 10,
  contactPhone: 10,
  contactCompany: 5,
  perActivity: 5,
  maxActivityBonus: 20,
  recency30d: -15,
  recency14d: -10,
  recency7d: -5,
  hasDeals: 10,
  dealValue100k: 5,
  dealValue500k: 5,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const row = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, SCORING_KEY))
    .get();

  if (!row) {
    return NextResponse.json(DEFAULT_WEIGHTS);
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<ScoringWeights>;
    // Merge with defaults to ensure all keys are present
    return NextResponse.json({ ...DEFAULT_WEIGHTS, ...parsed });
  } catch {
    return NextResponse.json(DEFAULT_WEIGHTS);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  // Validate that all provided keys are numbers
  const invalidKeys: string[] = [];
  for (const [key, val] of Object.entries(body)) {
    if (typeof val !== "number" || !Number.isFinite(val)) {
      invalidKeys.push(key);
    }
  }

  if (invalidKeys.length > 0) {
    return NextResponse.json(
      { error: `Los siguientes campos deben ser numeros: ${invalidKeys.join(", ")}` },
      { status: 400 }
    );
  }

  // Only accept known weight keys
  const allowedKeys = new Set(Object.keys(DEFAULT_WEIGHTS));
  const unknownKeys = Object.keys(body).filter((k) => !allowedKeys.has(k));
  if (unknownKeys.length > 0) {
    return NextResponse.json(
      { error: `Campos desconocidos: ${unknownKeys.join(", ")}` },
      { status: 400 }
    );
  }

  // Merge with defaults
  const merged: ScoringWeights = { ...DEFAULT_WEIGHTS, ...(body as Partial<ScoringWeights>) };

  const existing = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, SCORING_KEY))
    .get();

  if (existing) {
    db.update(crmSettings)
      .set({ value: JSON.stringify(merged) })
      .where(eq(crmSettings.key, SCORING_KEY))
      .run();
  } else {
    db.insert(crmSettings)
      .values({ key: SCORING_KEY, value: JSON.stringify(merged) })
      .run();
  }

  return NextResponse.json(merged);
}
