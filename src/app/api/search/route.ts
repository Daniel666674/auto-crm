import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { like, or, eq, isNull, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ contacts: [], deals: [] });

  const pat = `%${q}%`;
  const cs = db.select({ id: contacts.id, name: contacts.name, email: contacts.email, company: contacts.company, temperature: contacts.temperature })
    .from(contacts)
    .where(and(isNull(contacts.returnedToMarketingAt), or(like(contacts.name, pat), like(contacts.email, pat), like(contacts.company, pat))!))
    .limit(6).all();

  const ds = db.select({ id: deals.id, title: deals.title, value: deals.value, stageName: pipelineStages.name })
    .from(deals)
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .where(like(deals.title, pat))
    .limit(5).all();

  return NextResponse.json({ contacts: cs, deals: ds });
}
