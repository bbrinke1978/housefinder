/**
 * Inspect deal 0ec7cf8c (883 N St. Michael drive) and its property + owner_contacts.
 * Brian added a placeholder seller name and ran skip-trace; we need to see what landed
 * and clean up any junk before reverting.
 */
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

console.log("\n=== Deal 0ec7cf8c (883 N St. Michael drive) ===");
const deal = await c.query(`
  SELECT id, address, city, seller_name, seller_phone, status, contract_status, updated_at
  FROM deals
  WHERE id::text LIKE '0ec7cf8c%'
`);
console.table(deal.rows);

if (deal.rowCount === 0) {
  console.log("Deal not found.");
  await c.end();
  process.exit(0);
}

const dealRow = deal.rows[0];

console.log("\n=== Linked property ===");
const prop = await c.query(`
  SELECT id, address, city, parcel_id, owner_name, updated_at
  FROM properties
  WHERE id = (SELECT property_id FROM deals WHERE id = $1)
`, [dealRow.id]);
console.table(prop.rows);

if (prop.rowCount === 0) {
  console.log("No linked property.");
  await c.end();
  process.exit(0);
}

const propRow = prop.rows[0];

console.log("\n=== owner_contacts on this property ===");
const contacts = await c.query(`
  SELECT id, source, phone, email, is_manual, created_at, updated_at
  FROM owner_contacts WHERE property_id = $1
`, [propRow.id]);
console.table(contacts.rows);

console.log("\n=== Tracerfy run history for this property ===");
const traces = await c.query(`
  SELECT id, status, request_count, success_count, no_match_count, created_at
  FROM tracerfy_runs WHERE property_ids @> $1::uuid[]
  ORDER BY created_at DESC LIMIT 5
`, [`{${propRow.id}}`]);
if (traces.rowCount > 0) {
  console.table(traces.rows);
} else {
  console.log("(no tracerfy_runs entries)");
}

await c.end();
