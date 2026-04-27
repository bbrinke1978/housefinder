/**
 * One-shot manual trigger for the Utah Legals scrape pipeline.
 * Runs the same code path as utahLegalsScrape.ts (the Azure Function timer
 * trigger) but invocable from the CLI for immediate validation.
 *
 * Used after Phase 25.5 Path A to surface SLC neighborhood NODs into the
 * production DB without waiting for the next scheduled run.
 *
 * Usage:
 *   cd scraper && npx tsx src/scripts/run-utah-legals-now.ts
 *
 * Requires DATABASE_URL in environment.
 */

import { scrapeUtahLegalsForeclosures } from "../sources/utah-legals.js";
import { upsertFromUtahLegals } from "../lib/upsert.js";
import { scoreAllProperties } from "../scoring/score.js";

async function main() {
  console.log("\n=== Utah Legals manual run (Path A SLC verification) ===\n");
  const startTime = Date.now();

  // Step 1: scrape
  console.log("Step 1: Scraping utahlegals.com...");
  const notices = await scrapeUtahLegalsForeclosures();
  console.log(`  Scraped ${notices.length} notices total.`);
  const slcNotices = notices.filter((n) => n.county === "salt lake");
  console.log(`  SLC notices (passed parcel-allowlist): ${slcNotices.length}`);
  if (slcNotices.length > 0) {
    console.log(`  Sample SLC tagged cities:`, [...new Set(slcNotices.slice(0, 10).map((n) => n.city))].join(", "));
  }

  // Step 2: upsert
  console.log("\nStep 2: Upserting notices...");
  const upsertResult = await upsertFromUtahLegals(notices);
  console.log(`  Upserted ${upsertResult.upserted} properties, ${upsertResult.signals} NOD signals.`);

  // Step 3: re-score
  console.log("\nStep 3: Re-scoring all properties...");
  const scoreResult = await scoreAllProperties();
  console.log(`  Scored ${scoreResult.scored} properties, ${scoreResult.hot} flagged hot.`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== Done in ${elapsed}s ===`);
  console.log(`Check the dashboard now — SLC neighborhoods should be visible in the city filter.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
