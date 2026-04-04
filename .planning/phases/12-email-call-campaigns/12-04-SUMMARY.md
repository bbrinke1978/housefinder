---
phase: 12-email-call-campaigns
plan: 04
subsystem: email-enrollment
tags: [resend, react-email, campaigns, enrollment, drip-email, dashboard, typescript]

# Dependency graph
requires:
  - phase: 12-email-call-campaigns
    plan: 01
    provides: campaignEnrollments/emailSendLog/emailSteps tables + MailSettings type
  - phase: 12-email-call-campaigns
    plan: 02
    provides: logContactEvent server action for timeline event on enrollment
  - phase: 12-email-call-campaigns
    plan: 03
    provides: getSequences/getMailSettings + Campaigns page infrastructure

provides:
  - OutreachTemplate react-email component for outreach drip emails
  - enrollLeadInSequence server action (validate email, stop prior, send step 0, log events)
  - unenrollLead server action (stops active enrollment)
  - bulkEnrollLeads server action (sequential with 200ms rate limiting)
  - EnrollButton client component (3-state: no email / enroll dropdown / enrolled status)
  - BulkEnroll client component (sticky bar with sequence selection, progress, summary)
  - DashboardPropertyGrid client component (selection checkboxes + BulkEnroll)
  - getLeadActiveEnrollment query for per-lead enrollment lookup
  - hasEmail field on PropertyWithLead for dashboard email indicators

affects:
  - 12-05 (sequence advancement scheduler uses same emailSendLog + campaignEnrollments pattern)
  - dashboard (DashboardPropertyGrid replaces direct property card render)
  - property detail (ContactTab now shows EnrollButton)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - OutreachTemplate: plain paragraphs + signature section; no corporate branding
    - enrollLeadInSequence: DB transaction for stop-prior + insert-new; idempotency via enrollmentId+stepId check
    - logContactEvent called after send (non-fatal — enrollment already committed)
    - bulkEnrollLeads: sequential not parallel; 200ms delay between sends for Resend rate limit (5 req/sec)
    - EnrollButton: optimistic update of localEnrollment state after successful enroll
    - DashboardPropertyGrid: hover-reveal checkboxes; email dot indicator on card
    - hasEmail enriched in getProperties alongside touchpointCount via parallel Promise.all

key-files:
  created:
    - app/src/components/email/outreach-template.tsx
    - app/src/lib/enrollment-actions.ts
    - app/src/components/campaigns/enroll-button.tsx
    - app/src/components/campaigns/bulk-enroll.tsx
    - app/src/components/dashboard-property-grid.tsx
  modified:
    - app/src/lib/campaign-queries.ts
    - app/src/lib/queries.ts
    - app/src/components/contact-tab.tsx
    - app/src/components/property-card.tsx
    - app/src/app/(dashboard)/properties/[id]/page.tsx
    - app/src/app/(dashboard)/page.tsx
    - app/src/types/index.ts

key-decisions:
  - "MAILING: prefix filter in ownerEmail lookup — DB stores mailing addresses as email-column entries with 'MAILING:' prefix; these must be excluded from enrollment email recipients"
  - "Step 0 is stepNumber=1 in DB — enrollment currentStep tracks 0-based index; nextSendAt uses step 2 delay"
  - "logContactEvent after email send is non-fatal — enrollment + email already committed; contact event failure does not rollback"
  - "DashboardPropertyGrid wraps property grid in client component — required to lift selection state for BulkEnroll; minimal client JS added"
  - "hasEmail enriched server-side in getProperties — no client JS; avoids per-card contact query"
  - "getLeadActiveEnrollment added to campaign-queries.ts — needed for property detail page without pg bundling in client"

requirements-completed: [CAMP-08, CAMP-09, CAMP-10]

# Metrics
duration: 6min
completed: 2026-04-04
---

# Phase 12 Plan 04: Email Enrollment Flow Summary

**Outreach react-email template, enrollLeadInSequence/unenrollLead/bulkEnrollLeads server actions, EnrollButton on property detail Contact tab, BulkEnroll sticky bar on dashboard with selection checkboxes**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-04T05:08:06Z
- **Completed:** 2026-04-04T05:14:21Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- `OutreachTemplate`: React-email component with plain paragraph layout + signature section, no heavy branding — looks personal not corporate
- `enrollLeadInSequence`: Full flow — validate lead has real (non-MAILING) email, check mail settings/Resend key, load sequence + step 0, DB transaction to stop prior enrollment + insert new enrollment, idempotency check, send via Resend with `X-Idempotency-Key` header, update emailSendLog with resendEmailId, log contactEvent for timeline
- `unenrollLead`: Stops active enrollment with stopReason='unenrolled'
- `bulkEnrollLeads`: Sequential processing with 200ms delay between sends (Resend rate limit compliance); returns `{enrolled, skipped, errors}` summary
- `getLeadActiveEnrollment`: Per-lead query added to campaign-queries.ts for property detail page
- `EnrollButton`: 3 states — disabled with tooltip (no email), dropdown of active sequences (has email/not enrolled), enrollment status badge + unenroll button (enrolled); optimistic state update on enroll
- `BulkEnroll`: Sticky bottom bar on dashboard when leads selected; sequence selection dropdown; progress indicator; result summary (enrolled/skipped/failed)
- `DashboardPropertyGrid`: Client component wrapping property grid with hover-reveal selection checkboxes and BulkEnroll integration; passes `selected` prop to PropertyCard for ring highlight
- `hasEmail` field added to `PropertyWithLead` type and enriched in `getProperties` via parallel ownerContacts query; mail icon indicator on dashboard cards
- `PropertyCard`: `selected` prop adds `ring-1 ring-primary/20` highlight when checked
- `ContactTab`: `EnrollButton` rendered in new "Email Sequence" card before contact event form; accepts `activeEnrollment` and `sequences` props (optional with defaults)
- Property detail page and dashboard page updated to fetch sequences and enrollment state

