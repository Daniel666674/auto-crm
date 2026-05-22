#!/usr/bin/env npx tsx

/**
 * Idempotent migration runner for BLACKSCALE NEXUS.
 * Safe to run multiple times on existing VPS databases.
 *
 * Usage:
 *   npx tsx scripts/migrate.ts
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log("[migrate] BLACKSCALE NEXUS — Migration runner");
console.log(`[migrate] Database: ${DB_PATH}`);

const db = new Database(DB_PATH, { timeout: 15000 });

// Enable WAL mode and foreign keys
try { db.pragma("journal_mode = WAL"); } catch { /* already set */ }
try { db.pragma("busy_timeout = 15000"); } catch { /* ignore */ }
try { db.pragma("foreign_keys = ON"); } catch { /* ignore */ }

// ---------------------------------------------------------------------------
// Helper: check if a column exists in a table
// ---------------------------------------------------------------------------
function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

// ---------------------------------------------------------------------------
// Helper: check if a table exists
// ---------------------------------------------------------------------------
function hasTable(table: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table) as { name: string } | undefined;
  return !!row;
}

// ---------------------------------------------------------------------------
// Migration 1: close_reasons table
// ---------------------------------------------------------------------------
console.log("[migrate] Checking close_reasons table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS close_reasons (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )
`);
console.log("[migrate] close_reasons table: OK");

// ---------------------------------------------------------------------------
// Migration 2: sales_targets table
// ---------------------------------------------------------------------------
console.log("[migrate] Checking sales_targets table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS sales_targets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    period TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER,
    quarter INTEGER,
    target_value INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);
console.log("[migrate] sales_targets table: OK");

// ---------------------------------------------------------------------------
// Migration 3: deals.close_reason_id column
// ---------------------------------------------------------------------------
console.log("[migrate] Checking deals.close_reason_id column...");
if (!hasColumn("deals", "close_reason_id")) {
  db.exec(`ALTER TABLE deals ADD COLUMN close_reason_id TEXT`);
  console.log("[migrate] Added deals.close_reason_id column");
} else {
  console.log("[migrate] deals.close_reason_id already exists, skipping");
}

// ---------------------------------------------------------------------------
// Migration 4: deals.closed_at and deals.closed_by (for older DBs that lack them)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking deals.closed_at column...");
if (!hasColumn("deals", "closed_at")) {
  db.exec(`ALTER TABLE deals ADD COLUMN closed_at INTEGER`);
  console.log("[migrate] Added deals.closed_at column");
} else {
  console.log("[migrate] deals.closed_at already exists, skipping");
}

console.log("[migrate] Checking deals.closed_by column...");
if (!hasColumn("deals", "closed_by")) {
  db.exec(`ALTER TABLE deals ADD COLUMN closed_by TEXT`);
  console.log("[migrate] Added deals.closed_by column");
} else {
  console.log("[migrate] deals.closed_by already exists, skipping");
}

// ---------------------------------------------------------------------------
// Seed: default close reasons if table is empty
// ---------------------------------------------------------------------------
console.log("[migrate] Checking close_reasons seed data...");
const existing = db.prepare("SELECT COUNT(*) as count FROM close_reasons").get() as { count: number };

if (existing.count === 0) {
  const now = Date.now();
  const defaultReasons = [
    { type: "won",  label: "Precio competitivo",       order: 1 },
    { type: "won",  label: "Mejor solución técnica",   order: 2 },
    { type: "lost", label: "Presupuesto insuficiente", order: 1 },
    { type: "lost", label: "Perdió con competidor",    order: 2 },
  ];

  const insert = db.prepare(
    `INSERT INTO close_reasons (id, type, label, "order", active, created_at) VALUES (?, ?, ?, ?, 1, ?)`
  );

  const seedAll = db.transaction(() => {
    for (const r of defaultReasons) {
      insert.run(crypto.randomUUID(), r.type, r.label, r.order, now);
    }
  });
  seedAll();

  console.log(`[migrate] Seeded ${defaultReasons.length} default close reasons`);
} else {
  console.log(`[migrate] close_reasons already has ${existing.count} rows, skipping seed`);
}

// ---------------------------------------------------------------------------
// Migration 5: deals.owner_id column (deal assignments)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking deals.owner_id column...");
if (!hasColumn("deals", "owner_id")) {
  db.exec(`ALTER TABLE deals ADD COLUMN owner_id TEXT`);
  console.log("[migrate] Added deals.owner_id column");
} else {
  console.log("[migrate] deals.owner_id already exists, skipping");
}

// ---------------------------------------------------------------------------
// Migration 6: api_tokens table
// ---------------------------------------------------------------------------
console.log("[migrate] Checking api_tokens table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_preview TEXT NOT NULL,
    scopes TEXT NOT NULL DEFAULT 'read:all',
    created_by TEXT NOT NULL REFERENCES users(id),
    last_used_at INTEGER,
    revoked_at INTEGER,
    created_at INTEGER NOT NULL
  )
`);
console.log("[migrate] api_tokens table: OK");

