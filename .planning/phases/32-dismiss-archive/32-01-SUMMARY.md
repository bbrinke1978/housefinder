---
phase: 32-dismiss-archive
plan: "01"
subsystem: ui
tags: [drizzle, postgres, nextjs, react, soft-delete, permissions, rbac, contact-events]

# Dependency graph
requires:
  - phase: 29-rbac
    provides: userCan, canEditLead, logAudit, sessionCan permission helpers
  - phase: 31-activity-feed
    provides: contact_events schema, activity feed UI components, getActivityFeed query
provides:
  - Soft-delete (dismiss) for leads with parcel suppression in dismissed_parcels table
  - Archive/unarchive for deals
  - Owner-only permanent delete (lead + deal) with address confirmation
  - Fixed Log-a-call form writing to contact_events with active-deal combobox typeahead
affects: [scraper, dashboard, deals-kanban, analytics-outreach, property-detail, deal-detail]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Soft-delete pattern: dismissed_at IS NULL filter by default; showDismissed param bypasses it"
    - "Parcel suppression: dismissed_parcels table acts as scraper deny-list (ON CONFLICT DO NOTHING)"
    - "Nullable return from upsertProperty: returns null for suppressed parcels, callers continue"
    - "Address confirmation modal: two-step confirm-by-typing with normalize() comparison"
    - "Combobox typeahead: controlled input + filtered dropdown, search across address+seller+city"

key-files:
  created:
    - app/drizzle/0018_dismiss_archive.sql
    - app/scripts/migrate-0018-dismiss-archive.ts
    - app/src/components/dismiss-lead-modal.tsx
    - app/src/components/archive-deal-button.tsx
    - app/src/components/permanent-delete-modal.tsx
    - app/src/components/dismiss-lead-controls.tsx
    - app/src/components/deal-archive-banner.tsx
    - app/src/components/show-dismissed-toggle.tsx
    - app/src/components/show-archived-toggle.tsx
  modified:
    - app/src/db/schema.ts
    - scraper/src/db/schema.ts
    - scraper/src/lib/upsert.ts
    - app/src/lib/actions.ts
    - app/src/lib/deal-actions.ts
    - app/src/lib/queries.ts
    - app/src/lib/deal-queries.ts
    - app/src/lib/analytics-queries.ts
    - app/src/lib/analytics-actions.ts
    - app/src/components/property-card.tsx
    - app/src/components/call-log-form.tsx
    - app/src/types/index.ts
    - app/src/app/(dashboard)/page.tsx
    - app/src/app/(dashboard)/properties/[id]/page.tsx
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/src/app/(dashboard)/deals/page.tsx
    - app/src/app/(dashboard)/analytics/page.tsx

key-decisions:
  - "Nullable upsertProperty return (null = suppressed) instead of throwing — 5 callers add simple continue"
  - "dismissed_parcels preserved on hard delete — scraper suppression survives lead deletion"
  - "Log-a-call writes to contact_events not callLogs — unified activity feed shows call history"
  - "Active deals combobox (not all leads) for call log — relevance: only deals in progress need calling"
  - "DealArchiveBanner composite client component — cleaner than passing isOwner through 3 server+client layers"

patterns-established:
  - "Soft-delete: dismissed_at IS NULL filter in getProperties/getDashboardStats; showDismissed bypasses"
  - "Archive: archived_at IS NULL filter in getDeals; showArchived bypasses"
  - "Server actions: always logAudit on every mutation; revalidatePath for cache busting"

requirements-completed: []

# Metrics
duration: ~3h
completed: 2026-04-26
---

# Phase 32 Plan 01: Dismiss + Archive + Outreach Fix Summary

**Soft-delete leads (with parcel suppression), archive deals, owner permanent-delete (address-confirm modal), and fixed Log-a-call using active-deals combobox writing to contact_events**

## Performance

- **Duration:** ~3 hours
- **Started:** 2026-04-26T02:00:00Z
- **Completed:** 2026-04-26T06:30:00Z
- **Tasks:** 6
- **Files modified:** 18 modified + 9 created

## Accomplishments

