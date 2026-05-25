import { db } from "@/db";
import { contacts, emailEvents, activities, deals, pipelineStages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeFitScore, getFitWeights, getTierThresholds } from "./fit-scoring";
import { qualifyLead } from "./lead-qualification";

interface Engagement {
  opens: number;
  clicks: number;
  replies: number;
}

/**
 * Recomputes fit score, tier, temperature, engagement score and lifecycle stage
 * for every contact from current firmographics + VA signals + live engagement
 * (email events, meetings, deals). Safe to run repeatedly; never downgrades a
 * contact that already sits deeper in the funnel.
 */
export function recomputeAllScores(): { updated: number } {
  const weights = getFitWeights();
  const tiers = getTierThresholds();

  // Engagement per contact from email events.
  const events = db
    .select({ contactId: emailEvents.contactId, type: emailEvents.type })
    .from(emailEvents)
    .all();
  const engByContact = new Map<string, Engagement>();
  for (const e of events) {
    if (!e.contactId) continue;
    const cur = engByContact.get(e.contactId) ?? { opens: 0, clicks: 0, replies: 0 };
    if (e.type === "open") cur.opens++;
    else if (e.type === "click") cur.clicks++;
    else if (e.type === "reply") cur.replies++;
    engByContact.set(e.contactId, cur);
  }

  // Meetings booked per contact (meeting activities).
  const meetingRows = db
    .select({ contactId: activities.contactId, type: activities.type })
    .from(activities)
    .all();
  const meetingContacts = new Set<string>();
  for (const a of meetingRows) {
    if (a.contactId && (a.type === "meeting" || a.type === "reunion")) meetingContacts.add(a.contactId);
  }

  // Deal state per contact (open vs won).
  const dealRows = db
    .select({
      contactId: deals.contactId,
      isWon: pipelineStages.isWon,
      isLost: pipelineStages.isLost,
    })
    .from(deals)
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .all();
  const openDeal = new Set<string>();
  const wonDeal = new Set<string>();
  for (const d of dealRows) {
    if (!d.contactId) continue;
    if (d.isWon) wonDeal.add(d.contactId);
    else if (!d.isLost) openDeal.add(d.contactId);
  }

  const all = db.select().from(contacts).all();
  let updated = 0;

  for (const c of all) {
    const { fitScore, fitTier } = computeFitScore(
      {
        title: c.title,
        seniority: c.seniority,
        industry: c.industry,
        employeeCount: c.employeeCount,
        sigLinkedinAds: c.sigLinkedinAds,
        sigPostFreq: c.sigPostFreq,
        sigDmActive: c.sigDmActive,
        sigMetaAds: c.sigMetaAds,
        sigGoogleAds: c.sigGoogleAds,
        sigMgrNoHead: c.sigMgrNoHead,
        sigVacancy: c.sigVacancy,
        baseSize: c.fitSizeScore,
        baseIndustry: c.fitIndustryScore,
        baseRole: c.fitRoleScore,
      },
      weights,
      tiers
    );

    const eng = engByContact.get(c.id) ?? { opens: 0, clicks: 0, replies: 0 };
    const qual = qualifyLead({
      fitScore,
      opens: eng.opens,
      clicks: eng.clicks,
      replies: eng.replies,
      meetingBooked: meetingContacts.has(c.id),
      demoed: false,
      hasOpenDeal: openDeal.has(c.id),
      hasWonDeal: wonDeal.has(c.id),
      currentLifecycle: c.lifecycleStage,
      sigDmActive: c.sigDmActive,
      sigLinkedinAds: c.sigLinkedinAds,
      sigPostFreq: c.sigPostFreq,
    });

    db.update(contacts)
      .set({
        score: fitScore,
        fitScore,
        fitTier,
        temperature: qual.temperature,
        engagementScore: qual.engagementScore,
        lifecycleStage: qual.lifecycleStage,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, c.id))
      .run();
    updated++;
  }

  return { updated };
}

/** Recompute a single contact (used after a reply or a signal edit). */
export function recomputeContact(contactId: string): void {
  const c = db.select().from(contacts).where(eq(contacts.id, contactId)).get();
  if (!c) return;

  const weights = getFitWeights();
  const tiers = getTierThresholds();
  const { fitScore, fitTier } = computeFitScore(
    {
      title: c.title,
      seniority: c.seniority,
      industry: c.industry,
      employeeCount: c.employeeCount,
      sigLinkedinAds: c.sigLinkedinAds,
      sigPostFreq: c.sigPostFreq,
      sigDmActive: c.sigDmActive,
      sigMetaAds: c.sigMetaAds,
      sigGoogleAds: c.sigGoogleAds,
      sigMgrNoHead: c.sigMgrNoHead,
      sigVacancy: c.sigVacancy,
      baseSize: c.fitSizeScore,
      baseIndustry: c.fitIndustryScore,
      baseRole: c.fitRoleScore,
    },
    weights,
    tiers
  );

  const events = db
    .select({ type: emailEvents.type })
    .from(emailEvents)
    .where(eq(emailEvents.contactId, contactId))
    .all();
  let opens = 0, clicks = 0, replies = 0;
  for (const e of events) {
    if (e.type === "open") opens++;
    else if (e.type === "click") clicks++;
    else if (e.type === "reply") replies++;
  }

  const acts = db
    .select({ type: activities.type })
    .from(activities)
    .where(eq(activities.contactId, contactId))
    .all();
  const meetingBooked = acts.some((a) => a.type === "meeting" || a.type === "reunion");

  const dealRows = db
    .select({ isWon: pipelineStages.isWon, isLost: pipelineStages.isLost })
    .from(deals)
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .where(eq(deals.contactId, contactId))
    .all();
  const hasWonDeal = dealRows.some((d) => d.isWon);
  const hasOpenDeal = dealRows.some((d) => !d.isWon && !d.isLost);

  const qual = qualifyLead({
    fitScore, opens, clicks, replies, meetingBooked, demoed: false,
    hasOpenDeal, hasWonDeal, currentLifecycle: c.lifecycleStage,
    sigDmActive: c.sigDmActive,
    sigLinkedinAds: c.sigLinkedinAds,
    sigPostFreq: c.sigPostFreq,
  });

  db.update(contacts)
    .set({
      score: fitScore,
      fitScore,
      fitTier,
      temperature: qual.temperature,
      engagementScore: qual.engagementScore,
      lifecycleStage: qual.lifecycleStage,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId))
    .run();
}
