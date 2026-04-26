/**
 * Revert the placeholder "Bob Smith" seller_name from deal 0ec7cf8c
 * (883 N St. Michael drive). No Tracerfy contacts were created so no
 * other cleanup is needed.
 */
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const before = await c.query(`
  SELECT id::text, seller_name FROM deals WHERE id::text LIKE '0ec7cf8c%'
`);
console.log("Before:", before.rows[0]);

const result = await c.query(`
  UPDATE deals SET seller_name = NULL, updated_at = NOW()
  WHERE id::text LIKE '0ec7cf8c%' AND seller_name = 'Bob Smith'
`);
console.log(`Updated: ${result.rowCount} row(s)`);

const after = await c.query(`
  SELECT id::text, seller_name FROM deals WHERE id::text LIKE '0ec7cf8c%'
`);
console.log("After:", after.rows[0]);

await c.end();
