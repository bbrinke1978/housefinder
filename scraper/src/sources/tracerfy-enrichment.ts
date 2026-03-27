/**
 * Tracerfy Skip Tracing API Integration
 *
 * Tracerfy provides skip tracing at 1 credit/lead (normal) via REST API.
 * Returns phone numbers, email addresses, and mailing addresses.
 *
 * API (from docs):
 *   Base URL: https://tracerfy.com/v1/api/
 *   Auth: Bearer <TOKEN>
 *   POST /trace/          -> Submit batch (async, returns queue_id)
 *   GET  /queues/         -> List all queues (check pending status)
 *   GET  /queue/:id       -> Get results for a completed queue
 *   GET  /analytics/      -> Account balance and usage
 *
 * Env vars: TRACERFY_API_KEY
 * Stores results in owner_contacts with source = 'tracerfy'.
 */

import { db } from "../db/client.js";
import { properties, ownerContacts, leads } from "../db/schema.js";
import { sql } from "drizzle-orm";

const BASE_URL = "https://tracerfy.com/v1/api";
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

export interface TracerfyStats {
  processed: number;
  found: number;
  notFound: number;
  errors: number;
  creditsUsed: number;
  skipped: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tracerfyFetch(
  method: "GET" | "POST",
  path: string,
  apiKey: string,
  body?: unknown,
  isFormData?: boolean
): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  let fetchBody: string | undefined;
  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: fetchBody,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Tracerfy ${method} ${path} -> ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Get properties that need Tracerfy skip tracing.
 * Only enriches critical leads (score >= 7) to control costs.
 */
async function getPropertiesForTracerfy(
  batchSize: number,
  log: (msg: string) => void
): Promise<Array<{ id: string; owner_name: string; address: string; city: string; state: string; zip: string }>> {
  const rows = await db.execute(sql`
    SELECT
      p.id, p.owner_name, p.address, p.city, p.state, p.zip
    FROM properties p
    LEFT JOIN leads l ON l.property_id = p.id
    WHERE
      p.owner_name IS NOT NULL AND p.owner_name != ''
      AND p.owner_type IN ('individual', 'unknown')
      AND COALESCE(l.distress_score, 0) >= 7
      AND NOT EXISTS (
        SELECT 1 FROM owner_contacts oc
        WHERE oc.property_id = p.id AND oc.source = 'tracerfy'
      )
    ORDER BY COALESCE(l.distress_score, 0) DESC, p.created_at ASC
    LIMIT ${batchSize}
  `);

  if (rows.rows.length === 0) {
    log("[tracerfy] No properties need enrichment");
    return [];
  }

  log(`[tracerfy] Found ${rows.rows.length} properties for enrichment`);
  return rows.rows as Array<{ id: string; owner_name: string; address: string; city: string; state: string; zip: string }>;
}

/**
 * Parse "LAST, FIRST MIDDLE" or "FIRST LAST" into first/last name.
 */
function parseOwnerName(name: string): { first_name: string; last_name: string } {
  const cleaned = name.trim().replace(/,\s*(JT|H&W|TRSTEES?|TRUSTEE)$/i, "");

  if (cleaned.includes(",")) {
    const parts = cleaned.split(",").map((p) => p.trim());
    return { last_name: parts[0] ?? "", first_name: parts[1]?.split(/\s+/)[0] ?? "" };
  }

  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return { first_name: parts[0] ?? "", last_name: parts[parts.length - 1] ?? "" };
  }
  return { first_name: "", last_name: cleaned };
}

/**
 * Submit batch to Tracerfy via JSON.
 * Uses the POST /trace/ endpoint with json_data + column mappings.
 */
