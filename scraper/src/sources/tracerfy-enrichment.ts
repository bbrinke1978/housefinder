/**
 * Tracerfy Skip Tracing API Integration
 *
 * Tracerfy provides professional skip tracing at $0.01-0.02/lead via REST API.
 * Returns phone numbers, email addresses, and mailing addresses.
 *
 * API Overview:
 *   - POST /trace/           -> Submit a batch of leads for tracing (async job)
 *   - GET  /queues/          -> List all jobs
 *   - GET  /queue/:id        -> Get results for a specific job
 *   - Auth: Bearer token in Authorization header
 *
 * We use an async pattern: submit job -> poll until complete -> store results.
 *
 * Env vars required:
 *   TRACERFY_API_KEY  - Bearer token from tracerfy.com dashboard
 *
 * Stores results in owner_contacts with source = 'tracerfy'.
 */

import { db } from "../db/client.js";
import { properties, ownerContacts, leads } from "../db/schema.js";
import { sql, desc } from "drizzle-orm";

const BASE_URL = "https://tracerfy.com/api";

// How long to wait between poll attempts (ms)
const POLL_INTERVAL_MS = 5000;

// Max poll attempts before giving up on a job (~5 min)
const MAX_POLL_ATTEMPTS = 60;

// Delay between submitting batches (ms)
const BATCH_DELAY_MS = 2000;

export interface TracerfyLead {
  propertyId: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface TracerfyContact {
  phone: string | null;
  email: string | null;
  mailingAddress: string | null;
}

export interface TracerfyResult {
  propertyId: string;
  status: "found" | "not_found" | "error";
  contacts: TracerfyContact[];
  rawResponse?: unknown;
  error?: string;
}

export interface TracerfyStats {
  processed: number;
  found: number;
  notFound: number;
  errors: number;
  estimatedCost: number;
  skipped: number;
}

/**
 * Sleep helper.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an authenticated request to the Tracerfy API.
 */
async function tracerfyRequest(
  method: "GET" | "POST",
  path: string,
  apiKey: string,
  body?: unknown
): Promise<unknown> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "housefinder-bot/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Tracerfy API ${method} ${path} -> ${response.status}: ${text}`
    );
  }

  return response.json();
}

/**
 * Submit a batch of leads to the Tracerfy trace endpoint.
 * Returns the job ID for polling.
 *
 * The Tracerfy POST /trace/ endpoint accepts an array of lead objects.
 * Each lead needs: first_name, last_name, address, city, state, zip
 *
 * NOTE: The exact request format may need adjustment based on Tracerfy's
 * actual API schema once you have an API key and can view full docs.
 * This implementation follows the documented endpoint behavior.
 */
async function submitTraceJob(
  leads: TracerfyLead[],
  apiKey: string,
  log: (msg: string) => void
): Promise<string> {
  // Build the payload — Tracerfy expects an array of lead objects
  // with snake_case field names based on standard skip trace API conventions
  const payload = {
    leads: leads.map((lead) => ({
      first_name: lead.firstName,
      last_name: lead.lastName,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      // Include property_id as a reference field so we can match results back
      reference_id: lead.propertyId,
    })),
  };

  log(`[tracerfy] Submitting ${leads.length} leads to trace job`);

  const response = (await tracerfyRequest(
    "POST",
    "/trace/",
    apiKey,
    payload
  )) as { id?: string; job_id?: string; queue_id?: string };

  // Tracerfy returns a job/queue ID — handle various possible field names
  const jobId =
    response.id ?? response.job_id ?? response.queue_id;

  if (!jobId) {
    throw new Error(
      `Tracerfy trace submission returned no job ID: ${JSON.stringify(response)}`
    );
  }

  log(`[tracerfy] Job submitted: ${jobId}`);
  return String(jobId);
}

/**
 * Poll a trace job until complete or timeout.
 * Returns the raw job results.
 */
async function pollJobUntilComplete(
  jobId: string,
  apiKey: string,
  log: (msg: string) => void
): Promise<unknown> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const result = (await tracerfyRequest(
      "GET",
      `/queue/${jobId}`,
      apiKey
    )) as {
      status?: string;
      complete?: boolean;
      finished?: boolean;
      results?: unknown[];
      data?: unknown[];
    };

    const isDone =
      result.status === "complete" ||
      result.status === "completed" ||
      result.status === "finished" ||
      result.complete === true ||
      result.finished === true;

    if (isDone) {
      log(
        `[tracerfy] Job ${jobId} complete after ${attempt * POLL_INTERVAL_MS / 1000}s`
      );
      return result;
    }

    if (attempt % 6 === 0) {
      log(
        `[tracerfy] Job ${jobId} still processing... (${attempt * POLL_INTERVAL_MS / 1000}s elapsed)`
      );
    }
  }

  throw new Error(
    `Tracerfy job ${jobId} timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`
  );
}

/**
 * Parse Tracerfy job results into our TracerfyResult format.
 *
 * Tracerfy returns results per lead — we need to match back to propertyId
 * using the reference_id we submitted.
 *
 * The exact response structure may vary — this handles common patterns.
 */
