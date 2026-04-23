# Project Research Summary

**Project:** HouseFinder v1.3 — Rose Park Pilot
**Domain:** Urban ZIP-scoped expansion of an existing rural-Utah distressed-property scraping pipeline
**Researched:** 2026-04-17
**Confidence:** HIGH (all four research files based on live portal verification + direct codebase inspection)

## Executive Summary

v1.3 is an additive urban pilot, not a platform rebuild. The core insight across all four research dimensions is that the existing pipeline already covers Salt Lake County in every meaningful way: UGRC imports SLCo parcels statewide, Utah Legals scrapes SLCo NODs, and XChange covers SLCo courts. Yet every Rose Park property is invisible because "Salt Lake City" is not in `target_cities`. The fastest path to value is unlocking what is already in (or flowing into) the database: retag 84116 properties to `city = 'Rose Park'`, add that city to `target_cities`, and run a one-shot SQL migration. This surfaces existing leads at zero scraping cost and validates whether the signal volume justifies building the new scrapers.

The new scrapers are real work but well-bounded. `slco-delinquent.ts` follows the exact shape of `carbon-delinquent.ts` (Playwright + dynamic header map). The Utah Legals SLC addition is a one-line `TARGET_COUNTIES` change plus a checkbox index verification against the live DOM. The SLCo Recorder is the only genuinely hard piece: it is paywalled for bulk access and requires per-parcel auto-complete interaction, making it a post-pilot-validation phase. The architecture decision is clear: use `normalizeCity()` as the single normalization point in `upsert.ts`, never add a zip filter to `getProperties()`, and let `target_cities` remain the display gate.

The top three risks each have clear, low-cost mitigations that must be in place before any SLC data is written to production. Legal: never scrape `apps.saltlakecounty.gov/assessor` directly (explicit commercial-use ToS prohibition) -- use UGRC instead. Volumetric: SLCo has 350k parcels, so the UGRC query must filter to `ZIP_CODE='84116'` from the start or the Azure Function will time out. Data-quality: SLCo parcel IDs are all-numeric 10-digit, so the existing Carbon-format regex in `extractParcelId()` will fail silently, produce synthetic `ul-` IDs, and break signal stacking.

---

## Key Findings

### Recommended Stack

No new npm packages are required for v1.3. The existing `playwright`, `pdf-parse`, `cheerio`, `zod`, and native `fetch` cover every SLCo data source identified. The frontend requires zero new libraries: the retag approach means the existing `drizzle-orm` city filter, `next` server components, and `@base-ui/react` primitives handle Rose Park natively. The only conditional addition is `unzipper` (^0.12.x) if the Utah Courts tax lien ZIP source is pursued -- explicitly deferred to a future phase.

**Core technologies (all already present):**
- `playwright` ^1.50.0 — SLCo Auditor tax-sale page (JS-rendered table, same pattern as Carbon County)
- `drizzle-orm` ^0.45.1 — `WHERE city = 'Rose Park'` queries; no schema changes required
- UGRC ArcGIS FeatureServer via existing `import-ugrc-assessor.mjs` — SLCo parcel data, free, no ToS issues; add `ZIP_CODE='84116'` filter clause

**What NOT to add:**
- `arcgis-rest-js`, CAPTCHA solvers, stealth plugins, `axios`, `selenium`, or `puppeteer-extra` -- none are needed
- Paid SLCo CAMA database ($1,500) -- UGRC covers the same data for free
- Standalone `slco-recorder.ts` targeting `apps.saltlakecounty.gov/data-services` in Phase 1 -- recorder portal requires paid data units; use Utah Legals for NOD signals instead

### Expected Features

**Must have (table stakes):**
- UGRC assessor enrichment run for Salt Lake County with `ZIP_CODE='84116'` filter -- unlocks lat/lng, sqft, assessed value for all Rose Park parcels; every other feature depends on this running first
- `city = 'Rose Park'` retag at upsert time via `normalizeCity()` in `upsert.ts` -- the display gate that makes the existing city filter work
- `'Rose Park'` added to `target_cities` in `scraperConfig` -- one SQL UPDATE or Settings UI change
- One-shot SQL migration for any existing SLC properties stored as `'SALT LAKE CITY'`
- Salt Lake County added to `TARGET_COUNTIES` in `utah-legals.ts` (index ~17, verify against live DOM first)
- `slco-delinquent.ts` scraper -- Playwright against the SLCo Auditor tax-sale page; scheduled annually (April/May only, not daily)
- Distress score calibration dry-run after first data batch -- observe and tune, do not pre-emptively recalibrate
- `.limit(100)` raised or paginated in `getProperties()` before Rose Park data floods the dashboard

