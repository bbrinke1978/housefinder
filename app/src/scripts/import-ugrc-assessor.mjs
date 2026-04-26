/**
 * import-ugrc-assessor.mjs
 *
 * Downloads UGRC LIR (Land Information Records) parcel data for our 4 target
 * counties and enriches the properties table with assessor details.
 *
 * Fields imported: building_sqft, year_built, assessed_value, lot_acres
 * Matched by: parcel_id
 * Policy: only UPDATE — never overwrites existing non-null values with null.
 *
 * Usage:
 *   node src/scripts/import-ugrc-assessor.mjs
 *
 * Requires DATABASE_URL in environment or pass on CLI.
 */

import pg from "pg";

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

// County LIR layers for our 4 target counties
//
// NOTE: Salt Lake County was attempted in Phase 26 (v1.3) but rolled back —
// the UGRC Parcels_SaltLake_LIR layer has NO zip code field at all
// (no PARCEL_ZIP, no ZIP_CODE), and the service name was wrong (it's
// Parcels_SaltLake_LIR, not Parcels_Salt_Lake_LIR). Adding SLC requires
// either a different layer (Address Points) or a follow-on phase that
// ingests by parcel-id list rather than zip filter. See ROADMAP.md
// Phase 26 notes for the re-org.
const COUNTIES = [
  { name: "Carbon", service: "Parcels_Carbon_LIR" },
  { name: "Emery", service: "Parcels_Emery_LIR" },
  { name: "Juab", service: "Parcels_Juab_LIR" },
  { name: "Millard", service: "Parcels_Millard_LIR" },
];

const FIELDS = "PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,PARCEL_ACRES,PROP_CLASS";
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

  // Optional CLI filter: --county=salt-lake (or any substring match against county.name lowercased + dash-normalized)
  const countyFilterArg = process.argv.find((a) => a.startsWith("--county="));
  const countyFilter = countyFilterArg ? countyFilterArg.split("=")[1].toLowerCase() : null;

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
      features = await fetchAllFeatures(county.service, county.where);
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
      // Only update fields that have data in UGRC; never null out existing data
      // We use COALESCE so existing non-null values are preserved if UGRC sends null
      const res = await client.query(
        `UPDATE properties SET
           building_sqft  = COALESCE(building_sqft,  $2::integer),
           year_built     = COALESCE(year_built,     $3::integer),
           assessed_value = COALESCE(assessed_value, $4::integer),
           lot_acres      = COALESCE(lot_acres,      $5::numeric),
           updated_at     = NOW()
         WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1
         AND ($2::integer IS NOT NULL OR $3::integer IS NOT NULL OR $4::integer IS NOT NULL OR $5::numeric IS NOT NULL)
         RETURNING id`,
        [
          parcel.parcelId,
          parcel.buildingSqft,
          parcel.yearBuilt,
          parcel.assessedValue,
          parcel.lotAcres,
        ]
      );

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
  console.log(`Total properties enriched: ${totalUpdated}`);
  console.log(`Skipped (no assessor data): ${totalSkipped}`);
  console.log(`No parcel_id match in our DB: ${totalNoMatch}`);

  await client.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
