/**
 * dry-run.ts — Read-only rescore simulation
 *
 * Reports the impact of activating new XChange signal types (probate,
 * code_violation, lis_pendens) against live DB data without writing anything.
 *
 * Usage:
 *   cd scraper && npx tsx src/scoring/dry-run.ts
 */

import { sql } from "drizzle-orm";
import { db, pool } from "../db/client.js";
import { distressSignals, properties, scraperConfig } from "../db/schema.js";
import { scoreProperty, deduplicateSignals } from "./score.js";
import type { SignalInput, ScoringConfig, SignalConfig } from "./types.js";

// ── Config loading ────────────────────────────────────────────────────────────

async function loadScoringConfig(): Promise<ScoringConfig> {
  const rows = await db
    .select()
    .from(scraperConfig)
    .where(
      sql`${scraperConfig.key} IN ('scoring_signals', 'hot_lead_threshold')`
    );

  let signals: SignalConfig[] = [];
  let hotLeadThreshold = 4;

  for (const row of rows) {
    if (row.key === "scoring_signals") {
      signals = JSON.parse(row.value) as SignalConfig[];
    } else if (row.key === "hot_lead_threshold") {
      hotLeadThreshold = Number(row.value);
    }
  }

  return { signals, hot_lead_threshold: hotLeadThreshold };
}

// ── Build simulated config with XChange signal types enabled ─────────────────

const XCHANGE_DEFAULTS: Record<string, { weight: number; freshness_days: number }> = {
  probate: { weight: 1, freshness_days: 730 },
  code_violation: { weight: 1, freshness_days: 365 },
  lis_pendens: { weight: 2, freshness_days: 365 },
};

function buildSimulatedConfig(base: ScoringConfig): ScoringConfig {
  const signals = [...base.signals];
  const existingTypes = new Set(signals.map((s) => s.signal_type));

  for (const [signalType, defaults] of Object.entries(XCHANGE_DEFAULTS)) {
    const existing = signals.findIndex((s) => s.signal_type === signalType);
    if (existing !== -1) {
      // Ensure weight is non-zero (use default if currently 0)
      if (signals[existing].weight === 0) {
        signals[existing] = { ...signals[existing], weight: defaults.weight };
      }
    } else if (!existingTypes.has(signalType)) {
      // Signal type not in config at all — add with defaults
      signals.push({ signal_type: signalType, ...defaults });
    }
  }

  return { ...base, signals };
}

// ── Score a set of properties at a given threshold ───────────────────────────

