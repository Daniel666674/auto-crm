import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { deliverables } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = req.nextUrl.searchParams.get("clientId");
  const query = db.select().from(deliverables).orderBy(asc(deliverables.createdAt));
  const all = clientId
    ? query.where(eq(deliverables.clientId, clientId)).all()
    : query.all();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.clientId || !body.title) {
    return NextResponse.json({ error: "clientId y title requeridos" }, { status: 400 });
  }
  const now = new Date();
  const record = db.insert(deliverables).values({
    id: crypto.randomUUID(),
    clientId: body.clientId,
    title: body.title,
    status: body.status || "Pendiente",
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    owner: body.owner || "",
    notes: body.notes || null,
    createdAt: now,
    updatedAt: now,
  }).returning().get();
  return NextResponse.json(record, { status: 201 });
}
