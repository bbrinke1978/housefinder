---
phase: 15-blueprints-floor-plans
plan: 04
subsystem: ui
tags: [floor-plans, share-link, contractor-view, start-deal, sqft-metrics, mao-calculator]

dependency_graph:
  requires:
    - phase: 15-blueprints-floor-plans plan 01
      provides: floor_plans table, floorPlanPins table, shareToken/shareExpiresAt columns, generateShareLink/revokeShareLink server actions
    - phase: 15-blueprints-floor-plans plan 02
      provides: FloorPlanViewer (readOnly prop), floor-plan-queries getFloorPlanByShareToken
    - phase: 15-blueprints-floor-plans plan 03
      provides: FloorPlanSketch (readOnly prop), FloorPlanTab, deal.sqft field on DealWithBuyer
  provides:
    - Public /floor-plans/[token] page for contractor read-only view
    - FloorPlanShareView read-only client component with pin list + legend
    - ShareLinkPanel in FloorPlanTab: generate/copy/revoke with expiry display
    - Middleware exclusion for /floor-plans/* (no auth required)
    - createDeal carries over floor plans + pins from property to deal
    - DealMaoCalculator shows Price/sqft, Rehab/sqft, ARV/sqft when sqft > 0
  affects: [floor-plan-tab, deal-actions, deal-mao-calculator, middleware]

tech-stack:
  added: []
  patterns:
    - Public Next.js server page following sign/[token] pattern (no auth, validate token, render or error)
    - ShareLinkPanel inline state management with generate/copy/revoke flow
    - Best-effort floor plan carry-over in createDeal matching photo carry-over pattern
    - Per-sqft metrics derived at render time from deal.sqft (no DB query)

key-files:
  created:
    - app/src/app/floor-plans/[token]/page.tsx
    - app/src/components/floor-plan-share-view.tsx
  modified:
    - app/src/middleware.ts
    - app/src/components/floor-plan-tab.tsx
    - app/src/lib/deal-actions.ts
    - app/src/components/deal-mao-calculator.tsx

key-decisions:
  - "ShareLinkPanel manages its own generate/copy/revoke state inline — no prop-drilling needed since it only appears below the active plan"
  - "floor-plans added to middleware exclusion before sign and api/auth (pattern from sign/[token])"
  - "budgetCategoryId set to null on carried pins — deal budget differs from property budget, soft link would be stale"
  - "Per-sqft metrics computed at render time from deal.sqft (already on DealWithBuyer type) — no additional props needed on DealMaoCalculator"
  - "FloorPlanShareView passes dealId='' to viewers in read-only mode — dealId is unused when readOnly=true"

requirements-completed: [FLOOR-08, FLOOR-09, FLOOR-10]

duration: 3min
completed: 2026-04-06
---

# Phase 15 Plan 04: Contractor Share Links and Deal Integration Summary

**Public contractor share pages, share link generation/revoke UI, floor plan carry-over on Start Deal, and price/sqft + rehab/sqft + ARV/sqft metrics in MAO calculator**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-06T04:11:00Z
- **Completed:** 2026-04-06T04:14:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Built public `/floor-plans/[token]` page (server component, no auth): validates share token expiry, renders FloorPlanShareView or expired error page
- Created FloorPlanShareView client component: read-only FloorPlanViewer or FloorPlanSketch, numbered annotation list with category colors, category legend
- Updated middleware to exclude `/floor-plans/*` from auth requirement (matching existing sign/* pattern)
- Added ShareLinkPanel to FloorPlanTab: shows "Share with Contractor" button; clicking opens inline panel with generate/copy URL/revoke/expiry display
- Updated createDeal to carry over floor plans + pins from property to deal (best-effort try/catch): copies all plans, pins, clears shareToken/budgetCategoryId, sums sqft and sets deal.sqft
- Added per-sqft row in DealMaoCalculator Results card: Price/sqft, Rehab/sqft, ARV/sqft — only displayed when deal.sqft > 0

## Task Commits

1. **Task 1: Public contractor share page and share link UI** - `6ba3663` (feat)
2. **Task 2: Start Deal carry-over, sqft deal metrics, and final wiring** - `03f86dc` (feat)

## Files Created/Modified

- `app/src/app/floor-plans/[token]/page.tsx` - Public server page, token validation, expired error state, FloorPlanShareView render
- `app/src/components/floor-plan-share-view.tsx` - Read-only viewer with pin list and category legend
- `app/src/middleware.ts` - Added floor-plans to auth exclusion matcher
- `app/src/components/floor-plan-tab.tsx` - ShareLinkPanel component + wired below active plan viewer
- `app/src/lib/deal-actions.ts` - Floor plan carry-over in createDeal (floorPlans + floorPlanPins)
- `app/src/components/deal-mao-calculator.tsx` - Per-sqft metrics row using deal.sqft

## Decisions Made

- ShareLinkPanel manages its own generate/copy/revoke state inline — no prop-drilling to parent FloorPlanTab
- `budgetCategoryId` set to null on carried pins — the deal's budget categories have different IDs from the property's; soft link would reference missing categories
- Per-sqft metrics derived at render time from `deal.sqft` (already on `DealWithBuyer`). `DealMaoCalculator` signature unchanged — reads `deal.sqft` directly from the existing `deal` prop
- `FloorPlanShareView` passes `dealId=""` to viewers — the `dealId` prop is only used for pin creation/delete operations which are disabled in `readOnly` mode

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `app/src/app/floor-plans/[token]/page.tsx` — created
- [x] `app/src/components/floor-plan-share-view.tsx` — created
- [x] `app/src/middleware.ts` — updated with floor-plans exclusion
- [x] `app/src/components/floor-plan-tab.tsx` — ShareLinkPanel added
- [x] `app/src/lib/deal-actions.ts` — floor plan carry-over added
- [x] `app/src/components/deal-mao-calculator.tsx` — per-sqft metrics added
- [x] Build passes with zero errors (verified twice)
- [x] Commits `6ba3663` and `03f86dc` exist

## Self-Check: PASSED

---
*Phase: 15-blueprints-floor-plans*
*Completed: 2026-04-06*