function parseJobResults(
  jobResponse: unknown,
  submittedLeads: TracerfyLead[]
): TracerfyResult[] {
  const response = jobResponse as {
    results?: unknown[];
    data?: unknown[];
    leads?: unknown[];
  };

  // Extract results array from various possible response shapes
  const rawResults: unknown[] =
    response.results ?? response.data ?? response.leads ?? [];

  // Build lookup map from reference_id -> propertyId
  const refToPropertyId = new Map<string, string>(
    submittedLeads.map((l) => [l.propertyId, l.propertyId])
  );

  const parsed: TracerfyResult[] = [];

  for (const raw of rawResults) {
    const item = raw as Record<string, unknown>;

    // Match back to propertyId via reference_id
    const refId = String(
      item.reference_id ?? item.ref_id ?? item.id ?? ""
    );
    const propertyId = refToPropertyId.get(refId) ?? refId;

    if (!propertyId) continue;

    // Extract contacts from this result
    const contacts: TracerfyContact[] = [];

    // Phone numbers — may be array or single value
    const phones = normalizeToArray(
      item.phones ?? item.phone_numbers ?? item.phone
    );
    const emails = normalizeToArray(
      item.emails ?? item.email_addresses ?? item.email
    );
    const addresses = normalizeToArray(
      item.addresses ?? item.mailing_addresses ?? item.address
    );

    // Build one contact per phone (most common pattern)
    const maxContacts = Math.max(
      phones.length,
      emails.length,
      1
    );

    for (let i = 0; i < maxContacts; i++) {
      contacts.push({
        phone: phones[i] ? String(phones[i]) : null,
        email: emails[i] ? String(emails[i]) : null,
        mailingAddress: addresses[i] ? String(addresses[i]) : null,
      });
    }

    const hasData = phones.length > 0 || emails.length > 0;

    parsed.push({
      propertyId,
      status: hasData ? "found" : "not_found",
      contacts,
      rawResponse: raw,
    });
  }

  // Any submitted lead not in results is "not_found"
  const foundIds = new Set(parsed.map((r) => r.propertyId));
  for (const lead of submittedLeads) {
    if (!foundIds.has(lead.propertyId)) {
      parsed.push({
        propertyId: lead.propertyId,
        status: "not_found",
        contacts: [],
      });
    }
  }

  return parsed;
}

/**
 * Normalize a value (string, array, or undefined) to a string array.
 */
function normalizeToArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  const str = String(value).trim();
  return str ? [str] : [];
}

/**
 * Parse owner name into first/last.
 * Handles "LAST, FIRST" and "FIRST LAST" formats.
 */
function parseOwnerName(ownerName: string): {
  firstName: string;
  lastName: string;
} {
  const name = ownerName.trim();

  // "SMITH, JOHN" format (assessor records often use this)
  if (name.includes(",")) {
    const parts = name.split(",").map((p) => p.trim());
    return {
      lastName: parts[0] ?? "",
      firstName: parts[1] ?? "",
    };
  }

  // "JOHN SMITH" format
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
    };
  }

  return { firstName: "", lastName: name };
}

/**
 * Get properties that need Tracerfy skip tracing, ordered by distress score.
 * Only enriches critical leads (score >= 7) to control costs.
 */
