import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { contacts, deals, pipelineStages, emailEvents } from "@/db/schema";
import { buildAccountSummaries } from "@/app/api/accounts/route";

export const dynamic = "force-dynamic";

interface AbmAccount {
  company: string;
  industry: string | null;
  stakeholders: number;
  pipelineValue: number;
  wonValue: number;
  openDeals: number;
  lastActivityAt: number | null;
  // Fit
  tierA: number;
  tierB: number;
  tierC: number;
  tierD: number;
  topFitScore: number;
  avgFitScore: number;
  // Engagement
  hot: number;
  warm: number;
  cold: number;
  avgEngagementScore: number;
  emailsSent: number;
  emailOpens: number;
  emailReplies: number;
  // Signals (account-level: true if any contact has it)
  sigLinkedinAds: boolean;
  sigMetaAds: boolean;
  sigGoogleAds: boolean;
  sigVacancy: boolean;
  // Blended
  abmPriority: number; // 0–100 composite score for ranking
  engagementLevel: "high" | "medium" | "low";
  hasPipeline: boolean;
  lifecycleStages: string[]; // unique stages present
}

interface AbmTotals {
  accounts: number;
  withPipeline: number;
  totalPipeline: number;
  totalWon: number;
  highEngagement: number;
  tierAAccounts: number; // accounts with at least one Tier A contact
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Sales side: account summaries
  const salesAccounts = buildAccountSummaries();
  const byCompany = new Map<string, AbmAccount>();

  for (const a of salesAccounts) {
    if (!a.company?.trim()) continue;
    byCompany.set(a.company.toLowerCase(), {
      company: a.company,
      industry: a.industry,
      stakeholders: a.contactCount,
      pipelineValue: a.pipelineValue,
      wonValue: a.wonValue,
      openDeals: a.openDealsCount,
      lastActivityAt: a.lastActivityAt,
      tierA: 0, tierB: 0, tierC: 0, tierD: 0,
      topFitScore: 0, avgFitScore: 0,
      hot: 0, warm: 0, cold: 0, avgEngagementScore: 0,
      emailsSent: 0, emailOpens: 0, emailReplies: 0,
      sigLinkedinAds: false, sigMetaAds: false, sigGoogleAds: false, sigVacancy: false,
      abmPriority: 0, engagementLevel: "low", hasPipeline: a.openDealsCount > 0,
      lifecycleStages: [],
    });
  }

  // Marketing side: enrich from main contacts table
  const allContacts = db.select({
    id: contacts.id,
    company: contacts.company,
    industry: contacts.industry,
    fitTier: contacts.fitTier,
    fitScore: contacts.fitScore,
    temperature: contacts.temperature,
    engagementScore: contacts.engagementScore,
    lifecycleStage: contacts.lifecycleStage,
    sigLinkedinAds: contacts.sigLinkedinAds,
    sigMetaAds: contacts.sigMetaAds,
    sigGoogleAds: contacts.sigGoogleAds,
    sigVacancy: contacts.sigVacancy,
  }).from(contacts).all();

  // Email events per contact
  const allEmailEvts = db.select({ contactId: emailEvents.contactId, type: emailEvents.type }).from(emailEvents).all();
  const emailByContact = new Map<string, { sent: number; opens: number; replies: number }>();
  for (const ev of allEmailEvts) {
    if (!ev.contactId) continue;
    const e = emailByContact.get(ev.contactId) ?? { sent: 0, opens: 0, replies: 0 };
    if (ev.type === "sent") e.sent++;
    else if (ev.type === "open") e.opens++;
    else if (ev.type === "reply") e.replies++;
    emailByContact.set(ev.contactId, e);
  }

  // Group contacts by company
  const contactsByCompany = new Map<string, typeof allContacts>();
  for (const c of allContacts) {
    if (!c.company?.trim()) continue;
    const key = c.company.trim().toLowerCase();
    const arr = contactsByCompany.get(key) ?? [];
    arr.push(c);
    contactsByCompany.set(key, arr);
  }

