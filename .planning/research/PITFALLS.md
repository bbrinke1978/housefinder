# Pitfalls Research

**Domain:** Adding Salt Lake County (urban) to a rural-Utah distressed-property scraping pipeline — v1.3 Rose Park Pilot
**Researched:** 2026-04-17
**Confidence:** MEDIUM-HIGH for technical integration claims (code inspected); MEDIUM for SLCo portal behavior (official pages verified, live scrape not tested); LOW for parcel format (observed from URL pattern but no authoritative spec found)

These pitfalls are specific to the v1.3 milestone. They do not duplicate the baseline pitfalls in `archive-pre-v1.3/PITFALLS.md`. Read that file for TCPA, trust-deed timeline, alert fatigue, entity ownership, and general scraping concerns.

---

## Critical Pitfalls

### Pitfall SLC-1: SLCo Assessor Terms of Use Prohibit Commercial Use — Scraping Violates Written Terms

**What goes wrong:**
The Salt Lake County Assessor's parcel search application at `apps.saltlakecounty.gov` has an explicit Terms of Use displayed on the introductory page before any search is conducted. The terms state: "The user may not re-sell, sublicense, or operate a service bureau using this site, or otherwise reproduce, publish, link, or disseminate this site for commercial purposes without the prior written consent of Salt Lake County." Using automated scraping of the assessor portal to build a property investment lead tool is a commercial use. Building the SLCo assessor scraper directly against `apps.saltlakecounty.gov` creates contractual ToS exposure even though the data is public.

**Why it happens:**
Developers copy the pattern from Carbon County's scraper (`carbon-delinquent.ts` against `carbon.utah.gov/service/delinquent-properties/`) without checking whether SLCo's portal has similar or stronger ToS. Carbon's delinquent table has no explicit commercial-use prohibition — SLCo's assessor portal does. The data is the same type (public county records) but the access portal terms differ.

**How to avoid:**
- Do NOT scrape the SLCo assessor portal at `apps.saltlakecounty.gov` directly.
- Use the UGRC ArcGIS FeatureServer instead: `Parcels_Salt_Lake_LIR` at `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services`. This is the exact same pipeline already running in `import-ugrc-assessor.mjs` for Carbon/Emery/Juab/Millard. The UGRC service is provided for public use without the commercial-restriction language.
- If SLCo tax delinquency data is needed, use the tax sale list published by the Auditor at `saltlakecounty.gov/property-tax/property-tax-sale/current-tax-sale-list/` (annual publication, not portal scraping) rather than attempting individual parcel lookups.
- The SLCo Recorder public search at `apps.saltlakecounty.gov/data-services/DataServicesAccess/PublicSearch.aspx` is also subject to a Terms of Service checkbox agreement before access. Treat this as a legal boundary: use it for manual verification only, not automated scraping.

**Warning signs:**
- Code that navigates to `apps.saltlakecounty.gov/assessor/` programmatically
- Code that auto-checks the Terms of Service checkbox on the recorder's public search page
- Code that iterates parcel numbers to fetch individual assessor records via that portal

**Phase to address:**
Phase that adds the SLCo assessor data source. The UGRC alternative must be chosen before any code is written for SLCo assessor enrichment. The existing `import-ugrc-assessor.mjs` just needs a new `COUNTIES` entry added for Salt Lake.

---

### Pitfall SLC-2: Pulling 350k+ SLCo Parcels When We Only Want ~5k Rose Park Parcels — Volume Kills the Azure Function

**What goes wrong:**
Salt Lake County has approximately 350,000 assessor parcels countywide. The existing UGRC import script (`import-ugrc-assessor.mjs`) downloads ALL parcels from each county service (no geographic filter) and matches by `parcel_id` against properties already in the DB. For Carbon County (~8,000 parcels) this is fine — the loop completes in minutes. For Salt Lake County, downloading 350,000 ArcGIS features and iterating them takes 15-30 minutes and 500+ MB of memory.

But the Rose Park pilot only needs ~5,000 parcels in zip 84116. Downloading all 350k to find 5k is 70x wasteful and will time out an Azure Functions Consumption Plan (10-minute limit).

**Why it happens:**
The `import-ugrc-assessor.mjs` approach works well when the county is the right scope (Carbon = 8k parcels). Developers add Salt Lake to the `COUNTIES` array without thinking about scale. The ArcGIS `where: "1=1"` query returns everything.

**How to avoid:**
- Add a geographic filter to the UGRC ArcGIS query for Salt Lake County only. Filter by zip code or geometry: `where: "ZIP_CODE='84116'"` or by bounding box geometry that covers 84116.
- Alternatively, use a `where: "PARCEL_ID IN (...)"` approach: first check which `parcel_id` values in the DB have `county = 'salt_lake'` and only enrich those — but this only works after the initial import has run.
- Best option for MVP: Run the `import-ugrc-assessor.mjs` with a zip-code filter clause added specifically for Salt Lake County, then expand later if the pilot succeeds.
- Check that the ArcGIS query supports `ZIP_CODE` as a filterable field on the `Parcels_Salt_Lake_LIR` service before writing the filter query.
- For the SLCo tax delinquency source, the annual tax sale list is a self-scoping bulk download (all delinquent parcels for the sale, typically a few hundred to a few thousand). Filter by zip 84116 after download rather than before — the list is small enough.

