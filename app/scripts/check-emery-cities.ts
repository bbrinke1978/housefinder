import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

// Emery County, Utah cities/towns
const EMERY_LOCAL_CITIES = new Set([
  "Castle Dale",
  "Huntington",
  "Orangeville",
  "Ferron",
  "Green River",
  "Cleveland",
  "Elmo",
  "Clawson",
  "Emery",
  "Castle Valley",
]);

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log("=== All cities in DB for Emery County rows (any source) ===\n");
  const { rows: cities } = await client.query(
    `SELECT city, count(*) as count
     FROM properties
     WHERE county = 'emery'
     GROUP BY city
     ORDER BY count(*) DESC`
  );
  console.table(cities);

  console.log("\n=== Properties with cities OUTSIDE Emery County (smoking gun for mailing-as-situs) ===\n");
  const localList = [...EMERY_LOCAL_CITIES];
  const { rows: outside } = await client.query(
    `SELECT city, count(*) as count
     FROM properties
     WHERE county = 'emery'
       AND city != ''
       AND city IS NOT NULL
       AND NOT (city = ANY($1::text[]))
     GROUP BY city
     ORDER BY count(*) DESC`,
    [localList]
  );
  console.table(outside);

  console.log("\n=== Sample addresses for properties tagged with non-Emery cities ===\n");
  const { rows: samples } = await client.query(
    `SELECT parcel_id, address, city, owner_name
     FROM properties
     WHERE county = 'emery'
       AND city != ''
       AND city IS NOT NULL
       AND NOT (city = ANY($1::text[]))
     ORDER BY city
     LIMIT 30`,
    [localList]
  );
  console.table(samples);

  console.log("\n=== Sample addresses with possibly-mailing format (PO Box, out-of-state, etc.) ===\n");
  const { rows: pobox } = await client.query(
    `SELECT parcel_id, address, city, owner_name
     FROM properties
     WHERE county = 'emery'
       AND (address ~* 'po box|p\\.o\\. box|p o box' OR address ~ '\\d+\\s+(MI|CA|TX|FL|NV|AZ|CO|ID|WY|OR|WA)\\b')
     LIMIT 20`
  );
  console.table(pobox);

  console.log("\n=== Sample of normal-looking Emery addresses (cross-reference, should be situs) ===\n");
  const { rows: normal } = await client.query(
    `SELECT parcel_id, address, city, owner_name
     FROM properties
     WHERE county = 'emery'
       AND city = ANY($1::text[])
       AND address ~ '^\\d+\\s+[A-Za-z]'
     ORDER BY random()
     LIMIT 10`,
    [localList]
  );
  console.table(normal);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
