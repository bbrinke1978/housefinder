/**
 * Backfill: separate mailing from situs in the properties table.
 *
 * Two cohorts get the same treatment — copy contaminated address/city/zip
 * into the new owner_mailing_* columns, then NULL out the situs columns
 * so UGRC enrichment / re-scraping can repopulate them.
 *
 * Single transaction. Rolls back on any error.
 *
 * Usage: cd app && npx tsx scripts/backfill-mailing-vs-situs.ts
 *        cd app && npx tsx scripts/backfill-mailing-vs-situs.ts --execute
 *
 * Without --execute it's a dry-run (counts only, no writes).
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

const EXECUTE = process.argv.includes("--execute");

const SLC_CITIES = [
  "Rose Park", "Salt Lake City", "Sugar House", "Midvale", "Sandy",
  "Murray", "Holladay", "Kearns", "West Valley City", "Cottonwood Heights",
  "Taylorsville", "West Jordan", "South Jordan", "Riverton", "Herriman",
  "Draper", "South Salt Lake", "Salt Lake County (other)",
];

const EMERY_LOCAL_CITIES = [
  "Castle Dale", "Huntington", "Orangeville", "Ferron", "Green River",
  "Cleveland", "Elmo", "Clawson", "Emery", "Castle Valley",
];

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log(EXECUTE ? "=== EXECUTING BACKFILL ===" : "=== DRY RUN (counts only) ===");

  await client.query("BEGIN");
  try {
    // ====================================================================
    // COHORT 1: SLCo tax_lien rows in SLC target cities.
    // The slco-tax-delinquent scraper wrote owner mailing addresses
    // (TAX_SALE_ADDRESS) into address/city/zip. Move them to owner_mailing_*
    // and clear situs so UGRC enrichment can fill it in by parcel_id.
    // ====================================================================
    console.log("\n[Cohort 1] SLCo tax_lien rows...");
    const slcoSelect = `
      SELECT id, address, city, zip
      FROM properties p
      WHERE city = ANY($1::text[])
        AND EXISTS (
          SELECT 1 FROM distress_signals s
          WHERE s.property_id = p.id AND s.signal_type = 'tax_lien'
        )
    `;
    const { rows: slcoCohort } = await client.query(slcoSelect, [SLC_CITIES]);
    console.log(`  → ${slcoCohort.length} rows match cohort 1 selection`);

    if (EXECUTE) {
      const { rowCount: slcoUpdated } = await client.query(
        `UPDATE properties
         SET owner_mailing_address = COALESCE(NULLIF(owner_mailing_address, ''), address),
             owner_mailing_city    = COALESCE(NULLIF(owner_mailing_city, ''), city),
             owner_mailing_zip     = COALESCE(NULLIF(owner_mailing_zip, ''), zip),
             address = NULL,
             city    = NULL,
             zip     = NULL,
             updated_at = now()
         WHERE city = ANY($1::text[])
           AND EXISTS (
             SELECT 1 FROM distress_signals s
             WHERE s.property_id = properties.id AND s.signal_type = 'tax_lien'
           )`,
        [SLC_CITIES]
      );
      console.log(`  → UPDATED ${slcoUpdated} rows`);
    }

    // ====================================================================
    // COHORT 2: Emery rows tagged with non-Emery cities.
    // The emery-tax-roll scraper wrote owner mailing addresses (because the
    // wpDataTable's "City" column appears before "PropertyCity"). Cities
    // outside Emery County (Aberdeen, APO, Atlanta, Tucson, etc.) prove
    // these are mailing addresses. Move them and clear situs so the fixed
    // scraper's re-run can repopulate situs from PropertyAddress/PropertyCity.
    // ====================================================================
    console.log("\n[Cohort 2] Emery rows tagged with non-Emery cities...");
    const emerySelect = `
      SELECT id, address, city, zip
      FROM properties
      WHERE county = 'emery'
        AND city != ''
        AND city IS NOT NULL
        AND NOT (city = ANY($1::text[]))
    `;
    const { rows: emeryCohort } = await client.query(emerySelect, [EMERY_LOCAL_CITIES]);
    console.log(`  → ${emeryCohort.length} rows match cohort 2 selection`);

    if (EXECUTE) {
      const { rowCount: emeryUpdated } = await client.query(
        `UPDATE properties
         SET owner_mailing_address = COALESCE(NULLIF(owner_mailing_address, ''), address),
             owner_mailing_city    = COALESCE(NULLIF(owner_mailing_city, ''), city),
             owner_mailing_zip     = COALESCE(NULLIF(owner_mailing_zip, ''), zip),
             address = NULL,
             city    = NULL,
             zip     = NULL,
             updated_at = now()
         WHERE county = 'emery'
           AND city != ''
           AND city IS NOT NULL
           AND NOT (city = ANY($1::text[]))`,
        [EMERY_LOCAL_CITIES]
      );
      console.log(`  → UPDATED ${emeryUpdated} rows`);
    }

    // ====================================================================
    // COHORT 3: Emery rows tagged with LOCAL Emery cities but PO-Box address.
    // Even when the city tag is local, a PO Box address is unambiguously
    // mailing. Move those too. (Earlier snapshot showed 0 such rows on the
    // current dataset; this is a defense-in-depth pass.)
    // ====================================================================
    console.log("\n[Cohort 3] Emery rows with PO Box address (local-tagged)...");
    const emeryPoBoxSelect = `
      SELECT id, address, city, zip
      FROM properties
      WHERE county = 'emery'
        AND address ~* '^p\\.?\\s*o\\.?\\s+box'
        AND city = ANY($1::text[])
    `;
    const { rows: emeryPoBox } = await client.query(emeryPoBoxSelect, [EMERY_LOCAL_CITIES]);
    console.log(`  → ${emeryPoBox.length} rows match cohort 3 selection`);

    if (EXECUTE) {
      const { rowCount: poBoxUpdated } = await client.query(
        `UPDATE properties
         SET owner_mailing_address = COALESCE(NULLIF(owner_mailing_address, ''), address),
             owner_mailing_city    = COALESCE(NULLIF(owner_mailing_city, ''), city),
             owner_mailing_zip     = COALESCE(NULLIF(owner_mailing_zip, ''), zip),
             address = NULL,
             city    = NULL,
             zip     = NULL,
             updated_at = now()
         WHERE county = 'emery'
           AND address ~* '^p\\.?\\s*o\\.?\\s+box'
           AND city = ANY($1::text[])`,
        [EMERY_LOCAL_CITIES]
      );
      console.log(`  → UPDATED ${poBoxUpdated} rows`);
    }

    // ====================================================================
    // VERIFY (inside transaction)
    // ====================================================================
    console.log("\n=== POST-BACKFILL VERIFICATION ===");
    const { rows: nullCity } = await client.query(
      `SELECT count(*) as count FROM properties WHERE city IS NULL`
    );
    const { rows: hasMailing } = await client.query(
      `SELECT count(*) as count FROM properties
       WHERE owner_mailing_address IS NOT NULL OR owner_mailing_city IS NOT NULL`
    );
    const { rows: situsLeft } = await client.query(
      `SELECT count(*) as count FROM properties WHERE address IS NOT NULL OR city IS NOT NULL`
    );
    console.table([
      { metric: "Properties with NULL city (situs unknown)", count: nullCity[0].count },
      { metric: "Properties with owner_mailing_* populated", count: hasMailing[0].count },
      { metric: "Properties still with situs (address or city)", count: situsLeft[0].count },
    ]);

    if (EXECUTE) {
      await client.query("COMMIT");
      console.log("\n✓ COMMITTED");
    } else {
      await client.query("ROLLBACK");
      console.log("\n(dry-run: rolled back)");
      console.log("Re-run with --execute to apply.");
    }
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("\nFAILED — rolled back");
    console.error(err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