**Warning signs:**
- Import script for Salt Lake County runs for more than 5 minutes
- Memory usage spikes above 512 MB in Azure Functions logs
- The ArcGIS page-fetching loop hits more than 400 pages (400 × 1,000 records = 400k records)
- Azure Function exits with a timeout error but no explicit exception logged

**Phase to address:**
Phase that adds the UGRC enrichment for Salt Lake County. The geographic filter must be in the first version of the county entry — never run `where: "1=1"` against the SLCo LIR service.

---

### Pitfall SLC-3: SLCo Parcel ID Format Is All-Numeric 10-Digit — Incompatible With Rural Parcel Format Assumptions

**What goes wrong:**
The existing `parcel_id` dedup key in the `properties` table was designed around rural Utah county formats: Carbon uses `XX-XXXX-XXXX` (hyphen-delimited) or colon-delimited variants; Emery uses similar patterns. The `normalizeParcelId()` function in `import-ugrc-assessor.mjs` strips hyphens and spaces: `raw.replace(/[\s\-\.]/g, '').toUpperCase()`. The `extractParcelId()` function in `utah-legals.ts` explicitly targets `\b(\d{2}-\d{4}-\d{4})\b` as the "Carbon-style parcel" pattern.

SLCo parcel IDs are all-numeric, 10 to 14 digits, no separators (the assessor parcel viewer URL shows `parcel_ID=2818207018` — 10 digits). The NOD text in Utah Legals trustee sale notices for SLC properties will contain parcel IDs like `21-08-207-018` or `210820701-8` (different display formats for the same underlying number) or a raw 10+ digit number. The Carbon-style regex `\b(\d{2}-\d{4}-\d{4})\b` will NOT match SLCo-format parcel IDs whether they appear with dashes or without.

When parcel extraction fails, `utah-legals.ts` falls back to a synthetic `ul-salt_lake-<address>` parcel ID. This fallback creates a new property row even if the same property was already imported via the UGRC enrichment with its real SLCo parcel ID. Two separate rows for the same property, dedup key collision avoided only because the keys differ — the property shows up twice, signals don't stack.

**Why it happens:**
`extractParcelId()` in `utah-legals.ts` was written with Carbon County's format as the canonical example. SLC's format is structurally different. The rural-specific regex is hardcoded.

**How to avoid:**
- Extend `extractParcelId()` with an SLC-format pattern. SLCo parcel IDs in notice text typically appear as: `##-##-###-###` (hyphenated sub-sections of a 10-digit number, e.g. `21-08-207-018`) or as bare 10-digit numbers. Add a regex: `\b(\d{2}-\d{2}-\d{3}-\d{3,4})\b` for the hyphenated form and `\b(\d{10,14})\b` (guarded with context like "Serial No" or "A.P.N.") for the bare form.
- Normalize on insert: strip all non-alphanumeric characters before storing `parcel_id` for SLC properties, consistent with what `normalizeParcelId()` already does in the UGRC import. The real 10-digit number `2108207018` must match whether it came in as `21-08-207-018` from a notice or as `2108207018` from UGRC.
- Audit the first 10 SLCo NOD notices manually before trusting the regex: read the raw notice text and verify what format the A.P.N. appears in.
- Add a Salt Lake County pattern to the A.P.N. extraction section of `extractParcelId()` with a clear comment documenting the format.

**Warning signs:**
- SLC-sourced Utah Legals notices all produce `ul-salt_lake-<address>` synthetic IDs instead of real parcel IDs
- UGRC import for Salt Lake County shows 0 matched rows even though properties imported from Utah Legals exist in the DB
- Two property rows exist for the same physical address in Rose Park, one with a real parcel ID and one with a synthetic `ul-` prefix ID

**Phase to address:**
Phase that activates Salt Lake County in the Utah Legals scraper. Must be fixed before the first SLC scrape run, not discovered after.

---

### Pitfall SLC-4: Utah Legals SLC Filter Duplicates NODs Already Stored From Rural-Only Runs — Silent Signal Double-Counting

**What goes wrong:**
The `utah-legals.ts` scraper currently targets 4 rural counties (Carbon, Emery, Juab, Millard). The dedup logic in `upsertFromUtahLegals()` prevents inserting a second `nod` signal for the same `propertyId`. This is correct. BUT: when Salt Lake County is added to `TARGET_COUNTIES`, the very first run will encounter every SLC foreclosure notice ever published by Utah Legals in the current search window. If any of those notices were previously scraped (e.g., during a test run or accidental prior inclusion), they will be caught by the `existingNod` check and silently skipped. More importantly, the parcel ID for the SLC properties that exist in the DB from the UGRC enrichment import will match the incoming NOD — which is correct behavior — but only if the parcel ID formats match (see Pitfall SLC-3).

The danger is the opposite: if SLC parcel IDs do NOT normalize correctly (SLC-3 not fixed), every SLC NOD creates a new synthetic-ID property row without linking to the enriched record. Score stacking fails because `distress_signals.property_id` points to a ghost row.

Additionally, Utah Legals covers ALL of Salt Lake County, not just 84116. When Salt Lake County checkbox is checked, notices for properties in Holladay, Sandy, Midvale, and every other SLC zip will be returned. The scraper has no zip-code filter — it only filters by `county` match. A Rose Park pilot that accidentally processes 400 SLC county NODs across dozens of zip codes is importing noise.

