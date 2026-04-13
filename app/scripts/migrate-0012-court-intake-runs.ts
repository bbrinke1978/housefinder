/**
 * Migration 0012: Add court_intake_runs audit table for XChange court record intake
 * Additive migration — no existing tables modified
 *
 * Usage: cd app && source .env.local && npx tsx scripts/migrate-0012-court-intake-runs.ts
 * PowerShell: $env:DATABASE_URL="<url>"; npx tsx scripts/migrate-0012-court-intake-runs.ts
 */

import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set");
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });

const statements = [
  `CREATE TABLE IF NOT EXISTS court_intake_runs (
    id SERIAL PRIMARY KEY,
    run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    county TEXT,
    cases_processed INTEGER NOT NULL DEFAULT 0,
    properties_matched INTEGER NOT NULL DEFAULT 0,
    signals_created INTEGER NOT NULL DEFAULT 0,
    new_hot_leads INTEGER NOT NULL DEFAULT 0,
    unmatched_cases TEXT,
    agent_notes TEXT
  )`,
];

async function main() {
  await client.connect();
  console.log("Connected to database\n");

  let success = 0;
  let skipped = 0;

  for (const sql of statements) {
    const label = sql.slice(0, 60).replace(/\s+/g, " ").trim();
    try {
      await client.query(sql);
      console.log(`  OK ${label}...`);
      success++;
    } catch (err: any) {
      if (err.code === "42P07" || err.code === "42710") {
        console.log(`  - ${label}... (already exists)`);
        skipped++;
      } else {
        console.error(`  FAIL ${label}...`);
        console.error(`    ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }
  }

  console.log(`\nDone: ${success} applied, ${skipped} skipped`);
  await client.end();
}

main();
