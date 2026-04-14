---
phase: 24-advanced-mao-calculator
plan: "01"
subsystem: ui
tags: [react, typescript, mao, deal-math, hard-money, flipper]

requires:
  - phase: 08-wholesaling-deal-flow
    provides: DealWithBuyer type, deal-mao-calculator component scaffold, updateDeal action

provides:
  - Sell-side cost section with configurable buyer agent %, selling agent %, closing/title %
  - HML section with rate, points, LTV, hold months, monthly carry inputs
  - convergeMao() iterative loop (max 20 iterations) for loan-amount convergence
  - Buyer/flipper MAO range display (at min profit / at max profit)
  - MAO % of ARV badge and offer-vs-MAO status indicator

affects: [24-advanced-mao-calculator]

tech-stack:
  added: []
  patterns:
    - "convergeMao() defined inside component body to close over state without prop threading"
    - "Iterative convergence loop (for i < 20, Math.abs(delta) < 1) for self-referential loan math"
    - "pctInput() helper mirrors numInput() but with % suffix and step=0.1"

key-files:
  created: []
  modified:
    - app/src/components/deal-mao-calculator.tsx

key-decisions:
  - "convergeMao() is a component-scoped function (not a module-level helper) so it closes over all 13 state variables without parameter threading"
  - "activeView state stubbed for Plan 02 wholesaler panel — render unconditionally shows buyer view only"
  - "wholesaleFee field kept in handleSave fd.set for DB compatibility, mapped to assignmentFee value"

patterns-established:
  - "Iterative MAO convergence: start with maoNoHml - targetProfit, loop max 20 times with delta<1 stop condition"
  - "Two convergeMao calls (minProfit, maxProfit) produce the MAO range displayed to user"

requirements-completed:
  - MAO-01
  - MAO-02
  - MAO-03
  - HML-01
  - HML-02
  - HML-03
  - HML-04
  - FLIP-01
  - FLIP-02
  - FLIP-03
  - FLIP-04

duration: 4min
completed: 2026-04-14
---

# Phase 24 Plan 01: Advanced MAO Calculator Summary

**Iterative HML-aware MAO calculator with sell-side cost breakdown, hard money loan convergence, and buyer/flipper profit-target range replacing the simple ARV x 0.65 formula**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-14T00:48:01Z
- **Completed:** 2026-04-14T00:52:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Replaced single-formula MAO (ARV x 0.65 - repairs) with a full deal math engine covering sell-side costs, HML carry, and iterative loan convergence
- Implemented `convergeMao(targetProfit)` — a 20-iteration loop that converges loan amount on MAO x LTV, resolving the circular dependency between offer price and HML proceeds
- Added 4-card layout: Primary Inputs, Sell-Side Costs, Hard Money Loan, Buyer/Flipper View — all wired to controlled React state with no stale values

## Task Commits

1. **Task 1 + Task 2: Math engine, state structure, and full JSX render** - `f0ab4fc` (feat)

**Plan metadata:** (created next)

## Files Created/Modified

- `app/src/components/deal-mao-calculator.tsx` - Fully rewritten: sell-side section, HML section, convergeMao() iterative loop, buyer/flipper MAO range display (421 lines)

## Decisions Made

- `convergeMao()` defined inside the component body to close over all 13 state variables — avoids threading params through every function call
- `activeView` state wired but buyer view renders unconditionally; wholesaler panel deferred to Plan 02
- `wholesaleFee` key kept in `handleSave` FormData (mapped to `assignmentFee` value) to avoid breaking the DB action contract

## Deviations from Plan

None - plan executed exactly as written. Both tasks combined into a single commit since they constitute one complete file rewrite.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02 can wire the wholesaler view using the `activeView` state already declared
- `convergeMao()` accepts any target profit — wholesaler markup can be modeled by adjusting the profit targets
- TypeScript compiles clean; component prop interface unchanged (`{ deal: DealWithBuyer }`)

---
*Phase: 24-advanced-mao-calculator*
*Completed: 2026-04-14*
