import { app, InvocationContext, Timer } from "@azure/functions";
import { scrapeAssessor } from "../sources/carbon-assessor.js";
import { scrapeDelinquent } from "../sources/carbon-delinquent.js";
import { scrapeRecorder } from "../sources/carbon-recorder.js";
import {
  upsertFromAssessor,
  upsertFromDelinquent,
  upsertFromRecorder,
} from "../lib/upsert.js";
import { scoreAllProperties } from "../scoring/score.js";
import { updateScrapeHealth, checkHealthAlert } from "../lib/health.js";
import { seedDefaultConfig } from "../db/seed-config.js";

/**
 * Daily scrape pipeline orchestrator.
 *
 * Runs at 5 AM Mountain Time (WEBSITE_TIME_ZONE=America/Denver in Azure).
 * Orchestrates: seed config -> scrape all sources -> upsert -> score -> health check.
 *
 * Each scraper runs independently with its own try/catch for partial failure
 * tolerance: if assessor fails, delinquent and recorder still run.
 */
async function dailyScrape(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  context.log("Daily scrape pipeline starting...");

  if (myTimer.isPastDue) {
    context.warn(
      "Timer is past due -- running catch-up execution. This may indicate the Function App was stopped or scaled down."
    );
  }

  // Step 1: Ensure default scoring config exists (idempotent)
  try {
    await seedDefaultConfig();
  } catch (err) {
    context.error("Failed to seed default config", err);
    // Non-fatal: scoring will use hardcoded defaults if config missing
  }

  // Step 2: Run scrapers independently (partial failure tolerance)
  const results: {
    assessor: { upserted: number } | null;
    delinquent: { upserted: number; signals: number } | null;
    recorder: { upserted: number; signals: number } | null;
  } = {
    assessor: null,
    delinquent: null,
    recorder: null,
  };

  // Assessor scraper
  try {
    const assessorRecords = await scrapeAssessor();
    results.assessor = await upsertFromAssessor(assessorRecords);
    await updateScrapeHealth({
      county: "carbon",
      source: "assessor",
      resultCount: assessorRecords.length,
      success: true,
    });
    context.log(
      `Assessor: scraped ${assessorRecords.length} records, upserted ${results.assessor.upserted}`
    );
  } catch (err) {
    context.error("Assessor scraper failed", err);
    await updateScrapeHealth({
      county: "carbon",
      source: "assessor",
      resultCount: 0,
      success: false,
    });
  }

  // Delinquent tax scraper
  try {
    const delinquentRecords = await scrapeDelinquent();
    results.delinquent = await upsertFromDelinquent(delinquentRecords);
    await updateScrapeHealth({
      county: "carbon",
      source: "delinquent",
      resultCount: delinquentRecords.length,
      success: true,
    });
    context.log(
      `Delinquent: scraped ${delinquentRecords.length} records, upserted ${results.delinquent.upserted}, signals ${results.delinquent.signals}`
    );
  } catch (err) {
    context.error("Delinquent scraper failed", err);
    await updateScrapeHealth({
      county: "carbon",
      source: "delinquent",
      resultCount: 0,
      success: false,
    });
  }

  // Recorder scraper (currently placeholder)
  try {
    const recorderRecords = await scrapeRecorder();
    results.recorder = await upsertFromRecorder(recorderRecords);
    await updateScrapeHealth({
      county: "carbon",
      source: "recorder",
      resultCount: recorderRecords.length,
      success: true,
    });
    context.log(
      `Recorder: scraped ${recorderRecords.length} records, upserted ${results.recorder.upserted}, signals ${results.recorder.signals}`
    );
  } catch (err) {
    context.error("Recorder scraper failed", err);
    await updateScrapeHealth({
      county: "carbon",
      source: "recorder",
      resultCount: 0,
      success: false,
    });
  }

  // Step 3: Score all properties (runs even if some scrapers failed)
  let scoreResults: { scored: number; hot: number } = { scored: 0, hot: 0 };
  try {
    scoreResults = await scoreAllProperties();
    context.log(
      `Scoring: ${scoreResults.scored} properties scored, ${scoreResults.hot} hot leads`
    );
  } catch (err) {
    context.error("Scoring failed", err);
  }

  // Step 4: Health check
  try {
    await checkHealthAlert("carbon");
  } catch (err) {
    context.error("Health check failed", err);
  }

  // Step 5: Log summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  context.log("Daily scrape complete", {
    assessor: results.assessor,
    delinquent: results.delinquent,
    recorder: results.recorder,
    scoring: scoreResults,
    isPastDue: myTimer.isPastDue,
    elapsedSeconds: elapsed,
  });
}

// Register the Azure Functions timer trigger
// Schedule: 5 AM daily -- WEBSITE_TIME_ZONE=America/Denver makes this Mountain Time
// runOnStartup: false -- NEVER true in production (fires on every scale-out event)
app.timer("dailyScrape", {
  schedule: "0 0 5 * * *",
  runOnStartup: false,
  handler: dailyScrape,
});

export { dailyScrape };
