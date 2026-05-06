import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { asc } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WinLossClient } from "./WinLossClient";

export const dynamic = "force-dynamic";

export default async function WinLossPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const allStages = db.select().from(pipelineStages).orderBy(asc(pipelineStages.order)).all();
  const allDeals = db.select().from(deals).all();
  const allContacts = db.select().from(contacts).all();

  const contactMap = Object.fromEntries(allContacts.map(c => [c.id, c]));
  const stageMap = Object.fromEntries(allStages.map(s => [s.id, s]));

  const wonDeals = allDeals
    .filter(d => stageMap[d.stageId]?.isWon)
    .map(d => ({
      id: d.id, title: d.title, value: d.value,
      industry: contactMap[d.contactId]?.company?.split(" ").slice(-1)[0] || "General",
      source: contactMap[d.contactId]?.source || "otro",
      stageName: stageMap[d.stageId]?.name || "Ganado",
      won: true,
      days: Math.max(0, Math.floor(
        (Date.now() - (d.createdAt instanceof Date ? d.createdAt.getTime() : Number(d.createdAt))) / 86400000
      )),
    }));

  const lostDeals = allDeals
    .filter(d => stageMap[d.stageId]?.isLost)
    .map(d => ({
      id: d.id, title: d.title, value: d.value,
      industry: contactMap[d.contactId]?.company?.split(" ").slice(-1)[0] || "General",
      source: contactMap[d.contactId]?.source || "otro",
      stageName: stageMap[d.stageId]?.name || "Perdido",
      won: false,
      days: Math.max(0, Math.floor(
        (Date.now() - (d.createdAt instanceof Date ? d.createdAt.getTime() : Number(d.createdAt))) / 86400000
      )),
    }));

  return <WinLossClient wonDeals={wonDeals} lostDeals={lostDeals} />;
}
