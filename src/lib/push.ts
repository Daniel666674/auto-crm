import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions, contacts, deals, pipelineStages } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";

function configureWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:daniel.acosta@blackscale.consulting";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  return true;
}

async function sendToUser(userId: string, payload: object) {
  if (!configureWebPush()) return;
  const sub = db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).get();
  if (!sub) return;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
      db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).run();
    }
  }
}

async function sendToAll(payload: object) {
  if (!configureWebPush()) return;
  const subs = db.select().from(pushSubscriptions).all();
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err: unknown) {
      if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 410) {
        db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id)).run();
      }
    }
  }
}

export async function notifyContactHot(contactId: string, contactName: string) {
  await sendToAll({
    title: "🔥 Lead caliente",
    body: `${contactName} acaba de pasar a estado HOT`,
    icon: "/icon-192.png",
    data: { url: `/contacts/${contactId}` },
  });
}

export async function notifyDealStageChanged(dealId: string, dealTitle: string, stageName: string) {
  await sendToAll({
    title: "Deal actualizado",
    body: `"${dealTitle}" movido a ${stageName}`,
    icon: "/icon-192.png",
    data: { url: `/deals/${dealId}` },
  });
}

export async function sendDailyBriefing() {
  const hotLeads = (db.select({ count: sql<number>`count(*)` }).from(contacts).where(eq(contacts.temperature, "hot")).get() as { count: number })?.count ?? 0;
  const activeDeals = (db.select({ count: sql<number>`count(*)` }).from(deals).get() as { count: number })?.count ?? 0;
  await sendToAll({
    title: "Buenos días — BlackScale Nexus",
    body: `${hotLeads} leads calientes · ${activeDeals} deals activos`,
    icon: "/icon-192.png",
    data: { url: "/" },
  });
}

export async function sendRetentionReviewNotification() {
  const count = (db.select({ count: sql<number>`count(*)` }).from(contacts).where(eq(contacts.retentionReviewNeeded, true)).get() as { count: number })?.count ?? 0;
  if (count === 0) return;
  await sendToAll({
    title: "Retención de datos",
    body: `${count} contacto${count !== 1 ? "s" : ""} requieren revisión (Ley 1581)`,
    icon: "/icon-192.png",
    data: { url: "/settings/retention" },
  });
}
