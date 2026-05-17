import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

interface MktContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  tier: number;
  score: number;
  brevo_id: string;
}

function normalize(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const all = mktDb.prepare(
    "SELECT id, name, email, phone, company, tier, score, brevo_id FROM mkt_contacts"
  ).all() as MktContact[];

  const groups: { reason: "email" | "name_company"; contacts: MktContact[] }[] = [];
  const seenIds = new Set<string>();

  // By email
  const byEmail = new Map<string, MktContact[]>();
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

  // By name + company
  const byNameCo = new Map<string, MktContact[]>();
  for (const c of all) {
    if (seenIds.has(c.id)) continue;
    if (!c.name || !c.company) continue;
    const key = `${normalize(c.name)}||${normalize(c.company)}`;
    if (!byNameCo.has(key)) byNameCo.set(key, []);
    byNameCo.get(key)!.push(c);
  }
  for (const [, group] of byNameCo) {
    if (group.length < 2) continue;
    groups.push({ reason: "name_company", contacts: group });
  }

  return NextResponse.json({ groups, total: groups.length });
}
