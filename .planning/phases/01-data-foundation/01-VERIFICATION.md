---
phase: 01-data-foundation
verified: 2026-03-18T21:00:00Z
status: gaps_found
score: 4/5 success criteria verified
re_verification: false
gaps:
  - truth: "Properties with 2 or more distress signals are marked as hot leads automatically"
    status: partial
    reason: "Implementation uses weighted score threshold (>= 4), not signal count (>= 2). A property with one NOD signal (weight 3) is NOT flagged as hot. A property with two tax_lien signals (total weight 4) IS hot. REQUIREMENTS.md SCORE-03 states '2+ distress signals', ROADMAP success criterion 3 states '2 or more distress signals' — but the scoring engine uses a weighted score threshold that does not map 1:1 to signal count. The PLAN 03 intentionally chose threshold=4, but this was never reconciled against SCORE-03/success criterion 3."
    artifacts:
      - path: "scraper/src/scoring/score.ts"
        issue: "scoreProperty() computes is_hot as score >= hot_lead_threshold (default 4), not active_signal_count >= 2. The active_signal_count field is calculated but never used for hot lead determination."
      - path: "scraper/src/db/seed-config.ts"
        issue: "hot_lead_threshold defaults to 4. Description says 'NOD alone (3) is not hot' — confirming that a single high-urgency signal does not trigger hot lead status."
    missing:
      - "Reconcile SCORE-03 / success criterion 3 with the weighted scoring design: either (a) change the requirement to reflect weighted-score semantics, or (b) add a signal_count_threshold check alongside the weighted score threshold, or (c) lower hot_lead_threshold to 3 so a single NOD triggers hot lead"
human_verification:
  - test: "Trigger dailyScrape function manually from Azure Portal"
    expected: "Properties and distress signals appear in the database within 15 minutes, lead scores calculated, health status updated"
    why_human: "Requires live Azure environment with DATABASE_URL configured. Cannot verify end-to-end pipeline execution or actual scraping of Carbon County pages programmatically."
  - test: "Verify scraper reaches Carbon County pages"
    expected: "carbon-assessor.ts successfully loads https://www.carbon.utah.gov/service/property-search/ and finds wpDataTable rows; carbon-delinquent.ts successfully loads https://www.carbon.utah.gov/service/delinquent-properties/ and finds rows"
    why_human: "Requires live browser execution. The scraper has fallback logic for empty tables but actual wpDataTables page structure cannot be verified without running Playwright against the live site."
  - test: "Confirm GitHub Actions deployment runs successfully"
    expected: "Push to main triggers build + Playwright install + deploy to func-housefinder-scraper; workflow passes green"
    why_human: "Requires checking https://github.com/bbrinke1978/housefinder/actions — no git remote access from this environment."
---

# Phase 1: Data Foundation Verification Report

**Phase Goal:** Carbon County distressed properties are discovered, scored, and stored daily with zero manual intervention
**Verified:** 2026-03-18T21:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running the scheduled job causes new property records to appear in the database within 15 minutes, sourced from Carbon County assessor and recorder data | ? UNCERTAIN | Timer trigger exists at `0 0 5 * * *`, assessor/delinquent scrapers are substantive Playwright implementations. Cannot verify execution without live Azure environment. |
| 2 | Each property has a first-seen date and a calculated distress score based on its active signal count | VERIFIED | `properties.firstSeenAt` is set on insert via `defaultNow()` (never overwritten on upsert). `scoreAllProperties()` computes and upserts `distressScore` to `leads` table for every property with active signals. |
| 3 | Properties with 2 or more distress signals are marked as hot leads automatically | PARTIAL | `scoreAllProperties()` sets `isHot = true` when weighted score >= 4, not when signal count >= 2. A property with one NOD (weight 3) stays NOT hot. Two signals with total weight 4+ are hot. SCORE-03 and ROADMAP SC3 say "2+ signals" but implementation uses weighted threshold. |
| 4 | Each distress signal is stored as a distinct row linked to its property, with a recording date | VERIFIED | `distressSignals` table has `propertyId` FK, `signalType` enum, `recordedDate` date column, and a `UNIQUE(propertyId, signalType, recordedDate)` dedup constraint. `upsertSignal()` uses `onConflictDoNothing()`. |
| 5 | A scraper health check shows the last successful run time and raises a system alert after 3 consecutive zero-result runs | VERIFIED | `scraperHealth` table tracks `lastSuccessAt`, `consecutiveZeroResults`. `checkHealthAlert()` queries the table and calls `console.error(ALERT: ...)` at threshold >= 3. Called from `dailyScrape.ts` after every run. |

