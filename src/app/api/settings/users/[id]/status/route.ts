import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  const { id } = await params;
  if (id === session.user.id) return NextResponse.json({ error: "No puedes desactivarte a ti mismo" }, { status: 400 });

  const { active } = await req.json();
  const target = db.select().from(users).where(eq(users.id, id)).get();
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  let newRole = target.role;
  if (!active) {
    if (!newRole.startsWith("inactive:")) newRole = `inactive:${newRole}`;
  } else {
    newRole = newRole.replace(/^inactive:/, "");
  }

  db.update(users).set({ role: newRole }).where(eq(users.id, id)).run();
  return NextResponse.json({ ok: true, active, role: newRole });
}
