import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { createCalendarEvent } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const rows = db.select().from(calendarEvents).orderBy(asc(calendarEvents.date)).all();
  const events = rows.map(r => ({
    id: r.id,
    title: r.title,
    date: r.date,
    time: r.time,
    duration: r.duration,
    type: r.type,
    participants: (() => { try { return JSON.parse(r.participants) as string[]; } catch { return []; } })(),
    notes: r.notes ?? "",
    googleEventId: r.googleEventId ?? null,
    meetLink: r.meetLink ?? null,
    htmlLink: r.htmlLink ?? null,
  }));
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  if (!body.title || !body.date) {
    return NextResponse.json({ error: "title y date son requeridos" }, { status: 400 });
  }

  const participants = Array.isArray(body.participants) ? (body.participants as string[]) : [];

  // Mirror to the Workspace calendar (best-effort) so it appears in Google too,
  // with a Google Meet link the participants can join.
  let googleEventId: string | null = null;
  let meetLink: string | null = null;
  let htmlLink: string | null = null;
  try {
    const g = await createCalendarEvent(session.user.id, {
      title: String(body.title),
      date: String(body.date),
      time: body.time || "10:00",
      durationMin: Number(body.duration) || 60,
      notes: body.notes || undefined,
      attendees: participants,
    });
    googleEventId = g.id ?? null;
    meetLink = g.meetLink ?? null;
    htmlLink = g.htmlLink ?? null;
  } catch {
    // Google not connected or failed — keep the local event only.
  }

  const created = db.insert(calendarEvents).values({
    title: String(body.title),
    date: String(body.date),
    time: body.time || "10:00",
    duration: Number(body.duration) || 60,
    type: body.type || "Reunión",
    participants: JSON.stringify(participants),
    notes: body.notes || null,
    googleEventId,
    meetLink,
    htmlLink,
    createdBy: session.user.id,
    createdAt: new Date(),
  }).returning().get();

  return NextResponse.json({
    id: created.id,
    title: created.title,
    date: created.date,
    time: created.time,
    duration: created.duration,
    type: created.type,
    participants: (() => { try { return JSON.parse(created.participants) as string[]; } catch { return []; } })(),
    notes: created.notes ?? "",
    googleEventId: created.googleEventId ?? null,
    meetLink: created.meetLink ?? null,
    htmlLink: created.htmlLink ?? null,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  db.delete(calendarEvents).where(eq(calendarEvents.id, id)).run();
  return NextResponse.json({ ok: true });
}
