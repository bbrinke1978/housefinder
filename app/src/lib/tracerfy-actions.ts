"use server";

/**
 * Tracerfy Skip Tracing Server Actions
 *
 * Powers all skip trace triggers in the frontend.
 * Ports and adapts logic from scraper/src/sources/tracerfy-enrichment.ts
 * with critical fix: PascalCase-dash field names (Email-1, Mobile-1, Landline-1)
 *
 * API:
 *   Base URL: https://tracerfy.com/v1/api
 *   Auth: Bearer <TOKEN>
 *   POST /trace/     -> Submit batch (async, returns queue_id)
 *   GET  /queues/    -> List all queues (check pending status)
 *   GET  /queue/:id  -> Get results for completed queue
 *   GET  /analytics/ -> Account balance and usage
 *
 * Env vars: TRACERFY_API_KEY
 */

import { db } from "@/db/client";
import { properties, ownerContacts, scraperConfig, deals } from "@/db/schema";
import { eq, inArray, like, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import {
  TRACERFY_CONFIG_KEYS,
  type TracerfyRunEntry,
  type TracerfyStatus,
  type TracerfyConfig,
} from "@/types/index";

// -- Constants --

const BASE_URL = "https://tracerfy.com/v1/api";
const POLL_INTERVAL_MS = 7000; // Tracerfy rate limits at ~20s intervals, poll every 7s to stay safe
const MAX_POLL_MS = 25000; // stay under Netlify 26s function limit
const COST_PER_TRACE = 0.02; // for cost estimation display

// -- Private Helpers --

/**
 * Parse "LAST, FIRST MIDDLE" or "FIRST LAST" into first/last name.
 * Copied from scraper/src/sources/tracerfy-enrichment.ts
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
 * Generic Tracerfy API fetch with Bearer auth.
 */
async function tracerfyFetch(
  method: "GET" | "POST",
  path: string,
  apiKey: string,
  body?: unknown
): Promise<unknown> {
  const url = `${BASE_URL}${path}`;
  // Strip ALL non-visible characters (Netlify env vars seem to include invisible chars)
  const cleanKey = apiKey.replace(/[^A-Za-z0-9._\-=+/]/g, "");
  const authValue = "Bearer " + cleanKey;
  const reqHeaders = new Headers();
  reqHeaders.set("Authorization", authValue);
  reqHeaders.set("Accept", "application/json");

  let fetchBody: BodyInit | undefined;
  if (body) {
    // Use FormData for POST requests (Tracerfy API rejects application/json on some endpoints)
    if (method === "POST") {
      const formData = new FormData();
      for (const [key, value] of Object.entries(body as Record<string, string>)) {
        formData.append(key, value);
      }
      fetchBody = formData;
      // Don't set Content-Type — fetch auto-sets multipart/form-data with boundary
    } else {
      reqHeaders.set("Content-Type", "application/json");
      fetchBody = JSON.stringify(body);
    }
  }

  let response = await fetch(url, {
    method,
    headers: reqHeaders,
    body: fetchBody,
  });

  // Retry once on 503 rate limit (wait 20s then retry)
  if (response.status === 503) {
    await new Promise((r) => setTimeout(r, 20000));
    // Rebuild FormData for retry (FormData can only be consumed once)
    let retryBody: BodyInit | undefined;
    if (body && method === "POST") {
      const fd = new FormData();
      for (const [key, value] of Object.entries(body as Record<string, string>)) {
        fd.append(key, value);
      }
      retryBody = fd;
    } else if (body) {
      retryBody = JSON.stringify(body);
    }
    response = await fetch(url, { method, headers: reqHeaders, body: retryBody });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const authPreview = `auth="${authValue.slice(0, 20)}...${authValue.slice(-10)}" len=${authValue.length}`;
    throw new Error(`Tracerfy ${method} ${path} -> ${response.status}: ${text} [${authPreview}]`);
  }

  return response.json();
}

type PropForBatch = {
  id: string;
  ownerName: string | null;
  address: string;
  city: string;
  state: string;
  zip: string | null;
};

/**
 * Submit a batch to POST /trace/. Includes property_id for result matching.
 */
async function submitBatch(
  props: PropForBatch[],
  apiKey: string
): Promise<number> {
  const jsonData = props.map((p) => {
    const { first_name, last_name } = parseOwnerName(p.ownerName ?? "");
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

  return response.queue_id;
}

/**
 * Poll GET /queues/ every POLL_INTERVAL_MS until pending=false and download_url exists.
 * Throws on timeout (stays under Netlify 26s function limit).
 */
async function pollUntilComplete(
  queueId: number,
  apiKey: string,
  maxWaitMs = MAX_POLL_MS
): Promise<{ download_url: string; credits_deducted: number }> {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

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
      return { download_url: queue.download_url, credits_deducted: queue.credits_deducted };
    }
  }

  throw new Error(`Queue ${queueId} timed out after ${maxWaitMs}ms`);
}

/**
 * Fetch results for a completed queue from GET /queue/:id.
 */
async function fetchQueueResults(
  queueId: number,
  apiKey: string
): Promise<Array<Record<string, string>>> {
  const results = (await tracerfyFetch("GET", `/queue/${queueId}`, apiKey)) as Array<
    Record<string, string>
  >;
  return results;
}

type PhoneEntry = {
  number: string;
  type: "mobile" | "landline" | "unknown";
  fieldName: string; // e.g. "Mobile-1", "Landline-2"
};

/**
 * Extract phones and emails from a Tracerfy result row.
 * CRITICAL: Uses PascalCase-dash field names (Email-1, Mobile-1, Landline-1)
 * NOT snake_case (email_1, mobile_1, landline_1) which was the scraper bug.
 */
function extractPhonesAndEmails(row: Record<string, string>): {
  phones: PhoneEntry[];
  emails: string[];
} {
  const phones: PhoneEntry[] = [];
  const emails: string[] = [];

  // Primary phone (any type)
  if (row["primary_phone"]?.trim()) {
    phones.push({ number: row["primary_phone"].trim(), type: "unknown", fieldName: "primary_phone" });
  }

  // Mobile phones: Mobile-1 through Mobile-5
  for (let i = 1; i <= 5; i++) {
    const val = row[`Mobile-${i}`]?.trim();
    if (val) {
      phones.push({ number: val, type: "mobile", fieldName: `Mobile-${i}` });
    }
  }

  // Landlines: Landline-1 through Landline-3
  for (let i = 1; i <= 3; i++) {
    const val = row[`Landline-${i}`]?.trim();
    if (val) {
      phones.push({ number: val, type: "landline", fieldName: `Landline-${i}` });
    }
  }

  // Emails: Email-1 through Email-5
  for (let i = 1; i <= 5; i++) {
    const val = row[`Email-${i}`]?.trim();
    if (val) {
      emails.push(val);
    }
  }

  return { phones, emails };
}

/**
 * Store Tracerfy results in ownerContacts.
 * - Primary: source="tracerfy"
 * - Additional phones: source="tracerfy-mobile-2", "tracerfy-landline-1" etc.
 * - Additional emails: source="tracerfy-2", "tracerfy-3" etc.
 * - Mailing address: source="tracerfy-address"
 * - Not found: phone=null, email=null, source="tracerfy" (prevents re-querying)
 */
async function storeResults(
  results: Array<Record<string, string>>,
  props: PropForBatch[]
): Promise<{ found: number; notFound: number }> {
  const now = new Date();
  let found = 0;
  let notFound = 0;

  // Build lookup: property_id -> propertyId (result rows have property_id in json_data)
  // Fall back to address+city matching if property_id not in row
  const idMap = new Map<string, string>(props.map((p) => [p.id, p.id]));
  const addrMap = new Map<string, string>();
  for (const p of props) {
    const key = `${(p.address || "").toLowerCase().trim()}|${(p.city || "").toLowerCase().trim()}`;
    addrMap.set(key, p.id);
  }

  for (const row of results) {
    try {
      // Match by property_id first (most reliable)
      let propertyId: string | undefined = row["property_id"]
        ? idMap.get(row["property_id"])
        : undefined;

      // Fallback: address+city match
      if (!propertyId) {
        const key = `${(row["address"] || "").toLowerCase().trim()}|${(row["city"] || "").toLowerCase().trim()}`;
        propertyId = addrMap.get(key);
      }

      if (!propertyId) {
        continue; // Cannot match — skip
      }

      const { phones, emails } = extractPhonesAndEmails(row);

      // Extract mailing address
      const mailParts = [row["mail_address"], row["mail_city"], row["mail_state"]].filter(Boolean);
      const mailingAddress = mailParts.length > 0 ? mailParts.join(", ") : null;

      const hasData = phones.length > 0 || emails.length > 0;

      if (!hasData) {
        // Store "not found" marker so we don't re-query this property
        await db
          .insert(ownerContacts)
          .values({
            propertyId,
            phone: null,
            email: null,
            source: "tracerfy",
            isManual: false,
            needsSkipTrace: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [ownerContacts.propertyId, ownerContacts.source],
            set: { updatedAt: now },
          });
        notFound++;
        continue;
      }

      // Store primary contact (first phone + first email)
      await db
        .insert(ownerContacts)
        .values({
          propertyId,
          phone: phones[0]?.number ?? null,
          email: emails[0] ?? null,
          source: "tracerfy",
          isManual: false,
          needsSkipTrace: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [ownerContacts.propertyId, ownerContacts.source],
          set: {
            phone: phones[0]?.number ?? null,
            email: emails[0] ?? null,
            needsSkipTrace: false,
            updatedAt: now,
          },
        });

      // Store mailing address if present
      if (mailingAddress) {
        await db
          .insert(ownerContacts)
          .values({
            propertyId,
            phone: null,
            email: `MAILING: ${mailingAddress}`,
            source: "tracerfy-address",
            isManual: false,
            needsSkipTrace: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [ownerContacts.propertyId, ownerContacts.source],
            set: { email: `MAILING: ${mailingAddress}`, updatedAt: now },
          });
      }

      // Store additional phones with type-encoded source: tracerfy-mobile-2, tracerfy-landline-1, etc.
      // Start from index 1 (index 0 is the primary, already stored)
      for (let i = 1; i < phones.length; i++) {
        const entry = phones[i]!;
        // Parse field name to get N: "Mobile-2" -> type=mobile, n=2
        const fieldMatch = entry.fieldName.match(/^(Mobile|Landline)-(\d+)$/);
        let sourceKey: string;
        if (fieldMatch) {
          const type = fieldMatch[1]!.toLowerCase();
          const n = fieldMatch[2];
          sourceKey = `tracerfy-${type}-${n}`;
        } else {
          sourceKey = `tracerfy-phone-${i + 1}`;
        }

        await db
          .insert(ownerContacts)
          .values({
            propertyId,
            phone: entry.number,
            email: null,
            source: sourceKey,
            isManual: false,
            needsSkipTrace: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [ownerContacts.propertyId, ownerContacts.source],
            set: { phone: entry.number, updatedAt: now },
          });
      }

      // Store additional emails: source="tracerfy-2", "tracerfy-3" etc.
      for (let i = 1; i < emails.length; i++) {
        await db
          .insert(ownerContacts)
          .values({
            propertyId,
            phone: null,
            email: emails[i]!,
            source: `tracerfy-${i + 1}`,
            isManual: false,
            needsSkipTrace: false,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [ownerContacts.propertyId, ownerContacts.source],
            set: { email: emails[i]!, updatedAt: now },
          });
      }

      found++;
    } catch (err) {
      console.error("[tracerfy] Error storing result:", err);
      // Continue processing other results
    }
  }

  return { found, notFound };
}

/**
 * Append a run entry to scraperConfig key tracerfy.runHistory (JSON array, keep last 50).
 * Also updates tracerfy.monthlySpend for current month.
 */
async function recordRun(entry: TracerfyRunEntry): Promise<void> {
  // Update run history
  const historyRow = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, TRACERFY_CONFIG_KEYS.RUN_HISTORY))
    .then((rows) => rows[0]);

  const history: TracerfyRunEntry[] = historyRow
    ? (JSON.parse(historyRow.value) as TracerfyRunEntry[])
    : [];

  history.push(entry);
  // Keep last 50 entries
  const trimmed = history.slice(-50);

  await db
    .insert(scraperConfig)
    .values({
      key: TRACERFY_CONFIG_KEYS.RUN_HISTORY,
      value: JSON.stringify(trimmed),
      description: "Tracerfy skip trace run history (last 50 runs)",
    })
    .onConflictDoUpdate({
      target: [scraperConfig.key],
      set: { value: JSON.stringify(trimmed), updatedAt: new Date() },
    });

  // Update monthly spend
  const monthKey = entry.date.slice(0, 7); // "YYYY-MM"
  const spendRow = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, TRACERFY_CONFIG_KEYS.MONTHLY_SPEND))
    .then((rows) => rows[0]);

  const spendData: { month: string; creditsUsed: number } = spendRow
    ? (JSON.parse(spendRow.value) as { month: string; creditsUsed: number })
    : { month: monthKey, creditsUsed: 0 };

  if (spendData.month !== monthKey) {
    // New month — reset
    spendData.month = monthKey;
    spendData.creditsUsed = 0;
  }
  spendData.creditsUsed += entry.creditsUsed;

  await db
    .insert(scraperConfig)
    .values({
      key: TRACERFY_CONFIG_KEYS.MONTHLY_SPEND,
      value: JSON.stringify(spendData),
      description: "Tracerfy current month spend tracking",
    })
    .onConflictDoUpdate({
      target: [scraperConfig.key],
      set: { value: JSON.stringify(spendData), updatedAt: new Date() },
    });
}

