import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { notifyUsers } from "@/lib/notify";

export const dynamic = "force-dynamic";

// POST /api/marketing/funnel/create-task
// One-click: turn a marketing-funnel gap (e.g. "no Consideration campaign") into
// a to-do for the sales/superadmin team. Body: { title, body, stage?, platform? }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Nueva tarea de campaña";
    const detail = typeof body.body === "string" && body.body.trim()
      ? body.body.trim()
      : "Crear campaña para cerrar un hueco del funnel de marketing.";

    // Target sales + superadmin; if none found, notifyUsers falls back to everyone.
    const recipients = db.select({ id: users.id, role: users.role }).from(users).all()
      .filter(u => u.role === "sales" || u.role === "superadmin")
      .map(u => u.id);

    await notifyUsers({
      userIds: recipients.length ? recipients : undefined,
      type: "automation",
      priority: "high",
      title,
      body: detail,
      link: "/marketing",
      resourceType: "marketing_gap",
      resourceId: typeof body.stage === "string" ? body.stage : (typeof body.platform === "string" ? body.platform : null),
    });

    return NextResponse.json({ ok: true, notified: recipients.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
