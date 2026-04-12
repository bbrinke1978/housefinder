# Feature Research

**Domain:** Distressed property lead generation (real estate investor tool)
**Researched:** 2026-03-17
**Confidence:** MEDIUM — competitive feature sets confirmed via web research; free-source-only constraint is unique to this project so some differentiators are inferred rather than observed

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. Based on analysis of BatchLeads, PropStream, DealMachine, and REIPro.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Property search with address/city lookup | Any lead tool must find properties by location | LOW | Utah county assessor data is free; basic search is foundational |
| Distress indicator display per property | This IS the product — users need to see what makes a property distressed | LOW | NOD, tax lien, lis pendens, probate, vacant flags per property |
| Property detail page | Every competitor has it; users need owner name, address, tax status, basic property facts | MEDIUM | Pull from county assessor + recorder; show all available public fields |
| Lead list / saved searches | Users build and revisit lists; no list = no workflow | MEDIUM | Save filter criteria and review saved leads on return visits |
| Lead status tracking | Users need to track what they've done with each lead (contacted, following up, closed, dead) | LOW | 5 statuses: New, Contacted, Follow-Up, Closed, Dead |
| Notes per lead | Universal expectation; investors take notes constantly | LOW | Simple text field per lead, timestamped |
| Mobile-responsive UI | Investors act in the field; mobile usability is assumed | MEDIUM | Mobile-first layout, large tap targets, readable at a glance |
| Map view of properties | BatchLeads, PropStream, DealMachine all have map view; users expect geographic browsing | HIGH | Map with property pins, filter by distress type on map; hardest feature to build well |
| Filter/sort by distress type | Core workflow: "show me all pre-foreclosures in Price, UT" | LOW | Filter UI over property list; sort by date added, distress count |
| Owner name visible | County assessor always has this; users need to know who to call | LOW | From county assessor scrape |

### Differentiators (Competitive Advantage)

Features that set the product apart. Competitors charge $97–$299/month. We're free with a niche focus.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-signal distress scoring (list stacking) | Properties with 2+ distress indicators are far more likely to sell; competitors charge extra for this; we surface it automatically | MEDIUM | Count distress signals per property, sort/flag by count. Threshold: 2+ = hot lead |
| Hot lead email alerts | BatchLeads has alerts but requires setup and subscription; we send daily/immediate alerts automatically | MEDIUM | Resend API already set up; trigger on new 2+ signal properties |
| Hot lead SMS alerts | SMS is faster than email for urgent leads; competitors treat this as premium | MEDIUM | Need free/cheap SMS provider (Twilio trial or similar); send for 3+ signal properties |
| Rural Utah market focus | BatchLeads/PropStream users target Phoenix, Las Vegas, SLC — Price, UT and similar towns have almost no tool-using competition | LOW | Pre-configured for ~10 Carbon/Emery/Sanpete/Sevier County towns |
| Tap-to-call from lead detail | Mobile-first investors want zero friction between seeing a hot lead and calling the owner | LOW | `tel:` link on owner phone number; works on any mobile browser |
| Free owner contact lookup from public sources | Competitors charge $0.15–$0.50 per skip trace; we pull from county assessor + voter rolls for free | HIGH | Carbon County assessor, Utah voter registration data, state business registry for LLCs. Coverage will be partial — flag when not found |
| Probate / estate lead detection | Competitors often miss this or charge extra; heirs who inherit distressed property are highly motivated sellers | HIGH | Scrape Utah state court OCAP system for probate filings; match to property addresses |
| Vacant / code violation detection | Code violations = neglect = distress; not all competitors surface this | HIGH | City/county code enforcement records where available; utility shutoff records |
| Daily automated scraping with new lead indicator | Users return to see "what's new since yesterday" — competitors require manual list refreshes | MEDIUM | Track first-seen date per property; badge new leads on dashboard |
| Configurable city/county scope | Investors want to lock in their market and only see noise from their area | LOW | Checkbox list of target towns; filter all data by selection |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but create problems given our constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Paid skip tracing integration | BatchLeads, REIPro, PropStream all offer it; users will ask for it | Breaks the zero-cost constraint. BatchSkipTracing, TLO, BeenVerified all cost money per lookup. Creates dependency on third-party paid API | Flag leads where contact info is missing with "Manual skip trace needed" badge. Free sources (voter rolls, assessor) cover a meaningful portion of owners |
| Auto-dialer / predictive dialer | BatchDialer is companion to BatchLeads; power dialers increase contact rates | Rural Utah markets have small lists (dozens, not thousands). Auto-dialers require TCPA compliance work and often paid telephony providers. Overkill for this scale | Tap-to-call with notes per contact attempt. Manual dialing is fine at this scale |
| Direct mail campaign builder | REIPro, BatchLeads offer postcard automation | Postcard printing costs money per send. Requires address normalization, mailing list management, third-party print API (PostGrid, Lob). Adds ongoing per-use cost | Contact by phone first. If user wants mail, export a CSV of addresses for manual use |
| MLS / on-market listing data | Users sometimes want to compare distressed prices to listed comps | MLS access requires REALTOR membership or paid API. Not needed for pre-foreclosure workflows where properties are off-market | Show Zillow/Redfin estimated value from public estimate sources if available; or prompt user to check Zillow manually |
| Native iOS / Android app | DealMachine's app store presence is a selling point | Native apps require App Store/Play Store accounts, separate builds, push notification infrastructure, and platform updates. Responsive web app with PWA achieves 90% of the value | PWA-capable responsive Next.js app with home screen install prompt |
| Real-time property alerts (push notifications) | Users want instant notification | Push notifications require service workers, notification permission flows, and backend WebSocket infrastructure. Complexity is high relative to value for a niche tool | Email + SMS alerts on a daily or immediate-trigger basis. Checked frequently enough for rural markets |
| Multi-user team management | BatchLeads, DealMachine support teams | Adds auth complexity, permission systems, shared pipeline management. Single user is the target persona | Simple single-account auth. Team features are v2+ if product finds multi-investor use |
| Deal analyzer / ROI calculator | REIPro, DealMachine include this | Adds substantial UI complexity. Requires ARV, repair cost, financing inputs. Not relevant until user has a specific deal to analyze | Link out to free external calculators (BiggerPockets, DealCheck free tier) |

