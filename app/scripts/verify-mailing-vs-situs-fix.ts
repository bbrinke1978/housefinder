/**
 * Final verification: did the mailing-vs-situs migration achieve its goals?
 *
 * Reports:
 *   - SLCo situs population (should be high after UGRC enrichment)
 *   - Emery situs population (depends on whether the wpDataTable has
 *     PropertyAddress columns — may be partial)
 *   - Cross-county address-quality metrics (no more digit-only addresses)
 *   - Owner-mailing-state distribution (the "out-of-state owner" todo)
 *   - Trust-ownership counts (the other todo from earlier in conversation)
 *
 * Usage: cd app && npx tsx scripts/verify-mailing-vs-situs-fix.ts
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Mailing-vs-Situs Migration — Verification");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ============================================================
  // 1. Address quality — should be 0 digit-only addresses anywhere
  // ============================================================
  console.log("--- 1. Address quality ---");
  const { rows: digitOnly } = await client.query(
    `SELECT count(*) as count FROM properties WHERE address ~ '^\\d+$'`
  );
  const { rows: poBoxSitus } = await client.query(
    `SELECT count(*) as count FROM properties WHERE address ~* '^p\\.?\\s*o\\.?\\s+box'`
  );
  console.table([
    { metric: "Properties with situs = digits-only (was 102)", count: digitOnly[0].count },
    { metric: "Properties with situs = PO Box (situs contamination)", count: poBoxSitus[0].count },
  ]);

  // ============================================================
  // 2. SLCo situs population
  // ============================================================
  console.log("\n--- 2. Salt Lake County situs ---");
  const { rows: slcoTotals } = await client.query(
    `SELECT
       count(*) as total,
       count(address) as with_address,
       count(city) as with_city,
       count(zip) as with_zip,
       count(*) FILTER (WHERE owner_mailing_address IS NOT NULL) as with_mailing
     FROM properties
     WHERE county = 'salt lake'`
  );
  console.table([
    { metric: "SLCo total", count: slcoTotals[0].total },
    { metric: "SLCo with situs address", count: slcoTotals[0].with_address },
    { metric: "SLCo with situs city", count: slcoTotals[0].with_city },
    { metric: "SLCo with situs zip", count: slcoTotals[0].with_zip },
    { metric: "SLCo with owner_mailing_address", count: slcoTotals[0].with_mailing },
  ]);

  console.log("\n--- 2a. SLCo cities post-enrichment ---");
  const { rows: slcoCities } = await client.query(
    `SELECT city, count(*) as count
     FROM properties
     WHERE county = 'salt lake'
     GROUP BY city
     ORDER BY count(*) DESC`
  );
  console.table(slcoCities);

  // ============================================================
  // 3. Emery situs population
  // ============================================================
  console.log("\n--- 3. Emery County situs ---");
  const { rows: emeryTotals } = await client.query(
    `SELECT
       count(*) as total,
       count(address) as with_address,
       count(city) as with_city,
       count(zip) as with_zip,
       count(*) FILTER (WHERE owner_mailing_address IS NOT NULL) as with_mailing
     FROM properties
     WHERE county = 'emery'`
  );
  console.table([
    { metric: "Emery total", count: emeryTotals[0].total },
    { metric: "Emery with situs address", count: emeryTotals[0].with_address },
    { metric: "Emery with situs city", count: emeryTotals[0].with_city },
    { metric: "Emery with situs zip", count: emeryTotals[0].with_zip },
    { metric: "Emery with owner_mailing_address", count: emeryTotals[0].with_mailing },
  ]);

  console.log("\n--- 3a. Emery non-local-city contamination (should be 0) ---");
  const EMERY_LOCAL = ["Castle Dale", "Huntington", "Orangeville", "Ferron", "Green River",
    "Cleveland", "Elmo", "Clawson", "Emery", "Castle Valley"];
  const { rows: emeryNonLocal } = await client.query(
    `SELECT city, count(*) as count
     FROM properties
     WHERE county = 'emery'
       AND city != ''
       AND city IS NOT NULL
       AND NOT (city = ANY($1::text[]))
     GROUP BY city
     ORDER BY count(*) DESC
     LIMIT 5`,
    [EMERY_LOCAL]
  );
  if (emeryNonLocal.length === 0) {
    console.log("  ✓ 0 Emery rows tagged with non-Emery cities (was 15,496)");
  } else {
    console.table(emeryNonLocal);
  }

  // ============================================================
  // 4. Out-of-state owner counts (Brian's todo)
  // ============================================================
  console.log("\n--- 4. Out-of-state owner counts (todo: out-of-state by signal type) ---");
  const { rows: outOfState } = await client.query(
    `SELECT s.signal_type,
            count(DISTINCT p.id) as total_with_signal,
            count(DISTINCT p.id) FILTER (WHERE p.owner_mailing_state IS NOT NULL AND p.owner_mailing_state != 'UT') as out_of_state,
            count(DISTINCT p.id) FILTER (WHERE p.owner_type = 'trust') as in_trust
     FROM properties p
     JOIN distress_signals s ON s.property_id = p.id
     GROUP BY s.signal_type
     ORDER BY total_with_signal DESC`
  );
  console.table(outOfState);

  // ============================================================
  // 5. Cross-tab: out-of-state AND in-trust
  // ============================================================
  console.log("\n--- 5. Cross-tab: out-of-state owner + in-trust by signal type ---");
  const { rows: crossTab } = await client.query(
    `SELECT s.signal_type,
            count(DISTINCT p.id) FILTER (
              WHERE p.owner_mailing_state IS NOT NULL
                AND p.owner_mailing_state != 'UT'
                AND p.owner_type = 'trust'
            ) as out_of_state_AND_trust
     FROM properties p
     JOIN distress_signals s ON s.property_id = p.id
     GROUP BY s.signal_type
     ORDER BY out_of_state_AND_trust DESC`
  );
  console.table(crossTab);

  // ============================================================
  // 6. Mailing state distribution (overall)
  // ============================================================
  console.log("\n--- 6. Owner mailing state distribution (top 10) ---");
  const { rows: stateDistribution } = await client.query(
    `SELECT owner_mailing_state, count(*) as count
     FROM properties
     WHERE owner_mailing_state IS NOT NULL
     GROUP BY owner_mailing_state
     ORDER BY count(*) DESC
     LIMIT 10`
  );
  console.table(stateDistribution);

  // ============================================================
  // 7. Dashboard impact preview (SLC target cities filter)
  // ============================================================
  console.log("\n--- 7. Dashboard impact: SLC city filter ---");
  const SLC_CITIES = ["Rose Park", "Salt Lake City", "Sugar House", "Midvale", "Sandy",
    "Murray", "Holladay", "Kearns", "West Valley City", "Cottonwood Heights",
    "Taylorsville", "West Jordan", "South Jordan", "Riverton", "Herriman",
    "Draper", "South Salt Lake", "Salt Lake County (other)"];
  const { rows: slcDashboard } = await client.query(
    `SELECT count(*) as count
     FROM properties
     WHERE LOWER(city) = ANY(SELECT LOWER(c) FROM unnest($1::text[]) c)`,
    [SLC_CITIES]
  );
  console.log(`  SLC properties currently visible on dashboard: ${slcDashboard[0].count}`);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
