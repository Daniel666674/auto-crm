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

  // Block 1 — Profile Fit (40 pts max)
  const title = (row["Title"] || row["Seniority"] || "").toLowerCase();
  if (/ceo|founder|fundador|gerente general|co-founder|owner|president/.test(title)) score += 15;
  else if (/vp |vice president|director/.test(title)) score += 15;
  else if (/gerente|manager|head of/.test(title)) score += 10;
  else if (/coordinator|coordinador|analyst|analista/.test(title)) score += 3;

  const empStr = row["# Employees"] || row["Number of Employees"] || "";
  const emp = parseInt(empStr.replace(/[^0-9]/g, "")) || 0;
  if (emp >= 10 && emp <= 50) score += 15;
  else if (emp >= 51 && emp <= 150) score += 10;
  else if (emp >= 5 && emp <= 9) score += 5;
  else if (emp > 150) score += 2;

  const industry = (row["Industry"] || "").toLowerCase();
  if (/insurance|fintech|financ|seguros/.test(industry)) score += 10;
  else if (/saas|software|tech|it |information|servicios/.test(industry)) score += 10;
  else if (/logistic|manufactur|supply/.test(industry)) score += 8;
  else score += 3;

  // Block 3 — Intent Signals (25 pts max, Brevo adds Block 2 later)
  const intentScore = parseInt(row["Primary Intent Score"] || "0") || 0;
  if (intentScore > 0) score += Math.min(15, Math.floor(intentScore / 7));
  if ((row["Qualify Contact"] || "").toLowerCase() === "yes") score += 10;

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
