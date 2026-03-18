import { z } from "zod";

/**
 * Zod schema for property records scraped from the Carbon County assessor.
 * Fields match the properties table shape for upsert compatibility.
 */
export const propertyRecordSchema = z.object({
  parcelId: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  ownerName: z.string().optional(),
  taxStatus: z.string().optional(),
  mortgageInfo: z.string().optional(),
});

export type PropertyRecord = z.infer<typeof propertyRecordSchema>;

/**
 * Zod schema for delinquent tax records scraped from the Carbon County
 * delinquent properties page.
 */
export const delinquentRecordSchema = z.object({
  parcelId: z.string().min(1),
  ownerName: z.string().optional(),
  year: z.string().optional(),
  amountDue: z.string().optional(),
  propertyAddress: z.string().optional(),
  propertyCity: z.string().optional(),
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
