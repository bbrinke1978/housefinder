import { db } from "../db/client.js";
import { properties, distressSignals } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { classifyOwnerType } from "./scraper-utils.js";
import type { PropertyRecord, DelinquentRecord, RecorderRecord } from "./validation.js";
import type { EmeryBackTaxRecord } from "../sources/emery-5year-backtax.js";
import type { UtahLegalsNotice } from "../sources/utah-legals.js";

/** Default city for each county when the scraper doesn't extract one */
const COUNTY_DEFAULT_CITY: Record<string, string> = {
  carbon: "Price",
  emery: "Castle Dale",
  juab: "Nephi",
  millard: "Delta",
  sanpete: "Manti",
  sevier: "Richfield",
};

/**
 * Upsert a property record using parcelId as the deduplication key.
 * On conflict, updates address, ownerName, ownerType, and updatedAt.
 * firstSeenAt is only set on initial insert (defaultNow in schema).
 *
 * @returns The property UUID id
 */
export async function upsertProperty(record: PropertyRecord, county?: string): Promise<string> {
  const now = new Date();
  const ownerType = classifyOwnerType(record.ownerName);
  const resolvedCounty = county ?? record.county ?? "carbon";
  const city = record.city || COUNTY_DEFAULT_CITY[resolvedCounty] || "";

  // Carry propertyType through when the scraper extracted one.
  // Null means "not available from this source" — preserved in the DB as-is on conflict.
  const propertyTypeValue = record.propertyType ?? null;

  const result = await db
    .insert(properties)
    .values({
      parcelId: record.parcelId,
      address: record.address,
      city,
      county: resolvedCounty,
      state: "UT",
      ownerName: record.ownerName ?? null,
      ownerType,
      propertyType: propertyTypeValue,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: properties.parcelId,
      set: {
        address: record.address,
        city,
        ownerName: record.ownerName ?? null,
        ownerType,
        // Only overwrite propertyType if a new value was scraped
        ...(propertyTypeValue !== null ? { propertyType: propertyTypeValue } : {}),
        updatedAt: now,
      },
    })
    .returning({ id: properties.id });

  return result[0].id;
}

/**
 * Insert a distress signal with ON CONFLICT DO NOTHING for deduplication
 * on the composite key (propertyId, signalType, recordedDate).
 */
export async function upsertSignal(
  propertyId: string,
  signal: {
    type: string;
    recordedDate?: string;
    sourceUrl?: string;
    raw?: unknown;
  }
): Promise<void> {
  // Use sentinel date '1970-01-01' when recordedDate is null to match
  // the COALESCE unique index (uq_distress_signal_dedup) — PostgreSQL
  // treats NULLs as never equal, so ON CONFLICT needs a real value.
  const recordedDate = signal.recordedDate || "1970-01-01";

  await db
    .insert(distressSignals)
    .values({
      propertyId,
      signalType: signal.type as "nod" | "tax_lien" | "lis_pendens" | "probate" | "code_violation" | "vacant",
      status: "active",
      recordedDate,
      sourceUrl: signal.sourceUrl ?? null,
      rawData: signal.raw ? JSON.stringify(signal.raw) : null,
    })
    .onConflictDoNothing();
}

/**
 * Upsert property records from the assessor scraper.
 * Each record creates/updates a property row.
 */
export async function upsertFromAssessor(
  records: PropertyRecord[],
  county?: string
): Promise<{ upserted: number }> {
  let upserted = 0;

  for (const record of records) {
    await upsertProperty(record, county);
    upserted++;
  }

  return { upserted };
}

/**
 * Upsert records from the delinquent tax scraper.
 * Each record creates/updates a property (to ensure it exists),
 * then inserts a tax_lien distress signal.
 *
 * When a year is present (e.g. Carbon County data), it is stored as the
 * recorded_date (Jan 1 of that year). This means each delinquency year
 * creates a distinct signal row (the unique index is on property_id +
 * signal_type + recorded_date), enabling multi-year delinquency detection
 * in the scoring engine.
 */
