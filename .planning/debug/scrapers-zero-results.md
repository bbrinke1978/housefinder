---
status: awaiting_human_verify
trigger: "All 6 Azure Functions scrapers run successfully but return 0 results. No properties inserted."
created: 2026-03-19T00:00:00Z
updated: 2026-03-19T22:15:00Z
---

## Current Focus

hypothesis: CONFIRMED (round 3) — Juab root cause re-investigated via live Azure App Insights logs. Two failure modes found and fixed.
test: Push to master triggers GitHub Actions deploy-scraper.yml; Juab timer fires at 5:45 AM MT or manual invocation via Azure portal
expecting: Juab scraper logs "[juab] Extracted PDF URL from REST API content" and then "Parsed 805 records from PDF"
next_action: Deploy in progress (GitHub Actions run 23319465240). Await deploy completion, then invoke juab-scrape manually via Azure portal and confirm 805 records in App Insights logs.

## Symptoms

expected: Scrapers should parse county websites and insert property records into the database
actual: All scrapers complete without errors but insert 0 properties. scraper_health shows last_result_count=0 for all counties.
errors: No crash errors — scrapers report success but with 0 results
reproduction: Every run returns 0 results. Counties affected: carbon (5 consecutive zeros), millard, sevier, sanpete, juab (1 each — first runs after Chromium fix)
started: Never worked — this is the first time scrapers have actually been able to launch Chromium.

## Eliminated

- hypothesis: Database insert logic silently drops records
  evidence: upsert.ts is straightforward — inserts every record passed to it with no filtering
  timestamp: 2026-03-19

- hypothesis: Zod validation rejects all records
  evidence: delinquentRecordSchema only requires parcelId (min 1), all other fields optional; propertyRecordSchema requires parcelId + address + city but this is only relevant for assessor/tax-roll scrapers
  timestamp: 2026-03-19

- hypothesis: scraper_config "lastParsedYear" gate blocks re-parsing
  evidence: First run — config keys don't exist yet so lastParsedYear === null, which != currentYear, so parsing WILL proceed
  timestamp: 2026-03-19

## Evidence

- timestamp: 2026-03-19
  checked: juabConfig in pdf-delinquent-parser.ts
  found: treasurerPageUrl = "https://juabcounty.gov/" (the homepage)
  implication: The delinquent tax PDF is NOT linked from the homepage. It is on specific news/notice pages like juabcounty.gov/notice-2024-delinquent-tax-list/ and juabcounty.gov/notice-2025-delinquent-tax-sale/. The homepage scraper finds zero "delinquent" links, returns empty.

- timestamp: 2026-03-19
  checked: millardConfig in pdf-delinquent-parser.ts
  found: treasurerPageUrl = "https://millardcounty.gov/" (the homepage)
  implication: The PDF IS on a sub-page: millardcounty.gov/your-government/elected-officials/treasurer/delinquent-tax-listing/ — not the homepage. Homepage scan returns 0 PDF links matching the pattern.

- timestamp: 2026-03-19
  checked: sanpeteConfig in pdf-delinquent-parser.ts
  found: treasurerPageUrl = "https://sanpetecountyutah.gov/" (the homepage)
  implication: PDF is directly at sanpetecountyutah.gov/uploads/.../delinquent_list_2024.pdf and linked from sanpetecountyutah.gov/treasurer.html — not homepage. Homepage scan returns 0 PDF links.

- timestamp: 2026-03-19
  checked: sevierConfig in pdf-delinquent-parser.ts
  found: treasurerPageUrl = "https://www.sevier.utah.gov/departments/county_officials/treasurer/current_year_delinquent_tax_report.php"
  implication: URL is correct and dedicated to delinquent tax report. This one SHOULD work IF there is a PDF link on that page matching "delinquent.*tax". May be a seasonal issue — PDF only published after December each year.

- timestamp: 2026-03-19
  checked: emery-delinquent-pdf.ts
  found: navigates to "https://emery.utah.gov/home/offices/treasurer/" and looks for link containing "delinquent" in href OR text
  implication: The 2025 PDF is at emery.utah.gov/wp-content/uploads/2025/12/2025-Current-Delinquent-List.pdf. Its link text on the page is likely "2025 DELINQUENT TAX LISTING" — NOT "delinquent" in the href. However it DOES contain "delinquent" in the href path. Let me check: href="wp-content/uploads/2025/12/2025-Current-Delinquent-List.pdf" — the href contains "Delinquent" (capital D). The code does: a[href*="delinquent" i] which is case-insensitive. Should work IF the link is on the treasurer page. But may not be — PDF may only be linked from elsewhere.

