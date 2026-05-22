import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOAuthClient, storeTokens } from "@/lib/google-calendar";
import { getBaseUrl } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Behind the nginx proxy req.url resolves to http://localhost:3000, so build
  // redirects from the public base (NEXTAUTH_URL, includes the /app prefix).
  const base = getBaseUrl();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.redirect(`${base}/login`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const fromIntegrations = state === "integrations";
  const okUrl = fromIntegrations ? `${base}/settings?tab=integraciones&google=connected` : `${base}/settings/calendar?connected=true`;
  const errUrl = (e: string) =>
    fromIntegrations ? `${base}/settings?tab=integraciones&google_error=${e}` : `${base}/settings/calendar?error=${e}`;

  if (!code) return NextResponse.redirect(errUrl("no_code"));

  try {
    const oauth = getOAuthClient();
    const { tokens } = await oauth.getToken(code);
    await storeTokens(session.user.id, tokens);
    return NextResponse.redirect(okUrl);
  } catch {
    return NextResponse.redirect(errUrl("auth_failed"));
  }
}