**Should have (differentiators, add after first data batch):**
- SLCo Recorder NOD/lis pendens scraper -- highest complexity; research portal structure before committing to Playwright
- Proximity-to-owner badge for Rose Park lead cards -- haversine distance from Brian homes; only meaningful for urban density
- Code violations via XChange -- activate when XChange subscription goes live; zero new code (SLC Third District already covered statewide)
- Map clustering -- low complexity, high usability impact in dense urban view; standard Mapbox supercluster pattern

**Defer to v1.4 or later:**
- Zillow/APIllow ARV integration (50 req/month free tier is too limited for meaningful use)
- Adjacent neighborhood expansion (Glendale, Poplar Grove) -- only after first Rose Park deal closes
- Saved filter presets for Rose Park hot leads
- Sub-zip polygon filtering for precise Rose Park boundary vs. Poplar Grove/Fair Park bleed

### Architecture Approach

The architecture decision is settled: retag `city = 'Rose Park'` for 84116 properties in `upsert.ts` rather than adding a zip filter dimension to `getProperties()`. This keeps the city field as the single unit of segmentation throughout the app, requires no changes to `queries.ts`, and makes future SLC neighborhood expansion a config change rather than a code change. A new `normalizeCity(city, zip)` function is added to `upsert.ts` as the single normalization point; all city remapping flows through it. SLCo gets its own Azure Function (`slcoScrape.ts`) following the `emeryScrape.ts` pattern so SLCo failures are isolated from the rural scrape pipeline.

**Major components:**

1. **`normalizeCity()` in `upsert.ts`** — single source of truth for zip-to-neighborhood mapping; future expansion (84104 to Glendale, etc.) is one line here
2. **`slcoScrape.ts` Azure Function** — timer-triggered orchestrator isolated from `dailyScrape.ts` so SLCo failures do not affect rural leads; runs `slco-delinquent.ts` and (later) `slco-recorder.ts`
3. **`target_cities` config in `scraperConfig`** — display gate; adding "Rose Park" here surfaces SLC leads; controlled via Settings UI without code changes

**Not touched:** `app/src/lib/queries.ts` filter functions (work unchanged once retag is in place, except raising `.limit(100)`), `app/src/db/schema.ts` (no schema changes), `scraper/src/scoring/score.ts` (city-agnostic; observe then tune).

### Critical Pitfalls

1. **SLCo Assessor ToS prohibits commercial use (SLC-1)** — Never automate `apps.saltlakecounty.gov/assessor`. Use UGRC ArcGIS `Parcels_Salt_Lake_LIR` instead. Medium legal/contractual risk if violated; zero cost to avoid by using the existing UGRC import pattern.

2. **UGRC without zip filter downloads 350k SLCo parcels and times out the Azure Function (SLC-2)** — Always add `ZIP_CODE='84116'` to the ArcGIS WHERE clause for the Salt Lake County entry. If the import log shows more than 10k records fetched, the filter is missing.

3. **SLCo parcel ID is all-numeric 10-digit; the existing Carbon regex fails silently (SLC-3)** — The `extractParcelId()` regex targets the Carbon hyphenated format. SLCo IDs appear as `21-08-207-018` or bare `2108207018`. Failure mode is silent: every SLC NOD produces a synthetic `ul-salt_lake-<address>` ID, dedup breaks, signals do not stack, scores stay at 1.

4. **Utah Legals SLC county returns NODs for all SLCo zip codes, not just 84116 (SLC-4)** — Add a zip allowlist filter after adding SLC to `TARGET_COUNTIES`. Without it, the first production run silently imports NODs for Sandy, Midvale, Holladay, and other zip codes.

5. **SLCo delinquent tax list is annual (April/May only), not rolling (SLC-10)** — The 2026 list publishes April 29. Build with annual-only cron schedule from day one. A daily schedule fires 300+ times per year with 0 results and triggers false health alerts for 10 months.

---

## Implications for Roadmap

Four phases are recommended. Order is driven by the dependency chain: UGRC data first (parcel IDs and lat/lng are inputs to everything else), then display unlock, then Utah Legals SLC activation, then the new delinquent scraper. The Recorder is a separate gated phase that requires a research session before any code is written.

### Phase 1: Foundation — Unlock Existing Data and Retag
**Rationale:** Free leads likely exist today as `city = 'SALT LAKE CITY'` rows from utah-legals statewide scrapes. The SQL migration and `target_cities` update surfaces them at zero scraping cost -- answering whether 84116 has signal volume before building any new scrapers.
**Delivers:** `normalizeCity()` in `upsert.ts`, SQL migration to retag existing SLC rows, "Rose Park" added to `target_cities`, `scoreAllProperties()` re-run, `.limit(100)` raised in `getProperties()`, UGRC enrichment run for SLC with `ZIP_CODE='84116'` filter, dashboard spot-check.
**Avoids:** SLC-2 (volume / Azure timeout), SLC-7 (scope creep beyond 84116), SLC-11 (silent filter exclusion)
**Research flag:** None — established patterns from v1.0-1.2. No research phase needed.