**Score:** 4/5 truths verified (1 partial — SCORE-03 hot lead semantics mismatch)

---

## Required Artifacts

### Plan 01-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scraper/src/db/schema.ts` | All 5 Drizzle table definitions | VERIFIED | All 5 tables present: `properties`, `distressSignals`, `leads`, `scraperHealth`, `scraperConfig`. 3 enums: `signalTypeEnum`, `signalStatusEnum`, `ownerTypeEnum`. |
| `scraper/src/db/client.ts` | PostgreSQL pool with SSL + drizzle | VERIFIED | `pg.Pool` with `ssl: { rejectUnauthorized: true }`, max:3, timeouts. `drizzle({ client: pool, schema })` exported. |
| `scraper/package.json` | All project dependencies | VERIFIED | `@azure/functions`, `drizzle-orm`, `pg`, `playwright`, `zod`, `date-fns`, `p-limit`, `cheerio` all present. ESM (`"type": "module"`). `main: "dist/src/functions/*.js"`. |
| `scraper/drizzle.config.ts` | Drizzle Kit migration config | VERIFIED | File exists, confirmed in SUMMARY. |

### Plan 01-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scraper/src/sources/carbon-assessor.ts` | Exports `scrapeAssessor()` | VERIFIED | Full Playwright implementation: dynamic header map, pagination with rate limiting, Zod validation, try/finally browser close. |
| `scraper/src/sources/carbon-delinquent.ts` | Exports `scrapeDelinquent()` | VERIFIED | Full Playwright implementation matching assessor pattern. Extracts parcel, owner, year, amountDue, propertyAddress, propertyCity. |
| `scraper/src/sources/carbon-recorder.ts` | Exports `scrapeRecorder()` (or placeholder) | VERIFIED | Documented placeholder: returns `[]`, warns via `console.warn`, includes contact info, full TODO documenting expected implementation, exports `RecorderRecord` type. |
| `scraper/src/lib/validation.ts` | Zod schemas for scraped data | VERIFIED | Exports `propertyRecordSchema`, `delinquentRecordSchema`, `recorderRecordSchema` and their inferred types. |

### Plan 01-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scraper/src/scoring/score.ts` | Exports `scoreProperty` and `scoreAllProperties` | VERIFIED | Pure function and DB orchestrator both present. Reads `scraperConfig` for weights, joins `properties` + `distressSignals`, upserts `leads`. |
| `scraper/src/scoring/types.ts` | Exports `SignalConfig`, `ScoringConfig`, `ScoreResult` | VERIFIED | All four types present: `SignalConfig`, `ScoringConfig`, `ScoreResult`, `SignalInput`. |
| `scraper/src/db/seed-config.ts` | Exports `seedDefaultConfig` | VERIFIED | Idempotent seed using `onConflictDoNothing()`. NOD=3, tax_lien=2, lis_pendens=2, threshold=4. `getDefaultConfig()` also exported. CLI entry point included. |

### Plan 01-04 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scraper/src/functions/dailyScrape.ts` | Timer trigger orchestrating full pipeline | VERIFIED | `app.timer('dailyScrape', { schedule: '0 0 5 * * *', runOnStartup: false })` registered. All 5 pipeline steps present. |
| `scraper/src/lib/health.ts` | Exports `updateScrapeHealth`, `checkHealthAlert` | VERIFIED | Both functions present. Uses `scraperHealth` table. `console.error(ALERT: ...)` at consecutive zeros >= 3. |
| `scraper/src/lib/upsert.ts` | Exports upsert functions for all sources | VERIFIED | `upsertProperty`, `upsertSignal`, `upsertFromAssessor`, `upsertFromDelinquent`, `upsertFromRecorder` all exported. |

---

## Key Link Verification

### Plan 01-01 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scraper/src/db/client.ts` | `scraper/src/db/schema.ts` | `drizzle({ client: pool, schema })` | WIRED | Line 3: `import * as schema from './schema.js'`; Line 15: `drizzle({ client: pool, schema })` |

### Plan 01-02 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `carbon-assessor.ts` | `scraper/src/db/schema.ts` (via types) | Returns `PropertyRecord[]` shaped for upsert | WIRED | Returns `{ parcelId, address, city, ownerName, taxStatus, mortgageInfo }` — consumed by `upsertFromAssessor()` which writes to `properties` table |
| `carbon-delinquent.ts` | `scraper/src/db/schema.ts` (via types) | Returns `DelinquentRecord[]` with tax_lien shape | WIRED | Returns `{ parcelId, signalType (implicit tax_lien), ownerName }` — consumed by `upsertFromDelinquent()` which inserts `tax_lien` signal |

