import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pollInboundReplies } from "@/lib/email-inbound";

export const dynamic = "force-dynamic";

// POST /api/email/poll-replies — manually trigger inbound reply capture
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const result = await pollInboundReplies();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al capturar respuestas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
