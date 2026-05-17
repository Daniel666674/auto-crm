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
// Done
// ---------------------------------------------------------------------------
db.close();
console.log("[migrate] Migration complete. Database closed cleanly.");
