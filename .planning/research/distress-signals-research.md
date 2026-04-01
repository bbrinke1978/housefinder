# Distress Signal Sources Research
# Rural Utah Counties: Carbon, Emery, Juab, Millard

**Researched:** 2026-03-19
**Research Mode:** Ecosystem / Feasibility
**Overall Confidence:** HIGH (direct county website verification for most findings)

---

## Executive Summary

The current HouseFinder scoring system assigns every property a score of 1 because only one signal type
(tax_lien) is being collected, and all 1,761 properties have it. To differentiate properties by risk level,
the system needs additional signals. This research evaluates every practical free source.

**Bottom line findings:**

1. **Easiest win (no new scraping needed):** Enhance the existing delinquent tax scraping to extract
   amount owed and years delinquent. All four counties publish multi-year back tax tables. Carbon and
   Emery expose online tables; Juab and Millard publish annual PDFs. This creates tiered tax_lien scoring
   within data already being collected.

2. **Second easiest win — trustee sale imminent flag:** Carbon publishes a tax sale PDF 30 days before
   the annual May sale. Emery, Juab, and Millard do the same. Properties on this list are in their 5th year
   of delinquency and days away from losing the property. This warrants a new `tax_sale_pending` signal.

3. **Trustee sale / foreclosure notices:** Utah Legals (utahlegals.com) is a free searchable database of
   all legally required public notices published in Utah newspapers, including trustee sale (NOD-equivalent)
   notices. It covers all four counties and is scrapable via HTML search form. This provides a `nod` signal.

4. **Foreclosure court filings:** Utah Courts publishes free weekly CSV case filings reports. Case type `LM`
   (Lien/Mortgage Foreclosure) and `ES` (Estate/Probate) are included. Filtering for the 7th Judicial
   District (covers Carbon, Emery, Grand, San Juan) yields both foreclosure and probate signals. Juab is
   in the 4th District and Millard is in the Millard District.

5. **County recorder — NOD/lis pendens:** Juab and Millard recorders have Tyler Technologies EagleWeb
   portals with public (no-login) index search. Carbon's recorder has a "Recorded Document Lookup" portal
   but no confirmed EagleWeb URL. Emery has NO online search — in-person only. Scrapability varies.

6. **USPS vacancy data:** Restricted to government/nonprofits only via HUD. Not accessible free for
   private use. Dead end.

7. **Code violations:** Already researched (see code-violations-research.md). No online public database
   in any of these counties. Dead end without XChange ($40/mo).

8. **FEMA disaster declarations:** Carbon and Emery were NOT included in any major FEMA disaster
   declarations from 2020-2025. Not a useful signal for these specific counties.

9. **Building permits:** State permit database is paid ($5 minimum). Carbon has an internal system not
   publicly searchable. Low value — absence of permits doesn't indicate distress directly.

---

## Source 1: Enhanced Delinquent Tax Data (HIGHEST PRIORITY)

**Status:** Already scraping delinquent tax data — this is about making it richer, not new scraping.

### Carbon County — 5-Year Back Tax Table

- **URL:** `https://www.carbon.utah.gov/department/treasurer/`
- **Direct PDF:** `https://www.carbon.utah.gov/Tax/2023TaxDelinquent.pdf` (pattern for prior years)
- **2025 Delinquent List:** Referenced as `2025-Current-year-Delinquent-Flat.pdf` on treasurer page
- **Cost:** Free
- **Format:** PDF (tabular)
- **Fields available:** Parcel Number, Owner Name, Address, Total Acres, Minimum Bid Amount (taxes +
  penalties + interest + admin costs combined)
- **Years of delinquency available:** PDF lists properties in 5th year of delinquency (tax sale candidates)
- **Update frequency:** Annual (December / before May tax sale)
- **Scrapable:** Yes — PDF parse with pdf-parse or pdfjs

**Limitation:** The Carbon annual delinquent PDF is only for 5th-year properties (tax sale ready). For
earlier-year delinquencies with year-by-year amounts, the existing scraper captures the full delinquent
list, but it's unclear if it extracts the total amount owed. Recommend verifying what the current scraper
extracts vs. what's available on the page.