**How to avoid:**
- Add a zip-code allowlist filter in the Utah Legals SLC scraper: after county match, check `notice.city` or parse the zip from the notice body text and skip any property not in the allowed zip list (`['84116']` for the pilot).
- The zip code is sometimes present in the notice body as "Salt Lake City, UT 84116" — add a regex to `extractAddress()` that captures it.
- Alternatively, keep the county filter turned off in Utah Legals for Salt Lake County entirely and rely on the SLCo Recorder scraper (when built) for NODs specific to 84116. This is cleaner but loses the Utah Legals data source for SLC.
- Do a manual run of the scraper with logging before enabling daily scheduling: count how many SLC notices come in, what zips they represent, and how many match 84116 specifically.

**Warning signs:**
- First SLC-enabled Utah Legals scrape imports 200+ new property rows across many cities other than Rose Park
- Dashboard "new today" count spikes dramatically without a corresponding Rose Park explanation
- NOD signals appear for properties in Sandy, Midvale, or other zip codes that are not in the `target_cities` list

**Phase to address:**
Phase that activates Salt Lake County in the Utah Legals scraper. The zip filter must be implemented before the first production run.

---

### Pitfall SLC-5: SLCo Address Grid Creates Multiple Valid Representations of the Same Address — normalizeAddress() Will Mismatch Them

**What goes wrong:**
Salt Lake City uses a grid system centered on Temple Square. A Rose Park address can legitimately appear as any of these representations for the same physical location:

- `"950 N Redwood Rd"` (named street + cardinal)
- `"950 N 1700 W"` (both coordinates explicit)
- `"N 1700 W: 950"` (county assessor colon format that `normalizeAddress()` handles)
- `"950 North Redwood Road"` (spelled out)
- `"950 N. Redwood Rd."` (abbreviations with periods)

The existing `normalizeAddress()` function handles the assessor colon format and title-casing. It does NOT handle:
- Grid addresses where the street number IS itself a directional coordinate (`1700 W` as a street name, not a house-number direction)
- Addresses where the same street has both a named and a grid designation (e.g., `900 W` is also `Redwood Rd` in some contexts)
- The `N 800 W` → `800 N W` transposition that UGRC itself warns about in their address locating documentation

When a trustee sale notice has `"950 N Redwood Rd"` and the DB property row (from UGRC enrichment) stores `"950 N 1700 W"`, the address-match fallback in dedup logic produces no match. A new phantom property row is created.

**Why it happens:**
`normalizeAddress()` was designed for rural Utah assessor formats: `"E MAIN ST: 1110"` → `"1110 E Main St"`. SLC's grid system generates structurally different ambiguity. The named/grid dual-name issue is unique to SLC and does not appear in Carbon or Emery county data.

**How to avoid:**
- Accept that address-match dedup will be lossy for SLC properties and rely on parcel ID as the primary dedup key (see Pitfall SLC-3 — fix that first).
- Do NOT extend `normalizeAddress()` to handle SLC grid ambiguity in v1.3. The right fix is ensuring parcel IDs extract correctly so address matching is never needed.
- In `extractParcelId()`, be aggressive about extracting the SLC parcel ID from notice text — when present, the parcel ID sidesteps the address ambiguity entirely.
- For the Rose Park pilot, document that address-based matching for SLC is LOW confidence and require parcel-ID match before merging signals.
- Post-v1.3: evaluate using UGRC's geocoding API to resolve ambiguous SLC addresses to canonical form.

**Warning signs:**
- Multiple property rows with different addresses that are physically the same Rose Park property
- A property has an `nod` signal (from Utah Legals) and a `tax_lien` signal (from SLCo delinquent list) but both are on different `property_id` rows and the dashboard shows score=1 for each instead of score=2+ on one row
- `ul-salt_lake-<normalized-address>` synthetic IDs where the address normalization differs between the recorder source and the assessor source

**Phase to address:**
Phase that activates Salt Lake County in the Utah Legals scraper and SLCo delinquent scraper. Fix parcel ID extraction first (SLC-3); then assess whether address-based dedup needs improvement.

---

### Pitfall SLC-6: Urban Scoring Threshold — Rural Score of 4 Produces Zero Hot Leads in Rose Park (or Too Many)

**What goes wrong:**
The current `hot_lead_threshold` is 4 (from `scraper_config`). This was calibrated for rural counties where the signal mix is: tax liens (weight 1-4 by amount) + years delinquent bonus. A Rose Park property with only one NOD (weight 3, the highest single-signal weight) scores 3 — below the hot threshold. In rural Carbon County, a single NOD almost always has a co-occurring tax lien because small-town homeowners in financial distress frequently have both. In Rose Park, high urban property values mean some homeowners are in foreclosure but NOT delinquent on taxes (equity stripping, divorce, job loss with high-value home).

The opposite risk: if SLCo has a high density of code violation or lis pendens signals that were previously absent, new signals may cross the threshold for properties that are borderline distressed rather than genuinely hot.

**Why it happens:**
The threshold was never tested against urban data. Rural distress signal mix ≠ urban distress signal mix. SLC has a different ratio of NOD-only vs. NOD+tax lien vs. code violations.

