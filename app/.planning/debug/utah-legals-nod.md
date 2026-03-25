---
status: fixing
trigger: "utah-legals-nod-scraper never returns results"
created: 2026-03-24T00:00:00Z
updated: 2026-03-24T01:30:00Z
---

## Current Focus

hypothesis: Confirmed - multiple wrong selectors in Playwright scraper prevent search from executing
test: Ran Playwright test scripts against live site
expecting: Fix selectors and interaction pattern, deploy, verify results
next_action: Write corrected utah-legals.ts and deploy

## Symptoms

expected: Scraper finds foreclosure/trustee sale notices on utahlegals.com and creates NOD signals
actual: Returns 0 results every time
errors: No crash - completes "successfully" with 0 results
reproduction: Trigger the utah-legals-scrape function - always returns 0
started: Never worked since creation

## Eliminated

- hypothesis: Chromium not installed on Azure Linux
  evidence: Scraper completes without crashing - if Chromium was missing, it would throw on launchBrowser()
  timestamp: 2026-03-24

- hypothesis: No foreclosure notices exist for these counties
  evidence: Live test with correct selectors found 3 pages (30 results) for Carbon/Emery/Juab/Millard
  timestamp: 2026-03-24

## Evidence

- timestamp: 2026-03-24
  checked: utahlegals.com HTML source
  found: Quick search dropdown ID is 'ddlPopularSearches' not 'ddlQuickSearch'
  implication: Existing scraper selector 'select[id*="ddlQuickSearch"]' never matches - selectOption silently fails

- timestamp: 2026-03-24
  checked: Search button HTML
  found: Button has value="" (empty string) with class="goButton" and ID ending in "btnGo"
  implication: Existing selector 'input[type="submit"][value*="Search"]' never matches - button never clicked

- timestamp: 2026-03-24
  checked: County checkboxes HTML
  found: Checkboxes are inside div#countyDiv which has display:none - must click label.header to expand
  implication: Even if selector worked, checkboxes weren't visible so check() would timeout

- timestamp: 2026-03-24
  checked: County checkbox interaction via Playwright
  found: Must SET cb.checked=true AND then call __doPostBack() via page.evaluate() to register with server
  implication: Standard Playwright .check() or .click() doesn't work - footer overlaps, and setTimeout needs the checked state present when __doPostBack fires

- timestamp: 2026-03-24
  checked: Search results HTML
  found: Notice links use viewButton inputs with onclick="location.href='Details.aspx?SID=...&ID=...'" NOT anchor tags
  implication: Existing selector 'a[href*="notice"]' never matches results - this is the final reason 0 results

- timestamp: 2026-03-24
  checked: Results data content
  found: Each row contains county, city, publication, date, 300-char snippet WITH parcel IDs (A.P.N.)
  implication: Can extract parcel, county, city from search results WITHOUT visiting detail pages

- timestamp: 2026-03-24
  checked: Details.aspx direct URL access
  found: reCAPTCHA blocks direct URL access to notice detail pages
  implication: Should NOT visit detail pages - use snippet data from search results instead

- timestamp: 2026-03-24
  checked: Live results for Carbon/Emery/Juab/Millard
  found: 3 pages, ~30 results total with real NOD data (T.S.# and A.P.N. in snippets)
  implication: Scraper will actually find real data once fixed

## Resolution

root_cause: |
  Four bugs working together to produce 0 results:
  1. Category dropdown selector wrong: 'ddlQuickSearch' vs actual 'ddlPopularSearches'
  2. County checkboxes hidden in collapsed div#countyDiv (needs label.header click to expand)
  3. County checkbox interaction requires: set cb.checked=true, then page.evaluate(__doPostBack)
  4. Search button selector wrong: 'value*=Search' vs actual value="" with class="goButton"
  5. Results link selector wrong: looking for <a href*="notice"> but actual is <input.viewButton onclick="location.href='Details.aspx?...'">"

fix: |
  Rewrite utah-legals.ts scraper with correct:
  - Dropdown selector: '#ctl00_ContentPlaceHolder1_as1_ddlPopularSearches'
  - County expand: click '#ctl00_ContentPlaceHolder1_as1_divCounty label.header'
  - County check: set checked=true + page.evaluate(__doPostBack) for each county
  - Search button: '#ctl00_ContentPlaceHolder1_as1_btnGo'
  - Results parsing: input.viewButton onclick for ID, td.info for metadata, td[colspan=3] for snippet
  - Skip detail pages (reCAPTCHA blocks them) - extract parcel/address from snippet text

verification: pending
files_changed:
  - scraper/src/sources/utah-legals.ts