### Emery County — 5-Year Back Tax Online Table

- **URL:** `https://emery.utah.gov/home/offices/treasurer/5-year-back-tax-info/`
- **Cost:** Free
- **Format:** HTML interactive table (WordPress hosted, no login required)
- **Fields available:**
  - Parcel Number
  - Owner Name
  - 2025 tax amount
  - 2024 tax amount
  - 2023 tax amount
  - 2022 tax amount
  - 2021 tax amount
  - Other Years (earlier amounts)
  - Total Tax (combined owed)
- **Update frequency:** Updated as of February 27, 2026 (near real-time)
- **Scrapable:** YES — HTML table, straightforward DOM scraping. This is the best structured data
  source found in the research. Values range from under $10 to $293,462 (mining companies).

**This is the most actionable data source found. The year-by-year breakdown lets us compute:**
- `years_delinquent` = count of years with non-zero amounts
- `total_owed` = Total Tax column value
- Both can feed a tiered distress weight within the existing `tax_lien` signal type.

### Emery County — Current Year Delinquent PDF

- **URL:** `https://emery.utah.gov/wp-content/uploads/2025/12/2025-Current-Delinquent-List.pdf`
- **Prior year:** `https://emery.utah.gov/wp-content/uploads/2024/12/Delinquent-Tax-Listing-2024.pdf`
- **Cost:** Free
- **Format:** PDF
- **Update frequency:** Annual (December)
- **Scrapable:** Yes — PDF parse

### Juab County — Delinquent Tax List

- **Announcement page:** `https://juabcounty.gov/notice-2024-delinquent-tax-list/`
- **2025 Tax Sale notice:** `https://juabcounty.gov/notice-2025-delinquent-tax-sale/`
- **PDF URL pattern:** Not confirmed — must be discovered from WordPress posts on juabcounty.gov
  (NOTE: This matches the existing DATA-10 requirement to dynamically discover the PDF URL)
- **Cost:** Free
- **Format:** PDF
- **Fields:** Expected to match other county PDFs — parcel, owner, amount, address
- **Update frequency:** Annual (December for delinquent list, ~30 days before May tax sale for sale list)
- **Scrapable:** Yes — requires WordPress post scraping to discover PDF URL (already planned in DATA-10)

### Millard County — Delinquent Tax PDF

- **URL:** `https://millardcounty.gov/your-government/elected-officials/treasurer/delinquent-tax-listing/`
- **Direct PDF:** `https://millardcounty.gov/wp-content/uploads/2025/12/2025-Deliquent-List.pdf`
  (NOTE: typo in URL — "Deliquent" not "Delinquent" — this is the actual URL)
- **Cost:** Free
- **Format:** PDF
- **Fields:** Not confirmed — prior year PDF at `https://millardcounty.gov/wp-content/uploads/treasurer/docs/2018-Delinquent-Tax-List.pdf`
- **Update frequency:** Annual (December)
- **Scrapable:** Yes — PDF parse. URL is predictable year-over-year.

### Scoring Enhancement Recommendation

Instead of flat weight=2 for any tax_lien, use tiered weights based on data extracted from these sources:

| Condition | Weight |
|-----------|--------|
| 1 year delinquent | 1 |
| 2 years delinquent | 2 |
| 3 years delinquent | 3 |
| 4 years delinquent | 4 |
| 5+ years (tax sale candidate) | 5 |
| Amount owed > $5,000 | +1 bonus |
| Amount owed > $20,000 | +2 bonus |

This alone would turn the current "every property = score 1" problem into a distribution of 1-7+ scores
using only data we already collect, without any new scraping sources.

---

## Source 2: Tax Sale Pending Lists (NEW SIGNAL: `tax_sale_pending`)

Properties that appear on the annual tax sale list are in their 5th year of delinquency and face imminent
loss of property. This warrants a dedicated high-weight signal distinct from tax_lien.

### Carbon County Tax Sale List

