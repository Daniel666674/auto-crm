import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

type ContactRow = typeof contacts.$inferSelect;

function richness(c: ContactRow): number {
  return [c.email, c.phone, c.industry, c.title, c.location, c.linkedinUrl, c.whatsappNumber, c.apolloId]
    .filter(Boolean).length;
}

// DELETE /api/contacts/dedup
// Groups contacts by name+company, keeps the richest record, removes the rest.
// Skips any record that has linked deals or activities (no FK violation).
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = db.select().from(contacts).orderBy(asc(contacts.createdAt)).all();

  const groups = new Map<string, ContactRow[]>();
  for (const c of all) {
    const key = `${(c.name || "").toLowerCase().trim()}|${(c.company || "").toLowerCase().trim()}`;
    const arr = groups.get(key) ?? [];
    arr.push(c);
    groups.set(key, arr);
  }

  let removed = 0;
  const skipped: string[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => richness(b) - richness(a));
    for (const c of group.slice(1)) {
      try {
        db.delete(contacts).where(eq(contacts.id, c.id)).run();
        removed++;
      } catch {
        skipped.push(c.id);
      }
    }
  }

  return NextResponse.json({ removed, skipped: skipped.length, checked: all.length });
}
