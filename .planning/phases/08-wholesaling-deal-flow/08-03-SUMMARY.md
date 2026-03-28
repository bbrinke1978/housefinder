---
phase: 08-wholesaling-deal-flow
plan: 03
subsystem: frontend
tags: [next.js, react, server-actions, date-fns, mao-calculator, wholesaling]

# Dependency graph
requires:
  - phase: 08-01
    provides: deals/buyers/dealNotes schema, DealWithBuyer/DealNote types, DEAL_STATUSES/CONTRACT_STATUSES/CONDITION_OPTIONS/TIMELINE_OPTIONS/MOTIVATION_OPTIONS consts
  - phase: 08-02
    provides: deal-queries.ts (getDeal, getDeals), deal-actions.ts (createDeal, updateDeal, updateDealStatus)
provides:
  - deals/[id]/page.tsx: tabbed deal detail page (Overview, Calculator, Contract, Notes)
  - deal-overview.tsx: seller qualification 4-pillar display with hot seller indicator, inline edit mode
  - deal-mao-calculator.tsx: MAO calculator with sensitivity analysis, end buyer analysis, deal score badge
  - deal-contract-tracker.tsx: 5-step contract stepper with earnest money, inspection countdown, closing countdown
  - deal-notes.tsx: deal notes timeline with optimistic updates and status_change display
  - getDealNotes query added to deal-queries.ts
  - addDealNote server action added to deal-actions.ts
affects: [08-04, 08-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - MAO formula: ARV * 0.70 - repairs - wholesaleFee (client-side pure computation, no DB roundtrip)
    - Sensitivity analysis: 3 rows (ARV-10%, repairs+20%, both worse) computed reactively
    - Inline edit mode: useState toggle pattern, FormData passed to server action
    - Optimistic notes: useOptimistic + useTransition mirrors lead-notes.tsx pattern
    - date-fns v4: differenceInDays for countdown, addDays for defaults, format for display

key-files:
  created:
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/src/components/deal-overview.tsx
    - app/src/components/deal-mao-calculator.tsx
    - app/src/components/deal-contract-tracker.tsx
    - app/src/components/deal-notes.tsx
  modified:
    - app/src/lib/deal-queries.ts (added getDealNotes)
    - app/src/lib/deal-actions.ts (added addDealNote)

key-decisions:
  - "updateDeal called from client components via FormData — consistent with existing updateDeal(dealId, data: FormData) signature in deal-actions.ts"
  - "Contract stepper: clicking any step sets contractStatus directly (not sequential enforcement) — wholesaler may need to jump steps"
  - "Inspection/closing date pickers call updateDeal immediately on change (no explicit Save button) — immediate feedback UX"
  - "MAO calculator Save button persists arv/repairEstimate/wholesaleFee/offerPrice/assignmentFee — server action auto-recomputes mao"
  - "Hot seller indicator: heavy or tear_down + asap + financial_distress/inherited/vacant — matches context.md hot seller definition"

# Metrics
duration: 7min
completed: 2026-03-28
---

# Phase 8 Plan 03: Deal Detail Page Summary

**Tabbed deal detail page with MAO calculator (ARV*0.70 formula + sensitivity analysis), contract status stepper, seller qualification pillars, and notes timeline**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-28T17:19:18Z
- **Completed:** 2026-03-28T17:26:31Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Built `/deals/[id]` as a 4-tab server component page (Overview, Calculator, Contract, Notes) mirroring the properties/[id] pattern
- Deal overview displays 4 seller qualification pillars (condition, timeline, motivation, price) with color-coded badges and a prominent HOT SELLER indicator (heavy/tear_down + asap + financial_distress/inherited/vacant)
- MAO calculator: ARV × 0.70 − repairs − wholesale fee with real-time sensitivity analysis for 3 adverse scenarios, end buyer all-in/profit/ROI metrics, and a deal score badge (Great/Good/Tight/Bad)
- Contract tracker: horizontal 5-step stepper (Sent → Signed → In Escrow → Title Clear → Closing Scheduled) with earnest money inline edit, inspection deadline countdown (green/yellow/red coloring), and closing date countdown
- Deal notes: reverse-chronological timeline with optimistic updates for user notes and differentiated display for status_change entries
- Added `getDealNotes` to deal-queries.ts and `addDealNote` to deal-actions.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Deal detail page with overview + notes tabs** - `1c5bcb1` (feat)
2. **Task 2: MAO calculator + contract tracker tabs** - `75cb549` (feat)

## Files Created/Modified

- `app/src/app/(dashboard)/deals/[id]/page.tsx` - Tabbed detail page: getDeal + getDealNotes, 4 TabsContent components, status badge, back link
- `app/src/components/deal-overview.tsx` - Seller qualification 4-pillar grid, hot seller indicator, financial summary, inline edit toggle with FormData submit
- `app/src/components/deal-mao-calculator.tsx` - Controlled inputs, MAO = ARV*0.70-repairs-fee, sensitivity table, end buyer analysis, deal score badge, save to DB
- `app/src/components/deal-contract-tracker.tsx` - 5-step stepper, earnest money card, inspection countdown, closing date countdown
- `app/src/components/deal-notes.tsx` - Mirrors lead-notes.tsx, useOptimistic notes, status_change vs user note differentiated display
- `app/src/lib/deal-queries.ts` - Added getDealNotes (SELECT from deal_notes WHERE dealId ORDER BY createdAt DESC)
- `app/src/lib/deal-actions.ts` - Added addDealNote (INSERT user note, revalidatePath)

## Decisions Made

- `updateDeal` is called from client components via FormData matching the existing `updateDeal(dealId, data: FormData)` signature — no new action signature needed
- Contract stepper allows clicking any step directly (not sequential enforcement) — wholesalers sometimes need to jump steps or backtrack
- Inspection/closing date pickers call `updateDeal` immediately on `onChange` — avoids needing an extra Save button for simple date fields
- MAO calculator has a dedicated Save button since changing multiple fields before saving makes more sense for the analysis workflow
- Hot seller indicator criteria: (heavy OR tear_down) AND timeline=asap AND (financial_distress OR inherited OR vacant)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification

- Build succeeded: `/deals/[id]` compiled at 9.62 kB, 150 kB First Load JS
- MAO formula verified: $400k ARV, $45k repairs, $15k fee = $400k * 0.70 - $45k - $15k = $280k - $45k - $15k = $220k
- Sensitivity table rows verified: ARV -10% uses arv*0.9*0.70, repairs +20% uses repairs*1.2, both worse uses both adjustments
- Contract tracker shows 5-step progression (Sent/Signed/In Escrow/Title Clear/Closing Scheduled)

## Self-Check: PASSED

- `app/src/app/(dashboard)/deals/[id]/page.tsx` - FOUND
- `app/src/components/deal-overview.tsx` - FOUND
- `app/src/components/deal-mao-calculator.tsx` - FOUND
- `app/src/components/deal-contract-tracker.tsx` - FOUND
- `app/src/components/deal-notes.tsx` - FOUND
- Commit `1c5bcb1` - FOUND
- Commit `75cb549` - FOUND

---
*Phase: 08-wholesaling-deal-flow*
*Completed: 2026-03-28*
