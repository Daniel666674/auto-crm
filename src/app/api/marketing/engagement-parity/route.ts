import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mktDb } from "@/db/mkt-db";
import { computeLocalEngagementByEmail, type EngagementStatus } from "@/lib/mkt-engagement";

export const dynamic = "force-dynamic";

type Counts = { hot: number; warm: number; cold: number; dead: number; total: number };

function emptyCounts(): Counts {
  return { hot: 0, warm: 0, cold: 0, dead: 0, total: 0 };
}
function bump(c: Counts, status: string) {
  if (status === "hot" || status === "warm" || status === "cold" || status === "dead") c[status]++;
  else c.cold++;
  c.total++;
}

// GET /api/marketing/engagement-parity — Brevo-synced vs local-derived distribution
// over the same mkt_contacts population, so the two can be compared before cutover.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = mktDb.prepare("SELECT email, engagement_status FROM mkt_contacts").all() as {
    email: string;
    engagement_status: string;
  }[];
  const local = computeLocalEngagementByEmail();

  const brevo = emptyCounts();
  const localCounts = emptyCounts();
  for (const r of rows) {
    bump(brevo, r.engagement_status);
    const e = r.email ? local.get(r.email.trim().toLowerCase()) : undefined;
    const status: EngagementStatus = e ? e.status : "cold";
    bump(localCounts, status);
  }

  return NextResponse.json({ brevo, local: localCounts });
}
