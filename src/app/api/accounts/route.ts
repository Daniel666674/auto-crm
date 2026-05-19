import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, deals, pipelineStages, activities } from "@/db/schema";
import { isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

type AccountSummary = {
  company: string;
  contactCount: number;
  primaryContactId: string;
  primaryContactName: string;
  industry: string | null;
  totalScore: number;
  pipelineValue: number;
  wonValue: number;
  lastActivityAt: number | null;
  openDealsCount: number;
};

export function buildAccountSummaries(): AccountSummary[] {
  const activeContacts = db
    .select()
    .from(contacts)
    .where(isNull(contacts.returnedToMarketingAt))
    .all();

  const allStages = db.select().from(pipelineStages).all();
  const stageMap = new Map(allStages.map(s => [s.id, s]));

  const contactIds = activeContacts.map(c => c.id);
  if (contactIds.length === 0) return [];

  const contactIdSet = new Set(contactIds);
  const allDeals = db.select().from(deals).all().filter(d => contactIdSet.has(d.contactId));
  const allActivities = db
    .select()
    .from(activities)
    .all()
    .filter(a => contactIdSet.has(a.contactId));

  // Group contacts by normalized company (trim + lower)
  const groups = new Map<string, { displayName: string; contacts: typeof activeContacts }>();
  for (const c of activeContacts) {
    const raw = (c.company ?? "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    let g = groups.get(key);
    if (!g) {
      g = { displayName: raw, contacts: [] };
      groups.set(key, g);
    }
    g.contacts.push(c);
  }

  const dealsByContact = new Map<string, typeof allDeals>();
  for (const d of allDeals) {
    const arr = dealsByContact.get(d.contactId) ?? [];
    arr.push(d);
    dealsByContact.set(d.contactId, arr);
  }

  const activitiesByContact = new Map<string, typeof allActivities>();
  for (const a of allActivities) {
    const arr = activitiesByContact.get(a.contactId) ?? [];
    arr.push(a);
    activitiesByContact.set(a.contactId, arr);
  }

  const summaries: AccountSummary[] = [];

  for (const [, group] of groups) {
    const groupContacts = group.contacts;
    const sorted = [...groupContacts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const primary = sorted[0];

    // Most common industry
    const industryCounts = new Map<string, number>();
    for (const c of groupContacts) {
      const ind = (c.industry ?? "").trim();
      if (!ind) continue;
      industryCounts.set(ind, (industryCounts.get(ind) ?? 0) + 1);
    }
    let topIndustry: string | null = null;
    let topCount = 0;
    for (const [name, count] of industryCounts) {
      if (count > topCount) { topIndustry = name; topCount = count; }
    }

    let pipelineValue = 0;
    let wonValue = 0;
    let openDealsCount = 0;
    let lastActivityAt: number | null = null;

    for (const c of groupContacts) {
      const cDeals = dealsByContact.get(c.id) ?? [];
      for (const d of cDeals) {
        const stage = stageMap.get(d.stageId);
        const isWon = !!stage?.isWon;
        const isLost = !!stage?.isLost;
        if (isWon) {
          wonValue += d.value ?? 0;
        } else if (!isLost) {
          pipelineValue += d.value ?? 0;
          openDealsCount += 1;
        }
      }
      const cActs = activitiesByContact.get(c.id) ?? [];
      for (const a of cActs) {
        const ts = a.createdAt instanceof Date ? a.createdAt.getTime() : Number(a.createdAt);
        if (!Number.isFinite(ts)) continue;
        if (lastActivityAt === null || ts > lastActivityAt) lastActivityAt = ts;
      }
    }

    summaries.push({
      company: group.displayName,
      contactCount: groupContacts.length,
      primaryContactId: primary.id,
      primaryContactName: primary.name,
      industry: topIndustry,
      totalScore: groupContacts.reduce((s, c) => s + (c.score ?? 0), 0),
      pipelineValue,
      wonValue,
      lastActivityAt,
      openDealsCount,
    });
  }

  summaries.sort((a, b) => b.pipelineValue - a.pipelineValue);
  return summaries;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summaries = buildAccountSummaries();
  return NextResponse.json(summaries);
}
