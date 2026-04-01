# Zillow API Research: ARV, Comps, and Property Details for HouseFinder

**Researched:** 2026-03-26
**Research Mode:** Ecosystem / Feasibility
**Overall Confidence:** HIGH for conclusions; MEDIUM for exact pricing (vendors hide pricing behind sales calls)

---

## Executive Summary

HouseFinder needs automated ARV (after-repair value) for its MAO calculator, comparable sales data,
and property characteristics (beds/baths/sqft/year built) it doesn't currently collect. This research
evaluates every practical source.

**Bottom line:**

1. **Zillow's official API is a dead end for HouseFinder.** The Zestimate API is restricted to
   commercial partners with an invite-only approval process that can take weeks or months and costs
   $500-$5,000/month. More importantly, Utah is a non-disclosure state — Zillow lacks actual sold
   prices and acknowledges its own Zestimates are "highly inaccurate" in Utah.

2. **The best immediate win for property details is free:** Utah's UGRC (Utah Geospatial Resource
   Center) publishes Land Information Records (LIR) parcel data for all four target counties. This
   is free GIS data from the county assessors themselves and includes BLDG_SQFT, BUILT_YR,
   TOTAL_MKT_VALUE, and PROP_CLASS. A one-time import by address would populate missing property
   characteristics for the entire 3,100-property database.

3. **For ARV/comps, PropStream is the practical choice for a wholesaler.** At $99/month it includes
   comp running, AVM-based estimated values, MLS sold data, distress signals, and skip tracing — all
   features HouseFinder needs. The caveat is that it is a UI tool, not a clean API. Its "Wholesale
   Value" (70% of AVM) is exactly what the MAO calculator needs for ARV input.

4. **Zillow Research bulk data (ZHVI) is free and useful for market trends.** City/ZIP median values
   are freely downloadable as CSVs with no API key required. This covers rural Utah ZIP codes.

5. **Third-party Zillow scrapers (RapidAPI, Apify) are fragile and legally grey.** They violate
   Zillow's TOS and Zillow actively blocks scrapers. Do not build on them.

---

## Part 1: Zillow Official APIs

### 1.1 Zestimate API (Official)

**URL:** https://www.zillowgroup.com/developers/api/zestimate/zestimates-api/
**Registration:** https://www.zillowgroup.com/developers/
**Access:** Invite-only. Submit request via "help button" on developer portal. Contact: api@bridgeinteractive.com

**What it returns:**
- Property Zestimate (estimated market value)
- Rental Zestimate
- Foreclosure Zestimate
- ~100 million US properties covered

**Cost:**
- No publicly disclosed free tier
- Mid-tier: ~$500/month (up to 50,000 calls/month) — MEDIUM confidence (third-party estimate)
- Premium: $2,000–$5,000/month
- Approval process typically requires weeks to months

**TOS for commercial use:** YES — explicitly designed for commercial use cases by businesses.

**Rate limits:** Not publicly disclosed. Enterprise agreements required for high volume.

**Does it cover rural Utah?**

Partially but unreliably. Utah is a **non-disclosure state** — sale prices are not public record
without MLS access. Zillow's algorithm lacks actual sold data for Utah, so Zestimates are
acknowledged to be highly inaccurate in Utah by the Utah Association of Realtors president.

For rural markets (Price pop 8,700, Delta pop 3,600, Nephi pop 6,000):
- Low transaction volume makes AVMs less reliable even if Utah was a disclosure state
- Zillow can estimate values "using sales data from adjacent ZIP codes or nearby areas" but this
  introduces geographic distortion for isolated rural markets

**Verdict: NOT RECOMMENDED.** Months-long approval process, $500+/month cost, and known
inaccuracy in Utah non-disclosure markets. Not worth pursuing.

---

### 1.2 Bridge Interactive / Zillow Group Public Records API

**URL:** https://www.bridgeinteractive.com/developers/zillow-group-data/
**Docs:** https://bridgedataoutput.com/docs/platform/

**What it is:**
The Bridge Public Records API is Zillow's enterprise data distribution platform. It exposes:
- Property records and tax assessments for ~148 million properties across 3,200 US counties
- Zestimates (both property and rental)
- Transaction records
- Housing market metrics (same data as zillow.com/research/data CSV downloads)

**Access:** Invite-only, current contracts required. Contact: api@bridgeinteractive.com

