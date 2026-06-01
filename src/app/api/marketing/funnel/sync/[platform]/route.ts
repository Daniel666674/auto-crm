import { NextResponse } from "next/server";
import { AD_CLIENTS, syncPlatform, loadCache, type AdPlatform } from "@/lib/integrations";

export const dynamic = "force-dynamic";

function isPlatform(p: string): p is AdPlatform {
  return p === "meta" || p === "linkedin" || p === "google";
}

// GET — last sync status for the platform
export async function GET(_req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  if (!isPlatform(platform)) return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
  const cached = loadCache()[platform];
  return NextResponse.json({
    platform,
    configured: AD_CLIENTS[platform].isConfigured(),
    lastSync: cached ?? null,
  });
}

// POST — trigger a fresh pull
export async function POST(_req: Request, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  if (!isPlatform(platform)) return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
  try {
    const result = await syncPlatform(platform, 30);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
