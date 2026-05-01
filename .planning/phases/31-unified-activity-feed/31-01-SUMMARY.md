---
phase: 31-unified-activity-feed
plan: 01
subsystem: activity-feed
tags: [activity, timeline, modal, schema, dashboard, properties, leads, deals]
dependency_graph:
  requires: [29-rbac-foundation, 28-feedback-system]
  provides: [unified-activity-feed, activity-log-modal, card-indicator]
  affects: [dashboard, properties-detail, leads-detail, deals-detail, contact-tab]
tech_stack:
  added: []
  patterns:
    - "@base-ui/react/dialog for ActivityLogModal (matches Phase 28 FloatingReportButton)"
    - "JS parallel-fetch + post-sort for multi-source feed (getActivityFeed)"
    - "ActivityEntry normalized shape across 7 data sources"
    - "Server-side activity data attached to PropertyWithLead for card indicators"
key_files:
  created:
    - app/drizzle/0017_contact_events_actor_outcome.sql
    - app/scripts/migrate-0017-activity.ts
    - app/src/lib/activity-queries.ts
    - app/src/lib/activity-actions.ts
    - app/src/components/activity-log-modal.tsx
    - app/src/components/activity-feed.tsx
    - app/src/components/activity-card-indicator.tsx
  modified:
    - app/src/db/schema.ts
    - app/src/types/index.ts
    - app/src/components/property-card.tsx
    - app/src/components/contact-tab.tsx
    - app/src/app/(dashboard)/page.tsx
    - app/src/app/(dashboard)/properties/[id]/page.tsx
    - app/src/app/(dashboard)/leads/[id]/page.tsx
    - app/src/app/(dashboard)/deals/[id]/page.tsx
decisions:
  - "getActivityFeedForLead(leadId) added for inbound leads (propertyId=NULL) — separate from getActivityFeed(propertyId)"
  - "Dashboard uses simple N+1 parallel Promise.all for activity data per card — LATERAL join deferred unless perf degrades"
  - "contact-tab.tsx uses optional activityFeed prop for backward compat — falls back to legacy ActivityTimeline if not provided"
  - "ActivityFeed filter='comms_only' shown in Contact tab; filter='notes_only' shown below Notes write form"
  - "Inbound lead /leads/[id] passes empty string '' for propertyId since no property; feed uses getActivityFeedForLead"
metrics:
  duration: 11min
  completed: 2026-05-01T23:17:00Z
  tasks: 7
  files: 13
---

# Phase 31 Plan 01: Unified Activity Feed Summary

Unified per-property activity feed, end-to-end: schema migration through dashboard card integration.

## What Was Built

**Schema (Task 1):** Added `actor_user_id uuid FK` and `outcome text` columns to `contact_events` via migration 0017. Applied to prod. All legacy rows have NULL in both fields.

**Query layer (Task 2):** `getActivityFeed(propertyId)` runs 7 source queries in parallel (contact_events, lead_notes, deal_notes, audit_log material-only, property_photos, contracts, owner_contacts/tracerfy), normalizes each to `ActivityEntry`, JS-sorts by `occurredAt` desc, caps at 100. `getLastActivity` and `getActivityCount` delegate to the same function. `getActivityFeedForLead(leadId)` added as a variant for inbound leads without a propertyId.

**Server action (Task 3):** `logActivity(input)` routes by type — `note` inserts into `lead_notes`, all others insert into `contact_events` with correct `eventType`, `actor_user_id`, and `outcome`. Auth-gated via `userCan(roles, 'lead.edit_status')`. Always calls `logAudit('activity.logged')`. Revalidates /, /properties, /leads, /deals.

**ActivityLogModal (Task 4):** Client component using `@base-ui/react/dialog` (same pattern as FloatingReportButton). 6-type selector in 3x2 grid (Call/Email/Text/Meeting/Voicemail/Note). Per-type fields: call gets outcome dropdown, email gets optional subject, all get notes textarea. Validates: note requires text, call requires outcome. Calls `logActivity` on submit.

**ActivityFeed (Task 5):** Full timeline component with vertical icon spine, actor avatars (colored circle + initials), description, relative time, expandable body. Filter modes: `all` / `notes_only` / `comms_only`. Log Activity button at top. `router.refresh()` on modal success.

**Card indicator (Task 6):** `ActivityCardIndicator` shows compact "No activity yet +" or "<icon> description · ago · N events +" row. PropertyCard integrates it with local `useState` for modal. Dashboard page fetches `getActivityFeed` per property in parallel and attaches `lastActivity` + `activityCount` to `PropertyWithLead` before passing to grid.

**Detail page integration (Task 7):**
- `/properties/[id]`: new Activity tab (all), Notes tab keeps write form + filtered feed, Contact tab uses `ActivityFeed(comms_only)` replacing legacy `ActivityTimeline`
- `/leads/[id]`: unified feed section added below LeadNotes write form
- `/deals/[id]`: Activity tab keeps DealNotes write form + `ActivityFeed(all)` below it; falls back to legacy timeline if deal has no property

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] getActivityFeedForLead for inbound leads**
- **Found during:** Task 7 — `/leads/[id]` uses inbound leads with `propertyId=NULL`
- **Issue:** `getActivityFeed(propertyId)` requires a property; inbound leads have none
- **Fix:** Added `getActivityFeedForLead(leadId)` in activity-queries.ts that queries contact_events + lead_notes + audit_log scoped to the leadId directly
- **Files modified:** app/src/lib/activity-queries.ts
- **Commit:** 1a14dcf

**2. [Rule 3 - Blocking] contactEventTypeEnum missing 'left_voicemail' as mapped type**
- **Found during:** Task 3 — the `left_voicemail` value was in the enum but the modal type 'voicemail' needed to map correctly
- **Fix:** Ensured TYPE_TO_EVENT_TYPE maps 'voicemail' → 'left_voicemail' (already in the enum)
- Not a separate commit — caught during initial implementation

## Self-Check: PASSED

All 7 key artifact files confirmed present on disk.
All 7 task commits confirmed in git log (04a1b0d through 1a14dcf).
`npx tsc --noEmit` passes clean after all tasks.
