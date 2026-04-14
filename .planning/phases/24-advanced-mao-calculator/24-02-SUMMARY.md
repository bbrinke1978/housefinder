---
phase: 24-advanced-mao-calculator
plan: 02
subsystem: ui
tags: [react, calculator, wholesaler, mao, typescript]

# Dependency graph
requires:
  - phase: 24-01
    provides: deal-mao-calculator.tsx with convergeMao engine, activeView state placeholder, and all primary inputs
provides:
  - View toggle (Buyer/Flipper vs Wholesaler) in MAO calculator
  - Wholesaler panel: max purchase from seller, assignment fee spread, end buyer out-of-pocket, wholesaler ROI
  - Conditional rendering of buyer vs wholesaler rows without input state loss
affects:
  - deal detail Analysis tab UI

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Derived constants pattern: wholesaler math computed entirely from maoBest — no new state needed
    - Shared state across views: assignmentFee and minProfit inputs in wholesaler view update same state as buyer view

key-files:
  created: []
  modified:
    - app/src/components/deal-mao-calculator.tsx

key-decisions:
  - "Wholesaler math is fully derived from maoBest — no additional useState required beyond assignmentFee already in state"
  - "assignmentFee and minProfit inputs appear in both buyer and wholesaler views sharing the same state — changing in one view persists to the other"
  - "Utah assignment closing costs displayed as informational note (WSALE-02), not a separate input"

patterns-established:
  - "View toggle with conditional rendering: wrap each view's grid in {activeView === 'X' && (...)}"
  - "Wholesaler ROI color-coded: green >= 15%, yellow >= 8%, red below"

requirements-completed: [WSALE-01, WSALE-02, WSALE-03, WSALE-04, WSALE-05]

# Metrics
duration: 5min
completed: 2026-04-12
---

# Phase 24 Plan 02: Advanced MAO Calculator — Wholesaler View Summary

**Wholesaler perspective panel with view toggle added to MAO calculator: max purchase from seller, assignment fee spread, end buyer out-of-pocket, and wholesaler ROI — all derived from converged maoBest without additional state**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-12T00:00:00Z
- **Completed:** 2026-04-12T00:05:00Z
- **Tasks:** 1 of 2 executed (Task 2 is a human-verify checkpoint — awaiting sign-off)
- **Files modified:** 1

## Accomplishments
- Wired `activeView` state setter (was a read-only placeholder in Plan 01)
- Added Buyer/Flipper and Wholesaler toggle buttons at the top of the calculator
- Derived `maxPurchaseFromSeller`, `endBuyerOutOfPocket`, `wholesalerSpread`, `wholesalerRoi` from `maoBest` with no new state
- Conditionally rendered buyer/flipper HML row only in buyer view
- Added wholesaler panel (inputs: assignment fee + min profit; results: end buyer MAO, max pay to seller, spread, ROI, total out-of-pocket)
- TypeScript compiles clean (0 errors)

## Task Commits

1. **Task 1: Add view toggle and wholesaler panel** - `80b2ea7` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified
- `app/src/components/deal-mao-calculator.tsx` - Added view toggle buttons, wholesaler derived constants, and conditional wholesaler panel

## Decisions Made
- Wholesaler math is entirely derived — no new useState calls needed (maoBest and assignmentFee already in state from Plan 01)
- Shared state for assignmentFee and minProfit across views ensures consistency without duplication
- Utah closing costs shown as explanatory note only (not input), per WSALE-02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 2 (human-verify checkpoint) is pending visual sign-off from Brian
- All 16 requirements (MAO-01 through WSALE-05) are implemented; human confirmation completes Phase 24
- Phase 24 Plan 03 (if any) can proceed after checkpoint approval

---
*Phase: 24-advanced-mao-calculator*
*Completed: 2026-04-12*

## Self-Check: PASSED
- `app/src/components/deal-mao-calculator.tsx` exists and was modified
- Commit `80b2ea7` confirmed in git log
- TypeScript: 0 errors