**Cost:** Custom enterprise pricing. Not publicly listed. Industry sources suggest this is the same
tier as Zestimate API ($500+/month).

**TOS restriction:** "You may use the API only to retrieve and display dynamic content from Zillow.
You are not permitted to store information locally." This restriction makes it incompatible with
HouseFinder's architecture, which needs to persist data in a PostgreSQL database and associate
values with property records.

**Verdict: NOT RECOMMENDED.** No-local-storage TOS restriction is a hard blocker for HouseFinder.
Even if approved, the data must be fetched live per request, not stored. This breaks the deal
pipeline where ARV needs to persist across sessions.

---

### 1.3 Zillow Research Data (Free Bulk Downloads)

**URL:** https://www.zillow.com/research/data/
**Cost:** FREE. No API key. No registration.

**What is available:**

| Dataset | Geographic Levels | Update Freq | Format |
|---------|-------------------|-------------|--------|
| ZHVI (Home Value Index) | ZIP, City, County, State, Metro | Monthly | CSV |
| Median Sale Price | ZIP, City, County | Monthly | CSV |
| Median List Price | ZIP, City, County | Monthly | CSV |
| Days on Market | ZIP, City, County | Monthly | CSV |
| Market Heat Index | ZIP | Monthly | CSV |
| Rent Index (ZORI) | Metro, State | Monthly | CSV |

**Coverage for rural Utah ZIP codes:**
- 84501 (Price, UT) — ZHVI available. For ZIP codes with sparse transactions, Zillow interpolates
  from adjacent areas. Data exists but confidence intervals are wide.
- 84624 (Delta, UT) — ZHVI likely available. Same interpolation caveat.
- Other target area ZIPs — Should have at least ZHVI; other metrics may be sparse or absent.

**TOS:** Researchers can use this data "with looser Terms of Use" per Zillow's own documentation.
Bulk download and local storage is permitted for research and analytics.

**How to integrate into HouseFinder:**
- Monthly batch download of ZHVI CSV by ZIP code
- Parse and store in a `market_data` table keyed by ZIP and date
- Display on property detail page: "Market median for [ZIP]: $X (Zillow, [month])"
- Power ANALYTICS-04 (trend charts) — median home value trend by city/county over time

**Limitation:** This is a market-level index (median of all homes in ZIP), not an AVM for a specific
property. It cannot replace Zestimate for individual property ARV calculation. It is useful as
market context, not as deal-specific ARV.

**Verdict: RECOMMENDED for market trends.** Free, no registration, covers rural Utah. Implement
as a monthly batch job. Does not solve the ARV problem for individual deals.

---

## Part 2: Third-Party Zillow APIs

### 2.1 RapidAPI Zillow Endpoints

**URLs:**
- zillow-com1: https://rapidapi.com/apimaker/api/zillow-com1
- zillow56: https://rapidapi.com/s.mahmoud97/api/zillow56
- Real-Time Zillow Data: https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-zillow-data

**What they return:**
- Property details (beds, baths, sqft, year built, lot size)
- Zestimate (estimated value pulled from Zillow.com)
- Rental Zestimate
- Similar properties for sale
- Sold comps (properties recently sold nearby)
- Photos

**Cost (approximate):**
- Free tiers: typically 50–100 requests/month
- Basic paid: ~$10–50/month for 500–5,000 requests
- Note: One major endpoint (zillow-com1) issued a deprecation notice in late 2025 and migrated to
  a new URL. Endpoint churn is common.

**Rate limits:** Typically 1–5 requests/second; daily caps per plan.

**TOS compliance:**
Zillow's Terms of Service explicitly prohibit scraping and unauthorized API access. These RapidAPI
endpoints are unofficial scrapers — they are not operated by Zillow. Zillow actively attempts to
block them. Three real risks:

1. **Zillow will block the scraper** — these endpoints fail without warning when Zillow updates
   their anti-bot defenses. You get a $0 error instead of data.
2. **Zillow may pursue legal action** for commercial use of scraped data (they have done so).
3. **Data quality is inconsistent** — when the scraper hits a blocked page it returns null or stale
   data with no error.

**Coverage for rural Utah:**
These endpoints depend on what Zillow.com actually shows. Zillow does index properties in Price,
Delta, and Nephi but with the same non-disclosure accuracy issues. A direct lookup by address should
return data for any property Zillow has indexed.

