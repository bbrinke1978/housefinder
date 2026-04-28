import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();

  console.log("=== Source of corrupted rows by signal_type (address = digits-only across all SLC) ===");
  const { rows: bySignal } = await client.query(
    `SELECT s.signal_type, count(DISTINCT p.id) as count
     FROM properties p
     JOIN distress_signals s ON s.property_id = p.id
     WHERE p.address ~ '^\\d+$'
       AND p.county = 'salt lake'
     GROUP BY s.signal_type
     ORDER BY count DESC`
  );
  console.table(bySignal);

  console.log("\n=== Corrupted rows WITH NO distress signals (orphaned?) ===");
  const { rows: noSignal } = await client.query(
    `SELECT count(*) as count
     FROM properties p
     WHERE p.address ~ '^\\d+$'
       AND p.county = 'salt lake'
       AND NOT EXISTS (SELECT 1 FROM distress_signals s WHERE s.property_id = p.id)`
  );
  console.table(noSignal);

  console.log("\n=== Distress signals on corrupted rows ===");
  const { rows: signals } = await client.query(
    `SELECT s.signal_type, count(*) as count
     FROM properties p
     JOIN distress_signals s ON s.property_id = p.id
     WHERE p.address ~ '^\\d+$'
       AND p.county = 'salt lake'
     GROUP BY s.signal_type
     ORDER BY count(*) DESC`
  );
  console.table(signals);

  console.log("\n=== Sample corrupted rows with their signals + raw fields ===");
  const { rows: samples } = await client.query(
    `SELECT p.parcel_id, p.address, p.city, p.zip, p.created_at::date,
            array_agg(DISTINCT s.signal_type) as signals
     FROM properties p
     LEFT JOIN distress_signals s ON s.property_id = p.id
     WHERE p.address ~ '^\\d+$'
       AND p.county = 'salt lake'
     GROUP BY p.id
     ORDER BY p.created_at DESC
     LIMIT 12`
  );
  console.table(samples);

  console.log("\n=== Healthy SLC rows (address has letters too) — for comparison ===");
  const { rows: healthy } = await client.query(
    `SELECT p.parcel_id, p.address, p.city, p.zip
     FROM properties p
     WHERE p.county = 'salt lake'
       AND p.address ~ '^\\d+\\s+[A-Za-z]'
     ORDER BY p.created_at DESC
     LIMIT 8`
  );
  console.table(healthy);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
