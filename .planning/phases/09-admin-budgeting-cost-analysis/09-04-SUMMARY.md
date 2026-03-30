---
phase: 09-admin-budgeting-cost-analysis
plan: 04
subsystem: ui
tags: [react, nextjs, recharts, csv-export, typescript, budget, visualizations]

# Dependency graph
requires:
  - phase: 09-admin-budgeting-cost-analysis
    plan: 02
    provides: BudgetTab, BudgetSummary type, budget-queries (getBudgetByDealId, getExpenses)
  - phase: 09-admin-budgeting-cost-analysis
    plan: 03
    provides: ReceiptUpload component, receipt-actions, blob-storage

provides:
  - BudgetAlertBanner component with yellow/orange/red threshold logic
  - BudgetCharts component with category progress bars and collapsible Recharts pie/bar charts
  - CSV export for budget summary (type=budget) and expenses (type=expenses) via /api/export
  - ReceiptUpload wired into BudgetTab expense section

affects:
  - app/src/app/(dashboard)/deals/[id]/page.tsx (budget tab already renders BudgetTab)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Alert banner pattern: return null below threshold, conditional severity based on spending vs planned+contingency"
    - "Recharts PieChart + BarChart (layout=vertical) — same proven pattern from Phase 6 analytics charts"
    - "Collapsible charts section via useState toggle — secondary to progress bars per research recommendation"
    - "Export anchor tag <a href=/api/export?type=X&dealId=Y download> — no JS required, same as Phase 6"
    - "Deal address slug for CSV filename: strip special chars, replace spaces with dashes, lowercase"

key-files:
  created:
    - app/src/components/budget-alerts.tsx
    - app/src/components/budget-charts.tsx
  modified:
    - app/src/components/budget-tab.tsx
    - app/src/app/api/export/route.ts

key-decisions:
  - "BudgetAlertBanner returns null below 80% — no DOM overhead when budget is healthy"
  - "Orange alert triggers on totalSpentCents > totalPlannedCents (excl contingency) — consistent with Phase 09-02 contingency warning logic"
  - "Red alert triggers when spending exceeds totalPlannedCents + contingencyCents — true over-budget state"
  - "Pie chart shows only categories with actualCents > 0 — empty categories excluded to avoid clutter"
  - "Bar chart height scales with category count: max(200, count * 40)px — avoids cramped bars"
  - "CSV budget export includes Contingency and TOTAL rows — complete picture for deal accounting"
  - "CSV filename uses deal address slug — meaningful download name vs generic deal-ID"

patterns-established:
  - "Progress bar color: green <80%, yellow 80-99%, red >=100% (actualCents/plannedCents ratio)"
  - "Unplanned spending (plannedCents=0, actualCents>0): red 100% bar labeled 'Unplanned: $X'"

requirements-completed: [BUDGET-04, BUDGET-07, BUDGET-08]

# Metrics
duration: 2min
completed: 2026-03-30
---

# Phase 09 Plan 04: Budget Visualizations and CSV Export Summary

**Category progress bars with green/yellow/red thresholds, collapsible Recharts pie/bar charts, threshold alert banners, and CSV export for budget summary and expenses**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-30T00:50:23Z
- **Completed:** 2026-03-30T00:52:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- BudgetAlertBanner: returns null below 80%, yellow at 80-99% (approaching budget), orange when eating contingency, red when over total budget including contingency
- BudgetCharts: per-category HTML/Tailwind progress bars with green/yellow/red color coding, collapsible section with Recharts PieChart (spending distribution) and horizontal BarChart (planned vs actual)
- BudgetTab updated: alert banner at top, BudgetCharts below category editor, ReceiptUpload wired into expense section, Export CSV anchor tag buttons for both budget summary and expenses
- Export route extended with type=budget (Category/Planned/Actual/Variance/Variance%/Contingency/TOTAL) and type=expenses (Date/Category/Vendor/Description/Amount/Notes)
- TypeScript compiles with zero errors across all files

## Task Commits

1. **Task 1: Progress bars, charts, and alert banners** - `8badcd5` (feat)
2. **Task 2: CSV export for budget** - `6ac873b` (feat)

## Files Created/Modified

- `app/src/components/budget-alerts.tsx` - BudgetAlertBanner with yellow/orange/red threshold logic using AlertTriangle icon
- `app/src/components/budget-charts.tsx` - Category progress bars + collapsible PieChart + vertical BarChart using Recharts
- `app/src/components/budget-tab.tsx` - Integrated BudgetAlertBanner, BudgetCharts, ReceiptUpload, Export CSV buttons
- `app/src/app/api/export/route.ts` - Added budget and expenses CSV export cases with deal address filename slug

## Decisions Made

- BudgetAlertBanner is a simple conditional render — no state, no animation. Severity decided by comparing totalSpentCents to totalPlannedCents and totalPlannedCents+contingencyCents
- Charts collapsible to keep mobile experience clean — progress bars always visible, charts behind a toggle
- Budget CSV includes a dedicated Contingency row and TOTAL row so the exported file is a complete standalone document
- Deal address used in filename (slugified) so downloads have context: budget-summary-123-main-st.csv vs a UUID

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no new external services. Builds on Azure services configured in Phase 09-03.

## Next Phase Readiness

- Phase 09 is now complete (4 of 4 plans)
- Budget visualizations, receipt scanning, and CSV export are all production-ready
- Azure services (Blob Storage, Document Intelligence) still require env var configuration per Phase 09-03 USER-SETUP notes
- Phase 10 (Frontend Design Polish) can proceed

---
*Phase: 09-admin-budgeting-cost-analysis*
*Completed: 2026-03-30*
