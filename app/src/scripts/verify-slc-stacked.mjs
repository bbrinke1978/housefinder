import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== SLC neighborhoods — leads + hot count after stacking ===");
const r1 = await c.query(`
  SELECT p.city,
    COUNT(*) AS properties,
    COUNT(*) FILTER (WHERE l.is_hot) AS hot,
    AVG(l.distress_score)::numeric(4,2) AS avg_score,
    MAX(l.distress_score) AS max_score
  FROM properties p
  LEFT JOIN leads l ON l.property_id = p.id
  WHERE p.city IN (
    'Salt Lake City', 'Sugar House', 'Midvale', 'Sandy', 'Murray', 'Holladay',
    'Kearns', 'West Valley City', 'Cottonwood Heights', 'Taylorsville',
    'West Jordan', 'South Jordan', 'Riverton', 'Herriman', 'Draper',
    'South Salt Lake', 'Salt Lake County (other)', 'Rose Park'
  )
  GROUP BY p.city
  ORDER BY hot DESC, properties DESC
`);
console.table(r1.rows);

console.log("\n=== SLC properties with multiple signals (the stacking sweet spot) ===");
const r2 = await c.query(`
  SELECT p.city, p.address, l.distress_score, l.is_hot,
    string_agg(DISTINCT ds.signal_type::text, ', ') AS signals,
    COUNT(ds.id) AS signal_count
  FROM properties p
  JOIN leads l ON l.property_id = p.id
  JOIN distress_signals ds ON ds.property_id = p.id AND ds.status = 'active'
  WHERE p.city IN (
    'Salt Lake City', 'Sugar House', 'Midvale', 'Sandy', 'Murray', 'Holladay',
    'Kearns', 'West Valley City', 'Cottonwood Heights', 'Taylorsville',
    'West Jordan', 'South Jordan', 'Riverton', 'Herriman', 'Draper',
    'South Salt Lake', 'Salt Lake County (other)', 'Rose Park'
  )
  GROUP BY p.id, p.city, p.address, l.distress_score, l.is_hot
  HAVING COUNT(ds.id) >= 2
  ORDER BY signal_count DESC, l.distress_score DESC
  LIMIT 20
`);
console.table(r2.rows);

await c.end();