**Verdict: NOT RECOMMENDED.** Fragile, legally grey, violates TOS. Zillow has historically sued
scrapers for commercial use. For a production application used to source real estate deals, TOS
violations create business risk. The convenience does not justify the legal exposure.

---

### 2.2 Apify Zillow Scrapers

**URLs:**
- https://apify.com/maxcopell/zillow-scraper
- https://apify.com/automation-lab/zillow-scraper

**What they extract:**
- Property listings (active for-sale properties in a geographic area)
- Property details when looking up by address or ZPID
- Photos, description, listed price, Zestimate if shown

**Cost:**
- Apify Free plan: $5/month free credits (~2,500 Zillow results/month)
- Pay-per-event: ~$0.002–$0.005 per scraped listing
- Example: 200 listings = ~$1.00

**TOS compliance:**
Same issues as RapidAPI. Apify's legal position is that scraping publicly displayed data is
permissible, but Zillow's TOS explicitly forbids it and they have enforced it. For a commercial
product, this is an accepted legal grey zone for Apify users but carries real risk.

**Coverage:** Same as RapidAPI — depends on what Zillow indexes. Rural properties may be listed
on Zillow but with inaccurate valuations.

**Verdict: NOT RECOMMENDED for production.** TOS issues and scraper fragility make this unsuitable
as a reliable data source for a deal management tool. Acceptable for one-off research; not for
automated ARV population.

---

## Part 3: Non-Zillow Alternatives

### 3.1 Utah UGRC / SGID Parcel LIR Data (FREE — BEST OPTION FOR PROPERTY DETAILS)

**URL:** https://gis.utah.gov/products/sgid/cadastre/parcels/
**Open SGID portal:** https://opendata.gis.utah.gov/
**Direct parcel viewer:** https://parcels.utah.gov/
**UGRC API:** https://api.mapserv.utah.gov/

**What it is:**
Utah's Geospatial Resource Center aggregates county assessor tax roll data into a statewide GIS
dataset. The Land Information Records (LIR) layer is the assessor's own data, published as an open
GIS dataset. This is the same source as manually looking up parcels on each county's assessor website.

**Fields in the LIR schema:**

| Field | Description | Populated? |
|-------|-------------|-----------|
| PARCEL_ID | Parcel number | Yes |
| PARCEL_ADD | Property address | Yes |
| PARCEL_CITY | City | Yes |
| TOTAL_MKT_VALUE | Assessed market value | Yes |
| LAND_MKT_VALUE | Land portion of value | Yes |
| BLDG_SQFT | Building square footage | Varies by county |
| BUILT_YR | Year built | Varies by county |
| EFFBUILT_YR | Effective year built (post-renovation) | Varies by county |
| PROP_CLASS | Property class code (residential, commercial, etc.) | Yes |
| FLOORS_CNT | Number of floors | Varies |
| CONST_MATERIAL | Construction material | Varies |
| HOUSE_CNT | Number of housing units on parcel | Yes |
| PRIMARY_RES | Primary residence flag | Yes |
| PARCEL_ACRES | Lot size in acres | Yes |

**County coverage for target counties:**

| County | LIR Available | Last Updated |
|--------|--------------|--------------|
| Carbon | Yes | August 2025 |
| Emery | Yes (LIR feature service) | July 2025 |
| Juab | Yes | July 2025 |
| Millard | Yes | December 2025 |

**Cost:** FREE. No API key required for bulk downloads. UGRC API requires free account for
geocoding endpoint (not needed for bulk download).

**Access methods:**
1. **Bulk download** via opendata.gis.utah.gov — download the county LIR as a GeoJSON or shapefile.
   This is a one-time or periodic batch process, not a per-property API call.
2. **REST feature service** — ArcGIS REST endpoint per county; can be queried programmatically
   by PARCEL_ID or address.
3. **Open SGID SQL** — PostgreSQL connection to the statewide SGID with queries like:
   `SELECT * FROM cadastre.carbon_county_parcels_lir WHERE PARCEL_ADD ILIKE '%100 N%'`

**Limitations:**
- Beds and bathrooms are NOT in the LIR schema. The assessor data captures structural attributes
  but not bedroom/bathroom count (those are in the full assessor record, not the GIS layer).
