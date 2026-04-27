import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== Signal counts per SLC property ===");
const r = await c.query(`
  SELECT p.city, p.parcel_id,
    COUNT(ds.id) AS total_signals,
    string_agg(DISTINCT ds.signal_type::text, ', ') AS signal_types
  FROM properties p
  LEFT JOIN distress_signals ds ON ds.property_id = p.id AND ds.status = 'active'
  WHERE p.city IN (
    'Salt Lake City', 'Sugar House', 'Midvale', 'Sandy', 'Murray', 'Holladay',
    'Kearns', 'West Valley City', 'Cottonwood Heights', 'Taylorsville',
    'West Jordan', 'South Jordan', 'Riverton', 'Herriman', 'Draper',
    'South Salt Lake', 'Salt Lake County (other)', 'Rose Park'
  )
  GROUP BY p.city, p.parcel_id
  ORDER BY total_signals DESC
`);
console.table(r.rows);

console.log("\n=== Signal sources we have, by signal_type, lifetime ===");
const r2 = await c.query(`
  SELECT signal_type, source_url, COUNT(*) AS n
  FROM distress_signals
  GROUP BY signal_type, source_url
  ORDER BY signal_type, n DESC
`);
console.table(r2.rows);

console.log("\n=== Comparison — rural Price properties signal stacking ===");
const r3 = await c.query(`
  SELECT
    CASE WHEN cnt = 1 THEN '1 signal' WHEN cnt = 2 THEN '2 signals' WHEN cnt >= 3 THEN '3+ signals' END AS band,
    COUNT(*) AS properties
  FROM (
    SELECT p.id, COUNT(ds.id) AS cnt
    FROM properties p
    JOIN distress_signals ds ON ds.property_id = p.id AND ds.status = 'active'
    WHERE p.city IN ('Price', 'Castle Dale', 'Huntington', 'Delta', 'Nephi', 'Helper', 'Ferron')
    GROUP BY p.id
    HAVING COUNT(ds.id) > 0
  ) sub
  GROUP BY band
  ORDER BY band
`);
console.table(r3.rows);

await c.end();
