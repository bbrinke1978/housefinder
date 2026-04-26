/**
 * build-rose-park-parcel-allowlist.ts
 *
 * Phase 25.5 (Option C-2): Build a parcel-ID allowlist for Salt Lake City zip 84116
 * (Rose Park) by querying the UGRC SaltLake_County_Addresses ArcGIS FeatureServer
 * with WHERE ZipCode='84116'.
 *
 * Output: scraper/data/rose-park-parcel-allowlist.json
 *   {
 *     "zip": "84116",
 *     "generatedAt": "2026-04-26T...",
 *     "source": "https://services1.arcgis.com/.../SaltLake_County_Addresses",
 *     "addressCount": 12345,
 *     "parcelCount": 4567,
 *     "parcelIds": ["261401040", "261401041", ...]  // normalized (no hyphens, upper)
 *   }
 *
 * Why: Utah Legals NOD snippets are too truncated to reliably contain the property
 * zip code. Filtering on city name doesn't work either (all SLC notices show
 * city="Salt Lake City"). The accurate filter is "is this notice's parcel ID
 * one of the parcels we know to be in 84116?" — this script builds the source
 * of truth for that check.
 *
 * Usage:
 *   npx tsx scraper/src/scripts/build-rose-park-parcel-allowlist.ts
 *
 * Re-run when 84116 parcels change (typically annually).
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

const ARCGIS_BASE =
  "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services";
const SERVICE = "SaltLake_County_Addresses";
const ZIP = "84116";
const PAGE_SIZE = 1000;
const OUTFIELDS = "ParcelID,FullAdd,ZipCode,City";

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  "data",
  "rose-park-parcel-allowlist.json"
);

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

async function fetchAllAddresses(): Promise<Feature["attributes"][]> {
  const url = `${ARCGIS_BASE}/${SERVICE}/FeatureServer/0/query`;
  const all: Feature["attributes"][] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      where: `ZipCode='${ZIP}'`,
      outFields: OUTFIELDS,
      returnGeometry: "false",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      f: "json",
    });

    const res = await fetch(`${url}?${params}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${SERVICE}`);
    }

    const data = (await res.json()) as ArcGisResponse;
    if (data.error) {
      throw new Error(
        `ArcGIS error: ${data.error.code} ${data.error.message}`
      );
    }

    const features = data.features ?? [];
    for (const f of features) all.push(f.attributes);

    console.log(
      `  Fetched ${all.length} addresses (page offset ${offset})...`
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
    `=== Building Rose Park (84116) parcel allowlist from UGRC ${SERVICE} ===\n`
  );

  const addresses = await fetchAllAddresses();
  console.log(`\nTotal 84116 address records: ${addresses.length}`);

  // Group by parcel ID, dedupe
  const parcelMap = new Map<string, { rawIds: Set<string>; sampleAddress: string | null }>();
  let nullParcelCount = 0;

  for (const a of addresses) {
    const normalized = normalizeParcelId(a.ParcelID);
    if (!normalized) {
      nullParcelCount++;
      continue;
    }
    if (!parcelMap.has(normalized)) {
      parcelMap.set(normalized, {
        rawIds: new Set(),
        sampleAddress: a.FullAdd ?? null,
      });
    }
    if (a.ParcelID) parcelMap.get(normalized)!.rawIds.add(a.ParcelID);
  }

  const parcelIds = Array.from(parcelMap.keys()).sort();
  console.log(`Unique parcel IDs (normalized): ${parcelIds.length}`);
  console.log(`Address records with no parcel ID: ${nullParcelCount}`);
  console.log(
    `Sample raw parcel ID formats: ${Array.from(parcelMap.values()).slice(0, 5).map((v) => Array.from(v.rawIds)[0]).join(", ")}`
  );
  console.log(
    `Sample addresses: ${Array.from(parcelMap.values()).slice(0, 3).map((v) => v.sampleAddress).filter(Boolean).join(" | ")}`
  );

  const output = {
    zip: ZIP,
    generatedAt: new Date().toISOString(),
    source: `${ARCGIS_BASE}/${SERVICE}`,
    addressCount: addresses.length,
    parcelCount: parcelIds.length,
    parcelIds,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(
    `File size: ~${Math.round(JSON.stringify(output).length / 1024)} KB`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
