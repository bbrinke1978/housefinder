/**
 * update-target-cities-slc.ts
 *
 * One-shot script: UPSERT the expanded target_cities list into the production
 * scraper_config table, adding all Salt Lake County neighborhoods added in
 * Path A (2026-04-17) follow-on to Phase 25.5.
 *
 * Preserves existing rural-county cities; adds SLC neighborhoods.
 * Safe to re-run (idempotent — ON CONFLICT DO UPDATE).
 *
 * Usage:
 *   cd scraper && DATABASE_URL="..." npx tsx src/scripts/update-target-cities-slc.ts
 *
 * Or with a local .env file that exports DATABASE_URL:
 *   cd scraper && npx tsx --env-file=.env src/scripts/update-target-cities-slc.ts
 */

import { db, pool } from "../db/client.js";
import { scraperConfig } from "../db/schema.js";
import { eq } from "drizzle-orm";

const NEW_TARGET_CITIES = [
  // Rural counties (existing)
  "Price",
  "Huntington",
  "Castle Dale",
  "Richfield",
  "Nephi",
  "Ephraim",
  "Manti",
  "Fillmore",
  "Delta",
  // Salt Lake County — neighborhoods derived from UGRC zip mapping
  "Rose Park",
  "Salt Lake City",
  "Sugar House",
  "Midvale",
  "Sandy",
  "Murray",
  "Holladay",
  "Kearns",
  "West Valley City",
  "Cottonwood Heights",
  "Taylorsville",
  "West Jordan",
  "South Jordan",
  "Riverton",
  "Herriman",
  "Draper",
  "South Salt Lake",
  "Salt Lake County (other)",
];

async function main() {
  console.log("=== Updating scraper_config.target_cities for Path A SLC expansion ===\n");

  // Read current value
  const existing = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, "target_cities"))
    .limit(1);

  if (existing.length > 0) {
    try {
      const current = JSON.parse(existing[0].value) as string[];
      console.log(`Current target_cities (${current.length}): ${current.join(", ")}`);
    } catch {
      console.log(`Current target_cities (raw): ${existing[0].value}`);
    }
  } else {
    console.log("No existing target_cities row found — will insert.");
  }

  const newValue = JSON.stringify(NEW_TARGET_CITIES);
  console.log(`\nNew target_cities (${NEW_TARGET_CITIES.length}): ${NEW_TARGET_CITIES.join(", ")}`);

  await db
    .insert(scraperConfig)
    .values({
      key: "target_cities",
      value: newValue,
    })
    .onConflictDoUpdate({
      target: scraperConfig.key,
      set: { value: newValue },
    });

  console.log("\nDone. scraper_config.target_cities updated successfully.");
  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