// -- Exported Server Actions --

/**
 * Run a single-property skip trace via Tracerfy.
 * Submits a one-item batch, polls for results, stores in ownerContacts.
 */
export async function runSkipTrace(
  propertyId: string
): Promise<{ success: true; found: boolean; phoneCount: number; emailCount: number } | { error: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Not authenticated" };
  }

  const apiKey = process.env.TRACERFY_API_KEY;
  if (!apiKey) {
    return { error: "TRACERFY_API_KEY is not configured" };
  }

  try {
    // Fetch property from DB
    const prop = await db
      .select({
        id: properties.id,
        ownerName: properties.ownerName,
        address: properties.address,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
      })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .then((rows) => rows[0]);

    if (!prop) {
      return { error: "Property not found" };
    }

    if (!prop.address?.trim()) {
      return { error: "Property has no address — cannot skip trace" };
    }

    // Submit single-item batch
    const queueId = await submitBatch([prop], apiKey);

    // Poll until complete (max 25s)
    const { credits_deducted } = await pollUntilComplete(queueId, apiKey, MAX_POLL_MS);

    // Fetch results
    const results = await fetchQueueResults(queueId, apiKey);

    // Store in DB
    const { found, notFound } = await storeResults(results, [prop]);

    // Count resulting contacts for this property
    const contacts = await db
      .select({ phone: ownerContacts.phone, email: ownerContacts.email })
      .from(ownerContacts)
      .where(eq(ownerContacts.propertyId, propertyId));

    const phoneCount = contacts.filter(
      (c) => c.phone && !c.phone.startsWith("MAILING:")
    ).length;
    const emailCount = contacts.filter(
      (c) => c.email && !c.email.startsWith("MAILING:")
    ).length;

    // Record run
    await recordRun({
      date: new Date().toISOString().slice(0, 10),
      count: 1,
      found,
      notFound,
      creditsUsed: credits_deducted ?? COST_PER_TRACE,
    });

    revalidatePath(`/properties/${propertyId}`);

    return { success: true, found: found > 0, phoneCount, emailCount };
  } catch (err) {
    console.error("[tracerfy] runSkipTrace error:", err);
    return { error: err instanceof Error ? err.message : "Skip trace failed" };
  }
}

