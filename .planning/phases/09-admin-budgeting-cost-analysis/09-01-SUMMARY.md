---
phase: 09-admin-budgeting-cost-analysis
plan: 01
subsystem: database
tags: [drizzle, postgres, budgeting, schema, server-actions, typescript]

# Dependency graph
requires:
  - phase: 08-wholesaling-deal-flow
    provides: deals table with repairEstimate and id FK used by budgets.dealId

provides:
  - budgets, budget_categories, receipts, expenses PostgreSQL tables with FKs and indexes
  - BudgetSummary, BudgetCategory, ExpenseLine, BudgetHealth TypeScript types
  - DEFAULT_BUDGET_CATEGORIES constant (19 items)
  - getBudgetByDealId query with category-level actual spending via LEFT JOIN SUM
  - getExpenses query with categoryName JOIN
  - getReceipts query
  - createBudget, updateCategoryPlanned, addExpense, deleteExpense, updateBudgetNotes server actions

affects:
  - 09-02 (budget UI components will consume these queries and actions)
  - any future deal detail page that renders budget tabs

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server actions with "use server" + auth() guard + revalidatePath (consistent with deal-actions.ts)
    - Drizzle LEFT JOIN with sql<number>`COALESCE(SUM(...), 0)` for aggregated actuals without denormalized columns
    - Contingency computed on write (createBudget, updateCategoryPlanned) not on read

key-files:
  created:
    - app/src/lib/budget-queries.ts
    - app/src/lib/budget-actions.ts
  modified:
    - app/src/db/schema.ts
    - app/src/types/index.ts

key-decisions:
  - "ExpenseLine interface in types/index.ts (not ExpenseRow) — avoids collision with schema.ts InferSelectModel ExpenseRow export"
  - "createBudget seeds 19 DEFAULT_BUDGET_CATEGORIES with sortOrder=index, plannedCents=0"
  - "contingencyCents auto-calculated as Math.round(totalPlannedCents * 0.10) on createBudget and updateCategoryPlanned"
  - "totalPlannedCents auto-populated from deal.repairEstimate on createBudget (0 if null)"
  - "actualCents computed via COALESCE(SUM(expenses.amount_cents), 0) on read — no denormalized column"

patterns-established:
  - "Budget server actions: auth guard + db operation + revalidatePath('/deals/{dealId}')"
  - "Category actuals: LEFT JOIN expenses + GROUP BY category fields + COALESCE SUM"

requirements-completed: [BUDGET-01, BUDGET-06]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 09 Plan 01: Schema, Types, Queries, and Server Actions Summary

**4 new Drizzle tables (budgets, budget_categories, receipts, expenses) with TypeScript types, query functions, and server actions for rehab budget CRUD with auto-seeded categories and 10% contingency**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T04:41:06Z
- **Completed:** 2026-03-26T04:43:06Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added 4 new tables to schema.ts with correct FKs, indexes, and InferSelectModel exports
- Created budget-queries.ts with getBudgetByDealId (computes category actuals via LEFT JOIN SUM), getExpenses (with categoryName JOIN), and getReceipts
- Created budget-actions.ts with createBudget (seeds 19 categories, auto-populates from repairEstimate, 10% contingency), updateCategoryPlanned, addExpense, deleteExpense, updateBudgetNotes
- All TypeScript compiles clean

## Task Commits

1. **Task 1: Schema tables and types** - `a781322` (feat)
2. **Task 2: Budget queries and server actions** - `203d352` (feat)

## Files Created/Modified

- `app/src/db/schema.ts` - Added budgets, budget_categories, receipts, expenses tables + InferSelectModel type exports
- `app/src/types/index.ts` - Added DEFAULT_BUDGET_CATEGORIES, BudgetCategory, BudgetSummary, ExpenseLine, BudgetHealth
- `app/src/lib/budget-queries.ts` - Query functions: getBudgetByDealId, getExpenses, getReceipts
- `app/src/lib/budget-actions.ts` - Server actions: createBudget, updateCategoryPlanned, addExpense, deleteExpense, updateBudgetNotes

## Decisions Made

- Used `ExpenseLine` (not `ExpenseRow`) in types/index.ts to avoid collision with `ExpenseRow` already exported from schema.ts as `InferSelectModel<typeof expenses>`. The `ExpenseLine` type is the enriched version with `categoryName` from JOIN.
- Contingency computed on write (create + category update), not recomputed on every read query — keeps read path simple.
- `totalPlannedCents` on the budget row is kept in sync with SUM of category `plannedCents` via `updateCategoryPlanned` — no extra "budget total" field divergence.

## Deviations from Plan

None - plan executed exactly as written, with the minor naming deviation (ExpenseLine vs ExpenseRow) documented above to avoid type collision.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. DB migration will be run via drizzle-kit on next deployment.

## Next Phase Readiness

- Data layer is complete and TypeScript-verified
- Plan 09-02 can build budget UI components directly against getBudgetByDealId, addExpense, createBudget
- DB migration file needs to be generated and applied via drizzle-kit before any runtime use

---
*Phase: 09-admin-budgeting-cost-analysis*
*Completed: 2026-03-26*

## Self-Check: PASSED

- FOUND: app/src/db/schema.ts
- FOUND: app/src/types/index.ts
- FOUND: app/src/lib/budget-queries.ts
- FOUND: app/src/lib/budget-actions.ts
- FOUND commit: a781322 (Task 1)
- FOUND commit: 203d352 (Task 2)
