import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass through static assets and NextAuth endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/sw.js") ||
    pathname === "/login" ||
    pathname.startsWith("/api/auth")
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

  if (pathname.startsWith("/marketing") && role !== "marketing") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (
    (pathname.startsWith("/pipeline") || pathname.startsWith("/sales")) &&
    role !== "sales"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