---

## Feature Dependencies

```
[Distress Signal Scoring (hot lead threshold)]
    └──requires──> [Distress Indicator Scraping per property]
                       └──requires──> [County Recorder / Court Scraping]
                       └──requires──> [Tax Assessor Scraping]

[Hot Lead Email Alert]
    └──requires──> [Distress Signal Scoring]
    └──requires──> [Resend API integration]

[Hot Lead SMS Alert]
    └──requires──> [Distress Signal Scoring]
    └──requires──> [SMS provider setup]

[Owner Phone Number (tap-to-call)]
    └──requires──> [Owner Contact Lookup from public sources]
                       └──requires──> [County Assessor owner name]
                       └──requires──> [Voter roll lookup (by name + address)]

[Map View]
    └──requires──> [Property geocoding (lat/lng per address)]
    └──requires──> [Property list in database]

[Lead Status Tracking]
    └──requires──> [Property Detail Page]

[Notes per Lead]
    └──requires──> [Lead Status Tracking] (same data model)

[Probate Lead Detection] ──enhances──> [Distress Signal Scoring]
    └──requires──> [Utah OCAP court scraping]
    └──requires──> [Address matching between court filing and property record]

[Vacant / Code Violation Detection] ──enhances──> [Distress Signal Scoring]
    └──requires──> [City/county code enforcement data access]
    (availability varies by city — may not be available for all target towns)

[Daily New Lead Badge]
    └──requires──> [First-seen timestamp on every property]
    └──requires──> [Scheduled scraper runs]

[Map View] ──conflicts──> [Low-complexity MVP scope]
    (Map view is HIGH complexity and should be deferred post-core)
```

### Dependency Notes

- **Distress signal scoring requires all scrapers to be running first:** Scoring is meaningless without data. All data collection must be in place before scoring is useful.
- **Owner contact lookup is partially independent:** Can show property + distress data without contact info; flag "no contact found" and let user manually skip trace.
- **Map view is a standalone enhancement:** Core workflow (dashboard list + detail + alerts) works without map. Map is a v1.x addition.
- **Probate detection conflicts with scraper complexity:** Utah OCAP (Online Court Assistance Program) is the source; parsing court filings to extract property addresses is non-trivial. Should be Phase 2.
- **Hot lead SMS conflicts with zero-cost constraint:** Twilio trial gives limited free credits; ongoing SMS has per-message cost. Design as optional or accept minimal cost (~$1–5/month at this scale).