### Plan 01-03 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scraper/src/scoring/score.ts` | `scraper/src/db/schema.ts` | Reads `scraperConfig`, `distressSignals`; updates `leads` | WIRED | Lines 4-9: imports `properties`, `distressSignals`, `leads`, `scraperConfig`. Queries all four in `scoreAllProperties()`. |
| `scraper/src/scoring/score.ts` | `scraper/src/scoring/types.ts` | Imports `SignalInput`, `ScoringConfig`, `ScoreResult`, `SignalConfig` | WIRED | Lines 10-15: `import type { SignalInput, ScoringConfig, ScoreResult, SignalConfig } from './types.js'` |

### Plan 01-04 Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `dailyScrape.ts` | `carbon-assessor.ts` | Calls `scrapeAssessor()` | WIRED | Line 2 import + line 57 call in try/catch |
| `dailyScrape.ts` | `carbon-delinquent.ts` | Calls `scrapeDelinquent()` | WIRED | Line 3 import + line 80 call |
| `dailyScrape.ts` | `scoring/score.ts` | Calls `scoreAllProperties()` | WIRED | Line 10 import + line 127 call |
| `upsert.ts` | `scraper/src/db/schema.ts` | Uses `properties` and `distressSignals` | WIRED | Line 2 import; `onConflictDoUpdate` on `properties.parcelId`; `onConflictDoNothing()` for signals |
| `health.ts` | `scraper/src/db/schema.ts` | Uses `scraperHealth` table | WIRED | Line 3 import; upsert on `scraperHealth.county` in both success and failure paths |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DATA-01 | 01-02-PLAN | Scrapes Carbon County assessor for owner, address, tax status, mortgage info | SATISFIED | `carbon-assessor.ts` scrapes `carbon.utah.gov/service/property-search/` with Playwright, extracts ownerName, address, city, taxStatus, mortgageInfo via dynamic header mapping |
| DATA-02 | 01-02-PLAN | Scrapes Carbon County recorder for NOD and lis pendens | PARTIAL | `carbon-recorder.ts` is a documented placeholder returning `[]`. No confirmed public portal exists. Placeholder is intentional with documented fallback path. DATA-02 is acknowledged but not operationally satisfied. |
| DATA-03 | 01-02-PLAN | Scrapes tax delinquency records | SATISFIED | `carbon-delinquent.ts` scrapes `carbon.utah.gov/service/delinquent-properties/` with Playwright, inserts `tax_lien` signals via `upsertFromDelinquent()` |
| DATA-07 | 01-01-PLAN | Tracks first-seen date per property | SATISFIED | `properties.firstSeenAt` is `defaultNow()` on insert, never overwritten in `upsertProperty()` `onConflictDoUpdate` set clause |
| DATA-08 | 01-04-PLAN | Daily automated scraping on scheduled basis | SATISFIED | Azure Functions timer trigger `0 0 5 * * *` with `runOnStartup: false`, WEBSITE_TIME_ZONE=America/Denver for Mountain Time |
| DATA-09 | 01-01-PLAN | Persistent database with property as canonical entity | SATISFIED | PostgreSQL schema with `properties` as root entity; `parcelId` UNIQUE constraint as canonical dedup key; Drizzle ORM migrations configured |
| SCORE-01 | 01-01-PLAN | Distress signals per property (NOD, tax_lien, lis_pendens, probate, vacant, code_violation) | SATISFIED | `signalTypeEnum` defines all 6 types. `distressSignals` table stores signals as individual rows with FK to property. |
| SCORE-02 | 01-03-PLAN | Calculates distress score based on count of active signals | SATISFIED | `scoreProperty()` pure function computes weighted sum of active signals. `scoreAllProperties()` updates `leads.distressScore`. |
| SCORE-03 | 01-03-PLAN | Flags properties with 2+ distress signals as hot leads | PARTIAL | Implementation flags as hot when weighted score >= 4, not when signal_count >= 2. A single NOD (weight 3) does NOT trigger hot lead. Two tax_lien signals (4) DOES trigger hot lead. The threshold is configurable but defaults to weight-based, not count-based semantics. REQUIREMENTS.md and ROADMAP success criterion 3 say "2+ signals". |
| SCORE-04 | 01-01-PLAN | Distinguishes between signal types, displays each on property detail | SATISFIED | Each distress signal is stored as a separate row with `signalType` enum. Schema supports retrieval of all signal types per property for Phase 2 display. |

