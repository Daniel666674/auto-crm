import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { desc } from "drizzle-orm";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  const rows = db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPreview: apiTokens.tokenPreview,
      scopes: apiTokens.scopes,
      createdBy: apiTokens.createdBy,
      lastUsedAt: apiTokens.lastUsedAt,
      revokedAt: apiTokens.revokedAt,
      createdAt: apiTokens.createdAt,
    })
    .from(apiTokens)
    .orderBy(desc(apiTokens.createdAt))
    .all();

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") {
    return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  }

  let body: { name?: string; scopes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name es requerido" }, { status: 400 });

  // Generate token: bsn_ + 32 random bytes hex
  const raw = `bsn_${crypto.randomBytes(32).toString("hex")}`;
  const tokenHash = hashToken(raw);
  const tokenPreview = raw.slice(-4);

  const result = db
    .insert(apiTokens)
    .values({
      name,
      tokenHash,
      tokenPreview,
      scopes: body.scopes?.trim() || "read:all",
      createdBy: session.user.id,
      createdAt: new Date(),
    })
    .returning()
    .get();

  // Plaintext token shown ONCE
  return NextResponse.json({
    id: result.id,
    name: result.name,
    token: raw,
    scopes: result.scopes,
    warning: "Guarda este token ahora — no podrás verlo de nuevo",
  }, { status: 201 });
}
