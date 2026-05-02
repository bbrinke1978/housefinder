/**
 * Migration 0018: dismiss-archive
 *
 * Adds:
 *   - leads.dismissed_at, dismissed_by_user_id, dismissed_reason, dismissed_notes
 *   - idx_leads_dismissed_at partial index
 *   - deals.archived_at, archived_by_user_id, archived_reason
 *   - idx_deals_archived_at partial index
 *   - dismissed_parcels table (parcel_id PK)
 *
 * Usage: cd app && npx tsx scripts/migrate-0018-dismiss-archive.ts
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

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "0018_dismiss_archive.sql");
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
  console.log(`Connected. Running ${statements.length} statements from 0018_dismiss_archive.sql\n`);

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

  const { rows: leadCols } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'leads'
      AND column_name IN ('dismissed_at', 'dismissed_by_user_id', 'dismissed_reason', 'dismissed_notes')
    ORDER BY column_name
  `);
  console.log("leads new columns:");
  console.table(leadCols);

  const { rows: dealCols } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'deals'
      AND column_name IN ('archived_at', 'archived_by_user_id', 'archived_reason')
    ORDER BY column_name
  `);
  console.log("deals new columns:");
  console.table(dealCols);

  const { rows: tableRows } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dismissed_parcels'
  `);
  console.log("dismissed_parcels table:", tableRows.length > 0 ? "EXISTS" : "MISSING");

  await client.end();
  console.log("\nMigration 0018 applied successfully.");
}

main().catch((err) => { console.error(err); process.exit(1); });
