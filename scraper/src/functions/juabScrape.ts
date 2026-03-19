import { app, InvocationContext, Timer } from "@azure/functions";
import {
  parsePdfDelinquent,
  juabConfig,
  type PdfCountyConfig,
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
 * Uses the Juab County WordPress REST API to find the URL of the most recent
 * post with "Delinquent Tax List" in the title (e.g. "NOTICE: 2025 Delinquent
 * Tax List"). Returns the post URL to use as the treasurerPageUrl, or falls
 * back to the hardcoded URL in juabConfig if the API is unavailable.
 *
 * This handles the fact that Juab County posts each year's delinquent tax list
 * as a WordPress post with a new slug each year rather than updating a permanent
 * treasurer page.
 */
async function findJuabDelinquentPostUrl(context: InvocationContext): Promise<string> {
  const apiUrl =
    "https://juabcounty.gov/wp-json/wp/v2/posts?search=delinquent+tax+list&per_page=3&orderby=date&order=desc";

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const posts = await res.json() as Array<{ link: string; title: { rendered: string } }>;
    const currentYear = new Date().getFullYear().toString();

    // Find a post for the current year with "Delinquent Tax List" in the title
    for (const post of posts) {
      const title = post.title?.rendered ?? "";
      if (/delinquent.*tax.*list/i.test(title) && title.includes(currentYear)) {
        context.log(`[juab] Found delinquent post via REST API: "${title}" -> ${post.link}`);
        return post.link;
      }
    }

    // Fall back: any post with delinquent tax list (most recent)
    if (posts.length > 0 && /delinquent.*tax.*list/i.test(posts[0].title?.rendered ?? "")) {
      context.log(
        `[juab] No ${currentYear} post found; using most recent: "${posts[0].title?.rendered}" -> ${posts[0].link}`
      );
      return posts[0].link;
    }

    context.log("[juab] REST API returned no matching posts; falling back to hardcoded URL");
  } catch (err) {
    context.log(`[juab] REST API lookup failed: ${err}; falling back to hardcoded URL`);
  }

  return juabConfig.treasurerPageUrl;
}

/**
 * Juab County scrape pipeline orchestrator.
 *
 * Runs at 5:45 AM Mountain Time (staggered after Sevier at 5:30).
 * Parses annual delinquent tax PDF, upserts properties with tax_lien signals,
 * then scores and sends alerts.
 */
async function juabScrapeHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  context.log("Juab County scrape pipeline starting...");

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
    const configKey = "juab.delinquent.lastParsedYear";

    const existing = await db
      .select({ value: scraperConfig.value })
      .from(scraperConfig)
      .where(eq(scraperConfig.key, configKey));

    const lastParsedYear = existing.length > 0 ? existing[0].value : null;

    if (lastParsedYear === currentYear) {
      context.log(
        `[juab] PDF already parsed for ${currentYear}, skipping`
      );
    } else {
      // Dynamically discover the current year's delinquent tax list post URL
      const postUrl = await findJuabDelinquentPostUrl(context);
      const dynamicConfig: PdfCountyConfig = { ...juabConfig, treasurerPageUrl: postUrl };
      const records = await parsePdfDelinquent(dynamicConfig);
      delinquentResult = await upsertFromDelinquent(records, "juab");

      if (records.length > 0) {
        await db
          .insert(scraperConfig)
          .values({
            key: configKey,
            value: currentYear,
            description:
              "Last year the Juab County delinquent PDF was parsed",
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
        county: "juab",
        source: "delinquent-pdf",
        resultCount: records.length,
        success: true,
      });
      context.log(
        `Juab delinquent PDF: parsed ${records.length} records, upserted ${delinquentResult.upserted}, signals ${delinquentResult.signals}`
      );
    }
  } catch (err) {
    context.error("Juab delinquent PDF parser failed", err);
    await updateScrapeHealth({
      county: "juab",
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
    await checkHealthAlert("juab");
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
  context.log("Juab County scrape complete", {
    delinquent: delinquentResult,
    scoring: scoreResults,
    alerts: alertResults,
    isPastDue: myTimer.isPastDue,
    elapsedSeconds: elapsed,
  });
}

// Register the Azure Functions timer trigger
// Schedule: 5:45 AM daily -- staggered after Sevier County's 5:30 AM
// WEBSITE_TIME_ZONE=America/Denver makes this Mountain Time
// runOnStartup: false -- NEVER true in production (fires on every scale-out event)
app.timer("juab-scrape", {
  schedule: "0 45 5 * * *",
  runOnStartup: false,
  handler: juabScrapeHandler,
});

export { juabScrapeHandler };
