import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function applyEncryption(db: Database.Database): void {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return;
  try {
    // Works when better-sqlite3 is compiled with SQLCipher on the VPS
    db.pragma(`key='${key.replace(/'/g, "''")}'`);
  } catch {
    // SQLCipher not available in this build — logged at startup by checkEncryptionKey()
  }
}

export function checkEncryptionKey(): void {
  if (!process.env.ENCRYPTION_KEY) {
    console.warn(
      "\n[NEXUS] WARNING: ENCRYPTION_KEY is not set.\n" +
      "The database will not be encrypted. Set ENCRYPTION_KEY in your environment for production.\n"
    );
  }
}

function createDatabase(): Database.Database {
  const db = new Database(DB_PATH, { timeout: 15000 });
  applyEncryption(db);

  try { db.pragma("journal_mode = WAL"); } catch { /* already set */ }
  try { db.pragma("busy_timeout = 15000"); } catch { /* ignore */ }
  try { db.pragma("foreign_keys = ON"); } catch { /* ignore */ }

  return db;
}

function initTables(db: Database.Database): void {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales',
      policy_acknowledged INTEGER NOT NULL DEFAULT 0,
      policy_acknowledged_at INTEGER,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      source TEXT NOT NULL DEFAULT 'otro',
      temperature TEXT NOT NULL DEFAULT 'cold',
      score INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      engagement_status TEXT DEFAULT 'COLD',
      needs_email_verification INTEGER DEFAULT 0,
      last_brevo_sync INTEGER,
      consent_given INTEGER NOT NULL DEFAULT 0,
      consent_date INTEGER,
      consent_source TEXT DEFAULT 'unknown',
      retention_review_needed INTEGER NOT NULL DEFAULT 0,
      retention_review_date INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT '#64748b',
      is_won INTEGER NOT NULL DEFAULT 0,
      is_lost INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 0,
      stage_id TEXT NOT NULL REFERENCES pipeline_stages(id),
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      expected_close INTEGER,
      probability INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      deal_id TEXT REFERENCES deals(id),
      scheduled_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS crm_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details_json TEXT,
      ip_address TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      endpoint TEXT NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS google_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      access_token_enc TEXT NOT NULL,
      refresh_token_enc TEXT,
      expiry_date INTEGER,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS analytics_cache (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      deal_id TEXT REFERENCES deals(id),
      contact_id TEXT REFERENCES contacts(id),
      company TEXT NOT NULL,
      name TEXT NOT NULL,
      contract_value INTEGER NOT NULL DEFAULT 0,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      health_score INTEGER NOT NULL DEFAULT 8,
      renewal_stage TEXT NOT NULL DEFAULT 'Saludable',
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS deliverables (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendiente',
      due_date INTEGER,
      owner TEXT NOT NULL DEFAULT '',
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      deal_id TEXT REFERENCES deals(id),
      contact_name TEXT NOT NULL DEFAULT '',
      deal_title TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Borrador',
      sent_date INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sequences (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      steps_json TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sequence_enrollments (
      id TEXT PRIMARY KEY,
      sequence_id TEXT NOT NULL REFERENCES sequences(id),
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      current_step INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      started_at INTEGER NOT NULL,
      completed_at INTEGER
    )`,
  ];

  for (const sql of tables) {
    try { db.exec(sql); } catch { /* table exists */ }
  }

  // Migrations for existing databases
  const migrations = [
    `ALTER TABLE contacts ADD COLUMN engagement_status TEXT DEFAULT 'COLD'`,
    `ALTER TABLE contacts ADD COLUMN needs_email_verification INTEGER DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN last_brevo_sync INTEGER`,
    `ALTER TABLE contacts ADD COLUMN consent_given INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN consent_date INTEGER`,
    `ALTER TABLE contacts ADD COLUMN consent_source TEXT DEFAULT 'unknown'`,
    `ALTER TABLE contacts ADD COLUMN retention_review_needed INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN retention_review_date INTEGER`,
    `CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)`,
    `ALTER TABLE contacts ADD COLUMN engagement_score INTEGER`,
    `ALTER TABLE contacts ADD COLUMN title TEXT`,
    `ALTER TABLE contacts ADD COLUMN industry TEXT`,
    `ALTER TABLE contacts ADD COLUMN location TEXT`,
    `ALTER TABLE contacts ADD COLUMN linkedin_url TEXT`,
    `ALTER TABLE contacts ADD COLUMN whatsapp_number TEXT`,
    `ALTER TABLE contacts ADD COLUMN tags TEXT`,
    `ALTER TABLE contacts ADD COLUMN apollo_id TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_apollo_id ON contacts(apollo_id)`,
    `ALTER TABLE pipeline_stages ADD COLUMN default_probability INTEGER NOT NULL DEFAULT 0`,
    `UPDATE pipeline_stages SET default_probability = 100 WHERE is_won = 1 AND default_probability = 0`,
    `UPDATE pipeline_stages SET default_probability = 10 WHERE is_won = 0 AND is_lost = 0 AND "order" = 1 AND default_probability = 0`,
    `UPDATE pipeline_stages SET default_probability = 25 WHERE is_won = 0 AND is_lost = 0 AND "order" = 2 AND default_probability = 0`,
    `UPDATE pipeline_stages SET default_probability = 50 WHERE is_won = 0 AND is_lost = 0 AND "order" = 3 AND default_probability = 0`,
    `UPDATE pipeline_stages SET default_probability = 75 WHERE is_won = 0 AND is_lost = 0 AND "order" = 4 AND default_probability = 0`,
    `ALTER TABLE deals ADD COLUMN closed_at INTEGER`,
    `ALTER TABLE deals ADD COLUMN closed_by TEXT`,
    `ALTER TABLE deals ADD COLUMN close_reason_id TEXT`,
    `ALTER TABLE deals ADD COLUMN owner_id TEXT`,
    `ALTER TABLE deals ADD COLUMN competitor TEXT`,
    `ALTER TABLE deals ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE deals ADD COLUMN recurring_interval TEXT`,
    `ALTER TABLE contacts ADD COLUMN returned_to_marketing_at INTEGER`,
    `ALTER TABLE contacts ADD COLUMN returned_to_marketing_reason TEXT`,
    `ALTER TABLE contacts ADD COLUMN lifecycle_stage TEXT NOT NULL DEFAULT 'lead'`,
    `ALTER TABLE contacts ADD COLUMN first_touch_campaign_id TEXT`,
    `ALTER TABLE contacts ADD COLUMN last_touch_campaign_id TEXT`,
    `ALTER TABLE contacts ADD COLUMN assisting_campaign_ids TEXT`,
    `ALTER TABLE contacts ADD COLUMN reengagement_queued_at INTEGER`,
    `ALTER TABLE deals ADD COLUMN payment_link_url TEXT`,
    `ALTER TABLE deals ADD COLUMN payment_status TEXT`,
    `ALTER TABLE deals ADD COLUMN payment_provider TEXT`,
    `ALTER TABLE deals ADD COLUMN payment_reference TEXT`,
    `ALTER TABLE deals ADD COLUMN paid_at INTEGER`,
    `CREATE TABLE IF NOT EXISTS mkt_segments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      rules_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
  ];

  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column exists */ }
  }
}

