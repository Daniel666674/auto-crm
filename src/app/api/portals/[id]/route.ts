import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { clientPortals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const r = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (r !== "superadmin" && r !== "marketing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  let body: { title?: string; configJson?: string; clientCompany?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string") update.title = body.title;
  if (typeof body.configJson === "string") update.configJson = body.configJson;
  if (body.clientCompany !== undefined) update.clientCompany = body.clientCompany;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const row = db
    .update(clientPortals)
    .set(update)
    .where(eq(clientPortals.id, id))
    .returning()
    .get();

  if (!row) {
    return NextResponse.json({ error: "Portal no encontrado" }, { status: 404 });
  }

  return NextResponse.json(row);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const r = (session?.user as { role?: string } | undefined)?.role;
  if (!session || (r !== "superadmin" && r !== "marketing")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  db.delete(clientPortals).where(eq(clientPortals.id, id)).run();

  return NextResponse.json({ success: true });
}
