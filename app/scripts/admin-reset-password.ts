/**
 * Admin tool: trigger a password reset email for any user.
 * Identical to the public /forgot-password flow but bypasses the rate limiter
 * because it's run from a trusted environment.
 *
 * Usage: cd app && npx tsx scripts/admin-reset-password.ts <email>
 *   e.g.  cd app && npx tsx scripts/admin-reset-password.ts shawn@no-bshomes.com
 */
import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

async function main() {
  const email = (process.argv[2] ?? "").toLowerCase().trim();
  if (!email) {
    console.error("Usage: admin-reset-password.ts <email>");
    process.exit(1);
  }

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const { rows } = await c.query<{ id: string; name: string; email: string }>(
    `SELECT id, name, email FROM users WHERE email = $1`,
    [email]
  );
  if (rows.length === 0) {
    console.error(`No user found with email ${email}`);
    await c.end();
    process.exit(1);
  }
  const user = rows[0];
  console.log(`Found: ${user.email} (${user.name})`);

  // Invalidate any existing unused tokens for this user (force a single fresh one).
  await c.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id]
  );

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour window since this is admin-issued
  await c.query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user.id, token, expiresAt]
  );

  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://finder.no-bshomes.com";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  console.log("Reset URL:", resetUrl);
  console.log("(Valid for 24 hours.)");

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set — token written but no email sent. Share the URL above directly.");
    await c.end();
    return;
  }

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: "No BS Workbench <onboarding@resend.dev>",
    to: user.email,
    subject: "Reset your password (admin-issued)",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e4d8c;">Password Reset</h2>
        <p>Hi ${user.name},</p>
        <p>An admin issued a password reset for your account. Click the link below to set a new password. This link expires in 24 hours.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #1e4d8c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">If you didn't expect this, contact Brian.</p>
      </div>
    `,
  });
  console.log(`Email sent to ${user.email}.`);

  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
