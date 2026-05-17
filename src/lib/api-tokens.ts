import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

interface VerifiedToken {
  id: string;
  name: string;
  scopes: string[];
  createdBy: string;
}

/**
 * Verify a bearer token and return the matching record, or null.
 * Updates lastUsedAt on success.
 *
 * Usage in /api/v1/* routes:
 *   const auth = req.headers.get("authorization");
 *   const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
 *   const verified = token ? verifyApiToken(token) : null;
 *   if (!verified) return new Response("Unauthorized", { status: 401 });
 */
export function verifyApiToken(plaintext: string): VerifiedToken | null {
  if (!plaintext || !plaintext.startsWith("bsn_")) return null;

  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  const row = db.select().from(apiTokens).where(eq(apiTokens.tokenHash, hash)).get();

  if (!row || row.revokedAt) return null;

  // Update lastUsedAt (non-blocking)
  try {
    db.update(apiTokens).set({ lastUsedAt: new Date() }).where(eq(apiTokens.id, row.id)).run();
  } catch { /* ignore */ }

  return {
    id: row.id,
    name: row.name,
    scopes: row.scopes.split(",").map((s) => s.trim()).filter(Boolean),
    createdBy: row.createdBy,
  };
}

export function tokenHasScope(token: VerifiedToken, required: string): boolean {
  if (token.scopes.includes("read:all") && required.startsWith("read:")) return true;
  if (token.scopes.includes("write:all")) return true;
  return token.scopes.includes(required);
}