- timestamp: 2026-03-19
  checked: Carbon County assessor (carbon-assessor.ts) — scrapes https://www.carbon.utah.gov/service/property-search/
  found: Uses .wpDataTable selector. Waits 30s for rows, then tries wildcard search. Carbon county site confirmed live.
  implication: Carbon may be returning 0 from wpDataTable because the table requires explicit search. The wildcard "*" search may not trigger results — may need empty string or specific city search. Additionally, validation requires address AND city both min(1), so any row with missing address/city is silently dropped.

- timestamp: 2026-03-19
  checked: emery-tax-roll.ts — scrapes https://emery.utah.gov/home/offices/treasurer/tax-roll/
  found: The Emery tax roll IS at that URL per web search (Tax Roll/Tax Notices page). Uses wpDataTable selector.
  implication: May suffer same issue as Carbon — table may need a search trigger. But the URL is confirmed correct.

- timestamp: 2026-03-19
  checked: Juab delinquent tax structure via web research
  found: 2024 list at juabcounty.gov/notice-2024-delinquent-tax-list/, 2025 is "tax sale" at juabcounty.gov/notice-2025-delinquent-tax-sale/ — these are WordPress posts, not the treasurer department page
  implication: juabConfig.treasurerPageUrl needs to point to juabcounty.gov/departments/treasurer/ or juabcounty.gov/residents/tax-sale/

- timestamp: 2026-03-19
  checked: Millard delinquent tax structure via web research
  found: Dedicated page at millardcounty.gov/your-government/elected-officials/treasurer/delinquent-tax-listing/ — 2024 PDF confirmed at /wp-content/uploads/2024/12/2024-Deliquent-List.pdf (note typo: "Deliquent" not "Delinquent")
  implication: millardConfig.treasurerPageUrl must be the specific delinquent-tax-listing sub-page, NOT the homepage. Also: the PDF filename uses "Deliquent" (missing n) — but the link TEXT on the page likely uses correct spelling OR the pdfLinkTextPattern /deli[nq]*uent/i already handles this typo variant.

- timestamp: 2026-03-19
  checked: Sanpete delinquent tax structure via web research
  found: 2024 PDF at sanpetecountyutah.gov/uploads/.../delinquent_list_2024.pdf, treasurer page at sanpetecountyutah.gov/treasurer.html
  implication: sanpeteConfig.treasurerPageUrl must be /treasurer.html, NOT homepage.

- timestamp: 2026-03-19 (round 2)
  checked: Carbon County delinquent-properties page HTML source + wpDataTable JS config
  found: "hideBeforeLoad":true in JS config. Table has CSS class wdt-no-display (display:none) at load. Tbody is empty in static HTML. Data arrives via AJAX to admin-ajax.php with a nonce. Emery tax roll has hideBeforeLoad:false and worked.
  implication: Playwright waitForSelector default state:'visible' never fires because table is CSS-hidden. Rows are added to DOM via AJAX but not visible. Fix: state:'attached'.

- timestamp: 2026-03-19 (round 2)
  checked: Sevier County delinquent tax report page HTML source
  found: PDF link href="Treasurer/Official Record of Delinquent Taxes 2025 with Certificate.pdf?t=202512181240240" — has ?t= query string. Direct download of the PDF at the revize CDN returns HTTP 404.
  implication: endsWith('.pdf') fails due to query string. PDF itself is currently inaccessible (404 on revize CDN). Sevier will return 0 until CDN issue resolves.

- timestamp: 2026-03-19 (round 2)
  checked: Millard County delinquent PDF downloaded and parsed
  found: 885 text lines. Format: "<AccountID> <OwnerName> Parcel: <ParcelID> Total Due: $<amount>". Parcel IDs are alphanumeric (D-4176-1-1, ZZZ-312, K-1954-3). Generic parser regex /^(\d{1,3}[-\s]\d{3,5}[-\s]\d{3,5})/ never matches because lines start with AccountID not parcel. 0 records extracted.
  implication: Millard-specific parser needed. Wrote makeMillardLineParser() — extracts 850 records from the 2025 PDF.

- timestamp: 2026-03-19 (round 2)
  checked: Juab County tax-sale page + WordPress REST API + delinquent PDF downloaded and parsed
  found: Tax-sale page has NO PDF link. PDF is on WordPress post /notice-2025-delinquent-tax-list-copy/. PDF has 2420 lines. Format: "<AccountID7digits> <AlphanumericParcel> <OwnerName>, Total Due $<amount>" (1-3 lines per record). Parcels like XA00-0814-, F000-6521-. Generic parser never matches.
  implication: Juab-specific stateful multi-line parser needed + URL must be discovered via WP REST API. Wrote makeJuabLineParser() — extracts 805 records from the PDF.

- timestamp: 2026-03-19 (round 2)
  checked: Sanpete County treasurer.html page
  found: Page explicitly says "Delinquent tax listing will be posted on or before December 31, 2026." Button labeled "DELINQUENT TAX LISTING" links to pub-36.pdf (not the delinquent list).
  implication: No delinquent PDF available for 2026 yet. Expected to return 0 records gracefully.

