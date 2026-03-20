import { app, InvocationContext, Timer } from "@azure/functions";
import { scrapeUtahLegalsForeclosures } from "../sources/utah-legals.js";
import { upsertFromUtahLegals } from "../lib/upsert.js";
import { scoreAllProperties } from "../scoring/score.js";
import { updateScrapeHealth } from "../lib/health.js";
import { sendAlerts } from "../alerts/index.js";

/**
 * Utah Legals foreclosure notice scraper.
 *
 * Runs weekly on Mondays at 6:00 AM Mountain Time.
 * Scrapes utahlegals.com for trustee sale / foreclosure notices
 * in Carbon, Emery, Juab, and Millard counties, creating NOD signals
 * (highest weight = 3) for matching properties.
 *
 * NOD signals are the strongest distress indicator because they indicate
 * an active foreclosure proceeding with a published public notice.
 */
async function utahLegalsScrapeHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  context.log("Utah Legals scrape pipeline starting...");

  if (myTimer.isPastDue) {
    context.warn(
      "Timer is past due -- running catch-up execution. This may indicate the Function App was stopped or scaled down."
    );
  }

  let scrapeResult: { upserted: number; signals: number } | null = null;
  let scoreResults: { scored: number; hot: number } = { scored: 0, hot: 0 };

  // Step 1: Scrape Utah Legals foreclosure notices
  try {
    const notices = await scrapeUtahLegalsForeclosures();
    scrapeResult = await upsertFromUtahLegals(notices);

    await updateScrapeHealth({
      county: "utah-legals",
      source: "foreclosures",
      resultCount: notices.length,
      success: true,
    });

    context.log(
      `Utah Legals: scraped ${notices.length} notices, upserted ${scrapeResult.upserted} properties, ${scrapeResult.signals} NOD signals`
    );
  } catch (err) {
    context.error("Utah Legals scraper failed", err);
    await updateScrapeHealth({
      county: "utah-legals",
      source: "foreclosures",
      resultCount: 0,
      success: false,
    }).catch(() => {});
  }

  // Step 2: Re-score all properties
  try {
    scoreResults = await scoreAllProperties();
    context.log(
      `Scoring: ${scoreResults.scored} properties scored, ${scoreResults.hot} hot leads`
    );
  } catch (err) {
    context.error("Scoring failed", err);
  }

  // Step 3: Send alerts for new hot leads
  let alertResults = { emailSent: 0, smsSent: 0 };
  try {
    alertResults = await sendAlerts(context);
    context.log(
      `Alerts: ${alertResults.emailSent} email, ${alertResults.smsSent} SMS`
    );
  } catch (err) {
    context.error("Alert delivery failed", err);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  context.log("Utah Legals scrape complete", {
    scrape: scrapeResult,
    scoring: scoreResults,
    alerts: alertResults,
    isPastDue: myTimer.isPastDue,
    elapsedSeconds: elapsed,
  });
}

// Register the Azure Functions timer trigger
// Schedule: 6:00 AM every Monday
// WEBSITE_TIME_ZONE=America/Denver makes this Mountain Time
// runOnStartup: false -- NEVER true in production
app.timer("utah-legals-scrape", {
  schedule: "0 0 6 * * 1",
  runOnStartup: false,
  handler: utahLegalsScrapeHandler,
});

export { utahLegalsScrapeHandler };
