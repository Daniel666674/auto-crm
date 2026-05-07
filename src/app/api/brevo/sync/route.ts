import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";

const BREVO_KEY = process.env.BREVO_API_KEY || "";
const H = { "api-key": BREVO_KEY, "Content-Type": "application/json" };

// Maps Brevo's email_blacklisted / bounced state to our flags
function detectEngagementStatus(
  contact: BrevoContact,
  score: number
): "hot" | "warm" | "cold" | "dead" {
  if (contact.emailBlacklisted || contact.emailUnsubscribed) return "dead";

  const stats = contact.statistics?.messagesSent;
  const lastOpenedAt = contact.statistics?.opened?.lastEventDate;
  const lastClickedAt = contact.statistics?.clicked?.lastEventDate;

  const sevenDaysAgo = Date.now() - 7 * 86400000;

  const recentOpen = lastOpenedAt && new Date(lastOpenedAt).getTime() > sevenDaysAgo;
  const recentClick = lastClickedAt && new Date(lastClickedAt).getTime() > sevenDaysAgo;

  if (score >= 70 && (recentOpen || recentClick)) return "hot";
  if (score >= 45 && (recentOpen || recentClick)) return "warm";
  if (score < 45 && !recentOpen && !recentClick) return "cold";
  return "cold";
}

interface BrevoContact {
  id: number;
  email: string;
  emailBlacklisted: boolean;
  emailUnsubscribed: boolean;
  attributes: Record<string, unknown>;
  statistics?: {
    messagesSent?: unknown[];
    opened?: { count: number; lastEventDate: string };
    clicked?: { count: number; lastEventDate: string };
  };
}

async function fetchAllBrevoContacts(): Promise<BrevoContact[]> {
  const all: BrevoContact[] = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const res = await fetch(
      `https://api.brevo.com/v3/contacts?limit=${limit}&offset=${offset}&sort=desc`,
      { headers: H }
    );
    if (!res.ok) break;
    const data = await res.json();
    const batch: BrevoContact[] = data.contacts || [];
    all.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return all;
}

function attr(contact: BrevoContact, key: string): string {
  const v = contact.attributes?.[key];
  return v != null ? String(v) : "";
}

function attrNum(contact: BrevoContact, key: string): number {
  const v = contact.attributes?.[key];
  return v != null ? Number(v) || 0 : 0;
}

function mapTier(score: number): number {
  if (score >= 70) return 1;
  if (score >= 45) return 2;
  if (score >= 20) return 3;
  return 4;
}

function mapTemperature(engagementStatus: string): string {
  if (engagementStatus === "hot") return "hot";
  if (engagementStatus === "warm") return "warm";
  if (engagementStatus === "dead") return "dead";
  return "cold";
}