**Orphaned requirements:** None — all Phase 1 requirement IDs appear in at least one plan's `requirements` field.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scraper/src/sources/carbon-recorder.ts` | 49 | `return []` with PLACEHOLDER status | INFO | Expected and documented. Option-a decision was recorded. Consistent interface maintained. Does not block pipeline execution. |
| `scraper/src/sources/carbon-assessor.ts` | 57, 64 | `return []` in error fallback | INFO | These are error-path returns (no table rows found), not stubs. Proper logging precedes each. Not a stub pattern. |
| `scraper/src/sources/carbon-delinquent.ts` | 51 | `return []` in error fallback | INFO | Same as assessor — error path, not stub. |

No blocker or warning-level anti-patterns found. All empty returns are either documented placeholders or legitimate error-path fallbacks with logging.

---

## Human Verification Required

### 1. End-to-End Pipeline Execution

**Test:** Trigger `dailyScrape` manually from Azure Portal (Function App -> Functions -> dailyScrape -> Code + Test -> Run)
**Expected:** Logs show "Daily scrape pipeline starting...", assessor/delinquent scrapers run, properties appear in `properties` table, `leads` table has score rows, `scraper_health` has a row for 'carbon' with `last_success_at` populated
**Why human:** Requires live Azure environment with `DATABASE_URL`, `WEBSITE_TIME_ZONE=America/Denver` configured. Cannot verify without executing against live infrastructure.

### 2. Carbon County Page Accessibility

**Test:** Manually load `https://www.carbon.utah.gov/service/property-search/` and `https://www.carbon.utah.gov/service/delinquent-properties/`
**Expected:** Both pages load with wpDataTables containing property rows. The dynamic header map in the scraper will resolve actual column names from live pages.
**Why human:** Scrapers have fallback logic for empty tables and unknown headers, but actual wpDataTable structure and whether Playwright can reach the pages without IP blocks can only be confirmed by running the scraper against live URLs.

### 3. GitHub Actions CI/CD Deployment

**Test:** Check `https://github.com/bbrinke1978/housefinder/actions` after a push to main with `scraper/**` changes
**Expected:** `deploy-scraper.yml` workflow runs, `npm ci && npm run build` succeeds, Playwright Chromium installs, Azure Functions deploy action publishes successfully
**Why human:** No git remote access from this environment. Workflow file exists and is syntactically correct but execution cannot be confirmed without access to GitHub Actions logs.

---

## Gaps Summary

One gap blocks full goal achievement. The remaining gap involves a semantic mismatch between the stated requirement and the implemented behavior:

**SCORE-03 / Success Criterion 3 — Hot Lead Threshold Semantics**

The ROADMAP states: "Properties with 2 or more distress signals are marked as hot leads." REQUIREMENTS.md SCORE-03 states: "System flags properties with 2+ distress signals as hot leads."

The implementation uses a weighted score threshold (default: 4), not a raw signal count. Under this implementation:
- A property with 1 NOD signal (weight 3) is NOT a hot lead (score 3 < threshold 4)
- A property with 2 tax_lien signals (weight 2+2=4) IS a hot lead (score 4 >= threshold 4)
- A property with 1 NOD + 1 tax_lien (weight 3+2=5) IS a hot lead

The PLAN 03 explicitly chose this threshold design with the rationale: "NOD alone = 3, not hot; NOD + tax_lien = 5, hot." This was a deliberate technical decision, but it was not reconciled back against the requirement/success criterion text.

**This is a design intent conflict, not a coding error.** The resolution options are:
1. Update REQUIREMENTS.md SCORE-03 and the ROADMAP success criterion to say "weighted distress score >= 4" instead of "2+ signals"
2. Add a second condition: `is_hot = score >= threshold OR active_signal_count >= 2`
3. Lower `hot_lead_threshold` to 3 so that a single NOD (weight 3) triggers hot lead status

**DATA-02 note:** The recorder placeholder is the documented and intentional resolution for DATA-02. The plan explicitly chose option-a (placeholder) after a checkpoint decision. This is not a gap — it is a known limitation with a clear upgrade path.

---

*Verified: 2026-03-18T21:00:00Z*
*Verifier: Claude (gsd-verifier)*
