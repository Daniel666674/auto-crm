import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths a marketing user is allowed to visit.
// Everything not in this list → redirect to /marketing.
const MARKETING_ALLOWED = [
  "/marketing",
  "/analytics",
  "/settings",
  "/contacts",
  "/activities",
  "/calendar",
  "/ms-command",
  "/revenue-intelligence",
  "/api/",
  "/embed/",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through static assets and NextAuth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/sw.js") ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/portal/")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token",
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    // If a session cookie exists but getToken returned null, the session expired
    const hadSession =
      req.cookies.get("__Secure-next-auth.session-token") ||
      req.cookies.get("next-auth.session-token");
    if (hadSession) loginUrl.searchParams.set("expired", "true");
    return NextResponse.redirect(loginUrl);
  }

  const role = token.role as string;

  // superadmin bypasses all role restrictions
  if (role === "superadmin") return NextResponse.next();

  // Marketing role: whitelist-based — only allowed paths above, everything else
  // (sales dashboard, pipeline, deals, forecast, clients, etc.) → /marketing.
  if (role === "marketing") {
    const allowed =
      pathname === "/" // page.tsx handles the redirect to /marketing
        ? false        // force it through the page-level redirect for a clean UX
        : MARKETING_ALLOWED.some(p => pathname.startsWith(p));
    if (!allowed) return NextResponse.redirect(new URL("/marketing", req.url));
    return NextResponse.next();
  }

  // Non-marketing users cannot visit the marketing module
  if (pathname.startsWith("/marketing")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Non-sales users cannot visit pipeline or sales routes
  if (pathname.startsWith("/pipeline") || pathname.startsWith("/sales")) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};

