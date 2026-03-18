import { db } from "../db/client.js";
import { properties, distressSignals } from "../db/schema.js";
import { classifyOwnerType } from "./scraper-utils.js";
import type { PropertyRecord, DelinquentRecord, RecorderRecord } from "./validation.js";

/**
 * Upsert a property record using parcelId as the deduplication key.
 * On conflict, updates address, ownerName, ownerType, and updatedAt.
 * firstSeenAt is only set on initial insert (defaultNow in schema).
 *
 * @returns The property UUID id
 */
export async function upsertProperty(record: PropertyRecord): Promise<string> {
  const now = new Date();
  const ownerType = classifyOwnerType(record.ownerName);

  const result = await db
    .insert(properties)
    .values({
      parcelId: record.parcelId,
      address: record.address,
      city: record.city,
      county: "carbon",
      state: "UT",
      ownerName: record.ownerName ?? null,
      ownerType,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: properties.parcelId,
      set: {
        address: record.address,
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
  records: PropertyRecord[]
): Promise<{ upserted: number }> {
  let upserted = 0;

  for (const record of records) {
    await upsertProperty(record);
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
  records: DelinquentRecord[]
): Promise<{ upserted: number; signals: number }> {
  let upserted = 0;
  let signals = 0;

  for (const record of records) {
    const propertyId = await upsertProperty({
      parcelId: record.parcelId,
      address: record.propertyAddress ?? "",
      city: record.propertyCity ?? "",
      ownerName: record.ownerName,
    });
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
