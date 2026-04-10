import { db } from "@/db/client";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import bcryptjs from "bcryptjs";

export const dynamic = "force-dynamic";

const MIGRATION_KEY = process.env.WEBSITE_LEAD_API_KEY;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key || key !== MIGRATION_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // Create users table
    try {
      await db.execute(sql`
        CREATE TABLE users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL UNIQUE,
          name text NOT NULL,
          password_hash text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      results.push("users table created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`users table: skipped (${msg})`);
    }

    // Create password_reset_tokens table
    try {
      await db.execute(sql`
        CREATE TABLE password_reset_tokens (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id),
          token text NOT NULL UNIQUE,
          expires_at timestamptz NOT NULL,
          used_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      await db.execute(sql`CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token)`);
      await db.execute(sql`CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`);
      results.push("password_reset_tokens table created");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push(`password_reset_tokens: skipped (${msg})`);
    }

    // Seed 3 users
    const passwordHash = await bcryptjs.hash("HouseFinder2026!", 10);
    const seedUsers = [
      { email: "brian@no-bshomes.com", name: "Brian" },
      { email: "shawn@no-bshomes.com", name: "Shawn" },
      { email: "admin@no-bshomes.com", name: "Admin" },
    ];

    for (const u of seedUsers) {
      try {
        await db
          .insert(users)
          .values({ email: u.email, name: u.name, passwordHash })
          .onConflictDoNothing();
        results.push(`user ${u.email} created`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push(`user ${u.email}: skipped (${msg})`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, results }, { status: 500 });
  }
}