## Task Commits

1. **Task 1: Outreach email template and enrollment server actions** - `caf68ba` (feat)
2. **Task 2: Enroll button, bulk enrollment, and dashboard integration** - `b5e4b3d` (feat)

## Files Created/Modified

**Created:**
- `app/src/components/email/outreach-template.tsx` — React-email outreach component
- `app/src/lib/enrollment-actions.ts` — enrollLeadInSequence, unenrollLead, bulkEnrollLeads
- `app/src/components/campaigns/enroll-button.tsx` — Property detail enrollment UI
- `app/src/components/campaigns/bulk-enroll.tsx` — Dashboard bulk enrollment bar
- `app/src/components/dashboard-property-grid.tsx` — Client grid wrapper with selection

**Modified:**
- `app/src/lib/campaign-queries.ts` — Added getLeadActiveEnrollment
- `app/src/lib/queries.ts` — Added hasEmail enrichment in getProperties
- `app/src/components/contact-tab.tsx` — EnrollButton + new props (activeEnrollment, sequences)
- `app/src/components/property-card.tsx` — selected prop + ring highlight
- `app/src/app/(dashboard)/properties/[id]/page.tsx` — Fetch enrollment + sequences
- `app/src/app/(dashboard)/page.tsx` — DashboardPropertyGrid + sequences fetch
- `app/src/types/index.ts` — hasEmail added to PropertyWithLead

## Decisions Made

- MAILING: prefix filter applied in `enrollLeadInSequence` — the ownerContacts table stores mailing addresses in the email column with a `MAILING:` prefix (design from Phase 03); these must be explicitly excluded when looking for real email recipients
- DB step numbering: steps are 1-indexed in emailSteps (stepNumber 1, 2, 3...) but enrollment tracks `currentStep` as 0-based progress counter; step 0 = first email (stepNumber=1); nextSendAt uses step 2 (stepNumber=2) delay days
- Non-fatal contactEvent: if logContactEvent fails after a successful send, enrollment is not rolled back — an uncaught timeline entry is acceptable, a lost email send is not
- Client selection state lifted to DashboardPropertyGrid rather than dashboard page — dashboard page is a server component, selection is inherently client state; minimal client boundary added
- hasEmail enriched server-side via parallel DB query in getProperties (same pattern as touchpointCount) — accurate on page load without client-side contact fetching

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] MAILING: prefix filter for email recipients**
- **Found during:** Task 1, reviewing ownerContacts schema from Phase 03 (12-01-SUMMARY notes mailing addresses stored as MAILING: prefixed email column entries)
- **Issue:** The DB email column stores both real emails AND mailing addresses (MAILING:123 Main St format). Without filtering, a mailing address would be passed to Resend as the `to:` email causing delivery failure
- **Fix:** Added `.find((e) => e && !e.startsWith("MAILING:"))` filter in enrollment email lookup
- **Files modified:** `app/src/lib/enrollment-actions.ts`
- **Verification:** TypeScript compiles; logic correctly skips MAILING: entries

**2. [Rule 2 - Missing Critical] getLeadActiveEnrollment added to campaign-queries.ts**
- **Found during:** Task 2, property detail page integration
- **Issue:** No query existed to fetch the active enrollment for a specific lead; property detail page needed this to pass correct state to EnrollButton
- **Fix:** Added `getLeadActiveEnrollment(leadId)` to campaign-queries.ts
- **Files modified:** `app/src/lib/campaign-queries.ts`
- **Verification:** TypeScript compiles; build passes

**3. [Rule 2 - Missing Critical] hasEmail field added to PropertyWithLead + queries**
- **Found during:** Task 2, DashboardPropertyGrid email indicator implementation
- **Issue:** Dashboard cards needed a way to show which leads have email without per-card contact queries
- **Fix:** Added `hasEmail?: boolean` to PropertyWithLead type; enriched in `getProperties` via parallel ownerContacts query alongside touchpointCount
- **Files modified:** `app/src/types/index.ts`, `app/src/lib/queries.ts`
- **Verification:** Build passes

---

**Total deviations:** 3 auto-fixed (all correctness/missing-critical — no scope change)

## Issues Encountered

None beyond the 3 auto-fixes above. Build passes cleanly with only pre-existing warnings.

## User Setup Required

Resend API key must be configured at `/settings/mail` before email sequences will send. Once configured:
1. Go to Campaigns — create or use an existing sequence
2. On a property detail page → Contact tab → "Email Sequence" card → Enroll
3. Or on Dashboard — check leads → "Enroll in Sequence" bar appears at bottom

## Next Phase Readiness

- Enrollment + send log infrastructure ready for plan 12-05 (sequence advancement scheduler — cron job advances enrolled leads through remaining steps)
- `emailSendLog` rows written correctly — scheduler can query `campaignEnrollments WHERE status='active' AND nextSendAt <= NOW()` to find leads due for next step
- `hasEmail` on PropertyWithLead available for any future filtering/analytics

## Self-Check: PASSED

- app/src/components/email/outreach-template.tsx: FOUND
- app/src/lib/enrollment-actions.ts: FOUND
- app/src/components/campaigns/enroll-button.tsx: FOUND
- app/src/components/campaigns/bulk-enroll.tsx: FOUND
- app/src/components/dashboard-property-grid.tsx: FOUND
- commit caf68ba: FOUND
- commit b5e4b3d: FOUND

---
*Phase: 12-email-call-campaigns*
*Completed: 2026-04-04*
