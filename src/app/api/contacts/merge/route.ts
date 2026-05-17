import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, activities, deals } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing", "sales"].includes(role ?? "")) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  let body: { winnerId: string; loserId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { winnerId, loserId } = body;
  if (!winnerId || !loserId || winnerId === loserId) {
    return NextResponse.json({ error: "Se requieren winnerId y loserId distintos" }, { status: 400 });
  }

  const winner = db.select().from(contacts).where(eq(contacts.id, winnerId)).get();
  const loser = db.select().from(contacts).where(eq(contacts.id, loserId)).get();

  if (!winner || !loser) {
    return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }

  // Merge: move activities and deals from loser → winner, then delete loser
  db.update(activities)
    .set({ contactId: winnerId })
    .where(eq(activities.contactId, loserId))
    .run();

  db.update(deals)
    .set({ contactId: winnerId })
    .where(eq(deals.contactId, loserId))
    .run();

  // Merge fields: fill nulls on winner from loser
  const mergeUpdate: Record<string, unknown> = { updatedAt: new Date() };
  if (!winner.email && loser.email) mergeUpdate.email = loser.email;
  if (!winner.phone && loser.phone) mergeUpdate.phone = loser.phone;
  if (!winner.company && loser.company) mergeUpdate.company = loser.company;
  if (!winner.notes && loser.notes) mergeUpdate.notes = loser.notes;
  // Keep higher score
  if (loser.score > winner.score) mergeUpdate.score = loser.score;

  if (Object.keys(mergeUpdate).length > 1) {
    db.update(contacts).set(mergeUpdate).where(eq(contacts.id, winnerId)).run();
  }

  db.delete(contacts).where(eq(contacts.id, loserId)).run();

  const merged = db.select().from(contacts).where(eq(contacts.id, winnerId)).get();
  return NextResponse.json({ success: true, contact: merged });
}
