import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = String(body.name).slice(0, 100);
  if (body.image !== undefined) update.image = body.image; // base64 string
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  db.update(users).set(update).where(eq(users.id, session.user.id)).run();
  const updated = db.select().from(users).where(eq(users.id, session.user.id)).get();
  return NextResponse.json({ ok: true, name: updated?.name, image: updated?.image });
}
