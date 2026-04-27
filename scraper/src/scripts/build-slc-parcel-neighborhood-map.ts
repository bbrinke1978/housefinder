/**
 * build-slc-parcel-neighborhood-map.ts
 *
 * Path A follow-on to Phase 25.5 (Option C-2): Build a county-wide parcel-ID ->
 * {zip, city/neighborhood} map for ALL of Salt Lake County by querying the
 * UGRC SaltLake_County_Addresses ArcGIS FeatureServer with no zip restriction.
 *
 * Output: scraper/data/slc-parcel-neighborhood-map.json
 *   {
 *     "generatedAt": "...",
 *     "source": "...",
 *     "addressCount": ...,
 *     "parcelCount": ...,
 *     "parcels": {
 *       "08343030220000": { "zip": "84116", "city": "Rose Park" },
 *       "21171790050000": { "zip": "84121", "city": "Cottonwood Heights" },
 *       ...
 *     }
 *   }
 *
 * Why: The Phase 25.5 84116-only allowlist discarded ~145 SLC NOD notices/week
 * that were in Sandy, Midvale, Holladay, West Valley, etc. This map captures
 * ALL SLC County parcels and tags each with its neighborhood so utah-legals.ts
 * can correctly route every SLC notice instead of dropping it.
 *
 * Usage:
 *   cd scraper && npx tsx src/scripts/build-slc-parcel-neighborhood-map.ts
 *
 * Re-run annually or when significant subdivision activity occurs.
 * The 84116/Rose Park path remains unaffected — this file is a superset of
 * the old rose-park-parcel-allowlist.json.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ARCGIS_BASE =
  "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services";
const SERVICE = "SaltLake_County_Addresses";
const PAGE_SIZE = 1000;
const OUTFIELDS = "ParcelID,FullAdd,ZipCode,City";

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  "data",
  "slc-parcel-neighborhood-map.json"
);

/**
 * Hardcoded zip -> neighborhood name for Salt Lake County zips.
 * Sources: US Census ZIP Code Tabulation Areas, USPS city names,
 * SLC neighborhood maps (slc.gov), and county jurisdiction boundaries.
 *
 * For any zip not listed here, neighborhood defaults to
 * "Salt Lake County (other)" — the zip is still preserved in the output.
 */
const ZIP_TO_NEIGHBORHOOD: Record<string, string> = {
  // Salt Lake City proper neighborhoods
  "84101": "Salt Lake City",
  "84102": "Salt Lake City",
  "84103": "Salt Lake City",
  "84104": "Salt Lake City",
  "84105": "Sugar House",
  "84106": "Sugar House",
  "84108": "Salt Lake City",
  "84109": "Salt Lake City",
  "84111": "Salt Lake City",
  "84112": "Salt Lake City",
  "84113": "Salt Lake City",
  "84114": "Salt Lake City",
  "84116": "Rose Park",

  // Independent cities / unincorporated communities
  "84047": "Midvale",
  "84070": "Sandy",
  "84092": "Sandy",
  "84093": "Sandy",
  "84094": "Sandy",
  "84107": "Murray",
  "84117": "Holladay",
  "84118": "Kearns",
  "84119": "West Valley City",
  "84120": "West Valley City",
  "84121": "Cottonwood Heights",
  "84123": "Murray",
  "84124": "Holladay",
  "84128": "West Valley City",
  "84129": "Taylorsville",
  "84084": "West Jordan",
  "84088": "West Jordan",
  "84095": "South Jordan",
  "84065": "Riverton",
  "84096": "Herriman",

  // Draper spans SL and Utah counties
  "84020": "Draper",

  // South Salt Lake (independent city)
  "84115": "South Salt Lake",
};

function neighborhoodForZip(zip: string): string {
  return ZIP_TO_NEIGHBORHOOD[zip] ?? "Salt Lake County (other)";
}

interface Feature {
  attributes: {
    ParcelID: string | null;
    FullAdd: string | null;
    ZipCode: string | null;
    City: string | null;
  };
}

interface ArcGisResponse {
  features?: Feature[];
  exceededTransferLimit?: boolean;
  error?: { code: number; message: string };
}

