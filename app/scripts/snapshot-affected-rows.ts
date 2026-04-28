import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { writeFileSync, mkdirSync } from "fs";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

// Emery County, Utah cities
const EMERY_LOCAL_CITIES = [
  "Castle Dale", "Huntington", "Orangeville", "Ferron", "Green River",
  "Cleveland", "Elmo", "Clawson", "Emery", "Castle Valley",
];

// Salt Lake County target cities (from seed-config.ts)
const SLC_CITIES = [
  "Rose Park", "Salt Lake City", "Sugar House", "Midvale", "Sandy",
  "Murray", "Holladay", "Kearns", "West Valley City", "Cottonwood Heights",
  "Taylorsville", "West Jordan", "South Jordan", "Riverton", "Herriman",
  "Draper", "South Salt Lake", "Salt Lake County (other)",
];

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".backups");
  mkdirSync(backupDir, { recursive: true });

  // ============================================================
  // SNAPSHOT 1: All SLCo rows that will be touched by backfill
  // (every row in SLC target cities AND with tax_lien signal)
  // ============================================================
  console.log("Snapshotting SLCo rows that will be touched by backfill...");
  const { rows: slcoRows } = await client.query(
    `SELECT DISTINCT p.id, p.parcel_id, p.address, p.city, p.zip, p.state,
            p.county, p.owner_name, p.owner_type, p.created_at, p.updated_at
     FROM properties p
     JOIN distress_signals s ON s.property_id = p.id
     WHERE p.city = ANY($1::text[])
       AND s.signal_type = 'tax_lien'
     ORDER BY p.parcel_id`,
    [SLC_CITIES]
  );
  const slcoBackupPath = join(backupDir, `slco-properties-pre-backfill-${ts}.json`);
  writeFileSync(slcoBackupPath, JSON.stringify(slcoRows, null, 2));
  console.log(`  → ${slcoRows.length} rows written to ${slcoBackupPath}`);

  // ============================================================
  // SNAPSHOT 2: All Emery rows tagged with non-Emery cities
  // (these have mailing address contamination from emery-tax-roll)
  // ============================================================
  console.log("\nSnapshotting Emery rows with non-Emery city tags...");
  const { rows: emeryRows } = await client.query(
    `SELECT id, parcel_id, address, city, zip, state, county, owner_name, owner_type,
            created_at, updated_at
     FROM properties
     WHERE county = 'emery'
       AND city != ''
       AND city IS NOT NULL
       AND NOT (city = ANY($1::text[]))
     ORDER BY parcel_id`,
    [EMERY_LOCAL_CITIES]
  );
  const emeryBackupPath = join(backupDir, `emery-properties-pre-backfill-${ts}.json`);
  writeFileSync(emeryBackupPath, JSON.stringify(emeryRows, null, 2));
  console.log(`  → ${emeryRows.length} rows written to ${emeryBackupPath}`);

  // ============================================================
  // SNAPSHOT 3: All Emery rows with PO Box addresses (mailing too)
  // ============================================================
  console.log("\nSnapshotting Emery rows with PO Box address (mailing contamination)...");
  const { rows: emeryPoBox } = await client.query(
    `SELECT id, parcel_id, address, city, zip, state, county, owner_name, owner_type,
            created_at, updated_at
     FROM properties
     WHERE county = 'emery'
       AND address ~* '^p\\.?\\s*o\\.?\\s+box'
       AND city = ANY($1::text[])
     ORDER BY parcel_id`,
    [EMERY_LOCAL_CITIES]
  );
  const emeryPoBoxPath = join(backupDir, `emery-pobox-pre-backfill-${ts}.json`);
  writeFileSync(emeryPoBoxPath, JSON.stringify(emeryPoBox, null, 2));
  console.log(`  → ${emeryPoBox.length} rows written to ${emeryPoBoxPath}`);

  // ============================================================
  // COUNTS for impact report
  // ============================================================
  console.log("\n=== IMPACT COUNTS ===\n");
  const { rows: slcoTotal } = await client.query(
    `SELECT count(DISTINCT p.id) as total
     FROM properties p
     JOIN distress_signals s ON s.property_id = p.id
     WHERE p.city = ANY($1::text[]) AND s.signal_type = 'tax_lien'`,
    [SLC_CITIES]
  );

  const { rows: slcoCorrupt } = await client.query(
    `SELECT count(DISTINCT p.id) as total
     FROM properties p
     JOIN distress_signals s ON s.property_id = p.id
     WHERE p.city = ANY($1::text[]) AND s.signal_type = 'tax_lien'
       AND p.address ~ '^\\d+$'`,
    [SLC_CITIES]
  );

  const { rows: emeryTotal } = await client.query(
    `SELECT count(*) as total FROM properties WHERE county = 'emery'`
  );

  const { rows: emeryNonLocal } = await client.query(
    `SELECT count(*) as total
     FROM properties
     WHERE county = 'emery' AND city != '' AND city IS NOT NULL
       AND NOT (city = ANY($1::text[]))`,
    [EMERY_LOCAL_CITIES]
  );

  const { rows: emeryLocalPoBox } = await client.query(
    `SELECT count(*) as total
     FROM properties
     WHERE county = 'emery' AND address ~* '^p\\.?\\s*o\\.?\\s+box'
       AND city = ANY($1::text[])`,
    [EMERY_LOCAL_CITIES]
  );

  const { rows: zipNullAll } = await client.query(
    `SELECT count(*) as total FROM properties WHERE zip IS NULL`
  );
  const { rows: zipPopulatedAll } = await client.query(
    `SELECT count(*) as total FROM properties WHERE zip IS NOT NULL`
  );

  console.table([
    { metric: "SLCo total tax_lien rows in target cities", count: slcoTotal[0].total },
    { metric: "SLCo with collapsed address (digits-only)", count: slcoCorrupt[0].total },
    { metric: "Emery rows total", count: emeryTotal[0].total },
    { metric: "Emery rows tagged with non-Emery city", count: emeryNonLocal[0].total },
    { metric: "Emery rows with PO Box address (local-tagged)", count: emeryLocalPoBox[0].total },
    { metric: "ALL properties with zip = NULL", count: zipNullAll[0].total },
    { metric: "ALL properties with zip populated", count: zipPopulatedAll[0].total },
  ]);

  console.log("\nBackup files:");
  console.log(`  ${slcoBackupPath}`);
  console.log(`  ${emeryBackupPath}`);
  console.log(`  ${emeryPoBoxPath}`);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