- **URL:** `https://www.carbon.utah.gov/service/delinquent-tax-sales/`
- **PDF:** `https://www.carbon.utah.gov/Tax/2025-Tax-Sale-Public-Notice.pdf` (pattern observed)
- **Cost:** Free
- **Format:** PDF published ~30 days before May tax sale
- **Fields:** Parcel Number, Address (if available), Total Acres, Owner Name, Minimum Bid Amount
- **Update frequency:** Annual (April/May)
- **Scrapable:** Yes — PDF parse; page URL is stable

### Emery County Tax Sale List

- **URL:** `https://emery.utah.gov/home/offices/treasurer/` (links to tax sale page)
- **Tax Sale Page:** `https://emery.utah.gov/may-properties-tax-sale/` (returned 404 in testing — may
  only be live when sale is approaching)
- **Cost:** Free
- **Format:** Likely PDF or WordPress post (consistent with other Emery County pages)
- **Update frequency:** Annual
- **Scrapable:** Yes — monitor the treasurer page for the link to appear

### Juab County Tax Sale List

- **URL:** `https://juabcounty.gov/residents/tax-sale/`
- **2025 sale:** Conducted May 22, 2025 via publicsurplus.com
- **Cost:** Free to view listings on PublicSurplus
- **Format:** Listings published on publicsurplus.com before auction
- **Scrapable:** Moderate — PublicSurplus has standard HTML auction pages; parcel details are on the
  item listing page

### Millard County Tax Sale List

- **URL:** `https://millardcounty.gov/your-government/elected-officials/auditor/tax-sale/`
- **2025 sale:** June 11, 2025 via publicsurplus.com; PDF `2025 Tax Sale AS OF 06.09.2025`
- **Cost:** Free
- **Format:** PDF published on county website + PublicSurplus listings
- **Scrapable:** Yes — county website PDF and/or PublicSurplus HTML
- **Archive PDFs available:** 2021, 2022, 2023, 2024, 2025 all archived on the page

**Recommended signal weight for `tax_sale_pending`: 4** (higher than regular tax_lien because imminent
loss of property is a much stronger distress indicator than being 1-3 years behind)

---

## Source 3: Trustee Sale Notices / NOD (Utah Legals)

Utah requires foreclosure trustee sale notices to be published in a local newspaper once per week for
three weeks before the sale date. The Utah Press Association aggregates all legally published notices
into a single searchable free database.

### Utah Legals

- **URL:** `https://www.utahlegals.com/`
- **Cost:** Free to search and view
- **Format:** HTML search results with full notice text
- **Coverage:** All 29 Utah counties including Carbon, Emery, Juab, Millard
- **Notice types available:** Foreclosures, Lien Sales, Hearings, Ordinances, Bids, Financial Reports
- **Search capabilities:**
  - Filter by county (all 4 target counties confirmed available)
  - Filter by notice type (Foreclosures listed as popular search)
  - Keyword search (All Words, Any Words, Exact Phrase)
  - Date range filtering
  - Current notices (last 12 months) + Archive (older)
- **Update frequency:** As notices are published in newspapers (weekly or faster)
- **Scrapable:** Moderate — HTML form-based search at `/Search.aspx`. No confirmed API endpoint.
  Scraping requires POST form submission or URL parameter discovery via network inspection.

**Implementation approach:**
1. Inspect the search form POST parameters for `/Search.aspx` to determine URL query parameters
2. Submit searches for county=Carbon/Emery/Juab/Millard + type=Foreclosure weekly
3. Parse HTML results to extract: property address, trustee name, beneficiary/lender, sale date
4. Match to existing properties by address
5. Insert as `nod` signal (weight 3) with sale_date as the signal date

**Data in a typical notice:**
- Property legal description and street address
- Trustee name (law firm or title company)
- Beneficiary (bank/lender) name
- Amount of indebtedness
- Sale date, time, and location
- Recording date of original deed of trust

**Confidence:** HIGH — site is explicitly free, county-filterable, and covers all four target counties.
The scraping mechanism needs investigation of form POST parameters (LOW confidence on implementation
effort — could be simple GET params or complex session-based form).

**Example found in research:** A trustee sale for a Carbon County property was published for auction at
the front steps of Carbon County Seventh District Court, 120 East Main Street, Price, UT 84501 on
May 15, 2024.

---

