import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "superadmin") return NextResponse.json({ error: "Solo superadmin" }, { status: 403 });

  const list = db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    image: users.image,
    lastLogin: users.lastLogin,
    createdAt: users.createdAt,
    policyAcknowledged: users.policyAcknowledged,
  }).from(users).all();

  return NextResponse.json(list);
}