- timestamp: 2026-03-19 (round 3)
  checked: Azure App Insights traces for juab-scrape executions at 21:29 and 21:55 UTC
  found: |
    Run 1 (21:29, pre-fix deploy): Found 89 links on treasurer page.
    First 30 logged links are ALL navigation menu items. No PDF link found.
    Result: "No PDF link found on treasurer page" → 0 records.
    Reason: Playwright navigated OK but PDF links (in the Elementor widget)
    were in links 31-89. However the search returned "No PDF link found",
    meaning the PDF links were either not rendered yet or didn't match the
    pattern in the actual content scan. The Elementor JS may not have rendered
    the widget content by the time link scanning ran.

    Run 2 (21:55, post-fix deploy v2): Timeout! Error log:
    "Juab delinquent PDF parser failed page.goto: Timeout 60000ms exceeded.
     navigating to https://juabcounty.gov/notice-2025-delinquent-tax-list-copy/,
     waiting until networkidle"
    The Elementor page never reaches 'networkidle' within 60 seconds due to
    continuous background requests (analytics, telemetry, Elementor-specific
    requests). This is a well-known issue with Elementor + networkidle.
  implication: |
    Two separate failures:
    1. Playwright 'networkidle' timeout: Elementor page never quiesces
    2. Even when goto succeeds, Elementor content may not be fully rendered
       by the time link scanning runs (JS rendering race condition)
    Root fix: bypass Playwright entirely for Juab by extracting the PDF URL
    directly from the WordPress REST API content.rendered HTML. The PDF href
    is present in the static API response — no browser needed at all.

## Resolution

