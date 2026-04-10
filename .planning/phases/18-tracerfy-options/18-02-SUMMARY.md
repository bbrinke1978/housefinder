---
phase: 18-tracerfy-options
plan: 02
subsystem: ui
tags: [tracerfy, skip-trace, ui-components, base-ui, drizzle]

# Dependency graph
requires:
  - phase: 18-tracerfy-options
    plan: 01
    provides: runSkipTrace, runBulkSkipTrace, getTracerfyStatus, getTracerfyConfig server actions
  - phase: 12-email-call-campaigns
    provides: BulkEnroll pattern for bottom action bar
provides:
  - SkipTraceConfirmDialog component (shared, @base-ui/react Dialog)
  - SkipTraceButton component (single-property trigger on ContactTab)
  - BulkSkipTrace component (bulk trigger rendered inside BulkEnroll's action bar)
  - traceStatus field on PropertyWithLead and getProperties() enrichment
  - Trace status badges on PropertyCard and LeadCard
affects: [18-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@base-ui/react Dialog (not Radix/shadcn) — Dialog.Root/Portal/Backdrop/Popup pattern"
    - "Dialog.Close used directly without asChild (base-ui does not support asChild on Close)"
    - "BulkEnroll extra ReactNode prop for extensible bulk action bar"
    - "Post-query ownerContacts enrichment pattern (same as touchpointCount / hasEmail)"
    - "span title wrapper for Lucide icons — LucideProps omits title in this version"

key-files:
  created:
    - app/src/components/skip-trace-confirm-dialog.tsx
    - app/src/components/skip-trace-button.tsx
    - app/src/components/bulk-skip-trace.tsx
  modified:
    - app/src/components/contact-tab.tsx
    - app/src/components/dashboard-property-grid.tsx
    - app/src/components/lead-card.tsx
    - app/src/components/property-card.tsx
    - app/src/components/campaigns/bulk-enroll.tsx
    - app/src/lib/queries.ts
    - app/src/types/index.ts

key-decisions:
  - "BulkSkipTrace rendered via BulkEnroll extra prop — avoids two overlapping fixed bars and avoids deep refactor"
  - "traceStatus populated via post-query inArray lookup (not SQL subquery) — consistent with touchpointCount/hasEmail enrichment pattern"
  - "span title wrapper for Lucide icons — LucideProps strips title attribute in this version of lucide-react"
  - "BulkEnroll extra ReactNode prop — minimal change to extend bulk action bar without coupling components"
  - "SkipTraceButton also shown below Owner card when not in skip-trace flag state (no tracerfy result) — allows tracing on any individual property"

patterns-established:
  - "SkipTraceConfirmDialog is shared between single-property and bulk triggers — same dialog, different count/cost props"
  - "Balance fetched on button click (not on page load) — avoids unnecessary API calls when user never opens dialog"
  - "useTransition for all Tracerfy server action calls — consistent with Phase 12 campaign patterns"

requirements-completed: [TRACE-05, TRACE-06, TRACE-07, TRACE-08, TRACE-10]

# Metrics
duration: 5min
completed: 2026-04-10
---

# Phase 18 Plan 02: Tracerfy UI Wire-Up Summary

**Three new components wire Tracerfy server actions into the UI: single-property dialog on ContactTab, bulk action bar alongside BulkEnroll on dashboard, and trace status badges on property cards.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-10T22:07:48Z
- **Completed:** 2026-04-10T22:12:36Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Created `skip-trace-confirm-dialog.tsx` using @base-ui/react/dialog with live balance display, low-balance warning banner, and cost estimate
- Created `skip-trace-button.tsx` for ContactTab — shows "Skip traced" badge if already traced, otherwise shows button that fetches live balance on click and triggers single trace
- Created `bulk-skip-trace.tsx` for dashboard multi-select — renders button in BulkEnroll's action bar, shows confirmation dialog with total cost, calls runBulkSkipTrace
- Added `traceStatus` field to `PropertyWithLead` type and enriched `getProperties()` query with post-query ownerContacts lookup
- Wired BulkSkipTrace into `dashboard-property-grid.tsx` via a new `extra` prop on BulkEnroll
- Added trace status icons (Search/SearchX) to `property-card.tsx` (dashboard) and `lead-card.tsx` (pipeline)
- Added tracerfy phone type labels (Mobile, Landline, Phone) to contact tab phone rows

## Task Commits

Each task was committed atomically:

1. **Task 1: SkipTraceConfirmDialog, SkipTraceButton, ContactTab wire-up** - `b73627b` (feat)
2. **Task 2: BulkSkipTrace, traceStatus query, dashboard grid, badges** - `4e03eee` (feat)

## Files Created/Modified

- `app/src/components/skip-trace-confirm-dialog.tsx` - Shared confirmation dialog (created)
- `app/src/components/skip-trace-button.tsx` - Single-property skip trace trigger (created)
- `app/src/components/bulk-skip-trace.tsx` - Bulk skip trace action (created)
- `app/src/components/contact-tab.tsx` - Added SkipTraceButton + tracerfy type labels
- `app/src/components/dashboard-property-grid.tsx` - Added BulkSkipTrace via BulkEnroll extra prop
- `app/src/components/lead-card.tsx` - Trace status icons
- `app/src/components/property-card.tsx` - Trace status icons
- `app/src/components/campaigns/bulk-enroll.tsx` - Added extra ReactNode prop
- `app/src/lib/queries.ts` - traceStatus enrichment in getProperties()
- `app/src/types/index.ts` - traceStatus field on PropertyWithLead

## Decisions Made

- **BulkSkipTrace via BulkEnroll extra prop** — rendering BulkSkipTrace as a separate fixed bar would stack two bars; using extra prop puts the button alongside the email enroll button in one bar
- **Post-query ownerContacts enrichment** — matches the existing touchpointCount/hasEmail pattern (inArray + Map lookup), avoids SQL subquery complexity
- **span title wrapper for Lucide icons** — this version of lucide-react strips title from LucideProps; wrapping in span preserves tooltip
- **Balance fetched on dialog open, not on page load** — lazy fetch avoids hitting Tracerfy API on every ContactTab render

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Added trace status badges to property-card.tsx in addition to lead-card.tsx**
- **Found during:** Task 2
- **Issue:** Dashboard uses `property-card.tsx` (not `lead-card.tsx`) for the main grid — plan listed lead-card.tsx but the functional dashboard component is property-card.tsx
- **Fix:** Added Search/SearchX trace status icons to both files
- **Files modified:** app/src/components/property-card.tsx

**2. [Rule 1 - Bug] Used `span title` wrapper instead of `title` prop on Lucide icons**
- **Found during:** Task 2 (TypeScript error)
- **Issue:** `LucideProps` type omits `title` attribute; TypeScript error TS2322 on both lead-card.tsx and property-card.tsx
- **Fix:** Wrapped icon in `<span title="...">` — same tooltip behavior, passes TypeScript

**3. [Rule 1 - Bug] Added extra ReactNode prop to BulkEnroll to place BulkSkipTrace button inline**
- **Found during:** Task 2
- **Issue:** BulkSkipTrace cannot render inside BulkEnroll's fixed bar as a sibling without either deeply modifying BulkEnroll or creating two overlapping fixed bars
- **Fix:** Added optional `extra?: ReactNode` to BulkEnroll props; BulkSkipTrace renders as the fragment inside the extra slot

## Self-Check

- [x] skip-trace-confirm-dialog.tsx: exists, uses @base-ui/react/dialog, Dialog.Close without asChild
- [x] skip-trace-button.tsx: exists, calls runSkipTrace, getTracerfyStatus, getTracerfyConfig
- [x] bulk-skip-trace.tsx: exists, calls runBulkSkipTrace
- [x] TypeScript: zero errors after all changes
- [x] BulkSkipTrace wired into DashboardPropertyGrid via BulkEnroll extra prop
- [x] traceStatus in PropertyWithLead type and getProperties() enrichment
- [x] Task commits: b73627b, 4e03eee

## Self-Check: PASSED
