/**
 * One-shot manual trigger for the SLCo tax-delinquent pipeline:
 *   1. Pull the SLCo Auditor TaxMQ JSON list
 *   2. Upsert properties + tax_lien signals via existing upsertFromDelinquent
 *      (which routes through normalizeCity for SLC neighborhood retag)
 *   3. Re-score all properties (so SLC properties with stacked NOD + tax_lien
 *      signals jump from score 3 to score 5+, crossing the hot threshold of 4)
 *
 * Usage:
 *   cd scraper && npx tsx src/scripts/run-slco-tax-delinquent-now.ts
 *
 * Requires DATABASE_URL.
 */

import { scrapeSlcoTaxDelinquent } from "../sources/slco-tax-delinquent.js";
import { upsertFromDelinquent } from "../lib/upsert.js";
import { scoreAllProperties } from "../scoring/score.js";

async function main() {
  console.log("\n=== SLCo Tax Delinquent — manual run (Path A signal stacking) ===\n");
  const startTime = Date.now();

  // Step 1: scrape
  console.log("Step 1: Pulling SLCo Auditor TaxMQ list...");
  const records = await scrapeSlcoTaxDelinquent();
  console.log(`  Got ${records.length} delinquent records.`);
  if (records.length > 0) {
    const cities = [...new Set(records.slice(0, 50).map((r) => r.propertyCity).filter(Boolean))];
    console.log(`  Sample cities: ${cities.slice(0, 10).join(", ")}`);
  }

  // Step 2: upsert
  console.log("\nStep 2: Upserting records (creates properties + tax_lien signals)...");
  const upsertResult = await upsertFromDelinquent(records, "salt lake");
  console.log(`  Upserted ${upsertResult.upserted} properties, ${upsertResult.signals} tax_lien signals.`);

  // Step 3: re-score
  console.log("\nStep 3: Re-scoring all properties...");
  const scoreResult = await scoreAllProperties();
  console.log(`  Scored ${scoreResult.scored} properties, ${scoreResult.hot} flagged hot.`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);
  console.log(`Check the dashboard — SLC properties that had ONLY a NOD signal may now`);
  console.log(`stack with tax_lien and cross the hot-lead threshold.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
