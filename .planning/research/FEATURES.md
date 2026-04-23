# Feature Research: v1.3 Rose Park Urban Pilot

**Domain:** Urban distressed-property lead generation — neighborhood-scoped, dense market
**Researched:** 2026-04-17
**Confidence:** HIGH (codebase fully read; SLC/84116 public records sources verified)

---

## Context: What Already Exists vs. What Is New

This milestone is explicitly additive. The table below categorizes every feature area
by whether it already works, needs a trivial config change, needs real extension, or is
genuinely new.

| Area | Status |
|------|--------|
| Dashboard filters (city, tier, distress type, owner type, source, sort) | EXISTS — no change needed |
| Distress signal model (nod, tax_lien, lis_pendens, probate, code_violation, vacant) | EXISTS — signal types are correct for urban too |
| Scoring engine (weighted, 1–10, Critical/Hot/Warm tiers) | EXISTS — needs calibration review only |
| Deal flow (kanban, MAO calculator, contracts, photos, CRM, campaigns) | EXISTS — works identically for urban |
| Buyer CRM, blast, matching | EXISTS — works identically |
| UGRC assessor enrichment (sqft, year built, assessed value) | EXISTS — Salt Lake County LIR parcels are in the same UGRC ArcGIS FeatureServer used for rural counties; needs zero code change, only a run for Salt Lake County parcel IDs |
| XChange court records (probate, lis pendens) | EXISTS — XChange covers statewide courts including Salt Lake County Third District; zero code change |
| Map view | EXISTS — Rose Park properties with lat/lng will appear automatically once unblocked by city filter |
| Target city config (scraperConfig `target_cities` JSON) | EXISTS — adding "Rose Park" to the JSON list is the unlock |
| Analytics (pipeline funnel, market compare, scraper health) | EXISTS — will naturally include Rose Park once data flows |

---

## Feature Landscape

### Table Stakes (Users Expect These)

These are the minimum features that must work for Rose Park to feel like a real pilot,
not a broken experiment.

