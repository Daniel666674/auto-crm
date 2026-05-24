import * as fs from "fs";
import * as path from "path";
import { db } from "@/db";
import { contacts, crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeFitScore, getFitWeights, getTierThresholds } from "./fit-scoring";
import { MQL_THRESHOLD } from "./lead-qualification";
import { recomputeAllScores } from "./fit-recompute";

const CSV_PATH = path.join(process.cwd(), "apollo-contacts-export (4).csv");

// Funnel rank — used so re-importing never drags a contact backwards.
const STAGE_RANK: Record<string, number> = {
  subscriber: 0, lead: 1, MQL: 2, SQL: 3, opportunity: 4, customer: 5, evangelist: 6,
};

function parseEmployees(row: Record<string, string>): number | null {
  const raw = row["# Employees"] || row["Number of Employees"] || "";
  const n = parseInt(raw.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Marketing signals derived from Apollo's enriched "Technologies" column. Only
// true ad-intent / marketing-automation footprints count — a company actively
// running paid ads or email marketing is a strong buyer for a marketing agency.
// Generic site tooling (Analytics, Tag Manager, social login) is intentionally
// ignored so the signal stays meaningful.
const RX_GOOGLE_ADS = /google ads|adwords|doubleclick|google ad manager|google remarketing|google conversion/;
const RX_META_ADS = /facebook pixel|facebook conversion|facebook custom audiences|facebook ads|meta pixel|instagram ads|facebook business manager|facebook advertis/;
const RX_LINKEDIN_ADS = /linkedin marketing|linkedin ads|linkedin insight/;
const RX_EMAIL_MKT = /mailchimp|hubspot|getresponse|activecampaign|klaviyo|marketo|pardot|sendinblue|\bbrevo\b|constant contact|sharpspring|drip\b/;

export interface DerivedSignals {
  linkedinAds: boolean;
  metaAds: boolean;
  googleAds: boolean;
  emailMarketing: boolean; // active marketing-automation stack → maps to monthly posting cadence
}

export function deriveApolloSignals(technologies: string | null | undefined): DerivedSignals {
  const t = (technologies || "").toLowerCase();
  return {
    linkedinAds: RX_LINKEDIN_ADS.test(t),
    metaAds: RX_META_ADS.test(t),
    googleAds: RX_GOOGLE_ADS.test(t),
    emailMarketing: RX_EMAIL_MKT.test(t),
  };
}

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || "").trim(); });
    rows.push(row);
  }
  return rows;
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === "," && !inQuote) {
      result.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

function buildLocation(row: Record<string, string>): string {
  const city    = (row["City"]    || row["Company City"]    || "").trim();
  const state   = (row["State"]   || row["Company State"]   || "").trim();
  const country = (row["Country"] || row["Company Country"] || "").trim();
  return [city, state, country].filter(Boolean).join(", ");
}

function buildNotes(row: Record<string, string>): string {
  const parts: string[] = [];
  const emp = row["# Employees"] || row["Number of Employees"] || "";
  if (emp) parts.push(`Empleados: ${emp}`);
  const revenue = row["Annual Revenue"] || "";
  if (revenue) parts.push(`Revenue anual: ${revenue}`);
  const funding = row["Total Funding"] || "";
  if (funding) parts.push(`Funding total: ${funding}`);
  const latestFunding = row["Latest Funding"] || "";
  const latestAmount  = row["Latest Funding Amount"] || "";
  if (latestFunding || latestAmount) parts.push(`Último funding: ${[latestFunding, latestAmount].filter(Boolean).join(" — ")}`);
  const technologies = row["Technologies"] || "";
  if (technologies) parts.push(`Tech: ${technologies.split(",").slice(0, 6).join(", ")}`);
  const intent1 = row["Primary Intent Topic"] || "";
  const intent2 = row["Secondary Intent Topic"] || "";
  if (intent1) parts.push(`Intent principal: ${intent1} (${row["Primary Intent Score"] || 0})`);
  if (intent2) parts.push(`Intent secundario: ${intent2} (${row["Secondary Intent Score"] || 0})`);
  const depts = row["Departments"] || "";
  if (depts) parts.push(`Depts: ${depts}`);
  return parts.join(" | ") || "";
}

export type ImportResult = { inserted: number; skipped: number; updated: number; total: number; lastSync: string };

export async function runApolloImport(): Promise<ImportResult> {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found at: ${CSV_PATH}`);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(raw);

  // Build dedup indexes: apollo_id > email > name+company
  const existing = db.select({
    id: contacts.id,
    email: contacts.email,
    name: contacts.name,
    company: contacts.company,
    apolloId: contacts.apolloId,
    lifecycleStage: contacts.lifecycleStage,
    sigLinkedinAds: contacts.sigLinkedinAds,
    sigPostFreq: contacts.sigPostFreq,
    sigDmActive: contacts.sigDmActive,
    sigMetaAds: contacts.sigMetaAds,
    sigGoogleAds: contacts.sigGoogleAds,
    sigMgrNoHead: contacts.sigMgrNoHead,
    sigVacancy: contacts.sigVacancy,
  }).from(contacts).all();

  // Maps for UPDATE lookups
  const byApolloId = new Map(existing.filter(c => c.apolloId).map(c => [c.apolloId!.toLowerCase(), c.id]));
  const byEmail    = new Map(existing.filter(c => c.email).map(c => [c.email!.toLowerCase(), c.id]));
  const byNameCo   = new Map(existing.map(c => [`${(c.name||"").toLowerCase()}|${(c.company||"").toLowerCase()}`, c.id]));
  const lifecycleById = new Map(existing.map(c => [c.id, c.lifecycleStage || "lead"]));
  // Current VA-manual signals per contact, so re-imports never clobber human work.
  const sigById = new Map(existing.map(c => [c.id, c]));

  // Load scoring weights once so all 2150 rows score against the same config.
  const fitWeights = getFitWeights();
  const tiers = getTierThresholds();

  let inserted = 0, skipped = 0, updated = 0;

  for (const row of rows) {
    const firstName  = (row["First Name"] || "").trim();
    const lastName   = (row["Last Name"]  || "").trim();
    const name       = [firstName, lastName].filter(Boolean).join(" ");
    if (!name) { skipped++; continue; }

    const apolloId   = (row["Apollo Contact Id"] || "").trim().toLowerCase();
    const email      = (row["Email"] || "").trim().toLowerCase();
    const company    = (row["Company Name"] || "").trim();
    const nameCoKey  = `${name.toLowerCase()}|${company.toLowerCase()}`;

    // Phone: prefer Work Direct, then Mobile, then Home
    const phone = (
      row["Work Direct Phone"] || row["Mobile Phone"] || row["Home Phone"] || ""
    ).replace(/^'+/, "").trim();

    const mobileRaw   = (row["Mobile Phone"] || "").replace(/^'+/, "").trim();
    const workRaw     = (row["Work Direct Phone"] || "").replace(/^'+/, "").trim();
    const whatsapp    = mobileRaw && mobileRaw !== workRaw ? mobileRaw : null;
    const title           = (row["Title"] || "").trim();
    const seniority       = (row["Seniority"] || "").trim();
    const industry        = (row["Industry"] || "").trim();
    const location        = buildLocation(row);
    const linkedinUrl     = (row["Person Linkedin Url"] || row["LinkedIn Url"] || "").trim();
    const companyWebsite  = (row["Website"] || "").trim();
    const companyLinkedin = (row["Company Linkedin Url"] || "").trim();
    const employeeCount   = parseEmployees(row);
    const notes           = buildNotes(row);

    // Check if contact already exists (3-layer lookup) BEFORE scoring, so we can
    // merge any VA-entered signals with the ones derived from Apollo.
    let existingId: string | undefined;
    if (apolloId)    existingId = byApolloId.get(apolloId);
    if (!existingId && email)  existingId = byEmail.get(email);
    if (!existingId)           existingId = byNameCo.get(nameCoKey);

    // Marketing signals: derive ad-intent from Apollo "Technologies", then OR with
    // whatever a VA has already toggled so re-imports only ever ADD detected signals.
    const derived = deriveApolloSignals(row["Technologies"]);
    const prev = existingId ? sigById.get(existingId) : undefined;
    const sigLinkedinAds = Boolean(prev?.sigLinkedinAds) || derived.linkedinAds;
    const sigMetaAds     = Boolean(prev?.sigMetaAds)     || derived.metaAds;
    const sigGoogleAds   = Boolean(prev?.sigGoogleAds)   || derived.googleAds;
    const sigDmActive    = Boolean(prev?.sigDmActive);    // VA-only signal, never derived
    const sigMgrNoHead   = Boolean(prev?.sigMgrNoHead);   // VA-only signal
    const sigVacancy     = Boolean(prev?.sigVacancy);     // VA-only signal
    const sigPostFreq    = prev?.sigPostFreq || (derived.emailMarketing ? "mensual" : null);

    // Fit score from firmographics + seniority + merged marketing signals.
    const { fitScore, fitTier } = computeFitScore(
      { title, seniority, industry, employeeCount, sigLinkedinAds, sigPostFreq, sigDmActive, sigMetaAds, sigGoogleAds, sigMgrNoHead, sigVacancy },
      fitWeights,
      tiers
    );
    // Fresh prospects carry no engagement yet, so temperature starts cold and is
    // driven thereafter by opens/clicks/replies (see lib/lead-qualification.ts).
    const temperature = "cold" as const;

    if (existingId) {
      // Promote to MQL on good fit, but never downgrade a contact already deeper
      // in the funnel (opportunity/customer stay put).
      const current = lifecycleById.get(existingId) || "lead";
      const promoted = fitScore >= MQL_THRESHOLD ? "MQL" : "lead";
      const lifecycleStage = (STAGE_RANK[current] ?? 1) >= (STAGE_RANK[promoted] ?? 1) ? current : promoted;

      // UPDATE existing contact with enriched data from CSV
      db.update(contacts).set({
        ...(phone           ? { phone }            : {}),
        ...(title           ? { title }            : {}),
        ...(seniority       ? { seniority }        : {}),
        ...(industry        ? { industry }         : {}),
        ...(location        ? { location }         : {}),
        ...(linkedinUrl     ? { linkedinUrl }      : {}),
        ...(companyWebsite  ? { companyWebsite }   : {}),
        ...(companyLinkedin ? { companyLinkedin }  : {}),
        ...(employeeCount   ? { employeeCount }    : {}),
        ...(whatsapp        ? { whatsappNumber: whatsapp } : {}),
        ...(apolloId        ? { apolloId }         : {}),
        ...(notes           ? { notes }            : {}),
        // merged signals (VA-manual OR Apollo-derived) — never downgrades human input
        sigLinkedinAds, sigMetaAds, sigGoogleAds, sigPostFreq,
        score: fitScore, fitScore, fitTier, lifecycleStage,
        updatedAt: new Date(),
      }).where(eq(contacts.id, existingId)).run();

      // Keep dedup maps current
      if (apolloId) byApolloId.set(apolloId, existingId);
      if (email)    byEmail.set(email, existingId);
      byNameCo.set(nameCoKey, existingId);
      updated++;
      continue;
    }

    // INSERT new contact
    db.insert(contacts).values({
      id: crypto.randomUUID(),
      name,
      email:           email           || null,
      phone:           phone           || null,
      company:         company         || null,
      title:           title           || null,
      seniority:       seniority       || null,
      industry:        industry        || null,
      location:        location        || null,
      linkedinUrl:     linkedinUrl     || null,
      companyWebsite:  companyWebsite  || null,
      companyLinkedin: companyLinkedin || null,
      employeeCount:   employeeCount   || null,
      whatsappNumber:  whatsapp        || null,
      apolloId:        apolloId        || null,
      source:          "import",
      temperature,
      sigLinkedinAds,
      sigMetaAds,
      sigGoogleAds,
      sigPostFreq,
      score:           fitScore,
      fitScore,
      fitTier,
      lifecycleStage:  fitScore >= MQL_THRESHOLD ? "MQL" : "lead",
      notes:           notes           || null,
      createdAt:       new Date(),
      updatedAt:       new Date(),
    }).run();

    if (apolloId) byApolloId.set(apolloId, "new");
    if (email)    byEmail.set(email, "new");
    byNameCo.set(nameCoKey, "new");
    inserted++;
  }

  // Recompute engagement + temperature + lifecycle off the freshly persisted
  // signals (an ad-active contact is behaviorally warm even with no email yet),
  // keeping the import and the live scoring path perfectly in sync.
  try { recomputeAllScores(); } catch { /* non-fatal */ }

  const lastSync = new Date().toISOString();
  [
    ["apollo_last_sync", lastSync],
    ["apollo_last_inserted", String(inserted)],
    ["apollo_last_skipped", String(skipped)],
    ["apollo_total_rows", String(rows.length)],
  ].forEach(([key, value]) => {
    db.insert(crmSettings).values({ key, value })
      .onConflictDoUpdate({ target: crmSettings.key, set: { value } })
      .run();
  });

  return { inserted, skipped, updated, total: rows.length, lastSync };
}
