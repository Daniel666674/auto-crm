import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// DELETE all marketing contacts and campaigns (full reset). Superadmin only.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.confirm !== "PURGE_DEMO_DATA") {
    return NextResponse.json({
      error: 'Send { "confirm": "PURGE_DEMO_DATA" } to confirm deletion',
    }, { status: 400 });
  }

  const deletedContacts = mktDb.prepare("DELETE FROM mkt_contacts").run();
  const deletedCampaigns = mktDb.prepare("DELETE FROM mkt_campaigns").run();

  return NextResponse.json({
    success: true,
    deletedContacts: deletedContacts.changes,
    deletedCampaigns: deletedCampaigns.changes,
    message: "Marketing data purged. Add real contacts via the marketing contacts API.",
  });
}