## Source 4: Utah Courts Weekly CSV Reports (Foreclosure + Probate)

Utah Courts publishes free weekly district case filing reports in CSV format, updated every Monday.
No subscription or login required.

### Access

- **Index page:** `https://legacy.utcourts.gov/records/weeklyreports/`
- **File listing:** `https://legacy.utcourts.gov/records/weeklyreports/view.php`
- **URL pattern:**
  - Filings: `https://legacy.utcourts.gov/records/weeklyreports/current/filings/Week_[N]-Filing_Report-[YEAR].csv`
  - Dispositions: `https://legacy.utcourts.gov/records/weeklyreports/current/dispositions/Week_[N]-Disposition_Report-[YEAR].csv`
- **Cost:** Free
- **Format:** CSV
- **Update frequency:** Weekly (every Monday)

### CSV Schema

| Column | Description |
|--------|-------------|
| case_type | Two-letter case type code |
| case_num | Case number |
| locn_descr | Judicial district location (e.g., "Price District") |
| filing_date | Date case was filed |
| party_code | Party role (PLA=plaintiff, DEF=defendant, RES=respondent) |
| last_name | Party last name |
| first_name | Party first name |

### Relevant Case Type Codes

| Code | Description | Signal |
|------|-------------|--------|
| LM | Lien/Mortgage Foreclosure | `lis_pendens` or new `foreclosure` |
| ES | Estate Personal Representative (probate) | `probate` |
| SU | Supervised Administration (probate) | `probate` |
| CO | Conservatorship | `probate` |
| TR | Trust administration | `probate` |
| OT | Other Probate | `probate` |
| TL | Tax Lien | `tax_lien` (cross-reference) |

### County-to-District Mapping

| County | Judicial District | Expected locn_descr value |
|--------|------------------|--------------------------|
| Carbon | 7th Judicial District | Likely "Price District" or "7th District" |
| Emery | 7th Judicial District | Same as Carbon |
| Juab | 4th Judicial District | Likely "Nephi District" or "4th District" |
| Millard | Millard District (4th) | Likely "Fillmore District" or "Millard" |

**NOTE:** The exact `locn_descr` values used in the CSV for these counties are not confirmed from
research — requires downloading and inspecting a CSV to find the correct string to filter on.
**This needs one-time verification before implementation.**

### Implementation Approach

1. Download the weekly Filing Report CSV each Monday
2. Filter rows where `locn_descr` matches target districts (7th for Carbon/Emery, 4th for Juab/Millard)
3. Filter rows where `case_type` is in [LM, ES, SU, CO, TR, OT, TL]
4. Match party names (defendants in LM cases are likely property owners) to existing property records
5. Name matching is imperfect — need fuzzy match or address lookup from case number

**Challenge:** The CSV contains party names but NOT property addresses. Matching a defendant name
"JENSEN, CHAD" to a specific property requires either:
- Looking up the case in XChange (paid) for the property address
- Cross-referencing owner names from existing assessor data (feasible but fuzzy)
- For LM (foreclosure) cases, the lender files against the property owner — owner name match

**Confidence on feasibility:** MEDIUM — CSV is free and covers the right counties, but name-only
matching without property addresses introduces false positives. The probate signal (ES cases) is cleaner
because probate is filed by the estate of a deceased owner, and the deceased owner name should match
assessor records. Foreclosure (LM) matching is harder due to common names.

---

## Source 5: County Recorder Portals (NOD / Lis Pendens)

In Utah, NODs and lis pendens are recorded at the County Recorder's office. Some counties have online
search portals that could be scraped.

### Juab County — Tyler EagleWeb (BEST OPTION)

- **URL:** `https://juabcountyut-recorder.tylerhost.net/recorder/web/`
- **Cost:** Free public access (index data only, no images)
- **Format:** Web HTML (Tyler Technologies EagleWeb system)
- **Search capabilities:** Account search and Document search
- **Login required:** No for index data; registration required for images
- **Searchable by:** Document type (instrument type), grantor/grantee name, date range
- **NOD/Lis Pendens:** Likely searchable by instrument type — needs verification by accessing the
  public search and checking what document types are available in the dropdown
