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
  if (role !== "superadmin" && role !== "marketing") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await params;
  if (id === session.user.id) return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });

  const { role: newRole } = await req.json();
  if (!VALID_ROLES.includes(newRole)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  // Privilege-escalation guard: only superadmin may grant superadmin or touch a superadmin account.
  if (role === "marketing") {
    const target = db.select({ role: users.role }).from(users).where(eq(users.id, id)).get();
    const targetIsSuper = (target?.role ?? "").replace(/^inactive:/, "") === "superadmin";
    if (newRole === "superadmin" || targetIsSuper) {
      return NextResponse.json({ error: "Marketing no puede asignar ni modificar superadmin" }, { status: 403 });
    }
  }

  db.update(users).set({ role: newRole }).where(eq(users.id, id)).run();
  return NextResponse.json({ ok: true });
}