---

## MVP Definition

### Launch With (v1)

Minimum viable product to validate the concept against real Utah distressed property data.

- [ ] Property database seeded from Carbon County assessor + recorder data — validates free-source-only approach
- [ ] Distress indicator flags per property (NOD, tax delinquency, lis pendens) — core value of the tool
- [ ] Multi-signal distress scoring (hot lead = 2+ indicators) — the key differentiator vs a raw list
- [ ] Lead list dashboard with filter by city, distress type, hot lead status — basic usability
- [ ] Property detail page with all available public data + owner name — gives user context to act
- [ ] Lead status tracking (New / Contacted / Follow-Up / Closed / Dead) — minimum CRM
- [ ] Notes per lead — minimum CRM
- [ ] Hot lead email alert via Resend — the "set it and forget it" value proposition
- [ ] Tap-to-call on owner phone number (when available from public sources) — mobile-first action
- [ ] Mobile-responsive UI — required for field use

### Add After Validation (v1.x)

Add once the core is proven to surface real leads.

- [ ] Map view of properties — add when users want geographic browsing (requires geocoding pipeline)
- [ ] Hot lead SMS alerts — add when email alerts are confirmed working; assess cost
- [ ] Voter roll phone number lookup — enriches owner contact rate; implement once assessor data is confirmed useful
- [ ] Daily new lead badge / "since your last visit" indicator — quality-of-life for return users
- [ ] Probate / estate lead detection via Utah OCAP — high-value leads, high scraping complexity

### Future Consideration (v2+)

Defer until product-market fit is established with the single user.

- [ ] Additional Utah markets beyond initial ~10 towns — expand based on whether current leads convert
- [ ] Vacant / code violation detection — value is real but data availability is inconsistent by city
- [ ] PWA / home screen installability — nice to have once users are habitual
- [ ] Export to CSV for manual mail campaigns — low effort, low urgency
- [ ] Multi-user / team support — only if investor shares tool with partner or VA

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Distress indicator scraping (NOD, tax lien, lis pendens) | HIGH | HIGH | P1 |
| Property detail page | HIGH | MEDIUM | P1 |
| Lead dashboard with filters | HIGH | MEDIUM | P1 |
| Multi-signal distress scoring (hot lead) | HIGH | LOW | P1 |
| Hot lead email alert (Resend) | HIGH | LOW | P1 |
| Lead status tracking (CRM basics) | HIGH | LOW | P1 |
| Notes per lead | MEDIUM | LOW | P1 |
| Tap-to-call (mobile) | HIGH | LOW | P1 |
| Mobile-responsive UI | HIGH | MEDIUM | P1 |
| Owner contact lookup (assessor + voter rolls) | HIGH | HIGH | P1 |
| Daily new lead indicator | MEDIUM | LOW | P2 |
| Map view | MEDIUM | HIGH | P2 |
| Hot lead SMS alerts | MEDIUM | MEDIUM | P2 |
| Voter roll phone number enrichment | MEDIUM | HIGH | P2 |
| Probate / estate lead detection | HIGH | HIGH | P2 |
| Vacant / code violation detection | MEDIUM | HIGH | P3 |
| PWA installability | LOW | LOW | P3 |
| CSV export | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (MVP)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

---

## Competitor Feature Analysis

