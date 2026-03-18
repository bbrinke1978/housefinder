---
phase: 01-data-foundation
plan: 04
subsystem: orchestration
tags: [azure-functions, timer-trigger, upsert, health-monitoring, drizzle, pipeline]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Drizzle schema (properties, distress_signals, scraper_health tables), db client"
  - phase: 01-02
    provides: "scrapeAssessor(), scrapeDelinquent(), scrapeRecorder() scrapers"
  - phase: 01-03
    provides: "scoreAllProperties() scoring engine, seedDefaultConfig() config seeder"
provides:
  - "dailyScrape timer trigger - Azure Functions v4 orchestrating full daily pipeline"
  - "upsertProperty() - parcelId dedup upsert for properties table"
  - "upsertSignal() - ON CONFLICT DO NOTHING insert for distress signals"
  - "upsertFromAssessor/Delinquent/Recorder() - source-specific upsert wrappers"
  - "updateScrapeHealth() - consecutive zero-result tracking per county"
  - "checkHealthAlert() - ERROR-level alerting at 3+ consecutive zero runs"
affects: [02-api, 03-frontend, 04-alerts]

# Tech tracking
tech-stack:
  added: ["@azure/functions"]
  patterns: [timer-trigger-orchestration, partial-failure-isolation, upsert-dedup, health-alerting]

key-files:
  created:
    - scraper/src/functions/dailyScrape.ts
    - scraper/src/lib/upsert.ts
    - scraper/src/lib/health.ts

key-decisions:
  - "Each scraper runs in independent try/catch for partial failure tolerance"
  - "runOnStartup: false to prevent scale-out event firing in production"
  - "Health alert threshold at 3 consecutive zero-result runs"

patterns-established:
  - "Pipeline orchestrator pattern: seed config -> scrape sources -> upsert -> score -> health check"
  - "Partial failure isolation: each scraper in its own try/catch, pipeline continues on individual failure"
  - "Upsert pattern: parcelId conflict for properties, composite key DO NOTHING for signals"

requirements-completed: [DATA-08]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 1 Plan 4: Daily Scrape Pipeline Summary

**Azure Functions timer trigger orchestrating Carbon County scrapers with parcelId dedup upsert, distress scoring, and consecutive-zero health alerting**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T20:23:01Z
- **Completed:** 2026-03-18T20:24:47Z
- **Tasks:** 3 (2 auto + 1 checkpoint auto-approved)
- **Files modified:** 3

## Accomplishments
- Built upsert layer with parcelId deduplication for properties and composite-key DO NOTHING for distress signals
- Built dailyScrape Azure Functions timer trigger orchestrating the full daily pipeline at 5 AM Mountain Time
- Implemented health monitoring tracking consecutive zero-result runs with ERROR-level alerting at 3+
- Each scraper runs independently with error isolation -- partial failures do not block the rest of the pipeline
- Pipeline sequence: seed config -> scrape assessor -> scrape delinquent -> scrape recorder -> upsert all -> score all -> health check

## Task Commits

Each task was committed atomically:

1. **Task 1: Create upsert utilities and health monitoring** - `8b7a801` (feat)
2. **Task 2: Create dailyScrape timer trigger function** - `c726e6c` (feat)
3. **Task 3: Verify pipeline deploys** - auto-approved (checkpoint, no commit)

## Files Created/Modified
- `scraper/src/lib/upsert.ts` - Property upsert (parcelId dedup), signal insert (DO NOTHING), source-specific wrappers for assessor/delinquent/recorder
- `scraper/src/lib/health.ts` - Scraper health tracking with consecutive zero-result counting and ERROR-level alerting
- `scraper/src/functions/dailyScrape.ts` - Azure Functions v4 timer trigger orchestrating the complete daily scrape pipeline

## Decisions Made
- **Partial failure isolation** -- Each scraper wrapped in independent try/catch so assessor failure does not prevent delinquent from running. Health updated per-scraper.
- **runOnStartup: false** -- Research explicitly warned this fires on every scale-out event. Manual testing via Azure Portal instead.
- **Health alert at 3 consecutive zeros** -- Three zero-result runs triggers ERROR log. Balances sensitivity (catch real issues) with noise reduction (temporary empty results).

## Deviations from Plan

None - plan executed exactly as written. Checkpoint (Task 3) was auto-approved per auto-advance configuration.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required for code. Azure deployment (Function App, DATABASE_URL, WEBSITE_TIME_ZONE=America/Denver) is handled via GitHub Actions and Azure Portal configuration.

## Next Phase Readiness
- Phase 1 data foundation is complete: schema, scrapers, scoring, and orchestration all wired together
- Push to main triggers GitHub Actions deployment of the scraper Function App
- Timer runs daily at 5 AM Mountain Time with zero manual intervention
- Ready for Phase 2 (API layer) to expose properties, leads, and health data to the frontend

## Self-Check: PASSED

All 3 created files verified on disk. Both task commits (8b7a801, c726e6c) verified in git log.

---
*Phase: 01-data-foundation*
*Completed: 2026-03-18*
