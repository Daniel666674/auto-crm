import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { sequences } from "@/db/schema";
import { asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = db.select().from(sequences).orderBy(desc(sequences.createdAt)).all();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const now = new Date();
  const row = db.insert(sequences).values({
    name: body.name.trim(),
    description: body.description?.trim() || "",
    stepsJson: JSON.stringify(Array.isArray(body.steps) ? body.steps : []),
    active: body.active !== false,
    createdAt: now,
    updatedAt: now,
  }).returning().get();

  return NextResponse.json(row, { status: 201 });
}
