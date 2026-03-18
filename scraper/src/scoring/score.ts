import { eq, sql } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { db } from "../db/client.js";
import {
  properties,
  distressSignals,
  leads,
  scraperConfig,
} from "../db/schema.js";
import type {
  SignalInput,
  ScoringConfig,
  ScoreResult,
  SignalConfig,
} from "./types.js";

// ── Pure scoring function (no DB dependency) ────────────────────────────────

/**
 * Calculate a weighted distress score for a single property from its signals.
 *
 * - Only active signals are considered
 * - Stale signals (older than freshness_days) are excluded
 * - Signals with no recorded_date are assumed recent and included
 * - Unknown signal types (no matching config) are skipped
 */
export function scoreProperty(
  signals: SignalInput[],
  config: ScoringConfig
): ScoreResult {
  const now = new Date();
  const configMap = new Map<string, SignalConfig>();
  for (const sc of config.signals) {
    configMap.set(sc.signal_type, sc);
  }

  const activeSignals = signals.filter((s) => s.status === "active");
  let score = 0;
  let scoredCount = 0;

  for (const signal of activeSignals) {
    const signalCfg = configMap.get(signal.signal_type);
    if (!signalCfg) continue; // unknown signal type -- skip

    // Freshness check
    if (signal.recorded_date !== null) {
      const ageDays = differenceInDays(now, signal.recorded_date);
      if (ageDays > signalCfg.freshness_days) continue; // stale -- exclude
    }
    // null recorded_date => assume recent, include

    score += signalCfg.weight;
    scoredCount++;
  }

  return {
    score,
    is_hot: score >= config.hot_lead_threshold,
    active_signal_count: activeSignals.length,
    scored_signal_count: scoredCount,
  };
}

// ── Database orchestrator ───────────────────────────────────────────────────

/**
 * Read scoring config from the scraperConfig table.
 * Falls back to empty config if rows are missing.
 */
async function loadScoringConfig(): Promise<ScoringConfig> {
  const rows = await db
    .select()
    .from(scraperConfig)
    .where(
      sql`${scraperConfig.key} IN ('scoring_signals', 'hot_lead_threshold')`
    );

  let signals: SignalConfig[] = [];
  let hotLeadThreshold = 4; // sensible default

  for (const row of rows) {
    if (row.key === "scoring_signals") {
      signals = JSON.parse(row.value) as SignalConfig[];
    } else if (row.key === "hot_lead_threshold") {
      hotLeadThreshold = Number(row.value);
    }
  }

  return { signals, hot_lead_threshold: hotLeadThreshold };
}

/**
 * Score all properties that have at least one active distress signal.
 * Reads config from scraperConfig table, computes scores via the pure
 * scoreProperty function, and upserts results into the leads table.
 */
export async function scoreAllProperties(): Promise<{
  scored: number;
  hot: number;
}> {
  const config = await loadScoringConfig();

  // Fetch all properties with their active distress signals
  const rows = await db
    .select({
      propertyId: properties.id,
      signalType: distressSignals.signalType,
      status: distressSignals.status,
      recordedDate: distressSignals.recordedDate,
    })
    .from(properties)
    .innerJoin(distressSignals, eq(distressSignals.propertyId, properties.id))
    .where(eq(distressSignals.status, "active"));

  // Group signals by property
  const propertySignals = new Map<string, SignalInput[]>();
  for (const row of rows) {
    const existing = propertySignals.get(row.propertyId) ?? [];
    existing.push({
      signal_type: row.signalType,
      recorded_date: row.recordedDate ? new Date(row.recordedDate) : null,
      status: row.status,
    });
    propertySignals.set(row.propertyId, existing);
  }

  let scored = 0;
  let hot = 0;
  const now = new Date();

  for (const [propertyId, signals] of propertySignals) {
    const result = scoreProperty(signals, config);

    // Upsert lead row
    await db
      .insert(leads)
      .values({
        propertyId,
        distressScore: result.score,
        isHot: result.is_hot,
        status: "new",
        newLeadStatus: "new",
        firstSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: leads.propertyId,
        set: {
          distressScore: result.score,
          isHot: result.is_hot,
          updatedAt: now,
        },
      });

    scored++;
    if (result.is_hot) hot++;
  }

  return { scored, hot };
}
