---
phase: 25-rose-park-foundation
plan: "01"
subsystem: scraper/upsert + app/config
tags: [rose-park, city-normalization, urban-expansion]
dependency_graph:
  requires: []
  provides: [normalizeCity-function, rose-park-city-constant]
  affects: [scraper/upsert, app/seed-config, app/actions]
tech_stack:
  added: []
  patterns: [zip-to-neighborhood mapping, graceful degradation for rural counties]
key_files:
  created: []
  modified:
    - scraper/src/lib/upsert.ts
    - scraper/src/lib/validation.ts
    - app/src/db/seed-config.ts
    - app/src/lib/actions.ts
decisions:
  - normalizeCity() placed between COUNTY_DEFAULT_CITY and upsertProperty() — logical grouping, single normalization point
  - zip field added to PropertyRecord/propertyRecordSchema to support normalizeCity(record.zip) call site
metrics:
  duration: 2min
  completed: 2026-04-26
  tasks_completed: 2
  files_modified: 4
---

# Phase 25 Plan 01: Rose Park City Normalization Foundation Summary

**One-liner:** Added normalizeCity() to scraper upsert layer and Rose Park to both TypeScript DEFAULT_TARGET_CITIES constants, establishing the single normalization point for SLC zip-to-neighborhood mapping before any Rose Park data lands in the DB.

## What Was Built

### normalizeCity() — Single Normalization Point

`scraper/src/lib/upsert.ts` now contains a `normalizeCity(city, zip?)` function immediately before `upsertProperty()`. The function maps zip `'84116'` to `'Rose Park'` and passes all other inputs through unchanged. Future SLC neighborhood expansions (84104 Glendale, 84106 Sugar House) are one line each inside this function.

### Files Modified and What Changed

**scraper/src/lib/upsert.ts**
- Added `"salt lake": "Rose Park"` to `COUNTY_DEFAULT_CITY` map (covers future SLC scrapers that don't set zip)
- Added `normalizeCity(city, zip?)` function with JSDoc comment explaining zip-to-neighborhood pattern
- Wrapped city resolution line: `normalizeCity(record.city || COUNTY_DEFAULT_CITY[resolvedCounty] || "", record.zip)`
- Added `"salt lake": "Rose Park"` to `COUNTY_CITY` inline map inside `upsertFromUtahLegals()` (separate map — both must be updated or SLC utah-legals notices fall through to city="")

**scraper/src/lib/validation.ts** (deviation: auto-fix)
- Added `zip: z.string().optional()` to `propertyRecordSchema` — required for `record.zip` call site in `upsertProperty()` to compile without TypeScript errors

**app/src/db/seed-config.ts**
- Added `"Rose Park"` to `DEFAULT_TARGET_CITIES` as-const array

**app/src/lib/actions.ts**
- Added `"Rose Park"` to local `DEFAULT_TARGET_CITIES` plain array (NOT imported from seed-config — separate duplicate per plan spec; both must be updated independently)

### Success Criteria Verification

1. `normalizeCity('SALT LAKE CITY', '84116')` returns `'Rose Park'` — confirmed by reading function body
2. `normalizeCity('Price', undefined)` returns `'Price'` — graceful degradation confirmed (no zip match, returns city as-is)
3. `'Rose Park'` present in both `DEFAULT_TARGET_CITIES` constants — confirmed by grep
4. Both packages compile without errors — `npx tsc --noEmit` produced zero output (zero errors) in both `scraper/` and `app/`
5. No changes to `TARGET_COUNTIES` in `utah-legals.ts` — confirmed: still only carbon/emery/juab/millard

## TypeScript Compile Status

- `scraper/`: `npx tsc --noEmit` — PASSED (zero errors)
- `app/`: `npx tsc --noEmit` — PASSED (zero errors)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added zip field to PropertyRecord schema**
- **Found during:** Task 1
- **Issue:** Plan specified `normalizeCity(record.city..., record.zip)` but `PropertyRecord` type had no `zip` field — would cause TypeScript compile error
- **Fix:** Added `zip: z.string().optional()` to `propertyRecordSchema` in `scraper/src/lib/validation.ts`
- **Files modified:** `scraper/src/lib/validation.ts`
- **Commit:** 25a7be8

## Important Note

Plan 02 (SQL migration) must run next — the code is deployed but existing DB rows for zip 84116 are still stored with city='SALT LAKE CITY'. The migration retagging those rows is the next required step before Rose Park properties appear correctly on the dashboard.

## Commits

- `25a7be8` — feat(25-01): add normalizeCity() to upsert.ts and update county city maps
- `7cdf569` — feat(25-01): add Rose Park to both DEFAULT_TARGET_CITIES TypeScript constants
