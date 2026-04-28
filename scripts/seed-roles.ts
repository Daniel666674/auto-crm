/**
 * seed-roles.ts
 *
 * Pre-seeds the role assignments for known team members.
 * Passwords are NOT needed — authentication is handled by Google Workspace.
 *
 * Run once after `npm run init`:
 *   npx tsx scripts/seed-roles.ts
 *
 * Adding a new team member later:
 *   Add their email + role to the TEAM array below and re-run.
 *   Their record will be created (or updated) without affecting anyone else.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");

const TEAM = [
  { email: "daniel.acosta@blackscale.consulting", role: "superadmin" },
  { email: "julian.vallejo@blackscale.consulting", role: "marketing" },
];

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}. Run npm run init first.`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  const now = Date.now();

  const upsert = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, created_at)
    VALUES (?, ?, '', ?, ?)
    ON CONFLICT(email) DO UPDATE SET role = excluded.role
  `);

  for (const member of TEAM) {
    upsert.run(crypto.randomUUID(), member.email.toLowerCase(), member.role, now);
    console.log(`  ${member.email} → ${member.role}`);
  }

  console.log(`\nDone. ${TEAM.length} team member(s) configured.`);
  console.log("They will be able to log in with their Google Workspace account.");
  db.close();
}

main();