root_cause: |
  SEVEN root causes confirmed (rounds 1-3).

  ROOT CAUSE 9 (Juab — Playwright networkidle timeout on Elementor page):
  Confirmed via Azure App Insights logs. The juabcounty.gov Elementor page
  (notice-2025-delinquent-tax-list-copy/) never reaches Playwright's 'networkidle'
  state within 60s due to continuous background requests (Elementor telemetry,
  analytics, etc.). Even when page.goto() succeeds (pre-fix run), the Elementor
  widget content may not be fully rendered when link scanning runs, causing the
  PDF links to appear missing. Fix: bypass Playwright entirely for Juab by
  extracting the PDF URL directly from the WordPress REST API content.rendered HTML.
  The PDF href (e.g. .../Account-Balance28.pdf) is present in the static API JSON
  response — no browser rendering needed at all.

  ROOT CAUSE 10 (All PDF counties — waitUntil: "networkidle" is fragile):
  parsePdfDelinquent() used waitUntil: "networkidle" which can timeout on any
  WordPress/Elementor site. Changed to "load" which waits for window.load event
  (all scripts + images loaded) which is reliable and sufficient for static link
  discovery.

  FIVE root causes confirmed via direct website inspection and PDF analysis (round 2):

  ROOT CAUSE 4 (Carbon assessor + Carbon delinquent — wpDataTable hideBeforeLoad):
  Both Carbon County wpDataTables have "hideBeforeLoad":true in their JS config.
  This adds a CSS class "wdt-no-display" (display:none) to the table before AJAX loads.
  Playwright's default waitForSelector() uses state:'visible', so it waits for the
  element to be CSS-visible. Even after AJAX populates rows, if the parent table is
  hidden the rows are not "visible". By contrast, the Emery tax roll has
  "hideBeforeLoad":false and worked fine. Fix: use state:'attached' which only requires
  the element to exist in the DOM, not be visible.

  ROOT CAUSE 5 (Sevier — PDF URL has query string breaking endsWith('.pdf') check):
  The Sevier delinquent tax report link href is:
  "Treasurer/Official Record of Delinquent Taxes 2025 with Certificate.pdf?t=202512181240240"
  The ?t= query string causes href.toLowerCase().endsWith('.pdf') to return false.
  Strategy 1 and 2 both fail; Strategy 3 (text only) WOULD catch it, but the resolved
  URL may have issues. Additionally, the PDF on revize CDN currently returns HTTP 404
  (the sevier.utah.gov URL redirects to cms3.revize.com which 404s). Sevier will return
  0 until the CDN issue is resolved. Fix: updated hrefIsPdf() helper to check
  URL.pathname (strips query string) rather than the raw href string.

  ROOT CAUSE 6 (Millard — generic line parser doesn't match Millard PDF format):
  Millard's PDF format is: "<AccountID> <OwnerName> Parcel: <ParcelID> Total Due: $<amount>"
  The generic line parser looks for parcel patterns at the START of the line: /^(\d{1,3}[-\s]\d{3,5}[-\s]\d{3,5})/
  But Millard lines START with AccountID (7 digits), then owner name, then "Parcel: ...".
  ZERO records were ever extracted. Fix: write Millard-specific parser that looks for
  "Parcel: <id>" and "Total Due: $<amount>" keywords within the line.
  Result: 850 records extracted from the 2025 PDF.

  ROOT CAUSE 7 (Juab — generic line parser doesn't match Juab PDF format + wrong page URL):
  Juab's PDF format is: "<AccountID> <ParcelNumber> <OwnerName>, Total Due $<amount>"
  with records spanning 1–3 lines. The generic parser expected XX-XXXX-XXXX digit-only
  parcel IDs at line start, but Juab parcels are alphanumeric (XA00-0814-, F000-6521-).
  ZERO records were ever extracted. Fix: write Juab-specific stateful multi-line parser.
  Additionally, the delinquent PDF is NOT on the tax-sale page but in a WordPress post
  (e.g. /notice-2025-delinquent-tax-list-copy/). Fix: use WordPress REST API to
  dynamically find the current year's post URL.
  Result: 805 records extracted from the 2026/01 PDF.

  ROOT CAUSE 8 (Sanpete — no PDF published until December 2026):
  The Sanpete treasurer page explicitly states: "Delinquent tax listing will be posted
  on or before December 31, 2026." The button links to pub-36.pdf which is NOT the
  delinquent list. Sanpete will correctly return 0 until December 2026.

fix: |
  Fix 9: juabScrape.ts — replace findJuabDelinquentPostUrl() with
  findJuabDelinquentPdfInfo() which extracts the PDF URL directly from the
  WordPress REST API content.rendered HTML using a simple href regex. When a
  direct pdfUrl is found, calls parsePdfDelinquentFromUrl() (new function in
  pdf-delinquent-parser.ts) that downloads the PDF and parses it without
  launching Playwright at all. Falls back to Playwright-based parsePdfDelinquent()
  only if the REST API doesn't contain a direct PDF href.
  Verified locally: REST API returns PDF URL, 805 records parsed. E2E tested.

  Fix 10: pdf-delinquent-parser.ts parsePdfDelinquent() — change waitUntil from
  "networkidle" to "load" to prevent timeout on Elementor/WordPress sites with
  continuous background requests.

  Added: parsePdfDelinquentFromUrl() exported function in pdf-delinquent-parser.ts
  for direct PDF download+parse without Playwright, reusable by any county.

  Fix 4: carbon-assessor.ts and carbon-delinquent.ts — add state:'attached' to all
  waitForSelector('.wpDataTable tbody tr') calls so they wait for DOM presence
  not CSS visibility (works with hideBeforeLoad:true tables).

  Fix 5: pdf-delinquent-parser.ts parsePdfDelinquent() — replace endsWith('.pdf')
  with hrefIsPdf() helper that uses URL.pathname to strip query strings before checking.

  Fix 6: pdf-delinquent-parser.ts millardConfig — replace generic line parser with
  makeMillardLineParser() that matches "Parcel: <id> Total Due: $<amount>" format.

  Fix 7a: pdf-delinquent-parser.ts juabConfig — replace generic line parser with
  makeJuabLineParser() that handles both single-line and multi-line record formats
  with alphanumeric parcel IDs.
  Fix 7b: juabScrape.ts — add findJuabDelinquentPostUrl() that calls the WordPress
  REST API to find the current year's delinquent tax list post, then passes the
  discovered URL as the treasurerPageUrl override.

  Fix 8: pdf-delinquent-parser.ts sanpeteConfig — updated pdfLinkTextPattern to
  /delinquent.*tax.*list/i so it won't match unrelated links; logs clearly when
  no PDF found and returns [] gracefully.

verification: pending — deploy and check scraper_health last_result_count after next run
files_changed:
  - scraper/src/sources/pdf-delinquent-parser.ts (round 2: hrefIsPdf() for query strings; Millard + Juab custom parsers; Sanpete pattern tightened; Juab URL updated)
  - scraper/src/sources/carbon-assessor.ts (round 2: waitForSelector state:'attached' for hideBeforeLoad:true tables)
  - scraper/src/sources/carbon-delinquent.ts (round 2: waitForSelector state:'attached' for hideBeforeLoad:true tables)
  - scraper/src/functions/juabScrape.ts (round 2: findJuabDelinquentPostUrl() via WordPress REST API)
  - scraper/src/sources/pdf-delinquent-parser.ts (round 3: waitUntil 'networkidle' -> 'load'; added parsePdfDelinquentFromUrl())
  - scraper/src/functions/juabScrape.ts (round 3: findJuabDelinquentPdfInfo() extracts PDF URL directly from REST API HTML; bypasses Playwright entirely for Juab)
