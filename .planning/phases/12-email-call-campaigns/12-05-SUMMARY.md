---
phase: 12-email-call-campaigns
plan: 05
subsystem: email-campaigns
tags: [resend, azure-functions, timer-trigger, drip-email, campaign-dispatch, deal-timeline, typescript]

# Dependency graph
requires:
  - phase: 12-email-call-campaigns
    plan: 01
    provides: campaignEnrollments/emailSendLog/emailSteps tables schema
  - phase: 12-email-call-campaigns
    plan: 02
    provides: contactEvents + getLeadTimeline for timeline on deal detail
  - phase: 12-email-call-campaigns
    plan: 04
    provides: enrollment infrastructure + emailSendLog pattern for idempotency

provides:
  - dispatchCampaignEmails() core dispatch function (auto-stop + due query + send + advance)
  - campaignDispatch Azure Functions timer trigger (5:15 AM MT, 0 15 12 * * *)
  - Deal auto-stop logic when deal status is closed/dead
  - Activity timeline on deal detail page Activity tab (Contact History section)
  - getLeadIdByPropertyId query in deal-queries.ts
  - Campaign tables (deals, contactEvents, emailSequences, emailSteps, campaignEnrollments, emailSendLog) added to scraper schema

affects:
  - scraper deploy (new function exports via index.ts)
  - deal detail UI (Activity tab now shows contact history)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - campaignDispatch timer: same app.timer() pattern as dailyScrape, runOnStartup=false
    - Auto-stop before due query: prevents sending to leads whose deal just closed
    - Race condition protection: re-checks deal status per enrollment before send
    - Idempotency: emailSendLog pre-insert before Resend call; skip if existing log entry
    - Rate limit handling: 429/quota error breaks dispatch loop for the day
    - Enrollment advancement: checks for subsequent step to set nextSendAt; completes if none
    - contactEvent insert after send is non-fatal (warn on fail, do not rollback)
    - Deal detail timeline: loaded only when deal.propertyId exists; null-safe via getLeadIdByPropertyId

key-files:
  created:
    - scraper/src/alerts/campaign-dispatch.ts
    - scraper/src/functions/campaignDispatch.ts
  modified:
    - scraper/src/db/schema.ts
    - scraper/src/index.ts
    - app/src/lib/deal-queries.ts
    - app/src/app/(dashboard)/deals/[id]/page.tsx

key-decisions:
  - "scraper schema extended with 7 new tables (deals, contactEvents, emailSequences, emailSteps, campaignEnrollments, emailSendLog + contactEventTypeEnum) — scraper's schema.ts is separate from app's; must stay in sync with app schema for campaign dispatch to work"
  - "nextStepNumber = currentStep + 2 in dispatch — currentStep is 0-based progress; stepNumber in DB is 1-indexed; after step 0 (stepNumber=1) is sent at enrollment, currentStep=0; dispatch sends stepNumber = currentStep + 2"
  - "Resend send uses text: bodyWithSignature not react: OutreachTemplate — scraper has no JSX/TSX compilation configured; plain text with appended signature avoids react-email dependency in scraper bundle"
  - "getLeadIdByPropertyId added to deal-queries.ts not contact-event-queries.ts — keeps deal-related lookups in the deal module; uses leads table already imported"
  - "Activity timeline shown only when contactTimeline.length > 0 — deal detail Activity tab always shows DealNotes; Contact History section appears below only when contact events exist for the linked property"

requirements-completed: [CAMP-11, CAMP-12]

# Metrics
duration: 3min
completed: 2026-04-04
---

# Phase 12 Plan 05: Campaign Dispatch Summary

**Azure Functions timer dispatch at 5:15 AM MT sending due follow-up emails with idempotency, deal auto-stop, and contact history on deal detail Activity tab**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-04T05:18:10Z
- **Completed:** 2026-04-04T05:21:15Z
- **Tasks:** 2 (1 auto + 1 checkpoint auto-approved)
- **Files modified:** 6

## Accomplishments

- `dispatchCampaignEmails()`: Full dispatch cycle — auto-stop closed/dead deal enrollments, query due enrollments (nextSendAt <= NOW), idempotency via emailSendLog pre-log, resolve merge fields, send via Resend with X-Idempotency-Key header, advance enrollment state (or complete if no more steps), log contactEvent for timeline
- `campaignDispatch` Azure Function: Timer trigger at `0 15 12 * * *` (5:15 AM MT) — fires 15 min after dailyScrape so new leads are scored before campaigns process; registered in scraper/src/index.ts
- Deal auto-stop: bulk UPDATE before processing due enrollments; race condition protection re-checks per enrollment before send
- Rate limit handling: 429/quota error detected from Resend error message, sets status=quota_exceeded, breaks dispatch loop for the day
- Deal detail Activity tab: loads `getLeadTimeline(leadId)` when deal has linked propertyId; renders `ActivityTimeline` in a "Contact History" section below DealNotes

