import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");
const SALT_ROUNDS = 12;

async function main() {
  const danielPw = process.env.DANIEL_PASSWORD;
  const julianPw = process.env.JULIAN_PASSWORD;

  if (!danielPw || !julianPw) {
    console.error("DANIEL_PASSWORD and JULIAN_PASSWORD must be set in environment.");
    process.exit(1);
  }

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Database not found at ${DB_PATH}. Run npm run init first.`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  const danielHash = await bcrypt.hash(danielPw, SALT_ROUNDS);
  const julianHash = await bcrypt.hash(julianPw, SALT_ROUNDS);

  const upsert = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role
  `);

  const now = Date.now();
  upsert.run(crypto.randomUUID(), "daniel.acosta@blackscale.consulting", danielHash, "superadmin", now);
  upsert.run(crypto.randomUUID(), "julian.vallejo@blackscale.consulting", julianHash, "marketing", now);

  console.log("Users seeded: daniel.acosta@blackscale.consulting (superadmin), julian.vallejo@blackscale.consulting (marketing)");
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