function seedDefaultStages(db: Database.Database): void {
  try {
    const result = db.prepare("SELECT COUNT(*) as count FROM pipeline_stages").get() as { count: number } | undefined;
    if (!result || result.count > 0) return;

    const defaultStages = [
      { name: "Prospecto",       order: 1, color: "#64748b", isWon: 0, isLost: 0, prob: 10 },
      { name: "Contactado",      order: 2, color: "#2563eb", isWon: 0, isLost: 0, prob: 25 },
      { name: "Propuesta",       order: 3, color: "#8b5cf6", isWon: 0, isLost: 0, prob: 50 },
      { name: "Negociacion",     order: 4, color: "#ea580c", isWon: 0, isLost: 0, prob: 75 },
      { name: "Cerrado Ganado",  order: 5, color: "#16a34a", isWon: 1, isLost: 0, prob: 100 },
      { name: "Cerrado Perdido", order: 6, color: "#dc2626", isWon: 0, isLost: 1, prob: 0 },
    ];

    const insert = db.prepare(
      `INSERT OR IGNORE INTO pipeline_stages (id, name, "order", color, is_won, is_lost, default_probability) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const seedAll = db.transaction(() => {
      for (const stage of defaultStages) {
        insert.run(crypto.randomUUID(), stage.name, stage.order, stage.color, stage.isWon, stage.isLost, stage.prob);
      }
    });
    seedAll();
  } catch { /* seeding can fail if another worker is doing it */ }
}

checkEncryptionKey();
const sqlite = createDatabase();
initTables(sqlite);
seedDefaultStages(sqlite);

export const db = drizzle(sqlite, { schema });
