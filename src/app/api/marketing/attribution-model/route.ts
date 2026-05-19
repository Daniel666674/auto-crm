import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

type AttrModel = "first" | "last" | "linear" | "u-shaped" | "w-shaped";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const model = (request.nextUrl.searchParams.get("model") ?? "first") as AttrModel;

  const allStages = db.select().from(pipelineStages).all();
  const wonStageIds = new Set(allStages.filter(s => s.isWon).map(s => s.id));
  const lostStageIds = new Set(allStages.filter(s => s.isLost).map(s => s.id));

  const allContacts = db.select({
    id: contacts.id,
    firstTouchCampaignId: contacts.firstTouchCampaignId,
    lastTouchCampaignId: contacts.lastTouchCampaignId,
    assistingCampaignIds: contacts.assistingCampaignIds,
  }).from(contacts).where(isNull(contacts.returnedToMarketingAt)).all();

  const allDeals = db.select({
    id: deals.id,
    contactId: deals.contactId,
    stageId: deals.stageId,
    value: deals.value,
  }).from(deals).all();

  // Build contact → deals map
  const dealsByContact = new Map<string, typeof allDeals>();
  for (const d of allDeals) {
    const arr = dealsByContact.get(d.contactId) ?? [];
    arr.push(d);
    dealsByContact.set(d.contactId, arr);
  }

  // Revenue credit per campaign
  const campaignCredit = new Map<string, { wonRevenue: number; openRevenue: number; dealsAttributed: number }>();

  const ensureCampaign = (id: string) => {
    if (!campaignCredit.has(id)) campaignCredit.set(id, { wonRevenue: 0, openRevenue: 0, dealsAttributed: 0 });
    return campaignCredit.get(id)!;
  };

  for (const contact of allContacts) {
    const first = contact.firstTouchCampaignId;
    const last = contact.lastTouchCampaignId;
    let assisting: string[] = [];
    try {
      assisting = contact.assistingCampaignIds ? JSON.parse(contact.assistingCampaignIds) : [];
    } catch { assisting = []; }

    const contactDeals = dealsByContact.get(contact.id) ?? [];
    if (contactDeals.length === 0) continue;

    for (const deal of contactDeals) {
      const isWon = wonStageIds.has(deal.stageId);
      const isLost = lostStageIds.has(deal.stageId);
      const isOpen = !isWon && !isLost;
      const value = deal.value ?? 0;

      // Determine which campaigns touched this contact and their weights
      const allTouches = [...new Set([first, ...assisting, last].filter(Boolean))] as string[];
      if (allTouches.length === 0) continue;

      const weights = computeWeights(model, first ?? null, last ?? null, assisting);

      for (const [cid, weight] of Object.entries(weights)) {
        const entry = ensureCampaign(cid);
        if (isWon) entry.wonRevenue += Math.round(value * weight);
        if (isOpen) entry.openRevenue += Math.round(value * weight);
        entry.dealsAttributed += weight > 0 ? 1 : 0;
      }
    }
  }

  const totalWon = Array.from(campaignCredit.values()).reduce((s, v) => s + v.wonRevenue, 0);

  const result = Array.from(campaignCredit.entries())
    .map(([campaignId, v]) => ({
      campaignId,
      credit: totalWon > 0 ? Number(((v.wonRevenue / totalWon) * 100).toFixed(1)) : 0,
      wonRevenue: v.wonRevenue,
      openRevenue: v.openRevenue,
      dealsAttributed: v.dealsAttributed,
    }))
    .sort((a, b) => b.wonRevenue - a.wonRevenue);

  return NextResponse.json(result);
}

function computeWeights(
  model: AttrModel,
  first: string | null,
  last: string | null,
  assisting: string[]
): Record<string, number> {
  const touches = [...new Set([first, ...assisting, last].filter(Boolean))] as string[];
  if (touches.length === 0) return {};

  switch (model) {
    case "first":
      return first ? { [first]: 1 } : {};
    case "last":
      return last ? { [last]: 1 } : touches[0] ? { [touches[0]]: 1 } : {};
    case "linear": {
      const w = 1 / touches.length;
      return Object.fromEntries(touches.map(t => [t, w]));
    }
    case "u-shaped": {
      if (touches.length === 1) return { [touches[0]]: 1 };
      if (touches.length === 2) return { [touches[0]]: 0.5, [touches[1]]: 0.5 };
      const f = first!, l = last!;
      const middle = touches.filter(t => t !== f && t !== l);
      const middleW = middle.length > 0 ? 0.2 / middle.length : 0;
      const result: Record<string, number> = { [f]: 0.4, [l]: 0.4 };
      for (const m of middle) result[m] = (result[m] ?? 0) + middleW;
      return result;
    }
    case "w-shaped": {
      if (touches.length === 1) return { [touches[0]]: 1 };
      if (touches.length === 2) return { [touches[0]]: 0.5, [touches[1]]: 0.5 };
      const f = first!, l = last!;
      const mid = touches[Math.floor(touches.length / 2)];
      const rest = touches.filter(t => t !== f && t !== l && t !== mid);
      const restW = rest.length > 0 ? 0.1 / rest.length : 0;
      const result: Record<string, number> = {};
      result[f] = (result[f] ?? 0) + 0.3;
      result[mid] = (result[mid] ?? 0) + 0.3;
      result[l] = (result[l] ?? 0) + 0.3;
      for (const r of rest) result[r] = (result[r] ?? 0) + restW;
      return result;
    }
  }
}
