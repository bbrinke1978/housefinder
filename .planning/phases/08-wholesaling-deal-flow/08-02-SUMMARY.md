---
phase: 08-wholesaling-deal-flow
plan: 02
subsystem: frontend
tags: [nextjs, drizzle, kanban, hello-pangea-dnd, server-actions, zod]

# Dependency graph
requires:
  - phase: 08-wholesaling-deal-flow
    plan: 01
    provides: deals/buyers/dealNotes schema, DealWithBuyer type, DEAL_STATUSES const
provides:
  - deal-queries.ts with getDeals, getDeal, getDealNotes
  - deal-actions.ts with createDeal, updateDealStatus, updateDeal, addDealNote server actions
  - /deals page with kanban (10 columns) and list toggle
  - /deals/new page with seller qualification 4-pillar form + MAO preview
  - DealKanban, DealList, DealCard, NewDealForm client components
  - Stub implementations of deal-overview, deal-mao-calculator, deal-contract-tracker, deal-notes (linter upgraded to full implementations)
affects: [08-03, 08-04, 08-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - deal-queries.ts follows direct .select().from().leftJoin() pattern (no relations API)
    - deal-actions.ts uses "use server" with auth() check + zod/v4 validation on all actions
    - deal-kanban.tsx mirrors lead-kanban.tsx with @hello-pangea/dnd DragDropContext pattern
    - MAO auto-computed in createDeal and updateDeal: ARV * 0.70 - repairEstimate - wholesaleFee
    - force-dynamic export on deals page to prevent build-time DB queries

key-files:
  created:
    - app/src/lib/deal-queries.ts
    - app/src/lib/deal-actions.ts
    - app/src/app/(dashboard)/deals/page.tsx
    - app/src/app/(dashboard)/deals/new/page.tsx
    - app/src/components/deal-kanban.tsx
    - app/src/components/deal-list.tsx
    - app/src/components/deal-card.tsx
    - app/src/components/new-deal-form.tsx
    - app/src/components/deal-overview.tsx
    - app/src/components/deal-mao-calculator.tsx
    - app/src/components/deal-contract-tracker.tsx
    - app/src/components/deal-notes.tsx
  modified:
    - app/src/db/seed-deals.ts (fixed onConflictDoNothing type error)

key-decisions:
  - "getDealNotes added to deal-queries.ts alongside getDeals/getDeal — needed by pre-existing /deals/[id]/page.tsx"
  - "Stub deal-overview/mao-calculator/contract-tracker/deal-notes created to unblock build — linter upgraded to full implementations before plan 08-03"
  - "seed-deals.ts onConflictDoNothing sql target removed — deals table has no unique constraint on address, PK-only conflict prevention is correct"
  - "DealCard hot-seller indicator uses orange dot (not badge) to fit compact 200px kanban columns"

# Metrics
duration: 6min
completed: 2026-03-28
---

# Phase 8 Plan 02: Deal Pipeline Page Summary

**Kanban board (10 columns) + list view + new deal form with seller qualification — full /deals pipeline UI ready**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-28T17:18:56Z
- **Completed:** 2026-03-28T17:24:20Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Created `deal-queries.ts` with `getDeals()`, `getDeal()`, and `getDealNotes()` — all use direct `.select().from().leftJoin()` pattern consistent with existing `queries.ts`
- Created `deal-actions.ts` with `createDeal`, `updateDealStatus`, `updateDeal`, and `addDealNote` server actions — all include `auth()` check, zod/v4 validation, and MAO auto-computation
- Built `/deals` page as server component with kanban/list view toggle via `?view=` URL param, deal count badge, and `+ New Deal` link
- Built `DealKanban` with 10 status columns using `@hello-pangea/dnd`, mirroring `lead-kanban.tsx` pattern — optimistic state updates on drag
- Built `DealList` as responsive table with status color badges
- Built `DealCard` compact kanban card with hot-seller orange dot indicator (heavy/tear_down + asap + financial_distress/inherited/vacant)
- Built `NewDealForm` with seller qualification 4 pillars (condition, timeline, motivation, asking price) and live MAO preview
- Created `/deals/new` server page with `propertyId` prefill support
- Fixed blocking build error: `seed-deals.ts` used `sql` template literal as `onConflictDoNothing` target (type error) — removed invalid target argument
- Created stub components for `/deals/[id]` tabs (overview, MAO calculator, contract tracker, notes) — linter auto-upgraded to full implementations

## Task Commits

1. **Task 1: Deal queries and server actions** — `737c62f`
2. **Task 2: Deal pipeline page with kanban/list views + new deal form** — `748a61b`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing /deals/[id]/page.tsx referenced unbuilt components**
- **Found during:** Task 2 build verification
- **Issue:** `app/src/app/(dashboard)/deals/[id]/page.tsx` imported `deal-overview`, `deal-mao-calculator`, `deal-contract-tracker`, `deal-notes` — all from future plan 08-03
- **Fix:** Created stub client components for each; linter then auto-upgraded stubs to full implementations before commit
- **Files modified:** `deal-overview.tsx`, `deal-mao-calculator.tsx`, `deal-contract-tracker.tsx`, `deal-notes.tsx`
- **Commit:** `748a61b`

**2. [Rule 1 - Bug] seed-deals.ts had type error with onConflictDoNothing sql target**
- **Found during:** Task 2 build verification
- **Issue:** `onConflictDoNothing({ target: sql\`(address)\` })` — `SQL<unknown>` is not assignable to `IndexColumn`; deals table has no unique constraint on address
- **Fix:** Removed target argument entirely; conflict prevention via PK only
- **Files modified:** `app/src/db/seed-deals.ts`
- **Commit:** `748a61b`

**3. [Rule 2 - Missing functionality] getDealNotes not in original plan scope but required by existing code**
- **Found during:** Task 1 — pre-existing `/deals/[id]/page.tsx` called `getDealNotes`
- **Fix:** Added `getDealNotes(dealId: string)` to `deal-queries.ts` alongside `getDeals` and `getDeal`
- **Files modified:** `app/src/lib/deal-queries.ts`
- **Commit:** `737c62f`

## Self-Check

**Files created — verified:**
- `app/src/lib/deal-queries.ts` — exists
- `app/src/lib/deal-actions.ts` — exists
- `app/src/app/(dashboard)/deals/page.tsx` — exists
- `app/src/app/(dashboard)/deals/new/page.tsx` — exists
- `app/src/components/deal-kanban.tsx` — exists
- `app/src/components/deal-list.tsx` — exists
- `app/src/components/deal-card.tsx` — exists
- `app/src/components/new-deal-form.tsx` — exists

**Build:** PASSED (9/9 static pages generated, /deals, /deals/[id], /deals/new all compile)

**Commits:**
- `737c62f` — feat(08-02): deal queries and server actions
- `748a61b` — feat(08-02): deal pipeline page with kanban/list views + new deal form

## Self-Check: PASSED

---
*Phase: 08-wholesaling-deal-flow*
*Completed: 2026-03-28*