- Field completeness varies by county. BLDG_SQFT and BUILT_YR may be NULL for some parcels.
- Data updates vary (monthly to annually per county). Not real-time.
- Assessed value (TOTAL_MKT_VALUE) is NOT the same as market value. Utah assessors target 100%
  of market value but values lag in rapidly appreciating markets. Rural counties may be more current.

**How to integrate into HouseFinder:**
1. One-time batch import: Download all four county LIR datasets as GeoJSON.
2. Match parcels to HouseFinder properties by address (fuzzy match or parcel number).
3. Populate a `property_details` table with: bldg_sqft, built_yr, total_mkt_value, prop_class,
   parcel_acres, floors_cnt.
4. Display on property detail page. Use TOTAL_MKT_VALUE as a rough ARV floor indicator.
5. Refresh quarterly when UGRC publishes county updates.

**What this solves:**
- Beds/baths: NOT solved (not in schema)
- Sqft: SOLVED for most properties
- Year built: SOLVED for most properties
- Lot size: SOLVED (PARCEL_ACRES)
- Assessed value: SOLVED (rough ARV indicator)
- Property class (residential vs. commercial vs. vacant): SOLVED (enables DATA-11 filter)

**Verdict: STRONGLY RECOMMENDED as first step.** Free, authoritative (direct from assessors),
covers all four counties, solves the sqft/year-built/assessed-value gap in HouseFinder. Beds and
baths remain manual or require a separate source.

---

### 3.2 PropStream ($99–$199/month — BEST OPTION FOR ARV/COMPS)

**URL:** https://www.propstream.com/
**Pricing:** https://www.propstream.com/pricing

**What it is:**
PropStream is a real estate investor and wholesaler data platform used by the majority of active
wholesalers in the US. It aggregates MLS data, public records, tax data, distress signals, and
AVMs into a single investor-focused tool.

**Pricing:**
| Plan | Monthly | Annual | Saves/Month | Skip Tracing |
|------|---------|--------|-------------|--------------|
| Essentials | $99 | $81/mo | 25,000 | Paid separately |
| Pro | $199 | $165/mo | 50,000 | Included |
| Elite | $699 | $583/mo | 100,000 | Included |

7-day free trial with 50 leads included.

**What it provides for HouseFinder use cases:**
- **Comps:** "Run Comps" on any property — pulls MLS sold data filtered by beds/baths/sqft/distance/
  date. Uses actual MLS sold prices via aggregated data partnerships, not just non-disclosure public
  records. This works in Utah because PropStream licenses MLS data.
- **AVM:** AI-estimated value per property. Includes "Wholesale Value" = 70% of AVM — directly
  maps to MAO calculator input.
- **Property details:** Beds, baths, sqft, year built, lot size, last sale price/date for all
  properties in its database (includes rural Utah).
- **Distress signals:** PropStream also has pre-foreclosure, NOD, tax delinquency, and probate
  flags — overlapping with HouseFinder's existing signals. Not a reason to switch, but validation.
- **Skip tracing:** Included in Pro plan (~$6,000 value per plan page). Could supplement Tracerfy.
- **API:** PropStream has an API for embedding data into custom applications. Documentation is not
  publicly available — requires contacting their developer team. Used by CRM vendors.

**Coverage for rural Utah:**
HIGH confidence. PropStream has national coverage. Their data partners include county assessors and
MLS data aggregators. Price, Helper, Nephi, Delta, and other rural Utah towns should be covered
because PropStream sources from multiple data channels including public records (which are available
regardless of non-disclosure status — non-disclosure only affects sale price, not property attributes).

**TOS for HouseFinder use:**
PropStream's standard use case IS investor/wholesaler deal analysis. It is explicitly designed for
this. No TOS concerns for running comps and pulling ARV estimates.

**How it fits HouseFinder:**
PropStream is a UI-based tool, not a clean REST API that HouseFinder can call programmatically.
Two integration patterns:

**Pattern A (Recommended — Low friction):**
Use PropStream as a manual research tool alongside HouseFinder. When a user starts a deal, they
open PropStream in another tab, pull comps, and enter the ARV into HouseFinder's MAO calculator.
This is how most wholesalers currently operate. Zero integration cost.

**Pattern B (Future — Medium effort):**
Negotiate API access with PropStream's developer team to pull property details and AVM estimates
directly into HouseFinder's deal form. This would auto-populate ARV, beds, baths, sqft at
"Start Deal" time. Requires developer agreement and possibly per-call fees not publicly disclosed.

