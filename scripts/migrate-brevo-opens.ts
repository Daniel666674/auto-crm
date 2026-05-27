/**
 * scripts/migrate-brevo-opens.ts
 *
 * Credits historical Brevo engagement to the 20 contacts from
 * TIERS_1_PROSPECCION_1.xlsx that had 4+ opens before Brevo was discontinued.
 * (One contact — Rafael / EX-View Solar — has no email and is skipped.)
 *
 * What this does:
 *   1. Looks up each email in the contacts table
 *   2. Inserts 4 "open" events into email_events (tagged campaign_id="brevo-migration")
 *      so the scoring engine can count them — avoiding duplicates on re-run
 *   3. Calls recomputeContact() for each → temperature → warm, engagement_score += 8
 *
 * Run: npx tsx scripts/migrate-brevo-opens.ts
 */

import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

// ── contacts from the Excel that had 4+ Brevo opens (Tier B/C rows) ──────────
const BREVO_OPENERS = [
  { email: "dani@talkeva.com",                      name: "Daniel",    company: "Talk Eva" },
  { email: "andres@dantailabs.com",                  name: "Andres",    company: "Dantai Labs" },
  { email: "laura@kiper.ai",                         name: "Laura",     company: "Kiper.ai" },
  { email: "felipe@fibek.co",                        name: "Felipe",    company: "Fibek" },
  { email: "diego@grupobits.co",                     name: "Diego",     company: "Bits" },
  { email: "juseche@saggioesg.com",                  name: "Jorge",     company: "Saggio ESG" },
  { email: "orlando.garcia@hcx.com.co",              name: "Orlando",   company: "HCX SAS" },
  { email: "emerson.duran@orinocotic.org",           name: "Emerson",   company: "Cluster Orinoco TIC" },
  { email: "ricardo.puentes@issac.co",               name: "Ricardo",   company: "ISSAC SAS" },
  { email: "manuel.guzman@arknova.co",               name: "Manuel",    company: "ArkNova S.A.S" },
  { email: "juan@cocotero.com.co",                   name: "Juan",      company: "Cocotero" },
  { email: "diego.avalos@incore.club",               name: "Diego",     company: "omnierp.app" },
  { email: "jonnathan.nino@evolutechconsul.com",     name: "Jonnathan", company: "Evolutech Consulting" },
  { email: "mpaula.nieto@kompensity.com",            name: "Maria",     company: "KOMPENSITY" },
  { email: "camilo@calmio.co",                       name: "Camilo",    company: "CALMIO" },
  { email: "esteban@prix.com.co",                    name: "Esteban",   company: "Prix" },
  { email: "gsaad@locknet.com.co",                   name: "Guillermo", company: "Locknet S.A" },
  { email: "landerson@titancemento.com",             name: "Loni",      company: "Titán Cemento" },
  { email: "yezid@sofu.com.co",                      name: "Yezid",     company: "SOFU" },
  // Rafael from EX-View Solar has no email in the sheet — skipped
];

const OPENS_TO_CREDIT = 4;
const CAMPAIGN_TAG    = "brevo-migration"; // lets us identify / avoid duplication

const DB_PATH = path.join(process.cwd(), "data", "crm.db");
const db      = new Database(DB_PATH);

// ── helpers ───────────────────────────────────────────────────────────────────

function findContact(email: string) {
  return db
    .prepare("SELECT id, name, company, temperature, score FROM contacts WHERE lower(email) = lower(?) LIMIT 1")
    .get(email) as { id: string; name: string; company: string; temperature: string; score: number } | undefined;
}

function alreadyMigrated(contactId: string): boolean {
  const row = db
    .prepare("SELECT COUNT(*) as n FROM email_events WHERE contact_id = ? AND campaign_id = ?")
    .get(contactId, CAMPAIGN_TAG) as { n: number };
  return row.n > 0;
}

function insertHistoricalOpens(contactId: string) {
  // Spread 4 opens across the last 45 days (before Brevo was cut)
  const now     = Date.now();
  const fortyFiveDaysMs = 45 * 24 * 60 * 60 * 1000;
  const insert  = db.prepare(`
    INSERT INTO email_events (id, contact_id, message_id, type, created_at, campaign_id, user_agent)
    VALUES (?, ?, ?, 'open', ?, ?, 'Mozilla/5.0 (historical-brevo-import)')
  `);
  for (let i = 0; i < OPENS_TO_CREDIT; i++) {
    const ts = now - fortyFiveDaysMs + Math.floor(i * (fortyFiveDaysMs / OPENS_TO_CREDIT));
    insert.run(randomUUID(), contactId, `brevo-hist-${contactId}-${i}`, ts, CAMPAIGN_TAG);
  }
}

function recomputeContact(contactId: string) {
  // Count events from email_events
  const opens   = (db.prepare("SELECT COUNT(*) as n FROM email_events WHERE contact_id=? AND type='open'").get(contactId)   as { n: number }).n;
  const clicks  = (db.prepare("SELECT COUNT(*) as n FROM email_events WHERE contact_id=? AND type='click'").get(contactId)  as { n: number }).n;
  const replies = (db.prepare("SELECT COUNT(*) as n FROM email_events WHERE contact_id=? AND type='reply'").get(contactId)  as { n: number }).n;

  // Meeting booked?
  const meetingRow = db.prepare("SELECT COUNT(*) as n FROM activities WHERE contact_id=? AND (type='meeting' OR type='reunion')").get(contactId) as { n: number };
  const meetingBooked = meetingRow.n > 0;

  // Engagement score (matches qualifyLead formula)
  const engagementScore = Math.min(
    100,
    replies * 25 + (meetingBooked ? 30 : 0) + clicks * 8 + Math.min(opens, 5) * 2
  );

  // Temperature
  const positiveIntent = replies > 0 || meetingBooked;
  let temperature = "cold";
  if (positiveIntent || clicks > 0) temperature = "hot";
  else if (opens > 0) temperature = "warm";

  db.prepare(`
    UPDATE contacts SET
      engagement_score = ?,
      temperature      = ?,
      updated_at       = ?
    WHERE id = ?
  `).run(engagementScore, temperature, new Date().toISOString(), contactId);
}

// ── main ──────────────────────────────────────────────────────────────────────

console.log(`\n🔄  Migrating historical Brevo opens (${OPENS_TO_CREDIT} opens per contact)\n`);

let found = 0, notFound = 0, skipped = 0, updated = 0;

for (const prospect of BREVO_OPENERS) {
  const contact = findContact(prospect.email);

  if (!contact) {
    console.log(`  ✗ NOT FOUND  ${prospect.email}  (${prospect.name} / ${prospect.company})`);
    notFound++;
    continue;
  }

  if (alreadyMigrated(contact.id)) {
    console.log(`  ⏭  SKIPPED   ${prospect.email}  — already migrated`);
    skipped++;
    continue;
  }

  const before = contact.temperature;
  insertHistoricalOpens(contact.id);
  recomputeContact(contact.id);

  const after = (db.prepare("SELECT temperature, engagement_score FROM contacts WHERE id=?").get(contact.id) as { temperature: string; engagement_score: number });
  console.log(`  ✓ UPDATED   ${prospect.email.padEnd(42)} ${before.padEnd(6)} → ${after.temperature}  (eng: ${after.engagement_score})`);
  found++;
  updated++;
}

console.log(`
─────────────────────────────────────────────
  Contacts found & updated : ${updated}
  Already migrated (skip)  : ${skipped}
  Not found in CRM         : ${notFound}
─────────────────────────────────────────────
`);

db.close();
