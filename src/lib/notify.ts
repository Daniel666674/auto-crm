import { db } from "@/db";
import { notifications, notificationPreferences, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { sendPushToUser } from "./push";

export type NotificationType =
  | "lead_hot"
  | "lead_created"
  | "deal_won"
  | "deal_lost"
  | "deal_stage_changed"
  | "email_reply"
  | "meeting_booked"
  | "lifecycle_mql"
  | "lifecycle_sql"
  | "mkt_handoff"
  | "campaign_sent"
  | "campaign_completed"
  | "followup_overdue"
  | "automation"
  | "system";

export type Priority = "high" | "medium" | "low";

interface NotifyInput {
  // If omitted, every active user receives the notification.
  userIds?: string[];
  type: NotificationType;
  title: string;
  body: string;
  priority?: Priority;
  link?: string;
  resourceType?: string | null;
  resourceId?: string | null;
}

// Maps notification type → preference-flag column on notificationPreferences.
// Types not in this map are always delivered (e.g. system, automation).
const PREF_FLAG: Partial<Record<NotificationType, "alertLeadHot" | "alertFollowupOverdue" | "alertHandoffPending" | "alertDealMoved" | "alertCampaignPerf">> = {
  lead_hot: "alertLeadHot",
  followup_overdue: "alertFollowupOverdue",
  mkt_handoff: "alertHandoffPending",
  deal_stage_changed: "alertDealMoved",
  deal_won: "alertDealMoved",
  deal_lost: "alertDealMoved",
  campaign_sent: "alertCampaignPerf",
  campaign_completed: "alertCampaignPerf",
};

// Persists a notification per recipient and, for high-priority items, also
// pushes a browser notification when the recipient has browserEnabled.
// Honors notificationPreferences per type. Defaults to enabled when the user
// has no prefs row yet.
export async function notifyUsers(input: NotifyInput): Promise<void> {
  const priority = input.priority ?? "medium";

  const targetIds = input.userIds && input.userIds.length > 0
    ? input.userIds
    : db.select({ id: users.id }).from(users).all().map(u => u.id);

  if (targetIds.length === 0) return;

  const prefs = db.select().from(notificationPreferences)
    .where(inArray(notificationPreferences.userId, targetIds)).all();
  const prefByUser = new Map(prefs.map(p => [p.userId, p]));

  const flag = PREF_FLAG[input.type];
  const deliverIds = targetIds.filter(uid => {
    const p = prefByUser.get(uid);
    if (!flag) return true;
    if (!p) return true;
    return Boolean(p[flag]);
  });

  if (deliverIds.length === 0) return;

  for (const uid of deliverIds) {
    db.insert(notifications).values({
      userId: uid,
      type: input.type,
      title: input.title,
      body: input.body,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      read: false,
    }).run();
  }

  if (priority !== "high") return;

  const link = input.link ?? "/";
  for (const uid of deliverIds) {
    const p = prefByUser.get(uid);
    const browserOn = !p || p.browserEnabled;
    if (!browserOn) continue;
    sendPushToUser(uid, { title: input.title, body: input.body, icon: "/icon-192.png", data: { url: link } })
      .catch(() => { /* push failures are non-critical */ });
  }
}

// Marks notifications as read. Always scoped to the calling user so one
// session can't dismiss another user's notifications. When ids is empty,
// marks every unread notification for the user.
export function markNotificationsRead(userId: string, ids?: string[]): number {
  const where = ids && ids.length > 0
    ? and(eq(notifications.userId, userId), inArray(notifications.id, ids))
    : eq(notifications.userId, userId);
  const list = db.update(notifications)
    .set({ read: true })
    .where(where)
    .returning({ id: notifications.id })
    .all();
  return list.length;
}
