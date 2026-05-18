import { db } from "@/db";
import { pipelineStages, deals, contacts, activities } from "@/db/schema";
import { eq, asc, isNotNull, sql } from "drizzle-orm";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import type { PipelineColumn } from "@/types";

export const dynamic = "force-dynamic";

export default function PipelinePage() {
  const stages = db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.order))
    .all();

  const allDeals = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      stageId: deals.stageId,
      contactId: deals.contactId,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      notes: deals.notes,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactName: contacts.name,
      contactTemperature: contacts.temperature,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .all();

  const columns: PipelineColumn[] = stages.map((stage) => ({
    ...stage,
    deals: allDeals
      .filter((d) => d.stageId === stage.id)
      .map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        stageId: d.stageId,
        contactId: d.contactId,
        expectedClose: d.expectedClose,
        probability: d.probability,
        notes: d.notes,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        contactName: d.contactName,
        contactTemperature: d.contactTemperature,
        lastActivityAt: lastActMap.has(d.id) ? new Date(lastActMap.get(d.id)!) : null,
      })) as PipelineColumn["deals"],
  }));

  const contactOptions = db
    .select({ id: contacts.id, name: contacts.name, company: contacts.company })
    .from(contacts)
    .orderBy(asc(contacts.name))
    .all();

  // Last activity per deal
  const lastActRows = db.select({
    dealId: activities.dealId,
    lastAt: sql<number>`MAX(${activities.createdAt})`,
  }).from(activities)
    .where(isNotNull(activities.dealId))
    .groupBy(activities.dealId)
    .all() as Array<{ dealId: string | null; lastAt: number }>;
  const lastActMap = new Map(lastActRows.map(r => [r.dealId!, r.lastAt]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground">
          Arrastra y suelta deals entre etapas
        </p>
      </div>

      <KanbanBoard initialColumns={columns} contactOptions={contactOptions} />
    </div>
  );
}