**How to avoid:**
- Before finalizing the threshold for SLC, run a dry-run rescore on the first 50 SLC properties imported and observe score distribution.
- Consider setting a per-county threshold modifier in `scraper_config` rather than one global threshold. If the schema supports it, add a `hot_lead_threshold_salt_lake` config key.
- If a per-county threshold is too complex for v1.3, accept a slightly lower threshold for the pilot (e.g., 3 instead of 4) and set it back to 4 if false positives overwhelm the dashboard. This is better than seeing zero Rose Park hot leads and concluding the pilot failed.
- NOD-only in SLC should be treated as "warm" (score 3), not "cold." The current scoring already puts NOD at weight 3 which is warm territory. The pilot will fail to surface any Rose Park leads as "hot" unless a second signal is also present — which may be unrealistically rare for a healthy urban market.

**Warning signs:**
- Rose Park pilot runs for 2+ weeks with zero hot leads despite known NODs being imported
- Score distribution for SLC shows a cliff: many properties at score 3, none at score 4+
- Brian reports "I can see the NODs in the signals tab but the property never shows as hot"

**Phase to address:**
Phase that performs scoring calibration for Salt Lake County. Address before or immediately after the first scrape run.

---

## Moderate Pitfalls

### Pitfall SLC-7: Zip Code 84116 Covers More Than Rose Park — Non-Rose-Park Properties Will Appear in the Dashboard

**What goes wrong:**
ZIP code 84116 is not a perfect boundary for Rose Park. It also covers portions of Poplar Grove, Fair Park, and industrial areas along North Temple corridor. Rose Park itself also uses a secondary zip (84054 applies to parts of the northernmost blocks per some sources). Using `city = 'Rose Park'` (the PROJECT.md plan) is cleaner than zip filtering, but the source data assigns city to whatever the assessor recorded — which for SLC may be `"SALT LAKE CITY"` for all parcels regardless of neighborhood.

**How to avoid:**
- The PROJECT.md plan to retag 84116 as `city = 'Rose Park'` is the right approach — it creates a stable filter key for the dashboard. Implement it as a post-import transform: after UGRC enrichment sets the zip code on SLC properties, run: `UPDATE properties SET city = 'Rose Park' WHERE zip = '84116' AND county = 'salt_lake'`.
- Accept that a small number of Poplar Grove / Fair Park properties in 84116 will appear in the Rose Park dashboard view. For a pilot, this is acceptable — they are adjacent neighborhoods with similar demographics.
- Do NOT attempt sub-zip polygon filtering in v1.3. It requires geospatial queries and adds complexity that is not worth it for a pilot.
- If the `zip` column in the DB is not reliably populated for SLC properties after enrichment, check that the UGRC LIR service includes a `ZIP_CODE` field in its `FIELDS` query string.

**Warning signs:**
- All SLC properties imported with `city = 'SALT LAKE CITY'` rather than 'Rose Park' — the city filter in the dashboard returns nothing when filtering by "Rose Park"
- The UGRC `Parcels_Salt_Lake_LIR` service doesn't include a `ZIP_CODE` field (check before assuming)
- Industrial parcels or commercial properties from North Temple appear in the Rose Park dashboard

**Phase to address:**
Phase that adds the `city = 'Rose Park'` retagging transform. Must happen before dashboard filtering is validated.

---

### Pitfall SLC-8: SLCo Recorder's Public Search Requires Manual ToS Acceptance and Has Session Requirements — Playwright Automation Is Fragile

**What goes wrong:**
The SLCo Recorder's public search at `apps.saltlakecounty.gov/data-services/DataServicesAccess/PublicSearch.aspx` requires users to check an "I have read and agree to Terms of Service" checkbox before every session. The search interface auto-populates from a dropdown (address or parcel number must be selected from the auto-populated list). This is a form-interaction-heavy portal, not a simple paginated table like Carbon County's delinquent list.

Additionally, the address search says the parcel must be "selected from the auto-populated drop down list" — which means the search is not a raw string POST but an auto-complete interaction. Playwright can handle this but requires more complex interaction logic than the existing scrapers.

The Recorder's data services portal also offers paid tiers ($300-$6,000 data packages) with a Data Services Agreement. Automated use of the free/public tier raises the same commercial-use ToS question as the assessor portal.

**How to avoid:**
- For v1.3 Rose Park pilot, use the SLCo Recorder's direct document type search (available by document type without individual parcel lookup) to fetch recent `NT DF` (Notice of Default), `N SALE` (Notice of Trustee Sale), and `LIS PN` (Lis Pendens) filings. This is a date-range search, not a parcel-specific search, and does not require per-property auto-complete interaction.
- Check the document type search URL pattern: `apps.saltlakecounty.gov/data-services/` may have a date-range + document-type filter that returns a list of all recent filings — similar to how Carbon County's recorder would work if it had a portal.
- Limit scraping to the NOD/NTS document type endpoint only; do not scrape the individual property detail pages.
- Add a 2-3 second delay between page requests (match the current rate-limit pattern from `rateLimitDelay()` in the existing scrapers).
- If the auto-complete requirement makes bulk date-range search impossible, consider using the SLCo Recorder's PropertyWatch email alert (which sends NOD notifications for registered parcels) as a manual intake channel instead.

**Warning signs:**
- Playwright session against the recorder fails on the ToS checkbox (missing automation)
- Auto-complete dropdown doesn't populate within the Playwright wait timeout
- HTTP 429 or session invalidation errors from `apps.saltlakecounty.gov` after rapid requests

**Phase to address:**
Phase that builds the SLCo Recorder scraper. The document-type date-range approach must be validated against the live portal before committing to Playwright automation.

