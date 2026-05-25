import { NextRequest, NextResponse } from "next/server";
import { computeEmailMetrics } from "@/lib/email-metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const windowDays = Math.min(365, Math.max(1, parseInt(searchParams.get("days") || "30", 10) || 30));
  const campaignId = searchParams.get("campaignId") || undefined;
  const sequenceId = searchParams.get("sequenceId") || undefined;
  try {
    const metrics = computeEmailMetrics({ windowDays, campaignId, sequenceId });
    return NextResponse.json(metrics);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
