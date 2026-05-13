import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.BREVO_API_KEY || "";
  try {
    const r = await fetch("https://api.brevo.com/v3/contacts/lists?limit=50&offset=0", {
      headers: { "api-key": key },
      signal: AbortSignal.timeout(10_000),
    });
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      throw new Error(`Brevo no disponible (HTTP ${r.status}). Verifica la conexión del servidor.`);
    }
    const data = await r.json();
    return NextResponse.json({ lists: data.lists || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
