import { app, InvocationContext, Timer } from "@azure/functions";
import {
  parsePdfDelinquent,
  sanpeteConfig,
} from "../sources/pdf-delinquent-parser.js";
import { upsertFromDelinquent } from "../lib/upsert.js";
import { scoreAllProperties } from "../scoring/score.js";
import { updateScrapeHealth, checkHealthAlert } from "../lib/health.js";
import { seedDefaultConfig } from "../db/seed-config.js";
import { sendAlerts } from "../alerts/index.js";
import { db } from "../db/client.js";
import { scraperConfig } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Sanpete County scrape pipeline orchestrator.
 *
 * Runs at 6:15 AM Mountain Time (staggered after Millard at 6:00).
 * Parses annual delinquent tax PDF, upserts properties with tax_lien signals,
 * then scores and sends alerts.
 */
async function sanpeteScrapeHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  context.log("Sanpete County scrape pipeline starting...");

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

  // Step 2: Delinquent PDF parser (annual -- skip if already parsed this year)
  let delinquentResult: { upserted: number; signals: number } | null = null;
  try {
    const currentYear = new Date().getFullYear().toString();
    const configKey = "sanpete.delinquent.lastParsedYear";

    const existing = await db
      .select({ value: scraperConfig.value })
      .from(scraperConfig)
      .where(eq(scraperConfig.key, configKey));

    const lastParsedYear = existing.length > 0 ? existing[0].value : null;

    if (lastParsedYear === currentYear) {
      context.log(
        `[sanpete] PDF already parsed for ${currentYear}, skipping`
      );
    } else {
      const records = await parsePdfDelinquent(sanpeteConfig);
      delinquentResult = await upsertFromDelinquent(records, "sanpete");

      if (records.length > 0) {
        await db
          .insert(scraperConfig)
          .values({
            key: configKey,
            value: currentYear,
            description:
              "Last year the Sanpete County delinquent PDF was parsed",
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
        county: "sanpete",
        source: "delinquent-pdf",
        resultCount: records.length,
        success: true,
      });
      context.log(
        `Sanpete delinquent PDF: parsed ${records.length} records, upserted ${delinquentResult.upserted}, signals ${delinquentResult.signals}`
      );
    }
  } catch (err) {
    context.error("Sanpete delinquent PDF parser failed", err);
    await updateScrapeHealth({
      county: "sanpete",
      source: "delinquent-pdf",
      resultCount: 0,
      success: false,
    });
  }

  // Step 3: Score all properties
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
    await checkHealthAlert("sanpete");
  } catch (err) {
    context.error("Health check failed", err);
  }

  // Step 5: Send alerts
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
  context.log("Sanpete County scrape complete", {
    delinquent: delinquentResult,
    scoring: scoreResults,
    alerts: alertResults,
    isPastDue: myTimer.isPastDue,
    elapsedSeconds: elapsed,
  });
}

// Register the Azure Functions timer trigger
// Schedule: 6:15 AM daily -- staggered after Millard County's 6:00 AM
// WEBSITE_TIME_ZONE=America/Denver makes this Mountain Time
// runOnStartup: false -- NEVER true in production (fires on every scale-out event)
app.timer("sanpete-scrape", {
  schedule: "0 15 6 * * *",
  runOnStartup: false,
  handler: sanpeteScrapeHandler,
});

export { sanpeteScrapeHandler };
