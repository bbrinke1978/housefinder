/**
 * For each DEAL-prefix property without an owner_name (the "stuck deals" from
 * the findOrCreatePropertyForDeal owner-name bug), look up the parcel ID via
 * UGRC SaltLake_County_Addresses (or DavisCounty_Addresses for Davis), then
 * print:
 *   - The deal ID + address
 *   - The matched UGRC parcel + zip + neighborhood-derived city
 *   - A clickable Assessor URL for manual owner-name lookup
 *
 * Why manual: UGRC does NOT expose owner names (verified by reading every
 * Salt Lake parcel layer schema — only PARCEL_ID, addresses, zip, building
 * specs are exposed; owner data lives only in the SLCo Assessor portal which
 * has an explicit commercial-use ToS prohibition).
 *
 * Brian opens each URL, copies the owner name, pastes into the deal in the UI,
 * then clicks Skip Trace. The fixed findOrCreatePropertyForDeal will then
 * propagate seller_name → property.owner_name → Tracerfy correctly.
 */
import pg from "pg";

const ARCGIS_BASE = "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services";

// Zip → SLC neighborhood (covers the relevant 84xxx zips for the metro)
const SLC_ZIP_NEIGHBORHOOD = {
  "84020": "Draper",
  "84047": "Midvale",
  "84065": "Riverton",
  "84070": "Sandy",
  "84088": "West Jordan",
  "84092": "Sandy",
  "84093": "Sandy",
  "84094": "Sandy",
  "84095": "South Jordan",
  "84101": "Salt Lake City",
  "84102": "Salt Lake City",
  "84103": "Salt Lake City (Capitol Hill)",
  "84104": "Salt Lake City (Glendale)",
  "84105": "Salt Lake City (Sugar House)",
  "84106": "Salt Lake City (East Sugar House)",
  "84107": "Murray",
  "84108": "Salt Lake City (East Bench)",
  "84109": "Salt Lake City (Foothill)",
  "84111": "Salt Lake City (Downtown)",
  "84115": "South Salt Lake",
  "84116": "Rose Park",
  "84117": "Holladay",
  "84118": "Kearns",
  "84119": "West Valley City",
  "84120": "West Valley City",
  "84121": "Cottonwood Heights",
  "84123": "Murray",
  "84124": "Holladay",
  "84128": "West Valley City",
  "84129": "Taylorsville",
};

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const stuck = await c.query(`
  SELECT d.id AS deal_id, d.address, d.city, d.seller_name, p.id AS property_id, p.owner_name
  FROM deals d
  JOIN properties p ON p.id = d.property_id
  WHERE p.parcel_id LIKE 'DEAL-%'
    AND (p.owner_name IS NULL OR p.owner_name = '')
  ORDER BY d.created_at
`);

console.log(`\nFound ${stuck.rowCount} stuck deals to resolve.\n`);

for (const row of stuck.rows) {
  console.log(`════════════════════════════════════════════════════════════════`);
  console.log(`Deal:    ${row.deal_id}`);
  console.log(`Address: ${row.address.trim()}`);
  console.log(`City:    ${row.city ?? "(none)"}`);
  console.log();

  const street = (row.address || "").trim();
  const cityLower = (row.city || "").toLowerCase();

  // Skip Davis County addresses (Bountiful, etc.) — different ArcGIS service
  if (cityLower.includes("bountiful") || cityLower.includes("kaysville") || cityLower.includes("centerville") || cityLower.includes("layton")) {
    console.log(`  [SKIP] Davis County address — UGRC service is DavisCounty_Addresses (different schema, not implemented here).`);
    console.log(`  → Look up manually at https://maps.daviscountyutah.gov/parcel/`);
    console.log();
    continue;
  }

  // Build a fuzzy ArcGIS LIKE pattern
  const pattern = street
    .toUpperCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .replace(/'/g, "''")
    .substring(0, 40);

  const params = new URLSearchParams({
    where: `FullAdd LIKE '${pattern}%'`,
    outFields: "FullAdd,City,ZipCode,ParcelID",
    returnGeometry: "false",
    resultRecordCount: "5",
    f: "json",
  });

  try {
    const res = await fetch(`${ARCGIS_BASE}/SaltLake_County_Addresses/FeatureServer/0/query?${params}`);
    const data = await res.json();
    const features = data.features ?? [];

    if (features.length === 0) {
      console.log(`  [NO MATCH] Address not found in UGRC SLC Address Points.`);
      console.log(`  → Verify the address is spelled correctly and is in Salt Lake County.`);
      console.log(`  → Or look up manually at https://apps.saltlakecounty.gov/assessor/`);
    } else {
      console.log(`  Matched ${features.length} UGRC address record(s):`);
      for (const f of features) {
        const a = f.attributes;
        const neighborhood = SLC_ZIP_NEIGHBORHOOD[a.ZipCode] || `Salt Lake County (${a.ZipCode})`;
        console.log();
        console.log(`    Parcel:       ${a.ParcelID}`);
        console.log(`    UGRC address: ${a.FullAdd}`);
        console.log(`    UGRC city:    ${a.City} (zip ${a.ZipCode})`);
        console.log(`    Neighborhood: ${neighborhood}`);
        console.log(`    Assessor URL: https://apps.saltlakecounty.gov/assessor/new/query/results.cfm?parcel_id=${a.ParcelID}`);
      }
    }
  } catch (err) {
    console.log(`  [ERROR] UGRC query failed: ${err.message}`);
  }

  console.log();
}

console.log(`════════════════════════════════════════════════════════════════`);
console.log("\nNext step: open each Assessor URL above, copy the owner name,");
console.log("paste it into the deal's Seller Name field in the UI, save, then");
console.log("click Skip Trace. The fixed findOrCreatePropertyForDeal will");
console.log("propagate seller_name → property.owner_name → Tracerfy.");

await c.end();