export async function upsertFromDelinquent(
  records: DelinquentRecord[],
  county?: string
): Promise<{ upserted: number; signals: number }> {
  let upserted = 0;
  let signals = 0;

  for (const record of records) {
    const propertyId = await upsertProperty({
      parcelId: record.parcelId,
      address: record.propertyAddress ?? "",
      city: record.propertyCity ?? "",
      ownerName: record.ownerName,
    }, county);
    upserted++;

    // If a year is present, use Jan 1 of that year as recorded_date so
    // each year of delinquency is stored as a separate signal row.
    // This enables multi-year scoring bonus in scoreProperty().
    let recordedDate: string | undefined;
    if (record.year && /^\d{4}$/.test(record.year)) {
      recordedDate = `${record.year}-01-01`;
    }

    await upsertSignal(propertyId, {
      type: "tax_lien",
      recordedDate,
      raw: {
        year: record.year,
        amountDue: record.amountDue,
      },
    });
    signals++;
  }

  return { upserted, signals };
}

/**
 * Upsert records from the Emery County 5-year back tax scraper.
 *
 * Each record contains per-year amounts (2021-2025). For each year where
 * a non-zero amount is present, we create a distinct tax_lien signal
 * with recorded_date = Jan 1 of that year, enabling multi-year delinquency
 * scoring in scoreProperty().
 *
 * The property is created/updated with the owner name from the record.
 * Address defaults to empty (this table does not provide property addresses).
 */
export async function upsertFromEmery5Year(
  records: EmeryBackTaxRecord[]
): Promise<{ upserted: number; signals: number }> {
  let upserted = 0;
  let signals = 0;

  for (const record of records) {
    // Use a synthetic parcel ID with "emery-" prefix if it doesn't already look
    // like an Emery parcel (format: XX-XXXX-XXXX)
    const parcelId = record.parcelId;

    const propertyId = await upsertProperty({
      parcelId,
      address: "",
      city: "",
      ownerName: record.ownerName,
    }, "emery");
    upserted++;

    // Create a signal for each year with a non-zero amount
    for (const [year, amountStr] of Object.entries(record.yearAmounts)) {
      if (!amountStr || amountStr === "0" || amountStr === "0.00") continue;
      if (!/^\d{4}$/.test(year)) continue;

      const amount = parseFloat(amountStr.replace(/,/g, ""));
      if (isNaN(amount) || amount <= 0) continue;

      await upsertSignal(propertyId, {
        type: "tax_lien",
        recordedDate: `${year}-01-01`,
        raw: {
          year,
          amountDue: String(amount.toFixed(2)),
          source: "emery-5year-backtax",
        },
      });
      signals++;
    }

    // Also store a signal with the total (for scoring fallback if no year breakdown)
    if (record.totalTax) {
      const total = parseFloat(record.totalTax.replace(/[$,]/g, ""));
      if (!isNaN(total) && total > 0) {
        // Use sentinel date so it doesn't collide with per-year signals
        await upsertSignal(propertyId, {
          type: "tax_lien",
          recordedDate: undefined, // -> sentinel 1970-01-01
          raw: {
            amountDue: String(total.toFixed(2)),
            source: "emery-5year-backtax-total",
            yearCount: Object.keys(record.yearAmounts).length,
          },
        });
        signals++;
      }
    }
  }

  return { upserted, signals };
}

/**
 * Upsert records from the recorder scraper (NOD / lis pendens).
 * Each record creates/updates a property (minimal data),
 * then inserts the appropriate distress signal.
 */
export async function upsertFromRecorder(
  records: RecorderRecord[]
): Promise<{ upserted: number; signals: number }> {
  let upserted = 0;
  let signals = 0;

  for (const record of records) {
    const propertyId = await upsertProperty({
      parcelId: record.parcelId,
      address: "",
      city: "",
    });
    upserted++;

    await upsertSignal(propertyId, {
      type: record.signalType,
      recordedDate: record.recordedDate,
      sourceUrl: record.sourceUrl,
    });
    signals++;
  }

  return { upserted, signals };
}