### Phase 2: Utah Legals SLC Activation
**Rationale:** Cheapest new NOD signal: one-line `TARGET_COUNTIES` change to an existing tested scraper. Requires Phase 1 complete (`normalizeCity` exists, parcel ID regex fixed, zip allowlist in place) before activating in production.
**Delivers:** Live DOM inspection to confirm SLC checkbox index, SLC entry in `TARGET_COUNTIES`, SLCo parcel ID regex in `extractParcelId()`, zip allowlist filter for 84116, UGRC normalizer dot-stripping fix if needed, test run verifying real parcel IDs (not synthetic) and 84116-only notices.
**Avoids:** SLC-3 (parcel ID format mismatch), SLC-4 (NOD scope bleed), SLC-5 (address grid dedup failure), SLC-9 (UGRC normalizer gap), SLC-12 (wrong checkbox index)
**Research flag:** None — DOM inspection and regex addition are 30-minute tasks, not a research phase.

### Phase 3: SLCo Delinquent Scraper
**Rationale:** Playwright scrape following `carbon-delinquent.ts` exactly. Timing-sensitive: the 2026 tax sale list publishes April 29 -- this phase must land before that date to capture 2026 sale data. After May the scraper goes dormant until next April.
**Delivers:** `scraper/src/sources/slco-delinquent.ts` (Playwright, dynamic header map, `DelinquentRecord[]` interface), `scraper/src/functions/slcoScrape.ts` (isolated Azure Function following `emeryScrape.ts` pattern), annual-only cron schedule (April/May only), post-run validation.
**Avoids:** SLC-10 (annual-only scheduling), SLC-13 (commercial/industrial parcel bleed via existing `hideEntities` filter)
**Research flag:** MEDIUM — tax sale list format (PDF vs. JS table) not confirmed until April 29. Inspect live before committing final parser.

### Phase 4: SLCo Recorder Scraper (Post-Pilot Validation)
**Rationale:** Highest complexity and highest uncertainty. Build only after Phases 1-3 confirm deal flow from Rose Park justifies the investment. If Utah Legals already surfaces SLC NODs (Phase 2), the marginal value is incremental. Portal may require paid data units ($5 per 150 units).
**Delivers:** Live portal investigation to confirm whether document-type date-range search is viable without per-parcel auto-complete; then (if viable) `slco-recorder.ts` with 2-3 second delays matching existing `rateLimitDelay()` pattern; or (if paid units required) explicit budget/skip decision.
**Avoids:** SLC-8 (ToS checkbox + auto-complete session fragility), SLC-1 (commercial-use ToS exposure)
**Research flag:** HIGH — use `/gsd:research-phase` before planning this phase. No code before research confirms the portal approach is viable.

### Scoring Calibration (Cross-Phase Observation Task, Not a Standalone Phase)

After Phase 2 or 3 produces 20-30 Rose Park properties with signals, run a score distribution query. Key risk (SLC-6): NOD-only SLC properties score 3 (warm) with the current `hot_lead_threshold` of 4. In high-equity urban markets some homeowners are in foreclosure without a co-occurring tax lien -- producing zero hot leads despite active NOD signals. If the distribution shows a cliff at score 3 with nothing above, lower `hot_lead_threshold` from 4 to 3 via `scraperConfig` update (config change, not code). Do not pre-tune -- observe actual distribution first.

### Phase Ordering Rationale

- Phase 1 before Phase 2: `normalizeCity()` must exist before Utah Legals SLC writes city values; SQL migration must run before `target_cities` update, or dashboard shows zero leads even with data present
- Phase 2 before Phase 3: Parcel ID extraction fix in Phase 2 prevents `slco-delinquent.ts` signals from creating duplicate ghost rows via address-match fallback
- Phase 3 is timing-sensitive: April 29, 2026 is the deadline to land Phase 3 for the 2026 sale data window
- Phase 4 is gated on pilot validation: validate deal flow from Phases 1-3 before investing in the hardest and most uncertain piece

### Research Flags

Phases needing deeper research before implementation:
- **Phase 4 (Recorder scraper):** Portal structure uncertain; ToS status of automated date-range search unconfirmed. Use `/gsd:research-phase` -- no code before research completes.
- **Phase 3 (Delinquent scraper) -- partial:** Tax sale list format not confirmed until April 29. Inspect live before finalizing parser.

