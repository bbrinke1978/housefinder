/**
 * run-migration-0013.mjs
 *
 * One-time script to execute migration 0013_rose_park_retag.sql:
 *   1. Retag properties with zip='84116' to city='Rose Park'
 *   2. Belt-and-suspenders: retag by county='salt lake' + city pattern for NULL zip rows
 *   3. Idempotently upsert 'Rose Park' into scraper_config target_cities
 *
 * Safe to run multiple times — all three statements are idempotent.
 *
 * Usage:
 *   node src/scripts/run-migration-0013.mjs
 */

import pg from "pg";

const { Client } = pg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("ERROR: DATABASE_URL environment variable is not set.");
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("Connected to database.");

  // Statement 1: Retag by zip (authoritative path)
  const zipResult = await client.query(`
    UPDATE properties
    SET city = 'Rose Park', updated_at = now()
    WHERE zip = '84116'
      AND city != 'Rose Park'
  `);
  console.log(`Statement 1 (zip retag):  ${zipResult.rowCount} rows updated`);

  // Statement 2: Belt-and-suspenders — county+city match for rows where zip is NULL
  const countyResult = await client.query(`
    UPDATE properties
    SET city = 'Rose Park', updated_at = now()
    WHERE county = 'salt lake'
      AND (city ILIKE '%salt lake%' OR city = '')
      AND city != 'Rose Park'
  `);
  console.log(`Statement 2 (county retag): ${countyResult.rowCount} rows updated`);

  // Statement 3: Idempotent upsert of target_cities in scraper_config
  await client.query(`
    INSERT INTO scraper_config (key, value, updated_at)
    VALUES (
      'target_cities',
      '["Price","Huntington","Castle Dale","Richfield","Nephi","Ephraim","Manti","Fillmore","Delta","Rose Park"]',
      now()
    )
    ON CONFLICT (key) DO UPDATE
      SET value = CASE
        WHEN scraper_config.value::jsonb @> '"Rose Park"'::jsonb
        THEN scraper_config.value
        ELSE (scraper_config.value::jsonb || '["Rose Park"]'::jsonb)::text
      END,
      updated_at = now()
  `);
  console.log("Statement 3 (scraper_config upsert): done");

  // Post-migration verification queries
  console.log("\n--- Post-migration verification ---");

  const cityCount = await client.query(`
    SELECT city, count(*) as cnt
    FROM properties
    WHERE county = 'salt lake'
    GROUP BY city
    ORDER BY cnt DESC
  `);
  if (cityCount.rows.length === 0) {
    console.log("salt lake county city breakdown: (no rows — expected for clean production DB)");
  } else {
    console.log("salt lake county city breakdown:");
    cityCount.rows.forEach((r) => console.log(`  city='${r.city}' count=${r.cnt}`));
  }

  const targetCities = await client.query(`
    SELECT value FROM scraper_config WHERE key = 'target_cities'
  `);
  if (targetCities.rows.length > 0) {
    console.log(`\ntarget_cities value:\n  ${targetCities.rows[0].value}`);
  } else {
    console.log("\nWARNING: No target_cities row found in scraper_config!");
  }

  await client.end();
  console.log("\nMigration 0013 complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
