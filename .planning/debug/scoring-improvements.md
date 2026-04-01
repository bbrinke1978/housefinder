---
status: resolved
trigger: "Implement improved distress scoring using tiered tax lien amounts and multi-year delinquency data, then add Utah Legals scraping for NOD signals."
created: 2026-03-19T00:00:00Z
updated: 2026-03-19T01:00:00Z
---

## Current Focus

hypothesis: Scoring engine needs raw_data awareness to tier tax_lien weights by amount and year count
test: Modify scoreAllProperties() to fetch raw_data and compute tiered weights per signal
expecting: After changes, properties with high amountDue or multi-year delinquency score higher
next_action: Implement Task 1 - tiered scoring in score.ts

## Symptoms

expected: Distress scores should vary based on tax lien amount severity and multi-year delinquency
actual: All 1,761 leads have distress_score = 1 (flat weight regardless of amount/years)
errors: None — scoring works, just not nuanced
reproduction: SELECT DISTINCT distress_score FROM leads -> only returns 1
started: Always been this way — scoring was designed with flat weights initially

## Eliminated

- hypothesis: Multiple signals per property for Carbon County multi-year data
  evidence: Unique index on (property_id, signal_type, COALESCE(recorded_date,'1970-01-01')) means one signal per property since all Carbon records have null recorded_date
  timestamp: 2026-03-19

## Evidence

- timestamp: 2026-03-19
  checked: distress_signals raw_data structure
  found: carbon={year:"2025",amountDue:""}, juab={amountDue:"123.45"}, millard={amountDue:"456.78"}
  implication: Carbon has year but no amount; Juab/Millard have amount but no year

- timestamp: 2026-03-19
  checked: signal counts by county
  found: carbon=909, juab=250, millard=850, emery=2 — all exactly 1 signal per property
  implication: Multi-year for Carbon means the single signal's raw_data->year field is the scrape year, not multiple years

- timestamp: 2026-03-19
  checked: Carbon year distribution
  found: 2025=847, 2024=51, 2023=9, 2022=3, 2021=1 — these are single signals with their year noted
  implication: To get "multi-year bonus" for Carbon, need to check if same parcel appears in multiple year scrapes; currently each parcel has only 1 signal with the most recent year

- timestamp: 2026-03-19
  checked: unique index on distress_signals
  found: uq_distress_signal_dedup on (property_id, signal_type, COALESCE(recorded_date,'1970-01-01'))
  implication: For multi-year Carbon data to show up, upsertFromDelinquent needs to use the year as the recorded_date so each year creates a distinct signal row

## Resolution

root_cause: scoreProperty() uses flat weights from config; does not inspect raw_data for amount tiers or year counts
fix: |
  1. scoreProperty() now tiers tax_lien weight by amountDue: <$100=1, $100-499=2, $500-999=3, $1000+=4
  2. Multi-year bonus: each additional tax_lien signal on same property adds +1
  3. scoreAllProperties() now fetches raw_data with each signal row
  4. upsertFromDelinquent() stores year as Jan-1 recorded_date enabling per-year signal rows
  5. New emery-5year-backtax.ts scraper (Playwright, wpDataTables ID=127)
  6. New utah-legals.ts scraper (Playwright, ASP.NET form, weekly Monday 6AM)
  7. Ran rescore-leads.mjs against production - 2011 properties rescored
verification: |
  Production DB after rescore:
  - score 1: 1321 properties (no/tiny amounts)
  - score 2: 299 properties ($100-499)
  - score 3: 116 properties ($500-999)
  - score 4: 275 hot leads ($1000+)
  Matches expected distribution from context exactly.
files_changed:
  - scraper/src/scoring/score.ts
  - scraper/src/scoring/types.ts
  - scraper/src/lib/upsert.ts
  - scraper/src/functions/emeryScrape.ts
  - scraper/src/functions/utahLegalsScrape.ts (new)
  - scraper/src/sources/emery-5year-backtax.ts (new)
  - scraper/src/sources/utah-legals.ts (new)
  - scraper/src/index.ts
  - app/src/scripts/rescore-leads.mjs (new)
