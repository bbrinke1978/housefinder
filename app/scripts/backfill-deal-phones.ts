/**
 * Backfill deals that have traced contacts but no sellerPhone.
 */
import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  console.log("Connected\n");

  const result = await client.query(`
    UPDATE deals d
    SET seller_phone = (
      SELECT oc.phone
      FROM owner_contacts oc
      WHERE oc.property_id = d.property_id
        AND oc.source LIKE 'tracerfy%'
        AND oc.phone IS NOT NULL
        AND oc.phone != ''
        AND oc.phone NOT LIKE 'MAILING:%'
      LIMIT 1
    )
    WHERE d.property_id IS NOT NULL
      AND (d.seller_phone IS NULL OR d.seller_phone = '')
      AND EXISTS (
        SELECT 1 FROM owner_contacts oc2
        WHERE oc2.property_id = d.property_id
          AND oc2.source LIKE 'tracerfy%'
          AND oc2.phone IS NOT NULL
          AND oc2.phone != ''
          AND oc2.phone NOT LIKE 'MAILING:%'
      )
    RETURNING d.id, d.address, d.seller_phone
  `);

  console.log(`Updated ${result.rows.length} deals:`);
  result.rows.forEach((r: any) => console.log(`  ${r.address} → ${r.seller_phone}`));

  await client.end();
}

main();