Phases with confirmed patterns (no research phase needed):
- **Phase 1:** Config changes, SQL migrations, existing-script modifications -- same pattern as the 2026-04-07 address correction (2,331 properties retagged successfully)
- **Phase 2:** DOM inspection + additive regex change -- 30-minute tasks, not a research engagement

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All source URLs verified live; codebase read directly; no new packages needed confirmed |
| Features | HIGH | SLC portal capabilities confirmed against official county pages; feature dependencies mapped from code inspection |
| Architecture | HIGH | Based on direct code inspection of `upsert.ts`, `queries.ts`, `utah-legals.ts`, `carbon-delinquent.ts`; all proposed changes are additive |
| Pitfalls | MEDIUM-HIGH | ToS text confirmed (HIGH); portal behavior confirmed for auditor and UGRC (HIGH); parcel ID format inferred from URL parameter not official spec (MEDIUM); recorder date-range search viability unconfirmed (MEDIUM) |

**Overall confidence:** HIGH for Phases 1-2; MEDIUM for Phase 3 (April 29 format dependency); MEDIUM-LOW for Phase 4 (portal structure uncertain)

### Gaps to Address

- **SLCo parcel ID format:** No official spec found -- inferred from URL parameter `parcel_ID=2818207018`. Resolve by inspecting 10 SLC NOD notice texts from Utah Legals before writing the `extractParcelId()` regex. (30-minute task, Phase 2.)
- **UGRC LIR `ZIP_CODE` field existence:** Must confirm the field exists in the ArcGIS service before adding the filter clause. Run a 1-record sample query against the REST endpoint. (5-minute task, Phase 1.)
- **Utah Legals SLC checkbox index:** Expected index 17 based on alphabetical county ordering -- verify against live DOM before hardcoding. (5-minute task, Phase 2.)
- **SLCo delinquent list format (2026):** Not confirmed until April 29, 2026. Inspect the published list and adapt parser accordingly.
- **SLCo Recorder date-range search viability:** Unconfirmed -- gates Phase 4 planning. Manual portal test session required before any Phase 4 estimation.
- **Urban scoring threshold:** NOD-only SLC properties may score 3 with current threshold of 4, producing zero Rose Park hot leads despite active NODs. Observe score distribution after 2 weeks; adjust `hot_lead_threshold` via `scraperConfig` if needed (config change, not code).

---

## Sources

### Primary (HIGH confidence)

- `apps.saltlakecounty.gov/auditor/tax-sale/` — Tax sale list confirmed JS-rendered, no CAPTCHA, annual publication before May tax sale
- `apps.saltlakecounty.gov/assessor/new/query/intropage.cfm` — Commercial-use ToS prohibition text confirmed directly
- `apps.saltlakecounty.gov/data-services/PropertyWatch/DocumentTypes.aspx` — NT DF, LIS PN, N SALE, TRS D document types confirmed
- `saltlakecounty.gov/recorder/data-services/` — Paid tiers $5/$300/$6,000 confirmed; free tier is parcel lookup only
- `opendata.gis.utah.gov/datasets/utah-salt-lake-county-parcels-lir` — UGRC LIR service for SLC confirmed (same API as rural counties)
- `legacy.utcourts.gov/liens/tax/` — Statewide tax lien ZIP files, free, updated Tuesdays
- `www.utcourts.gov/en/court-records-publications/records/xchange/subscribe.html` — XChange $40/mo statewide including Third District (SLC)
- HouseFinder codebase (direct read): `scraper/src/sources/carbon-delinquent.ts`, `utah-legals.ts`, `scraper/src/lib/upsert.ts`, `app/src/lib/queries.ts`, `app/src/lib/actions.ts`, `app/src/db/schema.ts`, `app/src/scripts/import-ugrc-assessor.mjs`

### Secondary (MEDIUM confidence)

- Redfin Rose Park housing market — median $430K, 54 DOM (March 2026)
- NeighborhoodScout Rose Park profile — 43% Hispanic, 40% renter-occupied, lower-middle-income demographics
- `unitedstateszipcodes.org/84116/` — 84116 covers Rose Park plus a strip of North Salt Lake (84054 bleed confirmed)
- `gis.utah.gov/products/sgid/location/address-system-quadrants/` — UGRC official SLC grid address system documentation
- `apps.saltlakecounty.gov/robots.txt` — No broad Disallow rules for scraper user agents confirmed

### Tertiary (LOW confidence -- require validation during implementation)

- SLCo parcel ID 10-digit all-numeric format — inferred from URL parameter `parcel_ID=2818207018`; no authoritative spec; must verify against real NOD notice text before writing the `extractParcelId()` regex
- Utah Legals SLC checkbox index 17 — inferred from alphabetical county list ordering; must verify against live DOM before hardcoding
- SLCo Recorder date-range search without per-parcel auto-complete — possible based on portal structure description; not tested in a live session; gates Phase 4 planning

---

*Research completed: 2026-04-17*
*Ready for roadmap: yes*