import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEngagementSource, setEngagementSource } from "@/lib/mkt-engagement";

export const dynamic = "force-dynamic";

// GET /api/marketing/engagement-source — current source flag
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ source: getEngagementSource() });
}

// PUT /api/marketing/engagement-source { source: "local" } — superadmin
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  let body: { source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (body.source !== "local") {
    return NextResponse.json({ error: "source debe ser 'local'" }, { status: 400 });
  }
  setEngagementSource(body.source);
  return NextResponse.json({ ok: true, source: body.source });
}
