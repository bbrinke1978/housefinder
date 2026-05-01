/**
 * Migration 0017: contact_events actor + outcome columns
 *
 * Adds:
 *   - contact_events.actor_user_id uuid REFERENCES users(id) (nullable)
 *   - contact_events.outcome text (nullable)
 *   - idx_contact_events_actor index
 *
 * Usage: cd app && npx tsx scripts/migrate-0017-activity.ts
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

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "0017_contact_events_actor_outcome.sql");
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
  console.log(`Connected. Running ${statements.length} statements from 0017_contact_events_actor_outcome.sql\n`);

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

  console.log("\n-- Verification --");

  const { rows: cols } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'contact_events'
      AND column_name IN ('actor_user_id', 'outcome')
    ORDER BY column_name
  `);
  console.log("contact_events new columns:");
  console.table(cols);

  if (cols.length !== 2) {
    console.error(`\nERROR: Expected 2 new columns, found ${cols.length}`);
    await client.end();
    process.exit(1);
  }

  const { rows: idxRows } = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'contact_events' AND indexname = 'idx_contact_events_actor'
  `);
  console.log("actor index:", idxRows.length > 0 ? "EXISTS" : "MISSING");

  const { rows: sample } = await client.query(
    "SELECT id, event_type, actor_user_id, outcome FROM contact_events LIMIT 3"
  );
  console.log("\nSample contact_events (actor_user_id/outcome should be NULL for legacy rows):");
  console.table(sample);

  await client.end();
  console.log("\nMigration 0017 applied successfully.");
}

main().catch((err) => { console.error(err); process.exit(1); });