| Feature | Why Expected | Complexity | Status | Notes |
|---------|--------------|------------|--------|-------|
| Rose Park appears in city filter | Without this, no way to focus on 84116 leads | LOW | **TRIVIAL EXTENSION** | Add "Rose Park" to `target_cities` scraperConfig; retag any 84116 properties already scraped from UGRC/XChange with `city = 'Rose Park'` using the normalizeAddress pattern from the 2026-04-07 address fix |
| Tax delinquent scraper for Salt Lake County | Core distress signal; analog of carbon-delinquent | MEDIUM | **NEW** | SLC Treasurer has a per-parcel lookup UI (not a bulk table like Carbon County's wpDataTable). Research shows no downloadable bulk list — scraper must search individual parcel IDs from UGRC LIR dataset filtered to 84116, or use the alphabetical index on the delinquent balance page. Needs investigation of the actual HTML structure |
| Recorder scraper for Salt Lake County NOD / lis pendens | Core distress signal for urban markets (NODs are the most actionable urban signal) | HIGH | **NEW** | Salt Lake County Recorder at apps.saltlakecounty.gov has a public search portal with document types confirmed: "NT DF" (Notice of Default), "LIS PN" (Lis Pendens), "N SALE" (Notice of Trustee's Sale). The portal requires parcel number auto-complete selection, meaning a standard HTTP scraper cannot do a blind date-range sweep. Data unit packages at $5/150 units may be required for bulk access. This is the hardest scraper in the milestone |
| Distress score calibration check for urban signal mix | Urban properties have different signal prevalence; scoring tuned for rural may over/under-fire | LOW | **TRIVIAL EXTENSION** | Run a dry-rescore (SCORE2-01 pattern already exists) after first Rose Park data batch. Expect code_violation to be more common, large tax delinquency less common. May need to lower Hot threshold from 4 to 3 for urban if signal volume is lower |
| Dashboard filter shows Rose Park separately from Salt Lake City | 84116 overlaps two zip codes (84054 + 84116) and borders Glendale, Poplar Grove. Without a distinct label, it blurs into "Salt Lake City" noise | LOW | **TRIVIAL EXTENSION** | The existing city filter already works by exact city string match. Retagging 84116 records as city = 'Rose Park' (not 'Salt Lake City') is the correct approach per PROJECT.md plan. City filter dropdown auto-populates from getTargetCitiesList() |

### Differentiators (Competitive Advantage for Urban Pilot)

Features that are not strictly required for v1.3 to ship, but meaningfully differentiate
the Rose Park pilot from a simple "point the scraper at a new city."

| Feature | Value Proposition | Complexity | Status | Notes |
|---------|-------------------|------------|--------|-------|
| Proximity-to-owner indicator | Brian's stated motivation for Rose Park is that it is close to his homes. A distance badge ("0.8 mi from you") on lead cards for 84116 properties lets him prioritize walk/drive-by visits. Useful for mobile triage | MEDIUM | **NEW** | Schema has latitude/longitude on properties. Need a stored "home base" lat/lng in scraperConfig (or hard-code Brian's two homes). Haversine distance computation in getProperties() or client-side. Display as a compact badge on lead cards for Rose Park properties only. Do NOT make this global — rural leads 3+ hours away makes the badge meaningless |
| Zip-code boundary filter (84116 strict) | 84116 bleeds into North Salt Lake (84054). Recorder and tax records scraped from Salt Lake County will include North Salt Lake properties. A zip filter prevents North Salt Lake noise from polluting the Rose Park dashboard view | LOW | **TRIVIAL EXTENSION** | properties.zip already exists in schema. Add `zip` as an optional dashboard filter param (GetPropertiesParams already has the pattern). For Rose Park pilot: in the scraper, only upsert records where zip = '84116' OR city = 'Rose Park'. On the dashboard: the city filter handles display scoping if all records are tagged correctly |
| Urban ARV signal (Redfin/Zillow comp density indicator) | SLC has dense MLS comp data unlike rural. Rose Park median home price ~$430K (March 2026), 54 days on market (slower than last year). Urban leads benefit from showing whether the property area has active recent sales (comps available) vs. thin-comp risk | MEDIUM | **NEW** | The MAO calculator already has comps and arvNotes fields on deals. The differentiator here is surfacing comp availability at the lead card level, not just in deal detail. Options: (a) Show Redfin/Zillow link for the address on the property detail page (trivial, no API needed), (b) Use APIllow free tier (50 req/month) to pull Zestimate as a rough ARV sanity check for promoted deals. Recommend (a) for v1.3; (b) for v1.4 |
| Code violation signal sourcing for SLC | Code violations are the most common urban distress signal in dense lower-income neighborhoods like Rose Park (43% Hispanic, lower-middle-income). Rural counties rarely surface code violations. For Rose Park, code violations are a leading indicator of investor-ready properties | HIGH | **NEW — conditional on data source** | Salt Lake City Building Services has a Civil Enforcement portal (slc.gov/buildingservices/civil-enforcement). Data is public under GRAMA. However, no confirmed bulk download or API was found — MySLC app surfaces individual reports. XChange ($40/mo flat covers statewide justice court violations including housing ordinances) is the most reliable path. Recommend: if XChange subscription is active, add Salt Lake County to the XChange court intake run (zero code change, just run the existing XCHG-01 workflow for Third District). If XChange not yet active, defer code violations to v1.4 |
| Neighborhood-level map clustering | Urban pin density in Rose Park will be much higher than rural — dozens of pins within a few square miles vs. scattered pins across a county. Without clustering, the map becomes unreadable | LOW | **TRIVIAL EXTENSION** | Mapbox GL JS supports supercluster-style clustering natively. The existing map component uses Mapbox. Add cluster layer with count labels at low zoom, explode to individual pins at high zoom. This is a standard Mapbox pattern |

### Anti-Features (Do Not Build These)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Separate "urban dashboard" tab | Rose Park feels different from rural, tempting to create a separate UI | Creates divergent maintenance burden; existing filters (city, zip, distress type) already scope to Rose Park. The data model is identical | Use city filter + tier filter. If needed, add a saved-filter preset (future v2) |
| Scraping Salt Lake City MLS / Redfin listings | Urban comp data is tempting; dense market = available data | MLS requires REALTOR membership. Redfin ToS prohibits scraping. "MLS / on-market listing data" is explicitly Out of Scope in REQUIREMENTS.md | Use Redfin/Zillow links on property detail page for manual ARV research |
| Adjacent neighborhood expansion (Glendale, Poplar Grove, Westpointe) | If Rose Park works, expand to neighboring hoods immediately | The project.md explicitly says "Rose Park is a scoped experiment." Adjacent expansion before Rose Park validates adds noise and risk. UGRC/XChange data bleeds across zips | Keep 84116 as the hard boundary for v1.3. Expand zip scope only after first deal closes |
| Owner proximity map (show where owner lives vs. property) | Urban absentee landlords are common targets | Requires mailing address geocoding for every property. Rural assessor records have owner mailing addresses but geocoding them reliably is non-trivial. High complexity for marginal gain | Display absentee owner flag based on owner_type (LLC, trust) + mailing address != property address pattern where available |
| Competition density overlay (how many investors targeting this area) | SLC has more investor competition than rural Utah | Requires tracking competitor activity with no reliable free data source | Surface the insight in alert emails: "Rose Park has higher competition — contact within 24 hours of alert" |

---

## Feature Dependencies

```
[Salt Lake County Tax Delinquent Scraper]
    └──requires──> [84116 parcel ID list from UGRC Salt Lake County LIR]
                       └──requires──> [UGRC assessor run for Salt Lake County]

[Salt Lake County Recorder Scraper (NOD/Lis Pendens)]
    └──requires──> [Parcel IDs with addresses for 84116 properties]
                   └──requires──> [Tax delinquent OR UGRC run completes first]

[Rose Park City Filter (dashboard)]
    └──requires──> [city = 'Rose Park' tagging on 84116 properties]
                   └──requires──> [At least one scraper has run for 84116]

[Proximity-to-Owner Badge]
    └──requires──> [properties.latitude/longitude populated]
                   └──requires──> [UGRC run populates lat/lng for Rose Park parcels]

[Distress Score Calibration Check]
    └──requires──> [At least 20-30 Rose Park properties with signals in DB]
                   └──requires──> [At least one scraper run has completed]

[Code Violation Signal (SLC)]
    └──requires──> [XChange subscription active OR SLC civil enforcement data source confirmed]

[Map Clustering]
    └──enhances──> [Existing map view]
    (no hard dependency — independent improvement)

[Zip-Code Boundary Filter]
    └──enhances──> [City filter]
    (no hard dependency — defense against 84054 bleed-through)
```

### Dependency Notes

- **UGRC Salt Lake County run must come first:** Every other Rose Park feature depends on having parcel data with lat/lng, property type, and assessed value for 84116 parcels. The UGRC ArcGIS FeatureServer already used for rural counties includes Salt Lake County LIR data — same API, different county filter. This is the lowest-risk, highest-leverage first step.

- **Recorder scraper is highest complexity:** The SLC Recorder portal requires parcel number as a starting point (auto-complete, not free-text date sweep), making it fundamentally different from a naive HTTP scrape. The most practical approach is: for each 84116 parcel already in the DB (from UGRC run), query the recorder for recent documents of type NT DF and LIS PN. Rate limit carefully. Data unit package ($5 for 150 units) may be needed. Flag this as the phase most likely to need deeper research.

- **City tagging approach is a one-way decision:** Retagging 84116 properties as `city = 'Rose Park'` is correct and consistent with the existing city filter pattern. However, it means records scraped from Salt Lake County sources that arrive with `city = 'Salt Lake City'` must be overridden at upsert time based on zip. The normalizeAddress function (updated 2026-04-07) is the right place to enforce this.

---

## MVP Definition for v1.3

### Ship With (v1.3 core)

- [x] UGRC assessor enrichment run for Salt Lake County — unlocks lat/lng, sqft, year built, assessed value for 84116 parcels
- [x] target_cities config update to add "Rose Park" — unlocks dashboard display
- [x] City tagging: ensure all 84116 upserts write `city = 'Rose Park'` (via zip-based override in upsert logic)
- [x] Salt Lake County tax delinquent scraper — even a partial/weekly one is enough for pilot
- [x] Distress score calibration dry-run after first data batch
- [x] Zip-code boundary filter to exclude 84054 bleed-through (LOW complexity, HIGH noise reduction value)
- [x] Map clustering (LOW complexity, HIGH usability value in dense urban view)

### Add After First Data Batch (v1.3 follow-on)

- [ ] Salt Lake County Recorder NOD/lis pendens scraper — highest complexity; begin research on portal structure during first sprint, implement when approach is confirmed
- [ ] Proximity-to-owner badge for Rose Park leads — add after confirming lat/lng is populated
- [ ] Code violation via XChange — activate if XChange subscription is live; otherwise defer

### Defer to v1.4 or Later

- [ ] Zillow/APIllow ARV integration — 50 req/month free tier is too limited; useful only after Rose Park proves deal flow
- [ ] Adjacent neighborhood expansion (Glendale, Poplar Grove) — only after first Rose Park deal closes
- [ ] Saved filter presets ("Rose Park Hot Leads" one-click) — v2 feature

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| UGRC Salt Lake County run | HIGH | LOW | P1 |
| target_cities + city tagging | HIGH | LOW | P1 |
| Tax delinquent scraper (SLC) | HIGH | MEDIUM | P1 |
| Zip-code boundary filter | MEDIUM | LOW | P1 |
| Score calibration dry-run | HIGH | LOW | P1 |
| Map clustering | MEDIUM | LOW | P1 |
| Recorder NOD/lis pendens scraper | HIGH | HIGH | P2 |
| Proximity-to-owner badge | MEDIUM | MEDIUM | P2 |
| Code violations via XChange | HIGH | LOW (if XChange active) | P2 |
| ARV comp density link on property detail | LOW | LOW | P3 |
| APIllow Zestimate integration | LOW | MEDIUM | P3 |

---

## Urban vs. Rural Workflow Differences: Key Findings

These differences inform why Rose Park cannot simply be "another city in the city filter"
without the scraper work described above.

### Signal Mix Differences

| Signal | Rural (Carbon/Emery/etc.) | Urban Rose Park (84116) | Implication |
|--------|--------------------------|--------------------------|-------------|
| Tax delinquent | Common — large acreage, low assessed value | Less common per property, but SLC Treasurer has a searchable portal | Different scraper approach needed |
| NOD / lis pendens | Rare (Carbon recorder portal not public) | More frequent — active foreclosure market, SLC Recorder has searchable portal with confirmed NT DF / LIS PN document types | Recorder scraper is viable and valuable for SLC |
| Probate | Via XChange — works | Via XChange — same system, same code | No change needed |
| Code violation | Very rare in rural counties | Common in 84116 — lower-income, dense housing, 40% renter-occupied | Highest priority new signal for urban |
| Vacant | Detected via owner name patterns | Less common in dense urban but exists (abandoned, neglected) | Existing pattern still works |

### Competition Density

Rural Carbon/Emery counties have minimal investor competition. Rose Park has more competition — slower DOM (54 days March 2026 vs 29 days year prior) may actually signal softening competition after 2025 rate pressure, but SLC investors are more active than rural. Alert speed matters more in urban: the existing Email + SMS alert system is sufficient but timing is critical. Daily scraping (not weekly) is required for Rose Park.

### Parcel Density and Filter Noise

84116 has hundreds of residential parcels vs. dozens in a rural town. The existing 100-row limit in getProperties() may fill up with Rose Park properties alone, displacing rural leads. This is a data management concern: the limit should either be raised or paginated when Rose Park is added to target_cities. The current query has `.limit(100)` hardcoded.

### Zip Code Bleed-Through

84116 covers both Rose Park and a small strip of North Salt Lake (84054). Salt Lake County government records don't distinguish by neighborhood — they report by parcel. The city field from Salt Lake County sources will often say "Salt Lake City" or "North Salt Lake" depending on the parcel. The upsert layer must override to `city = 'Rose Park'` for any parcel whose zip is 84116 AND whose coordinates are within Rose Park bounds (or simply use zip = '84116' as the proxy). This prevents dashboard confusion.

### Owner Profile Differences

Rose Park is 43% Hispanic, ~41% foreign-born, lower-middle-income. Owner names will include more Spanish surnames — no technical implication but relevant for campaign templates (language considerations for outreach). LLC ownership is less common than in rural agricultural counties. `hideEntities` filter may already correctly exclude the few LLC-owned properties; individual owner prevalence is high.

---

## SLC-Specific Data Sources Summary

| Source | Data Type | Access Method | Confirmed? | Cost |
|--------|-----------|---------------|------------|------|
| UGRC ArcGIS FeatureServer (Salt Lake County LIR) | Parcel boundaries, owner, assessed value, sqft, year built | Existing UGRC script, new county param | YES — same API used for rural | Free |
| SLC Treasurer delinquent balance tool | Tax delinquency | Per-parcel HTML query (no bulk list found) | PARTIAL — portal exists, bulk unknown | Free |
| SLC Recorder public search (apps.saltlakecounty.gov) | NT DF, LIS PN, N SALE (confirmed document types) | Per-parcel portal query; $5 data unit package for volume | YES — portal confirmed | $5 per 150 units |
| Utah Courts XChange | Probate, lis pendens, code violations (justice court) | Existing XCHG-01 workflow, add Salt Lake County to run | YES — statewide including SLC Third District | $40/mo (existing cost if subscribed) |
| SLC Building Services Civil Enforcement | Code violations | MySLC app or GRAMA request; no bulk API confirmed | PARTIAL — data is public, access method unconfirmed | Free under GRAMA |
| Redfin / Zillow (manual links) | ARV comps reference | Manual — link on property detail page | YES — no API, just URLs | Free |

---

## Sources

- Salt Lake County Recorder document types confirmed: https://apps.saltlakecounty.gov/data-services/PropertyWatch/DocumentTypes.aspx
- Salt Lake County Treasurer delinquent search: https://www.saltlakecounty.gov/treasurer/property-taxes/find-delinquent-property-balance/
- Salt Lake County Recorder data services: https://www.saltlakecounty.gov/recorder/data-services/
- UGRC Salt Lake County Parcels LIR: https://opendata.gis.utah.gov/datasets/utah-salt-lake-county-parcels-lir/about
- Utah Courts XChange fees (current $40/mo, 500 searches): https://www.utcourts.gov/en/court-records-publications/records/xchange/subscribe.html
- Rose Park housing market March 2026 (median $430K, 54 DOM): https://www.redfin.com/neighborhood/178636/UT/Salt-Lake-City/Rose-Park/housing-market
- Rose Park demographics (43% Hispanic, lower-middle income, 40% renter): https://www.neighborhoodscout.com/ut/salt-lake-city/rose-park
- 84116 zip covers Rose Park + strip of North Salt Lake (84054): https://www.unitedstateszipcodes.org/84116/
- SLC Building Services Civil Enforcement: https://www.slc.gov/buildingservices/civil-enforcement/
- Zillow official API deprecated 2021; third-party APIllow 50 req/month free tier: https://dev.to/apillow/how-to-get-zillow-data-using-a-rest-api-in-2026-no-scraping-required-205b

---

*Feature research for: HouseFinder v1.3 Rose Park Urban Pilot*
*Researched: 2026-04-17*
