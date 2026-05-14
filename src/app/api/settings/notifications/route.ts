import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getOrCreate(userId: string) {
  const existing = db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).get();
  if (existing) return existing;
  const id = crypto.randomUUID();
  db.insert(notificationPreferences).values({ id, userId, updatedAt: new Date() }).run();
  return db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).get()!;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const prefs = await getOrCreate(session.user.id);
  return NextResponse.json(prefs);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json();
  const allowed = [
    "browserEnabled","emailEnabled","emailDigestFrequency","digestHour","digestEmail",
    "alertLeadHot","alertHotThreshold","alertFollowupOverdue","alertHandoffPending",
    "alertDealMoved","alertCampaignPerf","campaignPerfThreshold",
  ];
  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  await getOrCreate(session.user.id);
  db.update(notificationPreferences).set(update).where(eq(notificationPreferences.userId, session.user.id)).run();
  const prefs = db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, session.user.id)).get();
  return NextResponse.json(prefs);
}
