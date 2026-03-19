# Phase 4: County Expansion - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand scraping from Carbon County (Price, UT) to ~10 small Utah cities with similar demographics. Add probate/estate detection via Utah XChange court records (paid subscription ~$30-40/yr). Add vacant/neglected detection from code violations where available plus manual flagging. Each new county gets its own independent scraper with staggered scheduling.

Does NOT include: map view (Phase 5), new dashboard features, new alert types.

</domain>

<decisions>
## Implementation Decisions

### City Selection Criteria
- Target ~10 cities similar to Price, UT: population 5,000-15,000, rural character (not SLC/Provo suburbs), low investor competition
- Within ~2.5 hours of SLC — if not enough listings, expand later
- Can include cities in Carbon County (same county as Price is OK)
- Research should identify the specific cities — user will approve the list
- Only include cities whose county has online property records — skip counties with no online data

### Scraper Approach
- Each county scraper runs independently (own try/catch — one failure doesn't stop others)
- Stagger county scrapes across the morning (5:00, 5:15, 5:30...) — less load, less likely to get blocked
- Skip counties that have no online property records — don't waste effort on manual-only counties
- Each county may need a custom scraper (different HTML structure per portal)

### Probate Detection
- Pay for Utah XChange court system subscription (~$30-40/year) — one subscription covers all Utah courts
- Automate probate lead detection: scrape estate/probate filings, match to property addresses
- Probate becomes a new distress signal type feeding into the existing scoring engine

### Vacant/Neglected Detection
- Claude's discretion on which cities have online code violation data — best effort, skip where unavailable
- Manual "vacant" signal: user can flag a property as vacant from the property detail page (e.g., from driving by)
- Both automated (where available) + manual flagging for field observations
- Vacant/code_violation as new distress signal types in the scoring engine

### Claude's Discretion
- Which specific ~10 cities to recommend (within criteria above)
- Which county portals are scrapeable vs not
- Vacant data source assessment per city
- Exact stagger timing between county scrapes
- How to handle XChange court data parsing (probate filing → property address matching)

</decisions>

<specifics>
## Specific Ideas

- User clarified: 10 CITIES not 10 counties — several cities may share a county, simplifying scraper work
- Within 2.5 hours of SLC as geographic boundary
- Price demographics: ~8,500 population, Carbon County, rural coal/mining town character
- Each county's scraper health shows independently on the scraper health dashboard (from Phase 1)
- Probate is a new concept for this user — he's willing to pay $30-40/yr to find out if probate leads have value

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-county-expansion*
*Context gathered: 2026-03-18*
