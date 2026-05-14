import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities, contacts, deals, pipelineStages } from "@/db/schema";
import { gte, lte, and, isNotNull, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const now = Date.now();
  const DAY = 86400000;

  const fromTs = fromParam ? new Date(fromParam).getTime() : now - 28 * DAY;
  const toTs = toParam ? new Date(toParam).getTime() : now;

  const fromDate = new Date(fromTs);
  const toDate = new Date(toTs);

  // Activities in range (completed or created)
  const allActivities = await db
    .select({ id: activities.id, type: activities.type, completedAt: activities.completedAt, createdAt: activities.createdAt })
    .from(activities);

  const inRange = allActivities.filter(a => {
    const ts = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime();
    return ts >= fromTs && ts <= toTs;
  });

  // Contacts created in range
  const allContacts = await db.select({ id: contacts.id, createdAt: contacts.createdAt }).from(contacts);
  const contactsCreated = allContacts.filter(c => {
    const ts = new Date(c.createdAt).getTime();
    return ts >= fromTs && ts <= toTs;
  }).length;

  // Deals created and closed in range
  const allDeals = await db
    .select({ id: deals.id, createdAt: deals.createdAt, closedAt: deals.closedAt, stageId: deals.stageId, value: deals.value })
    .from(deals);

  const wonStages = await db.select({ id: pipelineStages.id }).from(pipelineStages).where(eq(pipelineStages.isWon, true));
  const wonIds = new Set(wonStages.map(s => s.id));

  const dealsCreated = allDeals.filter(d => {
    const ts = new Date(d.createdAt).getTime();
    return ts >= fromTs && ts <= toTs;
  }).length;

  const dealsClosed = allDeals.filter(d => {
    if (!d.closedAt) return false;
    const ts = d.closedAt instanceof Date ? d.closedAt.getTime() : Number(d.closedAt);
    return ts >= fromTs && ts <= toTs;
  }).length;

  const revenueGenerated = allDeals
    .filter(d => {
      if (!d.closedAt) return false;
      const ts = d.closedAt instanceof Date ? d.closedAt.getTime() : Number(d.closedAt);
      return ts >= fromTs && ts <= toTs;
    })
    .reduce((s, d) => s + d.value, 0);

  // Activity counts by type
  const countType = (type: string) => inRange.filter(a => a.type === type).length;
  const calls = countType("call");
  const emails = countType("email");
  const meetings = countType("meeting");
  const followUps = countType("follow_up");
  const notes = countType("note");
  const totalActivities = inRange.length;

  // Pipeline velocity: avg days from created to closed for closed deals in range
  const closedInRange = allDeals.filter(d => {
    if (!d.closedAt) return false;
    const ts = d.closedAt instanceof Date ? d.closedAt.getTime() : Number(d.closedAt);
    return ts >= fromTs && ts <= toTs;
  });
  const avgVelocity = closedInRange.length
    ? Math.round(
        closedInRange.reduce((s, d) => {
          const closed = d.closedAt instanceof Date ? d.closedAt.getTime() : Number(d.closedAt);
          const created = new Date(d.createdAt).getTime();
          return s + (closed - created) / DAY;
        }, 0) / closedInRange.length
      )
    : null;

  // Activity-to-deal ratio
  const activityToDeal = dealsCreated > 0 ? Math.round(totalActivities / dealsCreated) : null;

  // Build weekly buckets for the range (for sparklines)
  const weeks: Array<{ label: string; calls: number; emails: number; meetings: number; followUps: number }> = [];
  const rangeDays = Math.ceil((toTs - fromTs) / DAY);
  const weekCount = Math.min(Math.ceil(rangeDays / 7), 12);

  for (let i = weekCount - 1; i >= 0; i--) {
    const weekEnd = toTs - i * 7 * DAY;
    const weekStart = weekEnd - 7 * DAY;
    const weekActivities = allActivities.filter(a => {
      const ts = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime();
      return ts >= weekStart && ts < weekEnd;
    });
    const wLabel = new Date(weekStart).toLocaleDateString("es-CO", { month: "short", day: "numeric" });
    weeks.push({
      label: wLabel,
      calls: weekActivities.filter(a => a.type === "call").length,
      emails: weekActivities.filter(a => a.type === "email").length,
      meetings: weekActivities.filter(a => a.type === "meeting").length,
      followUps: weekActivities.filter(a => a.type === "follow_up").length,
    });
  }

  return NextResponse.json({
    range: { from: fromDate.toISOString(), to: toDate.toISOString() },
    summary: {
      totalActivities, calls, emails, meetings, followUps, notes,
      contactsCreated, dealsCreated, dealsClosed,
      revenueGenerated, avgVelocityDays: avgVelocity, activityToDeal,
    },
    weeks,
  });
}
