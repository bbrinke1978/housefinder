---
status: investigating
trigger: "DATA-11: Identify vacant land vs improved properties and filter from dashboard"
created: 2026-03-26T00:00:00Z
updated: 2026-03-26T00:00:00Z
---

## Current Focus

hypothesis: Carbon County assessor page has property type / land use columns not currently extracted
test: Inspecting assessor URL and table columns; also using owner-name keyword backfill for other counties
expecting: Can extract propertyType from Carbon/Emery wpDataTables; can backfill via owner name patterns for Millard/Juab
next_action: Implement all five tasks

## Symptoms

expected: Dashboard filters out vacant land / unimproved lots
actual: propertyType column is empty for all 18,460 properties; vacant land mixed with houses
errors: none
reproduction: Any dashboard view includes land parcels
started: always

## Eliminated

- hypothesis: property_type column does not exist
  evidence: Column exists in schema (text, nullable), just never populated
  timestamp: 2026-03-26

## Evidence

- timestamp: 2026-03-26
  checked: properties table
  found: 18,460 properties across 4 counties: emery (15,879), carbon (921), millard (855), juab (805). property_type = NULL for all.
  implication: Need to populate from scraper extraction + owner-name backfill

- timestamp: 2026-03-26
  checked: owner names matching land/mineral/ranch keywords
  found: ~500+ properties with RANCH, MINING, LAND, CATTLE, GAS, OIL, COAL, FARM, WATER in owner name
  implication: Keyword-based backfill will catch majority of vacant/unimproved land in Millard/Juab counties

- timestamp: 2026-03-26
  checked: Carbon/Emery assessor pages
  found: wpDataTables column headers are dynamic — logged at runtime; likely includes property type variant columns
  implication: Add propertyType extraction using fallback column name list (property type, use, use code, class, etc.)

## Resolution

root_cause: propertyType was never extracted by any scraper
fix: (1) Add propertyType field to PropertyRecord + extraction in carbon-assessor + emery-tax-roll; (2) Add hideVacantLand setting; (3) Filter in queries; (4) Backfill via owner name keywords; (5) Seed setting
verification: pending
files_changed:
  - scraper/src/lib/validation.ts
  - scraper/src/sources/carbon-assessor.ts
  - scraper/src/sources/emery-tax-roll.ts
  - scraper/src/lib/upsert.ts
  - app/src/lib/actions.ts
  - app/src/components/settings-form.tsx
  - app/src/lib/queries.ts
  - scraper/src/db/seed-config.ts
