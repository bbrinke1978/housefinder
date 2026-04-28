/**
 * Migration 0015: User Feedback System — four tables + four enums
 *
 * See drizzle/0015_feedback_system.sql for the SQL.
 *
 * Usage: cd app && npx tsx scripts/migrate-0015-feedback-system.ts
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

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "0015_feedback_system.sql");
const sql = readFileSync(sqlPath, "utf8");

// Split on `;` at end-of-line (preserves multi-line statements like DO blocks
// while breaking on real statement terminators).
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter((s) => s.length > 0);

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log(`Connected. Running ${statements.length} statements from 0015_feedback_system.sql\n`);

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

  console.log("\nVerify tables:");
  const { rows } = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_name IN ('feedback_items', 'feedback_comments', 'feedback_attachments', 'feedback_activity')
     ORDER BY table_name`
  );
  console.table(rows);

  if (rows.length !== 4) {
    console.error(`\nERROR: Expected 4 feedback tables, found ${rows.length}`);
    await client.end();
    process.exit(1);
  }

  await client.end();
  console.log("\nMigration 0015 applied successfully.");
}

main().catch((err) => { console.error(err); process.exit(1); });