/**
 * Run a bulk skip trace for multiple properties in a single batch.
 * Filters to properties with valid addresses before submitting.
 */
export async function runBulkSkipTrace(
  propertyIds: string[]
): Promise<{ success: true; found: number; notFound: number; creditsUsed: number } | { error: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Not authenticated" };
  }

  const apiKey = process.env.TRACERFY_API_KEY;
  if (!apiKey) {
    return { error: "TRACERFY_API_KEY is not configured" };
  }

  if (!propertyIds.length) {
    return { error: "No property IDs provided" };
  }

  try {
    // Fetch all properties in one query
    const props = await db
      .select({
        id: properties.id,
        ownerName: properties.ownerName,
        address: properties.address,
        city: properties.city,
        state: properties.state,
        zip: properties.zip,
      })
      .from(properties)
      .where(inArray(properties.id, propertyIds));

    // Filter to those with valid addresses
    const validProps = props.filter((p) => p.address?.trim());

    if (!validProps.length) {
      return { error: "None of the selected properties have valid addresses" };
    }

    // Submit batch
    const queueId = await submitBatch(validProps, apiKey);

    // Poll until complete
    const { credits_deducted } = await pollUntilComplete(queueId, apiKey, MAX_POLL_MS);

    // Fetch results
    const results = await fetchQueueResults(queueId, apiKey);

    // Store in DB
    const { found, notFound } = await storeResults(results, validProps);

    // Record run
    await recordRun({
      date: new Date().toISOString().slice(0, 10),
      count: validProps.length,
      found,
      notFound,
      creditsUsed: credits_deducted ?? validProps.length * COST_PER_TRACE,
    });

    revalidatePath("/");

    return { success: true, found, notFound, creditsUsed: credits_deducted ?? validProps.length * COST_PER_TRACE };
  } catch (err) {
    console.error("[tracerfy] runBulkSkipTrace error:", err);
    return { error: err instanceof Error ? err.message : "Bulk skip trace failed" };
  }
}