---

### Pitfall SLC-9: UGRC Enrichment for Salt Lake County Has HIGH Match Rate But the `import-ugrc-assessor.mjs` Normalizer Strips Dots Only — SLCo Format May Have Dots in PARCEL_ID

**What goes wrong:**
The existing `normalizeParcelId()` in `import-ugrc-assessor.mjs` strips: `[\s\-\.]` (spaces, hyphens, dots). The DB-side match in the SQL is: `UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', ''))` — which strips only hyphens and spaces, NOT dots. If UGRC's `PARCEL_ID` for SLCo uses dots as separators (e.g., `21.08.207.018`) and the DB-side normalization doesn't strip dots, the join fails silently.

**How to avoid:**
- Before running the import for Salt Lake County, download a small sample of the `Parcels_Salt_Lake_LIR` ArcGIS layer (100 records) and inspect the raw `PARCEL_ID` values. Confirm whether separators exist and what kind.
- Update the DB-side SQL normalization to also strip dots: `REPLACE(REPLACE(REPLACE(parcel_id, '-', ''), ' ', ''), '.', '')`.
- Run the `countyNoMatch` counter after the first SLC import and compare it to the SLC property count in the DB. Anything above 20% no-match rate means the normalizer has a gap.

**Warning signs:**
- `countyNoMatch` is high (>20%) for Salt Lake County despite known properties existing in the DB
- `countyUpdated` is 0 for Salt Lake County after import
- Spot-checking: a SLC parcel ID in the UGRC layer doesn't match the same property's `parcel_id` in the DB even after visual inspection

**Phase to address:**
UGRC enrichment phase for Salt Lake County. Run the sample inspection before writing the import extension.

---

### Pitfall SLC-10: SLCo Delinquent Tax List Is Published Once Annually (Before the Tax Sale) — Not a Monthly Signal

**What goes wrong:**
Carbon County's delinquent property scraper (`carbon-delinquent.ts`) runs against a live-updated table that reflects current delinquency. Salt Lake County's equivalent is the annual tax sale list, published approximately 4 weeks before the May tax sale and updated weekly. The 2026 list will be available on April 29, 2026. Between publications (May to April), no equivalent delinquent list exists as a free bulk download.

This means the SLCo tax delinquency source is a once-per-year event, not a daily/weekly scrape. Building a daily Azure Function schedule for it is pointless and will return 0 results 48 weeks of the year, potentially triggering false zero-result health alerts.

**How to avoid:**
- Schedule the SLCo delinquent tax scraper as an annual run (April/May) rather than daily or weekly. Use a separate Azure Function with a cron schedule that triggers only in April-May.
- Alternatively, use the `saltlakecounty.gov/treasurer/property-taxes/find-delinquent-property-balance/` individual lookup in conjunction with a known parcel list (from UGRC import) to check specific properties — but this is per-property and not scalable to thousands of parcels.
- The tax sale list format (downloadable PDF vs. web table) is not confirmed from research. Plan to manually inspect the list when it publishes April 29, 2026, and build the scraper for the format actually found.
- Adjust the health alert threshold for the SLCo delinquent function: do not alert on zero results except during April-May window.

**Warning signs:**
- SLCo delinquent function is scheduled with the same daily/weekly cron as Carbon County
- Zero-result health alerts firing every day for the SLCo delinquent function in June-March
- Developer assumes the list is always available and writes code that 404s outside the April-May window

**Phase to address:**
Phase that builds the SLCo delinquent tax scraper. Annual-only scheduling must be established from the start.

---

### Pitfall SLC-11: `target_cities` Config Must Be Updated or Rose Park Properties Are Filtered Out of the Dashboard

**What goes wrong:**
`queries.ts` filters all dashboard properties to the `target_cities` list from `scraper_config`. The default view enforces: `lower(properties.city) IN (lower($1), lower($2), ...)`. If `'Rose Park'` is not added to the `target_cities` list in the DB, every Rose Park property imports successfully but never appears in the dashboard. The scrape succeeds (properties and signals are in the DB), but the UI shows nothing. This is the definition of a silent failure.

Inspecting the code: `getDashboardStats()` and `getProperties()` both call `getTargetCitiesList()` and apply the filter unless a specific `params.city` is set. An investor checking the dashboard would see zero Rose Park leads and conclude the scraper is broken, when in fact the data exists but is filtered out.

**How to avoid:**
- Add `'Rose Park'` to the `target_cities` JSON array in `scraper_config` as part of the same migration/seed that activates the SLC scrapers.
- Write this as a DB migration step, not a manual SQL command: `UPDATE scraper_config SET value = jsonb_set(value::jsonb, '{}', '...') WHERE key = 'target_cities'`. Include Rose Park in the list.
- Verify the city retagging (from Pitfall SLC-7) has run BEFORE validating the dashboard filter: if properties are stored as `city = 'SALT LAKE CITY'` and the target list has `'Rose Park'`, the filter still returns nothing.
- After the first scrape run, manually check `SELECT city, count(*) FROM properties WHERE county = 'salt_lake' GROUP BY city` to confirm the city field value that was actually stored.

**Warning signs:**
- Dashboard shows 0 properties after first SLC scrape run despite DB showing new rows with `county = 'salt_lake'`
- `SELECT count(*) FROM properties WHERE county = 'salt_lake'` returns > 0 but dashboard count is 0
- `city` field on SLC properties is `'SALT LAKE CITY'` (assessor default) instead of `'Rose Park'`

