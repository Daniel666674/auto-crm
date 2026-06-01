import { NextResponse } from "next/server";
import { AD_CLIENTS, loadManual, saveManual, getMergedMetrics, type AdPlatform, type PlatformMetrics } from "@/lib/integrations";

export const dynamic = "force-dynamic";

// GET — manual values + merged (live|manual|none) + which platforms have credentials.
export async function GET() {
  const merged = getMergedMetrics();
  return NextResponse.json({
    manual: loadManual(),
    merged,
    clients: Object.fromEntries(
      (Object.keys(AD_CLIENTS) as AdPlatform[]).map(p => [p, { configured: AD_CLIENTS[p].isConfigured() }])
    ),
  });
}

// PUT — save manual ad metrics (M2). Body: { meta?: {...}, linkedin?: {...}, google?: {...} }
// Each platform accepts any subset of PlatformMetrics (impressions, spendCents, followers, etc.).
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<Record<AdPlatform, Partial<PlatformMetrics>>>;
    const current = loadManual();
    for (const p of ["meta", "linkedin", "google"] as AdPlatform[]) {
      if (body[p]) current[p] = { ...current[p], ...body[p] };
    }
    saveManual(current);
    return NextResponse.json({ ok: true, manual: current });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
