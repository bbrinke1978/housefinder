import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 20,
  idleTimeoutMillis: 300000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({ client: pool, schema });