// ---------------------------------------------------------------------------
// Migration 7: workflow_triggers table
// ---------------------------------------------------------------------------
console.log("[migrate] Checking workflow_triggers table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS workflow_triggers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    event_type TEXT NOT NULL,
    conditions TEXT NOT NULL DEFAULT '{}',
    actions TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);
console.log("[migrate] workflow_triggers table: OK");

// ---------------------------------------------------------------------------
// Migration 8: campaign_outcomes table (marketing analog of close_reasons)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking campaign_outcomes table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS campaign_outcomes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )
`);
console.log("[migrate] campaign_outcomes table: OK");

// Seed default campaign outcomes if empty
const outcomeCount = db.prepare("SELECT COUNT(*) as count FROM campaign_outcomes").get() as { count: number };
if (outcomeCount.count === 0) {
  const seedOutcomes = [
    { type: "success",        label: "Cumplió objetivo de leads",     order: 1 },
    { type: "success",        label: "Generó handoffs de calidad",    order: 2 },
    { type: "underperformed", label: "Open rate por debajo de meta",  order: 1 },
    { type: "underperformed", label: "Baja conversión a handoff",     order: 2 },
    { type: "cancelled",      label: "Pausada por presupuesto",       order: 1 },
    { type: "cancelled",      label: "Pivote estratégico",            order: 2 },
  ];
  const insertOutcome = db.prepare(
    `INSERT INTO campaign_outcomes (id, type, label, "order", active, created_at) VALUES (?, ?, ?, ?, 1, ?)`
  );
  const seedTx = db.transaction(() => {
    const now = Date.now();
    for (const o of seedOutcomes) {
      insertOutcome.run(crypto.randomUUID(), o.type, o.label, o.order, now);
    }
  });
  seedTx();
  console.log(`[migrate] Seeded ${seedOutcomes.length} default campaign outcomes`);
}

// ---------------------------------------------------------------------------
// Migration 9: marketing_targets table (per-user marketing goals)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking marketing_targets table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS marketing_targets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    metric TEXT NOT NULL,
    period TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER,
    quarter INTEGER,
    target_value INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);
console.log("[migrate] marketing_targets table: OK");

// ---------------------------------------------------------------------------
// Migration 10: mkt_campaigns columns — owner, outcome reason, outcome notes
// ---------------------------------------------------------------------------
console.log("[migrate] Checking mkt_campaigns columns...");
// Ensure base table exists (mkt-db.ts also creates it, but be safe for fresh installs)
db.exec(`
  CREATE TABLE IF NOT EXISTS mkt_campaigns (
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
    last_sent INTEGER
  )
`);
for (const col of [
  ["owner_id", "TEXT"],
  ["outcome_reason_id", "TEXT"],
  ["outcome_notes", "TEXT"],
  ["closed_at", "INTEGER"],
]) {
  if (!hasColumn("mkt_campaigns", col[0])) {
    db.exec(`ALTER TABLE mkt_campaigns ADD COLUMN ${col[0]} ${col[1]}`);
    console.log(`[migrate] Added mkt_campaigns.${col[0]}`);
  }
}

// ---------------------------------------------------------------------------
// Migration 11: mkt_contacts.owner_id (contact owner / assignment)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking mkt_contacts.owner_id...");
// Ensure base table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS mkt_contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'website',
    tier INTEGER NOT NULL DEFAULT 3,
    temperature TEXT NOT NULL DEFAULT 'cold',
    score INTEGER NOT NULL DEFAULT 0,
    last_activity INTEGER NOT NULL
  )
`);
if (!hasColumn("mkt_contacts", "owner_id")) {
  db.exec(`ALTER TABLE mkt_contacts ADD COLUMN owner_id TEXT`);
  console.log("[migrate] Added mkt_contacts.owner_id");
}

