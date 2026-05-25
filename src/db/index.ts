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
    `ALTER TABLE deals ADD COLUMN usd_value INTEGER`,
    `ALTER TABLE deals ADD COLUMN fx_rate REAL`,
    `CREATE TABLE IF NOT EXISTS mkt_segments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      rules_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS client_portals (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      title TEXT NOT NULL DEFAULT 'Portal del Cliente',
      created_at INTEGER NOT NULL,
      created_by TEXT
    )`,
    `ALTER TABLE client_portals ADD COLUMN config_json TEXT NOT NULL DEFAULT '{}'`,
    `ALTER TABLE client_portals ADD COLUMN client_company TEXT`,
    `CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL DEFAULT '10:00',
      duration INTEGER NOT NULL DEFAULT 60,
      type TEXT NOT NULL DEFAULT 'Reunión',
      participants TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS custom_field_defs (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      label TEXT NOT NULL,
      field_key TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      options TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )`,
    `ALTER TABLE contacts ADD COLUMN custom_fields TEXT`,
    `ALTER TABLE deals ADD COLUMN custom_fields TEXT`,
    `CREATE TABLE IF NOT EXISTS deal_line_items (
      id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL,
      label TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price INTEGER NOT NULL DEFAULT 0,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    // Sequence execution engine (BlackScale email)
    `ALTER TABLE sequence_enrollments ADD COLUMN next_action_at INTEGER`,
    `ALTER TABLE sequence_enrollments ADD COLUMN last_sent_at INTEGER`,
    `ALTER TABLE sequence_enrollments ADD COLUMN last_error TEXT`,
    `CREATE TABLE IF NOT EXISTS email_events (
      id TEXT PRIMARY KEY,
      contact_id TEXT,
      sequence_id TEXT,
      enrollment_id TEXT,
      message_id TEXT,
      type TEXT NOT NULL,
      url TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS email_suppressions (
      email TEXT PRIMARY KEY,
      reason TEXT NOT NULL DEFAULT 'unsubscribe',
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_email_events_contact ON email_events(contact_id)`,
    `CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(type)`,
    `CREATE INDEX IF NOT EXISTS idx_seq_enroll_next ON sequence_enrollments(next_action_at)`,
    // Calendar two-way sync with Google Workspace
    `ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT`,
    // Track granted OAuth scopes so we can pick a gmail.send-capable token
    `ALTER TABLE google_tokens ADD COLUMN scope TEXT`,
    // BlackScale bulk email blasts
    `ALTER TABLE email_events ADD COLUMN campaign_id TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id)`,
    `ALTER TABLE email_events ADD COLUMN user_agent TEXT`,
    `CREATE INDEX IF NOT EXISTS idx_email_events_message ON email_events(message_id)`,
    `CREATE TABLE IF NOT EXISTS blast_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      audience_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      total_recipients INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_by TEXT,
      created_at INTEGER NOT NULL,
      sent_at INTEGER
    )`,
    // Firmographic ICP fit score + tier + VA-enriched marketing signals
    `ALTER TABLE contacts ADD COLUMN company_website TEXT`,
    `ALTER TABLE contacts ADD COLUMN company_linkedin TEXT`,
    `ALTER TABLE contacts ADD COLUMN employee_count INTEGER`,
    `ALTER TABLE contacts ADD COLUMN fit_score INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN fit_tier TEXT DEFAULT 'D'`,
    `ALTER TABLE contacts ADD COLUMN sig_linkedin_ads INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN sig_post_freq TEXT`,
    `ALTER TABLE contacts ADD COLUMN sig_dm_active INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN sig_meta_ads INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN sig_google_ads INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN sig_mgr_no_head INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN sig_vacancy INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE contacts ADD COLUMN fit_size_score INTEGER`,
    `ALTER TABLE contacts ADD COLUMN fit_industry_score INTEGER`,
    `ALTER TABLE contacts ADD COLUMN fit_role_score INTEGER`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_fit_score ON contacts(fit_score)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_fit_tier ON contacts(fit_tier)`,
    // Google Meet join URL + event URL on mirrored calendar events
    `ALTER TABLE calendar_events ADD COLUMN meet_link TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN html_link TEXT`,
    // Apollo seniority — role fallback for the fit score
    `ALTER TABLE contacts ADD COLUMN seniority TEXT`,
    // Dapta AI meeting intelligence — transcript + meeting ID on activities
    `ALTER TABLE activities ADD COLUMN transcript_text TEXT`,
    `ALTER TABLE activities ADD COLUMN dapta_meeting_id TEXT`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_dapta_meeting_id ON activities(dapta_meeting_id) WHERE dapta_meeting_id IS NOT NULL`,
    // Scoring v2 — rebalanced weights (force-write; safe as INSERT OR REPLACE)
    `INSERT OR REPLACE INTO crm_settings (key, value) VALUES ('fit_scoring_weights', '{"linkedinAds":12,"postsWeekly":12,"postsMonthly":4,"dmActiveLinkedin":12,"metaAds":4,"googleAds":8,"mgrNoHead":8,"vacancy":8,"size1to10":20,"size11to50":18,"size51to200":6,"industryTech":15,"industryOther":8,"roleCeo":20,"roleCmo":20,"roleMktMgr":12,"roleCsuite":10,"roleOther":0}')`,
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