- **Scrapable:** Moderate — standard HTML form submission. Tyler EagleWeb has consistent structure
  across counties.

### Millard County — Tyler EagleWeb

- **URL:** `https://millardcountyut-recorder.tylerhost.net/recorder/web/`
- **Cost:** Free public access (index data only)
- **Login page:** `https://millardcountyut-recorder.tylerhost.net/recorder/web/login.jsp`
- **Public access confirmed:** YES — "Public Users: can search the County's records under Account
  and Document search functionality" with "access to data" (no images). Login button exists for
  public users without registration.
- **Documents prior to 1987:** May not be available online
- **Scrapable:** Moderate — same Tyler Technologies EagleWeb structure as Juab

### Carbon County — Recorder Portal (UNCONFIRMED)

- **URL:** Referenced as existing at `https://www.carbon.utah.gov/department/recorder/` with
  a "Recorded Document Lookup" link mentioned
- **Status:** No confirmed external EagleWeb URL found in research. E-Recording listed as
  "Not Available" for Carbon County on deeds.com.
- **Assessment:** Carbon County likely has an internal document lookup but it may not be accessible
  via a public-facing web URL. Requires direct verification by visiting the recorder page and
  clicking through to the search portal.
- **Confidence:** LOW — cannot confirm online searchability without visiting the page

### Emery County — NO ONLINE ACCESS

- **Status:** Confirmed NO online database. In-person or mail/email requests only.
- **Contact:** recorder@emery.utah.gov, (435) 381-3520, Castle Dale, UT 84513
- **Fee:** $0.25/page (mail), $5 for first page via email
- **Assessment:** Dead end for automated scraping. Manual lookup only.

### Implementation Assessment for Recorder Scraping

Even where EagleWeb portals exist (Juab, Millard), scraping recorded NODs and lis pendens is
**harder than Utah Legals** because:
- EagleWeb returns index data (grantor/grantee names) but not property addresses
- Matching grantor names to properties requires the same name-matching challenge as court CSV data
- Utah Legals provides the same NOD/trustee sale information with property addresses already included
  (the legal notice includes the property description)

**Recommendation:** Use Utah Legals for NOD/trustee sale signals instead of county recorder scraping.
County recorder scraping is lower priority and would yield duplicate data with more implementation effort.

---

## Source 6: Utah Courts Tax Lien Files

Utah Courts also publishes downloadable tax lien case files separately from the weekly reports.

- **URL:** `https://legacy.utcourts.gov/liens/tax/`
- **Cost:** Free
- **Format:** ZIP files (contents unknown — no schema documentation on the page)
- **Update frequency:** Every Tuesday by 1:00 PM
- **Coverage:** 28 of 29 counties. **Millard County is NOT listed.**
- **Carbon County files confirmed:** Weekly files from 2/10/2026 through 3/17/2026
- **Emery County files confirmed:** Same date range
- **Juab County files confirmed:** Same date range

**File URL patterns:**
- Carbon: `https://www.utcourts.gov/liens/tax/files/t0426[weeknum]_new.zip`
- Emery: `https://www.utcourts.gov/liens/tax/files/t0826[weeknum]_new.zip`
- Juab: `https://www.utcourts.gov/liens/tax/files/t1226[weeknum]_new.zip`

**Assessment:** These files likely contain tax lien court case data (cases where the state or county
has filed a tax lien in court). The format is unknown without downloading and examining a file.
This could cross-reference/supplement the existing delinquent tax scraping.

**Recommendation:** Download one file and inspect contents before deciding whether to incorporate.
If it contains parcel-level data with addresses, it becomes immediately useful. If it contains only
case numbers without addresses, it has the same name-matching limitation as the weekly court CSV.

---

## Source 7: Foreclosure.com / Pre-Foreclosure Databases

These national databases aggregate pre-foreclosure data but require subscriptions or cover mainly
urban areas with court filings. Research found:

- **foreclosure.com:** Lists "6,452 Utah foreclosures" but requires paid subscription for contact info
  and full details. Covers Carbon County but focused on marketed/visible properties.
- **USHUD.com:** Lists HUD-owned properties (already foreclosed and REO). HUD homes in rural Utah
  are rare. Useful for finding REO signals but not pre-foreclosure.
