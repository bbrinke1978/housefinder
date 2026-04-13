---
phase: 21-ugrc-assessor-enrichment
plan: 01
subsystem: database
tags: [postgres, arcgis, ugrc, parcel-matching, import-script]

# Dependency graph
requires: []
provides:
  - "Hardened UGRC assessor import script safe for production execution"
  - "normalizeParcelId() function stripping hyphens, dots, spaces and uppercasing"
  - "Credential-free script requiring DATABASE_URL env var with clear error message"
  - "Correct ArcGIS pagination handling for exceededTransferLimit responses"
affects: [22-court-records, 23-data-quality]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Parcel ID normalization: UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) on both sides of match"
    - "ArcGIS pagination: check exceededTransferLimit before breaking on page < PAGE_SIZE"

key-files:
  created: []
  modified:
    - app/src/scripts/import-ugrc-assessor.mjs

key-decisions:
  - "Normalize parcel IDs on both UGRC and DB sides before matching to handle format differences across counties"
  - "Use SQL UPPER/REPLACE in WHERE clause (not application-side) so index-less scan still works correctly"
  - "Never break pagination solely on features.length < PAGE_SIZE — always check exceededTransferLimit first"

patterns-established:
  - "Parcel matching pattern: normalizeParcelId() + WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1"

requirements-completed: [UGRC-02]

# Metrics
duration: 7min
completed: 2026-04-13
---

# Phase 21 Plan 01: UGRC Import Script Hardening Summary

**Three targeted defects fixed in import-ugrc-assessor.mjs: credential removal, parcel ID normalization via UPPER/REPLACE SQL pattern, and correct ArcGIS exceededTransferLimit pagination**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-13T00:26:56Z
- **Completed:** 2026-04-13T00:33:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Removed hardcoded Azure PostgreSQL credential from script source; script now exits with a descriptive error if DATABASE_URL is not set
- Added `normalizeParcelId()` helper and wired it into `aggregateByParcelId()` so all UGRC PARCEL_ID keys are normalized before aggregation
- Updated both UPDATE and SELECT WHERE clauses to use `UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1` so format differences across counties (e.g. hyphens in Carbon vs none in Emery) no longer cause zero-match runs
- Fixed ArcGIS pagination: loop now checks `data.exceededTransferLimit === true` before breaking, preventing early exit on pages that were capped by the server below PAGE_SIZE
- All 6 verification checks pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove hardcoded DB cred and fix exceededTransferLimit pagination** - `72fbd4b` (fix)
2. **Task 2: Add normalizeParcelId() and update WHERE clauses** - `cf598d1` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `app/src/scripts/import-ugrc-assessor.mjs` - Fixed all three defects: credential guard, parcel normalization, pagination limit handling

## Decisions Made
- Normalize parcel IDs on the UGRC side in application code (normalizeParcelId) and on the DB side in SQL (UPPER/REPLACE) — both sides normalized so $1 parameter is always the normalized form and the WHERE clause applies the same transformation to stored values
- Used SQL REPLACE chain rather than a regex extension to keep the query portable across Postgres versions and avoid installing pg_trgm or similar
- Added a safety `if (features.length === 0) break;` as a second guard in the pagination loop to prevent infinite loops if ArcGIS ever returns exceededTransferLimit=true with an empty page

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Script is safe to run against production with DATABASE_URL set
- Run: `DATABASE_URL=postgresql://... node src/scripts/import-ugrc-assessor.mjs`
- No additional setup required before executing the enrichment run

---
*Phase: 21-ugrc-assessor-enrichment*
*Completed: 2026-04-13*
