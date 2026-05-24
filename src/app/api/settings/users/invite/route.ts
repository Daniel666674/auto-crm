import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const VALID_ROLES = ["superadmin", "marketing", "sales"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin" && role !== "marketing") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { email, role: newRole, name } = await req.json();
  if (!email || !newRole) return NextResponse.json({ error: "email y role son requeridos" }, { status: 400 });
  if (!VALID_ROLES.includes(newRole)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

  // Privilege-escalation guard: marketing may not invite superadmins.
  if (role === "marketing" && newRole === "superadmin") {
    return NextResponse.json({ error: "Marketing no puede invitar superadmin" }, { status: 403 });
  }

  const normalEmail = String(email).toLowerCase().trim();
  const existing = db.select().from(users).where(eq(users.email, normalEmail)).get();
  if (existing) return NextResponse.json({ error: "El usuario ya existe" }, { status: 409 });

  const id = crypto.randomUUID();
  db.insert(users).values({
    id,
    email: normalEmail,
    passwordHash: "",
    role: newRole,
    name: name || null,
  }).run();

  return NextResponse.json({ ok: true, id, email: normalEmail, role: newRole });
}
