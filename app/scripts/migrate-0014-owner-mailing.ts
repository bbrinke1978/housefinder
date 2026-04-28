/**
 * Migration 0014: Add owner_mailing_* columns + relax NOT NULL on situs columns
 *
 * See drizzle/0014_owner_mailing_address.sql for the SQL.
 *
 * Usage: cd app && npx tsx scripts/migrate-0014-owner-mailing.ts
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "0014_owner_mailing_address.sql");
const sql = readFileSync(sqlPath, "utf8");

// Split on `;` at end-of-line (preserves multi-line statements while breaking on real terminators).
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter((s) => s.length > 0);

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log(`Connected. Running ${statements.length} statements from 0014_owner_mailing_address.sql\n`);

  for (const stmt of statements) {
    const label = stmt.slice(0, 80).replace(/\s+/g, " ");
    try {
      await client.query(stmt);
      console.log(`  OK  ${label}...`);
    } catch (err: any) {
      console.error(`  FAIL ${label}`);
      console.error(`    ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log("\nVerify columns:");
  const { rows } = await client.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'properties'
       AND column_name IN ('address','city','zip','owner_mailing_address','owner_mailing_city','owner_mailing_state','owner_mailing_zip')
     ORDER BY column_name`
  );
  console.table(rows);

  await client.end();
  console.log("\nMigration 0014 applied successfully.");
}

main().catch((err) => { console.error(err); process.exit(1); });
