/**
 * Seed configuration for target cities and defaults.
 * Phase 4 expansion: all Utah cities in Carbon, Emery, Sanpete, Sevier, Juab, Millard counties.
 */

export const DEFAULT_TARGET_CITIES = [
  "Price",
  "Huntington",
  "Castle Dale",
  "Richfield",
  "Nephi",
  "Ephraim",
  "Manti",
  "Fillmore",
  "Delta",
] as const;

export type TargetCity = (typeof DEFAULT_TARGET_CITIES)[number];
