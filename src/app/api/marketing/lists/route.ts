import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

// Returns contacts grouped by source as native segments.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const rows = mktDb
      .prepare("SELECT source, COUNT(*) as total FROM mkt_contacts GROUP BY source ORDER BY total DESC")
      .all() as Array<{ source: string; total: number }>;
    const lists = rows.map((r, i) => ({
      id: i + 1,
      name: r.source,
      totalSubscribers: r.total,
      folderId: 1,
    }));
    return NextResponse.json({ lists });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
