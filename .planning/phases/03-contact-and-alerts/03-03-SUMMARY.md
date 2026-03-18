---
phase: 03-contact-and-alerts
plan: 03
subsystem: ui
tags: [contact, skip-trace, alerts, tel-links, settings, drizzle]

# Dependency graph
requires:
  - phase: 03-01
    provides: ownerContacts table, OwnerContact type, scraperConfig alert keys
provides:
  - Contact tab with owner info, phone display (tel: links), manual phone entry, skip trace flag
  - "Needs Skip Trace" dashboard stat
  - Alert settings UI (email/SMS toggles, thresholds)
  - getOwnerContacts query, saveOwnerPhone action, getAlertSettings/updateAlertSettings actions
affects: [03-02, 04-enrichment]

# Tech tracking
tech-stack:
  added: []
  patterns: [upsert-on-conflict for ownerContacts, scraperConfig key-value pattern for alert settings]

key-files:
  created: []
  modified:
    - app/src/components/contact-tab.tsx
    - app/src/components/stats-bar.tsx
    - app/src/components/settings-form.tsx
    - app/src/lib/queries.ts
    - app/src/lib/actions.ts
    - app/src/app/(dashboard)/properties/[id]/page.tsx
    - app/src/app/(dashboard)/settings/page.tsx

key-decisions:
  - "FastPeopleSearch replaces Utah Business Registry as second people-search link for individuals"
  - "Native checkbox inputs for alert toggles (no shadcn Switch component available)"
  - "Alert threshold inputs conditionally shown only when channel is enabled"

patterns-established:
  - "onConflictDoUpdate on (propertyId, source) unique constraint for contact upserts"
  - "like query on scraperConfig keys for grouped settings retrieval"

requirements-completed: [CONTACT-03, CONTACT-04, ALERT-01, ALERT-02]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 3 Plan 3: Contact Tab UI, Skip Trace Stats, and Alert Settings Summary

**Full contact tab with tel: links and manual phone entry, skip trace stat on dashboard, and email/SMS alert settings with threshold controls**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T23:40:05Z
- **Completed:** 2026-03-18T23:44:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Contact tab rebuilt with owner info, tappable phone links, manual phone entry form, skip trace flag with TruePeopleSearch/FastPeopleSearch links, and entity owner badge with Utah Business Registry link
- Dashboard stats bar expanded to 5 columns with "Needs Skip Trace" count using NOT EXISTS subquery
- Settings page now has Alert Settings section with email/SMS toggles and configurable score thresholds

## Task Commits

Each task was committed atomically:

1. **Task 1: Add queries, server actions, and update pages** - `a00f769` (feat)
2. **Task 2: Rebuild contact-tab, update stats-bar, add alert settings UI** - `718a630` (feat)

## Files Created/Modified
- `app/src/lib/queries.ts` - Added getOwnerContacts query, needsSkipTrace to DashboardStats with NOT EXISTS subquery
- `app/src/lib/actions.ts` - Added saveOwnerPhone (upsert), getAlertSettings, updateAlertSettings server actions
- `app/src/components/contact-tab.tsx` - Full rewrite: owner card, phone cards with tel: links, manual entry form, skip trace flag, entity badge
- `app/src/components/stats-bar.tsx` - Added 5th stat card "Needs Skip Trace" with Search icon, grid-cols-5
- `app/src/components/settings-form.tsx` - Added Alert Settings section with email/SMS toggles and threshold number inputs
- `app/src/app/(dashboard)/properties/[id]/page.tsx` - Fetches contacts via getOwnerContacts, passes to ContactTab
- `app/src/app/(dashboard)/settings/page.tsx` - Fetches alert settings, passes to SettingsForm

## Decisions Made
- Used FastPeopleSearch as second people-search link (plan originally had Utah Business Registry which is for entities, not individuals)
- Used native HTML checkbox inputs for alert toggles since shadcn Switch component is not installed
- Threshold inputs are conditionally rendered only when the corresponding channel is enabled

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cleaned up duplicate query code in saveOwnerPhone**
- **Found during:** Task 1
- **Issue:** Duplicate SELECT queries left from initial implementation
- **Fix:** Removed redundant queries, kept only the upsert
- **Files modified:** app/src/lib/actions.ts
- **Committed in:** a00f769

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Contact tab fully functional for manual phone entry workflow
- Alert settings persisted to scraperConfig, ready for scraper-side alert dispatch (Plan 03-02)
- Skip trace stat provides visibility into properties needing contact lookup

---
*Phase: 03-contact-and-alerts*
*Completed: 2026-03-18*
