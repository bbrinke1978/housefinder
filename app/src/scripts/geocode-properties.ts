/**
 * One-time batch geocoding script.
 * Reads all properties without lat/lng, geocodes via Mapbox Geocoding API, updates DB.
 *
 * Usage: cd app && npx tsx src/scripts/geocode-properties.ts
 * Requires: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable
 */

import { db } from "../db/client";
import { properties } from "../db/schema";
import { eq, isNull, or } from "drizzle-orm";

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

async function main() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "Error: NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable is required"
    );
    process.exit(1);
  }

  // Find all properties without coordinates
  const ungeocodedProps = await db
    .select({
      id: properties.id,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      zip: properties.zip,
    })
    .from(properties)
    .where(or(isNull(properties.latitude), isNull(properties.longitude)));

  if (ungeocodedProps.length === 0) {
    console.log("All properties already geocoded. Nothing to do.");
    process.exit(0);
  }

  console.log(`Found ${ungeocodedProps.length} properties to geocode`);

  let successCount = 0;
  let failCount = 0;
  let totalDone = 0;

  // Process in batches
  for (let i = 0; i < ungeocodedProps.length; i += BATCH_SIZE) {
    const batch = ungeocodedProps.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    for (const prop of batch) {
      const query = [prop.address, prop.city, prop.state, prop.zip]
        .filter(Boolean)
        .join(", ");

      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1&country=US&types=address`;
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(
            `  [WARN] API error for "${prop.address}": ${res.status} ${res.statusText}`
          );
          failCount++;
          totalDone++;
          continue;
        }

        const data = await res.json();

        if (!data.features || data.features.length === 0) {
          console.warn(
            `  [WARN] No results for "${prop.address}, ${prop.city}"`
          );
          failCount++;
          totalDone++;
          continue;
        }

        const [lng, lat] = data.features[0].center;

        await db
          .update(properties)
          .set({ latitude: lat, longitude: lng })
          .where(eq(properties.id, prop.id));

        successCount++;
      } catch (err) {
        console.warn(
          `  [WARN] Failed to geocode "${prop.address}": ${err instanceof Error ? err.message : err}`
        );
        failCount++;
      }

      totalDone++;
    }

    console.log(
      `Batch ${batchNum}: geocoded ${batch.length} (${totalDone}/${ungeocodedProps.length} total)`
    );

    // Rate limit delay between batches
    if (i + BATCH_SIZE < ungeocodedProps.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`\nGeocoding complete:`);
  console.log(`  Total:   ${ungeocodedProps.length}`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed:  ${failCount}`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
