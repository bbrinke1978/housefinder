/**
 * Migration 0016: RBAC Foundation
 *
 * Adds:
 *   - users.roles (text[]) and users.is_active (boolean)
 *   - deals: acquisition_user_id, disposition_user_id, coordinator_user_id FKs
 *   - leads: lead_manager_id, created_by_user_id FKs
 *   - audit_log table (active 30-day window)
 *   - audit_log_archive table (cold 30-60 day band)
 *   - All corresponding indexes
 *
 * Usage: cd app && npx tsx scripts/migrate-0016-rbac.ts
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

const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "0016_rbac_foundation.sql");
const sql = readFileSync(sqlPath, "utf8");

/**
 * Dollar-quote-aware statement splitter.
 */
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
  console.log(`Connected. Running ${statements.length} statements from 0016_rbac_foundation.sql\n`);

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

  // Verify columns on users
  const { rows: userCols } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name IN ('roles', 'is_active')
    ORDER BY column_name
  `);
  console.log("users new columns:");
  console.table(userCols);

  // Verify columns on deals
  const { rows: dealCols } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'deals'
      AND column_name IN ('acquisition_user_id', 'disposition_user_id', 'coordinator_user_id')
    ORDER BY column_name
  `);
  console.log("deals new columns:");
  console.table(dealCols);

  // Verify columns on leads
  const { rows: leadCols } = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'leads'
      AND column_name IN ('lead_manager_id', 'created_by_user_id')
    ORDER BY column_name
  `);
  console.log("leads new columns:");
  console.table(leadCols);

  // Verify tables
  const { rows: tables } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name IN ('audit_log', 'audit_log_archive')
    ORDER BY table_name
  `);
  console.log("new tables:");
  console.table(tables);

  if (tables.length !== 2) {
    console.error(`\nERROR: Expected 2 audit tables, found ${tables.length}`);
    await client.end();
    process.exit(1);
  }
  if (userCols.length !== 2) {
    console.error(`\nERROR: Expected 2 new columns on users, found ${userCols.length}`);
    await client.end();
    process.exit(1);
  }

  // Quick smoke: SELECT roles, is_active FROM users LIMIT 3
  const { rows: sample } = await client.query("SELECT email, roles, is_active FROM users LIMIT 3");
  console.log("\nSample users (roles/is_active):");
  console.table(sample);

  await client.end();
  console.log("\nMigration 0016 applied successfully.");
}

main().catch((err) => { console.error(err); process.exit(1); });
