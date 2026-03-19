---
phase: 04-county-expansion
plan: 01
subsystem: scraper
tags: [playwright, pdf-parse, wpDataTables, azure-functions, emery-county]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: scraper infrastructure, upsert layer, health tracking, validation schemas
provides:
  - County-parameterized upsert (upsertProperty, upsertFromAssessor, upsertFromDelinquent accept county param)
  - Emery County tax roll scraper (wpDataTables pattern)
  - Emery County delinquent PDF parser (pdf-parse v2 with dynamic URL discovery)
  - Staggered Azure Function timer for Emery (5:15 AM)
  - Annual PDF parse tracking via scraperConfig
affects: [04-02, 04-03, county-expansion]

# Tech tracking
tech-stack:
  added: [pdf-parse v2.4.5]
  patterns: [county-parameterized upsert, annual PDF parse tracking, staggered timer schedule]

key-files:
  created:
    - scraper/src/sources/emery-tax-roll.ts
    - scraper/src/sources/emery-delinquent-pdf.ts
    - scraper/src/functions/emeryScrape.ts
  modified:
    - scraper/src/lib/upsert.ts
    - scraper/src/lib/validation.ts
    - scraper/package.json

key-decisions:
  - "pdf-parse v2 class-based API (PDFParse.getText().text) — @types/pdf-parse incompatible with v2, removed"
  - "County param defaults to 'carbon' for backward compatibility — existing Carbon pipeline unchanged"
  - "Annual PDF parse tracking via scraperConfig key emery.delinquent.lastParsedYear"

patterns-established:
  - "County-parameterized upsert: pass county string to upsertFromAssessor/upsertFromDelinquent for multi-county"
  - "PDF delinquent parser: discover URL dynamically from treasurer page, parse with pdf-parse v2, validate with Zod"
  - "Staggered timer: each county offset by 15 minutes (Carbon 5:00, Emery 5:15)"
  - "Annual PDF skip: track lastParsedYear in scraperConfig to avoid re-parsing same year"

requirements-completed: [DATA-04]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 4 Plan 01: Emery County Scraper Summary

**Emery County wpDataTables tax roll scraper + PDF delinquent parser with county-parameterized upsert layer and 5:15 AM staggered timer**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-19T01:40:52Z
- **Completed:** 2026-03-19T01:45:38Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- County-parameterized upsert layer: upsertProperty, upsertFromAssessor, upsertFromDelinquent all accept optional county parameter with "carbon" default
- Emery County tax roll scraper cloned from Carbon assessor pattern with Emery-specific URL and column variants (Primary Name, Tax 2025)
- Emery County delinquent PDF parser with dynamic URL discovery from treasurer page and pdf-parse v2 text extraction
- Azure Function timer at 5:15 AM for Emery County (15 minutes after Carbon at 5:00 AM)
- Annual PDF parse tracking prevents redundant re-parsing within same year

## Task Commits

Each task was committed atomically:

1. **Task 1: Parameterize upsert for multi-county support + install pdf-parse** - `77f6880` (feat)
2. **Task 2: Emery County tax roll scraper + delinquent PDF parser + Azure Function timer** - `74f4b82` (feat)

## Files Created/Modified
- `scraper/src/sources/emery-tax-roll.ts` - wpDataTables scraper for Emery County tax roll (clone of Carbon pattern)
- `scraper/src/sources/emery-delinquent-pdf.ts` - Annual PDF parser with dynamic URL discovery and pdf-parse v2
- `scraper/src/functions/emeryScrape.ts` - Azure Function timer trigger at 5:15 AM with per-county health tracking
- `scraper/src/lib/upsert.ts` - Added optional county param to upsertProperty, upsertFromAssessor, upsertFromDelinquent
- `scraper/src/lib/validation.ts` - Added optional county field to propertyRecordSchema and delinquentRecordSchema
- `scraper/package.json` - Added pdf-parse dependency, removed @types/pdf-parse

## Decisions Made
- Used pdf-parse v2 class-based API (PDFParse constructor + getText()) instead of v1 function API -- v2 was installed by npm, @types/pdf-parse only covers v1 so was removed
- County parameter defaults to "carbon" via `county ?? record.county ?? "carbon"` chain for full backward compatibility
- Annual PDF parse tracked via scraperConfig key `emery.delinquent.lastParsedYear` to avoid redundant parsing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed incompatible @types/pdf-parse**
- **Found during:** Task 2 (emery-delinquent-pdf.ts creation)
- **Issue:** @types/pdf-parse defines v1 function API (`export = PdfParse`) but installed pdf-parse v2.4.5 uses class-based API (`export class PDFParse`). TypeScript compilation failed with "has no default export".
- **Fix:** Uninstalled @types/pdf-parse, used pdf-parse v2 built-in .d.ts types with named import `{ PDFParse }` and class-based `getText().text` API.
- **Files modified:** scraper/package.json
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 74f4b82 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required fix for pdf-parse v2 API compatibility. No scope creep.

## Issues Encountered
None beyond the pdf-parse types deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- County-parameterized upsert pattern established for Plan 04-03 (Sevier/Juab/Millard/Sanpete)
- pdf-parse installed and working for Plan 04-03 PDF-only county parsers
- Staggered timer pattern established (next counties: 5:30, 5:45, etc.)

---
*Phase: 04-county-expansion*
*Completed: 2026-03-18*
