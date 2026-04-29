/**
 * Admin tool: lock a user account by rotating the password to an
 * unguessable random value. Account row stays in DB (preserves audit trail
 * + FK references like feedback_items.reporter_id) but no one can log in
 * until Phase 29 adds a proper users.is_active flag and a deactivate flow.
 *
 * Usage: cd app && npx tsx scripts/admin-lock-account.ts <email>
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomBytes } from "node:crypto";
import bcryptjs from "bcryptjs";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

async function main() {
  const email = (process.argv[2] ?? "").toLowerCase().trim();
  if (!email) {
    console.error("Usage: admin-lock-account.ts <email>");
    process.exit(1);
  }

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const { rows } = await c.query<{ id: string; email: string }>(
    `SELECT id, email FROM users WHERE email = $1`,
    [email]
  );
  if (rows.length === 0) {
    console.error(`No user found with email ${email}`);
    await c.end();
    process.exit(1);
  }

  const lockToken = randomBytes(48).toString("base64url");
  const hash = await bcryptjs.hash(lockToken, 12);

  await c.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [hash, rows[0].id]
  );

  // Also invalidate any pending password-reset tokens to prevent the locked
  // account from being unlocked through a stale reset email.
  await c.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [rows[0].id]
  );

  console.log(`Locked: ${email}`);
  console.log("Password rotated to a random 48-byte token (not stored anywhere).");
  console.log("Pending reset tokens invalidated.");
  console.log("Account row + history preserved. Re-enable via /reset-password flow if needed (run admin-reset-password.ts).");

  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
