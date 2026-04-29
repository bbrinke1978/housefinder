/**
 * One-off backfill: rename owner_contacts.source = 'manual' → 'manual-1' so
 * the legacy bare 'manual' rows match the new manual-N convention.
 *
 * Safe to re-run (idempotent — looks for bare 'manual' only).
 *
 * Edge case: if a property somehow has BOTH 'manual' AND 'manual-1' already,
 * the bare 'manual' row would conflict on the unique (property_id, source)
 * index. We handle this by renaming to the next available manual-N for that
 * specific property.
 *
 * Usage: cd app && npx tsx scripts/backfill-manual-source-renumber.ts
 *        cd app && npx tsx scripts/backfill-manual-source-renumber.ts --execute
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

const EXECUTE = process.argv.includes("--execute");

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  console.log(EXECUTE ? "=== EXECUTING ===" : "=== DRY RUN ===");

  await client.query("BEGIN");
  try {
    // Find every property with a bare 'manual' row.
    const { rows: bareManuals } = await client.query<{ property_id: string }>(
      `SELECT property_id FROM owner_contacts WHERE source = 'manual'`
    );
    console.log(`Found ${bareManuals.length} legacy bare-'manual' rows`);

    let renamedToOne = 0;
    let renamedToOther = 0;
    let conflicts = 0;

    for (const row of bareManuals) {
      const pid = row.property_id;
      // Check what manual-N sources already exist for this property.
      const { rows: existingNumbered } = await client.query<{ source: string }>(
        `SELECT source FROM owner_contacts
         WHERE property_id = $1 AND source ~ '^manual-[0-9]+$'`,
        [pid]
      );

      let target = "manual-1";
      if (existingNumbered.length > 0) {
        // Pick the next available slot above any existing manual-N.
        let maxN = 0;
        for (const r of existingNumbered) {
          const m = r.source.match(/^manual-(\d+)$/);
          if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
        }
        target = `manual-${maxN + 1}`;
        conflicts++;
      }

      if (EXECUTE) {
        await client.query(
          `UPDATE owner_contacts SET source = $1 WHERE property_id = $2 AND source = 'manual'`,
          [target, pid]
        );
      }
      if (target === "manual-1") renamedToOne++;
      else renamedToOther++;
    }

    console.table([
      { metric: "Total bare 'manual' rows", count: bareManuals.length },
      { metric: "Renamed → manual-1 (clean case)", count: renamedToOne },
      { metric: "Renamed → manual-N (conflict avoidance)", count: renamedToOther },
      { metric: "Properties with pre-existing manual-N", count: conflicts },
    ]);

    // Post-update verification.
    const { rows: verify } = await client.query(
      `SELECT count(*) FILTER (WHERE source = 'manual') as bare_manual,
              count(*) FILTER (WHERE source ~ '^manual-[0-9]+$') as numbered_manual
       FROM owner_contacts`
    );
    console.log("\nPost-update state:");
    console.table(verify);

    if (EXECUTE) {
      await client.query("COMMIT");
      console.log("\n✓ COMMITTED");
    } else {
      await client.query("ROLLBACK");
      console.log("\n(dry-run: rolled back)");
    }
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    console.error("\nFAILED — rolled back:", msg);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
