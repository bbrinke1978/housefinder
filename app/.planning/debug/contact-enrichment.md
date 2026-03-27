---
status: investigating
trigger: "Build 3 contact enrichment features: ThatsThem/FamilyTreeNow scraping, Tracerfy API, Carbon County mailing address"
created: 2026-03-26T00:00:00Z
updated: 2026-03-26T00:00:00Z
---

## Current Focus

hypothesis: All three enrichment sources are buildable but with different viability
test: Curled all three target sites to check anti-bot measures and API structure
expecting: Build Tracerfy API integration + Carbon County mailing, stub ThatsThem/FamilyTreeNow
next_action: Building all four files

## Symptoms

expected: 3,114 distressed leads have zero phone numbers or emails
actual: owner_contacts table is empty for most properties
errors: none — this is a feature build, not a bug fix
reproduction: N/A
started: always been this way

## Eliminated

- hypothesis: ThatsThem is scrapable via curl/fetch
  evidence: Returns 302 -> "Challenge | ThatsThem" page with Google reCAPTCHA. Cannot bypass without CAPTCHA solver.
  timestamp: 2026-03-26

- hypothesis: FamilyTreeNow is scrapable via curl/fetch
  evidence: Returns 403 Forbidden immediately. Blocked at network level.
  timestamp: 2026-03-26

## Evidence

- timestamp: 2026-03-26
  checked: ThatsThem reverse address lookup
  found: Site serves Google reCAPTCHA challenge page (status 200 with "Challenge | ThatsThem" title)
  implication: Cannot scrape without CAPTCHA solving — Playwright would help render JS but reCAPTCHA still blocks automation

- timestamp: 2026-03-26
  checked: FamilyTreeNow name search
  found: Returns 403 Forbidden immediately
  implication: Hard IP block — no path forward without residential proxies

- timestamp: 2026-03-26
  checked: Tracerfy API docs at tracerfy.com/skip-tracing-api
  found: REST API with POST /trace/, GET /queues/, GET /queue/:id. Bearer token auth. $0.01-0.02/lead. Returns phones, emails, addresses.
  implication: Fully buildable REST integration — need API key from dashboard

- timestamp: 2026-03-26
  checked: Carbon County assessor page column headers
  found: Table has separate mailing (Name, Name2, Add1, Add2, City, State, Zip) AND property (PropertyAddress, PropertyCity, PropertyZip) columns
  implication: Mailing address is already in the table, just not being extracted — easy add

## Resolution

root_cause: N/A (feature build)
fix: |
  1. ThatsThem/FamilyTreeNow: NOT scrapable. Add as manual skip trace links in UI instead.
     Build contactEnrichment.ts function that handles Tracerfy only.
  2. Tracerfy: Full REST API integration built, keyed on TRACERFY_API_KEY env var.
  3. Carbon County: Extract mailing address fields from existing table, store in owner_contacts
     with source='county-assessor' using email field as "MAILING: addr, city, ST zip" format.
verification: pending
files_changed:
  - scraper/src/sources/tracerfy-enrichment.ts (new)
  - scraper/src/sources/carbon-assessor.ts (modified - add mailing address extraction)
  - scraper/src/functions/contactEnrichment.ts (new)
  - scraper/src/index.ts (modified - export new function)
  - app/src/components/contact-tab.tsx (modified - add mailing address display + Tracerfy links)