async function submitBatch(
  props: Array<{ id: string; owner_name: string; address: string; city: string; state: string; zip: string }>,
  apiKey: string,
  log: (msg: string) => void
): Promise<number> {
  // Build JSON data array matching Tracerfy's expected format
  const jsonData = props.map((p) => {
    const { first_name, last_name } = parseOwnerName(p.owner_name);
    return {
      property_id: p.id,
      first_name,
      last_name,
      address: p.address || "",
      city: p.city || "",
      state: p.state || "UT",
      zip: p.zip || "",
    };
  });

  log(`[tracerfy] Submitting ${jsonData.length} leads to batch trace`);

  const response = (await tracerfyFetch("POST", "/trace/", apiKey, {
    json_data: JSON.stringify(jsonData),
    address_column: "address",
    city_column: "city",
    state_column: "state",
    zip_column: "zip",
    first_name_column: "first_name",
    last_name_column: "last_name",
    mail_address_column: "mail_address",
    mail_city_column: "mail_city",
    mail_state_column: "mail_state",
    trace_type: "normal",
  })) as { queue_id: number; rows_uploaded: number; estimated_wait_seconds: number };

  log(`[tracerfy] Queue created: ${response.queue_id}, ${response.rows_uploaded} rows, ~${response.estimated_wait_seconds}s wait`);
  return response.queue_id;
}

/**
 * Poll queue until complete. Returns the queue metadata.
 */
async function waitForQueue(
  queueId: number,
  apiKey: string,
  log: (msg: string) => void
): Promise<{ download_url: string; credits_deducted: number }> {
  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const queues = (await tracerfyFetch("GET", "/queues/", apiKey)) as Array<{
      id: number;
      pending: boolean;
      download_url: string | null;
      credits_deducted: number;
    }>;

    const queue = queues.find((q) => q.id === queueId);
    if (!queue) {
      throw new Error(`Queue ${queueId} not found in queues list`);
    }

    if (!queue.pending && queue.download_url) {
      log(`[tracerfy] Queue ${queueId} complete after ${attempt * POLL_INTERVAL_MS / 1000}s`);
      return { download_url: queue.download_url, credits_deducted: queue.credits_deducted };
    }

    if (attempt % 6 === 0) {
      log(`[tracerfy] Queue ${queueId} still processing... (${attempt * POLL_INTERVAL_MS / 1000}s)`);
    }
  }

  throw new Error(`Queue ${queueId} timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000}s`);
}

/**
 * Fetch results from a completed queue.
 * Returns per-address records with phone/email fields.
 */
async function fetchQueueResults(
  queueId: number,
  apiKey: string
): Promise<Array<Record<string, string>>> {
  const results = (await tracerfyFetch("GET", `/queue/${queueId}`, apiKey)) as Array<Record<string, string>>;
  return results;
}

/**
 * Store Tracerfy results in owner_contacts.
 */
