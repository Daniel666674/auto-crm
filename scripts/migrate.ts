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
// Done
// ---------------------------------------------------------------------------
db.close();
console.log("[migrate] Migration complete. Database closed cleanly.");
