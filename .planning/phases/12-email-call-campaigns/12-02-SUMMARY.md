---
phase: 12-email-call-campaigns
plan: 02
subsystem: ui
tags: [contact-events, activity-timeline, call-scripts, touchpoints, dashboard, typescript]

# Dependency graph
requires:
  - phase: 12-email-call-campaigns
    plan: 01
    provides: contactEvents table, TimelineEntry type, CALL_SCRIPTS constant, touchpointCount on PropertyWithLead

provides:
  - logContactEvent server action with zod validation + lastContactedAt update
  - getLeadTimeline unified timeline query (contactEvents + leadNotes + emailSendLog)
  - getLeadTouchpointCounts per-lead count Map for dashboard
  - ContactEventForm component (6 types, useActionState, success/error feedback)
  - ActivityTimeline component (vertical timeline, icons per type, expandable notes)
  - TouchpointBadge component (compact count pill on property cards)
  - CallScriptModal component (5 scripts, merge fields, clipboard copy, @base-ui/react dialog)
  - ContactTab extended with form + timeline + call script trigger per phone number

affects:
  - 12-03 (email sending service uses same contactEvents table for timeline)
  - 12-04 (campaigns page enriches properties with same touchpointCount pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useActionState<Result|null, FormData> for contact event form (consistent with Phase 06 logCall)
    - Server action signature (_prevState, formData) for useActionState compatibility
    - getLeadTimeline: parallel fetch 3 sources, merge + sort descending in TypeScript
    - getProperties enriches returned rows with touchpointCount via groupBy subquery (no N+1)
    - @base-ui/react/dialog for CallScriptModal (no asChild — Dialog.Close used directly)
    - CALL_SCRIPTS merge fields resolved client-side from props (no DB fetch at call time)

key-files:
  created:
    - app/src/lib/contact-event-actions.ts
    - app/src/lib/contact-event-queries.ts
    - app/src/components/contact-event-form.tsx
    - app/src/components/activity-timeline.tsx
    - app/src/components/touchpoint-badge.tsx
    - app/src/components/call-script-modal.tsx
  modified:
    - app/src/components/contact-tab.tsx
    - app/src/components/property-card.tsx
    - app/src/app/(dashboard)/properties/[id]/page.tsx
    - app/src/lib/queries.ts

key-decisions:
  - "logContactEvent accepts (_prevState, formData) signature for useActionState — consistent with React 19 form action pattern established in Phase 06"
  - "getLeadTimeline uses parallel fetch + client-side merge/sort (not SQL UNION) — avoids complex Drizzle union query, easier to extend with future event types"
  - "getProperties enriches touchpointCount via post-query inArray groupBy — single extra query for all 100 cards, not N+1 subqueries"
  - "CallScriptModal uses Dialog.Close directly without asChild — @base-ui/react does not support asChild on Close unlike Radix"
  - "CALL_SCRIPTS merge fields resolved client-side from props — no scraperConfig DB fetch needed at call time since scripts are constants, not user-configurable"
  - "TouchpointBadge returns null at count=0 — uncalled leads show no badge, called leads show count pill with phone icon"

# Metrics
duration: 5min
completed: 2026-04-04
---

# Phase 12 Plan 02: Contact Event Logging — Activity Timeline & Call Scripts Summary

**Server action + queries + 4 components for complete contact event logging: form, vertical activity timeline, touchpoint count badges on dashboard cards, and call script modal with 5 pre-built scripts and merge field resolution**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-04T04:48:31Z
- **Completed:** 2026-04-04T04:53:46Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- `logContactEvent` server action: zod validation, lead existence check, contactEvents insert, lastContactedAt update, revalidatePath — returns union `{success:true}|{error:string}` never throws
- `getLeadTimeline`: parallel fetch from contactEvents + leadNotes + emailSendLog, merged into `TimelineEntry[]`, sorted descending — handles empty emailSendLog gracefully
- `getLeadTouchpointCounts`: `inArray` + `groupBy` query returning `Map<string, number>` for efficient bulk lookup
- `ContactEventForm`: "use client" with 6 event type options via `CONTACT_EVENT_LABELS`, textarea for notes, `useActionState`, success (green) and error (red) feedback banners
- `ActivityTimeline`: vertical timeline with colored icon dots per entry type (violet=calls, blue=email, green=text, amber=in-person, teal=received, zinc=notes), `formatDistanceToNow` relative timestamps, 120-char truncation with expand/collapse
- `TouchpointBadge`: null at 0 count, phone icon + count pill at `bg-muted text-muted-foreground` styling
- `CallScriptModal`: @base-ui/react/dialog, 5 script type tabs (acquisitions/dispositions/agent/jv/objection), accordion-style step expansion, merge field resolution ({senderName}/{city}/{address}), "Copy full script" clipboard button with 2s copied feedback
- `ContactTab` extended: accepts `leadId`, `address`, `city`, `timeline` props; CallScriptModal button added per phone number inline with tel: link; ContactEventForm + ActivityTimeline cards added at bottom
- `property-card.tsx`: TouchpointBadge rendered in bottom row when touchpointCount > 0
- `queries.ts getProperties`: post-query touchpointCount enrichment via single `inArray+groupBy` query; short-circuits on empty result; maps counts into PropertyWithLead[]
- Property detail page: fetches `getLeadTimeline` in parallel with notes, passes to ContactTab

## Task Commits

1. **Task 1: Contact event server actions, queries, and form component** - `c83d24c` (feat)
2. **Task 2: Activity timeline, touchpoint badge, call script modal, and integration** - `16bb265` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

**Created:**
- `app/src/lib/contact-event-actions.ts` — logContactEvent server action
- `app/src/lib/contact-event-queries.ts` — getLeadTimeline + getLeadTouchpointCounts
- `app/src/components/contact-event-form.tsx` — 6-type event log form with useActionState
- `app/src/components/activity-timeline.tsx` — vertical timeline component
- `app/src/components/touchpoint-badge.tsx` — count pill badge component
- `app/src/components/call-script-modal.tsx` — @base-ui/react dialog with 5 call scripts

**Modified:**
- `app/src/components/contact-tab.tsx` — extended props + ContactEventForm + ActivityTimeline + CallScriptModal per phone
- `app/src/components/property-card.tsx` — TouchpointBadge in bottom row
- `app/src/app/(dashboard)/properties/[id]/page.tsx` — getLeadTimeline fetch + ContactTab prop pass-through
- `app/src/lib/queries.ts` — touchpointCount enrichment in getProperties + inArray import

## Decisions Made

- Server action signature: `(_prevState, formData)` for React 19 useActionState compatibility
- Parallel fetch strategy for timeline: 3 separate queries merged in TypeScript vs SQL UNION — easier to maintain and extend
- @base-ui/react Dialog.Close used directly (no asChild) — deviation caught in TypeScript check and fixed inline
- Merge field resolution at render time from props — CALL_SCRIPTS are constants, no DB lookup needed
- TouchpointBadge design: simple phone icon + count vs icon breakdown — clean and unobtrusive

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dialog.Close asChild incompatibility with @base-ui/react**
- **Found during:** Task 2 TypeScript check
- **Issue:** `Dialog.Close asChild` is not a valid prop on @base-ui/react — unlike Radix UI which supports asChild composition
- **Fix:** Removed `asChild` wrapper, used `Dialog.Close` directly as the close button element
- **Files modified:** app/src/components/call-script-modal.tsx
- **Verification:** TypeScript compiles cleanly after fix
- **Committed in:** 16bb265 (Task 2)

**2. [Rule 3 - Blocking] Missing isNotNull import in queries.ts**
- **Found during:** Task 2 TypeScript check after modifying queries.ts imports
- **Issue:** Replaced `isNotNull, notInArray` with `inArray` but `isNotNull` is still used in `getMapProperties`
- **Fix:** Added `isNotNull` back to drizzle-orm imports; removed `notInArray` (truly unused)
- **Files modified:** app/src/lib/queries.ts
- **Verification:** TypeScript compiles cleanly after fix
- **Committed in:** 16bb265 (Task 2)

---

**Total deviations:** 2 auto-fixed (both caught in TypeScript check, fixed inline before final commit)
**Impact on plan:** No scope change — both were correctness fixes during implementation

## Issues Encountered

None beyond the two auto-fixed TypeScript errors. Build passes cleanly with only pre-existing warnings.

## User Setup Required

None — all new features are wired into existing pages. No environment variables or DB migrations needed (uses existing contactEvents table from plan 12-01 migration).

The new contact event form will start working immediately once the 12-01 migration runs on Azure deploy.

## Next Phase Readiness

- `logContactEvent` + `getLeadTimeline` ready for plan 12-03 (email sending — timeline will show email_sent entries automatically)
- `getLeadTouchpointCounts` available as standalone utility for plan 12-04 (campaigns dashboard)
- `CallScriptModal` uses CALL_SCRIPTS constant — no changes needed if scripts are updated in types/index.ts
- `ContactEventForm` can be reused on deal detail pages in future plans

## Self-Check: PASSED

- app/src/lib/contact-event-actions.ts: FOUND
- app/src/lib/contact-event-queries.ts: FOUND
- app/src/components/contact-event-form.tsx: FOUND
- app/src/components/activity-timeline.tsx: FOUND
- app/src/components/touchpoint-badge.tsx: FOUND
- app/src/components/call-script-modal.tsx: FOUND
- commit c83d24c: FOUND
- commit 16bb265: FOUND

---
*Phase: 12-email-call-campaigns*
*Completed: 2026-04-04*
