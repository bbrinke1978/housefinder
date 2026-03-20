/**
 * One-shot script: rescore all leads using the updated tiered tax_lien weights.
 *
 * Run with:
 *   DATABASE_URL="..." node src/scripts/rescore-leads.mjs
 *
 * This script connects directly with pg to avoid needing the full drizzle
 * scraper build. It replicates the scoring logic from score.ts.
 */

import pg from "pg";

const { Pool } = pg;

const DB_URL =
  process.env.DATABASE_URL ||
  "postgresql://hfadmin:L0K9dV6bgKl67mH084PUOFlBGSPJ80@housefinder-db.postgres.database.azure.com:5432/housefinder?sslmode=require";

const pool = new Pool({ connectionString: DB_URL });

// ── Scoring config (mirrors scraper/src/db/seed-config.ts) ─────────────────

const DEFAULT_SIGNALS = [
  { signal_type: "nod", weight: 3, freshness_days: 75 },
  { signal_type: "tax_lien", weight: 2, freshness_days: 365 },
  { signal_type: "lis_pendens", weight: 2, freshness_days: 180 },
  { signal_type: "probate", weight: 1, freshness_days: 365 },
  { signal_type: "code_violation", weight: 1, freshness_days: 365 },
  { signal_type: "vacant", weight: 1, freshness_days: 365 },
];

const DEFAULT_HOT_LEAD_THRESHOLD = 4;

// ── Tiered tax_lien weight by amount ────────────────────────────────────────

function taxLienAmountWeight(rawData) {
  if (!rawData) return 1;
  try {
    const parsed = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
    const amountStr = parsed.amountDue;
    if (!amountStr || amountStr === "") return 1;
    const amount = parseFloat(String(amountStr).replace(/,/g, ""));
    if (isNaN(amount)) return 1;
    if (amount >= 1000) return 4;
    if (amount >= 500) return 3;
    if (amount >= 100) return 2;
    return 1;
  } catch {
    return 1;
  }
}

// ── Load scoring config from DB ─────────────────────────────────────────────

async function loadScoringConfig() {
  const result = await pool.query(
    "SELECT key, value FROM scraper_config WHERE key IN ('scoring_signals', 'hot_lead_threshold')"
  );

  let signals = DEFAULT_SIGNALS;
  let hotLeadThreshold = DEFAULT_HOT_LEAD_THRESHOLD;

  for (const row of result.rows) {
    if (row.key === "scoring_signals") {
      try {
        signals = JSON.parse(row.value);
      } catch {
        // use default
      }
    } else if (row.key === "hot_lead_threshold") {
      hotLeadThreshold = Number(row.value);
    }
  }

  return { signals, hotLeadThreshold };
}

// ── Score a property from its signals ───────────────────────────────────────

function scoreProperty(signals, config) {
  const now = new Date();
  const configMap = new Map(config.signals.map((s) => [s.signal_type, s]));

  const activeSignals = signals.filter((s) => s.status === "active");
  let score = 0;
  let scoredCount = 0;
  const scoredTaxLiens = [];

  for (const signal of activeSignals) {
    const signalCfg = configMap.get(signal.signal_type);
    if (!signalCfg) continue;

    // Freshness check
    if (signal.recorded_date) {
      const ageDays = Math.floor(
        (now - new Date(signal.recorded_date)) / (1000 * 60 * 60 * 24)
      );
      if (ageDays > signalCfg.freshness_days) continue;
    }

    if (signal.signal_type === "tax_lien") {
      const weight = taxLienAmountWeight(signal.raw_data);
      score += weight;
      scoredTaxLiens.push(signal);
    } else {
      score += signalCfg.weight;
    }
    scoredCount++;
  }

  // Multi-year bonus: each extra tax_lien signal adds +1
  if (scoredTaxLiens.length > 1) {
    score += scoredTaxLiens.length - 1;
  }

  return {
    score,
    is_hot: score >= config.hotLeadThreshold,
    active_signal_count: activeSignals.length,
    scored_signal_count: scoredCount,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Loading scoring config...");
  const config = await loadScoringConfig();
  console.log(`  hot_lead_threshold: ${config.hotLeadThreshold}`);
  console.log(`  signal_types: ${config.signals.map((s) => `${s.signal_type}(w=${s.weight})`).join(", ")}`);

  console.log("Fetching all active signals...");
  const signalRows = await pool.query(`
    SELECT
      p.id as property_id,
      ds.signal_type,
      ds.status,
      ds.recorded_date,
      ds.raw_data
    FROM properties p
    INNER JOIN distress_signals ds ON ds.property_id = p.id
    WHERE ds.status = 'active'
    ORDER BY p.id, ds.recorded_date
  `);

  console.log(`  ${signalRows.rows.length} signal rows fetched`);

  // Group by property
  const propertySignals = new Map();
  for (const row of signalRows.rows) {
    const existing = propertySignals.get(row.property_id) ?? [];
    existing.push(row);
    propertySignals.set(row.property_id, existing);
  }

  console.log(`  ${propertySignals.size} properties with active signals`);

  // Score distribution tracking
  const scoreDistribution = {};
  let scored = 0;
  let hot = 0;

  // Process in batches of 500
  const entries = Array.from(propertySignals.entries());
  const batchSize = 500;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const now = new Date();

    // Build upsert values
    const upsertValues = [];
    for (const [propertyId, signals] of batch) {
      const result = scoreProperty(signals, config);
      upsertValues.push({
        propertyId,
        distressScore: result.score,
        isHot: result.is_hot,
      });

      scoreDistribution[result.score] = (scoreDistribution[result.score] ?? 0) + 1;
      scored++;
      if (result.is_hot) hot++;
    }

    // Batch upsert
    for (const v of upsertValues) {
      await pool.query(
        `INSERT INTO leads (property_id, distress_score, is_hot, status, new_lead_status, first_seen_at, updated_at)
         VALUES ($1, $2, $3, 'new', 'new', $4, $4)
         ON CONFLICT (property_id) DO UPDATE SET
           distress_score = EXCLUDED.distress_score,
           is_hot = EXCLUDED.is_hot,
           updated_at = EXCLUDED.updated_at`,
        [v.propertyId, v.distressScore, v.isHot, now]
      );
    }

    console.log(`  Processed ${Math.min(i + batchSize, entries.length)}/${entries.length} properties...`);
  }

  console.log("\nRescore complete!");
  console.log(`  Total scored: ${scored}`);
  console.log(`  Hot leads: ${hot}`);
  console.log("\nScore distribution:");
  for (const [score, count] of Object.entries(scoreDistribution).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  score ${score}: ${count} properties`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exitCode = 1;
  pool.end();
});
