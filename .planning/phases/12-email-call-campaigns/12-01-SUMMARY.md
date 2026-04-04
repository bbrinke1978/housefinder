---
phase: 12-email-call-campaigns
plan: 01
subsystem: database
tags: [postgres, drizzle, resend, react-email, campaigns, email, typescript]

# Dependency graph
requires:
  - phase: 06-data-analytics-insights
    provides: callLogs/callOutcomeEnum tables that this extends with contactEvents
  - phase: 08-wholesaling-deal-flow
    provides: deals/leads tables that campaign FKs reference

provides:
  - contactEvents table for logging all outreach touchpoints
  - emailSequences + emailSteps tables for multi-step drip campaigns
  - campaignEnrollments table for tracking per-lead campaign state
  - emailSendLog table for Resend delivery tracking
  - ContactEventType, CampaignStatus, MailSettings, CallScript TypeScript types
  - DEFAULT_SEQUENCE_DELAY_DAYS [1,3,7,14,30] constant (Brian's cadence)
  - CALL_SCRIPTS pre-built scripts (Acquisitions, Dispositions, Agent, JV, Objection)

affects:
  - 12-02 (email sending service uses emailSequences/emailSteps)
  - 12-03 (call logging UI uses contactEvents + CALL_SCRIPTS)
  - 12-04 (campaigns page uses EmailSequenceSummary/EnrollmentWithDetails types)

# Tech tracking
tech-stack:
  added:
    - resend@^6 (transactional email sending)
    - "@react-email/components" (email template components)
  patterns:
    - drizzle InferSelectModel exports for all new tables
    - scraperConfig key-value pattern extended for MAIL_SETTINGS_KEYS
    - pgEnum for contactEventTypeEnum (type safety on event logging)

key-files:
  created:
    - app/drizzle/0004_goofy_la_nuit.sql
    - app/drizzle/meta/0004_snapshot.json
  modified:
    - app/src/db/schema.ts
    - app/src/types/index.ts
    - app/package.json
    - app/package-lock.json

key-decisions:
  - "DEFAULT_SEQUENCE_DELAY_DAYS [1,3,7,14,30] stored as constant — mirrors Brian's Day 1/3/7/14/30 call cadence from CONTEXT.md update"
  - "CALL_SCRIPTS object includes 5 pre-built scripts from Brian's sales training (Acquisitions, Dispositions, Agent Partnership, JV Partner, Objection Handling) with {senderName}/{city}/{address} merge fields"
  - "contactEventTypeEnum as pgEnum for DB-level type safety; matches reference app contact types exactly"
  - "emailSteps.delayDays comment documents Day 1/3/7/14/30 cadence intent at schema level"
  - "campaignEnrollments.stopReason text column (deal_closed/unenrolled/completed/email_bounced/re_enrolled) — auto-stop triggers from deal stage changes"
  - "touchpointCount added as optional field to PropertyWithLead — populated by queries in future plans"

patterns-established:
  - "Campaign schema pattern: sequences → steps (unique index on sequenceId+stepNumber) → enrollments → sendLog"
  - "ContactEvent as primary touchpoint log; timeline queries union contactEvents + leadNotes + emailSendLog"
  - "MAIL_SETTINGS_KEYS object maps TS keys to scraperConfig DB keys (mail.fromName, mail.resendApiKey, etc)"

requirements-completed: [CAMP-01, CAMP-02]

# Metrics
duration: 8min
completed: 2026-04-02
---

# Phase 12 Plan 01: Email Campaign & Contact Event Schema Summary

**5-table Drizzle schema for email drip campaigns and contact event logging, with Resend installed and pre-built Acquisitions/Dispositions/JV/Objection call scripts as TypeScript constants**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-02T00:00:00Z
- **Completed:** 2026-04-02T00:08:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added 5 new tables to schema.ts: contactEvents, emailSequences, emailSteps, campaignEnrollments, emailSendLog — all with proper FK references to leads.id and correct indexes
- Generated Drizzle migration 0004_goofy_la_nuit.sql (no local apply — runs at Azure deploy time)
- Exported ContactEventType, CampaignStatus, EmailSequenceSummary, EnrollmentWithDetails, ContactEvent, TimelineEntry, MailSettings interfaces plus CALL_SCRIPTS, DEFAULT_SEQUENCE_DELAY_DAYS, and CALL_SCRIPT_LABELS constants
- Installed resend@^6 and @react-email/components in app package; TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Add campaign and contact event schema + migration** - `60378c8` (feat)
2. **Task 2: Add TypeScript types and install npm dependencies** - `b79dc78` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `app/src/db/schema.ts` - Added contactEventTypeEnum + 5 new tables + InferSelectModel exports
- `app/drizzle/0004_goofy_la_nuit.sql` - Migration SQL for all 5 new tables + enum
- `app/drizzle/meta/0004_snapshot.json` - Drizzle snapshot for migration tracking
- `app/drizzle/meta/_journal.json` - Updated journal with migration entry
- `app/src/types/index.ts` - All campaign/contact/mail/call-script types + touchpointCount on PropertyWithLead
- `app/package.json` - resend + @react-email/components added
- `app/package-lock.json` - Lock file created

## Decisions Made
- Incorporated CONTEXT.md update: `DEFAULT_SEQUENCE_DELAY_DAYS = [1, 3, 7, 14, 30]` mirrors Brian's Day 1/3/7/14/30 sales cadence, documented in both schema comment and types constant
- Added `CALL_SCRIPTS` with all 5 pre-built scripts from Brian's sales training (Acquisitions, Dispositions, Agent Partnership, JV Partner, Objection Handling) with merge fields like `{senderName}`, `{city}`, `{address}` — these were not in the original plan but are in the updated CONTEXT.md and belong in the types foundation
- `CallScriptType` and `CALL_SCRIPT_LABELS` added alongside scripts for future call modal UI use

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added CALL_SCRIPTS and DEFAULT_SEQUENCE_DELAY_DAYS constants**
- **Found during:** Task 2 (TypeScript types)
- **Issue:** The objective prompt noted the CONTEXT.md was updated with pre-built call scripts and Day 1/3/7/14/30 cadence — these needed to be in the types foundation for all downstream plans
- **Fix:** Added `DEFAULT_SEQUENCE_DELAY_DAYS`, `CallScriptType`, `CALL_SCRIPT_LABELS`, and `CALL_SCRIPTS` to types/index.ts
- **Files modified:** app/src/types/index.ts
- **Verification:** TypeScript compiles cleanly (npx tsc --noEmit passes)
- **Committed in:** b79dc78 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (missing critical from CONTEXT.md update)
**Impact on plan:** CALL_SCRIPTS and cadence constants are foundational for plans 12-03 (call logging) and 12-04 (campaigns UI). No scope creep — these are types only, no backend logic.

## Issues Encountered
None — drizzle-kit generate ran cleanly producing 21 tables, tsc --noEmit passed with no errors.

## User Setup Required
None at this stage — Resend API key will be configured in Mail Settings UI (plan 12-05). No environment variables needed for schema + types.

## Next Phase Readiness
- All 5 campaign tables defined and migration generated — ready for plan 12-02 (email sending service)
- contactEventTypeEnum ready for plan 12-03 (contact event logging UI)
- CALL_SCRIPTS constant ready for plan 12-03 (call script modal)
- MailSettings + MAIL_SETTINGS_KEYS ready for plan 12-05 (mail settings page)
- touchpointCount on PropertyWithLead ready to be populated by dashboard query in plan 12-04

## Self-Check: PASSED

- app/src/db/schema.ts: FOUND
- app/drizzle/0004_goofy_la_nuit.sql: FOUND
- app/src/types/index.ts: FOUND
- .planning/phases/12-email-call-campaigns/12-01-SUMMARY.md: FOUND
- commit 60378c8: FOUND
- commit b79dc78: FOUND

---
*Phase: 12-email-call-campaigns*
*Completed: 2026-04-02*
