/**
 * Admin tool: create a user account with a temp password and assigned roles.
 *
 * The temp password is printed to stdout for the operator to share via secure
 * channel (text / Slack / phone). The new user should change it on first
 * login via the /forgot-password flow (we don't have an in-app change-password
 * UI yet, but the reset flow accomplishes the same thing).
 *
 * Usage:
 *   cd app && npx tsx scripts/admin-create-user.ts <email> <name> <roles>
 *   e.g. cd app && npx tsx scripts/admin-create-user.ts stacee@no-bshomes.com Stacee lead_manager
 *
 * Roles can be comma-separated for multi-role users:
 *   chris@no-bshomes.com Chris sales,assistant
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomBytes } from "node:crypto";
import bcryptjs from "bcryptjs";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

const VALID_ROLES = new Set([
  "owner",
  "acquisition_manager",
  "disposition_manager",
  "lead_manager",
  "transaction_coordinator",
  "sales",
  "assistant",
]);

/**
 * Generate a 16-character temp password formatted as 4-4-4-4 groups so it's
 * easy to dictate over the phone or text. Mixed-case alphanumeric, no
 * confusable characters (0/O, 1/l/I, etc.) and no special characters that
 * might get auto-formatted by texting apps.
 */
function generateTempPassword(): string {
  const safeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) {
      const idx = randomBytes(1)[0] % safeAlphabet.length;
      group += safeAlphabet[idx];
    }
    groups.push(group);
  }
  return groups.join("-");
}

async function main() {
  const email = (process.argv[2] ?? "").toLowerCase().trim();
  const name = (process.argv[3] ?? "").trim();
  const rolesArg = (process.argv[4] ?? "").trim();

  if (!email || !name || !rolesArg) {
    console.error("Usage: admin-create-user.ts <email> <name> <comma-separated-roles>");
    console.error("  e.g. admin-create-user.ts stacee@no-bshomes.com Stacee lead_manager");
    process.exit(1);
  }
  if (!email.endsWith("@no-bshomes.com")) {
    console.error("Email must end with @no-bshomes.com (domain restriction).");
    process.exit(1);
  }

  const roles = rolesArg.split(",").map((r) => r.trim()).filter((r) => r.length > 0);
  for (const r of roles) {
    if (!VALID_ROLES.has(r)) {
      console.error(`Invalid role: '${r}'. Valid roles: ${[...VALID_ROLES].join(", ")}`);
      process.exit(1);
    }
  }
  if (roles.length === 0) {
    console.error("At least one role is required (or the user can't log in).");
    process.exit(1);
  }

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Check for existing user.
  const { rows: existing } = await c.query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );
  if (existing.length > 0) {
    console.error(`User ${email} already exists. Use admin-reset-password.ts to issue a fresh reset URL instead.`);
    await c.end();
    process.exit(1);
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcryptjs.hash(tempPassword, 12);

  const { rows: inserted } = await c.query<{ id: string }>(
    `INSERT INTO users (email, name, password_hash, roles, is_active)
     VALUES ($1, $2, $3, $4::text[], true)
     RETURNING id`,
    [email, name, passwordHash, roles]
  );

  console.log("\n✓ User created.");
  console.log("─────────────────────────────────────────");
  console.log(`  email:    ${email}`);
  console.log(`  name:     ${name}`);
  console.log(`  roles:    [${roles.join(", ")}]`);
  console.log(`  user_id:  ${inserted[0].id}`);
  console.log(`\n  TEMP PASSWORD (share via secure channel):`);
  console.log(`  ┌────────────────────────────┐`);
  console.log(`  │  ${tempPassword}  │`);
  console.log(`  └────────────────────────────┘`);
  console.log(`\n  First login: ${process.env.NEXTAUTH_URL || "https://finder.no-bshomes.com"}/login`);
  console.log(`  After login, the user should rotate the password via /forgot-password.`);
  console.log("─────────────────────────────────────────\n");

  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
