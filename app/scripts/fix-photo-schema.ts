/**
 * Align property_photos table with what app code expects.
 * The DB was modified outside Drizzle — add missing columns, rename mismatched ones.
 */
import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  console.log("Connected\n");

  const stmts = [
    // Add blob_url if missing
    `ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS blob_url text`,
    // Add file_size_bytes if missing
    `ALTER TABLE property_photos ADD COLUMN IF NOT EXISTS file_size_bytes integer`,
    // Backfill blob_url from blob_name (construct URL from storage account + container + blob_name)
    `UPDATE property_photos SET blob_url = 'https://housefinderstorage.blob.core.windows.net/photos/' || blob_name WHERE blob_url IS NULL AND blob_name IS NOT NULL`,
    // Make blob_url NOT NULL now that it's backfilled
    `ALTER TABLE property_photos ALTER COLUMN blob_url SET NOT NULL`,
    // Copy file_size to file_size_bytes if file_size exists
    `DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='property_photos' AND column_name='file_size') THEN
        UPDATE property_photos SET file_size_bytes = file_size WHERE file_size_bytes IS NULL;
      END IF;
    END $$`,
    // Make original_filename nullable (code doesn't always have it)
    `DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='property_photos' AND column_name='original_filename') THEN
        ALTER TABLE property_photos ALTER COLUMN original_filename DROP NOT NULL;
      END IF;
    END $$`,
  ];

  for (const stmt of stmts) {
    const label = stmt.slice(0, 70).replace(/\s+/g, " ").trim();
    try {
      await client.query(stmt);
      console.log(`  ✓ ${label}...`);
    } catch (err: any) {
      console.log(`  ✗ ${label}...`);
      console.log(`    ${err.message}`);
    }
  }

  // Verify
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'property_photos'
    ORDER BY ordinal_position
  `);
  console.log("\nFinal columns:");
  for (const col of cols.rows) {
    console.log(`  ${col.column_name}: ${col.data_type} nullable=${col.is_nullable}`);
  }

  await client.end();
  console.log("\nDone");
}

main();
