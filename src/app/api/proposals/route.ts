import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { proposals } from "@/db/schema";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const all = db.select().from(proposals).orderBy(asc(proposals.createdAt)).all();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.dealTitle) return NextResponse.json({ error: "dealTitle requerido" }, { status: 400 });
  const now = new Date();
  const record = db.insert(proposals).values({
    id: crypto.randomUUID(),
    dealId: body.dealId || null,
    contactName: body.contactName || body.contact || "",
    dealTitle: body.dealTitle,
    value: body.value ?? 0,
    status: body.status || "Borrador",
    sentDate: body.sentDate ? new Date(body.sentDate) : null,
    notes: body.notes || null,
    createdAt: now,
    updatedAt: now,
  }).returning().get();
  return NextResponse.json(record, { status: 201 });
}
