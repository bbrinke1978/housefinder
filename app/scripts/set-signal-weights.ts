/**
 * Set scoring weights for new XChange signal types.
 * Threshold stays at 4 per user decision.
 */
import pg from "pg";
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL });

async function main() {
  await client.connect();
  console.log("Connected\n");

  const signals = [
    { type: "probate", weight: 3 },
    { type: "code_violation", weight: 2 },
    { type: "lis_pendens", weight: 2 },
  ];

  for (const s of signals) {
    await client.query(
      `INSERT INTO scraper_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [`scoring.weight.${s.type}`, String(s.weight)]
    );
    console.log(`  ✓ scoring.weight.${s.type} = ${s.weight}`);
  }

  const t = await client.query(`SELECT value FROM scraper_config WHERE key = 'scoring.hotLeadThreshold'`);
  console.log(`\n  Threshold: ${t.rows[0]?.value ?? "4 (default)"} — kept at 4 per user decision`);

  await client.end();
  console.log("\nDone");
}

main();