async function storeResults(
  results: Array<Record<string, string>>,
  props: Array<{ id: string; address: string; city: string }>,
  log: (msg: string) => void
): Promise<{ stored: number; found: number; notFound: number; errors: number }> {
  const now = new Date();
  let stored = 0, found = 0, notFound = 0, errors = 0;

  // Build lookup: address+city -> propertyId
  const addrToId = new Map<string, string>();
  for (const p of props) {
    const key = `${(p.address || "").toLowerCase().trim()}|${(p.city || "").toLowerCase().trim()}`;
    addrToId.set(key, p.id);
  }

  for (const row of results) {
    try {
      // Match result back to property by address+city
      const resultKey = `${(row.address || "").toLowerCase().trim()}|${(row.city || "").toLowerCase().trim()}`;
      let propertyId = addrToId.get(resultKey);

      // Fallback: try matching by just address
      if (!propertyId) {
        for (const [key, id] of addrToId) {
          if (key.startsWith((row.address || "").toLowerCase().trim() + "|")) {
            propertyId = id;
            break;
          }
        }
      }

      if (!propertyId) {
        log(`[tracerfy] Could not match result: ${row.address}, ${row.city}`);
        errors++;
        continue;
      }

      // Extract phones
      const phones: string[] = [];
      for (const field of ["primary_phone", "mobile_1", "mobile_2", "mobile_3", "mobile_4", "mobile_5", "landline_1", "landline_2", "landline_3"]) {
        if (row[field] && row[field].trim()) phones.push(row[field].trim());
      }

      // Extract emails
      const emails: string[] = [];
      for (const field of ["email_1", "email_2", "email_3", "email_4", "email_5"]) {
        if (row[field] && row[field].trim()) emails.push(row[field].trim());
      }

      // Extract mailing address
      const mailParts = [row.mail_address, row.mail_city, row.mail_state].filter(Boolean);
      const mailingAddress = mailParts.length > 0 ? mailParts.join(", ") : null;

      const hasData = phones.length > 0 || emails.length > 0;

      if (!hasData) {
        // Store "not found" marker so we don't re-query
        await db.insert(ownerContacts).values({
          propertyId,
          phone: null,
          email: null,
          source: "tracerfy",
          isManual: false,
          needsSkipTrace: false,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: [ownerContacts.propertyId, ownerContacts.source],
          set: { updatedAt: now },
        });
        notFound++;
        stored++;
        continue;
      }

      // Store primary phone + email
      await db.insert(ownerContacts).values({
        propertyId,
        phone: phones[0] ?? null,
        email: emails[0] ?? null,
        source: "tracerfy",
        isManual: false,
        needsSkipTrace: false,
        createdAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [ownerContacts.propertyId, ownerContacts.source],
        set: {
          phone: phones[0] ?? null,
          email: emails[0] ?? null,
          needsSkipTrace: false,
          updatedAt: now,
        },
      });

      // Store mailing address if present
      if (mailingAddress) {
        await db.insert(ownerContacts).values({
          propertyId,
          phone: null,
          email: `MAILING: ${mailingAddress}`,
          source: "tracerfy-address",
          isManual: false,
          needsSkipTrace: false,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: [ownerContacts.propertyId, ownerContacts.source],
          set: { email: `MAILING: ${mailingAddress}`, updatedAt: now },
        });
      }

      // Store additional phones (tracerfy-2, tracerfy-3, etc.)
      for (let i = 1; i < Math.min(phones.length, 5); i++) {
        await db.insert(ownerContacts).values({
          propertyId,
          phone: phones[i],
          email: emails[i] ?? null,
          source: `tracerfy-${i + 1}`,
          isManual: false,
          needsSkipTrace: false,
          createdAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: [ownerContacts.propertyId, ownerContacts.source],
          set: { phone: phones[i], email: emails[i] ?? null, updatedAt: now },
        });
      }

      found++;
      stored++;
    } catch (err) {
      log(`[tracerfy] Error storing result: ${err}`);
      errors++;
    }
  }

  return { stored, found, notFound, errors };
}

/**
 * Main enrichment function.
 */
export async function enrichWithTracerfy(
  batchSize = 50,
  apiKey: string,
  log: (msg: string) => void = console.log
): Promise<TracerfyStats> {
  const stats: TracerfyStats = {
    processed: 0,
    found: 0,
    notFound: 0,
    errors: 0,
    creditsUsed: 0,
    skipped: 0,
  };

  const props = await getPropertiesForTracerfy(batchSize, log);
  if (props.length === 0) return stats;

  // Filter out properties without addresses (Tracerfy needs an address)
  const validProps = props.filter((p) => p.address && p.address.trim());
  stats.skipped = props.length - validProps.length;

  if (validProps.length === 0) {
    log("[tracerfy] No leads with valid addresses");
    return stats;
  }

  try {
    // Submit batch
    const queueId = await submitBatch(validProps, apiKey, log);

    // Wait for completion
    const { credits_deducted } = await waitForQueue(queueId, apiKey, log);
    stats.creditsUsed = credits_deducted;

    // Fetch results
    const results = await fetchQueueResults(queueId, apiKey);
    log(`[tracerfy] Got ${results.length} results from queue ${queueId}`);

    // Store in database
    const { stored, found, notFound, errors } = await storeResults(results, validProps, log);
    stats.processed = stored;
    stats.found = found;
    stats.notFound = notFound;
    stats.errors = errors;

    log(`[tracerfy] Done: ${found} found, ${notFound} not found, ${errors} errors, ${credits_deducted} credits used`);
  } catch (err) {
    log(`[tracerfy] Fatal error: ${err}`);
    stats.errors++;
  }

  return stats;
}

/**
 * Check Tracerfy account analytics.
 */
export async function getTracerfyAnalytics(apiKey: string): Promise<unknown> {
  return tracerfyFetch("GET", "/analytics/", apiKey);
}
