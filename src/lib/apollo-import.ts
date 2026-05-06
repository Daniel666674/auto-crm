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

  // ── Block 1: Profile Fit (40 pts max) ───────────────────────────────────────
  const title = (row["Title"] || "").toLowerCase();
  const seniority = (row["Seniority"] || "").toLowerCase();
  const titleOrSen = title + " " + seniority;

  if (/ceo|founder|fundador|gerente general|co-founder|owner|president|c-suite|c_suite/.test(titleOrSen)) score += 15;
  else if (/vp |vice president|director|chief/.test(titleOrSen)) score += 15;
  else if (/gerente|manager|head of|lead/.test(titleOrSen)) score += 10;
  else if (/coordinator|coordinador|analyst|analista|specialist/.test(titleOrSen)) score += 3;
  else score += 1;

  const empStr = row["# Employees"] || row["Number of Employees"] || "";
  const emp = parseInt(empStr.replace(/[^0-9]/g, "")) || 0;
  if (emp >= 10 && emp <= 50) score += 15;
  else if (emp >= 51 && emp <= 150) score += 10;
  else if (emp >= 5 && emp <= 9) score += 5;
  else if (emp > 150) score += 2;
  else score += 1;

  const industry = (row["Industry"] || "").toLowerCase();
  if (/insurance|fintech|financ|seguros|banking|bank/.test(industry)) score += 10;
  else if (/saas|software|tech|it |information|servicios profesional|consulting/.test(industry)) score += 10;
  else if (/logistic|manufactur|supply|transport/.test(industry)) score += 8;
  else if (/real estate|inmob|construction|legal|health|medical/.test(industry)) score += 6;
  else score += 3;

  // ── Block 2: Engagement Signals (35 pts max) ────────────────────────────────
  // Apollo tracks sequence engagement — used until Brevo overwrites with campaign data
  const replied = /true|yes|1/.test((row["Replied"] || "").toLowerCase());
  const demoed  = /true|yes|1/.test((row["Demoed"]  || "").toLowerCase());
  const emailOpen = parseInt(row["Email Open"] || "0") || 0;
  const bounced = /true|yes|1/.test((row["Email Bounced"] || "").toLowerCase());

  if (replied) score += 25;          // responded — strongest signal
  else if (demoed) score += 20;      // took a demo
  else if (emailOpen >= 3) score += 15; // opened 3+ emails
  else if (emailOpen >= 1) score += 5;  // opened at least one

  if (bounced) score -= 20;          // bad email — penalise

  // ── Block 3: Intent Signals (25 pts max) ────────────────────────────────────
  const qualify = (row["Qualify Contact"] || "").toLowerCase();
  if (qualify === "yes") score += 15;

  const intentPrimary   = parseInt(row["Primary Intent Score"]   || "0") || 0;
  const intentSecondary = parseInt(row["Secondary Intent Score"] || "0") || 0;
  const intentBonus = Math.min(10, Math.floor((intentPrimary + intentSecondary) / 10));
  score += intentBonus;

  // ── Funding / growth signal (bonus up to 5 pts) ─────────────────────────────
  const funding = (row["Latest Funding"] || row["Total Funding"] || "").replace(/[^0-9]/g, "");
  if (funding && parseInt(funding) > 0) score += 5;

  score = Math.min(100, Math.max(0, score));

  const temperature: "cold" | "warm" | "hot" =
    score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

  return { score, temperature };
}

export type ImportResult = { inserted: number; skipped: number; total: number; lastSync: string };

export async function runApolloImport(): Promise<ImportResult> {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV not found at: ${CSV_PATH}`);
  }

  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(raw);

  // Build email set for deduplication
  const existing = db.select({ email: contacts.email }).from(contacts).all();
  const existingEmails = new Set(existing.map(c => (c.email || "").toLowerCase()));

  let inserted = 0, skipped = 0;

  for (const row of rows) {
    const email = (row["Email"] || "").trim().toLowerCase();
    const firstName = (row["First Name"] || "").trim();
    const lastName = (row["Last Name"] || "").trim();
    const name = [firstName, lastName].filter(Boolean).join(" ");

    if (!name) { skipped++; continue; }
    if (email && existingEmails.has(email)) { skipped++; continue; }

    const phone = (
      row["Work Direct Phone"] || row["Mobile Phone"] || row["Home Phone"] || ""
    ).trim();

    const company = (row["Company Name"] || "").trim();

    const notesParts: string[] = [];
    if (row["Title"]) notesParts.push(`Cargo: ${row["Title"]}`);
    if (row["City"] || row["Country"]) notesParts.push(`Ubicación: ${[row["City"], row["Country"]].filter(Boolean).join(", ")}`);
    if (row["Industry"]) notesParts.push(`Industria: ${row["Industry"]}`);
    if (row["# Employees"]) notesParts.push(`Empleados: ${row["# Employees"]}`);
    if (row["LinkedIn Url"]) notesParts.push(`LinkedIn: ${row["LinkedIn Url"]}`);

    const { score, temperature } = scoreApollo(row);

    db.insert(contacts).values({
      id: crypto.randomUUID(),
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      source: "import",
      temperature,
      score,
      notes: notesParts.join(" | ") || null,
      createdAt: new Date(),
    }).run();

    if (email) existingEmails.add(email);
    inserted++;
  }

  const lastSync = new Date().toISOString();
  db.insert(crmSettings).values({ key: "apollo_last_sync", value: lastSync }).onConflictDoUpdate({ target: crmSettings.key, set: { value: lastSync } }).run();
  db.insert(crmSettings).values({ key: "apollo_last_inserted", value: String(inserted) }).onConflictDoUpdate({ target: crmSettings.key, set: { value: String(inserted) } }).run();
  db.insert(crmSettings).values({ key: "apollo_total_rows", value: String(rows.length) }).onConflictDoUpdate({ target: crmSettings.key, set: { value: String(rows.length) } }).run();

  return { inserted, skipped, total: rows.length, lastSync };
}
