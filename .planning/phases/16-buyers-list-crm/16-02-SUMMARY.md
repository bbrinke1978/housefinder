---
phase: 16-buyers-list-crm
plan: "02"
subsystem: buyer-crm-ui
tags: [buyer-crm, ui, table, csv, navigation, next-js, base-ui]
dependency_graph:
  requires:
    - phase: 16-01
      provides: getBuyersForList, getAllBuyerTags, getBuyersForExport, importBuyers, BuyerWithTags type
  provides:
    - /buyers page (server component with URL filter state)
    - BuyersListTable client component (search, filters, add/import dialogs)
    - BuyerCsvImport component (file upload, column mapping, preview, import)
    - /api/buyers/export GET route (buyers-YYYY-MM-DD.csv)
    - Updated sidebar, bottom-nav, command-menu to /buyers
  affects:
    - app/src/components/app-sidebar.tsx
    - app/src/components/bottom-nav.tsx
    - app/src/components/command-menu.tsx
tech_stack:
  added: []
  patterns:
    - URL searchParams for filter state (mirrors dashboard pattern)
    - "@base-ui/react/dialog for Add Buyer and Import CSV modals"
    - "FileReader + parseCsvLine for CSV parsing (no library)"
    - "useTransition for importBuyers direct call (not FormData)"
    - "buildCsv with JSON.stringify per cell (mirrors Phase 06-04 pattern)"
    - "anchor tag download for CSV export (no JS required)"
key_files:
  created:
    - app/src/app/(dashboard)/buyers/page.tsx
    - app/src/components/buyers-list-table.tsx
    - app/src/components/buyer-csv-import.tsx
    - app/src/app/api/buyers/export/route.ts
  modified:
    - app/src/components/app-sidebar.tsx
    - app/src/components/bottom-nav.tsx
    - app/src/components/command-menu.tsx
key_decisions:
  - "BuyerCsvImport uses custom parseCsvLine (no library) — handles quoted fields, small data set"
  - "Dual filter: server-side URL params for tag/status/area/funding + client-side search for name/email/phone"
  - "Bottom-nav Campaigns replaced by Buyers — buyers is first-class CRM; campaigns accessible from sidebar"
  - "Active detection simplified in sidebar + bottom-nav — removed /deals/buyers exclusion since /buyers is its own route"
  - "/api/buyers/export is a dedicated route (not a type= param on shared /api/export) — cleaner URL for anchor download"
requirements-completed:
  - BUYER-02
  - BUYER-09
  - BUYER-10
  - BUYER-12
duration: 3min
completed: 2026-04-08
---

# Phase 16 Plan 02: Buyers List Page Summary

**First-class /buyers CRM page with searchable/filterable table, CSV column-mapping import, one-click CSV export, and updated sidebar/bottom-nav/command-menu navigation.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-08T01:58:13Z
- **Completed:** 2026-04-08T02:01:13Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `/buyers` server page fetches buyers + all tags in parallel, reads URL searchParams for 5 filter dimensions (search, tag, status, targetArea, fundingType)
- BuyersListTable renders table with name links to /buyers/[id], tel:/mailto: contact links, buy box, tag badges, status badge (emerald Active / gray Inactive), last contact date, overdue follow-up highlighting in red
- BuyerCsvImport: file upload, automatic column auto-mapping (case-insensitive), preview table of first 5 rows, import via useTransition, results with expandable error list
- /api/buyers/export dedicated route returning buyers-YYYY-MM-DD.csv with auth check
- App sidebar: Buyers href updated from /deals/buyers to /buyers; active detection logic simplified
- Mobile bottom-nav: Buyers (Users icon) replaces Campaigns; 5 slots now Dashboard/Deals/Buyers/Analytics/Map
- Command menu: Buyers added at /buyers with "Buyer CRM & contact list" description

## Task Commits

1. **Task 1: /buyers list page with searchable table** - `5025b1d` (feat)
2. **Task 2: CSV import/export and navigation updates** - `3d5104d` (feat)

## Files Created/Modified

- `app/src/app/(dashboard)/buyers/page.tsx` — Server component, parallel fetch, URL filter reading, 61 lines
- `app/src/components/buyers-list-table.tsx` — Client table with dialogs, filters, inline search, 436 lines
- `app/src/components/buyer-csv-import.tsx` — CSV upload, column mapping, preview, import, 290 lines
- `app/src/app/api/buyers/export/route.ts` — Dedicated GET export handler, 43 lines
- `app/src/components/app-sidebar.tsx` — Buyers href /buyers, simplified active detection
- `app/src/components/bottom-nav.tsx` — Buyers replaces Campaigns, Users icon
- `app/src/components/command-menu.tsx` — Buyers entry added

## Decisions Made

- **No CSV library** — custom parseCsvLine handles quoted fields; small data avoids a dependency
- **Dual filter approach** — server handles tag/status/area/fundingType via URL params (bookmarkable), client-side filters name/email/phone on fetched array to avoid round-trips
- **Campaigns out of bottom nav** — Buyers is now a daily-use first-class CRM feature; campaigns is advanced workflow
- **Simplified active detection** — removed old `/deals/buyers` exclusion hack from sidebar and bottom-nav

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Two minor TypeScript errors fixed inline during development:
1. Missing `Users` icon in lucide-react import — added to buyers-list-table.tsx
2. Type assertion needed `as unknown as ImportRow` for CSV mapping object — buyer-csv-import.tsx

Both fixed before commit. Zero errors in final TypeScript check.

## Self-Check

### Files Exist
- `app/src/app/(dashboard)/buyers/page.tsx` — FOUND
- `app/src/components/buyers-list-table.tsx` — FOUND
- `app/src/components/buyer-csv-import.tsx` — FOUND
- `app/src/app/api/buyers/export/route.ts` — FOUND
- `app/src/components/app-sidebar.tsx` (modified) — FOUND
- `app/src/components/bottom-nav.tsx` (modified) — FOUND
- `app/src/components/command-menu.tsx` (modified) — FOUND

### Commits Exist
- `5025b1d` — feat(16-02): /buyers list page with searchable filterable table — FOUND
- `3d5104d` — feat(16-02): CSV import/export and navigation updates for buyers CRM — FOUND

### TypeScript
- `npx tsc --noEmit` — PASSED (zero errors)

### Min Lines Met
- buyers/page.tsx: 61 lines (min 30) — PASSED
- buyers-list-table.tsx: 436 lines (min 80) — PASSED
- buyer-csv-import.tsx: 290 lines (min 60) — PASSED

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- /buyers list page complete; ready for 16-03 (buyer detail page at /buyers/[id])
- Navigation fully updated across sidebar, bottom-nav, and command-menu
- Import/export working end-to-end

## Self-Check: PASSED
