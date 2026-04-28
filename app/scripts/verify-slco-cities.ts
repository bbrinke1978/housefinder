import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

const TAX_SALE_ENDPOINT =
  "https://apps.saltlakecounty.gov/Services/Treasurer/TaxMQ/api/TaxDue/GetTaxSale";

async function main() {
  console.log("=== Step 1: Fetch raw SLCo Auditor tax-sale JSON ===\n");
  const res = await fetch(TAX_SALE_ENDPOINT, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { Result: any[] };
  const rows = data.Result ?? [];
  console.log(`Endpoint returned ${rows.length} rows\n`);

  // Parse city out of every TAX_SALE_ADDRESS by walking back from "UT <zip>"
  // and capturing whatever's between the last digit-only token and "UT".
  const cityCounts = new Map<string, number>();
  const cityToZips = new Map<string, Set<string>>();
  const cityToSamples = new Map<string, string[]>();
  const unparseable: string[] = [];

  for (const row of rows) {
    const addr = (row.TAX_SALE_ADDRESS ?? "").trim();
    if (!addr) continue;
    if (row.TSL_PARCEL_NUMBER === 0 || row.TSL_PARCEL_NUMBER === "0") continue;

    // Match: "<everything> <CITY-words> UT <zip>"
    // Pull zip first, then everything between street and UT
    const m = addr.match(/^(.+?)\s+UT\s+(\d{5})/i);
    if (!m) {
      unparseable.push(addr);
      continue;
    }
    const beforeUt = m[1];
    const zip = m[2];

    // Walk backwards from end: city is the trailing all-letter words
    // (every token without digits, accumulated from the right)
    const tokens = beforeUt.split(/\s+/);
    let cityTokens: string[] = [];
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i];
      if (/^[A-Za-z]+$/.test(t)) {
        cityTokens.unshift(t);
      } else {
        break;
      }
    }
    if (cityTokens.length === 0) {
      unparseable.push(addr);
      continue;
    }
    const city = cityTokens.join(" ").toUpperCase();
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    if (!cityToZips.has(city)) cityToZips.set(city, new Set());
    cityToZips.get(city)!.add(zip);
    if (!cityToSamples.has(city)) cityToSamples.set(city, []);
    if (cityToSamples.get(city)!.length < 2) cityToSamples.get(city)!.push(addr);
  }

  console.log("=== Step 2: All unique cities found in raw TAX_SALE_ADDRESS ===\n");
  const sorted = [...cityCounts.entries()].sort((a, b) => b[1] - a[1]);
  console.table(
    sorted.map(([city, count]) => ({
      city,
      count,
      zips: [...(cityToZips.get(city) ?? [])].sort().join(", "),
      sample: cityToSamples.get(city)?.[0]?.slice(0, 80),
    }))
  );

  if (unparseable.length > 0) {
    console.log(`\n=== ${unparseable.length} rows could not be parsed (no UT <zip> match) ===`);
    console.log(unparseable.slice(0, 5).join("\n"));
  }

  console.log("\n=== Step 3: Current DB rows in Sandy with full details ===\n");
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) { console.error("DATABASE_URL not set, skipping DB query"); return; }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const { rows: sandy } = await client.query(
    `SELECT parcel_id, address, city, zip, owner_name
     FROM properties
     WHERE city = 'Sandy'
     ORDER BY parcel_id`
  );
  console.table(sandy);

  console.log("\n=== Step 4: All cities currently in DB with row counts ===\n");
  const { rows: dbCities } = await client.query(
    `SELECT city, count(*) as count
     FROM properties
     WHERE county = 'salt lake'
     GROUP BY city
     ORDER BY count(*) DESC`
  );
  console.table(dbCities);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
