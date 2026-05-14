import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });
  if (params.id === session.user.id) return NextResponse.json({ error: "No puedes desactivarte a ti mismo" }, { status: 400 });

  const { active } = await req.json();
  // We store active status as a special role suffix or in a dedicated field.
  // Since users table has no active column, we use role prefix "inactive:" to mark deactivated users.
  const target = db.select().from(users).where(eq(users.id, params.id)).get();
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  let newRole = target.role;
  if (!active) {
    if (!newRole.startsWith("inactive:")) newRole = `inactive:${newRole}`;
  } else {
    newRole = newRole.replace(/^inactive:/, "");
  }

  db.update(users).set({ role: newRole }).where(eq(users.id, params.id)).run();
  return NextResponse.json({ ok: true, active, role: newRole });
}
