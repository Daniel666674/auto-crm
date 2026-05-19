import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { computeNextBestActions } from "@/lib/nba-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const limit = Math.min(50, Number(request.nextUrl.searchParams.get("limit") ?? "10"));
  const actions = computeNextBestActions(limit);
  return NextResponse.json({ actions });
}