/**
 * Upsert NOD signals from Utah Legals foreclosure notices.
 *
 * Matching strategy (in order of preference):
 * 1. If a parcel ID was extracted from the notice text, match on parcelId
 * 2. If an address was extracted, use it to find or create the property
 * 3. If neither, use a synthetic parcel ID based on notice URL hash
 *
 * Creates/updates properties and inserts "nod" distress signals (weight 3).
 *
 * Deduplication: Only ONE NOD signal is kept per property. Utah Legals
 * publishes the same trustee sale notice every week until the sale date,
 * creating multiple notices for the same foreclosure. We skip inserting a
 * new NOD if one already exists for the property — the existing record
 * (earliest publication) is the canonical signal.
 */
export async function upsertFromUtahLegals(
  notices: UtahLegalsNotice[]
): Promise<{ upserted: number; signals: number }> {
  let upserted = 0;
  let signals = 0;

  // Track which propertyIds already got an NOD this run to avoid double-inserts
  // when the same property appears in multiple pages of results.
  const nodInsertedThisRun = new Set<string>();

  for (const notice of notices) {
    // Generate a parcel ID in order of preference:
    // 1. Extracted parcel/A.P.N. from notice text (best dedup key)
    // 2. Normalized property address (still unique per property)
    // 3. Notice detail URL ID (guaranteed unique per notice, used as fallback)
    let parcelId = notice.parcelId;

    if (!parcelId && notice.propertyAddress) {
      // Normalize address to create a consistent synthetic ID
      const normalized = notice.propertyAddress
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      parcelId = `ul-${notice.county}-${normalized}`;
    }

    if (!parcelId && notice.detailUrl) {
      // Fall back to URL-based synthetic ID so we never lose a valid NOD signal.
      // NOTE: URL-based IDs are notice-unique (each weekly publication has a
      // different ID), so we strip the numeric suffix and treat all notices for
      // the same publication run as distinct properties. This is intentional —
      // if we can't identify the property by parcel or address we create a new
      // property row per-notice, which is the safer fallback.
      const urlId = notice.detailUrl.match(/ID=(\d+)/)?.[1];
      if (urlId) {
        parcelId = `ul-${notice.county}-id${urlId}`;
      }
    }

    if (!parcelId) {
      console.log(`[upsert-utah-legals] Skipping notice with no identifier: "${notice.title.slice(0, 60)}"`);
      continue;
    }

    const county = notice.county.toLowerCase();
    const COUNTY_CITY: Record<string, string> = {
      carbon: "Price",
      emery: "Castle Dale",
      juab: "Nephi",
      millard: "Delta",
    };

    // Prefer the city extracted from the notice; fall back to county default
    const city = (notice as UtahLegalsNotice & { city?: string }).city || COUNTY_CITY[county] || "";

    const propertyId = await upsertProperty({
      parcelId,
      address: notice.propertyAddress ?? "",
      city,
      ownerName: notice.ownerName,
    }, county);
    upserted++;

    // Skip if we already inserted an NOD for this property this run
    if (nodInsertedThisRun.has(propertyId)) {
      console.log(`[upsert-utah-legals] Skipping duplicate NOD for property ${propertyId} (parcel: ${parcelId})`);
      continue;
    }

    // Check if the property already has an NOD signal in the database.
    // Utah Legals re-publishes trustee sale notices weekly — we only need
    // one NOD record per property.
    const existingNod = await db
      .select({ id: distressSignals.id })
      .from(distressSignals)
      .where(
        and(
          eq(distressSignals.propertyId, propertyId),
          eq(distressSignals.signalType, "nod")
        )
      )
      .limit(1);

    if (existingNod.length > 0) {
      console.log(`[upsert-utah-legals] NOD already exists for property ${propertyId} (parcel: ${parcelId}) — skipping`);
      nodInsertedThisRun.add(propertyId);
      continue;
    }

    // Parse notice date (various formats)
    let recordedDate: string | undefined;
    if (notice.noticeDate) {
      const d = new Date(notice.noticeDate);
      if (!isNaN(d.getTime())) {
        recordedDate = d.toISOString().split("T")[0];
      }
    }

    await upsertSignal(propertyId, {
      type: "nod",
      recordedDate,
      sourceUrl: notice.detailUrl,
      raw: {
        title: notice.title,
        county: notice.county,
        noticeDate: notice.noticeDate,
        source: "utah-legals",
      },
    });
    nodInsertedThisRun.add(propertyId);
    signals++;
  }

  return { upserted, signals };
}
