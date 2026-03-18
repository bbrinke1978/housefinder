import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { scraperHealth } from "../db/schema.js";

/**
 * Update scraper health tracking for a county after a scrape run.
 *
 * - On success with results: reset consecutiveZeroResults, update lastSuccessAt
 * - On success with zero results: increment consecutiveZeroResults
 * - On failure: update lastRunAt only, do NOT update lastSuccessAt
 *
 * Uses upsert on county UNIQUE constraint.
 */
export async function updateScrapeHealth(params: {
  county: string;
  source: string;
  resultCount: number;
  success: boolean;
}): Promise<void> {
  const { county, source, resultCount, success } = params;
  const now = new Date();

  if (success) {
    await db
      .insert(scraperHealth)
      .values({
        county,
        lastRunAt: now,
        lastSuccessAt: now,
        lastResultCount: resultCount,
        consecutiveZeroResults: resultCount === 0 ? 1 : 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: scraperHealth.county,
        set: {
          lastRunAt: now,
          lastSuccessAt: now,
          lastResultCount: resultCount,
          consecutiveZeroResults:
            resultCount === 0
              ? sql`${scraperHealth.consecutiveZeroResults} + 1`
              : sql`0`,
          updatedAt: now,
        },
      });
  } else {
    // Failure: only update lastRunAt, do NOT update lastSuccessAt
    await db
      .insert(scraperHealth)
      .values({
        county,
        lastRunAt: now,
        lastResultCount: 0,
        consecutiveZeroResults: 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: scraperHealth.county,
        set: {
          lastRunAt: now,
          updatedAt: now,
        },
      });
  }

  console.log(
    `[health] ${county}/${source}: success=${success}, resultCount=${resultCount}`
  );
}

/**
 * Check if a county's scraper is in an unhealthy state.
 * Returns alert: true if there have been 3+ consecutive zero-result runs.
 * Logs at ERROR level when alert is triggered.
 */
export async function checkHealthAlert(
  county: string
): Promise<{ alert: boolean; consecutiveZeros: number }> {
  const rows = await db
    .select({
      consecutiveZeroResults: scraperHealth.consecutiveZeroResults,
    })
    .from(scraperHealth)
    .where(eq(scraperHealth.county, county));

  if (rows.length === 0) {
    return { alert: false, consecutiveZeros: 0 };
  }

  const consecutiveZeros = rows[0].consecutiveZeroResults;
  const alert = consecutiveZeros >= 3;

  if (alert) {
    console.error(
      `ALERT: ${county} scraper has produced zero results for ${consecutiveZeros} consecutive runs. Manual investigation required.`
    );
  }

  return { alert, consecutiveZeros };
}
