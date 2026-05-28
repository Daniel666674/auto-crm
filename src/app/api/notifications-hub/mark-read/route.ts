import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markNotificationsRead } from "@/lib/notify";

export const dynamic = "force-dynamic";

// Body: { ids?: string[] }  — omit ids to mark every unread for the user.
// Accepts ids in either raw form ("abc123") or with the hub prefix ("notif-abc123").
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rawIds: unknown = body?.ids;
  const ids = Array.isArray(rawIds)
    ? rawIds
        .filter((x): x is string => typeof x === "string")
        .map(s => s.startsWith("notif-") ? s.slice(6) : s)
    : undefined;

  const updated = markNotificationsRead(userId, ids);
  return NextResponse.json({ updated });
}
