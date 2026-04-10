---
phase: 18-tracerfy-options
plan: 03
subsystem: ui
tags: [tracerfy, skip-tracing, settings, deal-creation, base-ui, next-js]

# Dependency graph
requires:
  - phase: 18-tracerfy-options
    plan: 01
    provides: tracerfy-actions.ts with getTracerfyStatus/getTracerfyRunHistory/getTracerfyConfig/saveTracerfyConfig/runSkipTrace

provides:
  - /settings/skip-tracing page with connection status, balance, monthly spend, run history, cost controls
  - SkipTracingSettings client component (4-card mini-dashboard)
  - Auto-trace dialog in NewDealForm when property has no contacts
  - Skip Tracing sidebar link in AppSidebar

affects: [deal-creation, settings, skip-tracing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - force-dynamic server component fetching with Promise.all for multiple actions
    - @base-ui/react Dialog.Root/Portal/Backdrop/Popup/Close pattern for modals
    - hasContacts boolean prop passed from server page to client form for conditional dialog

key-files:
  created:
    - app/src/app/(dashboard)/settings/skip-tracing/page.tsx
    - app/src/components/skip-tracing-settings.tsx
  modified:
    - app/src/components/app-sidebar.tsx
    - app/src/components/new-deal-form.tsx
    - app/src/app/(dashboard)/deals/new/page.tsx

key-decisions:
  - "SkipTracingSettings derives monthly spend client-side by filtering runHistory by current YYYY-MM prefix — no extra DB query needed"
  - "hasContacts flag computed server-side in deals/new/page.tsx by querying owner_contacts — excludes MAILING: prefixed rows"
  - "Dialog defaults open via useState(shouldShowDialog) where shouldShowDialog = propertyId present + !hasContacts + tracerfyConfigured"
  - "runSkipTrace called via useTransition in NewDealForm — dialog auto-closes 1.2s after success"

patterns-established:
  - "Settings page pattern: force-dynamic + Promise.all + hero banner + client component for interactivity"
  - "Auto-trace guard: only show dialog if Tracerfy is configured (prevents useless prompts for unconfigured installs)"

requirements-completed:
  - TRACE-11
  - TRACE-12
  - TRACE-13
  - TRACE-14
  - TRACE-15

# Metrics
duration: 3min
completed: 2026-04-10
---

# Phase 18 Plan 03: Skip Tracing Settings & Deal Auto-Trace Summary

**Tracerfy settings mini-dashboard at /settings/skip-tracing with balance, run history, monthly spend tracking, and auto-trace dialog on deal creation from properties with no contacts**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-10T22:07:52Z
- **Completed:** 2026-04-10T22:10:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Settings page at /settings/skip-tracing shows connection status (green/yellow/red), live balance, monthly spend with progress bar, run history table (last 20 runs with found-rate badges), and configurable cost controls
- Low balance warning and monthly soft-cap exceeded banners display automatically when thresholds are crossed
- When creating a deal from a property with no phone or email contacts (and Tracerfy is configured), a dialog prompts to run a skip trace first
- Skip Tracing link added to AppSidebar footer alongside Mail Settings

## Task Commits

1. **Task 1: Create skip tracing settings page with mini-dashboard** - `2fb56ba` (feat)
2. **Task 2: Add auto-trace prompt to deal creation flow** - `24f7dde` (feat)

## Files Created/Modified

- `app/src/app/(dashboard)/settings/skip-tracing/page.tsx` - Server component, force-dynamic, fetches status/history/config via Promise.all
- `app/src/components/skip-tracing-settings.tsx` - Client component with 4 cards: connection status, monthly spend, run history table, cost controls
- `app/src/components/app-sidebar.tsx` - Added Skip Tracing link (Search icon) in footer settings section
- `app/src/components/new-deal-form.tsx` - Added auto-trace Dialog using @base-ui/react, hasContacts/tracerfyConfigured props
- `app/src/app/(dashboard)/deals/new/page.tsx` - Added owner_contacts query and getTracerfyStatus check, passes hasContacts prop

## Decisions Made

- Monthly spend computed client-side by filtering runHistory array by YYYY-MM prefix — simpler than a separate DB query and the data is already fetched
- Dialog guard `shouldShowDialog` requires all three conditions: propertyId exists, hasContacts is false, tracerfyConfigured is true — prevents useless prompts
- Dialog auto-closes 1.2s after successful trace so user can read the result count before continuing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Skip tracing UI is feature-complete: bulk trace (18-02), settings dashboard (18-03), and auto-trace on deal creation (18-03)
- Phase 18 plans complete; ready for Phase 19 (Wholesale Leads) or Phase 20 (Security Review)

---
*Phase: 18-tracerfy-options*
*Completed: 2026-04-10*