- **Redfin foreclosures:** MLS-dependent. Rural counties have minimal coverage.

**Assessment:** No free pre-foreclosure database covers these counties with actionable data. These
national databases aggregate the same county recorder data already identified above. Utah Legals
(Source 3) is the superior free option for these specific counties.

---

## Source 8: USPS Vacancy Indicators

- **HUD/USPS Aggregated Vacancy Data:** `https://www.huduser.gov/portal/datasets/usps.html`
  Available only to governmental entities and registered nonprofits. **Not available for private use.**
- **Regrid API:** Offers parcel-level USPS vacancy indicators (Y/N per address). Paid service —
  included in Premium Schema bulk licensing.
- **USPS Occupancy Trends (PostalPro):** Aggregate counts by ZIP code only, not parcel-level.
- **Assessment:** DEAD END for free parcel-level vacancy data. Rural Utah also has limited USPS
  delivery tracking — many addresses use PO boxes, reducing vacancy signal accuracy.

---

## Source 9: Building Permits (Activity / Neglect Indicator)

- **State of Utah Building Permits:** `https://secure.utah.gov/datarequest/buildingpermits/index.html`
  Paid ($5 minimum per search, $4,000 for bulk). Not free.
- **Carbon County Building Permits:** `https://www.carbon.utah.gov/service/building-permits/`
  Has a "Previous Permit Portal" for view-only access to historical permits. No public searchable
  database confirmed. Contact only.
- **Emery County Building Permits:** `https://emery.utah.gov/home/department-directory/bz/building-permit/`
  Checklists and forms available. No searchable permit history database found.
- **Assessment:** No free scrapable permit data found for these counties. Building permit absence
  as a neglect signal is theoretically useful but not practically achievable with free sources.
  **LOW priority.** Skip for now.

---

## Source 10: FEMA Disaster Declarations

Major FEMA disaster declarations for Utah 2020-2025 primarily affected:
- Salt Lake, Davis, Weber, Morgan counties (2020 earthquake and windstorm)
- Iron, Sanpete, Utah, Wasatch counties (2023 flooding)

**Carbon County and Emery County were NOT designated in any major FEMA disaster declarations
2020-2025.** Juab and Millard similarly had no specific designations found.

**Assessment:** FEMA signals are not applicable for these specific counties. Dead end.

---

## Source 11: Utah Courts Tax Lien Index (Legacy Portal)

Separate from the weekly case CSV, Utah Courts maintains a dedicated tax lien portal.

- **Tax liens page:** `https://legacy.utcourts.gov/liens/`
- **ORS liens (Other Revenue liens):** `https://legacy.utcourts.gov/liens/ors/`
- These are state-filed liens (e.g., state tax commission liens) vs. county property tax delinquency
- **Assessment:** This is state-level lien data. County property tax delinquency (what we already
  scrape) is different from state income tax liens recorded here. Cross-referencing might add
  depth but requires investigation of file schema (same issue as Source 6 above).

---

## Prioritized Implementation Roadmap

### Priority 1: Immediate Wins (No New Sources, Richer Existing Data)

**Enhance delinquent tax scraping to extract dollar amounts and year counts.**

All four counties publish this data — Carbon and Juab via PDF, Emery via online table, Millard via PDF.
The Emery County 5-year back tax table (`https://emery.utah.gov/home/offices/treasurer/5-year-back-tax-info/`)
is particularly rich: year-by-year amounts from 2021-2025 per parcel.

Implementation: Update existing scraper functions to also capture:
- `tax_amount_total` — total owed across all years
- `tax_years_delinquent` — count of years with non-zero amounts
- Store in `distress_signals` metadata or new columns on properties table
- Weight the tax_lien signal on a sliding scale based on years (1-5+)

**Estimated effort:** 1-2 days. **Impact:** Converts flat score=1 for all 1,761 properties into a
meaningful distribution. This is the single highest-ROI change available.

### Priority 2: Tax Sale Pending Signal

**Add a `tax_sale_pending` signal for properties on the annual tax sale list.**

These are the most distressed possible — days from losing the property. Published 30 days before May
tax sale. All four counties publish these lists.

