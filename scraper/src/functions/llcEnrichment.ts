/**
 * LLC Enrichment Azure Function
 *
 * Resolves LLC owner names to registered agent contact info via the
 * Utah Division of Corporations Business Entity Search.
 *
 * Two triggers:
 *   1. Timer trigger: Wednesdays at 7 AM Mountain Time (weekly)
 *   2. HTTP trigger: Manual invocation for on-demand enrichment
 *
 * The timer runs weekly (not daily) because:
 * - Only 370 LLCs need initial enrichment (runs through them quickly)
 * - Subsequent runs only process new LLCs added since last run
 * - Being polite to the BES server
 */

import { app, InvocationContext, Timer, HttpRequest, HttpResponseInit } from "@azure/functions";
import { enrichLlcOwners } from "../sources/llc-enrichment.js";

// Batch size per run — 50 LLCs at 3 seconds each = ~2.5 minutes
// Well within Azure Function's default 5-minute timeout (10 min for premium)
const BATCH_SIZE = 50;

/**
 * Timer-triggered handler: runs every Wednesday at 7 AM Mountain Time.
 * WEBSITE_TIME_ZONE=America/Denver makes the UTC cron Mountain Time.
 * Wednesday 7 AM MT = Wednesday 13:00 UTC (MST) or 14:00 UTC (MDT)
 * Using 13:00 UTC which covers MST (non-daylight savings).
 */
async function llcEnrichmentTimerHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  context.log("[llc-enrichment] Timer trigger started");

  if (myTimer.isPastDue) {
    context.warn(
      "[llc-enrichment] Timer is past due — running catch-up execution"
    );
  }

  try {
    const stats = await enrichLlcOwners(BATCH_SIZE, (msg) =>
      context.log(msg)
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    context.log("[llc-enrichment] Complete", {
      ...stats,
      elapsedSeconds: elapsed,
      batchSize: BATCH_SIZE,
    });
  } catch (err) {
    context.error("[llc-enrichment] Fatal error", err);
  }
}

/**
 * HTTP-triggered handler for manual invocation.
 *
 * GET  /api/llc-enrichment          -> runs enrichment with default batch size
 * GET  /api/llc-enrichment?batch=N  -> runs enrichment with custom batch size
 * GET  /api/llc-enrichment?lookup=LLC_NAME -> looks up a single LLC (no DB write)
 */
async function llcEnrichmentHttpHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  context.log("[llc-enrichment] HTTP trigger invoked");

  // Single lookup mode
  const lookupName = request.query.get("lookup");
  if (lookupName) {
    try {
      const { lookupSingleLlc } = await import("../sources/llc-enrichment.js");
      const result = await lookupSingleLlc(decodeURIComponent(lookupName));
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: lookupName, result }, null, 2),
      };
    } catch (err) {
      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: String(err) }),
      };
    }
  }

  // Batch enrichment mode
  const batchParam = request.query.get("batch");
  const batch = batchParam ? Math.min(parseInt(batchParam, 10) || BATCH_SIZE, 200) : BATCH_SIZE;

  try {
    const stats = await enrichLlcOwners(batch, (msg) => context.log(msg));
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        {
          success: true,
          stats,
          batchSize: batch,
          elapsedSeconds: elapsed,
        },
        null,
        2
      ),
    };
  } catch (err) {
    context.error("[llc-enrichment] HTTP trigger error", err);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: String(err) }),
    };
  }
}

// Register timer trigger: Wednesdays at 7 AM MT
// Cron: "0 0 13 * * 3" = second=0, minute=0, hour=13 UTC, any day-of-month, any month, Wednesday
// With WEBSITE_TIME_ZONE=America/Denver, this is 7 AM MT
app.timer("llcEnrichment", {
  schedule: "0 0 13 * * 3",
  runOnStartup: false,
  handler: llcEnrichmentTimerHandler,
});

// Register HTTP trigger for manual invocation
app.http("llcEnrichmentHttp", {
  methods: ["GET"],
  authLevel: "function",
  route: "llc-enrichment",
  handler: llcEnrichmentHttpHandler,
});

export { llcEnrichmentTimerHandler, llcEnrichmentHttpHandler };
