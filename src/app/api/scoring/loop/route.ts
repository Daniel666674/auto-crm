import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runScoringLoop, getLearnedWeights } from "@/lib/scoring-loop";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const data = getLearnedWeights();
  if (!data) {
    return NextResponse.json({ computedAt: null, wonDealsCount: 0, lostDealsCount: 0, campaignWeights: {}, industryWeights: {}, sourceWeights: {} });
  }
  return NextResponse.json(data);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }
  try {
    const data = runScoringLoop();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Error al ejecutar scoring loop: ${err instanceof Error ? err.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
