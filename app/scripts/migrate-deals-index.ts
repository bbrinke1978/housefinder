/**
 * Add missing index on deals.updated_at for faster ORDER BY queries.
 * Usage: cd app && $env:DATABASE_URL = ...; npx tsx scripts/migrate-deals-index.ts
 */
import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  console.log("Connected\n");
  await client.query(`CREATE INDEX IF NOT EXISTS "idx_deals_updated_at" ON "deals" USING btree ("updated_at")`);
  console.log("  ✓ idx_deals_updated_at created");
  await client.end();
}

main();
