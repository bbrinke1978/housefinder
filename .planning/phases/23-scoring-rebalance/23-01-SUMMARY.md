---
phase: 23-scoring-rebalance
plan: 01
subsystem: scoring
tags: [scoring, deduplication, dry-run, distress-signals, nod, lis_pendens, probate, typescript]

# Dependency graph
requires:
  - phase: 22-xchange-court-record-intake
    provides: probate/code_violation/lis_pendens signals ingested to distress_signals table

provides:
  - deduplicateSignals() in score.ts — collapses same-type NOD/lis_pendens within 90-day windows
  - dry-run.ts CLI — read-only rescore simulation with baseline vs simulated comparison and threshold guidance

affects: [23-scoring-rebalance, threshold-decision]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "90-day dedup window: earliest signal per window kept, null/sentinel dates are distinct"
    - "CLI entry point pattern: import.meta.url check for isDirectRun"
    - "Simulated config: zero-weight signals bumped to defaults for simulation pass"

key-files:
  created:
    - scraper/src/scoring/dry-run.ts
  modified:
    - scraper/src/scoring/score.ts

key-decisions:
  - "Deduplicate only nod and lis_pendens — probate/code_violation/tax_lien/vacant each filing is distinct"
  - "Null and sentinel 1970-01-01 dates treated as distinct (cannot determine proximity)"
  - "deduplicateSignals() called on pre-filtered activeSignals inside scoreProperty()"
  - "dry-run Pass B ensures XChange signal weights are non-zero even if DB config has them at 0"

patterns-established:
  - "deduplicateSignals: receives signals, returns new array — pure function, no side effects"
  - "dry-run CLI: reads live DB, writes nothing — all DB calls are .select() only"

requirements-completed: [SCORE2-01, SCORE2-03]

# Metrics
duration: 8min
completed: 2026-04-13
---

# Phase 23 Plan 01: Scoring Rebalance — Deduplication + Dry-Run Summary

**90-day signal deduplication added to scoreProperty() and read-only dry-run CLI built for safe threshold analysis before activating XChange signal types**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-13T14:22:09Z
- **Completed:** 2026-04-13T14:30:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added exported `deduplicateSignals()` to score.ts that collapses NOD and lis_pendens signals within 90-day windows (earliest per window kept), with null/sentinel dates treated as distinct
- Integrated deduplication into `scoreProperty()` — called on active signals before the scoring loop; no signature change
- Created `scraper/src/scoring/dry-run.ts` — standalone CLI that reads live DB, runs baseline vs simulated scoring passes, and prints a structured report with hot lead delta, per-signal-type breakdown, dedup impact, and threshold guidance table (thresholds 4-7)
- Zero database writes in dry-run path — all DB operations are SELECT only

## Task Commits

Each task was committed atomically:

1. **Task 1: Add deduplicateSignals() to score.ts** - `e4f7921` (feat)
2. **Task 2: Create dry-run.ts CLI script** - `e05fd0e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `scraper/src/scoring/score.ts` - Added exported `deduplicateSignals()` function and updated `scoreProperty()` to call it before the scoring loop
- `scraper/src/scoring/dry-run.ts` - New read-only CLI: loads config, fetches all distress signals, runs two scoring passes, prints structured report

## Decisions Made

- Only "nod" and "lis_pendens" are deduplicated — probate, code_violation, tax_lien, and vacant each represent a distinct filing event
- Null and sentinel 1970-01-01 recorded_dates are treated as distinct signals that cannot be proximity-checked; they are always kept
- `deduplicateSignals()` receives the already-filtered active signals array (not the full signals array) so dedup only runs on signals that would score
- Simulated config in dry-run ensures XChange signal weights are at least the defaults (1/1/2) even if currently stored as 0 in scraperConfig

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- deduplicateSignals() is live in the scoring engine — any property with multiple NOD or lis_pendens signals within 90 days will now score correctly
- dry-run.ts is ready to execute against production DB: `cd scraper && DATABASE_URL=... npx tsx src/scoring/dry-run.ts`
- Output of dry-run report provides the data needed for the threshold decision in 23-02

---
*Phase: 23-scoring-rebalance*
*Completed: 2026-04-13*
