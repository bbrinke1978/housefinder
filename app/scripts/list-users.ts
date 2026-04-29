import pg from "pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });
const { Client } = pg;

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query(
    `SELECT id, email, name, created_at FROM users ORDER BY created_at`
  );
  console.table(rows.map((r) => ({
    id: r.id.slice(0, 8) + "…",
    email: r.email,
    name: r.name,
    created: r.created_at.toISOString().slice(0, 10),
  })));
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
