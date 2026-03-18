---
phase: 03-contact-and-alerts
plan: 02
subsystem: alerts
tags: [resend, twilio, react-email, sms, email-digest, alert-pipeline]

# Dependency graph
requires:
  - phase: 03-01
    provides: "alertHistory, ownerContacts, leads schema; resend, twilio, react-email packages; jsx tsconfig"
  - phase: 01-03
    provides: "scoreAllProperties scoring engine that sets isHot and distressScore on leads"
  - phase: 01-04
    provides: "dailyScrape pipeline orchestrator with timer trigger"
provides:
  - "sendDigestEmail: batched email digest via Resend for hot leads"
  - "sendSmsAlert: per-lead SMS via Twilio with TCPA-compliant to: from env"
  - "sendAlerts: orchestrator with configurable thresholds and alert_history deduplication"
  - "dailyScrape Step 5: alert integration after scoring"
affects: [03-03, 05-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns: [react-email-template-as-function-call, alert-deduplication-via-history-table, non-fatal-alert-step]

key-files:
  created:
    - scraper/src/alerts/email.tsx
    - scraper/src/alerts/sms.ts
    - scraper/src/alerts/index.ts
  modified:
    - scraper/src/functions/dailyScrape.ts

key-decisions:
  - "Email digest sent as function call HotLeadDigest({leads, appUrl}) not JSX -- avoids .tsx requirement in orchestrator"
  - "SMS to: always from ALERT_PHONE_NUMBER env var, never from owner_contacts table (TCPA compliance)"
  - "Alert config defaults (email threshold 2, SMS threshold 3) match scoring hot_lead_threshold of 4"

patterns-established:
  - "Alert deduplication: alert_history unique on (leadId, channel, runDate) prevents re-alerting same lead same day"
  - "Non-fatal alert step: try/catch around sendAlerts in dailyScrape so scraping/scoring always completes"
  - "Per-SMS try/catch: one Twilio failure does not block remaining SMS sends"

requirements-completed: [ALERT-01, ALERT-02, ALERT-03, ALERT-04]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 3 Plan 2: Alert Pipeline Summary

**Resend email digest and Twilio SMS alerts with configurable thresholds, alert_history deduplication, and non-fatal dailyScrape integration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T23:39:59Z
- **Completed:** 2026-03-18T23:41:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- HotLeadDigest react-email template with branded layout, score badges, signal list, and View Lead buttons
- sendSmsAlert with TCPA-compliant to: from env var and graceful degradation when Twilio not configured
- sendAlerts orchestrator with configurable thresholds from scraperConfig and alert_history deduplication
- dailyScrape Step 5 integration -- alerts fire after scoring, non-fatal on failure

## Task Commits

Each task was committed atomically:

1. **Task 1: Create email template and SMS sender modules** - `cb4e276` (feat)
2. **Task 2: Create alert orchestrator and wire into dailyScrape pipeline** - `3313208` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `scraper/src/alerts/email.tsx` - HotLeadDigest react-email component, AlertLead interface, sendDigestEmail function
- `scraper/src/alerts/sms.ts` - sendSmsAlert function using Twilio with TCPA-compliant to: from env
- `scraper/src/alerts/index.ts` - sendAlerts orchestrator with config loading, hot lead queries, deduplication
- `scraper/src/functions/dailyScrape.ts` - Added Step 5 (alerts) after scoring, summary shifted to Step 6

## Decisions Made
- Email digest sent as function call `HotLeadDigest({leads, appUrl})` not JSX to avoid .tsx requirement in orchestrator
- SMS `to:` always from `ALERT_PHONE_NUMBER` env var, never from owner_contacts table (TCPA compliance)
- Alert config defaults (email threshold 2, SMS threshold 3) allow flexible tuning via scraperConfig table
- Graceful degradation: both email and SMS return `{ sent: false }` when env vars missing instead of throwing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

Environment variables needed for alert delivery:
- `RESEND_API_KEY` - Resend API key for email digest
- `ALERT_EMAIL` - Recipient email address for hot lead digest
- `TWILIO_ACCOUNT_SID` - Twilio account SID for SMS
- `TWILIO_AUTH_TOKEN` - Twilio auth token for SMS
- `TWILIO_PHONE_NUMBER` - Twilio from number for SMS
- `ALERT_PHONE_NUMBER` - Recipient phone number for SMS alerts
- `APP_URL` - App base URL for lead links (defaults to https://housefinder.azurewebsites.net)

## Next Phase Readiness
- Alert pipeline complete, ready for 03-03 (alert settings UI or remaining contact features)
- Env vars must be configured in Azure App Settings before alerts will fire in production

## Self-Check: PASSED

- All 4 created/modified files exist on disk
- Commits cb4e276 and 3313208 verified in git log
- TypeScript compiles cleanly (npx tsc --noEmit)
- No owner_contacts phone references in alerts code
- All imports use .js extensions (ESM)

---
*Phase: 03-contact-and-alerts*
*Completed: 2026-03-18*
