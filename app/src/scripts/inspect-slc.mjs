import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("=== SLC properties: how many have address vs zip vs parcel? ===");
const r1 = await c.query(`
  SELECT
    COUNT(*) AS total,
    COUNT(address) AS with_address,
    COUNT(zip) AS with_zip,
    COUNT(parcel_id) AS with_parcel,
    COUNT(DISTINCT parcel_id) AS distinct_parcels
  FROM properties WHERE city = 'SALT LAKE CITY'
`);
console.log(r1.rows[0]);

console.log("\n=== Sample 5 SLC properties ===");
const r2 = await c.query(`
  SELECT parcel_id, address, city, zip, county
  FROM properties WHERE city = 'SALT LAKE CITY'
  LIMIT 5
`);
console.table(r2.rows);

console.log("\n=== Where did they come from? join distress_signals ===");
const r3 = await c.query(`
  SELECT signal_type, source_url, COUNT(*) AS n
  FROM distress_signals ds
  JOIN properties p ON p.id = ds.property_id
  WHERE p.city = 'SALT LAKE CITY'
  GROUP BY signal_type, source_url
  ORDER BY n DESC
  LIMIT 10
`);
console.table(r3.rows);

console.log("\n=== Distinct counties for SLC city rows ===");
const r4 = await c.query(`
  SELECT county, COUNT(*) AS n FROM properties WHERE city = 'SALT LAKE CITY' GROUP BY county
`);
console.table(r4.rows);

console.log("\n=== Lead status for SLC properties ===");
const r5 = await c.query(`
  SELECT COUNT(*) AS total_with_leads,
    COUNT(*) FILTER (WHERE l.distress_score > 0) AS with_signals,
    COUNT(*) FILTER (WHERE l.is_hot) AS hot
  FROM properties p
  JOIN leads l ON l.property_id = p.id
  WHERE p.city = 'SALT LAKE CITY'
`);
console.log(r5.rows[0]);

await c.end();
