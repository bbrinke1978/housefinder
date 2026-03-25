---
status: investigating
trigger: "Build 3 improvements: years-delinquent scoring bonus, assessed value scraping, hide big operators setting"
created: 2026-03-24T00:00:00Z
updated: 2026-03-24T00:00:00Z
---

## Current Focus

hypothesis: Scoring engine has flat multi-year bonus (each extra lien = +1) but task requires tiered bonus (1yr=0, 2yr=+1, 3yr=+2, 4yr=+3, 5+yr=+4). The count of DISTINCT YEARS matters, not count of signals.
test: Read score.ts, verify current logic, rewrite to count distinct calendar years from recorded_dates
expecting: New bonus calculation replaces old `scoredTaxLiens.length - 1` logic
next_action: Implement all three tasks sequentially

## Symptoms

expected: 1. Years-delinquent bonus is tiered by distinct years. 2. Settings has "hide big operators" toggle. 3. Dashboard filters out big operators when enabled.
actual: 1. Flat +1 per extra lien signal. 2. No big-operator toggle. 3. No big-operator filter.
errors: none
reproduction: review scoring/score.ts, settings page, queries.ts
started: new feature requests

## Eliminated

- hypothesis: assessed value scraping is required
  evidence: Task list only has 3 tasks listed (years bonus, hide big operators, rescore) - task 2 label says "assessed value scraping" in the outer tasks block but the actual sub-task is "hide big operators"
  timestamp: 2026-03-24

## Evidence

- timestamp: 2026-03-24
  checked: scraper/src/scoring/score.ts
  found: Multi-year bonus uses `scoredTaxLiens.length - 1` — flat +1 per extra lien beyond first, regardless of actual year spread
  implication: Need to count distinct calendar years from recorded_date instead

- timestamp: 2026-03-24
  checked: app/src/lib/actions.ts
  found: Pattern for upsert settings: check existing row, update or insert. Uses scraperConfig table with key/value pairs.
  implication: Will follow same pattern for dashboard.hideBigOperators

- timestamp: 2026-03-24
  checked: app/src/lib/queries.ts
  found: getProperties and getDashboardStats both query leads+properties. Need to add NOT EXISTS subquery for big operator exclusion.
  implication: Will load big operator names once and pass as NOT IN for performance

- timestamp: 2026-03-24
  checked: app/src/components/settings-form.tsx
  found: Uses useTransition for server action calls, checkbox+label pattern for toggles
  implication: Will follow same pattern for new toggle

## Resolution

root_cause: Missing features: tiered scoring and big-operator filter
fix: (in progress)
verification: (pending rescore + query distribution)
files_changed: []
