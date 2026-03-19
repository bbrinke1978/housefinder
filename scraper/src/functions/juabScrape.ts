import { app, InvocationContext, Timer } from "@azure/functions";
import {
  parsePdfDelinquent,
  parsePdfDelinquentFromUrl,
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
 * Uses the Juab County WordPress REST API to find the current delinquent tax
 * PDF URL directly — without launching Playwright.
 *
 * Strategy:
 * 1. Fetch the WP REST API posts endpoint, searching for "delinquent tax list".
 * 2. From the matching post's `content.rendered` HTML, extract the first
 *    <a href="..."> whose href ends in .pdf. This is the delinquent tax PDF.
 * 3. If no PDF href found in content, fall back to returning the post link so
 *    parsePdfDelinquent() can scrape it with Playwright as a last resort.
 *
 * This bypasses Playwright entirely for Juab — the PDF href is present in the
 * static HTML returned by the REST API, so no browser rendering is needed.
 * The Elementor page at juabcounty.gov never reaches Playwright's "networkidle"
 * within 60s due to continuous background requests from Elementor/analytics scripts.
 *
 * Returns:
 *   - { pdfUrl: string } when the PDF URL is found directly (skip Playwright)
 *   - { pageUrl: string } when only the post page URL is found (use Playwright)
 *   - null when neither is found (use hardcoded fallback in juabConfig)
 */
async function findJuabDelinquentPdfInfo(
  context: InvocationContext
): Promise<{ pdfUrl: string } | { pageUrl: string } | null> {
  const apiUrl =
    "https://juabcounty.gov/wp-json/wp/v2/posts?search=delinquent+tax+list&per_page=3&orderby=date&order=desc";

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const posts = await res.json() as Array<{
      link: string;
      title: { rendered: string };
      content: { rendered: string };
    }>;

    const currentYear = new Date().getFullYear().toString();

    // Find the best matching post: current year preferred, then most recent
    let targetPost: typeof posts[0] | null = null;
    for (const post of posts) {
      const title = post.title?.rendered ?? "";
      if (/delinquent.*tax.*list/i.test(title)) {
        if (title.includes(currentYear)) {
          targetPost = post;
          break;
        }
        if (!targetPost) targetPost = posts[0]; // fallback: most recent match
      }
    }
    if (!targetPost && posts.length > 0) {
      targetPost = posts[0];
    }

    if (!targetPost) {
      context.log("[juab] REST API returned no delinquent tax list posts");
      return null;
    }

    context.log(
      `[juab] Found delinquent post via REST API: "${targetPost.title?.rendered}" -> ${targetPost.link}`
    );

    // Extract PDF href directly from the post's rendered HTML content.
    // The Elementor widget embeds the PDF link as:
    //   <a href="https://juabcounty.gov/wp-content/uploads/YYYY/MM/Account-Balance28.pdf"
    // This avoids launching Playwright for a page that never reaches networkidle.
    const htmlContent = targetPost.content?.rendered ?? "";
    const pdfHrefMatch = htmlContent.match(/href="([^"]+\.pdf)"/i);
    if (pdfHrefMatch) {
      const pdfUrl = pdfHrefMatch[1];
      context.log(`[juab] Extracted PDF URL from REST API content: ${pdfUrl}`);
      return { pdfUrl };
    }

    // PDF href not found in content — return the page URL for Playwright fallback
    context.log(
      `[juab] No PDF href in REST API content; falling back to Playwright on page: ${targetPost.link}`
    );
    return { pageUrl: targetPost.link };
  } catch (err) {
    context.log(`[juab] REST API lookup failed: ${err}; falling back to hardcoded URL`);
    return null;
  }
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
      // Attempt to get the PDF URL directly from the WordPress REST API.
      // This avoids launching Playwright against the Elementor page, which never
      // reaches "networkidle" within 60s due to ongoing background requests.
      const pdfInfo = await findJuabDelinquentPdfInfo(context);

      let records: import("../lib/validation.js").DelinquentRecord[];

      if (pdfInfo && "pdfUrl" in pdfInfo) {
        // Best path: direct PDF URL extracted from REST API — no Playwright needed
        records = await parsePdfDelinquentFromUrl(pdfInfo.pdfUrl, juabConfig);
      } else {
        // Fallback: use Playwright to scrape the post page for the PDF link
        const pageUrl = pdfInfo && "pageUrl" in pdfInfo
          ? pdfInfo.pageUrl
          : juabConfig.treasurerPageUrl;
        const dynamicConfig: PdfCountyConfig = { ...juabConfig, treasurerPageUrl: pageUrl };
        records = await parsePdfDelinquent(dynamicConfig);
      }
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
