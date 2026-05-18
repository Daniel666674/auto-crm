import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, deals, activities, pipelineStages } from "@/db/schema";
import { gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = Date.now();
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now - 7 * 86400000);
  const thirtyDaysAgo = new Date(now - 30 * 86400000);

  // Contacts this month
  const contactsThisMonth = db.select({ count: sql<number>`COUNT(*)` })
    .from(contacts)
    .where(gte(contacts.createdAt, monthStart))
    .get()?.count ?? 0;

  // Total contacts
  const totalContacts = db.select({ count: sql<number>`COUNT(*)` })
    .from(contacts)
    .get()?.count ?? 0;

  // Activities this week
  const activitiesThisWeek = db.select({ count: sql<number>`COUNT(*)` })
    .from(activities)
    .where(gte(activities.createdAt, weekStart))
    .get()?.count ?? 0;

  // Activities by type (last 30d)
  const actsByType = db.select({
    type: activities.type,
    count: sql<number>`COUNT(*)`,
  })
    .from(activities)
    .where(gte(activities.createdAt, thirtyDaysAgo))
    .groupBy(activities.type)
    .all();

  // Deals closed this month (won stages)
  const stages = db.select().from(pipelineStages).all();
  const wonStageIds = new Set(stages.filter(s => s.isWon).map(s => s.id));
  const lostStageIds = new Set(stages.filter(s => s.isLost).map(s => s.id));

  const allDeals = db.select({
    stageId: deals.stageId,
    value: deals.value,
    updatedAt: deals.updatedAt,
  }).from(deals).all();

  const wonThisMonth = allDeals.filter(d => {
    if (!wonStageIds.has(d.stageId)) return false;
    const ts = d.updatedAt instanceof Date ? d.updatedAt.getTime() : Number(d.updatedAt) * 1000;
    return ts >= monthStart.getTime();
  });

  const activeDeals = allDeals.filter(d => !wonStageIds.has(d.stageId) && !lostStageIds.has(d.stageId));
  const pipelineValue = activeDeals.reduce((s, d) => s + d.value, 0);
  const wonThisMonthValue = wonThisMonth.reduce((s, d) => s + d.value, 0);

  // Pipeline stage breakdown
  const stageBreakdown = stages
    .filter(s => !s.isWon && !s.isLost)
    .map(s => {
      const stageDeals = allDeals.filter(d => d.stageId === s.id);
      return {
        stageName: s.name,
        stageColor: s.color,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      };
    })
    .sort((a, b) => {
      const sa = stages.find(s => s.name === a.stageName);
      const sb = stages.find(s => s.name === b.stageName);
      return (sa?.order ?? 0) - (sb?.order ?? 0);
    });

  return NextResponse.json({
    contactsThisMonth,
    totalContacts,
    activitiesThisWeek,
    actsByType,
    wonThisMonth: wonThisMonth.length,
    wonThisMonthValue,
    activeDeals: activeDeals.length,
    pipelineValue,
    stageBreakdown,
  });
}
