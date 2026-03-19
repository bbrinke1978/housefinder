import { app, InvocationContext, Timer } from "@azure/functions";
import { scrapeEmeryTaxRoll } from "../sources/emery-tax-roll.js";
import { parseEmeryDelinquentPdf } from "../sources/emery-delinquent-pdf.js";
import {
  upsertFromAssessor,
  upsertFromDelinquent,
} from "../lib/upsert.js";
import { scoreAllProperties } from "../scoring/score.js";
import { updateScrapeHealth, checkHealthAlert } from "../lib/health.js";
import { seedDefaultConfig } from "../db/seed-config.js";
import { sendAlerts } from "../alerts/index.js";
import { db } from "../db/client.js";
import { scraperConfig } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Emery County scrape pipeline orchestrator.
 *
 * Runs at 5:15 AM Mountain Time (staggered 15 minutes after Carbon County).
 * Orchestrates: seed config -> scrape tax roll -> parse delinquent PDF -> upsert -> score -> health check -> alerts.
 *
 * Each source runs independently with its own try/catch for partial failure
 * tolerance: if tax roll fails, delinquent PDF still runs.
 */
async function emeryScrapeHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  context.log("Emery County scrape pipeline starting...");

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
  }

  // Step 2: Run scrapers independently (partial failure tolerance)
  const results: {
    taxRoll: { upserted: number } | null;
    delinquent: { upserted: number; signals: number } | null;
  } = {
    taxRoll: null,
    delinquent: null,
  };

  // Tax roll scraper (wpDataTables)
  try {
    const taxRollRecords = await scrapeEmeryTaxRoll();
    results.taxRoll = await upsertFromAssessor(taxRollRecords, "emery");
    await updateScrapeHealth({
      county: "emery",
      source: "tax-roll",
      resultCount: taxRollRecords.length,
      success: true,
    });
    context.log(
      `Emery tax roll: scraped ${taxRollRecords.length} records, upserted ${results.taxRoll.upserted}`
    );
  } catch (err) {
    context.error("Emery tax roll scraper failed", err);
    await updateScrapeHealth({
      county: "emery",
      source: "tax-roll",
      resultCount: 0,
      success: false,
    });
  }

  // Delinquent PDF parser (annual -- skip if already parsed this year)
  try {
    const currentYear = new Date().getFullYear().toString();
    const configKey = "emery.delinquent.lastParsedYear";

    // Check if we already parsed this year's PDF
    const existing = await db
      .select({ value: scraperConfig.value })
      .from(scraperConfig)
      .where(eq(scraperConfig.key, configKey));

    const lastParsedYear = existing.length > 0 ? existing[0].value : null;

    if (lastParsedYear === currentYear) {
      context.log(
        `Emery delinquent PDF: already parsed for ${currentYear}, skipping`
      );
    } else {
      const delinquentRecords = await parseEmeryDelinquentPdf();
      results.delinquent = await upsertFromDelinquent(delinquentRecords, "emery");

      // Record that we parsed this year's PDF
      if (delinquentRecords.length > 0) {
        await db
          .insert(scraperConfig)
          .values({
            key: configKey,
            value: currentYear,
            description: "Last year the Emery County delinquent PDF was parsed",
          })
          .onConflictDoUpdate({
            target: scraperConfig.key,
            set: {
              value: currentYear,
              updatedAt: new Date(),
            },
          });
      }

      await updateScrapeHealth({
        county: "emery",
        source: "delinquent-pdf",
        resultCount: delinquentRecords.length,
        success: true,
      });
      context.log(
        `Emery delinquent PDF: parsed ${delinquentRecords.length} records, upserted ${results.delinquent.upserted}, signals ${results.delinquent.signals}`
      );
    }
  } catch (err) {
    context.error("Emery delinquent PDF parser failed", err);
    await updateScrapeHealth({
      county: "emery",
      source: "delinquent-pdf",
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
    await checkHealthAlert("emery");
  } catch (err) {
    context.error("Health check failed", err);
  }

  // Step 5: Send alerts (after scoring)
  let alertResults = { emailSent: 0, smsSent: 0 };
  try {
    alertResults = await sendAlerts(context);
    context.log(
      `Alerts: ${alertResults.emailSent} email, ${alertResults.smsSent} SMS`
    );
  } catch (err) {
    context.error("Alert delivery failed", err);
  }

  // Step 6: Log summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  context.log("Emery County scrape complete", {
    taxRoll: results.taxRoll,
    delinquent: results.delinquent,
    scoring: scoreResults,
    alerts: alertResults,
    isPastDue: myTimer.isPastDue,
    elapsedSeconds: elapsed,
  });
}

// Register the Azure Functions timer trigger
// Schedule: 5:15 AM daily -- staggered 15 minutes after Carbon County's 5:00 AM
// WEBSITE_TIME_ZONE=America/Denver makes this Mountain Time
// runOnStartup: false -- NEVER true in production (fires on every scale-out event)
app.timer("emery-scrape", {
  schedule: "0 15 5 * * *",
  runOnStartup: false,
  handler: emeryScrapeHandler,
});

export { emeryScrapeHandler };
