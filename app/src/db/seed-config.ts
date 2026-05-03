/**
 * Seed configuration for target cities and defaults.
 * Phase 4 expansion: all Utah cities in Carbon, Emery, Sanpete, Sevier, Juab, Millard counties.
 * Path A (2026-04-17): Added full Salt Lake County neighborhood coverage.
 */

export const DEFAULT_TARGET_CITIES = [
  // Rural counties (Carbon, Emery, Sanpete, Sevier, Juab, Millard)
  "Price",
  "Huntington",
  "Castle Dale",
  "Richfield",
  "Nephi",
  "Ephraim",
  "Manti",
  "Fillmore",
  "Delta",
  // Salt Lake County — neighborhoods derived from UGRC zip mapping
  "Rose Park",
  "Salt Lake City",
  "Sugar House",
  "Midvale",
  "Sandy",
  "Murray",
  "Holladay",
  "Kearns",
  "West Valley City",
  "Cottonwood Heights",
  "Taylorsville",
  "West Jordan",
  "South Jordan",
  "Riverton",
  "Herriman",
  "Draper",
  "South Salt Lake",
  "Salt Lake County (other)",
] as const;

export type TargetCity = (typeof DEFAULT_TARGET_CITIES)[number];