| Feature | BatchLeads | PropStream | DealMachine | REIPro | HouseFinder Approach |
|---------|------------|------------|-------------|--------|---------------------|
| Property search | 155M+ properties, 300+ filters | 165+ filters, 20 pre-built lists | 700+ data points, 70+ filters | Millions of motivated seller leads | ~10 Utah towns; deep county-level data vs national breadth |
| Distress indicators | Pre-foreclosure, tax delinquent, vacant, absentee, high equity | Pre-foreclosure, tax lien, vacant, lis pendens, probate | Pre-foreclosure, vacant, absentee | Foreclosure, distressed property filters | Same core indicators; sourced free from county records |
| List stacking / scoring | Yes — BatchRank AI for scoring | Yes — list stacking by overlap count | Yes — 700+ data point stacking | Yes — motivation scoring | Manual count of distress signals; 2+ = hot lead flag |
| Skip tracing | Paid — $0.15–$0.50/record | Paid — enhanced skip tracing add-on | Paid — included in subscription tiers | Paid — built-in skip tracing | Free only — county assessor + voter rolls; manual flag when not found |
| Map view | Yes — boundary map search, virtual canvassing | Yes — Mobile Scout driving app | Yes — route tracking, satellite/street view | No prominent map feature | Planned v1.x; not MVP |
| Driving for dollars | Yes — mobile app | Yes — Mobile Scout app | Yes — core feature | No | Out of scope (no field driving workflow) |
| Email/SMS alerts | Yes — requires SMS provider setup | Yes — Lead Automator email alerts | Limited | Yes — automated follow-up sequences | Email via Resend (day 1); SMS via cheap provider (v1.x) |
| CRM / lead pipeline | Built-in CRM, conversation history | Basic lead management | Basic pipeline | Full CRM with 10-step workflow | Lightweight: status + notes per lead |
| Mobile app | Native iOS + Android | Mobile Scout app (iOS + Android) | Native iOS + Android | Web-based | Responsive web / PWA — no native app |
| AI lead scoring | BatchRank AI | Predictive AI for off-market leads | AI Street View analysis for distress | No | No AI — signal count is the score |
| Price | $127–$297/month | $99–$199/month | $49–$299/month | $109/month | Free |
| Geographic scope | National | National | National | National | Utah only (~10 small towns) |

---

## Sources

