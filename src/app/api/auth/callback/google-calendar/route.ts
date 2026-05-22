import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOAuthClient, storeTokens } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const fromIntegrations = state === "integrations";
  const okUrl = fromIntegrations ? "/settings?tab=integraciones&google=connected" : "/settings/calendar?connected=true";
  const errUrl = (e: string) =>
    fromIntegrations ? `/settings?tab=integraciones&google_error=${e}` : `/settings/calendar?error=${e}`;

  if (!code) return NextResponse.redirect(new URL(errUrl("no_code"), req.url));

  try {
    const oauth = getOAuthClient();
    const { tokens } = await oauth.getToken(code);
    await storeTokens(session.user.id, tokens);
    return NextResponse.redirect(new URL(okUrl, req.url));
  } catch {
    return NextResponse.redirect(new URL(errUrl("auth_failed"), req.url));
  }
}
