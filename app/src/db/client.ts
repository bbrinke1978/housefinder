import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 3,                        // ← was 20 (e092480 hotfix); reverted Phase 33
  idleTimeoutMillis: 10000,      // ← was 300000 (e092480 hotfix); reverted Phase 33
  connectionTimeoutMillis: 10000, // unchanged
});

export const db = drizzle({ client: pool, schema });
