/**
 * Contact Enrichment Azure Function
 *
 * Enriches distressed property leads with phone numbers and emails via
 * the Tracerfy skip tracing API.
 *
 * NOTE: ThatsThem and FamilyTreeNow were evaluated but are NOT scrapable:
 *   - ThatsThem: Google reCAPTCHA challenge blocks all automation
 *   - FamilyTreeNow: Returns 403 Forbidden (hard IP block)
 *
 * Two triggers:
 *   1. Timer trigger: Wednesdays at 8 AM Mountain Time (weekly)
 *   2. HTTP trigger: Manual invocation for on-demand enrichment
 *
 * Required environment variable:
 *   TRACERFY_API_KEY  - Bearer token from tracerfy.com dashboard
 *
 * Cost estimate: $0.01-0.02/lead (Tracerfy). 25 leads/run = ~$0.25-0.50/run.
 */

import {
  app,
  InvocationContext,
  Timer,
  HttpRequest,
  HttpResponseInit,
} from "@azure/functions";
import {
  enrichWithTracerfy,
  getTracerfyAnalytics,
} from "../sources/tracerfy-enrichment.js";

// Default batch size per run — 25 leads at $0.02 = $0.50/run maximum
// Weekly timer runs 52x/year = ~$26/year at full pace
const BATCH_SIZE = 25;

/**
 * Timer-triggered handler: runs every Wednesday at 8 AM Mountain Time.
 * WEBSITE_TIME_ZONE=America/Denver makes the UTC cron Mountain Time.
 * Wednesday 8 AM MT = Wednesday 14:00 UTC (MST) or 15:00 UTC (MDT)
 * Using 14:00 UTC which covers MST (non-daylight savings).
 */
async function contactEnrichmentTimerHandler(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  const startTime = Date.now();
  context.log("[contact-enrichment] Timer trigger started");

  if (myTimer.isPastDue) {
    context.warn(
      "[contact-enrichment] Timer is past due — running catch-up execution"
    );
  }

  const apiKey = process.env.TRACERFY_API_KEY;
  if (!apiKey) {
    context.error(
      "[contact-enrichment] TRACERFY_API_KEY not set — skipping enrichment. " +
        "Sign up at tracerfy.com and set this env var in Azure Function App settings."
    );
    return;
  }

  try {
    const stats = await enrichWithTracerfy(
      BATCH_SIZE,
      apiKey,
      (msg) => context.log(msg)
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    context.log("[contact-enrichment] Timer complete", {
      ...stats,
      elapsedSeconds: elapsed,
      batchSize: BATCH_SIZE,
    });
  } catch (err) {
    context.error("[contact-enrichment] Fatal error", err);
  }
}

/**
 * HTTP-triggered handler for manual invocation and testing.
 *
 * GET  /api/contact-enrichment                        -> run Tracerfy with default batch size
 * GET  /api/contact-enrichment?batch=N               -> run Tracerfy with custom batch size
 * GET  /api/contact-enrichment?analytics=1           -> fetch Tracerfy account analytics
 * GET  /api/contact-enrichment?dry_run=1             -> show which leads would be processed (no API calls)
 */
async function contactEnrichmentHttpHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  context.log("[contact-enrichment] HTTP trigger invoked", {
    method: request.method,
    url: request.url,
  });

  const apiKey = process.env.TRACERFY_API_KEY;

  // Analytics mode — check account balance / usage
  const analyticsMode = request.query.get("analytics");
  if (analyticsMode) {
    if (!apiKey) {
      return {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "TRACERFY_API_KEY not configured",
          hint: "Set TRACERFY_API_KEY in Azure Function App configuration",
        }),
      };
    }

    try {
      const analytics = await getTracerfyAnalytics(apiKey);
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics }, null, 2),
      };
    } catch (err) {
      return {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: String(err) }),
      };
    }
  }

  // Dry-run mode — show which leads would be processed
  const dryRun = request.query.get("dry_run");
  if (dryRun) {
    const { db } = await import("../db/client.js");
    const { sql } = await import("drizzle-orm");
    const batchParam = request.query.get("batch");
    const batch = batchParam
      ? Math.min(parseInt(batchParam, 10) || BATCH_SIZE, 200)
      : BATCH_SIZE;

    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.owner_name,
        p.address,
        p.city,
        p.state,
        p.zip,
        p.owner_type,
        COALESCE(l.distress_score, 0) as distress_score
      FROM properties p
      LEFT JOIN leads l ON l.property_id = p.id
      WHERE
        p.owner_name IS NOT NULL
        AND p.owner_name != ''
        AND p.owner_type IN ('individual', 'unknown')
        AND NOT EXISTS (
          SELECT 1 FROM owner_contacts oc
          WHERE oc.property_id = p.id
            AND oc.source = 'tracerfy'
        )
      ORDER BY COALESCE(l.distress_score, 0) DESC, p.created_at ASC
      LIMIT ${batch}
    `);

    return {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        {
          dry_run: true,
          count: rows.rows.length,
          batch_size: batch,
          leads: rows.rows.map((r) => ({
            id: r.id,
            owner_name: r.owner_name,
            address: r.address,
            city: r.city,
            distress_score: r.distress_score,
          })),
        },
        null,
        2
      ),
    };
  }

  // Enrichment mode
  if (!apiKey) {
    return {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "TRACERFY_API_KEY not configured",
        hint: "Set TRACERFY_API_KEY in Azure Function App configuration. Sign up at https://tracerfy.com",
        setup_steps: [
          "1. Create account at tracerfy.com",
          "2. Go to dashboard and copy your API key",
          "3. In Azure Portal -> Function App -> Configuration -> Application settings",
          "4. Add: TRACERFY_API_KEY = <your key>",
          "5. Retry this request",
        ],
      }),
    };
  }

  const batchParam = request.query.get("batch");
  const batch = batchParam
    ? Math.min(parseInt(batchParam, 10) || BATCH_SIZE, 200)
    : BATCH_SIZE;

  try {
    const stats = await enrichWithTracerfy(
      batch,
      apiKey,
      (msg) => context.log(msg)
    );

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
          costNote: `Estimated cost: $${stats.estimatedCost.toFixed(2)} (${stats.found} successful traces at ~$0.02/lead)`,
        },
        null,
        2
      ),
    };
  } catch (err) {
    context.error("[contact-enrichment] HTTP trigger error", err);
    return {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, error: String(err) }),
    };
  }
}

// Register timer trigger: Wednesdays at 8 AM MT
// Cron: "0 0 14 * * 3" = second=0, minute=0, hour=14 UTC, any day-of-month, any month, Wednesday
// With WEBSITE_TIME_ZONE=America/Denver, this is 8 AM MT
app.timer("contactEnrichment", {
  schedule: "0 0 14 * * 3",
  runOnStartup: false,
  handler: contactEnrichmentTimerHandler,
});

// Register HTTP trigger for manual invocation
app.http("contactEnrichmentHttp", {
  methods: ["GET"],
  authLevel: "function",
  route: "contact-enrichment",
  handler: contactEnrichmentHttpHandler,
});

export { contactEnrichmentTimerHandler, contactEnrichmentHttpHandler };
