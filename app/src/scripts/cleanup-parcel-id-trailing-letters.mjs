/**
 * One-shot cleanup: strip trailing alpha characters from parcel_id values
 * stored in the properties table. The bug came from extractParcelId() Branch 2
 * (labeled SLC parcels) when source notice text had no separator between the
 * parcel ID and the next word — the greedy `[\w-]+` pattern captured into
 * "IMPORTANT" or similar trailing words.
 *
 * Fixed at extraction in utah-legals.ts cleanParcelId() going forward.
 * This script cleans existing rows. Skips DEAL-prefix synthetic IDs and
 * legitimate alphanumeric formats (Juab style).
 */
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== Preview: parcel_ids ending in letters AFTER digits ===");
const preview = await c.query(`
  SELECT id, parcel_id, city, county
  FROM properties
  WHERE parcel_id ~ '[0-9][A-Za-z]{2,}$'
    AND parcel_id NOT LIKE 'DEAL-%'
    AND parcel_id NOT LIKE 'ul-%'
  LIMIT 30
`);
console.log(`Affected: ${preview.rowCount} rows (preview limited to 30)`);
console.table(preview.rows);

const countResult = await c.query(`
  SELECT COUNT(*) AS n FROM properties
  WHERE parcel_id ~ '[0-9][A-Za-z]{2,}$'
    AND parcel_id NOT LIKE 'DEAL-%'
    AND parcel_id NOT LIKE 'ul-%'
`);
console.log(`Total to clean: ${countResult.rows[0].n}`);

if (Number(countResult.rows[0].n) === 0) {
  console.log("Nothing to clean. Exiting.");
  await c.end();
  process.exit(0);
}

console.log("\n=== Cleaning... ===");
const result = await c.query(`
  UPDATE properties
  SET parcel_id = regexp_replace(parcel_id, '[A-Za-z]{2,}$', ''),
      updated_at = NOW()
  WHERE parcel_id ~ '[0-9][A-Za-z]{2,}$'
    AND parcel_id NOT LIKE 'DEAL-%'
    AND parcel_id NOT LIKE 'ul-%'
`);
console.log(`Cleaned: ${result.rowCount} rows`);

console.log("\n=== Verify: any IMPORTANT-suffix rows remain? ===");
const verify = await c.query(`
  SELECT COUNT(*) AS n FROM properties WHERE parcel_id LIKE '%IMPORTANT%'
`);
console.log(`Remaining IMPORTANT rows: ${verify.rows[0].n}`);

await c.end();
