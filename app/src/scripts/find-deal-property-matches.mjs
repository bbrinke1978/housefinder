/**
 * For the 4 DEAL-prefix properties with NULL owner_name, search the existing
 * properties table for any address match (case-insensitive, fuzzy on whitespace
 * and punctuation). If a match exists with a real parcel_id and owner_name,
 * we can link the deal to that real property instead of leaving the DEAL- placeholder.
 */
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const deal_props = await c.query(`
  SELECT p.id, p.address, d.id AS deal_id, d.city
  FROM properties p
  JOIN deals d ON d.property_id = p.id
  WHERE p.parcel_id LIKE 'DEAL-%'
`);

console.log(`\nFound ${deal_props.rowCount} DEAL-prefix properties to investigate.\n`);

for (const row of deal_props.rows) {
  console.log(`---`);
  console.log(`Deal ${row.deal_id.slice(0, 8)} → address "${row.address}" city "${row.city ?? '(null)'}"`);

  // Normalize for fuzzy match: lowercase, strip punctuation, collapse whitespace
  const normalized = row.address
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Search existing scraped properties (NOT DEAL-prefix) for similar address
  const matches = await c.query(`
    SELECT id, address, city, parcel_id, owner_name, county
    FROM properties
    WHERE parcel_id NOT LIKE 'DEAL-%'
      AND (
        lower(regexp_replace(address, '[.,]', '', 'g')) ILIKE $1
        OR lower(regexp_replace(address, '[.,\\s]+', ' ', 'g')) ILIKE $1
      )
    LIMIT 5
  `, [`%${normalized}%`]);

  if (matches.rowCount === 0) {
    console.log(`  No scraped-property match. Address may be outside scraped counties or formatted very differently.`);
  } else {
    console.log(`  Found ${matches.rowCount} candidate matches:`);
    for (const m of matches.rows) {
      console.log(`    [${m.county}] ${m.address}, ${m.city} | parcel ${m.parcel_id} | owner: ${m.owner_name ?? '(none)'}`);
    }
  }
}

await c.end();