/**
 * Check Tracerfy account status: configured flag and current balance.
 * No auth check — used on settings page before session may be available.
 */
export async function getTracerfyStatus(): Promise<TracerfyStatus> {
  const rawKey = process.env.TRACERFY_API_KEY;
  if (!rawKey) {
    return { configured: false, balance: null };
  }

  // Debug: surface key info in error for diagnosis
  const keyLen = rawKey.length;
  const keyPreview = `len=${keyLen}, starts="${rawKey.slice(0, 10)}...", ends="...${rawKey.slice(-5)}"`;

  try {
    const analytics = (await tracerfyFetch("GET", "/analytics/", rawKey)) as {
      balance?: number;
      credits_remaining?: number;
    };

    const balance = analytics.balance ?? analytics.credits_remaining ?? null;
    return { configured: true, balance };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch balance";
    return {
      configured: true,
      balance: null,
      error: `${msg} [key: ${keyPreview}]`,
    };
  }
}

/**
 * Read Tracerfy run history from scraperConfig.
 * Returns empty array if key not found.
 */
export async function getTracerfyRunHistory(): Promise<TracerfyRunEntry[]> {
  const row = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, TRACERFY_CONFIG_KEYS.RUN_HISTORY))
    .then((rows) => rows[0]);

  if (!row) return [];

  try {
    return JSON.parse(row.value) as TracerfyRunEntry[];
  } catch {
    return [];
  }
}