- Carbon: Stable PDF URL at `carbon.utah.gov/Tax/` (annual)
- Emery: Treasurer page monitored for tax sale link
- Juab/Millard: via publicsurplus.com or county PDF

Implementation: Add scraper that runs in April/May to check for and parse the tax sale PDF.
Insert `tax_sale_pending` signal (weight 4 recommended) when a property appears on this list.

**Estimated effort:** 2-3 days. **Impact:** Creates the highest-distress tier of leads.

### Priority 3: Utah Legals Trustee Sale Scraping (NOD signal)

**Scrape utahlegals.com for foreclosure/trustee sale notices in target counties.**

This provides NOD-equivalent signals (weight 3) from the legally published trustee sale notices.
Addresses are included in the notice text, enabling direct property matching.

Implementation:
1. Inspect utahlegals.com search form POST parameters
2. Submit weekly searches for each county + type=Foreclosure
3. Parse address from notice text using regex (standard format: property address + legal description)
4. Match to properties table by address
5. Insert `nod` signal with sale_date extracted from notice

**Estimated effort:** 3-5 days (form inspection + regex parsing is the tricky part).
**Impact:** Adds weight-3 NOD signals, enables hot lead detection for imminent foreclosures.

### Priority 4: Utah Courts Weekly CSV (Probate + Foreclosure)

**Download and parse weekly case filing CSVs for probate and foreclosure signals.**

The CSV is free, updated weekly, and covers all four counties (7th and 4th judicial districts).

Implementation:
1. Download `Week_N-Filing_Report-YEAR.csv` each Monday
2. First run: determine exact `locn_descr` values for Carbon/Emery/Juab/Millard districts
3. Filter for LM (foreclosure) and ES/SU/CO/TR/OT (probate) case types
4. Match defendant/respondent names against `owner_name` in properties table (fuzzy match)
5. Insert matched cases as `lis_pendens` (LM) or `probate` (ES/SU etc.) signals

**Challenge:** Name matching without addresses. Recommendation: Match on exact name first,
then flag "likely match" candidates for manual review rather than auto-inserting.

**Estimated effort:** 3-4 days + ongoing false positive rate management.
**Impact:** Adds probate (weight 1) and lis_pendens (weight 2) signals via free source.

### Priority 5: County Recorder EagleWeb (Juab, Millard)

**Scrape Juab and Millard county recorder portals for recorded NOD and lis pendens documents.**

Both use Tyler Technologies EagleWeb with confirmed free public access (index data, no images).

Implementation:
1. Discover document type dropdown values in the EagleWeb search form for NOD/Lis Pendens
2. Submit weekly searches for recently recorded documents of those types
3. Extract grantor/grantee names and recording dates
4. Match grantor names against property owner names in database
5. Insert as `nod` or `lis_pendens` signals

**Challenge:** Same name-matching issue as court CSV. Utah Legals (Priority 3) is likely easier
and provides the same data for these counties.

**Estimated effort:** 3-4 days. **Recommend:** Do Priority 3 (Utah Legals) first. If coverage
gaps exist for Juab/Millard in Utah Legals, add EagleWeb as fallback.

---

## Signal-Source Matrix

| Signal Type | Weight | Source | Cost | Confidence |
|-------------|--------|--------|------|------------|
| tax_lien (tiered) | 1-5 | Enhanced existing county scraping | Free | HIGH |
| tax_sale_pending | 4 | County treasurer PDFs (all 4 counties) | Free | HIGH |
| nod | 3 | utahlegals.com trustee sale notices | Free | HIGH |
| lis_pendens | 2 | Utah Courts weekly CSV (LM cases) | Free | MEDIUM |
| probate | 1 | Utah Courts weekly CSV (ES/SU/CO cases) | Free | MEDIUM |
| probate | 1 | Juab/Millard EagleWeb recorder portals | Free | MEDIUM |
| code_violation | 1 | Utah Courts XChange | $40/mo | HIGH (paid) |
| vacant | 1 | USPS/HUD vacancy data | Restricted | N/A |

---

## Gaps and Dead Ends

