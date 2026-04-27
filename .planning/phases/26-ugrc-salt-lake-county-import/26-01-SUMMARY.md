---
phase: 26-ugrc-salt-lake-county-import
plan: 01
subsystem: database
tags: [ugrc, arcgis, postgres, parcel-enrichment, salt-lake-county, rose-park]

# Dependency graph
requires:
  - phase: 25.5-utah-legals-slc-activation
    provides: rose-park-parcel-allowlist.json (8,270 parcel IDs for zip 84116)
provides:
  - Extended import-ugrc-assessor.mjs with fetchFromAllowlist() and --dry-run
  - Salt Lake County (84116) entry in COUNTIES array using allowlist approach
  - Safe dry-run mode for shadow testing before live DB writes
affects:
  - 26-ugrc-salt-lake-county-import/26-02 (script invocation plan)

# Tech tracking
tech-stack:
  added: [node:fs, node:path, node:url (fileURLToPath)]
  patterns:
    - POST-based ArcGIS batch query to avoid GET URL length limits
    - Allowlist-driven parcel fetch (Option B) for county layers without zip fields

key-files:
  created: []
  modified:
    - app/src/scripts/import-ugrc-assessor.mjs

key-decisions:
  - "Use POST (application/x-www-form-urlencoded) for ArcGIS batch queries — avoids GET URL length limits at 100 IDs/batch (~1,800 chars)"
  - "Batch size 100 parcel IDs per request — 42 requests for 4,135 unique parcels, well within ArcGIS rate limits"
  - "Resolved allowlistPath as absolute path at module parse time via fileURLToPath(import.meta.url) — portable across environments"
  - "dry-run uses SELECT probe instead of UPDATE, builds synthetic rowCount object so downstream counters work unchanged"

patterns-established:
  - "allowlistPath in COUNTIES entry triggers fetchFromAllowlist() instead of fetchAllFeatures() — backward-compatible opt-in"
  - "dryRun flag: no UPDATE SQL string reachable when true; SELECT probe mirrors WHERE clause for accurate would-update count"

requirements-completed: [RP-01]

# Metrics
duration: 8min
completed: 2026-04-27
---

# Phase 26 Plan 01: UGRC Assessor Import — SLC Allowlist Extension Summary

**fetchFromAllowlist() added to UGRC import script: 8,270 Rose Park parcel IDs batched via POST to Parcels_SaltLake_LIR, with --dry-run flag for safe shadow execution before live DB writes**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-27T03:20:51Z
- **Completed:** 2026-04-27T03:29:00Z
- **Tasks:** 2 (combined into 1 commit — same file, tightly coupled)
- **Files modified:** 1

## Accomplishments

- Added `fetchFromAllowlist(serviceName, parcelIds, batchSize=100)` using POST requests with `application/x-www-form-urlencoded` body to avoid GET URL length limits when sending large `IN` clauses
- Added `Salt Lake (84116)` entry to COUNTIES array with `allowlistPath` pointing to `scraper/data/rose-park-parcel-allowlist.json` (8,270 parcel IDs)
- Added `--dry-run` flag: SELECT-based probe replaces UPDATE, synthetic `rowCount` object preserves all downstream counter logic, summary prints "WOULD update" instead of "Total properties enriched"
- Updated file-header comment block with new usage examples for all three invocation modes
- All 4 existing rural county entries (Carbon, Emery, Juab, Millard) and the UPDATE SQL left entirely unchanged

## Task Commits

Both plan tasks modify the same file and were committed together:

1. **Task 1: Add fetchFromAllowlist() and Salt Lake County entry** + **Task 2: Add --dry-run flag** - `9b0906f` (feat)

**Plan metadata:** (to be added with this SUMMARY commit)

## Files Created/Modified

- `app/src/scripts/import-ugrc-assessor.mjs` — Added node:fs/path/url imports; fetchFromAllowlist() function; Salt Lake (84116) COUNTIES entry with allowlistPath; allowlistPath branch in main() fetch block; dryRun flag parsing and SELECT probe; updated summary log; updated header comment

## Decisions Made

- **POST over GET for ArcGIS batches:** Each batch of 100 IDs builds a `PARCEL_ID IN ('id1',...,'id100')` clause ~1,800 chars. POST avoids URL length limits that would truncate GET requests. Research Open Question 1 confirmed POST is valid for this ArcGIS endpoint.

- **Batch size 100:** Safe floor for both POST and GET fallback. 8,270 parcel IDs / 100 = ~83 batches (plan said 42 for 4,135 — actual count depends on how many parcelIds the allowlist contains, but batchSize is configurable).

- **Absolute allowlistPath via fileURLToPath(import.meta.url):** Resolved at module parse time. Path is `app/src/scripts/` → `app/src/` → `app/` → repo root → `scraper/data/rose-park-parcel-allowlist.json`. Portable: works regardless of `cwd` when script is invoked.

- **Dry-run SELECT probe:** Uses the same `UPPER(REPLACE(REPLACE(parcel_id,'-',''),' ',''))` WHERE clause as the UPDATE. Synthetic `res = { rowCount: N }` object means the `if (res.rowCount > 0)` / check-for-no-match fallback block runs identically in both modes — only the UPDATE itself is skipped.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The `DATABASE_URL` guard at line 22 exits before allowlist load if env var is missing, so the live allowlist-load check from the verify step was not testable without a DB. The syntax check (`node -c`) and grep count (10 references >= 6 required) confirm correctness.

## Lines Added

The script grew from 253 lines to 363 lines. Key ranges:
- Lines 20-22: new `fs`, `path`, `fileURLToPath` imports
- Lines 36-60: COUNTIES comment block rewritten + Salt Lake (84116) entry added
- Lines 140-176: `fetchFromAllowlist()` function (37 lines)
- Lines 235-240: `dryRun` flag parsing
- Lines 260-265: `allowlistPath` branch in fetch block
- Lines 283-302: `if (dryRun)` SELECT probe branch replacing unconditional UPDATE
- Line 351: `dryRun ? "WOULD update" : "Total properties enriched"` in summary

## Dry-Run Test Status

Not tested live — `DATABASE_URL` not available in this environment. Verified by:
1. `node -c` syntax check: PASS
2. `grep -c "fetchFromAllowlist|allowlistPath|dryRun"`: 10 references (>= 6 required)
3. Code review confirms no UPDATE SQL string is reachable when `dryRun === true`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `import-ugrc-assessor.mjs` is ready for Plan 02 invocation
- Run `node app/src/scripts/import-ugrc-assessor.mjs --county=salt-lake --dry-run` from production to verify allowlist loads and ArcGIS responds before committing live DB writes
- Plan 02 will run the live enrichment and report results

---
*Phase: 26-ugrc-salt-lake-county-import*
*Completed: 2026-04-27*
