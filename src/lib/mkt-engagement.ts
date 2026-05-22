import { db } from "@/db";
import { emailEvents, contacts, crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const FLAG_KEY = "mkt_engagement_source";
export type EngagementSource = "brevo" | "local";

/** Where the marketing engagement signals come from. Defaults to brevo (golden). */
export function getEngagementSource(): EngagementSource {
  try {
    const row = db.select({ value: crmSettings.value }).from(crmSettings).where(eq(crmSettings.key, FLAG_KEY)).get();
    return row?.value === "local" ? "local" : "brevo";
  } catch {
    return "brevo";
  }
}

export function setEngagementSource(v: EngagementSource): void {
  db.insert(crmSettings)
    .values({ key: FLAG_KEY, value: v })
    .onConflictDoUpdate({ target: crmSettings.key, set: { value: v } })
    .run();
}

export type EngagementStatus = "hot" | "warm" | "cold" | "dead";

export interface LocalEngagement {
  opens: number;
  clicks: number;
  replies: number;
  lastActivity: number | null;
  status: EngagementStatus;
}

/**
 * Derives engagement per contact email purely from the local email_events store
 * (BlackScale sends/opens/clicks/replies + suppression signals). This is the
 * Brevo-free source for Phase 3, gated by the mkt_engagement_source flag.
 */
export function computeLocalEngagementByEmail(): Map<string, LocalEngagement> {
  const rows = db
    .select({ email: contacts.email, type: emailEvents.type, createdAt: emailEvents.createdAt })
    .from(emailEvents)
    .innerJoin(contacts, eq(emailEvents.contactId, contacts.id))
    .all();

  const map = new Map<string, LocalEngagement>();
  for (const r of rows) {
    if (!r.email) continue;
    const key = r.email.trim().toLowerCase();
    const e = map.get(key) ?? { opens: 0, clicks: 0, replies: 0, lastActivity: null as number | null, status: "cold" as EngagementStatus };
    const ts = r.createdAt instanceof Date ? r.createdAt.getTime() : typeof r.createdAt === "number" ? r.createdAt : null;
    switch (r.type) {
      case "open": e.opens++; break;
      case "click": e.clicks++; break;
      case "reply": e.replies++; break;
      case "bounce":
      case "unsubscribe":
      case "complaint": e.status = "dead"; break;
    }
    if (ts && (r.type === "open" || r.type === "click" || r.type === "reply")) {
      if (!e.lastActivity || ts > e.lastActivity) e.lastActivity = ts;
    }
    map.set(key, e);
  }

  for (const e of map.values()) {
    if (e.status === "dead") continue; // suppression signal sticks
    if (e.clicks > 0 || e.replies > 0) e.status = "hot";
    else if (e.opens > 0) e.status = "warm";
    else e.status = "cold";
  }
  return map;
}
