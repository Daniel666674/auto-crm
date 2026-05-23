import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { workflowTriggers } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = db.select().from(workflowTriggers).orderBy(desc(workflowTriggers.createdAt)).all();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!["superadmin", "marketing"].includes(role ?? "")) {
    return NextResponse.json({ error: "Solo superadmin/marketing" }, { status: 403 });
  }

  let body: { name: string; eventType: string; conditions?: Record<string, unknown>; actions?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { name, eventType, conditions = {}, actions = [] } = body;

  const VALID_EVENTS = [
    "deal_stage_changed",
    "deal_won",
    "deal_lost",
    "deal_created",
    "contact_score_reached",
    "contact_tier_reached",
    "lead_created",
    "contact_replied",
    "meeting_booked",
    "lifecycle_changed",
    "became_mql",
    "became_sql",
    "followup_overdue",
    "campaign_created",
    "campaign_completed",
    "mkt_handoff",
    "mkt_engagement_changed",
  ];

  if (!name?.trim()) {
    return NextResponse.json({ error: "name es requerido" }, { status: 400 });
  }
  if (!VALID_EVENTS.includes(eventType)) {
    return NextResponse.json({ error: `eventType invalido. Opciones: ${VALID_EVENTS.join(", ")}` }, { status: 400 });
  }

  const now = new Date();
  const result = db
    .insert(workflowTriggers)
    .values({
      name: name.trim(),
      eventType,
      conditions: JSON.stringify(conditions),
      actions: JSON.stringify(actions),
      active: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();

  return NextResponse.json(result, { status: 201 });
}