/**
 * Read Tracerfy config (lowBalanceThreshold, monthlyCap) from scraperConfig.
 * Returns defaults if keys not found.
 */
export async function getTracerfyConfig(): Promise<TracerfyConfig> {
  const rows = await db
    .select({ key: scraperConfig.key, value: scraperConfig.value })
    .from(scraperConfig)
    .where(like(scraperConfig.key, "tracerfy.%"));

  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    lowBalanceThreshold: parseFloat(
      map.get(TRACERFY_CONFIG_KEYS.LOW_BALANCE_THRESHOLD) ?? "2.00"
    ),
    monthlyCap: parseFloat(
      map.get(TRACERFY_CONFIG_KEYS.MONTHLY_CAP) ?? "50.00"
    ),
  };
}

const saveTracerfyConfigSchema = z.object({
  lowBalanceThreshold: z.number().min(0).max(100),
  monthlyCap: z.number().min(0).max(10000),
});

/**
 * Save Tracerfy config to scraperConfig key-value store.
 */
export async function saveTracerfyConfig(config: {
  lowBalanceThreshold: number;
  monthlyCap: number;
}): Promise<{ success: true } | { error: string }> {
  const parsed = saveTracerfyConfigSchema.safeParse(config);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid config values" };
  }

  try {
    const entries = [
      {
        key: TRACERFY_CONFIG_KEYS.LOW_BALANCE_THRESHOLD,
        value: String(parsed.data.lowBalanceThreshold),
        description: "Tracerfy low balance alert threshold (USD)",
      },
      {
        key: TRACERFY_CONFIG_KEYS.MONTHLY_CAP,
        value: String(parsed.data.monthlyCap),
        description: "Tracerfy monthly spend cap (USD)",
      },
    ];

    for (const entry of entries) {
      await db
        .insert(scraperConfig)
        .values({
          key: entry.key,
          value: entry.value,
          description: entry.description,
        })
        .onConflictDoUpdate({
          target: [scraperConfig.key],
          set: { value: entry.value, updatedAt: new Date() },
        });
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    console.error("[tracerfy] saveTracerfyConfig error:", err);
    return { error: "Failed to save Tracerfy config" };
  }
}

// -- findOrCreatePropertyForDeal --

/**
 * For deals without a propertyId — find an existing property by address or create one.
 * Links the deal to the property so skip trace can work.
 */
export async function findOrCreatePropertyForDeal(
  dealId: string,
  address: string,
  city: string
): Promise<{ propertyId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  // Try to find existing property by address
  const normalized = address.toLowerCase().trim();
  const existing = await db
    .select({ id: properties.id })
    .from(properties)
    .where(sql`lower(trim(${properties.address})) = ${normalized} AND lower(${properties.city}) = ${city.toLowerCase()}`)
    .limit(1);

  let propertyId: string;

  if (existing.length > 0) {
    propertyId = existing[0].id;
  } else {
    // Create a minimal property record via raw SQL (parcelId and county are NOT NULL in schema)
    const result = await db.execute(sql`
      INSERT INTO properties (address, city, state, county, parcel_id)
      VALUES (${address}, ${city || "Unknown"}, 'UT', 'unknown', ${"DEAL-" + dealId.slice(0, 8)})
      RETURNING id
    `);
    propertyId = (result.rows[0] as { id: string }).id;
  }

  // Link deal to property
  await db
    .update(deals)
    .set({ propertyId })
    .where(eq(deals.id, dealId));

  revalidatePath(`/deals/${dealId}`);
  return { propertyId };
}
