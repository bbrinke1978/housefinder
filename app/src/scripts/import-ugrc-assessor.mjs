/**
 * import-ugrc-assessor.mjs
 *
 * Downloads UGRC LIR (Land Information Records) parcel data for our target
 * counties and enriches the properties table with assessor details.
 *
 * Fields imported: building_sqft, year_built, assessed_value, lot_acres
 * Matched by: parcel_id
 * Policy: only UPDATE — never overwrites existing non-null values with null.
 *
 * Usage:
 *   node src/scripts/import-ugrc-assessor.mjs                    # All counties (4 rural + SLC 84116)
 *   node src/scripts/import-ugrc-assessor.mjs --county=salt-lake # SLC only
 *   node src/scripts/import-ugrc-assessor.mjs --dry-run          # No DB writes; shows what would change
 *
 * Requires DATABASE_URL in environment or pass on CLI.
 */

import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  console.error("Example: DATABASE_URL=postgresql://... node src/scripts/import-ugrc-assessor.mjs");
  process.exit(1);
}

// UGRC ArcGIS FeatureServer base
const ARCGIS_BASE =
  "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services";

// County LIR layers for our target counties.
//
// Rural counties (Carbon, Emery, Juab, Millard) use fetchAllFeatures() with
// a simple where=1=1 full-layer pull — these layers are small enough.
//
// Salt Lake County (84116 / Rose Park) uses fetchFromAllowlist() driven by a
// pre-built parcel-ID allowlist. The Parcels_SaltLake_LIR layer has no zip
// code field, so zip-filter is impossible. Instead we batch 8,270 parcel IDs
// from the allowlist into 42 POST requests (~100 IDs each). See Phase 26
// RESEARCH.md for the full analysis (Option B).
const COUNTIES = [
  { name: "Carbon", service: "Parcels_Carbon_LIR" },
  { name: "Emery", service: "Parcels_Emery_LIR" },
  { name: "Juab", service: "Parcels_Juab_LIR" },
  { name: "Millard", service: "Parcels_Millard_LIR" },
  {
    name: "Salt Lake (84116)",
    service: "Parcels_SaltLake_LIR",
    allowlistPath: path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../scraper/data/rose-park-parcel-allowlist.json"
    ),
  },
];

const FIELDS = "PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,PARCEL_ACRES,PROP_CLASS,PARCEL_ADD,PARCEL_CITY";
const PAGE_SIZE = 1000; // ArcGIS default max

/**
 * Normalize a parcel ID for comparison: strip hyphens, dots, and spaces,
 * uppercase. Both UGRC PARCEL_ID and DB parcel_id values are normalized
 * before matching to handle format differences across counties.
 */
function normalizeParcelId(raw) {
  if (!raw) return null;
  return raw.replace(/[\s\-\.]/g, '').toUpperCase().trim();
}

/**
 * Fetch all features from an ArcGIS FeatureServer layer using pagination.
 * Returns an array of attribute objects.
 *
 * @param {string} serviceName - UGRC ArcGIS FeatureServer service name
 * @param {string} [where="1=1"] - Optional ArcGIS WHERE clause (e.g. "PARCEL_ZIP='84116'")
 */
async function fetchAllFeatures(serviceName, where = "1=1") {
  const url = `${ARCGIS_BASE}/${serviceName}/FeatureServer/0/query`;
  let offset = 0;
  const all = [];

  while (true) {
    const params = new URLSearchParams({
      where,
      outFields: FIELDS,
      returnGeometry: "false",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      f: "json",
    });

    const res = await fetch(`${url}?${params}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${serviceName}`);
    }

    const data = await res.json();

    if (data.error) {
      throw new Error(`ArcGIS error: ${JSON.stringify(data.error)}`);
    }

    const features = data.features ?? [];
    for (const f of features) {
      all.push(f.attributes);
    }

    console.log(
      `  Fetched ${all.length} records (page offset ${offset})...`
    );

    // Exit only when ArcGIS confirms no more records AND didn't hit a transfer limit.
    // exceededTransferLimit: true means the server capped results below PAGE_SIZE —
    // we must keep paginating even though features.length < PAGE_SIZE.
    const hitLimit = data.exceededTransferLimit === true;
    if (!hitLimit && features.length < PAGE_SIZE) break;
    if (features.length === 0) break; // Safety: never infinite-loop on empty page
    offset += PAGE_SIZE;
  }

  return all;
}