- [BatchLeads features overview](https://batchleads.io/) — official site
- [BatchLeads Review 2026 — Real Estate Skills](https://www.realestateskills.com/blog/batch-leads-review)
- [BatchLeads Review 2026 — REsimpli](https://resimpli.com/blog/batchleads-review/)
- [BatchLeads vs PropStream 2026](https://resimpli.com/blog/batchleads-vs-propstream/)
- [PropStream features page](https://www.propstream.com/propstream-features)
- [PropStream pre-foreclosure lead list](https://www.propstream.com/news/quick-list-spotlight-pre-foreclosures)
- [DealMachine all-in-one platform](https://www.dealmachine.com/all-in-one-platform)
- [DealMachine Review 2026 — Real Estate Skills](https://www.realestateskills.com/blog/dealmachine-review)
- [DealMachine vs PropStream](https://resimpli.com/blog/dealmachine-vs-propstream/)
- [REIPro review 2025](https://realestatebees.com/software/reipro/)
- [REIPro review 2026 — Real Estate Skills](https://www.realestateskills.com/blog/reipro-review)
- [Driving for dollars apps 2025](https://realestatebees.com/guides/software/driving-for-dollars/)
- [BatchLeads distressed property guide](https://batchleads.io/blog/how-to-find-distressed-properties-your-investment-opportunity-guide)
- [BatchLeads tax delinquent properties](https://batchleads.io/properties/tax-delinquent-properties-for-sale)
- [Carbon County Recorder — Utah](https://www.carbon.utah.gov/department/recorder/)
- [Emery County Recorder — Utah](https://emerycounty.com/home/offices/recorder/)
- [Utah Public Records Online Directory — NETROnline](https://publicrecords.netronline.com/state/UT)

---

*Feature research for: distressed property lead generation (rural Utah)*
*Researched: 2026-03-17*

---

---

# v1.1 Milestone Addendum: UGRC Assessor Data + XChange Court Records

**Researched:** 2026-04-10
**Milestone:** v1.1 Data Enrichment & Court Records

This addendum covers features specific to the new milestone. The base v1.0 feature landscape above remains valid. This section answers: what is table stakes vs differentiator for the UGRC and XChange integrations, and how should court record types map to distress signal weights?

---

## Existing Schema State (What's Already Wired In)

The DB schema already has columns for assessor data and all court signal types. These are not new features to design — they are empty fields waiting for data.

**Properties table already has:**
- `building_sqft` (integer, nullable)
- `year_built` (integer, nullable)
- `assessed_value` (integer, nullable)
- `lot_acres` (numeric, nullable)

**Signal type enum already includes:**
- `nod` — active (County recorder NOD scraper, `utah-legals.ts`)
- `tax_lien` — active (County delinquent tax scrapers)
- `lis_pendens` — defined, not yet sourced
- `probate` — defined, not yet sourced
- `code_violation` — defined, not yet sourced
- `vacant` — defined, not yet sourced

**Queries already select assessor fields** in `getProperty()` and `getProperties()` — they just return NULL because no import has run. The UI display layer likely already handles these fields; they just show empty.

The new milestone is **data pipeline work**, not schema design or UI design.

---

## Table Stakes for v1.1

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| UGRC batch import for 4 counties | Schema columns exist, queries already select them, UI presumably shows them — all returning NULL. This is the most visible "something is broken" gap. | Medium | Carbon, Emery, Millard, Juab. Use UGRC Open SGID API: `GET /api/v1/search/cadastre.[county]_county_parcels_lir/{fields}`. Free, requires API key registration at api.mapserv.utah.gov. |
| Address normalization for parcel matching | County recorder addresses (source of `properties.address`) differ from UGRC `PARCEL_ADD` in format. Join fails without normalization. "123 N Main St" vs "123 North Main" is a real discrepancy. | Medium | Normalize both sides: uppercase, expand abbreviations (N→North, St→Street), strip unit numbers. Fall back to geocode-based spatial match when string match fails. |
| XChange court record intake | The milestone explicitly targets probate and court-filed foreclosure signals. Without an intake workflow, `probate`, `lis_pendens`, and `code_violation` signal types remain unused. | High | XChange has no API. Browser-only with per-search billing ($0.35/search over 500/month). Must use agent-assisted workflow: user or automation searches XChange, exports/pastes results, app parses them into `distress_signals` rows. |
| Court record parser (case type → signal type) | Raw XChange output must become structured `distress_signals` rows. Requires case type classification logic. | Medium | See signal mapping table below. Most important classification: probate vs civil/foreclosure vs code violation adjudication. |
| Property matching for court records | Court records have party names, not parcel IDs. Must match `party_name` to `properties.owner_name` to link signals to properties. | Medium | Fuzzy name match (Levenshtein or token-sort). Owner name quality in DB varies — some are LLC names, some are person names. Exact match first, fuzzy fallback, no-match queue for manual review. |
| Re-score after enrichment | After import runs, `scoreAllProperties()` must execute so hot lead flags and distress scores reflect new signals. | Low | `scoreAllProperties()` already exists in `scraper/src/scoring/score.ts`. Needs a trigger: either a cron job, a manual admin button, or called at end of import script. |

---

## Differentiators for v1.1

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Assessed value as secondary scoring context | A property with assessed value $80K carrying 3 distress signals is a better wholesale target than a $300K property with the same signals. Could add UI badge or sort weighting when assessed value is below county median. | Low | Do not add to `scoreProperty()` formula yet — calibrate after seeing real enriched data. Add as a display label ("low value + distressed") rather than a score modifier for now. |
| Year built displayed as deal-context | Pre-1970 construction correlates with deferred maintenance and higher rehab cost. Useful context when user is evaluating whether to pursue. | Low | Pure UI — display the year, let the user interpret. No scoring change. |
| XChange case number stored in raw_data | User can look up the full case directly in XChange when they want more detail. Zero extra work — just include case number in the JSON blob written to `distress_signals.raw_data`. | Low | `raw_data` is free-form JSON. Store `{case_number, case_type, filing_date, party_name}` at minimum. |
| Targeted XChange search strategy (county + case type batch) | Searching by county + case type (e.g., "all Carbon County probate filings 2023-2026") returns many records per search, not one per owner name. This reduces per-search cost dramatically. | Medium | At $0.35/search over 500/month, searching ~3,100 owners individually would cost $900+. Batch by county + type instead. |
| UGRC CURRENT_ASOF-based re-import detection | The LIR dataset includes a `CURRENT_ASOF` field showing when the county last pushed data to UGRC. Compare against last import timestamp to determine if re-import is needed, avoiding unnecessary API calls. | Low | Rural county LIR data updates quarterly at best. Store `last_imported_at` per county in `scraper_config`. |

---

## Anti-Features for v1.1

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time UGRC API calls on property page load | Adds latency, unknown rate limits, and LIR data changes quarterly at most — live calls are wasteful. | Batch import script that runs on demand or on a schedule. Writes to DB. API calls happen once per import, not per page view. |
| Automated XChange browser scraping | XChange is authenticated with per-search billing. Automation would bypass billing and violates ToS. If detected, account ban. | Manual intake workflow: user opens XChange, searches by county+type, exports results page, pastes into app parser. |
| Statewide UGRC import | Only 4 counties have active scrapers. Importing all 29 counties bloats the DB with properties in markets where no signals will ever be scraped. | Import only counties that appear in target city config: Carbon, Emery, Millard, Juab. |
| Code violation scraping from city websites | Rural Utah city websites (Price, Fillmore, Delta) have no structured code violation databases or public APIs. XChange only surfaces violations that reached the court level. | Document as data gap. If a code violation appears in XChange as a civil case, it will be captured. True administrative violations that never go to court are inaccessible for free. |
| Assessed value as hard scoring weight | Assessor data may be incomplete or stale for rural counties. Building a scoring dependency on potentially-null data creates silent scoring failures. | Display assessed value as context. Consider scoring modifier only after validating data completeness for all 4 counties. |
| Fuzzy name matching with automatic insertion | If the fuzzy match is wrong, a probate signal gets attached to the wrong property. Silent bad data is worse than no data. | Fuzzy match produces candidates. Above-threshold confidence → auto-insert. Below threshold → write to a review queue (admin UI or log) for manual confirmation. |

---

## Signal Type Mapping: Court Records to Distress Signals

This is the core classification task for the XChange parser. Utah court case types must be mapped to the existing `signal_type` enum and assigned weights in `scraper_config.scoring_signals`.

| XChange Case Type | Signal Type | Recommended Weight | Freshness Days | Rationale |
|-------------------|-------------|-------------------|----------------|-----------|
| Probate / estate administration | `probate` | 2 | 730 (2 years) | Heirs want liquidity; probate takes 6-24 months. Signal stays fresh for 2 years. |
| Civil foreclosure (judicial) | `lis_pendens` | 3 | 365 | Judicial foreclosure is rare in Utah — most foreclosures are nonjudicial trustee sales at county recorder level. A civil foreclosure case in XChange means the lender went court-route, indicating complicated title or contested action. High distress. |
| Lis pendens filed (ownership dispute) | `lis_pendens` | 3 | 365 | Direct indicator of pending action that clouds title. Owner under legal pressure. |
| Code violation / nuisance abatement (civil action) | `code_violation` | 2 | 365 | Physical distress. Owner disengaged enough that a city pursued court action. |
| Tax deed / tax sale (court-filed action) | `tax_lien` | 2 | 365 | Tax liens are already captured at county level. A court-filed action means the county escalated — higher urgency than a raw delinquency entry. Do NOT dedup against existing `tax_lien` signals; these are separate signals. |
| Unlawful detainer / eviction | `vacant` | 1 | 180 | Owner lost control of tenant situation. Moderate distress indicator. Lower weight because eviction ≠ financial distress necessarily. Shorter freshness — evictions resolve quickly. |

**Critical nuance — Utah is a nonjudicial foreclosure state.** The `nod` signal (Notice of Default) is captured by the existing `utah-legals.ts` scraper from county recorder filings. Most Utah pre-foreclosures will NEVER appear in XChange because they never go through a court. Do not expect XChange to be a significant source of foreclosure leads. Its primary value for this system is **probate** and **code violation** cases that have no other free source.

**Weight calibration baseline (for reference):** The existing scoring engine uses `tax_lien` with tiered weights (1-4 based on amount due) plus a years-delinquent bonus. An `nod` signal probably has a base weight around 3-4 (config-driven, not hard-coded). The recommended weights above position `probate` and `code_violation` as meaningful but secondary signals — a property needs stacking (e.g., `tax_lien` + `probate`) to reach hot lead threshold.

---

## Feature Dependencies for v1.1

```
UGRC API key (free, register at api.mapserv.utah.gov)
  → UGRC batch import script
    → properties.building_sqft, year_built, assessed_value, lot_acres populated
      → Property detail UI shows real data (no new code needed — already in queries)
      → Assessed value display label (low-effort differentiator)

XChange subscription ($25 setup + $40/mo for 500 searches)
  → User runs batch county+type search in XChange browser
    → User exports/pastes search results into intake UI or script
      → Court record parser classifies case types → signal_type mapping
        → Party name fuzzy-matched to properties.owner_name
          → Matched signals inserted into distress_signals
            → Unmatched signals written to review queue
              → scoreAllProperties() triggered
                → leads.distress_score + is_hot updated
                  → Hot lead alerts fire (existing email/SMS pipeline)
```

**Dependencies on existing features:**
- `scoreAllProperties()` — already exists, just needs a trigger call
- `distress_signals` table with dedup index — already exists, XChange signals upserted same as scraper signals
- Signal type enum — already includes `probate`, `lis_pendens`, `code_violation`; no migration needed
- `scraper_config.scoring_signals` — needs new/updated rows for `probate`, `lis_pendens`, `code_violation` weights

---

## Data Quality Warnings

**UGRC field completeness varies by county.** Rural counties (Carbon, Emery, Millard, Juab) are smaller assessors with less complete LIR submissions. `BLDG_SQFT` and `BUILT_YR` may be NULL for a meaningful fraction of parcels — especially older rural parcels and vacant land. Import what exists; store NULL when missing; never fail the import on a missing field.

**Address normalization is a genuine problem.** County recorder addresses (source of `properties.address`) often differ from UGRC `PARCEL_ADD`. The same parcel may be "123 N MAIN" in the recorder and "123 North Main Street" in UGRC. Plan for: uppercase normalization, directional expansion (N→North, S→South, E→East, W→West), street type expansion (St→Street, Ave→Avenue, Rd→Road), strip unit/apt numbers. Test match rate against a sample before committing to production import.

**XChange search cost must be managed.** At $0.35/search over the 500/month included in the $40/month subscription, searching all ~3,100 property owners by name would cost approximately $900+ per run. The correct strategy is county-level batch searches by case type (e.g., "Carbon County Probate 2023-2026"), not owner-by-owner lookups. One county+type search returns dozens of results for one billing unit.

**Probate case confidentiality.** Utah probate filings are partially private — the petition and inventory may be restricted while the decree is public. XChange surfaces case metadata sufficient for distress signal purposes (case number, party/decedent name, filing date, case status) without needing access to restricted documents.

**Owner name matching will have noise.** `properties.owner_name` includes LLC names, trust names, and individual names from county recorder data. XChange party names are typically individual names (the decedent or debtor). LLC-owned properties will not match probate records — the probate is for the individual owner who personally owned through the LLC. This is acceptable: probate for an LLC-held property is rare anyway.

---

## Sources

- UGRC parcels LIR field documentation: https://gis.utah.gov/products/sgid/cadastre/parcels/
- UGRC API search endpoint docs: https://api.mapserv.utah.gov/docs/v1/endpoints/searching/
- XChange subscription pricing: https://www.utcourts.gov/en/court-records-publications/records/xchange/subscribe.html
- XChange public case search: https://xchange.utcourts.gov/
- Utah foreclosure process (nonjudicial trustee sale): https://www.nolo.com/legal-encyclopedia/summary-utahs-foreclosure-laws.html
- Utah Courts foreclosure self-help: https://www.utcourts.gov/en/self-help/categories/housing/foreclosure.html
- PropertyRadar distress signal guide: https://www.propertyradar.com/blog/the-complete-guide-to-distressed-properties
- BatchData distress property guide: https://batchdata.io/uncategorized/how-to-find-distressed-properties
- Confidence: HIGH for UGRC field schema (official documentation), HIGH for XChange pricing (official subscription page), HIGH for nonjudicial foreclosure prevalence in Utah (multiple official sources), MEDIUM for XChange case type coverage (inferred from court jurisdiction + case type documentation, not explicit XChange case-type list)

---

*v1.1 addendum researched: 2026-04-10*