export async function POST() {
  if (!BREVO_KEY) {
    return NextResponse.json({ error: "BREVO_API_KEY not configured" }, { status: 500 });
  }

  try {
    const contacts = await fetchAllBrevoContacts();

    const upsert = mktDb.prepare(`
      INSERT INTO mkt_contacts
        (id, name, company, email, phone, source, tier, temperature, score, brevo_cadence,
         engagement_status, email_opens, email_clicks, lead_source_detail, marketing_notes,
         ready_for_sales, passed_to_sales_at, industry, last_activity,
         linkedin_url, brevo_id, job_title, company_size, location,
         email_verified, email_bounced, email_unsubscribed)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, company=excluded.company, email=excluded.email,
        phone=excluded.phone, tier=excluded.tier, temperature=excluded.temperature,
        score=excluded.score, engagement_status=excluded.engagement_status,
        email_opens=excluded.email_opens, email_clicks=excluded.email_clicks,
        industry=excluded.industry, last_activity=excluded.last_activity,
        linkedin_url=excluded.linkedin_url, brevo_id=excluded.brevo_id,
        job_title=excluded.job_title, company_size=excluded.company_size,
        location=excluded.location, email_verified=excluded.email_verified,
        email_bounced=excluded.email_bounced, email_unsubscribed=excluded.email_unsubscribed
    `);

    let synced = 0;
    let skipped = 0;

    const run = mktDb.transaction(() => {
      for (const c of contacts) {
        const name = attr(c, "FIRSTNAME") + (attr(c, "LASTNAME") ? " " + attr(c, "LASTNAME") : "");
        if (!name.trim() && !c.email) { skipped++; continue; }

        const scoreAttr = attrNum(c, "SCORE");
        const tierAttr = attrNum(c, "TIER");

        const score = scoreAttr > 0 ? scoreAttr : 0;
        const tier = tierAttr > 0 ? tierAttr : mapTier(score);
        const engagementStatus = detectEngagementStatus(c, score);

        const opens = (c.statistics?.opened?.count) || 0;
        const clicks = (c.statistics?.clicked?.count) || 0;
        const lastActivity = c.statistics?.opened?.lastEventDate
          ? new Date(c.statistics.opened.lastEventDate).getTime()
          : c.statistics?.messagesSent
            ? Date.now() - 30 * 86400000
            : Date.now() - 90 * 86400000;

        const id = `brevo_${c.id}`;
        upsert.run(
          id,
          (name.trim() || c.email.split("@")[0]),
          attr(c, "COMPANY") || attr(c, "SMS") || "",
          c.email,
          attr(c, "SMS") || attr(c, "PHONE") || "",
          "website",
          tier,
          mapTemperature(engagementStatus),
          score,
          "Cold Welcome",
          engagementStatus,
          opens,
          clicks,
          "",
          "",
          0,
          null,
          attr(c, "INDUSTRY") || attr(c, "COMPANY_INDUSTRY") || "",
          lastActivity,
          attr(c, "LINKEDIN_URL") || "",
          String(c.id),
          attr(c, "JOB_TITLE") || attr(c, "JOBTITLE") || "",
          attr(c, "COMPANY_SIZE") || "",
          attr(c, "LOCATION") || attr(c, "CITY") || "",
          c.emailBlacklisted ? 0 : 1,
          0,
          c.emailUnsubscribed ? 1 : 0
        );
        synced++;
      }
    });

    run();

    // Sync campaign stats from Brevo into local mkt_campaigns
    let campaignsSynced = 0;
    try {
      const campRes = await fetch(
        `https://api.brevo.com/v3/emailCampaigns?limit=50&offset=0&status=sent`,
        { headers: H }
      );
      if (campRes.ok) {
        const campData = await campRes.json();
        const campaigns: Array<{ id: number }> = campData.campaigns || [];
        for (const camp of campaigns) {
          try {
            const dr = await fetch(`https://api.brevo.com/v3/emailCampaigns/${camp.id}`, { headers: H });
            if (!dr.ok) continue;
            const d = await dr.json();
            const gs = d.statistics?.globalStats;
            if (!gs) continue;
            const sent = Number(gs.sent) || 0;
            const opens = Number(gs.uniqueViews) || Number(gs.uniqueOpens) || 0;
            const clicks = Number(gs.uniqueClicks) || 0;
            const openRate = sent > 0 ? Math.round((opens / sent) * 10000) / 100 : 0;
            const clickRate = sent > 0 ? Math.round((clicks / sent) * 10000) / 100 : 0;
            const lastSent = d.sendTime ? new Date(d.sendTime).getTime() : null;
            const brevoId = String(camp.id);
            const existing = mktDb.prepare(
              "SELECT id FROM mkt_campaigns WHERE brevo_campaign_id = ?"
            ).get(brevoId) as { id: string } | undefined;
            if (existing) {
              mktDb.prepare(`
                UPDATE mkt_campaigns
                SET open_rate=?, click_rate=?, total_contacts=?, last_sent=?, name=?
                WHERE brevo_campaign_id=?
              `).run(openRate, clickRate, sent, lastSent, d.name, brevoId);
            } else {
              mktDb.prepare(`
                INSERT OR IGNORE INTO mkt_campaigns
                  (id, name, status, start_date, target_segment, cadence_type,
                   open_rate, click_rate, reply_rate, total_contacts, conversions,
                   last_sent, channel, brevo_campaign_id)
                VALUES (?,?,?,?,?,?,?,?,0,?,0,?,?,?)
              `).run(
                `brevo_${brevoId}`, d.name, "completed",
                lastSent || Date.now(), "", "outreach",
                openRate, clickRate, sent, lastSent, "brevo_email", brevoId
              );
            }
            campaignsSynced++;
          } catch { /* skip individual campaign errors */ }
        }
      }
    } catch { /* campaign sync is non-fatal */ }

    return NextResponse.json({ success: true, synced, skipped, total: contacts.length, campaignsSynced });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET: return sync status
export async function GET() {
  const count = (mktDb.prepare("SELECT COUNT(*) as c FROM mkt_contacts").get() as { c: number }).c;
  const lastSync = mktDb.prepare(
    "SELECT MAX(last_activity) as t FROM mkt_contacts WHERE brevo_id != ''"
  ).get() as { t: number | null };
  return NextResponse.json({ contactsInDb: count, lastSyncActivity: lastSync?.t ?? null });
}
