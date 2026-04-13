---
phase: 22-xchange-court-record-intake
plan: 02
subsystem: api
tags: [xchange, court-records, drizzle, postgres, zod, next, distress-signals]

# Dependency graph
requires:
  - phase: 22-01
    provides: courtIntakeRuns schema and migration 0012 applied to DB

provides:
  - POST /api/court-intake endpoint with API key auth and Zod validation
  - processCourtIntake() three-tier address matching and signal insertion
  - matchCaseToProperty() returning propertyId or null with name-match suggestion
  - courtIntakeRuns audit row written per intake call
  - scoreAllPropertiesLocal() scoring inline using app's Drizzle client

affects:
  - 23-xchange-agent-integration
  - any future court record processing features

# Tech tracking
tech-stack:
  added: [date-fns (already in project)]
  patterns:
    - Inline score replication (copy scoring logic from scraper into app lib instead of cross-package import)
    - Three-tier fuzzy matching (normalized full address, street number+name, owner name review-only)
    - onConflictDoNothing for idempotent signal upsert
    - Sentinel date "1970-01-01" for signals with no recordedDate

key-files:
  created:
    - app/src/lib/xchange-intake.ts
    - app/src/app/api/court-intake/route.ts
  modified: []

key-decisions:
  - "Replicate scoreAllProperties inline using app's Drizzle client — no cross-package import from scraper (Next.js bundler module resolution incompatible with scraper's ESM .js extensions)"
  - "matchCaseToProperty returns { propertyId, nameMatchSuggestion } — tier 3 name match is review-only, never auto-inserts signal"
  - "COURT_INTAKE_API_KEY env var for auth (not WEBSITE_LEAD_API_KEY) — separate key per integration"
  - "date-fns parse/format for MM/dd/yyyy → yyyy-MM-dd conversion; undefined passed on failure (sentinel handles null in signal dedup)"

patterns-established:
  - "Court record intake pattern: match → signal → score once → audit row"
  - "Three-tier fuzzy matching: full normalized address → house+street → owner name (review only)"

requirements-completed: [XCHG-01, XCHG-02, XCHG-03, XCHG-04, XCHG-05, XCHG-06]

# Metrics
duration: 15min
completed: 2026-04-13
---

# Phase 22 Plan 02: XChange Court Record Intake Summary

**POST /api/court-intake with three-tier property matching, distress signal insertion, and per-run audit logging via Drizzle app client**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-13T14:18:36Z
- **Completed:** 2026-04-13T14:33:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `app/src/lib/xchange-intake.ts` with three-tier address matching, CASE_TYPE_TO_SIGNAL map for all 11 XChange case codes, signal insertion with onConflictDoNothing, inline scoring, and courtIntakeRuns audit row per call
- Created `app/src/app/api/court-intake/route.ts` with API key auth (401), Zod validation (422), and delegation to processCourtIntake
- TypeScript build passes with zero errors

## Task Commits

1. **Task 1: Create xchange-intake.ts matching and insertion library** - `662c0fb` (feat)
2. **Task 2: Create POST /api/court-intake route** - `c859e3a` (feat)

## Files Created/Modified

- `app/src/lib/xchange-intake.ts` - Matching library: normalizeForMatch, matchCaseToProperty (3-tier), insertSignal, scoreAllPropertiesLocal, processCourtIntake, CourtCase/IntakeResult types
- `app/src/app/api/court-intake/route.ts` - POST endpoint: API key auth, Zod validation, processCourtIntake delegation

## Decisions Made

- Replicated `scoreAllProperties` inline in xchange-intake.ts using the app's Drizzle client instead of cross-importing from the scraper package. The scraper uses ESM `.js` extensions and a different db client — not compatible with Next.js bundler module resolution.
- Tier 3 name matching returns `null` from `matchCaseToProperty` (no auto-signal) with a `nameMatchSuggestion` property id stored in the unmatchedCases JSON for human review.
- Used `COURT_INTAKE_API_KEY` as the env var name (separate from `WEBSITE_LEAD_API_KEY`) to keep integrations independently revocable.

## Deviations from Plan

None - plan executed exactly as written. The note in the plan about cross-package imports was pre-anticipated and the inline replication path was already specified as the preferred fallback.

## Issues Encountered

None.

## User Setup Required

Add `COURT_INTAKE_API_KEY` to Netlify environment variables (Settings → Build & deploy → Environment). Generate a random 32-char hex string:

```bash
openssl rand -hex 32
```

The XChange agent will include this as the `x-api-key` header in every POST to `/api/court-intake`. Do NOT commit the key value to the repo.

## Next Phase Readiness

- POST /api/court-intake is live and ready for the XChange agent (Phase 23) to call
- All six XCHG requirements fulfilled: auth, validation, matching, signal insertion, scoring, audit logging
- Unmatched cases stored as JSON in courtIntakeRuns.unmatched_cases for review

---
*Phase: 22-xchange-court-record-intake*
*Completed: 2026-04-13*
