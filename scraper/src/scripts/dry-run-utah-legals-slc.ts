/**
 * Dry-run script for Phase 25.5 — Utah Legals SLC Activation
 *
 * Runs scrapeUtahLegalsForeclosures() and prints a diagnostic report:
 *   - County values from SLC results (confirms index 17 = "Salt Lake" not "Utah")
 *   - City values from SLC results (validates allowlist coverage)
 *   - Parcel IDs extracted vs synthetic (validates regex branches)
 *   - Count of notices before and after 84116 city filter
 *
 * NO database writes occur. Safe to run anytime.
 *
 * Usage:
 *   cd scraper && npx ts-node --esm src/scripts/dry-run-utah-legals-slc.ts
 */
import { scrapeUtahLegalsForeclosures } from "../sources/utah-legals.js";

async function main() {
  console.log("=== DRY RUN: Utah Legals SLC Activation (Phase 25.5) ===");
  console.log("No database writes will occur.\n");

  const notices = await scrapeUtahLegalsForeclosures();

  const slcNotices = notices.filter((n) => n.county === "salt lake");
  const ruralNotices = notices.filter((n) => n.county !== "salt lake");

  console.log("\n--- SUMMARY ---");
  console.log(`Total notices: ${notices.length}`);
  console.log(`  SLC notices (after allowlist): ${slcNotices.length}`);
  console.log(`  Rural notices (carbon/emery/juab/millard): ${ruralNotices.length}`);

  if (slcNotices.length > 0) {
    const uniqueCounties = [...new Set(notices.map((n) => n.county))];
    console.log(`\nCounty values seen (ALL notices): ${JSON.stringify(uniqueCounties)}`);
    // VERIFY: "salt lake" should appear; "utah" should NOT (would mean index 18 was used)

    const uniqueCities = [...new Set(slcNotices.map((n) => n.city || "(empty)"))];
    console.log(`City values in SLC notices (post-filter): ${JSON.stringify(uniqueCities)}`);

    const withParcel = slcNotices.filter((n) => n.parcelId && !n.parcelId.startsWith("ul-"));
    const synthetic = slcNotices.filter((n) => !n.parcelId || n.parcelId.startsWith("ul-"));
    const noParcel = slcNotices.filter((n) => !n.parcelId);
    console.log(`\nSLC parcel extraction:`);
    console.log(`  Real parcel IDs: ${withParcel.length}`);
    console.log(`  Synthetic (ul-) IDs: ${synthetic.length}`);
    console.log(`  No parcel at all: ${noParcel.length}`);

    console.log(`\nSample SLC notices (first 5):`);
    slcNotices.slice(0, 5).forEach((n, i) => {
      console.log(`  [${i + 1}] parcel=${n.parcelId ?? "NONE"} city="${n.city}" zip=${n.zip} addr="${n.propertyAddress ?? "none"}"`);
    });
  } else {
    console.log("\nNo SLC notices found after allowlist filter.");
    console.log("Check: Did index 17 select the right county? Are there active SLC NODs this week?");
  }

  console.log("\n=== DRY RUN COMPLETE — no DB changes ===");
}

main().catch((err) => {
  console.error("Dry run failed:", err);
  process.exit(1);
});
