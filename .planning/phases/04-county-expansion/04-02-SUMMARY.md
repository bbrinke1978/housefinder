---
phase: 04-county-expansion
plan: 02
subsystem: ui
tags: [next.js, server-actions, drizzle, distress-signals, manual-entry]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: distressSignals table with signal type enum including vacant/probate/code_violation
  - phase: 02-core-application
    provides: property detail page with tabs, server action patterns
provides:
  - Vacant toggle server action (setVacantFlag) and UI checkbox
  - Manual signal entry server action (addManualSignal) for probate and code_violation
  - getActiveVacantFlag query for reading vacant status
  - FieldObservations component on property detail Signals tab
  - Updated DEFAULT_TARGET_CITIES with all 9 Phase 4 cities
  - seed-config.ts with typed target city constants
affects: [04-county-expansion, scoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [useTransition for server action pending states, onConflictDoNothing for dedup]

key-files:
  created:
    - app/src/components/field-observations.tsx
    - app/src/db/seed-config.ts
  modified:
    - app/src/lib/actions.ts
    - app/src/app/(dashboard)/properties/[id]/page.tsx

key-decisions:
  - "Native checkbox for vacant toggle (consistent with 03-03 pattern)"
  - "onConflictDoNothing for signal dedup via existing uq_distress_signal_dedup index"
  - "Duplicate active signal check done client-side from signals prop (no extra query)"

patterns-established:
  - "Manual signal entry pattern: client component with useTransition calling server action that inserts into distressSignals"

requirements-completed: [DATA-05, DATA-06]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 4 Plan 2: Manual Signal Entry UI Summary

**Vacant toggle and manual probate/code_violation entry on property detail page with 9-city target expansion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T01:40:55Z
- **Completed:** 2026-03-19T01:43:54Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Server actions for vacant flag toggle (create/resolve) and manual probate/code_violation signal entry
- FieldObservations client component with checkbox and form, wired into Signals tab
- Target cities expanded from 1 (Price) to all 9 Phase 4 cities

## Task Commits

Each task was committed atomically:

1. **Task 1: Server actions for manual signal management + target cities seed update** - `b6646ca` (feat)
2. **Task 2: Field Observations UI component on property detail page** - `e7aabd8` (feat)

## Files Created/Modified
- `app/src/lib/actions.ts` - Added setVacantFlag, addManualSignal, getActiveVacantFlag; updated DEFAULT_TARGET_CITIES; imported distressSignals and `and` from drizzle-orm
- `app/src/components/field-observations.tsx` - New client component with vacant checkbox toggle and manual signal add form
- `app/src/app/(dashboard)/properties/[id]/page.tsx` - Wired FieldObservations into Signals tab, added getActiveVacantFlag to data fetch
- `app/src/db/seed-config.ts` - New file with typed DEFAULT_TARGET_CITIES constant

## Decisions Made
- Native checkbox for vacant toggle (consistent with 03-03 pattern, no shadcn Switch)
- onConflictDoNothing for signal dedup leveraging the existing unique index
- Client-side duplicate active signal detection from signals prop instead of extra DB query

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Manual signal entry ready for user testing
- Signals feed into existing scoring engine without changes (signal types already in enum + scoring config)
- Target cities updated for scraper expansion (04-01 handles scraper side)

## Self-Check: PASSED

All 4 files verified present. Both task commits (b6646ca, e7aabd8) verified in git log.

---
*Phase: 04-county-expansion*
*Completed: 2026-03-18*
