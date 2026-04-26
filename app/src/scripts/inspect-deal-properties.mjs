import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== ALL properties with parcel_id LIKE 'DEAL-%' ===");
const r1 = await c.query(`
  SELECT COUNT(*) AS n,
    COUNT(owner_name) AS with_owner,
    COUNT(*) FILTER (WHERE owner_name IS NULL OR owner_name = '') AS without_owner
  FROM properties WHERE parcel_id LIKE 'DEAL-%'
`);
console.log(r1.rows[0]);

console.log("\n=== Sample 5 ===");
const r2 = await c.query(`
  SELECT p.id, p.address, p.parcel_id, p.owner_name, d.id AS deal_id, d.seller_name
  FROM properties p
  LEFT JOIN deals d ON d.property_id = p.id
  WHERE p.parcel_id LIKE 'DEAL-%'
  LIMIT 10
`);
console.table(r2.rows);

console.log("\n=== Tracerfy 'not found' sentinels overall ===");
const r3 = await c.query(`
  SELECT COUNT(*) AS n FROM owner_contacts
  WHERE source = 'tracerfy' AND phone IS NULL AND email IS NULL
`);
console.log(r3.rows[0]);

await c.end();