**Verdict: RECOMMENDED as the immediate practical solution for comps/ARV.** The $99/month
Essentials plan gives Brian comps and AVM for deal analysis. Pattern A (manual lookup then
enter into HouseFinder) is zero development work and solves the actual problem. Pattern B
is the right v2 integration if deal volume increases enough to justify API development.

---

### 3.3 ATTOM Data API ($95+/month)

**URL:** https://www.attomdata.com/solutions/property-data-api/
**Developer portal:** https://api.developer.attomdata.com/
**Free trial:** 30-day trial available with API key at api.developer.attomdata.com

**What it returns:**
- Beds, baths, sqft, year built, lot size, stories, units
- Assessed value and AVM (/attomavm endpoint)
- Owner name, ownership history
- Tax history, delinquency status
- Mortgage/lien data
- Transaction/sale history
- Comparable sales (/salescomparables endpoint)
- Neighborhood data
- 158 million US properties

**Cost:**
- Starts at ~$95/month for basic access
- Enterprise tiers with more calls and endpoints: $500–$5,000+/month
- Per-call pricing available for lower volumes
- 30-day free trial with API key (no credit card for trial per their developer portal)

**AVM fields returned:**
`/attomavm` endpoint returns: estimated value, confidence score, high value, low value,
forecast standard deviation, value as of date. The confidence score flags low-data markets —
useful for knowing when rural Utah estimates are unreliable.

**Coverage for rural Utah:**
MEDIUM confidence. ATTOM aggregates county assessor data for 99% of US population / 158M
properties. Carbon, Emery, Juab, and Millard counties should be in their database for property
attributes (assessor-sourced). For AVM, ATTOM states "coverage varies county to county, as some
counties simply don't provide this level of detail."

**TOS:** Commercial API use is explicitly allowed. REST API with standard licensing.

**How to integrate:**
- On "Start Deal" from property detail page, call ATTOM `/property/detail` by address to
  populate beds, baths, sqft, year built.
- Call `/attomavm` to get estimated value range — use as ARV starting point with confidence score.
- Call `/salescomparables` to pull recent nearby sold properties for comp review.

**Verdict: VIABLE ALTERNATIVE to UGRC + PropStream.** ATTOM gives everything in one REST API
including beds/baths (which UGRC lacks). The 30-day free trial lets you validate rural Utah
coverage before committing. The $95/month starting price is lower than PropStream if all you
need is the data API (no UI). However, AVM accuracy in Utah non-disclosure rural markets is
uncertain — the confidence score would flag this.

**When to choose ATTOM over PropStream:**
- You want a clean REST API embedded in HouseFinder (no manual tab-switching)
- You want beds/baths auto-populated on the deal form
- Budget is under $100/month
- You are willing to accept AVM uncertainty and use TOTAL_MKT_VALUE from UGRC as a cross-check

---

### 3.4 BatchData ($0.01+/call or subscription)

**URL:** https://batchdata.io/
**AVM:** https://batchdata.io/avm
**Pricing:** https://batchdata.io/pricing

**What it offers:**
- Property AVM with value, confidence score, high/low range
- 128 million US properties
- 240+ data points per property (tax assessor sourced)
- Beds, baths, sqft, year built from public records
- API-first (REST API, not UI)

**Cost:**
- Starts at $0.01 per API call per their blog
- Subscription tiers available ($500–$5,000/month for enterprise volume)
- No publicly listed standard pricing — requires contacting sales for exact rates
- Previous HouseFinder research cited $0.05–$0.15/lookup (older estimate; verify on current pricing page)

**Coverage:** 128 million properties — should cover rural Utah from assessor data aggregation.

**Verdict: VIABLE for API-first integration.** BatchData is more accessible than ATTOM for
pay-as-you-go use. For HouseFinder's scale (3,100 properties, of which maybe 50 become active
deals per year), per-call pricing at $0.01–0.15 per lookup is negligible. The per-call model
avoids monthly subscription when deal flow is low. However, exact pricing requires validation
by visiting their pricing page directly.

---

### 3.5 HouseCanary ($10/report or custom enterprise)

**URL:** https://www.housecanary.com/
**AVM:** https://www.housecanary.com/resources/our-avm

