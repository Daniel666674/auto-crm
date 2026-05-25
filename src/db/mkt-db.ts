import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");

function openDb(): Database.Database {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const db = new Database(DB_PATH, { timeout: 15000 });
  try { db.pragma("journal_mode = WAL"); } catch {}
  try { db.pragma("busy_timeout = 15000"); } catch {}
  try { db.pragma("foreign_keys = ON"); } catch {}
  return db;
}

function initMktTables(db: Database.Database): void {
  const tables = [
    `CREATE TABLE IF NOT EXISTS mkt_contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'website',
      tier INTEGER NOT NULL DEFAULT 3,
      temperature TEXT NOT NULL DEFAULT 'cold',
      score INTEGER NOT NULL DEFAULT 0,
      engagement_status TEXT NOT NULL DEFAULT 'cold',
      email_opens INTEGER NOT NULL DEFAULT 0,
      email_clicks INTEGER NOT NULL DEFAULT 0,
      lead_source_detail TEXT NOT NULL DEFAULT '',
      marketing_notes TEXT NOT NULL DEFAULT '',
      ready_for_sales INTEGER NOT NULL DEFAULT 0,
      passed_to_sales_at INTEGER,
      industry TEXT NOT NULL DEFAULT '',
      last_activity INTEGER NOT NULL,
      linkedin_url TEXT NOT NULL DEFAULT '',
      job_title TEXT NOT NULL DEFAULT '',
      company_size TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      email_verified INTEGER NOT NULL DEFAULT 0,
      email_bounced INTEGER NOT NULL DEFAULT 0,
      email_unsubscribed INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS mkt_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      start_date INTEGER NOT NULL,
      target_segment TEXT NOT NULL DEFAULT '',
      cadence_type TEXT NOT NULL DEFAULT 'outreach',
      open_rate REAL NOT NULL DEFAULT 0,
      click_rate REAL NOT NULL DEFAULT 0,
      reply_rate REAL NOT NULL DEFAULT 0,
      total_contacts INTEGER NOT NULL DEFAULT 0,
      conversions INTEGER NOT NULL DEFAULT 0,
      last_sent INTEGER,
      channel TEXT NOT NULL DEFAULT 'email'
    )`,
  ];
  for (const sql of tables) {
    try { db.exec(sql); } catch {}
  }

  // Migrate: add columns introduced after initial deploy
  const migrations = [
    "ALTER TABLE mkt_contacts ADD COLUMN linkedin_url TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE mkt_contacts ADD COLUMN job_title TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE mkt_contacts ADD COLUMN company_size TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE mkt_contacts ADD COLUMN location TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE mkt_contacts ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE mkt_contacts ADD COLUMN email_bounced INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE mkt_contacts ADD COLUMN email_unsubscribed INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE mkt_campaigns ADD COLUMN channel TEXT NOT NULL DEFAULT 'email'",
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch {} // silently skip if column already exists
  }
}

// No seed data — add real contacts via POST /api/marketing/contacts

const _sqlite = openDb();
initMktTables(_sqlite);
export const mktDb = _sqlite;
