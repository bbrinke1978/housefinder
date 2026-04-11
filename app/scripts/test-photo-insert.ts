import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  console.log("Connected\n");

  // Check enum values
  const enums = await client.query("SELECT unnest(enum_range(NULL::photo_category))");
  console.log("photo_category enum values:", enums.rows.map((r: any) => r.unnest));

  // Check table columns
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'property_photos'
    ORDER BY ordinal_position
  `);
  console.log("\nproperty_photos columns:");
  for (const col of cols.rows) {
    console.log(`  ${col.column_name}: ${col.data_type} nullable=${col.is_nullable} default=${col.column_default}`);
  }

  // Try the exact insert that's failing
  const testId = "00000000-0000-0000-0000-000000000099";
  const dealId = "b3a71628-4126-48d2-b34a-98b4ebe24a67";
  try {
    await client.query(
      `INSERT INTO property_photos (id, deal_id, property_id, is_inbox, blob_name, blob_url, category, caption, is_cover, file_size_bytes)
       VALUES ($1::uuid, $2::uuid, NULL, $3, $4, $5, $6::photo_category, $7, $8, $9)`,
      [testId, dealId, false, "test/blob.jpg", "https://example.com/test.jpg", "other", null, false, 104555]
    );
    console.log("\nINSERT succeeded!");
    await client.query("DELETE FROM property_photos WHERE id = $1", [testId]);
    console.log("Cleanup done");
  } catch (err: any) {
    console.log("\nINSERT failed:", err.message);
    console.log("Detail:", err.detail);
    console.log("Code:", err.code);
  }

  await client.end();
}

main();
