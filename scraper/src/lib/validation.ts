import { z } from "zod";

/**
 * Zod schema for property records scraped from assessor / tax roll sources.
 * Fields match the properties table shape for upsert compatibility.
 *
 * address and city are optional strings (can be empty) because:
 * - Column names in wpDataTables vary by county and may not match our fallback list
 * - Missing address/city should not silently discard a valid parcel record
 * - The properties table allows empty strings for address/city (text NOT NULL but "")
 * - parcelId is the only hard requirement for deduplication
 */
export const propertyRecordSchema = z.object({
  parcelId: z.string().min(1),
  address: z.string().default(""),
  city: z.string().default(""),
  county: z.string().optional(),
  ownerName: z.string().optional(),
  taxStatus: z.string().optional(),
  mortgageInfo: z.string().optional(),
  // Property type — extracted from assessor when available (e.g. "Residential", "Vacant", "Agricultural")
  propertyType: z.string().optional(),
  // Property zip code — used by normalizeCity() to map SLC zips to neighborhoods
  zip: z.string().optional(),
  // Mailing address fields — only populated by carbon-assessor (separate from property address)
  mailingAddress: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingState: z.string().optional(),
  mailingZip: z.string().optional(),
});

export type PropertyRecord = z.infer<typeof propertyRecordSchema>;

/**
 * Zod schema for delinquent tax records scraped from the Carbon County
 * delinquent properties page.
 */
export const delinquentRecordSchema = z.object({
  parcelId: z.string().min(1),
  county: z.string().optional(),
  ownerName: z.string().optional(),
  year: z.string().optional(),
  amountDue: z.string().optional(),
  propertyAddress: z.string().optional(),
  propertyCity: z.string().optional(),
  /** Property zip — used by upsertProperty's normalizeCity() to retag SLC zips to neighborhood names */
  propertyZip: z.string().optional(),
});

export type DelinquentRecord = z.infer<typeof delinquentRecordSchema>;

/**
 * Zod schema for recorder records (NOD / lis pendens).
 * Used by the carbon-recorder source module.
 */
export const recorderRecordSchema = z.object({
  parcelId: z.string().min(1),
  signalType: z.enum(["nod", "lis_pendens"]),
  recordedDate: z.string().optional(),
  sourceUrl: z.string().optional(),
});

export type RecorderRecord = z.infer<typeof recorderRecordSchema>;
