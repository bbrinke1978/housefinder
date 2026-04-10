---
phase: 18-tracerfy-options
plan: 01
subsystem: api
tags: [tracerfy, skip-trace, server-actions, drizzle, zod]

# Dependency graph
requires:
  - phase: 03-contact-and-alerts
    provides: ownerContacts table with (propertyId, source) unique constraint
  - phase: 12-email-call-campaigns
    provides: MAIL_SETTINGS_KEYS pattern for scraperConfig key-value config storage
provides:
  - TRACERFY_CONFIG_KEYS constant in types/index.ts
  - TracerfyRunEntry, TracerfyStatus, TracerfyConfig interfaces in types/index.ts
  - runSkipTrace server action (single property)
  - runBulkSkipTrace server action (batch)
  - getTracerfyStatus server action (API key check + balance)
  - getTracerfyRunHistory server action (from scraperConfig)
  - getTracerfyConfig server action (lowBalanceThreshold, monthlyCap)
  - saveTracerfyConfig server action (zod-validated upsert)
affects: [18-02, 18-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - TRACERFY_CONFIG_KEYS follows MAIL_SETTINGS_KEYS scraperConfig pattern
    - PascalCase-dash field names from Tracerfy API (Email-1, Mobile-1, Landline-1)
    - Poll-until-complete pattern with MAX_POLL_MS=25000 (under Netlify 26s limit)
    - property_id in json_data payload for reliable result matching vs address+city fallback
    - Run history stored as JSON array in scraperConfig (keep last 50)
    - Monthly spend tracking resets on new calendar month

key-files:
  created:
    - app/src/lib/tracerfy-actions.ts
  modified:
    - app/src/types/index.ts

key-decisions:
  - "PascalCase-dash field names (Email-1, Mobile-1, Landline-1) — fixes scraper bug where snake_case was used and returned no results"
  - "MAX_POLL_MS=25000 not MAX_POLL_ATTEMPTS — wall-clock limit stays under Netlify 26s serverless function timeout"
  - "property_id included in json_data payload for reliable result matching — address+city fallback only for cases where property_id missing"
  - "Additional phones stored with type-encoded source: tracerfy-mobile-2, tracerfy-landline-1 — encodes phone type and position"
  - "getTracerfyStatus has no auth check — called from settings page for display purposes"
  - "COST_PER_TRACE=0.02 stored as constant — used when credits_deducted missing from API response"

patterns-established:
  - "Tracerfy server actions return union {success: true, ...} | {error: string} — never throw, compatible with useTransition"
  - "scraperConfig key-value pattern for Tracerfy config — matches mail-settings-actions.ts approach"
  - "onConflictDoUpdate target: [propertyId, source] for ownerContacts upserts"

requirements-completed: [TRACE-01, TRACE-02, TRACE-03, TRACE-04, TRACE-09]

# Metrics
duration: 3min
completed: 2026-04-10
---

# Phase 18 Plan 01: Tracerfy Actions Summary

**Six Tracerfy server actions with corrected PascalCase-dash field extraction, 25s Netlify-safe polling, and scraperConfig-backed run history**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-10T22:03:05Z
- **Completed:** 2026-04-10T22:05:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created complete Tracerfy backend API layer (tracerfy-actions.ts) with all 6 exported server actions
- Fixed critical bug from scraper: PascalCase-dash field names (Email-1, Mobile-1, Landline-1) replacing incorrect snake_case (email_1, mobile_1)
- Added TRACERFY_CONFIG_KEYS, TracerfyRunEntry, TracerfyStatus, TracerfyConfig to types/index.ts following MAIL_SETTINGS_KEYS pattern
- Poll loop uses wall-clock MAX_POLL_MS=25000 to stay safely under Netlify's 26s serverless limit
- Run history persists to scraperConfig as JSON array (last 50 entries) with per-month spend tracking

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Tracerfy types and config constants to types/index.ts** - `ad16bfc` (feat)
2. **Task 2: Create tracerfy-actions.ts with all server actions** - `cfa7f6b` (feat)

**Plan metadata:** (next commit - docs)

## Files Created/Modified

- `app/src/lib/tracerfy-actions.ts` - All 6 Tracerfy server actions with private helpers
- `app/src/types/index.ts` - TRACERFY_CONFIG_KEYS constant + 3 new interfaces

## Decisions Made

- **PascalCase-dash field names** — scraper used snake_case (email_1) which returns no results from Tracerfy API; correct names are Email-1, Mobile-1, Landline-1
- **MAX_POLL_MS wall-clock limit** — more reliable than attempt count for staying under Netlify's 26s function timeout
- **property_id in json_data** — Tracerfy echoes back submitted fields, enabling reliable result-to-property matching; address+city used as fallback only
- **Type-encoded phone sources** — "tracerfy-mobile-2", "tracerfy-landline-1" let UI display phone type without extra lookup
- **No auth check on getTracerfyStatus** — display-only action for settings page, session may not exist at render time

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

To enable Tracerfy skip tracing:

1. Set `TRACERFY_API_KEY` environment variable in Netlify dashboard (Site Settings > Environment Variables)
2. Verify with `getTracerfyStatus()` — returns `{ configured: true, balance: N }`

## Next Phase Readiness

- All 6 server actions are compiled and exported — Plans 02 and 03 can import and call them directly
- Types are in place for UI components to use TracerfyStatus, TracerfyConfig, TracerfyRunEntry
- ownerContacts upsert pattern established for additional phone types

---
*Phase: 18-tracerfy-options*
*Completed: 2026-04-10*