  for (const [key, group] of contactsByCompany) {
    let acc = byCompany.get(key);
    if (!acc) {
      // Marketing-only account with no sales pipeline yet
      const display = group[0].company ?? "";
      const ind = group.find(c => c.industry)?.industry ?? null;
      acc = {
        company: display, industry: ind,
        stakeholders: group.length,
        pipelineValue: 0, wonValue: 0, openDeals: 0, lastActivityAt: null,
        tierA: 0, tierB: 0, tierC: 0, tierD: 0,
        topFitScore: 0, avgFitScore: 0,
        hot: 0, warm: 0, cold: 0, avgEngagementScore: 0,
        emailsSent: 0, emailOpens: 0, emailReplies: 0,
        sigLinkedinAds: false, sigMetaAds: false, sigGoogleAds: false, sigVacancy: false,
        abmPriority: 0, engagementLevel: "low", hasPipeline: false,
        lifecycleStages: [],
      };
      byCompany.set(key, acc);
    }

    let fitScoreSum = 0, engScoreSum = 0;
    const stagesSet = new Set<string>();

    for (const c of group) {
      const tier = (c.fitTier ?? "D") as "A" | "B" | "C" | "D";
      if (tier === "A") acc.tierA++;
      else if (tier === "B") acc.tierB++;
      else if (tier === "C") acc.tierC++;
      else acc.tierD++;

      const fs = c.fitScore ?? 0;
      fitScoreSum += fs;
      if (fs > acc.topFitScore) acc.topFitScore = fs;

      const eng = c.engagementScore ?? 0;
      engScoreSum += eng;

      const temp = c.temperature ?? "cold";
      if (temp === "hot") acc.hot++;
      else if (temp === "warm") acc.warm++;
      else acc.cold++;

      if (c.sigLinkedinAds) acc.sigLinkedinAds = true;
      if (c.sigMetaAds) acc.sigMetaAds = true;
      if (c.sigGoogleAds) acc.sigGoogleAds = true;
      if (c.sigVacancy) acc.sigVacancy = true;

      if (c.lifecycleStage) stagesSet.add(c.lifecycleStage);

      const emails = emailByContact.get(c.id);
      if (emails) {
        acc.emailsSent += emails.sent;
        acc.emailOpens += emails.opens;
        acc.emailReplies += emails.replies;
      }
    }

    acc.avgFitScore = group.length > 0 ? Math.round(fitScoreSum / group.length) : 0;
    acc.avgEngagementScore = group.length > 0 ? Math.round(engScoreSum / group.length) : 0;
    acc.lifecycleStages = Array.from(stagesSet);
    if (!acc.industry) {
      const ind = group.find(c => c.industry)?.industry ?? null;
      if (ind) acc.industry = ind;
    }
    if (acc.stakeholders < group.length) acc.stakeholders = group.length;
  }

  // Blended scores
  const allAccounts = Array.from(byCompany.values()).map(a => {
    const engagedScore = a.hot * 2 + a.warm;
    a.engagementLevel = engagedScore >= 4 || a.hot >= 2 ? "high" : engagedScore >= 1 ? "medium" : "low";

    // ABM priority: tier A contacts (40%) + pipeline presence (30%) + engagement (20%) + fit score (10%)
    const tierAScore = Math.min(40, a.tierA * 20);
    const pipelineScore = a.hasPipeline ? (a.pipelineValue > 0 ? 30 : 15) : 0;
    const engScore = a.engagementLevel === "high" ? 20 : a.engagementLevel === "medium" ? 10 : 0;
    const fitScore = Math.round((a.topFitScore / 100) * 10);
    a.abmPriority = Math.min(100, tierAScore + pipelineScore + engScore + fitScore);

    return a;
  });

  // Sort by ABM priority desc, then pipeline, then stakeholders
  allAccounts.sort((a, b) => {
    if (b.abmPriority !== a.abmPriority) return b.abmPriority - a.abmPriority;
    if (b.pipelineValue !== a.pipelineValue) return b.pipelineValue - a.pipelineValue;
    return b.stakeholders - a.stakeholders;
  });

  const totals: AbmTotals = {
    accounts: allAccounts.length,
    withPipeline: allAccounts.filter(a => a.hasPipeline).length,
    totalPipeline: allAccounts.reduce((s, a) => s + a.pipelineValue, 0),
    totalWon: allAccounts.reduce((s, a) => s + a.wonValue, 0),
    highEngagement: allAccounts.filter(a => a.engagementLevel === "high").length,
    tierAAccounts: allAccounts.filter(a => a.tierA > 0).length,
  };

  return NextResponse.json({ accounts: allAccounts, totals });
}
