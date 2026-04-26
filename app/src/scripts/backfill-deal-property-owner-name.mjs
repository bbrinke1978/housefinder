/**
 * Backfill missing owner_name on properties created via findOrCreatePropertyForDeal()
 * before the 2026-04-26 fix. The pre-fix INSERT omitted owner_name, leaving these rows
 * with NULL ownerName even though the deal had a populated seller_name.
 *
 * This caused Tracerfy traces to query by address only → ~0% match rate → sentinel
 * "not found" rows in owner_contacts that block re-tries.
 *
 * Steps:
 *   (a) Preview affected properties
 *   (b) UPDATE owner_name from deals.seller_name
 *   (c) Preview sentinel rows that will be removed
 *   (d) DELETE sentinels so re-trace can succeed
 */
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== (a) Preview: properties created from deals with missing owner_name ===");
const preview = await c.query(`
  SELECT p.id, p.address, p.parcel_id, p.owner_name, d.seller_name
  FROM properties p
  JOIN deals d ON d.property_id = p.id
  WHERE p.parcel_id LIKE 'DEAL-%'
    AND (p.owner_name IS NULL OR p.owner_name = '')
    AND d.seller_name IS NOT NULL
    AND d.seller_name != ''
`);
console.log(`  Affected: ${preview.rowCount} properties`);
if (preview.rowCount > 0 && preview.rowCount <= 20) {
  console.table(preview.rows);
} else if (preview.rowCount > 20) {
  console.table(preview.rows.slice(0, 5));
  console.log(`  ... and ${preview.rowCount - 5} more`);
}

if (preview.rowCount === 0) {
  console.log("\nNothing to backfill. Exiting.");
  await c.end();
  process.exit(0);
}

console.log("\n=== (b) Backfill owner_name from deals.seller_name ===");
const backfill = await c.query(`
  UPDATE properties
  SET owner_name = d.seller_name, updated_at = NOW()
  FROM deals d
  WHERE properties.id = d.property_id
    AND properties.parcel_id LIKE 'DEAL-%'
    AND (properties.owner_name IS NULL OR properties.owner_name = '')
    AND d.seller_name IS NOT NULL
    AND d.seller_name != ''
`);
console.log(`  Updated: ${backfill.rowCount} properties`);

console.log("\n=== (c) Preview: sentinel 'not found' Tracerfy rows on backfilled properties ===");
const sentinelPreview = await c.query(`
  SELECT oc.id, oc.property_id, oc.source, oc.phone, oc.email
  FROM owner_contacts oc
  JOIN properties p ON p.id = oc.property_id
  WHERE p.parcel_id LIKE 'DEAL-%'
    AND p.owner_name IS NOT NULL
    AND oc.source = 'tracerfy'
    AND oc.phone IS NULL
    AND oc.email IS NULL
`);
console.log(`  Sentinels to remove: ${sentinelPreview.rowCount}`);

if (sentinelPreview.rowCount > 0) {
  console.log("\n=== (d) DELETE sentinels so re-trace can run ===");
  const del = await c.query(`
    DELETE FROM owner_contacts oc
    USING properties p
    WHERE oc.property_id = p.id
      AND p.parcel_id LIKE 'DEAL-%'
      AND p.owner_name IS NOT NULL
      AND oc.source = 'tracerfy'
      AND oc.phone IS NULL
      AND oc.email IS NULL
  `);
  console.log(`  Deleted: ${del.rowCount} sentinel rows`);
} else {
  console.log("  No sentinels to delete.");
}

console.log("\n=== Done ===");
console.log(`Backfilled ${backfill.rowCount} property owner_names; cleared ${sentinelPreview.rowCount} sentinels.`);
console.log("Re-running Skip Trace on affected deals should now query Tracerfy with owner name and get real results.");

await c.end();