function scoreAtThreshold(
  propertySignals: Map<string, SignalInput[]>,
  config: ScoringConfig,
  threshold: number
): number {
  const configAtThreshold: ScoringConfig = { ...config, hot_lead_threshold: threshold };
  let hot = 0;
  for (const [, signals] of propertySignals) {
    const result = scoreProperty(signals, configAtThreshold);
    if (result.is_hot) hot++;
  }
  return hot;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Loading scoring config...");
  const baseConfig = await loadScoringConfig();
  const simConfig = buildSimulatedConfig(baseConfig);
  const threshold = baseConfig.hot_lead_threshold;

  console.log("Fetching distress signals from DB...");

  // Fetch ALL active signals (not inner-joined to properties — we want all signals)
  const signalRows = await db
    .select({
      propertyId: distressSignals.propertyId,
      signalType: distressSignals.signalType,
      status: distressSignals.status,
      recordedDate: distressSignals.recordedDate,
      rawData: distressSignals.rawData,
    })
    .from(distressSignals);

  const totalSignalRows = signalRows.length;

  // Group signals by propertyId
  const propertySignals = new Map<string, SignalInput[]>();
  for (const row of signalRows) {
    const existing = propertySignals.get(row.propertyId) ?? [];
    existing.push({
      signal_type: row.signalType,
      recorded_date: row.recordedDate ? new Date(row.recordedDate) : null,
      status: row.status,
      raw_data: row.rawData ?? null,
    });
    propertySignals.set(row.propertyId, existing);
  }

  const propertiesWithSignals = propertySignals.size;

  // ── Pass A: Baseline (current config) ────────────────────────────────────
  let baselineScored = 0;
  let baselineHot = 0;

  for (const [, signals] of propertySignals) {
    const result = scoreProperty(signals, baseConfig);
    if (result.scored_signal_count > 0) baselineScored++;
    if (result.is_hot) baselineHot++;
  }

  // ── Pass B: Simulated (new signal types active) ───────────────────────────
  let simScored = 0;
  let simHot = 0;

  // Per-signal-type counts (simulated, active signals contributing to score)
  const signalTypeCounts: Record<string, number> = {
    nod: 0,
    tax_lien: 0,
    lis_pendens: 0,
    probate: 0,
    code_violation: 0,
    vacant: 0,
  };

  // Dedup impact counters (across all properties)
  let nodBeforeDedup = 0;
  let nodAfterDedup = 0;
  let lpBeforeDedup = 0;
  let lpAfterDedup = 0;

  for (const [, signals] of propertySignals) {
    const activeSignals = signals.filter((s) => s.status === "active");

    // Count before dedup
    nodBeforeDedup += activeSignals.filter((s) => s.signal_type === "nod").length;
    lpBeforeDedup += activeSignals.filter((s) => s.signal_type === "lis_pendens").length;

    // Apply dedup
    const dedupedActive = deduplicateSignals(activeSignals);

    // Count after dedup
    nodAfterDedup += dedupedActive.filter((s) => s.signal_type === "nod").length;
    lpAfterDedup += dedupedActive.filter((s) => s.signal_type === "lis_pendens").length;

    // Count distinct signal types present (for breakdown)
    const typesPresent = new Set(dedupedActive.map((s) => s.signal_type));
    for (const t of typesPresent) {
      if (t in signalTypeCounts) {
        signalTypeCounts[t]++;
      }
    }

    const result = scoreProperty(signals, simConfig);
    if (result.scored_signal_count > 0) simScored++;
    if (result.is_hot) simHot++;
  }

  // ── Threshold guidance table ──────────────────────────────────────────────
  const thresholds = [4, 5, 6, 7];
  const thresholdCounts: Record<number, number> = {};
  for (const t of thresholds) {
    thresholdCounts[t] = scoreAtThreshold(propertySignals, simConfig, t);
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const baselineHotPct =
    baselineScored > 0 ? ((baselineHot / baselineScored) * 100).toFixed(1) : "0.0";
  const simHotPct =
    simScored > 0 ? ((simHot / simScored) * 100).toFixed(1) : "0.0";
  const deltaHot = simHot - baselineHot;

  console.log("");
  console.log("=== DRY-RUN RESCORE REPORT ===");
  console.log(`Date: ${today}`);
  console.log(`DB signals read: ${totalSignalRows}`);
  console.log(`Properties with signals: ${propertiesWithSignals}`);
  console.log("");
  console.log(`BASELINE (current config, threshold=${threshold}):`);
  console.log(`  Scored properties: ${baselineScored}`);
  console.log(`  Hot leads:         ${baselineHot}  (${baselineHotPct}%)`);
  console.log("");
  console.log(`SIMULATED (new signal types active, threshold=${threshold}):`);
  console.log(`  Scored properties: ${simScored}`);
  console.log(`  Hot leads:         ${simHot}  (${simHotPct}%)`);
  console.log(
    `  Delta hot leads:   +${deltaHot} (${deltaHot} additional)`
  );
  console.log("");
  console.log("BREAKDOWN BY SIGNAL TYPE (simulated, signals contributing to score):");
  console.log(`  nod:            ${signalTypeCounts.nod}`);
  console.log(`  tax_lien:       ${signalTypeCounts.tax_lien}`);
  console.log(`  lis_pendens:    ${signalTypeCounts.lis_pendens}`);
  console.log(`  probate:        ${signalTypeCounts.probate}`);
  console.log(`  code_violation: ${signalTypeCounts.code_violation}`);
  console.log(`  vacant:         ${signalTypeCounts.vacant}`);
  console.log("");
  console.log("DEDUPLICATION IMPACT:");
  console.log(`  NOD signals before dedup:         ${nodBeforeDedup}`);
  console.log(`  NOD signals after dedup:          ${nodAfterDedup}`);
  console.log(`  lis_pendens signals before dedup: ${lpBeforeDedup}`);
  console.log(`  lis_pendens signals after dedup:  ${lpAfterDedup}`);
  console.log("");
  console.log("THRESHOLD GUIDANCE:");
  for (const t of thresholds) {
    console.log(`  At threshold=${t}:  ${thresholdCounts[t]}  hot leads`);
  }
  console.log("=== END REPORT ===");
}

// ── CLI entry point ───────────────────────────────────────────────────────────
const isDirectRun =
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}` ||
  import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  main()
    .then(() => pool.end())
    .catch((err) => {
      console.error("dry-run failed:", err);
      pool.end().finally(() => process.exit(1));
    });
}