async function getPropertiesForTracerfy(
  batchSize: number,
  log: (msg: string) => void
): Promise<TracerfyLead[]> {
  // Find individual/unknown owners without existing tracerfy contact
  // ordered by distress score descending (critical leads first)
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
      AND COALESCE(l.distress_score, 0) >= 7
      AND NOT EXISTS (
        SELECT 1 FROM owner_contacts oc
        WHERE oc.property_id = p.id
          AND oc.source = 'tracerfy'
      )
    ORDER BY COALESCE(l.distress_score, 0) DESC, p.created_at ASC
    LIMIT ${batchSize}
  `);

  if (rows.rows.length === 0) {
    log("[tracerfy] No properties need Tracerfy enrichment");
    return [];
  }

  log(`[tracerfy] Found ${rows.rows.length} properties for enrichment`);

  return rows.rows
    .map((row) => {
      const ownerName = String(row.owner_name ?? "");
      const { firstName, lastName } = parseOwnerName(ownerName);

      return {
        propertyId: String(row.id),
        firstName,
        lastName,
        address: String(row.address ?? ""),
        city: String(row.city ?? ""),
        state: String(row.state ?? "UT"),
        zip: String(row.zip ?? ""),
      };
    })
    .filter((l) => l.lastName); // Skip leads with no parseable name
}

/**
 * Store Tracerfy results in owner_contacts.
 *
 * For leads with contacts: store first phone + email, mark needsSkipTrace=false.
 * For "not found": store a marker row so we don't re-query, needsSkipTrace=true.
 * Multiple phones: store additional contacts as separate rows with source='tracerfy-2', etc.
 */
async function storeTracerfyResults(
  results: TracerfyResult[],
  log: (msg: string) => void
): Promise<{ stored: number; errors: number }> {
  const now = new Date();
  let stored = 0;
  let errors = 0;

  for (const result of results) {
    try {
      if (result.status === "not_found" || result.contacts.length === 0) {
        // Store a "checked but not found" marker
        await db
          .insert(ownerContacts)
          .values({
            propertyId: result.propertyId,
            phone: null,
            email: null,
            source: "tracerfy",
            isManual: false,
            needsSkipTrace: false, // Don't re-query — already checked
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [ownerContacts.propertyId, ownerContacts.source],
            set: { updatedAt: now },
          });
        stored++;
        continue;
      }

      // Store first contact in primary 'tracerfy' row
      const first = result.contacts[0];
      await db
        .insert(ownerContacts)
        .values({
          propertyId: result.propertyId,
          phone: first?.phone ?? null,
          email: first?.email ?? null,
          source: "tracerfy",
          isManual: false,
          needsSkipTrace: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [ownerContacts.propertyId, ownerContacts.source],
          set: {
            phone: first?.phone ?? null,
            email: first?.email ?? null,
            needsSkipTrace: false,
            updatedAt: now,
          },
        });

      // Store mailing address if present (separate row)
      if (first?.mailingAddress) {
        await db
          .insert(ownerContacts)
          .values({
            propertyId: result.propertyId,
            phone: null,
            email: `MAILING: ${first.mailingAddress}`,
            source: "tracerfy-address",
            isManual: false,
            needsSkipTrace: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [ownerContacts.propertyId, ownerContacts.source],
            set: {
              email: `MAILING: ${first.mailingAddress}`,
              updatedAt: now,
            },
          });
      }

      // Store additional phone numbers (tracerfy-2, tracerfy-3, etc.)
      for (let i = 1; i < Math.min(result.contacts.length, 5); i++) {
        const extra = result.contacts[i];
        if (!extra?.phone && !extra?.email) continue;

        const extraSource = `tracerfy-${i + 1}`;
        await db
          .insert(ownerContacts)
          .values({
            propertyId: result.propertyId,
            phone: extra.phone ?? null,
            email: extra.email ?? null,
            source: extraSource,
            isManual: false,
            needsSkipTrace: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [ownerContacts.propertyId, ownerContacts.source],
            set: {
              phone: extra.phone ?? null,
              email: extra.email ?? null,
              updatedAt: now,
            },
          });
      }

      stored++;
    } catch (err) {
      log(`[tracerfy] DB error for property ${result.propertyId}: ${err}`);
      errors++;
    }
  }

  return { stored, errors };
}

/**
 * Main enrichment function.
 *
 * Processes properties in batches, submitting to Tracerfy's async API,
 * polling for completion, then storing results.
 *
 * @param batchSize - Number of leads per API call (max ~100 recommended)
 * @param apiKey    - Tracerfy Bearer token
 * @param log       - Logging function
 */
export async function enrichWithTracerfy(
  batchSize = 25,
  apiKey: string,
  log: (msg: string) => void = console.log
): Promise<TracerfyStats> {
  const stats: TracerfyStats = {
    processed: 0,
    found: 0,
    notFound: 0,
    errors: 0,
    estimatedCost: 0,
    skipped: 0,
  };

  // Get prioritized list of properties to process
  const leadsToProcess = await getPropertiesForTracerfy(batchSize, log);

  if (leadsToProcess.length === 0) {
    return stats;
  }

  // Filter out leads without sufficient name data
  const validLeads = leadsToProcess.filter(
    (l) => l.firstName || l.lastName
  );
  stats.skipped = leadsToProcess.length - validLeads.length;

  if (validLeads.length === 0) {
    log("[tracerfy] No leads with parseable owner names");
    return stats;
  }

  log(
    `[tracerfy] Processing ${validLeads.length} leads (${stats.skipped} skipped — no parseable name)`
  );

  try {
    // Submit the batch to Tracerfy
    const jobId = await submitTraceJob(validLeads, apiKey, log);

    // Poll until job completes
    const jobResults = await pollJobUntilComplete(jobId, apiKey, log);

    // Parse results
    const results = parseJobResults(jobResults, validLeads);

    // Count results
    for (const result of results) {
      if (result.status === "found") stats.found++;
      else if (result.status === "not_found") stats.notFound++;
      else stats.errors++;
    }
    stats.processed = results.length;

    // Estimate cost: $0.02 per found record
    stats.estimatedCost = stats.found * 0.02;

    // Store results in database
    const { stored, errors: dbErrors } = await storeTracerfyResults(
      results,
      log
    );
    stats.errors += dbErrors;

    log(
      `[tracerfy] Complete: ${stats.found} found, ${stats.notFound} not found, ` +
        `${stats.errors} errors, ~$${stats.estimatedCost.toFixed(2)} estimated cost`
    );
  } catch (err) {
    log(`[tracerfy] Fatal error during enrichment: ${err}`);
    stats.errors++;
  }

  return stats;
}

/**
 * Check Tracerfy account analytics (balance, usage stats).
 */
export async function getTracerfyAnalytics(
  apiKey: string
): Promise<unknown> {
  return tracerfyRequest("GET", "/analytics/", apiKey);
}