- Schema migration 0018: dismissed_at/by/reason/notes on leads; archived_at/by/reason on deals; dismissed_parcels table as scraper deny-list
- dismissLead, undismissLead, permanentDeleteLead, archiveDeal, unarchiveDeal, permanentDeleteDeal server actions with full RBAC gates and audit logging
- Scraper suppression: upsertProperty checks dismissed_parcels before insert, returns null for suppressed parcels; all 5 callers updated
- UI components: DismissLeadModal (reason dropdown), ArchiveDealButton (popover), PermanentDeleteModal (2-step address confirmation)
- Wired into dashboard (showDismissed toggle), property detail (DismissLeadControls), deal detail (DealArchiveBanner), deals kanban (showArchived toggle)
- Log-a-call form rewritten: active-deals combobox with typeahead search, writes to contact_events instead of callLogs, actorUserId from session

## Task Commits

1. **Task 1: DB schema migration** — `dfe209e` (feat)
2. **Task 2: Server actions (dismiss/archive/delete)** — `efe8c26` (feat)
3. **Task 3: Read-side filtering + scraper suppression** — `e252211` (feat)
4. **Task 4: UI components** — `52857c7` (feat)
5. **Task 5: Wire components into pages** — `0c5e75d` (feat)
6. **Task 6: Fix Log-a-call form** — `7434004` (feat)

## Files Created/Modified

- `app/drizzle/0018_dismiss_archive.sql` — DDL for dismiss/archive/dismissed_parcels
- `app/scripts/migrate-0018-dismiss-archive.ts` — Migration runner (applied to prod)
- `app/src/db/schema.ts` — dismissedAt/dismissedByUserId/etc on leads, archivedAt/etc on deals, dismissedParcels table
- `scraper/src/db/schema.ts` — dismissedParcels table added for suppression query
- `scraper/src/lib/upsert.ts` — Nullable return, suppression check, 5 callers updated
- `app/src/lib/actions.ts` — dismissLead, undismissLead, permanentDeleteLead added
- `app/src/lib/deal-actions.ts` — archiveDeal, unarchiveDeal, permanentDeleteDeal added
- `app/src/lib/queries.ts` — showDismissed filter in getProperties/getDashboardStats; dismissedAt in getPropertyDetail
- `app/src/lib/deal-queries.ts` — showArchived filter in getDeals; archivedAt fields in getDeal
- `app/src/lib/analytics-queries.ts` — getActiveDealsForCallForm() query
- `app/src/lib/analytics-actions.ts` — logCall rewired to contact_events with session actor
- `app/src/components/dismiss-lead-modal.tsx` — @base-ui/react/dialog modal, reason dropdown
- `app/src/components/archive-deal-button.tsx` — Archive/unarchive with popover confirm
- `app/src/components/permanent-delete-modal.tsx` — 2-step: cascade warning + type address to confirm
- `app/src/components/dismiss-lead-controls.tsx` — Property detail page dismiss/undismiss/delete row
- `app/src/components/deal-archive-banner.tsx` — Deal detail page archive banner + controls
- `app/src/components/show-dismissed-toggle.tsx` — Dashboard chip for showDismissed URL param
- `app/src/components/show-archived-toggle.tsx` — Deals page chip for showArchived URL param
- `app/src/components/property-card.tsx` — Dismiss × button, dismissed ribbon overlay
- `app/src/components/call-log-form.tsx` — Combobox typeahead, no Source field, writes to contact_events
- `app/src/types/index.ts` — dismissedAt/dismissedReason on PropertyWithLead; archivedAt/etc on DealWithBuyer

## Decisions Made

- **Nullable upsertProperty return** instead of throwing on suppression — 5 callers add `if (result === null) continue` which is simpler and non-breaking
- **dismissed_parcels preserved on hard delete** — ensures re-scraped parcels remain suppressed after a "nuclear" delete
- **Log-a-call writes to contact_events** — unified activity feed now shows call history on property detail page without separate callLogs query
- **Active deals combobox** (closed/dead excluded) — calling closed deals is not useful; narrows list to actionable targets
- **DealArchiveBanner composite component** — bundles ArchiveDealButton + PermanentDeleteModal into one client component so deal detail page stays a server component

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — tsc and lint passed clean after each task commit.

## User Setup Required

None — migration ran automatically against production DB during execution.

## Next Phase Readiness

- Dismiss/archive infrastructure is live in production (migration applied)
- dismissed_parcels suppression active — next scraper run will skip dismissed parcels
- contact_events now receives manual call logs — activity feed on property detail shows full contact history
- Ready for next phase (v1.3 roadmap items)

---
*Phase: 32-dismiss-archive*
*Completed: 2026-04-26*
