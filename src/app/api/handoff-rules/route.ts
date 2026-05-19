import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadRules, saveRules, runHandoffRules, type HandoffRule } from "@/lib/handoff-rules-engine";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  return NextResponse.json({ rules: loadRules() });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json() as { rules: HandoffRule[] };
  if (!Array.isArray(body.rules)) return NextResponse.json({ error: "rules must be an array" }, { status: 400 });

  // Assign ids to new rules
  const rules = body.rules.map(r => ({ ...r, id: r.id || nanoid(8) }));
  saveRules(rules);
  return NextResponse.json({ rules });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const results = runHandoffRules();
  return NextResponse.json({ applied: results.length, results });
}
