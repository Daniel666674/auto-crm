import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mktDb } from "@/db/mkt-db";

export const dynamic = "force-dynamic";

type MktContactFull = {
  id: string; name: string; email: string; phone: string; company: string;
  industry: string; linkedin_url: string; job_title: string;
  company_size: string; location: string; marketing_notes: string;
  score: number; tier: number;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { winnerId: string; loserId: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON invalido" }, { status: 400 }); }

  const { winnerId, loserId } = body;
  if (!winnerId || !loserId || winnerId === loserId) {
    return NextResponse.json({ error: "Se requieren winnerId y loserId distintos" }, { status: 400 });
  }

  const winner = mktDb.prepare("SELECT * FROM mkt_contacts WHERE id = ?").get(winnerId) as MktContactFull | undefined;
  const loser = mktDb.prepare("SELECT * FROM mkt_contacts WHERE id = ?").get(loserId) as MktContactFull | undefined;
  if (!winner || !loser) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });

  // Fill nulls/empties on winner from loser; keep higher score
  const fillFields = ["email", "phone", "company", "industry", "linkedin_url", "job_title", "company_size", "location", "marketing_notes"] as const;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of fillFields) {
    if (!winner[f] && loser[f]) {
      sets.push(`${f} = ?`);
      vals.push(loser[f]);
    }
  }
  if (loser.score > winner.score) {
    sets.push("score = ?");
    vals.push(loser.score);
  }

  if (sets.length > 0) {
    vals.push(winnerId);
    mktDb.prepare(`UPDATE mkt_contacts SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }

  mktDb.prepare("DELETE FROM mkt_contacts WHERE id = ?").run(loserId);
  const merged = mktDb.prepare("SELECT * FROM mkt_contacts WHERE id = ?").get(winnerId);
  return NextResponse.json({ success: true, contact: merged });
}
