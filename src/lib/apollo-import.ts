import * as fs from "fs";
import * as path from "path";
import { db } from "@/db";
import { contacts, crmSettings } from "@/db/schema";

const CSV_PATH = path.join(process.cwd(), "apollo-contacts-export (4).csv");

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

function scoreApollo(row: Record<string, string>): { score: number; temperature: "cold" | "warm" | "hot" } {
  let score = 0;

  // ── Block 1: Role / Seniority (25 pts max) ──────────────────────────────────
  const title = (row["Title"] || "").toLowerCase();
  const seniority = (row["Seniority"] || "").toLowerCase();
  const titleOrSen = title + " " + seniority;

  if (/ceo|founder|fundador|gerente general|co-founder|owner|president|c-suite|c_suite/.test(titleOrSen)) score += 25;
  else if (/vp |vice president|director|chief/.test(titleOrSen)) score += 20;
  else if (/gerente|manager|head of|lead/.test(titleOrSen)) score += 12;
  else if (/coordinator|coordinador|analyst|analista|specialist/.test(titleOrSen)) score += 4;
  else score += 1;

  // ── Block 2: Company Size (20 pts max) ──────────────────────────────────────
  const empStr = row["# Employees"] || row["Number of Employees"] || "";
  const emp = parseInt(empStr.replace(/[^0-9]/g, "")) || 0;
  if (emp >= 10 && emp <= 200) score += 20;
  else if (emp >= 201 && emp <= 500) score += 12;
  else if (emp >= 5 && emp <= 9) score += 7;
  else if (emp > 500) score += 3;
  else score += 1;

  // ── Block 3: Industry Fit (15 pts max) ──────────────────────────────────────
  const industry = (row["Industry"] || "").toLowerCase();
  if (/insurance|fintech|financ|seguros|banking|bank/.test(industry)) score += 15;
  else if (/saas|software|tech|it |information|servicios profesional|consulting/.test(industry)) score += 10;
  else if (/logistic|manufactur|supply|transport/.test(industry)) score += 8;
  else if (/real estate|inmob|construction|legal|health|medical/.test(industry)) score += 5;
  else score += 2;

  // ── Block 4: Qualification & Intent (40 pts max) ────────────────────────────
  const qualify = (row["Qualify Contact"] || "").toLowerCase();
  if (qualify === "yes") score += 15;

  const intentPrimary   = parseInt(row["Primary Intent Score"]   || "0") || 0;
  const intentSecondary = parseInt(row["Secondary Intent Score"] || "0") || 0;
  const intentBonus = Math.min(17, Math.floor((intentPrimary + intentSecondary) / 10));
  score += intentBonus;

  // Data completeness signals (up to 8 pts)
  if (row["Person Linkedin Url"] || row["LinkedIn Url"]) score += 3;
  if (row["Work Direct Phone"] || row["Mobile Phone"]) score += 3;
  const funding = (row["Latest Funding Amount"] || row["Latest Funding"] || row["Total Funding"] || "").replace(/[^0-9]/g, "");
  if (funding && parseInt(funding) > 0) score += 2;

  score = Math.min(100, Math.max(0, score));
  const temperature: "cold" | "warm" | "hot" = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
  return { score, temperature };
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
  }).from(contacts).all();

  const existingApolloIds = new Set(existing.filter(c => c.apolloId).map(c => c.apolloId!.toLowerCase()));
  const existingEmails    = new Set(existing.filter(c => c.email).map(c => c.email!.toLowerCase()));
  const existingNameCo    = new Set(
    existing.map(c => `${(c.name || "").toLowerCase()}|${(c.company || "").toLowerCase()}`)
  );

  let inserted = 0, skipped = 0, updated = 0;

  for (const row of rows) {
    const firstName  = (row["First Name"] || "").trim();
    const lastName   = (row["Last Name"]  || "").trim();
    const name       = [firstName, lastName].filter(Boolean).join(" ");
    if (!name) { skipped++; continue; }

    const apolloId  = (row["Apollo Contact Id"] || "").trim().toLowerCase();
    const email     = (row["Email"] || "").trim().toLowerCase();
    const nameCoKey = `${name.toLowerCase()}|${(row["Company Name"] || "").trim().toLowerCase()}`;

    // 3-layer dedup check
    if (apolloId && existingApolloIds.has(apolloId)) { skipped++; continue; }
    if (email     && existingEmails.has(email))       { skipped++; continue; }
    if (!email    && existingNameCo.has(nameCoKey))   { skipped++; continue; }

    // Phone: prefer Work Direct, then Mobile, then Home
    const phone = (
      row["Work Direct Phone"] || row["Mobile Phone"] || row["Home Phone"] || ""
    ).replace(/^'+/, "").trim();

    // WhatsApp: use Mobile if it differs from work phone
    const mobileRaw  = (row["Mobile Phone"] || "").replace(/^'+/, "").trim();
    const workRaw    = (row["Work Direct Phone"] || "").replace(/^'+/, "").trim();
    const whatsapp   = mobileRaw && mobileRaw !== workRaw ? mobileRaw : null;

    const company    = (row["Company Name"] || "").trim();
    const title      = (row["Title"] || "").trim();
    const industry   = (row["Industry"] || "").trim();
    const location   = buildLocation(row);
    const linkedinUrl = (row["Person Linkedin Url"] || row["LinkedIn Url"] || "").trim();
    const notes      = buildNotes(row);

    const { score, temperature } = scoreApollo(row);

    db.insert(contacts).values({
      id: crypto.randomUUID(),
      name,
      email:         email     || null,
      phone:         phone     || null,
      company:       company   || null,
      title:         title     || null,
      industry:      industry  || null,
      location:      location  || null,
      linkedinUrl:   linkedinUrl || null,
      whatsappNumber: whatsapp || null,
      apolloId:      apolloId  || null,
      source:        "import",
      temperature,
      score,
      notes:         notes     || null,
      createdAt:     new Date(),
      updatedAt:     new Date(),
    }).run();

    // Track in dedup sets so within-CSV duplicates are also skipped
    if (apolloId) existingApolloIds.add(apolloId);
    if (email)    existingEmails.add(email);
    existingNameCo.add(nameCoKey);

    inserted++;
  }

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
