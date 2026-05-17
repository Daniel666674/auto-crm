import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts } from "@/db/schema";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  temperature: string;
  score: number;
  createdAt: Date | null;
}

interface DuplicateGroup {
  reason: "email" | "name_company";
  contacts: Contact[];
}

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const all = db.select().from(contacts).all() as Contact[];

  const groups: DuplicateGroup[] = [];
  const seenIds = new Set<string>();

  // Group by email (exact match, ignoring null)
  const byEmail = new Map<string, Contact[]>();
  for (const c of all) {
    if (!c.email) continue;
    const key = normalize(c.email);
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(c);
  }
  for (const [, group] of byEmail) {
    if (group.length < 2) continue;
    groups.push({ reason: "email", contacts: group });
    group.forEach((c) => seenIds.add(c.id));
  }

  // Group by name+company (both non-empty, normalized match)
  const byNameCompany = new Map<string, Contact[]>();
  for (const c of all) {
    if (seenIds.has(c.id)) continue;
    if (!c.name || !c.company) continue;
    const key = `${normalize(c.name)}||${normalize(c.company)}`;
    if (!byNameCompany.has(key)) byNameCompany.set(key, []);
    byNameCompany.get(key)!.push(c);
  }
  for (const [, group] of byNameCompany) {
    if (group.length < 2) continue;
    groups.push({ reason: "name_company", contacts: group });
  }

  return NextResponse.json({ groups, total: groups.length });
}
