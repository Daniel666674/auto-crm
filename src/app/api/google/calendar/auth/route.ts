import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuthUrl, storeTokens, getOAuthClient } from "@/lib/google-calendar";

// GET /api/google/calendar/auth — initiate OAuth
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Optional ?return=integrations lets the callback land back on the integrations tab.
  const ret = req.nextUrl.searchParams.get("return");
  const url = getAuthUrl(ret === "integrations" ? "integrations" : undefined);
  return NextResponse.redirect(url);
}

// POST /api/google/calendar/auth?code=... — exchange code for tokens (called by callback)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { code?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const { code } = body;
  if (!code) return NextResponse.json({ error: "Código requerido" }, { status: 400 });

  try {
    const oauth = getOAuthClient();
    const { tokens } = await oauth.getToken(code);
    await storeTokens(session.user.id, tokens);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[calendar auth]", err);
    return NextResponse.json({ error: "Error al obtener tokens" }, { status: 500 });
  }
}
