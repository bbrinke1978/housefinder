import pg from "pg";
const { Client } = pg;

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== Q1: Properties with zip='84116' ===");
const q1 = await c.query(
  "SELECT city, zip, building_sqft, year_built, assessed_value FROM properties WHERE zip = '84116' LIMIT 10"
);
console.log(`Rows: ${q1.rowCount}`);
console.table(q1.rows);

console.log("\n=== Q2: target_cities config value ===");
const q2 = await c.query(
  "SELECT value FROM scraper_config WHERE key = 'target_cities'"
);
console.log(q2.rows[0]?.value || "(no row)");

console.log("\n=== Q3: Rose Park properties with leads ===");
const q3 = await c.query(`
  SELECT p.city, p.zip, p.address, l.distress_score, l.is_hot
  FROM properties p
  JOIN leads l ON l.property_id = p.id
  WHERE p.city = 'Rose Park'
  ORDER BY l.distress_score DESC
  LIMIT 10
`);
console.log(`Rows: ${q3.rowCount}`);
console.table(q3.rows);

console.log("\n=== Q4: Sample SLC parcel IDs (any dots?) ===");
const q4 = await c.query(`
  SELECT parcel_id FROM properties
  WHERE county = 'salt lake' OR zip = '84116'
  LIMIT 5
`);
console.log(`Rows: ${q4.rowCount}`);
console.table(q4.rows);

console.log("\n=== Q5: Total properties in DB by city (top 20) ===");
const q5 = await c.query(`
  SELECT city, COUNT(*) as n
  FROM properties
  GROUP BY city
  ORDER BY n DESC
  LIMIT 20
`);
console.table(q5.rows);

await c.end();
