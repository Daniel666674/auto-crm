import { NextResponse } from "next/server";
import { syncAll, getMergedMetrics } from "@/lib/integrations";

export const dynamic = "force-dynamic";

// GET — current merged status of all platforms (no side effects).
export async function GET() {
  return NextResponse.json({ merged: getMergedMetrics() });
}

// POST — sync every configured platform. Optional protection: if CRON_SECRET is
// set, require "Authorization: Bearer <CRON_SECRET>". Crontab example:
//   0 3 * * * curl -s -X POST http://localhost:3000/api/marketing/funnel/sync-all -H "Authorization: Bearer $CRON_SECRET"
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const results = await syncAll(30);
    return NextResponse.json({ ok: true, synced: results.length, results });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