// ---------------------------------------------------------------------------
// Migration 12: deals USD value + FX rate (deals negotiated in USD, stored COP)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking deals.usd_value / deals.fx_rate columns...");
if (!hasColumn("deals", "usd_value")) {
  db.exec(`ALTER TABLE deals ADD COLUMN usd_value INTEGER`);
  console.log("[migrate] Added deals.usd_value column");
}
if (!hasColumn("deals", "fx_rate")) {
  db.exec(`ALTER TABLE deals ADD COLUMN fx_rate REAL`);
  console.log("[migrate] Added deals.fx_rate column");
}

// ---------------------------------------------------------------------------
// Migration 13: calendar_events table (shared marketing/content calendar)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking calendar_events table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS calendar_events (
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
  )
`);
console.log("[migrate] calendar_events table: OK");

// ---------------------------------------------------------------------------
// Migration 14: custom fields (defs table + JSON value columns)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking custom_field_defs table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS custom_field_defs (
    id TEXT PRIMARY KEY,
    entity TEXT NOT NULL,
    label TEXT NOT NULL,
    field_key TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    options TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )
`);
if (!hasColumn("contacts", "custom_fields")) {
  db.exec(`ALTER TABLE contacts ADD COLUMN custom_fields TEXT`);
  console.log("[migrate] Added contacts.custom_fields column");
}
if (!hasColumn("deals", "custom_fields")) {
  db.exec(`ALTER TABLE deals ADD COLUMN custom_fields TEXT`);
  console.log("[migrate] Added deals.custom_fields column");
}
console.log("[migrate] custom fields: OK");

// ---------------------------------------------------------------------------
// Migration 15: deal line items (multi-product / itemized deals)
// ---------------------------------------------------------------------------
console.log("[migrate] Checking deal_line_items table...");
db.exec(`
  CREATE TABLE IF NOT EXISTS deal_line_items (
    id TEXT PRIMARY KEY,
    deal_id TEXT NOT NULL,
    label TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )
`);
console.log("[migrate] deal_line_items: OK");

// ---------------------------------------------------------------------------
// Migration 16: sequence execution engine (BlackScale email) + email tracking
// ---------------------------------------------------------------------------
console.log("[migrate] Checking sequence engine columns + email tables...");
if (!hasColumn("sequence_enrollments", "next_action_at")) {
  db.exec(`ALTER TABLE sequence_enrollments ADD COLUMN next_action_at INTEGER`);
  console.log("[migrate] Added sequence_enrollments.next_action_at");
}
if (!hasColumn("sequence_enrollments", "last_sent_at")) {
  db.exec(`ALTER TABLE sequence_enrollments ADD COLUMN last_sent_at INTEGER`);
  console.log("[migrate] Added sequence_enrollments.last_sent_at");
}
if (!hasColumn("sequence_enrollments", "last_error")) {
  db.exec(`ALTER TABLE sequence_enrollments ADD COLUMN last_error TEXT`);
  console.log("[migrate] Added sequence_enrollments.last_error");
}
db.exec(`
  CREATE TABLE IF NOT EXISTS email_events (
    id TEXT PRIMARY KEY,
    contact_id TEXT,
    sequence_id TEXT,
    enrollment_id TEXT,
    message_id TEXT,
    type TEXT NOT NULL,
    url TEXT,
    created_at INTEGER NOT NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS email_suppressions (
    email TEXT PRIMARY KEY,
    reason TEXT NOT NULL DEFAULT 'unsubscribe',
    created_at INTEGER NOT NULL
  )
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_email_events_contact ON email_events(contact_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(type)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_seq_enroll_next ON sequence_enrollments(next_action_at)`);
console.log("[migrate] sequence engine + email tables: OK");

// ---------------------------------------------------------------------------
// Migration 17: BlackScale bulk email blasts + calendar sync
// ---------------------------------------------------------------------------
console.log("[migrate] Checking blast_campaigns table + email_events.campaign_id + calendar sync...");
if (!hasColumn("calendar_events", "google_event_id")) {
  db.exec(`ALTER TABLE calendar_events ADD COLUMN google_event_id TEXT`);
  console.log("[migrate] Added calendar_events.google_event_id");
}
if (!hasColumn("email_events", "campaign_id")) {
  db.exec(`ALTER TABLE email_events ADD COLUMN campaign_id TEXT`);
  console.log("[migrate] Added email_events.campaign_id");
}
db.exec(`CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id)`);
db.exec(`
  CREATE TABLE IF NOT EXISTS blast_campaigns (
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
  )
`);
console.log("[migrate] blast_campaigns: OK");

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
db.close();
console.log("[migrate] Migration complete. Database closed cleanly.");