| Source | Status | Reason |
|--------|--------|--------|
| Emery County recorder (NOD/lis pendens) | Dead end | No online access at all |
| Carbon County recorder (NOD/lis pendens) | Uncertain | Online portal mentioned but no confirmed URL |
| USPS vacancy data | Dead end | Restricted to government/nonprofits only |
| Building permits | Dead end | No free online database for these counties |
| FEMA disaster declarations | Dead end | Carbon/Emery/Juab/Millard not in major declarations |
| Foreclosure.com / national pre-foreclosure DBs | Dead end | Require paid subscription for useful data |
| Code violations | Dead end | No online database (see code-violations-research.md) |

---

## Data Sources Summary

| Source | URL | Counties | Format | Cost | Update Freq |
|--------|-----|----------|--------|------|-------------|
| Carbon delinquent PDF | carbon.utah.gov/Tax/ | Carbon | PDF | Free | Annual (Dec) |
| Emery 5-year back tax table | emery.utah.gov/home/offices/treasurer/5-year-back-tax-info/ | Emery | HTML table | Free | Near real-time |
| Emery delinquent PDF | emery.utah.gov/wp-content/uploads/2025/12/2025-Current-Delinquent-List.pdf | Emery | PDF | Free | Annual (Dec) |
| Juab delinquent PDF | juabcounty.gov (WordPress post discovery) | Juab | PDF | Free | Annual (Dec) |
| Millard delinquent PDF | millardcounty.gov/wp-content/uploads/2025/12/2025-Deliquent-List.pdf | Millard | PDF | Free | Annual (Dec) |
| Carbon tax sale PDF | carbon.utah.gov/service/delinquent-tax-sales/ | Carbon | PDF | Free | Annual (Apr/May) |
| Millard tax sale PDF | millardcounty.gov/your-government/elected-officials/auditor/tax-sale/ | Millard | PDF | Free | Annual (Jun) |
| Juab tax sale / PublicSurplus | juabcounty.gov/residents/tax-sale/ | Juab | HTML | Free | Annual (May) |
| Utah Legals | utahlegals.com | All 4 | HTML | Free | Weekly+ |
| Utah Courts weekly CSV | legacy.utcourts.gov/records/weeklyreports/ | All 4 | CSV | Free | Weekly |
| Utah Courts tax lien ZIPs | legacy.utcourts.gov/liens/tax/ | Carbon/Emery/Juab | ZIP | Free | Weekly |
| Juab recorder EagleWeb | juabcountyut-recorder.tylerhost.net/recorder/web/ | Juab | HTML | Free | Real-time |
| Millard recorder EagleWeb | millardcountyut-recorder.tylerhost.net/recorder/web/ | Millard | HTML | Free | Real-time |

---

## Open Questions Requiring One-Time Verification

1. **Utah Legals form parameters:** What are the POST or GET parameters for the county/type search
   form? This requires opening the site in a browser with network inspector. Determines whether
   scraping is easy (GET params) or complex (session-based POST).

2. **Utah Courts CSV `locn_descr` values:** What exact string is used for Carbon, Emery, Juab, and
   Millard counties in the weekly filing CSV? Download Week_11-Filing_Report-2026.csv and grep for
   "Price" or "7th". One-time lookup.

3. **Carbon County recorder URL:** Does carbon.utah.gov have an accessible online recorder search?
   Navigate to the department/recorder page and click through the "Recorded Document Lookup" link.

4. **Utah Courts tax lien ZIP schema:** Download one ZIP file
   (e.g., `https://www.utcourts.gov/liens/tax/files/t0426075_new.zip`) and examine the file format
   and field names. Determines if this data is redundant with existing scraping or additive.

5. **Emery County tax sale URL:** Monitor `emery.utah.gov/home/offices/treasurer/` in April to
   confirm whether the tax sale list URL resolves and what format it takes.

6. **Current scraper field extraction:** Confirm what fields the existing delinquent tax scrapers
   currently extract. Are amount_owed and parcel_number already being stored? Check the scraper
   source code and database schema.

---

*Researched: 2026-03-19*
*Confidence: HIGH for source existence and access; MEDIUM for implementation complexity estimates*
