import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { pipelineStages } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin" && role !== "marketing") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });

  const existing = db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)).all();
  const maxOrder = existing.length > 0 ? Math.max(...existing.map(s => s.order)) : 0;

  const created = db.insert(pipelineStages).values({
    name: String(body.name).trim().slice(0, 80),
    order: body.order ?? maxOrder + 1,
    color: body.color ?? "#64748b",
    isWon: body.isWon ?? false,
    isLost: body.isLost ?? false,
  }).returning().get();

  return NextResponse.json(created, { status: 201 });
}
