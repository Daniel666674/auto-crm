import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const KEY = (process.env.BREVO_API_KEY || "").replace(/^\[|\]$/g, "");
const H = { "api-key": KEY, "Content-Type": "application/json" };

export async function GET() {
  if (!KEY) return NextResponse.json({ error: "BREVO_API_KEY no configurada" }, { status: 500 });
  try {
    const r = await fetch("https://api.brevo.com/v3/contacts/lists?limit=50&offset=0&sort=desc", {
      headers: H, cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ error: `Brevo ${r.status}` }, { status: 502 });
    const d = await r.json();
    return NextResponse.json({ lists: d.lists || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: "BREVO_API_KEY no configurada" }, { status: 500 });
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    const r = await fetch("https://api.brevo.com/v3/contacts/lists", {
      method: "POST",
      headers: H,
      body: JSON.stringify({ name: name.trim() }),
    });
    const d = await r.json();
    if (!r.ok) return NextResponse.json({ error: d.message || `Brevo ${r.status}` }, { status: 502 });
    return NextResponse.json(d, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
