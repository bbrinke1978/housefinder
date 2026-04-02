/**
 * fix-addresses.mjs
 *
 * One-time script to fix addresses stored in "STREET: NUMBER" format
 * (e.g. "E MAIN ST: 1110" → "1110 E Main ST") in both properties and deals tables.
 *
 * Safe to run multiple times — only updates rows matching the colon pattern.
 *
 * Usage:
 *   node src/scripts/fix-addresses.mjs
 */

import pg from "pg";

const { Client } = pg;

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://hfadmin:L0K9dV6bgKl67mH084PUOFlBGSPJ80@housefinder-db.postgres.database.azure.com:5432/housefinder?sslmode=require";

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("Connected to database.");

  // Fix properties table: "STREET NAME: NUMBER" → "NUMBER STREET NAME"
  const propResult = await client.query(`
    UPDATE properties
    SET address = regexp_replace(address, '^([A-Za-z0-9 .]+?):\\s*(\\d+[A-Za-z]?)$', '\\2 \\1'),
        updated_at = NOW()
    WHERE address ~ '^[A-Za-z0-9 .]+?:\\s*\\d+[A-Za-z]?$'
    RETURNING id, address
  `);
  console.log(`Fixed ${propResult.rowCount} property addresses.`);
  if (propResult.rowCount > 0 && propResult.rowCount <= 10) {
    for (const row of propResult.rows) {
      console.log(`  ${row.id}: ${row.address}`);
    }
  }

  // Fix deals table: same pattern
  const dealResult = await client.query(`
    UPDATE deals
    SET address = regexp_replace(address, '^([A-Za-z0-9 .]+?):\\s*(\\d+[A-Za-z]?)$', '\\2 \\1'),
        updated_at = NOW()
    WHERE address ~ '^[A-Za-z0-9 .]+?:\\s*\\d+[A-Za-z]?$'
    RETURNING id, address
  `);
  console.log(`Fixed ${dealResult.rowCount} deal addresses.`);
  if (dealResult.rowCount > 0 && dealResult.rowCount <= 10) {
    for (const row of dealResult.rows) {
      console.log(`  ${row.id}: ${row.address}`);
    }
  }

  console.log("\nDone. Addresses normalized from 'STREET: NUMBER' to 'NUMBER STREET' format.");
  await client.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
