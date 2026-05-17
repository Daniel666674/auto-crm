import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { workflowTriggers } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Solo superadmin/marketing" }, { status: 403 });
  }

  const existing = db.select().from(workflowTriggers).where(eq(workflowTriggers.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Workflow no encontrado" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) update.name = String(body.name).trim();
  if (body.active !== undefined) update.active = Boolean(body.active);
  if (body.conditions !== undefined) update.conditions = JSON.stringify(body.conditions);
  if (body.actions !== undefined) update.actions = JSON.stringify(body.actions);

  const result = db
    .update(workflowTriggers)
    .set(update)
    .where(eq(workflowTriggers.id, id))
    .returning()
    .get();

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Solo superadmin/marketing" }, { status: 403 });
  }

  db.delete(workflowTriggers).where(eq(workflowTriggers.id, id)).run();
  return NextResponse.json({ success: true });
}
