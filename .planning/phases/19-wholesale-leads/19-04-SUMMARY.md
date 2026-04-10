---
phase: 19-wholesale-leads
plan: "04"
subsystem: wholesale-leads
tags: [wholesale, deals, navigation, server-actions, badge]
dependency_graph:
  requires: ["19-02", "19-03"]
  provides: ["promoteToDeal", "wholesaler-directory", "wholesale-badge", "wholesale-navigation"]
  affects: ["deals", "wholesale-leads", "sidebar", "command-menu"]
tech_stack:
  added: []
  patterns: ["server-action-no-redirect", "client-tab-toggle", "plain-html-table"]
key_files:
  created:
    - app/src/components/wholesaler-directory.tsx
    - app/src/components/wholesale-tabs.tsx
    - app/drizzle/0011_wholesale_lead_source.sql
  modified:
    - app/src/lib/wholesale-actions.ts
    - app/src/components/wholesale-detail-header.tsx
    - app/src/app/(dashboard)/wholesale/page.tsx
    - app/src/components/command-menu.tsx
    - app/src/components/deal-card.tsx
    - app/src/lib/deal-queries.ts
    - app/src/types/index.ts
    - app/src/db/schema.ts
decisions:
  - "promoteToDeal inserts deal directly (not via createDeal) because createDeal calls redirect() unconditionally -- direct insert reuses same pattern without redirect side-effect"
  - "leadSource column added to deals table (not leads table) -- deals table lacked the column despite plan assuming it existed; migration 0011 adds it"
  - "WholesalerDirectory uses plain HTML table (not shadcn Table) -- @/components/ui/table does not exist in this project"
  - "View Deal link uses styled Link (not Button with asChild) -- @base-ui/react/button does not support asChild prop per Phase 02-01 decision"
  - "WholesaleTabs client component extracts tab state from page.tsx -- server page cannot use useState, tab logic moved to client wrapper"
metrics:
  duration: "4min"
  completed: "2026-04-10"
  tasks_completed: 2
  files_modified: 11
requirements_satisfied:
  - WHOLESALE-07
  - WHOLESALE-09
  - WHOLESALE-12
---

# Phase 19 Plan 04: Wholesale Lifecycle Completion Summary

Promote to Deal action with wholesaler directory, navigation updates, and wholesale badge on deal cards.

## What Was Built

**Task 1: promoteToDeal action, wholesaler directory, page tabs**

- `promoteToDeal` server action in `wholesale-actions.ts`: auth-gated, fetches the wholesale lead, inserts a deal with pre-filled fields (address, city, asking price, ARV, repair estimate, wholesaleFee=15000, seller=wholesaler), sets `leadSource="wholesale"`, updates the lead to `status="promoted"` with `promotedDealId`, auto-logs status notes on both sides, revalidates both paths, returns `{ dealId }`.
- `wholesale-detail-header.tsx` updated: Promote to Deal button calls `promoteToDeal` via `useTransition`, redirects to `/deals/[dealId]` on success with loading state. When already promoted and `promotedDealId` exists, shows styled "View Deal" link instead. Button hidden when status is "pass" or "promoted".
- `wholesaler-directory.tsx`: Plain HTML table showing Name (link to filtered /wholesale?wholesaler=id), Company, Email, Phone, Deals Sent, Deals Promoted (with conversion rate %), Avg Spread, Status badge. Sorted by totalSent descending. Empty state message when no wholesalers.
- `wholesale-tabs.tsx`: Client wrapper with Leads/Wholesalers tab buttons (pill-style toggle). Leads tab shows existing WholesaleLeadGrid; Wholesalers tab shows WholesalerDirectory.
- `wholesale/page.tsx` updated to fetch `getWholesalersWithStats()` in parallel and pass to WholesaleTabs.
- `deals` schema: added `leadSource text` column. Migration 0011 created.
- `DealWithBuyer` type and `getDeals`/`getDeal` queries updated to include `leadSource`.

**Task 2: Navigation and deal card badge**

- `command-menu.tsx`: Wholesale entry added (Store icon, description "Triage wholesale deals") after Buyers, before Analytics.
- `deal-card.tsx`: Amber "Wholesale" badge with Store icon shown when `deal.leadSource === "wholesale"`. Badge uses `bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400`. Placed alongside the hot-seller indicator in the card header.
- `app-sidebar.tsx`: Already had Wholesale nav item from Plan 02 — no change required.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] promoteToDeal cannot call createDeal — redirect() side effect**
- **Found during:** Task 1
- **Issue:** `createDeal` calls `redirect(/deals/${id})` unconditionally at the end. Calling it from `promoteToDeal` would trigger the redirect before `promoteToDeal` could capture the deal ID and update the wholesale lead.
- **Fix:** `promoteToDeal` inserts the deal directly using the same DB pattern as `createDeal`, without the redirect. Returns `{ dealId }` to the client which handles the redirect via `router.push`. Same deal creation logic, no duplication of business rules.
- **Files modified:** `app/src/lib/wholesale-actions.ts`
- **Commit:** 396dd09

**2. [Rule 2 - Missing column] deals.leadSource column absent from schema**
- **Found during:** Task 1
- **Issue:** Plan assumed `deals.leadSource` existed, but the `deals` table had no such column (the `leadSource` on line 124 of schema.ts is on the `leads` table, not `deals`).
- **Fix:** Added `leadSource text("lead_source")` to the deals table schema, created migration `0011_wholesale_lead_source.sql`, added `leadSource` to `DealWithBuyer` type and both deal queries.
- **Files modified:** `app/src/db/schema.ts`, `app/drizzle/0011_wholesale_lead_source.sql`, `app/src/types/index.ts`, `app/src/lib/deal-queries.ts`
- **Commit:** 396dd09

**3. [Rule 3 - Missing component] @/components/ui/table does not exist**
- **Found during:** Task 1 (TypeScript error)
- **Issue:** `wholesaler-directory.tsx` initially imported from `@/components/ui/table` which doesn't exist in this project.
- **Fix:** Rewrote directory using plain HTML `<table>` with Tailwind classes. Consistent with project's pattern of using native HTML when shadcn components aren't installed.
- **Files modified:** `app/src/components/wholesaler-directory.tsx`
- **Commit:** 396dd09

**4. [Rule 3 - API mismatch] Button asChild prop not supported**
- **Found during:** Task 1 (TypeScript error)
- **Issue:** `@base-ui/react/button` does not support `asChild` prop per Phase 02-01 project decision. The "View Deal" button initially used `asChild`.
- **Fix:** Replaced Button+asChild with a styled `<Link>` using equivalent button-outline Tailwind classes.
- **Files modified:** `app/src/components/wholesale-detail-header.tsx`
- **Commit:** 396dd09

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| wholesaler-directory.tsx created | FOUND |
| wholesale-tabs.tsx created | FOUND |
| migration 0011 created | FOUND |
| commit 396dd09 (Task 1) | FOUND |
| commit 30c6382 (Task 2) | FOUND |
