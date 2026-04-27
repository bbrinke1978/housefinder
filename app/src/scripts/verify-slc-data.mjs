import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== SLC properties by neighborhood ===");
const r1 = await c.query(`
  SELECT p.city, COUNT(*) AS properties,
    COUNT(*) FILTER (WHERE l.distress_score > 0) AS scored,
    COUNT(*) FILTER (WHERE l.is_hot) AS hot
  FROM properties p
  LEFT JOIN leads l ON l.property_id = p.id
  WHERE p.city IN (
    'Salt Lake City', 'Sugar House', 'Midvale', 'Sandy', 'Murray', 'Holladay',
    'Kearns', 'West Valley City', 'Cottonwood Heights', 'Taylorsville',
    'West Jordan', 'South Jordan', 'Riverton', 'Herriman', 'Draper',
    'South Salt Lake', 'Salt Lake County (other)', 'Rose Park'
  )
  GROUP BY p.city
  ORDER BY properties DESC
`);
console.table(r1.rows);

console.log("\n=== Sample 10 SLC leads (any hot ones?) ===");
const r2 = await c.query(`
  SELECT p.city, p.address, p.zip, l.distress_score, l.is_hot, l.first_seen_at
  FROM properties p
  JOIN leads l ON l.property_id = p.id
  WHERE p.city IN (
    'Salt Lake City', 'Sugar House', 'Midvale', 'Sandy', 'Murray', 'Holladay',
    'Kearns', 'West Valley City', 'Cottonwood Heights', 'Taylorsville',
    'West Jordan', 'South Jordan', 'Riverton', 'Herriman', 'Draper',
    'South Salt Lake', 'Salt Lake County (other)', 'Rose Park'
  )
  ORDER BY l.is_hot DESC, l.distress_score DESC
  LIMIT 10
`);
console.table(r2.rows);

await c.end();
