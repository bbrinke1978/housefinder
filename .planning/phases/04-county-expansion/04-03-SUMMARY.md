---
phase: 04-county-expansion
plan: 03
subsystem: scraper
tags: [pdf-parse, playwright, azure-functions, timer-trigger, delinquent-tax]

requires:
  - phase: 04-01
    provides: "County-parameterized upsert, pdf-parse v2, emery PDF parser pattern"
provides:
  - "Shared PDF delinquent parser factory (parsePdfDelinquent + PdfCountyConfig)"
  - "4 county timer functions: Sevier, Juab, Millard, Sanpete"
  - "6 total staggered scrapers covering all target counties"
affects: [05-enrichment]

tech-stack:
  added: []
  patterns: [factory-config PDF parser, generic line parser per county, annual parse skip via scraperConfig]

key-files:
  created:
    - scraper/src/sources/pdf-delinquent-parser.ts
    - scraper/src/functions/sevierScrape.ts
    - scraper/src/functions/juabScrape.ts
    - scraper/src/functions/millardScrape.ts
    - scraper/src/functions/sanpeteScrape.ts
  modified: []

key-decisions:
  - "Factory pattern for PDF parser -- PdfCountyConfig type with per-county line parser, URL, and text pattern"
  - "Generic line parser matches parcel pattern XX-XXXX-XXXX at line start with dollar amount extraction"
  - "Inline annual skip logic per handler (simpler than shared helper for 4 small files)"

patterns-established:
  - "PdfCountyConfig: county config object with treasurerPageUrl, pdfLinkTextPattern, lineParser"
  - "makeGenericDelinquentLineParser factory for counties with similar PDF formats"

requirements-completed: [DATA-04]

duration: 3min
completed: 2026-03-18
---

# Phase 4 Plan 3: PDF County Scrapers Summary

**Shared PDF delinquent parser factory with 4 county-specific Azure Function timers for Sevier, Juab, Millard, and Sanpete**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-19T01:48:14Z
- **Completed:** 2026-03-19T01:50:55Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Shared PDF parser module with factory pattern -- per-county config for URL discovery, link matching, and line parsing
- 4 Azure Function timers at staggered schedules: Sevier (5:30), Juab (5:45), Millard (6:00), Sanpete (6:15)
- All 6 target counties now have independent scrapers with per-county health tracking
- Annual parse skip logic prevents wasteful daily PDF downloads

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared PDF delinquent parser with per-county configuration** - `49046e3` (feat)
2. **Task 2: Four county Azure Function timers with staggered scheduling** - `9c47235` (feat)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `scraper/src/sources/pdf-delinquent-parser.ts` - Shared PDF parser factory with PdfCountyConfig type, parsePdfDelinquent function, makeGenericDelinquentLineParser, and 4 county configs
- `scraper/src/functions/sevierScrape.ts` - Sevier County timer at 5:30 AM
- `scraper/src/functions/juabScrape.ts` - Juab County timer at 5:45 AM
- `scraper/src/functions/millardScrape.ts` - Millard County timer at 6:00 AM
- `scraper/src/functions/sanpeteScrape.ts` - Sanpete County timer at 6:15 AM

## Decisions Made
- Factory pattern for PDF parser: PdfCountyConfig type with per-county lineParser, treasurerPageUrl, and pdfLinkTextPattern enables adding new PDF counties with minimal code
- Generic line parser is intentionally generous -- matches parcel patterns broadly and lets Zod validation filter invalid records
- Annual skip logic inlined per handler rather than extracted to shared helper -- acceptable duplication for 4 small ~150-line files
- Millard config uses `/deli[nq]*uent/i` regex to match both correct spelling and known "Deliquent" typo on their site

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 target counties (Carbon, Emery, Sevier, Juab, Millard, Sanpete) have independent scrapers
- Phase 4 county expansion complete -- ready for Phase 5 enrichment
- PDF URL discovery is dynamic (Playwright scrapes treasurer pages) so links auto-update when counties publish new year's lists

## Self-Check: PASSED

- All 5 created files exist on disk
- Commit 49046e3 (Task 1) verified in git log
- Commit 9c47235 (Task 2) verified in git log
- TypeScript compilation clean (zero errors)
- All 6 timers have runOnStartup: false

---
*Phase: 04-county-expansion*
*Completed: 2026-03-18*
