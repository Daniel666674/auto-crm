import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { campaignOutcomes } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = db.select().from(campaignOutcomes).orderBy(asc(campaignOutcomes.type), asc(campaignOutcomes.order)).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  let body: { type?: string; label?: string; order?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

  const VALID_TYPES = ["success", "underperformed", "cancelled"];
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: `type invalido. Opciones: ${VALID_TYPES.join(", ")}` }, { status: 400 });
  }
  if (!body.label?.trim()) {
    return NextResponse.json({ error: "label es requerido" }, { status: 400 });
  }

  const result = db.insert(campaignOutcomes).values({
    type: body.type,
    label: body.label.trim(),
    order: body.order ?? 0,
    active: true,
    createdAt: new Date(),
  }).returning().get();

  return NextResponse.json(result, { status: 201 });
}