**What it offers:**
- 75+ data points per property
- AVM with 36-month value forecast
- Comparable sales with detailed filtering
- 50-state brokerage status = MLS access for non-disclosure states like Utah
- Rental valuation estimates
- National coverage including non-disclosure states

**Cost:**
- $10 per individual report (agent/investor one-off use)
- Enterprise API: custom pricing (contact sales)
- Institutional use (hedge funds, banks): starts much higher

**Non-disclosure state handling:**
HouseCanary explicitly addresses non-disclosure states — they use MLS access (50-state brokerage
license) combined with tax assessor data and listing activity. This is their competitive advantage
over ATTOM and BatchData for Utah.

**Coverage for rural Utah:**
HIGH confidence on national scope claims, but rural Utah transaction volume is low. Their
confidence scoring would reflect sparse data. "High data fidelity even in non-disclosure states
or rural areas" is their claimed value prop — test before committing.

**Verdict: VIABLE but likely overkill for HouseFinder.** $10/report is affordable for
infrequent use (50 deals/year = $500/year). Their Utah MLS access is a genuine advantage.
But they target institutional capital markets users, not individual wholesalers, so their
pricing and support model may not fit. Try the individual report option first before pursuing
an enterprise API agreement.

---

### 3.6 Redfin Data

**Official API:** None publicly available. Redfin does not offer a developer API.

**Third-party options:**
- Several scrapers on RapidAPI and HasData.com offer Redfin data extraction
- Coverage is MLS-dependent — limited in rural areas where Redfin agents are not active
- Redfin has minimal presence in rural Utah (Price, Delta, Nephi not Redfin markets)

**Verdict: NOT RECOMMENDED.** No official API, poor rural Utah coverage, same scraper TOS
issues as the Zillow scrapers.

---

### 3.7 Realtor.com API

**Official API:** Not publicly available. Realtor.com offers IDX data feeds only to licensed
real estate agents and brokers via Move, Inc. partnership agreements.

**Coverage:** MLS-dependent, same gaps as Redfin in rural Utah.

**Verdict: NOT AVAILABLE for HouseFinder's use case.**

---

### 3.8 UtahRealEstate.com MLS Data API

**URL:** https://vendor.utahrealestate.com/
**FAQ:** https://vendor.utahrealestate.com/faq

**What it is:**
Utah's largest MLS operated by the Utah Association of Realtors. This is the authoritative source
for sold price data in Utah (which matters greatly because Utah is a non-disclosure state).

**Access requirements:**
- Must be a technology company building products for real estate professionals who are members
- Must sign a licensing agreement
- Product must be "exclusively for developing and providing a product to a broker, agent, and/or
  appraiser that is a member of UtahRealEstate.com"

**TOS for HouseFinder:** INCOMPATIBLE. HouseFinder is a personal investor tool, not a product
for licensed agents. The MLS data license explicitly requires the product to serve licensed
agent/broker members. A wholesaler using MLS data for their own deal analysis violates the
terms.

**Rural Utah coverage:** Would cover Carbon, Emery, Juab, Millard counties as the statewide MLS.

**Verdict: NOT AVAILABLE under HouseFinder's use model.** MLS data requires building a
product for agents, not for personal investor use. PropStream licenses MLS data through a
compliant institutional arrangement that individual investors can access indirectly.

---

### 3.9 Census / ACS Data (Free)

**URL:** https://data.census.gov/ and https://api.census.gov/

**What it provides:**
- Median home value by census tract or ZIP code tabulation area (ZCTA)
- Housing unit counts, occupancy rates, age of housing stock
- Renter vs. owner-occupied ratios

