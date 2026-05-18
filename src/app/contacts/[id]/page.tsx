import { db } from "@/db";
import { contacts, deals, activities, pipelineStages } from "@/db/schema";
import { eq, desc, and, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContactDetailClient } from "@/components/contacts/ContactDetail";

export const dynamic = "force-dynamic";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contact = db.select().from(contacts).where(eq(contacts.id, id)).get();
  if (!contact) notFound();

  const stages = db.select({
    id: pipelineStages.id,
    order: pipelineStages.order,
    isWon: pipelineStages.isWon,
    isLost: pipelineStages.isLost,
  }).from(pipelineStages).all();

  const contactDeals = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      stageId: deals.stageId,
      probability: deals.probability,
      createdAt: deals.createdAt,
      stageName: pipelineStages.name,
      stageColor: pipelineStages.color,
      stageOrder: pipelineStages.order,
      isWon: pipelineStages.isWon,
      isLost: pipelineStages.isLost,
    })
    .from(deals)
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .where(eq(deals.contactId, id))
    .all();

  const contactActivities = db
    .select()
    .from(activities)
    .where(eq(activities.contactId, id))
    .orderBy(desc(activities.createdAt))
    .all();

  const relatedContacts = contact.company
    ? db
        .select({ id: contacts.id, name: contacts.name, company: contacts.company, title: contacts.title })
        .from(contacts)
        .where(and(eq(contacts.company, contact.company), ne(contacts.id, id)))
        .limit(6)
        .all()
    : [];

  return (
    <ContactDetailClient
      contact={contact as Parameters<typeof ContactDetailClient>[0]["contact"]}
      deals={contactDeals as Parameters<typeof ContactDetailClient>[0]["deals"]}
      activities={contactActivities as Parameters<typeof ContactDetailClient>[0]["activities"]}
      relatedContacts={relatedContacts as Parameters<typeof ContactDetailClient>[0]["relatedContacts"]}
      stages={stages}
    />
  );
}
