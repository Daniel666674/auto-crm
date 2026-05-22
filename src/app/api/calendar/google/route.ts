import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEventsInRange, createCalendarEvent, CALENDAR_TZ } from "@/lib/google-calendar";
import type { calendar_v3 } from "googleapis";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: CALENDAR_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: CALENDAR_TZ, hour: "2-digit", minute: "2-digit", hour12: false });

interface NormalizedEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  allDay: boolean;
  htmlLink: string;
  attendees: string[];
}

function normalize(ev: calendar_v3.Schema$Event): NormalizedEvent | null {
  const startRaw = ev.start?.dateTime ?? ev.start?.date;
  if (!startRaw) return null;
  const allDay = !ev.start?.dateTime;

  if (allDay) {
    return {
      id: ev.id ?? "",
      title: ev.summary ?? "(Sin título)",
      date: (ev.start?.date ?? "").slice(0, 10),
      time: "",
      duration: 0,
      allDay: true,
      htmlLink: ev.htmlLink ?? "",
      attendees: (ev.attendees ?? []).map((a) => a.email ?? "").filter(Boolean),
    };
  }

  const start = new Date(startRaw);
  const endRaw = ev.end?.dateTime ?? ev.end?.date;
  const end = endRaw ? new Date(endRaw) : null;
  const duration = end ? Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000)) : 60;

  return {
    id: ev.id ?? "",
    title: ev.summary ?? "(Sin título)",
    date: dateFmt.format(start),
    time: timeFmt.format(start),
    duration,
    allDay: false,
    htmlLink: ev.htmlLink ?? "",
    attendees: (ev.attendees ?? []).map((a) => a.email ?? "").filter(Boolean),
  };
}

// GET /api/calendar/google?timeMin=ISO&timeMax=ISO — Workspace events in range
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const now = new Date();
  const timeMin = sp.get("timeMin") || new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const timeMax = sp.get("timeMax") || new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();

  try {
    const items = await getEventsInRange(session.user.id, timeMin, timeMax);
    const events = items.map(normalize).filter((e): e is NormalizedEvent => e !== null);
    return NextResponse.json({ connected: true, events });
  } catch {
    // Not connected / token expired — degrade gracefully so calendars still render.
    return NextResponse.json({ connected: false, events: [] });
  }
}

// POST /api/calendar/google — create an event on the user's Workspace calendar
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: { title?: string; date?: string; time?: string; duration?: number; notes?: string; attendees?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.title || !body.date) {
    return NextResponse.json({ error: "title y date son requeridos" }, { status: 400 });
  }

  try {
    const result = await createCalendarEvent(session.user.id, {
      title: body.title,
      date: body.date,
      time: body.time || "10:00",
      durationMin: Number(body.duration) || 60,
      notes: body.notes,
      attendees: Array.isArray(body.attendees) ? body.attendees : [],
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al crear evento";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