/**
 * Fetch features from an ArcGIS FeatureServer layer using a parcel-ID allowlist.
 * Uses POST requests (application/x-www-form-urlencoded) to avoid GET URL length
 * limits when batching large IN clauses.
 *
 * Returns an array of attribute objects (same shape as fetchAllFeatures).
 *
 * @param {string} serviceName - UGRC ArcGIS FeatureServer service name
 * @param {string[]} parcelIds - Array of normalized parcel ID strings
 * @param {number} [batchSize=100] - Number of parcel IDs per POST request
 */
async function fetchFromAllowlist(serviceName, parcelIds, batchSize = 100) {
  const url = `${ARCGIS_BASE}/${serviceName}/FeatureServer/0/query`;
  const all = [];
  const totalBatches = Math.ceil(parcelIds.length / batchSize);

  for (let i = 0; i < totalBatches; i++) {
    const batch = parcelIds.slice(i * batchSize, (i + 1) * batchSize);
    const quoted = batch.map((id) => `'${id}'`).join(",");
    const where = `PARCEL_ID IN (${quoted})`;

    const body = new URLSearchParams({
      where,
      outFields: FIELDS,
      returnGeometry: "false",
      f: "json",
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status} from ${serviceName} on batch ${i + 1}/${totalBatches}`
      );
    }

    const data = await res.json();

    if (data.error) {
      throw new Error(
        `ArcGIS error on batch ${i + 1}/${totalBatches}: ${JSON.stringify(data.error)}`
      );
    }

    const features = data.features ?? [];
    for (const f of features) {
      all.push(f.attributes);
    }

    console.log(
      `  Allowlist batch ${i + 1}/${totalBatches}: fetched ${features.length} records (cumulative ${all.length})`
    );
  }

  return all;
}

/**
 * For parcels that have multiple building records with the same PARCEL_ID,
 * aggregate by summing BLDG_SQFT and taking the first non-null for other fields.
 */
function aggregateByParcelId(features) {
  const map = new Map();

  for (const f of features) {
    const pid = normalizeParcelId(f.PARCEL_ID);
    if (!pid) continue;

    if (!map.has(pid)) {
      map.set(pid, {
        parcelId: pid,   // now stores the normalized form
        buildingSqft: f.BLDG_SQFT ?? null,
        yearBuilt: f.BUILT_YR ?? null,
        assessedValue:
          f.TOTAL_MKT_VALUE != null ? Math.round(f.TOTAL_MKT_VALUE) : null,
        lotAcres: f.PARCEL_ACRES ?? null,
        // Property situs — UGRC is the canonical source for SLC parcels.
        // Used to fill in address/city after backfill cleared mailing-as-situs.
        address: f.PARCEL_ADD ? f.PARCEL_ADD.trim() : null,
        city: f.PARCEL_CITY ? f.PARCEL_CITY.trim() : null,
      });
    } else {
      // Additional building record for same parcel — sum sqft
      const existing = map.get(pid);
      if (f.BLDG_SQFT != null) {
        existing.buildingSqft = (existing.buildingSqft ?? 0) + f.BLDG_SQFT;
      }
      // Keep earliest year_built
      if (f.BUILT_YR != null && (existing.yearBuilt == null || f.BUILT_YR < existing.yearBuilt)) {
        existing.yearBuilt = f.BUILT_YR;
      }
    }
  }

  return Array.from(map.values());
}

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log("Connected to database.");

  // Optional CLI flags
  const countyFilterArg = process.argv.find((a) => a.startsWith("--county="));
  const countyFilter = countyFilterArg ? countyFilterArg.split("=")[1].toLowerCase() : null;

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("DRY RUN MODE: no DB writes will be performed.");
  }

  const countiesToRun = countyFilter
    ? COUNTIES.filter((c) => c.name.toLowerCase().replace(/\s+/g, "-").includes(countyFilter))
    : COUNTIES;

  if (countyFilter) {
    console.log(`County filter active: --county=${countyFilter}`);
    console.log(`Will run: ${countiesToRun.map((c) => c.name).join(", ") || "(none — filter matched zero counties)"}`);
    if (countiesToRun.length === 0) process.exit(1);
  }

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalNoMatch = 0;

  for (const county of countiesToRun) {
    console.log(`\n== ${county.name} County ==`);
    console.log(`Fetching from ${county.service}...`);

    let features;
    try {
      if (county.allowlistPath) {
        const raw = fs.readFileSync(county.allowlistPath, "utf-8");
        const allowlist = JSON.parse(raw);
        console.log(`  Loaded allowlist: ${allowlist.parcelCount} parcels (zip ${allowlist.zip})`);
        features = await fetchFromAllowlist(county.service, allowlist.parcelIds);
      } else {
        features = await fetchAllFeatures(county.service, county.where);
      }
    } catch (err) {
      console.error(`  ERROR fetching ${county.name}: ${err.message}`);
      continue;
    }

    console.log(`  Total raw records: ${features.length}`);
    const parcels = aggregateByParcelId(features);
    console.log(`  Unique parcels after aggregation: ${parcels.length}`);

    let countyUpdated = 0;
    let countySkipped = 0;
    let countyNoMatch = 0;

    for (const parcel of parcels) {
      let res;
      if (dryRun) {
        // In dry-run, run a SELECT to determine if this parcel would be updated.
        // We mirror the WHERE clause to count rows that match.
        const probe = await client.query(
          `SELECT id, building_sqft, year_built, assessed_value, lot_acres
           FROM properties
           WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1`,
          [parcel.parcelId]
        );
        // Build a synthetic res-like object so the existing rowCount/match-fallback logic still works
        res = {
          rowCount:
            probe.rowCount > 0 &&
            (parcel.buildingSqft != null ||
              parcel.yearBuilt != null ||
              parcel.assessedValue != null ||
              parcel.lotAcres != null)
              ? probe.rowCount
              : 0,
        };
      } else {
        // Only update fields that have data in UGRC; never null out existing data
        // We use COALESCE so existing non-null values are preserved if UGRC sends null
        res = await client.query(
          `UPDATE properties SET
             building_sqft  = COALESCE(building_sqft,  $2::integer),
             year_built     = COALESCE(year_built,     $3::integer),
             assessed_value = COALESCE(assessed_value, $4::integer),
             lot_acres      = COALESCE(lot_acres,      $5::numeric),
             address        = COALESCE(address,        $6::text),
             city           = COALESCE(city,           $7::text),
             updated_at     = NOW()
           WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1
           AND ($2::integer IS NOT NULL OR $3::integer IS NOT NULL OR $4::integer IS NOT NULL OR $5::numeric IS NOT NULL OR $6::text IS NOT NULL OR $7::text IS NOT NULL)
           RETURNING id`,
          [
            parcel.parcelId,
            parcel.buildingSqft,
            parcel.yearBuilt,
            parcel.assessedValue,
            parcel.lotAcres,
            parcel.address,
            parcel.city,
          ]
        );
      }

      if (res.rowCount > 0) {
        countyUpdated++;
      } else {
        // Check if it's a no-match or just no data to set
        const check = await client.query(
          "SELECT id FROM properties WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1 LIMIT 1",
          [parcel.parcelId]
        );
        if (check.rowCount === 0) {
          countyNoMatch++;
        } else {
          countySkipped++;
        }
      }
    }

    console.log(`  Updated: ${countyUpdated}`);
    console.log(`  Skipped (no UGRC data): ${countySkipped}`);
    console.log(`  No match in our DB: ${countyNoMatch}`);
    totalUpdated += countyUpdated;
    totalSkipped += countySkipped;
    totalNoMatch += countyNoMatch;
  }

  console.log("\n== Summary ==");
  console.log(`${dryRun ? "WOULD update" : "Total properties enriched"}: ${totalUpdated}`);
  console.log(`Skipped (no assessor data): ${totalSkipped}`);
  console.log(`No parcel_id match in our DB: ${totalNoMatch}`);

  await client.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
