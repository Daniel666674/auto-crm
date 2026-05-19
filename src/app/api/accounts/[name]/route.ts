import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, deals, pipelineStages, activities } from "@/db/schema";
import { and, desc, inArray, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export function loadAccountDetail(rawName: string) {
  const name = rawName.trim();
  if (!name) return null;

  // Case-insensitive match on company
  const accountContacts = db
    .select()
    .from(contacts)
    .where(
      and(
        sql`LOWER(${contacts.company}) = LOWER(${name})`,
        isNull(contacts.returnedToMarketingAt),
      )
    )
    .all();

  if (accountContacts.length === 0) return null;

  const contactIds = accountContacts.map(c => c.id);
  const contactMap = new Map(accountContacts.map(c => [c.id, c]));

  const allStages = db.select().from(pipelineStages).all();
  const stageMap = new Map(allStages.map(s => [s.id, s]));

  const accountDeals = db
    .select()
    .from(deals)
    .where(inArray(deals.contactId, contactIds))
    .all();

  const accountActivities = db
    .select()
    .from(activities)
    .where(inArray(activities.contactId, contactIds))
    .orderBy(desc(activities.createdAt))
    .limit(25)
    .all();

  // Industry: most common
  const industryCounts = new Map<string, number>();
  for (const c of accountContacts) {
    const ind = (c.industry ?? "").trim();
    if (!ind) continue;
    industryCounts.set(ind, (industryCounts.get(ind) ?? 0) + 1);
  }
  let industry: string | null = null;
  let topCount = 0;
  for (const [n, count] of industryCounts) {
    if (count > topCount) { industry = n; topCount = count; }
  }

  let pipelineValue = 0;
  let wonValue = 0;
  let openDealsCount = 0;

  const dealRows = accountDeals.map(d => {
    const stage = stageMap.get(d.stageId);
    const isWon = !!stage?.isWon;
    const isLost = !!stage?.isLost;
    if (isWon) wonValue += d.value ?? 0;
    else if (!isLost) { pipelineValue += d.value ?? 0; openDealsCount += 1; }
    const contact = contactMap.get(d.contactId);
    return {
      id: d.id,
      title: d.title,
      value: d.value,
      stageId: d.stageId,
      stageName: stage?.name ?? "—",
      stageColor: stage?.color ?? "#64748b",
      isWon,
      isLost,
      expectedClose: d.expectedClose instanceof Date ? d.expectedClose.getTime() : (d.expectedClose ?? null),
      probability: d.probability,
      contactId: d.contactId,
      contactName: contact?.name ?? "—",
    };
  });

  let lastActivityAt: number | null = null;
  const activityRows = accountActivities.map(a => {
    const ts = a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt);
    if (lastActivityAt === null || (Number.isFinite(ts) && ts > lastActivityAt)) {
      lastActivityAt = Number.isFinite(ts) ? ts : lastActivityAt;
    }
    const contact = contactMap.get(a.contactId);
    return {
      id: a.id,
      type: a.type,
      description: a.description,
      contactId: a.contactId,
      contactName: contact?.name ?? "—",
      dealId: a.dealId ?? null,
      createdAt: ts,
      completedAt: a.completedAt instanceof Date ? a.completedAt.getTime() : (a.completedAt ?? null),
      scheduledAt: a.scheduledAt instanceof Date ? a.scheduledAt.getTime() : (a.scheduledAt ?? null),
    };
  });

  // Sort contacts: highest score first
  const contactRows = [...accountContacts]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map(c => ({
      id: c.id,
      name: c.name,
      title: c.title,
      email: c.email,
      phone: c.phone,
      score: c.score ?? 0,
      lifecycleStage: c.lifecycleStage,
      temperature: c.temperature,
    }));

  const summary = {
    company: accountContacts[0].company ?? name,
    contactCount: accountContacts.length,
    primaryContactId: contactRows[0]?.id ?? "",
    primaryContactName: contactRows[0]?.name ?? "",
    industry,
    totalScore: accountContacts.reduce((s, c) => s + (c.score ?? 0), 0),
    pipelineValue,
    wonValue,
    lastActivityAt,
    openDealsCount,
  };

  return {
    summary,
    contacts: contactRows,
    deals: dealRows,
    activities: activityRows,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name: rawName } = await params;
  const decoded = decodeURIComponent(rawName);
  const detail = loadAccountDetail(decoded);
  if (!detail) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
