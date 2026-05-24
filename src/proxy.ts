import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through: Next.js internals, auth endpoints, static assets, portal (client-facing)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon") ||
    pathname === "/login" ||
    pathname.startsWith("/portal")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request });

  // Unauthenticated — let each page/route handle it (NextAuth will redirect to /login)
  if (!token) return NextResponse.next();

  const role = (token.role as string) ?? "sales";

  // Marketing role: only /marketing/* is allowed; redirect everything else
  if (role === "marketing" && !pathname.startsWith("/marketing")) {
    return NextResponse.redirect(new URL("/marketing", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
