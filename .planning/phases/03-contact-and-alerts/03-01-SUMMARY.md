---
phase: 03-contact-and-alerts
plan: 01
subsystem: database
tags: [drizzle, resend, twilio, react-email, postgresql, alerts]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: properties, leads, scraperConfig tables
provides:
  - ownerContacts table for contact storage per property
  - alertHistory table for dedup of email/sms notifications
  - Alert config keys in scraperConfig (thresholds, recipients, enabled flags)
  - JSX support in scraper for react-email templates
  - Resend, Twilio, react-email dependencies installed
  - OwnerContact TypeScript type for app UI
affects: [03-02 alert pipeline, 03-03 contact UI]

# Tech tracking
tech-stack:
  added: [resend, twilio, @react-email/components, react, react-dom, @types/react, @types/react-dom]
  patterns: [shared schema definitions across scraper and app, config-driven alert thresholds]

key-files:
  created:
    - scraper/src/db/migrations/0000_steady_karnak.sql
    - app/drizzle/0000_equal_banshee.sql
  modified:
    - scraper/src/db/schema.ts
    - app/src/db/schema.ts
    - scraper/tsconfig.json
    - scraper/package.json
    - scraper/src/db/seed-config.ts
    - app/src/types/index.ts

key-decisions:
  - "Alert config keys use same scraperConfig table with onConflictDoNothing for idempotent seeding"
  - "ownerContacts unique on (propertyId, source) to allow multiple sources per property without duplicates"

patterns-established:
  - "Shared schema pattern: identical table definitions in scraper and app schema files"
  - "Alert thresholds configurable via scraperConfig key-value pairs"

requirements-completed: [CONTACT-01, CONTACT-02]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 3 Plan 1: Contact & Alert Foundation Summary

**owner_contacts and alert_history tables with Resend/Twilio/react-email dependencies and alert config seeding**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T23:35:33Z
- **Completed:** 2026-03-18T23:37:39Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- owner_contacts and alert_history tables added identically to both scraper and app schemas
- JSX support configured in scraper tsconfig for react-email templates
- Resend, Twilio, react-email, React packages installed in scraper
- 6 alert config keys seeded (email/sms enabled, thresholds, recipients)
- Drizzle migrations generated for both scraper and app
- OwnerContact TypeScript type exported from app

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tables, JSX support, dependencies, types** - `aaf9c33` (feat)
2. **Task 2: Seed alert config keys, generate migrations** - `7aec230` (feat)

## Files Created/Modified
- `scraper/src/db/schema.ts` - Added ownerContacts and alertHistory table definitions
- `app/src/db/schema.ts` - Matching ownerContacts and alertHistory table definitions
- `scraper/tsconfig.json` - Added jsx: react-jsx, jsxImportSource: react, .tsx includes
- `scraper/package.json` - Added resend, twilio, @react-email/components, react, react-dom, @types/react, @types/react-dom
- `scraper/src/db/seed-config.ts` - Added 6 alert config keys with onConflictDoNothing
- `app/src/types/index.ts` - Added OwnerContact interface
- `scraper/src/db/migrations/0000_steady_karnak.sql` - Drizzle migration for scraper tables
- `app/drizzle/0000_equal_banshee.sql` - Drizzle migration for app tables

## Decisions Made
- Alert config keys use the existing scraperConfig key-value table with onConflictDoNothing for idempotent seeding
- ownerContacts has a unique index on (propertyId, source) to allow multiple contact sources per property while preventing duplicates

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

External services will require configuration before Plan 02 (alert pipeline) can send alerts:
- **Resend**: RESEND_API_KEY, ALERT_EMAIL env vars
- **Twilio**: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, ALERT_PHONE_NUMBER env vars
- A2P 10DLC registration required for Twilio SMS in production

## Next Phase Readiness
- Schema tables and migrations ready for Plan 02 (alert pipeline) and Plan 03 (contact UI)
- Alert config keys seeded with sensible defaults
- JSX support ready for react-email template authoring
- All dependencies installed and TypeScript compilation verified

---
*Phase: 03-contact-and-alerts*
*Completed: 2026-03-18*
