import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { sequences, sequenceEnrollments, contacts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const enrollments = db.select({
    id: sequenceEnrollments.id,
    contactId: sequenceEnrollments.contactId,
    currentStep: sequenceEnrollments.currentStep,
    status: sequenceEnrollments.status,
    startedAt: sequenceEnrollments.startedAt,
    completedAt: sequenceEnrollments.completedAt,
    contactName: contacts.name,
    contactCompany: contacts.company,
  })
    .from(sequenceEnrollments)
    .leftJoin(contacts, eq(sequenceEnrollments.contactId, contacts.id))
    .where(eq(sequenceEnrollments.sequenceId, params.id))
    .all();

  return NextResponse.json(enrollments);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const seq = db.select().from(sequences).where(eq(sequences.id, params.id)).get();
  if (!seq) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

  const existing = db.select().from(sequenceEnrollments)
    .where(and(
      eq(sequenceEnrollments.sequenceId, params.id),
      eq(sequenceEnrollments.contactId, body.contactId),
    )).get();

  if (existing) {
    if (existing.status === "active") return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
    const updated = db.update(sequenceEnrollments)
      .set({ status: "active", currentStep: 0, startedAt: new Date(), completedAt: null })
      .where(eq(sequenceEnrollments.id, existing.id))
      .returning().get();
    return NextResponse.json(updated);
  }

  const row = db.insert(sequenceEnrollments).values({
    sequenceId: params.id,
    contactId: body.contactId,
    currentStep: 0,
    status: "active",
    startedAt: new Date(),
  }).returning().get();

  return NextResponse.json(row, { status: 201 });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.enrollmentId) return NextResponse.json({ error: "enrollmentId required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (body.currentStep !== undefined) update.currentStep = body.currentStep;
  if (body.status !== undefined) {
    update.status = body.status;
    if (body.status === "completed") update.completedAt = new Date();
  }

  const row = db.update(sequenceEnrollments).set(update)
    .where(and(
      eq(sequenceEnrollments.id, body.enrollmentId),
      eq(sequenceEnrollments.sequenceId, params.id),
    )).returning().get();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const enrollmentId = searchParams.get("enrollmentId");
  if (!enrollmentId) return NextResponse.json({ error: "enrollmentId required" }, { status: 400 });

  db.delete(sequenceEnrollments)
    .where(and(
      eq(sequenceEnrollments.id, enrollmentId),
      eq(sequenceEnrollments.sequenceId, params.id),
    )).run();

  return NextResponse.json({ ok: true });
}
