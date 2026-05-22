import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const list = db.select({ id: users.id, name: users.name, email: users.email }).from(users).all();
  const members = list.map(u => ({
    email: u.email,
    label: u.name || u.email.split("@")[0],
    initials: (u.name || u.email).slice(0, 1).toUpperCase(),
  }));
  return NextResponse.json(members);
}