**Phase to address:**
Phase that sets up the Rose Park city filter in the dashboard. Must be verified as the final step before calling the pilot "live."

---

## Minor Pitfalls

### Pitfall SLC-12: Utah Legals SLC County Checkbox Index Is Not Documented — Scraper Will Select Wrong County

**What goes wrong:**
The `utah-legals.ts` scraper uses hardcoded checkbox indexes to select counties in the Utah Legals search UI: `{ index: 3, name: "carbon" }`, `{ index: 7, name: "emery" }`, etc. The comment in the file documents: `Carbon=3, Emery=7, Juab=11, Millard=13`. Salt Lake County's checkbox index is not documented and is not in the current `TARGET_COUNTIES` array. If the wrong index is used, the scraper silently selects a different county (e.g., Rich or Summit) and returns results labeled as Salt Lake but actually from another county.

**How to avoid:**
- Before adding Salt Lake County to `TARGET_COUNTIES`, load the Utah Legals search page manually and inspect the DOM to find the correct `id` for the Salt Lake County checkbox (it will be `ctl00_ContentPlaceHolder1_as1_lstCounty_N` where N is the 0-based index).
- The county list on Utah Legals is alphabetical: Beaver=0, Box Elder=1, Cache=2, Carbon=3, Daggett=4, Davis=5, Duchesne=6, Emery=7, Garfield=8, Grand=9, Iron=10, Juab=11, Kane=12, Millard=13, Morgan=14, Piute=15, Rich=16, Salt Lake=17, San Juan=18, Sanpete=19, Sevier=20, Summit=21, Tooele=22, Uintah=23, Utah=24, Wasatch=25, Washington=26, Wayne=27, Weber=28. Salt Lake should be index 17, but verify this against the live DOM before hardcoding.
- Add an assertion in the scraper: after selecting the county, verify the checkbox ID matched an element with `value` or `label` containing "salt lake" before proceeding.

**Warning signs:**
- First SLC-enabled scrape returns notices with unexpected city/county values (not Salt Lake City)
- County filter returns notices from Summit or Sanpete instead of Salt Lake
- `console.log` shows "Checked county: salt_lake (index 17)" but notices show `county: "summit"`

**Phase to address:**
Phase that activates Salt Lake County in the Utah Legals scraper.

---

### Pitfall SLC-13: Rose Park Boundary Is Not the Same as 84116 Boundary — Distress Leads From Industrial/Non-Residential Parcels Will Enter the Pipeline

**What goes wrong:**
84116 includes industrial parcels along North Temple Street, rail yards, commercial strips, and parcels that are not residential properties. The existing `hideVacantLand` and `propertyType` filters in `queries.ts` will catch some of these, but commercial and industrial parcels classified as neither "vacant" nor "land" will pass through. An industrial building in foreclosure is not a wholesalable residential lead.

**How to avoid:**
- The existing `hideEntities` filter (which excludes LLC/Trust owners) helps here, since most commercial/industrial SLC parcels are owned by entities, not individuals.
- The `hideVacantLand` filter already excludes `%land%`, `%agricultural%`, `%farm%`, and `%range%` property types.
- Add `%commercial%`, `%industrial%`, `%warehouse%` to the `propertyType` exclusion list in `queries.ts` only when SLC data is live. Do not add these globally now — they may not exist in rural county data.
- Alternatively, add a `propertyType LIKE '%residential%'` allowlist filter that only applies when `county = 'salt_lake'`. But this requires knowing UGRC's property classification values for SLC, which need to be confirmed from the LIR data.

**Warning signs:**
- Dashboard shows warehouse, storage unit, or North Temple commercial properties as Rose Park leads
- Owner names include commercial names that the entity filter doesn't catch (sole proprietorships)
- Properties with no `building_sqft` and enormous `lot_acres` appearing in the Rose Park list

**Phase to address:**
Phase that validates dashboard filtering for Salt Lake County data.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add Salt Lake to UGRC COUNTIES array with `where: "1=1"` | One-line change | Downloads 350k records, times out Azure Function, fills DB with 345k unwanted properties | Never — add the zip filter at the same time |
| Use `city = 'SALT LAKE CITY'` as stored by assessor | No transform needed | All SLC properties hidden behind the `target_cities` filter, dashboard shows 0 results | Never — the Rose Park retag is required |
| Rely on address-match dedup for SLC instead of parcel ID | Faster to build | Duplicate property rows, signals don't stack, scoring fails silently | Never — fix parcel ID extraction first |
| Skip the zip-code filter on Utah Legals SLC results | Simpler scraper | Imports NODs for all SLC zip codes, clutter in DB, misleading stats | MVP acceptable only if DB query filters by zip/city at display time |
| Set SLCo delinquent scraper to daily schedule | Consistent with other scrapers | Fires 300+ unnecessary runs per year, triggers false zero-result health alerts | Never — annual schedule from the start |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SLCo Assessor portal (`apps.saltlakecounty.gov`) | Scrape directly like Carbon County assessor | Use UGRC ArcGIS `Parcels_Salt_Lake_LIR` — same as existing UGRC import pattern, no ToS issue |
| UGRC `Parcels_Salt_Lake_LIR` | Run with `where: "1=1"` | Add `ZIP_CODE='84116'` filter clause or limit to DB-resident parcel IDs |
| Utah Legals county filter | Hardcode SLC index without verifying DOM | Inspect live DOM for Salt Lake County checkbox index (expected index 17) before hardcoding |
| SLCo delinquent tax list | Treat as live/daily source like Carbon's delinquent table | Annual publication (April/May only); annual-only cron schedule |
| `target_cities` config | Forget to add 'Rose Park' | Explicitly add to DB config in same migration that enables SLC scrapers |
| `parcel_id` dedup key | Assume rural regex handles SLC format | SLCo is 10-digit all-numeric; extend `extractParcelId()` with SLC-specific pattern |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| UGRC SLCo download without zip filter | Azure Function timeout, 350k records fetched, memory error | Add `ZIP_CODE='84116'` ArcGIS query filter for SLC | Immediately on first run |
| Checking all 350k SLC parcel IDs against DB | Per-parcel DB query loop runs 350k iterations | Batch or pre-filter by county before iterating | At ~50k records |
| SLCo delinquent function on daily schedule | Health alerts fire 300+ times/year with 0 results | Annual-only cron, suppress health alerts for off-season | Immediately |
| Utah Legals SLC county returning all SLC zip codes | DB grows rapidly with non-84116 properties | Zip code allowlist filter in scraper | At first SLC-enabled run |

