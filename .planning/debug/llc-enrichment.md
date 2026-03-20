---
status: resolved
trigger: "Build LLC enrichment pipeline using Utah Division of Corporations data"
created: 2026-03-20T03:00:00Z
updated: 2026-03-20T03:30:00Z
---

## Current Focus

hypothesis: Task complete - pipeline built and deployed
test: n/a
expecting: n/a
next_action: monitor first run on Azure

## Symptoms

expected: LLC owner names resolved to registered agent contact info
actual: 370 LLC-owned distressed properties with no contact info
errors: none - this is a build task
reproduction: n/a
started: initial implementation

## Eliminated

- hypothesis: Utah has a Socrata Open Data API with business entity data
  evidence: data.utah.gov redirects to utah.gov; opendata.utah.gov has no Utah business entity dataset
  timestamp: 2026-03-20T03:10:00Z

- hypothesis: businessregistration.utah.gov search requires Utah-ID login for all access
  evidence: Search IS accessible to unauthenticated users after getting a session cookie from home page
  timestamp: 2026-03-20T03:15:00Z

- hypothesis: OpenCorporates is free without API key
  evidence: Returns "Invalid Api Token" error for all requests without a key
  timestamp: 2026-03-20T03:12:00Z

## Evidence

- timestamp: 2026-03-20T03:08:00Z
  checked: opendata.utah.gov Socrata catalog
  found: No Utah business entity dataset - only Colorado, Iowa, NY datasets
  implication: Must scrape businessregistration.utah.gov directly

- timestamp: 2026-03-20T03:15:00Z
  checked: businessregistration.utah.gov session behavior
  found: Home page GET creates session; subsequent request to /EntitySearch/OnlineEntitySearch returns 77KB page with search form (not login redirect)
  implication: Session-based approach works without Utah-ID

- timestamp: 2026-03-20T03:18:00Z
  checked: Search POST to /EntitySearch/OnlineBusinessAndMarkSearchResult
  found: Returns HTML table with entity IDs; AJB HOLDINGS LLC -> entityId 5231385
  implication: Can extract entity IDs from search results

- timestamp: 2026-03-20T03:20:00Z
  checked: Entity detail POST to /EntitySearch/BusinessInformation
  found: Returns full entity detail including registered agent name, type, address, and status
  AJB HOLDINGS LLC -> ANTHONY BASSO, Individual, 6 E MAIN PRICE UT 84501
  implication: Full registered agent info extractable via HTML scraping with cheerio

- timestamp: 2026-03-20T03:22:00Z
  checked: owner_contacts table schema
  found: Unique constraint on (propertyId, source) - onConflictDoUpdate needed
  implication: Use source='utah-bes' for all BES-sourced contacts

## Resolution

root_cause: Utah doesn't use Socrata; businessregistration.utah.gov has public HTML search accessible via session cookie
fix: |
  Built 3-step pipeline:
  1. scraper/src/sources/llc-enrichment.ts - core scraper
     - Step 1: GET home page to establish session (no auth needed)
     - Step 2: POST search with LLC name to get entity ID
     - Step 3: POST BusinessInformation with entity ID to get agent details
     - Parses HTML with cheerio to extract agent name, address, status
     - Flags known commercial agents (Northwest Registered Agent, etc.)
     - Batch processing with 1.5s delay between requests
  2. scraper/src/functions/llcEnrichment.ts - Azure Function trigger
     - Timer: Wednesdays 7 AM MT (0 0 13 * * 3)
     - HTTP trigger for manual invocation
  3. Wired into scraper/src/index.ts
verification: Confirmed AJB HOLDINGS LLC -> ANTHONY BASSO, Individual, 6 E MAIN PRICE UT 84501
files_changed:
  - scraper/src/sources/llc-enrichment.ts (new)
  - scraper/src/functions/llcEnrichment.ts (new)
  - scraper/src/index.ts (export added)
