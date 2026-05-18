#!/usr/bin/env npx tsx
/**
 * Dedup contacts script.
 * Groups by name + company, keeps the row with most fields populated,
 * deletes the rest. Skips rows that have linked deals/activities.
 *
 * Usage on VPS:
 *   cd /var/www/nexus && npx tsx scripts/dedup-contacts.ts
 *
 * Optional flag --dry to preview without deleting.
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");
const DRY = process.argv.includes("--dry");

const db = new Database(DB_PATH);
const key = process.env.ENCRYPTION_KEY;
if (key) {
  try { db.pragma(`key='${key.replace(/'/g, "''")}'`); }
  catch { /* SQLCipher not available */ }
}

type ContactRow = {
  id: string; name: string; company: string | null;
  email: string | null; phone: string | null; title: string | null;
  industry: string | null; location: string | null;
  linkedin_url: string | null; whatsapp_number: string | null;
  apollo_id: string | null; created_at: number;
};

const rows = db.prepare(`
  SELECT id, name, company, email, phone, title, industry, location,
         linkedin_url, whatsapp_number, apollo_id, created_at
  FROM contacts
  ORDER BY created_at ASC
`).all() as ContactRow[];

console.log(`Loaded ${rows.length} contacts`);

function richness(r: ContactRow): number {
  return [r.email, r.phone, r.title, r.industry, r.location,
          r.linkedin_url, r.whatsapp_number, r.apollo_id].filter(Boolean).length;
}

const groups = new Map<string, ContactRow[]>();
for (const r of rows) {
  const key = `${(r.name || "").toLowerCase().trim()}|${(r.company || "").toLowerCase().trim()}`;
  const arr = groups.get(key) ?? [];
  arr.push(r);
  groups.set(key, arr);
}

const dealsCheck = db.prepare(`SELECT 1 FROM deals WHERE contact_id = ? LIMIT 1`);
const actsCheck  = db.prepare(`SELECT 1 FROM activities WHERE contact_id = ? LIMIT 1`);
const del = db.prepare(`DELETE FROM contacts WHERE id = ?`);

let groupsWithDupes = 0, removed = 0, skipped = 0;
for (const [key, group] of groups) {
  if (group.length < 2) continue;
  groupsWithDupes++;
  group.sort((a, b) => richness(b) - richness(a));
  const keeper = group[0];
  const toDelete = group.slice(1);
  console.log(`\n${keeper.name} @ ${keeper.company || "(no company)"}: ${group.length} rows, keeping ${keeper.id} (richness=${richness(keeper)})`);
  for (const r of toDelete) {
    if (dealsCheck.get(r.id) || actsCheck.get(r.id)) {
      console.log(`  SKIP ${r.id} (has deals/activities)`);
      skipped++;
      continue;
    }
    if (DRY) {
      console.log(`  WOULD DELETE ${r.id} (richness=${richness(r)})`);
    } else {
      del.run(r.id);
      console.log(`  DELETED ${r.id} (richness=${richness(r)})`);
    }
    removed++;
  }
}

console.log(`\n────────────────────────────────`);
console.log(`Groups with duplicates: ${groupsWithDupes}`);
console.log(`${DRY ? "Would delete" : "Deleted"}: ${removed}`);
console.log(`Skipped (FK refs):     ${skipped}`);
console.log(`Total contacts after:  ${rows.length - (DRY ? 0 : removed)}`);

db.close();
