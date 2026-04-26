import pg from "pg";
import * as fs from "node:fs";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== The 4 stuck deals — full context ===");
const deals = await c.query(`
  SELECT d.id, d.address, d.city, d.zip, d.status, d.contract_status, d.lead_source,
         d.created_at, d.updated_at, d.notes, d.arv, d.repair_estimate, d.asking_price
  FROM deals d
  JOIN properties p ON p.id = d.property_id
  WHERE p.parcel_id LIKE 'DEAL-%'
  ORDER BY d.created_at
`);
console.table(deals.rows);

// Load the Rose Park allowlist and check which deal addresses might be 84116
console.log("\n=== Checking if any addresses are in 84116 (UGRC Address Points lookup) ===");
const ARCGIS = "https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/SaltLake_County_Addresses/FeatureServer/0/query";

for (const d of deals.rows) {
  // Build a search address for UGRC — just the street part
  const street = (d.address || "").trim();
  if (!street) continue;

  // Quick UGRC query: look for address starting with this street number/letter
  const params = new URLSearchParams({
    where: `FullAdd LIKE '${street.toUpperCase().replace(/'/g, "''").substring(0, 30)}%'`,
    outFields: "FullAdd,City,ZipCode,ParcelID",
    returnGeometry: "false",
    resultRecordCount: "5",
    f: "json",
  });

  try {
    const res = await fetch(`${ARCGIS}?${params}`);
    const data = await res.json();
    const features = data.features ?? [];
    console.log(`\n"${d.address}" (city ${d.city ?? '?'}):`);
    if (features.length === 0) {
      console.log(`  No UGRC matches — likely outside Salt Lake County (e.g. Bountiful = Davis County)`);
    } else {
      for (const f of features) {
        const a = f.attributes;
        console.log(`  ${a.FullAdd} | ${a.City} | zip ${a.ZipCode} | parcel ${a.ParcelID}`);
      }
    }
  } catch (err) {
    console.log(`  UGRC query failed: ${err.message}`);
  }
}

await c.end();
