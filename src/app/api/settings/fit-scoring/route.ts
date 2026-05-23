import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  DEFAULT_FIT_WEIGHTS,
  DEFAULT_TIERS,
  getFitWeights,
  getTierThresholds,
  saveFitWeights,
  saveTierThresholds,
  type FitWeights,
  type TierThresholds,
} from "@/lib/fit-scoring";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ weights: getFitWeights(), tiers: getTierThresholds() });
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

  let body: { weights?: Record<string, unknown>; tiers?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const allWeightKeys = new Set(Object.keys(DEFAULT_FIT_WEIGHTS));
  const allTierKeys = new Set(Object.keys(DEFAULT_TIERS));

  if (body.weights) {
    for (const [k, v] of Object.entries(body.weights)) {
      if (!allWeightKeys.has(k)) {
        return NextResponse.json({ error: `Peso desconocido: ${k}` }, { status: 400 });
      }
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: `Peso invalido: ${k}` }, { status: 400 });
      }
    }
    saveFitWeights(body.weights as Partial<FitWeights>);
  }

  if (body.tiers) {
    for (const [k, v] of Object.entries(body.tiers)) {
      if (!allTierKeys.has(k)) {
        return NextResponse.json({ error: `Umbral desconocido: ${k}` }, { status: 400 });
      }
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: `Umbral invalido: ${k}` }, { status: 400 });
      }
    }
    saveTierThresholds(body.tiers as Partial<TierThresholds>);
  }

  return NextResponse.json({ weights: getFitWeights(), tiers: getTierThresholds() });
}