function normalizeParcelId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[\s\-\.]/g, "").toUpperCase().trim();
  return cleaned.length > 0 ? cleaned : null;
}

async function fetchPage(url: string, params: URLSearchParams, attempt = 1): Promise<ArcGisResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout
  try {
    const res = await fetch(`${url}?${params}`, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${SERVICE}`);
    }
    return (await res.json()) as ArcGisResponse;
  } catch (err: unknown) {
    if (attempt < 3) {
      const wait = attempt * 5000;
      console.log(`  Fetch error (attempt ${attempt}/3), retrying in ${wait / 1000}s: ${err instanceof Error ? err.message : String(err)}`);
      await new Promise((r) => setTimeout(r, wait));
      return fetchPage(url, params, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAllAddresses(): Promise<Feature["attributes"][]> {
  const url = `${ARCGIS_BASE}/${SERVICE}/FeatureServer/0/query`;
  const all: Feature["attributes"][] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      where: "ZipCode IS NOT NULL",
      outFields: OUTFIELDS,
      returnGeometry: "false",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      f: "json",
    });

    const data = await fetchPage(url, params);
    if (data.error) {
      throw new Error(
        `ArcGIS error: ${data.error.code} ${data.error.message}`
      );
    }

    const features = data.features ?? [];
    for (const f of features) all.push(f.attributes);

    console.log(
      `  Fetched ${all.length} addresses total (page offset ${offset}, page size ${features.length})...`
    );

    const hitLimit = data.exceededTransferLimit === true;
    if (!hitLimit && features.length < PAGE_SIZE) break;
    if (features.length === 0) break;
    offset += PAGE_SIZE;
  }

  return all;
}

async function main() {
  console.log(
    `=== Building SLC County-Wide Parcel Neighborhood Map from UGRC ${SERVICE} ===\n`
  );
  console.log(
    `Query: ${ARCGIS_BASE}/${SERVICE}/FeatureServer/0/query\n`
  );

  const addresses = await fetchAllAddresses();
  console.log(`\nTotal address records fetched: ${addresses.length}`);

  // Parcel map: normalizedParcelId -> {zip, city}
  // When multiple addresses share a parcel, last-write-wins for zip/city
  // (they should all agree since UGRC is authoritative for zip assignment).
  const parcels: Record<string, { zip: string; city: string }> = {};
  const zipCounts: Record<string, number> = {};
  let nullParcelCount = 0;
  let nullZipCount = 0;
  let unknownZipCount = 0;

  for (const a of addresses) {
    const normalized = normalizeParcelId(a.ParcelID);
    if (!normalized) {
      nullParcelCount++;
      continue;
    }

    const zip = (a.ZipCode ?? "").toString().trim().substring(0, 5);
    if (!zip) {
      nullZipCount++;
      continue;
    }

    const city = neighborhoodForZip(zip);
    if (city === "Salt Lake County (other)") unknownZipCount++;

    parcels[normalized] = { zip, city };
    zipCounts[zip] = (zipCounts[zip] ?? 0) + 1;
  }

  const parcelCount = Object.keys(parcels).length;
  console.log(`\nUnique normalized parcel IDs: ${parcelCount}`);
  console.log(`Addresses with no parcel ID (skipped): ${nullParcelCount}`);
  console.log(`Addresses with no zip (skipped): ${nullZipCount}`);
  console.log(`Parcels with unmapped zip (Salt Lake County other): ${unknownZipCount}`);

  console.log(`\nZip distribution (top 20 by address count):`);
  const sortedZips = Object.entries(zipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  for (const [zip, count] of sortedZips) {
    console.log(`  ${zip} (${neighborhoodForZip(zip)}): ${count} addresses`);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: `${ARCGIS_BASE}/${SERVICE}`,
    addressCount: addresses.length,
    parcelCount,
    parcels,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  const sizeKb = Math.round(JSON.stringify(output).length / 1024);
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`File size: ~${sizeKb} KB`);
  console.log(`\nDone. Re-run annually or after major SLC subdivision activity.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