---

## Legal and ToS Concerns

| Portal | Restriction | Risk Level | Mitigation |
|--------|-------------|------------|------------|
| SLCo Assessor (`apps.saltlakecounty.gov/assessor`) | Explicit no-commercial-use, no-resale clause in ToS | MEDIUM — civil/contractual, not criminal; violation of terms of a government portal | Use UGRC ArcGIS instead; never automate the assessor portal |
| SLCo Recorder public search (`/data-services/`) | ToS checkbox required; Data Services Agreement for paid tiers | MEDIUM | Use document-type date-range search cautiously; do not bulk-scrape individual property detail pages |
| Utah Legals (`utahlegals.com`) | No explicit terms violation found; scraper already in production for 4 counties | LOW | Maintain existing rate limits; scraper has been running without issues |
| UGRC ArcGIS FeatureServer | Public government data service; no commercial-use restriction found | LOW | Existing pattern; continue using for SLC enrichment |

---

## "Looks Done But Isn't" Checklist

- [ ] **SLC parcel ID extraction:** Often broken — verify that `extractParcelId()` returns a real SLCo 10-digit number from a sample SLC NOD notice text (not a `ul-` synthetic ID)
- [ ] **City retagging:** Often missing — verify `SELECT city FROM properties WHERE county = 'salt_lake' LIMIT 10` shows 'Rose Park' not 'SALT LAKE CITY'
- [ ] **target_cities config:** Often forgotten — verify `SELECT value FROM scraper_config WHERE key = 'target_cities'` includes 'Rose Park'
- [ ] **Dashboard shows SLC leads:** Definitive end-to-end check — navigate to dashboard, select "Rose Park" in city filter, confirm properties appear
- [ ] **Score >= 1 for SLC properties:** Verify at least one SLC property has a `distress_score > 0` and a `distress_signal` row linked to it
- [ ] **UGRC import zip filter:** Verify the SLC UGRC import fetched <10,000 records (not 350,000) by checking import log output
- [ ] **SLCo delinquent schedule:** Verify the function timer cron is annual (April-May window) not daily
- [ ] **Utah Legals SLC index:** Verify the `TARGET_COUNTIES` index for Salt Lake County matches the actual checkbox ID in the live DOM

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| 350k SLC parcels imported to DB | HIGH — data cleanup | `DELETE FROM properties WHERE county = 'salt_lake' AND zip != '84116'`; add zip filter to UGRC import; re-run |
| Duplicate property rows (synthetic vs. real parcel ID) | MEDIUM | Write migration to merge by address; mark synthetic IDs for deletion; add parcel ID extraction fix first |
| SLC properties hidden by target_cities filter | LOW | Add 'Rose Park' to `scraper_config.target_cities` via single SQL UPDATE; verify dashboard immediately |
| City stored as 'SALT LAKE CITY' not 'Rose Park' | LOW | `UPDATE properties SET city = 'Rose Park' WHERE zip = '84116' AND county = 'salt_lake'`; validate dashboard |
| ToS violation on SLCo assessor portal | MEDIUM | Stop automated access immediately; switch to UGRC; no data loss (UGRC covers the same data) |
| Wrong Utah Legals county index (non-SLC county selected) | LOW | Delete imported properties from wrong county; fix index; re-run |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| SLC-1: ToS — assessor portal | Phase: SLC data sources planning | Confirm UGRC is the SLC assessor source, never `apps.saltlakecounty.gov/assessor` |
| SLC-2: 350k parcel volume | Phase: UGRC enrichment for SLC | Import log shows <10k records fetched for Salt Lake County |
| SLC-3: Parcel ID format mismatch | Phase: Utah Legals SLC activation | Manual spot-check of 10 SLC notice texts; `extractParcelId()` returns real 10-digit IDs |
| SLC-4: NOD dedup + zip scope | Phase: Utah Legals SLC activation | First run produces <50 SLC properties; all are in 84116 |
| SLC-5: Address grid ambiguity | Phase: Utah Legals SLC activation | Parcel ID match rate >80% for SLC notices (address fallback rare) |
| SLC-6: Urban scoring threshold | Phase: Scoring calibration for SLC | Score distribution for SLC properties shows at least some warm/hot leads after 2 weeks |
| SLC-7: Zip 84116 scope | Phase: City retagging + dashboard filter | `SELECT DISTINCT city FROM properties WHERE county = 'salt_lake'` shows only 'Rose Park' |
| SLC-8: Recorder portal session/ToS | Phase: SLCo Recorder scraper | Recorder scraper uses document-type date-range search, not per-parcel auto-complete |
| SLC-9: UGRC normalizer dot-stripping | Phase: UGRC enrichment for SLC | `countyNoMatch < 20%` for Salt Lake County after first import |
| SLC-10: Annual delinquent list | Phase: SLCo delinquent scraper | Cron schedule is April-May only; health alert config accounts for off-season zeros |
| SLC-11: target_cities missing Rose Park | Phase: Dashboard filter validation | Dashboard shows SLC properties when 'Rose Park' city filter is selected |
| SLC-12: Wrong Utah Legals checkbox index | Phase: Utah Legals SLC activation | Verify DOM before hardcoding index; add assertion in scraper |
| SLC-13: Commercial/industrial parcels | Phase: Dashboard filter validation for SLC | No warehouse or commercial SLC properties visible in default dashboard view |