## Task Commits

1. **Task 1: Campaign dispatch Azure Function and deal auto-stop** - `2cd5f17` (feat)
2. **Task 2: Visual verification (auto-approved)** - checkpoint auto-approved (auto mode active)

## Files Created/Modified

**Created:**
- `scraper/src/alerts/campaign-dispatch.ts` — Core dispatch logic (121 lines): auto-stop, due query, idempotency, send, advance
- `scraper/src/functions/campaignDispatch.ts` — Azure Functions timer trigger at 5:15 AM MT

**Modified:**
- `scraper/src/db/schema.ts` — Added deals, contactEvents/enum, emailSequences, emailSteps, campaignEnrollments, emailSendLog tables
- `scraper/src/index.ts` — Registered `export * from "./functions/campaignDispatch.js"`
- `app/src/lib/deal-queries.ts` — Added `getLeadIdByPropertyId` query + `leads` import
- `app/src/app/(dashboard)/deals/[id]/page.tsx` — Activity tab includes Contact History section with ActivityTimeline

## Decisions Made

- Scraper schema extended with 7 new tables — the scraper's `schema.ts` is a separate copy from the app's; campaign dispatch queries the same PostgreSQL DB but via its own Drizzle schema definition. These must stay in sync.
- `nextStepNumber = currentStep + 2` in dispatch — 0-based currentStep progress + 1-indexed DB stepNumber offset means stepNumber for the next step = currentStep + 2.
- Resend called with `text:` not `react:` — scraper has no JSX/TSX compilation; react-email components aren't available in the scraper bundle; plain text with appended signature works correctly.
- `getLeadIdByPropertyId` placed in `deal-queries.ts` — keeps deal context queries co-located; avoids importing leads into contact-event-queries.
- Contact History section only renders when `contactTimeline.length > 0` — deals without linked properties or without contact events don't show an empty section.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Scraper schema extended with campaign tables**
- **Found during:** Task 1 (creating campaign-dispatch.ts)
- **Issue:** scraper/src/db/schema.ts is separate from app/src/db/schema.ts — it doesn't have the campaign tables (campaignEnrollments, emailSteps, emailSendLog, contactEvents, emailSequences, deals). Without them, the campaign dispatch has no type-safe Drizzle access to those tables.
- **Fix:** Added all 7 required tables plus contactEventTypeEnum to scraper/src/db/schema.ts, matching the app schema definitions exactly
- **Files modified:** `scraper/src/db/schema.ts`
- **Verification:** `npx tsc --noEmit` passes in scraper
- **Committed in:** 2cd5f17 (Task 1 commit)

**2. [Rule 3 - Blocking] Resend send uses plain text instead of react: OutreachTemplate**
- **Found during:** Task 1 (implementing send logic)
- **Issue:** scraper has no tsx compilation configured — using `react: OutreachTemplate(...)` would fail at runtime because react-email and JSX aren't bundled in the scraper function
- **Fix:** Used `text: bodyWithSignature` (resolved body + appended signature) instead of react component; consistent with the scraper's existing non-JSX email.tsx which uses the JSX template separately
- **Files modified:** `scraper/src/alerts/campaign-dispatch.ts`
- **Verification:** TypeScript compiles; no react-email import needed in scraper alert module
- **Committed in:** 2cd5f17 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both required for dispatch to work correctly. No scope creep.

## Issues Encountered

None beyond the 2 auto-fixes above. Both builds pass cleanly (only pre-existing warnings).

## User Setup Required

No additional setup required beyond what Plan 04 already requires (Resend API key in Mail Settings). The campaign dispatch timer will run automatically in Azure once deployed.

## Next Phase Readiness

Phase 12 (Email & Call Campaigns) is now complete:
- Contact event logging (12-01/02)
- Activity timeline on property detail (12-02)
- Campaigns page + mail settings (12-03)
- Enrollment flow with step 0 immediate send (12-04)
- Daily dispatch timer + auto-stop + deal detail timeline (12-05)

The complete email campaign system is built end-to-end.

## Self-Check: PASSED

- scraper/src/alerts/campaign-dispatch.ts: FOUND
- scraper/src/functions/campaignDispatch.ts: FOUND
- scraper/src/db/schema.ts: modified (FOUND)
- scraper/src/index.ts: modified (FOUND)
- app/src/lib/deal-queries.ts: modified (FOUND)
- app/src/app/(dashboard)/deals/[id]/page.tsx: modified (FOUND)
- commit 2cd5f17: FOUND

---
*Phase: 12-email-call-campaigns*
*Completed: 2026-04-04*
