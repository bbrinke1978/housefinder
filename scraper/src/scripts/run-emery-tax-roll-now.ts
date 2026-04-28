/**
 * One-shot manual trigger for the Emery County tax-roll scraper.
 *
 * After fixing the column priority bug (situs columns now win over mailing
 * columns), re-running this scraper repopulates situs for the Emery rows
 * whose address/city were NULL'd in the mailing-vs-situs backfill.
 *
 * Usage:
 *   cd scraper && npx tsx src/scripts/run-emery-tax-roll-now.ts
 *
 * Requires DATABASE_URL. The scraper logs the actual table header map at
 * startup — if PropertyAddress / PropertyCity columns don't exist, situs
 * will stay NULL (acceptable; mailing data was already preserved by the
 * backfill, and the fix does not regress the data).
 */
import { scrapeEmeryTaxRoll } from "../sources/emery-tax-roll.js";
import { upsertFromAssessor } from "../lib/upsert.js";

async function main() {
  console.log("\n=== Emery Tax Roll — manual run (post-mailing-vs-situs fix) ===\n");
  const startTime = Date.now();

  console.log("Step 1: Scraping Emery County tax-roll wpDataTable...");
  const records = await scrapeEmeryTaxRoll();
  console.log(`  Got ${records.length} property records.`);
  if (records.length > 0) {
    console.log("  Sample first 3 records:");
    for (const r of records.slice(0, 3)) {
      console.log(`    ${r.parcelId} | situs="${r.address}" / "${r.city}" | mailing="${r.mailingAddress}" / "${r.mailingCity}", ${r.mailingState} ${r.mailingZip}`);
    }
  }

  console.log("\nStep 2: Upserting records (situs + mailing into properties)...");
  const upsertResult = await upsertFromAssessor(records, "emery");
  console.log(`  Upserted ${upsertResult.upserted} properties.`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
