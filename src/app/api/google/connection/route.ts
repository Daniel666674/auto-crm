import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { googleTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptToken } from "@/lib/google-calendar";

// GET /api/google/connection — is the current user's Google (Calendar + Gmail) connected?
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const row = db
    .select({ refreshTokenEnc: googleTokens.refreshTokenEnc, updatedAt: googleTokens.updatedAt })
    .from(googleTokens)
    .where(eq(googleTokens.userId, session.user.id))
    .get();

  return NextResponse.json({
    connected: !!row,
    email: session.user.email ?? null,
    hasRefreshToken: !!row?.refreshTokenEnc,
    updatedAt: row?.updatedAt ?? null,
  });
}

// DELETE /api/google/connection — disconnect (revoke + delete stored tokens) so the
// next connect re-consents with the current scope set (calendar + gmail.send).
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const row = db
    .select({ accessTokenEnc: googleTokens.accessTokenEnc, refreshTokenEnc: googleTokens.refreshTokenEnc })
    .from(googleTokens)
    .where(eq(googleTokens.userId, session.user.id))
    .get();

  // Best-effort revoke at Google so the grant is fully released.
  if (row) {
    try {
      const tokenToRevoke = row.refreshTokenEnc
        ? decryptToken(row.refreshTokenEnc)
        : decryptToken(row.accessTokenEnc);
      await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: tokenToRevoke }).toString(),
      });
    } catch {
      // Non-fatal — we still remove the local token below.
    }
  }

  db.delete(googleTokens).where(eq(googleTokens.userId, session.user.id)).run();
  return NextResponse.json({ ok: true });
}
