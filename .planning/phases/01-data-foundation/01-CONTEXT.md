# Phase 1: Data Foundation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the scraping pipeline, database schema, and distress scoring engine for Carbon County (Price, UT). This is the entire data backbone: county record scrapers, a PostgreSQL database storing properties and distress signals, a scoring engine that flags hot leads, and Azure Functions running daily on a timer. No UI in this phase — just the data pipeline working end-to-end.

</domain>

<decisions>
## Implementation Decisions

### Scraper Behavior
- Gentle rate limiting: 1-2 second delay between requests to county sites
- Claude's discretion on failure handling (alert + pause vs alert + continue) — pick best approach for reliability
- Claude's discretion on handling counties without online records (skip silently vs show as 'limited')
- Claude's discretion on logging level (detailed vs summary) — pick right level of observability

### Data Freshness
- Historical signals preserved: when a distress signal resolves (e.g., tax paid), mark it as "resolved" but keep the record — history is valuable
- Daily scrape runs at 5-6 AM Mountain Time — data ready when user wakes up
- Tiered new-lead indicators: "New" badge on discovery, escalates to "Unreviewed" if not viewed within 48 hours — prevents stale new leads from getting buried
- Claude's discretion on handling properties past their auction date (keep active vs archive)

### Distress Scoring
- Claude's discretion on signal weighting (equal vs weighted by urgency) — design based on real estate investment patterns
- Claude's discretion on hot lead threshold logic (count-only vs count + timeline urgency)
- Scoring rules must be configurable via settings — user wants to adjust weights and thresholds without code changes
- Score display: label + number + color coding (e.g., "Hot Lead 3" in red, "Distressed 1" in yellow)

### Azure Setup
- Mirror run4luv infrastructure pattern: App Service + PostgreSQL Flexible Server + GitHub Actions CI/CD
- Resource group: `rg-housefinder` in West US 3
- Production environment only (single user, no dev/prod split)
- Database: B1ms PostgreSQL Flexible Server (~$13/mo, always on)
- Scraper: Azure Functions with timer trigger (cron schedule, 5 AM MT daily)
- CI/CD from day one: GitHub Actions pipeline, push to main = auto deploy

### Claude's Discretion
- Scraper failure handling strategy (alert + pause vs retry + continue)
- County availability handling in the UI/data model
- Logging verbosity and observability approach
- Signal weighting algorithm and hot lead threshold formula
- Post-auction property lifecycle management
- Exact Azure Function plan/tier selection
- Database schema design details (table structure, indexes, constraints)

</decisions>

<specifics>
## Specific Ideas

- Pattern after run4luv's Azure infrastructure (github.com/bbrinke1978/run4luv) — same App Service + PostgreSQL + GitHub Actions CI/CD setup
- Start with Carbon County (Price, UT) only — prove the pipeline end-to-end before expanding to other counties in Phase 4
- Scraper health check: surface last successful run time, alert after 3 consecutive zero-result runs
- Utah is a trust deed state — NODs give ~90 day window before auction. This informs urgency scoring.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-data-foundation*
*Context gathered: 2026-03-17*