---

## Sources

- [Salt Lake County Assessor Terms of Use — intro page](https://apps.saltlakecounty.gov/assessor/new/query/intropage.cfm) — HIGH confidence (official, terms text confirmed)
- [Salt Lake County Assessor Parcel Data page](https://www.saltlakecounty.gov/assessor/parcel-data/) — HIGH confidence (official; CAMA database $1,500 purchase option confirmed)
- [Salt Lake County Recorder Data Services](https://www.saltlakecounty.gov/recorder/data-services/) — HIGH confidence (official; $5/$300/$6,000 tiers confirmed)
- [SLCo Recorder Public Search — ToS checkbox requirement](https://apps.saltlakecounty.gov/data-services/DataServicesAccess/PublicSearch.aspx) — HIGH confidence (official; ToS checkbox and auto-complete confirmed)
- [SLCo Recorder Document Types](https://apps.saltlakecounty.gov/data-services/PropertyWatch/DocumentTypes.aspx) — HIGH confidence (official; NT DF, LIS PN, N SALE, TRS D confirmed)
- [SLCo Tax Sale List — 2026 available April 29](https://www.saltlakecounty.gov/property-tax/property-tax-sale/current-tax-sale-list/) — HIGH confidence (official; annual publication confirmed)
- [SLCo Delinquent Property Balance — individual lookup only](https://www.saltlakecounty.gov/treasurer/property-taxes/find-delinquent-property-balance/) — HIGH confidence (official; alphabetical index lookup confirmed)
- [UGRC Salt Lake County Parcels LIR](https://opendata.gis.utah.gov/datasets/utah-salt-lake-county-parcels-lir) — HIGH confidence (official UGRC; LIR service exists for SLC)
- [SLCo Assessor Parcel Viewer — parcel ID format observed in URL](https://apps.saltlakecounty.gov/assessor/new/javaapi2/parcelviewext.cfm?parcel_ID=2818207018&query=Y) — MEDIUM confidence (10-digit format inferred from URL parameter; no official format spec found)
- [Rose Park, Salt Lake City — Wikipedia](https://en.wikipedia.org/wiki/Rose_Park,_Salt_Lake_City) — MEDIUM confidence (geography, boundaries, zip codes 84116 and 84054)
- [SLC Address Grid System Explained](https://everydaywanderer.com/salt-lake-city-street-addresses) — MEDIUM confidence (grid system mechanics, dual naming, parsing traps)
- [UGRC Utah Address System Quadrants](https://gis.utah.gov/products/sgid/location/address-system-quadrants/) — HIGH confidence (official UGRC; N/S/E/W grid coordinate system)
- [apps.saltlakecounty.gov robots.txt](https://apps.saltlakecounty.gov/robots.txt) — HIGH confidence (confirmed; no broad Disallow rules for scraper user agents)
- [HouseFinder scraper/src/sources/utah-legals.ts](../../scraper/src/sources/utah-legals.ts) — HIGH confidence (live production code; county index map, extractParcelId regex, TARGET_COUNTIES pattern)
- [HouseFinder scraper/src/lib/upsert.ts](../../scraper/src/lib/upsert.ts) — HIGH confidence (live production code; normalizeAddress, upsertFromUtahLegals dedup logic)
- [HouseFinder app/src/scripts/import-ugrc-assessor.mjs](../../app/src/scripts/import-ugrc-assessor.mjs) — HIGH confidence (live production code; normalizeParcelId, COUNTIES array, DB-side strip logic)
- [HouseFinder app/src/lib/queries.ts](../../app/src/lib/queries.ts) — HIGH confidence (live production code; target_cities filter, hideVacantLand filter, city ilike filter)

---

**Legal Disclaimer:** The ToS analysis above is based on publicly available terms text and is not attorney advice. The key finding — that SLCo assessor portal explicitly prohibits commercial use — is material to the scraping architecture decision. Using UGRC instead of the assessor portal avoids this exposure without losing data access.

---

*Pitfalls research for: HouseFinder v1.3 — Salt Lake County urban expansion, Rose Park pilot*
*Researched: 2026-04-17*
