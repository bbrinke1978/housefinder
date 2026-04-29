/**
 * Day-1 RBAC seed
 *
 * Part 1: Assigns ['owner'] + is_active=true to the 3 existing @no-bshomes.com users.
 * Part 2: Backfills lead_manager_id = Brian's user_id for all leads where it is NULL.
 *
 * Idempotent — safe to re-run.
 *
 * Usage: cd app && npx tsx scripts/seed-rbac-day1.ts
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const OWNER_EMAILS = [
  "brian@no-bshomes.com",
  "shawn@no-bshomes.com",
  "admin@no-bshomes.com",
];

const BRIAN_EMAIL = "brian@no-bshomes.com";

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected to database.\n");

  // ── Part 1: User role assignments ──────────────────────────────────────────

  console.log("=== Part 1: User role assignments ===\n");

  for (const email of OWNER_EMAILS) {
    // Fetch current state
    const { rows: before } = await client.query(
      "SELECT id, email, roles, is_active FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (before.length === 0) {
      console.warn(`  WARN: User not found: ${email} — skipping`);
      continue;
    }

    const user = before[0] as { id: string; email: string; roles: string[]; is_active: boolean };
    console.log(`  Before: ${user.email} | roles=${JSON.stringify(user.roles)} | is_active=${user.is_active}`);

    await client.query(
      "UPDATE users SET roles = $1, is_active = true WHERE email = $2",
      [["owner"], email]
    );

    const { rows: after } = await client.query(
      "SELECT email, roles, is_active FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
    const u = after[0] as { email: string; roles: string[]; is_active: boolean };
    console.log(`  After:  ${u.email} | roles=${JSON.stringify(u.roles)} | is_active=${u.is_active}`);
    console.log();
  }

  // ── Part 2: Lead backfill ──────────────────────────────────────────────────

  console.log("=== Part 2: Lead backfill ===\n");

  // Get Brian's user_id
  const { rows: brianRows } = await client.query(
    "SELECT id FROM users WHERE email = $1 LIMIT 1",
    [BRIAN_EMAIL]
  );

  if (brianRows.length === 0) {
    console.error(`ERROR: Brian (${BRIAN_EMAIL}) not found in users table`);
    await client.end();
    process.exit(1);
  }

  const brianId = (brianRows[0] as { id: string }).id;
  console.log(`  Brian's user_id: ${brianId}`);

  // Count leads with NULL lead_manager_id before
  const { rows: countBefore } = await client.query(
    "SELECT count(*) AS cnt FROM leads WHERE lead_manager_id IS NULL"
  );
  const before = parseInt((countBefore[0] as { cnt: string }).cnt, 10);
  console.log(`  Leads with NULL lead_manager_id (before): ${before}`);

  // Update all NULL lead_manager_id rows
  const { rowCount } = await client.query(
    "UPDATE leads SET lead_manager_id = $1 WHERE lead_manager_id IS NULL",
    [brianId]
  );
  console.log(`  Updated: ${rowCount} leads`);

  // Count after
  const { rows: countAfter } = await client.query(
    "SELECT count(*) AS cnt FROM leads WHERE lead_manager_id IS NULL"
  );
  const remaining = parseInt((countAfter[0] as { cnt: string }).cnt, 10);
  console.log(`  Leads with NULL lead_manager_id (after): ${remaining}`);

  if (remaining !== 0) {
    console.error(`  ERROR: Still ${remaining} leads with NULL lead_manager_id!`);
    await client.end();
    process.exit(1);
  }

  // ── Final verification ─────────────────────────────────────────────────────

  console.log("\n=== Final verification ===\n");

  const { rows: allUsers } = await client.query(
    "SELECT email, roles, is_active FROM users ORDER BY email"
  );
  console.log("All users:");
  console.table(allUsers);

  await client.end();
  console.log("\nDay-1 RBAC seed complete.");
}

main().catch((err) => { console.error(err); process.exit(1); });
