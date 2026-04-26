/**
 * One-shot cleanup: NULL out the corrupted city/address/zip on 404 Emery County
 * properties that were misclassified as SALT LAKE CITY because the scraper captured
 * the OWNER's mailing address (50 East North Temple — LDS Church Office Building)
 * as the property's city/address.
 *
 * Strategy: NULL the corrupted fields. Keep parcel_id, county, ownerName, leads,
 * and signals. The next Emery scrape will repopulate address/city via upsertProperty
 * (which writes new values when the existing column is NULL/empty). The 2026-04-07
 * address fix prevents the bug from recurring.
 */
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const { rowCount: preCount } = await c.query(
  "SELECT 1 FROM properties WHERE city = 'SALT LAKE CITY' AND county = 'emery'"
);
console.log(`Found ${preCount} misclassified Emery rows.`);

if (preCount === 0) {
  console.log("Nothing to clean. Exiting.");
  await c.end();
  process.exit(0);
}

// address is NOT NULL — use empty string so next Emery scrape's upsertProperty
// will replace it (the 2026-04-01 fix preserves existing non-empty addresses;
// empty string is treated as missing and overwritten).
const result = await c.query(`
  UPDATE properties
  SET city = '', address = '', zip = NULL, updated_at = NOW()
  WHERE city = 'SALT LAKE CITY' AND county = 'emery'
`);
console.log(`Cleaned: ${result.rowCount} rows.`);

const { rows: post } = await c.query(
  "SELECT COUNT(*) AS n FROM properties WHERE city = 'SALT LAKE CITY'"
);
console.log(`Remaining SALT LAKE CITY rows in DB: ${post[0].n}`);

await c.end();
