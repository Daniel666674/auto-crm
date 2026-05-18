import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = db.select().from(clients).orderBy(asc(clients.createdAt)).all();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const now = new Date();
  const endDate = new Date(now.getTime() + 365 * 86400000);
  const record = db.insert(clients).values({
    id: crypto.randomUUID(),
    dealId: body.dealId || null,
    contactId: body.contactId || null,
    company: body.company || "—",
    name: body.name || "—",
    contractValue: body.contractValue ?? 0,
    startDate: body.startDate ? new Date(body.startDate) : now,
    endDate: body.endDate ? new Date(body.endDate) : endDate,
    healthScore: body.healthScore ?? 8,
    renewalStage: body.renewalStage || "Saludable",
    notes: body.notes || null,
    createdAt: now,
    updatedAt: now,
  }).returning().get();
  return NextResponse.json(record, { status: 201 });
}
