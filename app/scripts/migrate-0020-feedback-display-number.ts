/**
 * Migration 0020: Feedback display_number
 *
 * Adds:
 *   - sequence feedback_items_display_number_seq
 *   - feedback_items.display_number integer NOT NULL UNIQUE (defaults to nextval(seq))
 *   - backfills existing rows in created_at order starting at 1
 *
 * Usage: cd app && npx tsx scripts/migrate-0020-feedback-display-number.ts
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

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "0020_feedback_display_number.sql");
const sql = readFileSync(sqlPath, "utf8");

function splitStatements(input: string): string[] {
  const results: string[] = [];
  let current = "";
  let inDollarQuote = false;
  const lines = input.split("\n");

  for (const line of lines) {
    const effectiveLine = inDollarQuote ? line : line.replace(/--.*$/, "");
    const dollarMatches = effectiveLine.match(/\$\$/g);
    if (dollarMatches && dollarMatches.length % 2 !== 0) {
      inDollarQuote = !inDollarQuote;
    }
    current += effectiveLine + "\n";
    if (!inDollarQuote && effectiveLine.trimEnd().endsWith(";")) {
      const stmt = current.trim();
      if (stmt.length > 0) results.push(stmt);
      current = "";
    }
  }

  const trailing = current.trim();
  if (trailing.length > 0) results.push(trailing);
  return results;
}

const statements = splitStatements(sql).filter((s) => s.length > 0);

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log(`Connected. Running ${statements.length} statements from 0020_feedback_display_number.sql\n`);

  for (const stmt of statements) {
    const label = stmt.slice(0, 80).replace(/\s+/g, " ");
    try {
      await client.query(stmt);
      console.log(`  OK  ${label}...`);
    } catch (err: unknown) {
      console.error(`  FAIL ${label}`);
      console.error(`    ${(err as Error).message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log("\n-- Verification --");

  const { rows: cols } = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'feedback_items' AND column_name = 'display_number'
  `);
  console.log("feedback_items.display_number:");
  console.table(cols);

  const { rows: counts } = await client.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(display_number) AS with_display_number,
      MIN(display_number) AS min_dn,
      MAX(display_number) AS max_dn
    FROM feedback_items
  `);
  console.log("Backfill stats:");
  console.table(counts);

  const { rows: dupes } = await client.query(`
    SELECT display_number, COUNT(*) AS c
    FROM feedback_items
    GROUP BY display_number HAVING COUNT(*) > 1
  `);
  console.log("Duplicate display_numbers (should be empty):", dupes.length === 0 ? "NONE" : dupes);

  const { rows: seq } = await client.query(`
    SELECT last_value, is_called FROM feedback_items_display_number_seq
  `);
  console.log("Sequence state:");
  console.table(seq);

  await client.end();
  console.log("\nMigration 0020 applied successfully.");
}

main().catch((err) => { console.error(err); process.exit(1); });
