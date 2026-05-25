import { NextResponse } from "next/server";
import { mktDb } from "@/db/mkt-db";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

const ICP_INDUSTRIES: Record<string, number> = {
  "Seguros": 25, "seguros": 25, "Insurance": 25,
  "SaaS / IT": 22, "SaaS": 22, "IT": 22, "Technology": 22, "Tecnología": 22, "Software": 22,
  "Fintech": 22, "Finance": 18, "Finanzas": 18,
  "Logística": 20, "Logistics": 20, "Supply Chain": 20,
  "Servicios Profesionales": 18, "Consultoría": 18, "Consulting": 18, "Professional Services": 18,
};

const SENIORITY_KEYWORDS: Record<string, number> = {
  founder: 20, ceo: 20, "c-suite": 20, cto: 20, coo: 20, cmo: 20, cfo: 20,
  president: 20, owner: 20, propietario: 20, fundador: 20,
  vp: 16, "vice president": 16, vicepresidente: 16,
  head: 12, director: 12, "head of": 12,
  manager: 8, gerente: 8, senior: 8,
};

const DEPT_KEYWORDS: Record<string, number> = {
  sales: 10, ventas: 10, marketing: 10, "c-suite": 10, growth: 10,
  operations: 6, ops: 6, operaciones: 6, finance: 6, finanzas: 6, business: 6,
  it: 4, engineering: 4, tech: 4, sistemas: 4, technology: 4,
};

function scoreContact(c: {
  job_title: string;
  email_verified: number;
  industry: string;
  company_size: string;
  linkedin_url: string;
  phone: string;
  email_opens: number;
  email_clicks: number;
  email: string;
}): { score: number; tier: number } {
  let total = 0;

  const title = (c.job_title || "").toLowerCase();
  let seniorityScore = 3;
  for (const [kw, pts] of Object.entries(SENIORITY_KEYWORDS)) {
    if (title.includes(kw)) { seniorityScore = pts; break; }
  }
  total += seniorityScore;

  if (c.email_verified) total += 10;

  let deptScore = 2;
  for (const [kw, pts] of Object.entries(DEPT_KEYWORDS)) {
    if (title.includes(kw)) { deptScore = pts; break; }
  }
  total += deptScore;

  const ind = c.industry || "";
  let indScore = 5;
  for (const [kw, pts] of Object.entries(ICP_INDUSTRIES)) {
    if (ind.toLowerCase().includes(kw.toLowerCase())) { indScore = pts; break; }
  }
  total += indScore;

  const sizeStr = (c.company_size || "").replace(/[^0-9-+]/g, "");
  const sizeNum = parseInt(sizeStr) || 0;
  if (sizeNum >= 11 && sizeNum <= 200) total += 15;
  else if (sizeNum >= 201 && sizeNum <= 500) total += 12;
  else if (sizeNum >= 5 && sizeNum <= 10) total += 10;
  else if (sizeNum >= 501 && sizeNum <= 1000) total += 8;
  else if (sizeNum >= 1 && sizeNum <= 4) total += 6;
  else if (sizeNum > 1000) total += 4;

  if (c.linkedin_url) total += 3;
  if (c.phone) total += 4;
  const emailDomain = c.email.split("@")[1] || "";
  if (emailDomain && !emailDomain.includes("gmail") && !emailDomain.includes("hotmail") && !emailDomain.includes("yahoo")) {
    total += 3;
  }

  if (c.email_clicks > 0) total += 10;
  else if (c.email_opens > 0) total += 5;

  const score = Math.min(100, total);
  const tier = score >= 70 ? 1 : score >= 45 ? 2 : score >= 20 ? 3 : 4;
  return { score, tier };
}

export async function POST() {
  try {
    type Row = {
      id: string; job_title: string; email_verified: number; industry: string;
      company_size: string; linkedin_url: string; phone: string;
      email_opens: number; email_clicks: number; email: string;
    };

    const rows = mktDb
      .prepare("SELECT id, job_title, email_verified, industry, company_size, linkedin_url, phone, email_opens, email_clicks, email FROM mkt_contacts")
      .all() as Row[];

    const update = mktDb.prepare(
      "UPDATE mkt_contacts SET score = ?, tier = ?, temperature = ? WHERE id = ?"
    );

    const tempMap: Record<string, string> = { 1: "hot", 2: "warm", 3: "cold", 4: "cold" };
    const scoredRows: Array<{ email: string; score: number }> = [];

    const run = mktDb.transaction(() => {
      for (const row of rows) {
        const { score, tier } = scoreContact(row);
        const temperature = tempMap[tier] || "cold";
        update.run(score, tier, temperature, row.id);
        if (row.email) scoredRows.push({ email: row.email, score });
      }
    });
    run();

    for (const { email, score } of scoredRows) {
      try {
        db.update(contacts)
          .set({ engagementScore: score })
          .where(eq(contacts.email, email))
          .run();
      } catch { /* non-fatal — contact may not exist in CRM yet */ }
    }

    const tierCounts = mktDb
      .prepare("SELECT tier, COUNT(*) as c FROM mkt_contacts GROUP BY tier")
      .all() as Array<{ tier: number; c: number }>;

    return NextResponse.json({
      success: true,
      processed: rows.length,
      tierBreakdown: Object.fromEntries(tierCounts.map(r => [`tier${r.tier}`, r.c])),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
