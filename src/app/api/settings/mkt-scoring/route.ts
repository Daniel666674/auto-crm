import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const KEY = "mkt_scoring_weights";

interface MktScoringWeights {
  t1: number;
  t2: number;
  t3: number;
  engageOpen: number;
  engageClick: number;
  hotThreshold: number;
}

const DEFAULT: MktScoringWeights = {
  t1: 60, t2: 35, t3: 15,
  engageOpen: 2, engageClick: 5,
  hotThreshold: 70,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const row = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  const weights: MktScoringWeights = row ? { ...DEFAULT, ...JSON.parse(row.value) } : DEFAULT;
  return NextResponse.json(weights);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  let body: Partial<MktScoringWeights>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

  const merged: MktScoringWeights = { ...DEFAULT, ...body };
  for (const [k, v] of Object.entries(merged)) {
    if (!Number.isFinite(Number(v))) {
      return NextResponse.json({ error: `${k} debe ser un número` }, { status: 400 });
    }
  }

  const existing = db.select().from(crmSettings).where(eq(crmSettings.key, KEY)).get();
  const json = JSON.stringify(merged);
  if (existing) {
    db.update(crmSettings).set({ value: json }).where(eq(crmSettings.key, KEY)).run();
  } else {
    db.insert(crmSettings).values({ key: KEY, value: json }).run();
  }

  return NextResponse.json(merged);
}
