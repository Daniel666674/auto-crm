import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const VALID_ROLES = ["superadmin", "marketing", "sales"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  const { id } = await params;
  if (id === session.user.id) return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });

  const { role: newRole } = await req.json();
  if (!VALID_ROLES.includes(newRole)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  db.update(users).set({ role: newRole }).where(eq(users.id, id)).run();
  return NextResponse.json({ ok: true });
}
