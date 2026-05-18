import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { activities, deals, pipelineStages, clients, proposals, contacts } from "@/db/schema";
import { isNull, lt, gt, eq, and, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export type HubItem = {
  id: string;
  type: "overdue_followup" | "stalled_deal" | "renewal_soon" | "proposal_waiting" | "hot_lead";
  title: string;
  body: string;
  priority: "high" | "medium" | "low";
  link: string;
  createdAt: string;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items: HubItem[] = [];
  const now = Date.now();

  try {
    // 1. Overdue follow-ups
    const overdueActs = db.select({
      id: activities.id,
      description: activities.description,
      scheduledAt: activities.scheduledAt,
      contactId: activities.contactId,
      contactName: contacts.name,
    }).from(activities)
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .where(and(isNull(activities.completedAt), lt(activities.scheduledAt, new Date())))
      .all();

    for (const a of overdueActs.slice(0, 8)) {
      const daysOver = a.scheduledAt
        ? Math.floor((now - new Date(a.scheduledAt).getTime()) / 86400000) : 0;
      items.push({
        id: `followup-${a.id}`,
        type: "overdue_followup",
        title: "Follow-up vencido",
        body: `${a.contactName || "Contacto"}: ${a.description}${daysOver > 0 ? ` · ${daysOver}d` : ""}`,
        priority: daysOver >= 3 ? "high" : "medium",
        link: `/contacts/${a.contactId}`,
        createdAt: a.scheduledAt ? new Date(a.scheduledAt).toISOString() : new Date().toISOString(),
      });
    }
  } catch { /* table may not exist */ }

  try {
    // 2. Stalled deals (>14d without update, not won/lost)
    const threshold = new Date(now - 14 * 86400000);
    const stages = db.select().from(pipelineStages).all();
    const closedIds = new Set(stages.filter(s => s.isWon || s.isLost).map(s => s.id));

    const allDeals = db.select({
      id: deals.id,
      title: deals.title,
      updatedAt: deals.updatedAt,
      stageId: deals.stageId,
    }).from(deals).where(lt(deals.updatedAt, threshold)).all();

    for (const d of allDeals.filter(d => !closedIds.has(d.stageId)).slice(0, 5)) {
      const stageName = stages.find(s => s.id === d.stageId)?.name || "Etapa";
      const days = d.updatedAt
        ? Math.floor((now - new Date(d.updatedAt).getTime()) / 86400000) : 0;
      items.push({
        id: `stalled-${d.id}`,
        type: "stalled_deal",
        title: "Deal estancado",
        body: `${d.title} · ${stageName} · sin cambios ${days}d`,
        priority: days >= 21 ? "high" : "medium",
        link: `/pipeline`,
        createdAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : new Date().toISOString(),
      });
    }
  } catch { /* skip */ }

  try {
    // 3. Renewals due in <30 days
    const in30 = new Date(now + 30 * 86400000);
    const dueClients = db.select().from(clients)
      .where(lt(clients.endDate, in30))
      .all();

    for (const c of dueClients.filter(c => new Date(c.endDate).getTime() >= now - 86400000).slice(0, 5)) {
      const days = Math.ceil((new Date(c.endDate).getTime() - now) / 86400000);
      items.push({
        id: `renewal-${c.id}`,
        type: "renewal_soon",
        title: "Renovación próxima",
        body: `${c.company} · ${days >= 0 ? `vence en ${days}d` : `venció hace ${Math.abs(days)}d`}`,
        priority: days < 7 ? "high" : "medium",
        link: `/renewals`,
        createdAt: new Date().toISOString(),
      });
    }
  } catch { /* skip */ }

  try {
    // 4. Proposals waiting >7d (Enviada or Vista)
    const threshold7 = new Date(now - 7 * 86400000);
    const waitingProps = db.select().from(proposals)
      .where(and(isNotNull(proposals.sentDate), lt(proposals.sentDate, threshold7)))
      .all()
      .filter(p => p.status === "Enviada" || p.status === "Vista");

    for (const p of waitingProps.slice(0, 5)) {
      const days = p.sentDate
        ? Math.floor((now - new Date(p.sentDate).getTime()) / 86400000) : 0;
      items.push({
        id: `proposal-${p.id}`,
        type: "proposal_waiting",
        title: "Propuesta sin respuesta",
        body: `${p.dealTitle}${p.contactName ? ` · ${p.contactName}` : ""} · ${days}d en estado "${p.status}"`,
        priority: days >= 14 ? "high" : "medium",
        link: `/proposals`,
        createdAt: p.sentDate ? new Date(p.sentDate).toISOString() : new Date().toISOString(),
      });
    }
  } catch { /* skip */ }

  try {
    // 5. Hot leads created in last 48h
    const since48h = new Date(now - 48 * 3600000);
    const hotLeads = db.select({
      id: contacts.id,
      name: contacts.name,
      company: contacts.company,
      score: contacts.score,
      createdAt: contacts.createdAt,
    }).from(contacts)
      .where(and(
        gt(contacts.createdAt, since48h),
        isNotNull(contacts.score)
      ))
      .all()
      .filter(c => (c.score ?? 0) >= 70)
      .slice(0, 3);

    for (const c of hotLeads) {
      items.push({
        id: `hotlead-${c.id}`,
        type: "hot_lead",
        title: "Lead caliente nuevo",
        body: `${c.name}${c.company ? ` · ${c.company}` : ""} · Score ${c.score}`,
        priority: "low",
        link: `/contacts/${c.id}`,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      });
    }
  } catch { /* skip */ }

  // Sort: high → medium → low, then by date desc
  const priority = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => {
    const pd = priority[a.priority] - priority[b.priority];
    if (pd !== 0) return pd;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({ items, count: items.length });
}
