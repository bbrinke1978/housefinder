/**
 * One-off helper: pull every SLCo property from the DB that's missing situs
 * (post mailing-vs-situs backfill), look each parcel up in UGRC's
 * Parcels_SaltLake_LIR layer, and UPDATE the rows with PARCEL_ADD / PARCEL_CITY
 * + the assessor enrichment fields (sqft, year built, assessed value, lot acres).
 *
 * This is a DB-driven equivalent of the static-allowlist mode in
 * import-ugrc-assessor.mjs — it doesn't need the rose-park-parcel-allowlist.json
 * file because the DB itself is the source of truth for which parcels need data.
 *
 * Usage:
 *   cd app && npx tsx scripts/enrich-slco-situs-from-ugrc.ts          # dry-run
 *   cd app && npx tsx scripts/enrich-slco-situs-from-ugrc.ts --execute
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

const EXECUTE = process.argv.includes("--execute");

const ARCGIS_BASE = "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services";
const SERVICE = "Parcels_SaltLake_LIR";
const FIELDS = "PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,PARCEL_ACRES,PARCEL_ADD,PARCEL_CITY";
const BATCH_SIZE = 100;

function normalizeParcelId(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  return String(raw).replace(/[\s\-\.]/g, "").toUpperCase().trim();
}

async function fetchUgrcBatch(parcelIds: string[]): Promise<any[]> {
  const url = `${ARCGIS_BASE}/${SERVICE}/FeatureServer/0/query`;
  const inClause = parcelIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
  const body = new URLSearchParams({
    where: `PARCEL_ID IN (${inClause})`,
    outFields: FIELDS,
    returnGeometry: "false",
    f: "json",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`ArcGIS HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`ArcGIS: ${json.error.message}`);
  return (json.features ?? []).map((f: any) => f.attributes);
}

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log(EXECUTE ? "=== EXECUTING SLCo UGRC enrichment ===" : "=== DRY RUN ===");

  // Pull all SLCo properties — those with NULL situs or missing assessor data.
  // Using all SLCo rows ensures both backfilled rows AND any older rows missing
  // assessor fields get updated in one pass.
  const { rows: dbParcels } = await client.query(
    `SELECT id, parcel_id,
            UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) as normalized
     FROM properties
     WHERE county = 'salt lake'
     ORDER BY parcel_id`
  );
  console.log(`SLCo properties in DB: ${dbParcels.length}`);

  // Map normalized -> DB id
  const dbMap = new Map<string, string>();
  for (const r of dbParcels) {
    dbMap.set(r.normalized, r.id);
  }

  const allParcelIds = [...dbMap.keys()];
  console.log(`Unique normalized parcel IDs to look up: ${allParcelIds.length}`);

  let totalFetched = 0;
  let totalMatched = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  // Batch the IDs into POST queries
  const totalBatches = Math.ceil(allParcelIds.length / BATCH_SIZE);
  for (let i = 0; i < allParcelIds.length; i += BATCH_SIZE) {
    const batch = allParcelIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} IDs)... `);
    let features: any[] = [];
    try {
      features = await fetchUgrcBatch(batch);
    } catch (err: any) {
      console.log(`FAIL: ${err.message}`);
      continue;
    }
    totalFetched += features.length;
    process.stdout.write(`${features.length} hits — `);

    // Aggregate by normalized parcel_id (UGRC may return multiple rows per parcel for multi-building parcels)
    const aggregated = new Map<string, any>();
    for (const f of features) {
      const norm = normalizeParcelId(f.PARCEL_ID);
      if (!norm) continue;
      if (!aggregated.has(norm)) {
        aggregated.set(norm, {
          buildingSqft: f.BLDG_SQFT ?? null,
          yearBuilt: f.BUILT_YR ?? null,
          assessedValue: f.TOTAL_MKT_VALUE != null ? Math.round(f.TOTAL_MKT_VALUE) : null,
          lotAcres: f.PARCEL_ACRES ?? null,
          address: f.PARCEL_ADD ? String(f.PARCEL_ADD).trim() : null,
          city: f.PARCEL_CITY ? String(f.PARCEL_CITY).trim() : null,
        });
      } else {
        const existing = aggregated.get(norm)!;
        if (f.BLDG_SQFT != null) existing.buildingSqft = (existing.buildingSqft ?? 0) + f.BLDG_SQFT;
        if (f.BUILT_YR != null && (existing.yearBuilt == null || f.BUILT_YR < existing.yearBuilt)) {
          existing.yearBuilt = f.BUILT_YR;
        }
      }
    }

    let batchUpdates = 0;
    for (const [norm, data] of aggregated) {
      const dbId = dbMap.get(norm);
      if (!dbId) {
        totalSkipped++;
        continue;
      }
      totalMatched++;

      if (EXECUTE) {
        await client.query(
          `UPDATE properties
           SET building_sqft  = COALESCE(building_sqft,  $2::integer),
               year_built     = COALESCE(year_built,     $3::integer),
               assessed_value = COALESCE(assessed_value, $4::integer),
               lot_acres      = COALESCE(lot_acres,      $5::numeric),
               address        = COALESCE(address,        $6::text),
               city           = COALESCE(city,           $7::text),
               updated_at     = NOW()
           WHERE id = $1`,
          [dbId, data.buildingSqft, data.yearBuilt, data.assessedValue, data.lotAcres, data.address, data.city]
        );
        batchUpdates++;
      }
    }
    totalUpdated += batchUpdates;
    console.log(`matched ${aggregated.size}, updated ${batchUpdates}`);
  }

  console.log("\n=== Summary ===");
  console.table([
    { metric: "DB SLCo parcels checked", count: allParcelIds.length },
    { metric: "UGRC features fetched", count: totalFetched },
    { metric: "Parcels matched (UGRC ↔ DB)", count: totalMatched },
    { metric: EXECUTE ? "Rows UPDATED" : "Rows that WOULD be updated", count: totalUpdated },
    { metric: "Skipped (UGRC return without DB match)", count: totalSkipped },
  ]);

  // Post-update verification
  console.log("\n=== Post-update DB state ===");
  const { rows: filled } = await client.query(
    `SELECT count(*) as count FROM properties
     WHERE county = 'salt lake' AND address IS NOT NULL`
  );
  const { rows: stillNull } = await client.query(
    `SELECT count(*) as count FROM properties
     WHERE county = 'salt lake' AND address IS NULL`
  );
  console.table([
    { metric: "SLCo with situs populated", count: filled[0].count },
    { metric: "SLCo with situs still NULL", count: stillNull[0].count },
  ]);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