**Limitations:**
- Census data is 2–10 years stale (American Community Survey uses 5-year samples)
- Tract-level, not parcel-level — cannot use for individual property ARV
- For 2026, the most current complete ACS data is 2022 (5-year) or 2023 (1-year for areas with
  65,000+ population — rural Utah ZIP codes don't qualify for 1-year estimates)

**What it could contribute to HouseFinder:**
- Background market context: "This ZIP code has a median home value of $X (Census 2022)"
- Vacancy rate indicators for neighborhoods
- Owner-occupancy rate (high renter ratio can indicate distress-prone areas)

**Verdict: LOW PRIORITY supplement.** Free and easy to pull, but stale by years. Use Zillow
ZHVI bulk data instead for more current market values. Census is useful for structural market
characteristics (vacancy rates, owner occupancy) if that analytics feature is built.

---

## Part 4: The Rural Utah Non-Disclosure Problem

This is the central challenge for any valuation API in HouseFinder's target market.

**What non-disclosure means in practice:**
When a home sells in Utah, the sale price is NOT recorded in the public recorder's deed. The deed
records only that a transfer occurred and the names of buyer/seller. Assessors use these transfers
to trigger revaluation but do not publish the price. Publicly available "sale prices" in Utah come
only from MLS listings (agent-reported) or voluntary disclosure.

**Impact on every valuation API:**
- Zillow Zestimate: Uses aggregated data — acknowledged inaccurate in Utah
- ATTOM AVM: Sources from public records — limited by non-disclosure
- BatchData AVM: Same limitation as ATTOM
- HouseCanary: Explicitly handles non-disclosure via MLS access (institutional license) — most
  accurate option but priced for institutional use

**What actually works for comps in rural Utah:**
1. PropStream — aggregates MLS sold data through their institutional data agreement. The
   "Run Comps" feature works because PropStream has licensed the MLS data that includes sale
   prices from agent-reported MLS closings.
2. Working with a local agent who has MLS access — a local Carbon County agent can pull actual
   comps for any property. Free for a good working relationship, but not automated.
3. Assessor-based comps (imperfect) — TOTAL_MKT_VALUE from UGRC reflects the county
   assessor's valuation estimate, which is reassessed when properties transfer. Can serve as
   a rough ARV floor but is often 1–3 years behind market.

---

## Part 5: Recommended Implementation Plan

### Phase A: Free Data (Implement First, Zero Cost)

**A1: UGRC LIR Batch Import**
- Download Carbon, Emery, Juab, Millard LIR GeoJSON from opendata.gis.utah.gov
- Match to existing 3,100 properties by address (fuzzy string match)
- Populate: bldg_sqft, built_yr, total_mkt_value, prop_class, parcel_acres
- Use TOTAL_MKT_VALUE as "Assessed Value" field on property detail page
- Use TOTAL_MKT_VALUE as an ARV floor indicator (with disclaimer) in MAO calculator
- Use PROP_CLASS to implement DATA-11 (filter vacant land — PROP_CLASS codes identify improved
  vs. unimproved parcels)
- **Effort:** 1–2 days. **Cost:** $0. **Solves:** sqft, year built, assessed value, property class.

**A2: Zillow ZHVI Market Data**
- Monthly CSV download from zillow.com/research/data/ for ZIP codes: 84501, 84521, 84624, 84648,
  84637, 84528 (target area ZIPs)
- Store in market_data table with month, zip, median_value, price_per_sqft if available
- Display on property detail: "Market context for [city]: median $X ([month] Zillow)"
- Powers ANALYTICS-04 (market trend charts) when built
- **Effort:** Half a day. **Cost:** $0. **Solves:** market trend context.

### Phase B: PropStream Subscription ($99/month)

**B1: Manual ARV workflow**
Subscribe to PropStream Essentials ($99/month). When a deal is started:
1. User opens PropStream in a new tab, searches the property address
2. Clicks "Run Comps" — filter to within 0.5 mile, similar beds/sqft, last 12 months
3. Note the estimated value and comp average
4. Enter that number into HouseFinder's MAO calculator ARV field
5. MAO auto-calculates: MAO = ARV × 0.70 − Repairs − Wholesale Fee

This is zero development work and gives Brian accurate MLS-sourced comps within 2 minutes per
property.

**B2: Skip tracing with PropStream Pro** (optional upgrade)
If Tracerfy is insufficient, PropStream Pro at $199/month includes $6,000 in skip tracing credits
plus comps. Compare with Tracerfy cost before deciding.

### Phase C: ATTOM API Integration (Optional — adds beds/baths and auto-populated ARV)

If the manual PropStream workflow is too slow as deal volume grows, integrate ATTOM:

1. Get free trial API key at api.developer.attomdata.com
2. Test coverage for Carbon/Emery/Juab/Millard by looking up known properties from the database
3. If coverage is good, implement:
   - On "Start Deal": call `/property/detail` by address → auto-populate beds, baths, sqft, year built
   - Call `/attomavm` → display estimated ARV range in MAO calculator with confidence indicator
4. Cost validation: confirm pricing for ~50 lookups/month (new deals started) — should be under $95/month

**When to do Phase C:** When deal volume reaches 5–10 new deals per month and manual PropStream
lookup becomes friction.

---

## Summary Comparison Matrix

| Source | Cost | Beds/Baths | Sqft/YearBuilt | ARV/AVM | Comps | Rural UT Coverage | TOS OK |
|--------|------|-----------|----------------|---------|-------|-------------------|--------|
| UGRC LIR (free) | $0 | No | Yes | Assessed value only | No | Excellent | Yes |
| Zillow ZHVI bulk | $0 | No | No | Market median only | No | Good (ZIP level) | Yes |
| Zillow Zestimate API | $500+/mo | No | No | Yes | No | Poor (non-disclosure) | Yes (commercial) |
| Zillow Bridge API | $500+/mo | No | No | Yes | No | Poor | No (no-storage TOS) |
| RapidAPI scrapers | $10–50/mo | Yes | Yes | Yes (scraped) | Yes | Moderate | NO (TOS violation) |
| Apify Zillow | $0–5/mo | Yes | Yes | Yes (scraped) | Yes | Moderate | NO (TOS violation) |
| PropStream | $99/mo | Yes | Yes | Yes (MLS-backed) | Yes (MLS) | Excellent | Yes |
| ATTOM Data | $95+/mo | Yes | Yes | Yes | Yes | Good | Yes |
| BatchData | $0.01+/call | Yes | Yes | Yes | No | Good | Yes |
| HouseCanary | $10/report | Yes | Yes | Yes (MLS-backed) | Yes | Good | Yes |
| Redfin | None | N/A | N/A | N/A | N/A | Poor (not rural) | N/A |
| Realtor.com | Agent only | N/A | N/A | N/A | N/A | Poor (agent only) | N/A |
| UtahRealEstate MLS | Agent tools only | N/A | N/A | N/A | N/A | Excellent | NO (agents only) |

---

## Key URLs

- Zillow Developer Portal: https://www.zillowgroup.com/developers/
- Zillow Zestimate API: https://www.zillowgroup.com/developers/api/zestimate/zestimates-api/
- Zillow Research Data (free): https://www.zillow.com/research/data/
- Bridge Interactive API: https://www.bridgeinteractive.com/developers/zillow-group-data/
- UGRC Parcel Data: https://gis.utah.gov/products/sgid/cadastre/parcels/
- UGRC Open Data: https://opendata.gis.utah.gov/
- UGRC API: https://api.mapserv.utah.gov/
- Utah Parcels Viewer: https://parcels.utah.gov/
- PropStream: https://www.propstream.com/pricing
- ATTOM Developer Portal: https://api.developer.attomdata.com/
- ATTOM Pricing: https://www.oreateai.com/blog/navigating-attom-api-pricing-in-2025-what-you-need-to-know/250a68cfef66be16c378c14edfc4fa8e
- BatchData AVM: https://batchdata.io/avm
- BatchData Pricing: https://batchdata.io/pricing
- HouseCanary AVM: https://www.housecanary.com/resources/our-avm
- UtahRealEstate.com Vendor: https://vendor.utahrealestate.com/
- Non-disclosure state analysis (HouseCanary): https://www.housecanary.com/blog/non-disclosure-states

---

## Open Questions

1. **UGRC LIR field completeness for target counties.** The schema includes BLDG_SQFT and BUILT_YR
   but completeness varies per county. Before building the import, download the Carbon County LIR
   and check what percentage of records have non-null BLDG_SQFT values. Acceptable threshold: >60%.

2. **ATTOM trial coverage verification.** Before committing, create a free trial account and test
   lookups for 10 known addresses from the HouseFinder database in Price, UT and Delta, UT. Check
   that beds/baths are populated and AVM confidence scores are not flagging sparse data.

3. **PropStream rural coverage spot check.** Before subscribing, use the 7-day free trial to run
   comps on a known sold property in Price or Delta. Verify that sold comps from the last 12 months
   appear. If the comps panel is empty, the MLS data coverage is insufficient for that market.

4. **BatchData exact pricing.** The $0.01/call figure comes from their marketing copy; per-call
   pricing for AVM specifically may be higher. Check the current pricing page before assuming
   this is accurate for AVM calls vs. basic property detail lookups.

---

*Researched: 2026-03-26*
*Confidence: HIGH for conclusions; MEDIUM for exact pricing (vendors obscure pricing behind sales calls)*
