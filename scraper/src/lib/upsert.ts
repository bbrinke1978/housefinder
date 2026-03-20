import { db } from "../db/client.js";
import { properties, distressSignals } from "../db/schema.js";
import { classifyOwnerType } from "./scraper-utils.js";
import type { PropertyRecord, DelinquentRecord, RecorderRecord } from "./validation.js";

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
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: properties.parcelId,
      set: {
        address: record.address,
        city,
        ownerName: record.ownerName ?? null,
        ownerType,
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
  await db
    .insert(distressSignals)
    .values({
      propertyId,
      signalType: signal.type as "nod" | "tax_lien" | "lis_pendens" | "probate" | "code_violation" | "vacant",
      status: "active",
      recordedDate: signal.recordedDate ?? null,
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

    await upsertSignal(propertyId, {
      type: "tax_lien",
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
