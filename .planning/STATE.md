# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses
**Current focus:** Phase 2 — Core Application

## Current Position

Phase: 2 of 5 (Core Application)
Plan: 4 of 5 in current phase
Status: Plan Complete
Last activity: 2026-03-18 — Completed 02-04 (Lead Pipeline)

Progress: [██████░░░░] 50%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 4min
- Total execution time: 0.48 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 4/4 | 8min | 2min |
| 02-core-application | 4/5 | 21min | 5min |

**Recent Trend:**
- Last 5 plans: 2min, 6min, 4min, 5min, 6min
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Azure PostgreSQL Flexible Server (B1ms) — always on, mirrors run4luv pattern
- [Init]: Azure Functions with timer trigger for daily scraping (5 AM MT) — no timeout issues unlike Netlify
- [Init]: Azure App Service + GitHub Actions CI/CD from day one — same pattern as run4luv
- [Init]: Resource group `rg-housefinder` in West US 3, production only
- [Init]: Parcel number (APN) is canonical deduplication key across all county data sources
- [Init]: Distress signals stored as individual rows in distress_signals table, not boolean columns — allows new signal types without schema migrations
- [Init]: SMS and email alerts go to the authenticated app user only — never to homeowner phone numbers (TCPA violation post-Jan 2025)
- [Init]: Probate detection via Utah XChange requires paid subscription — treat as manual-entry-only for MVP, revisit at Phase 4 planning
- [Init]: Alert order must be: scraper built → scoring validated → alerts enabled
- [Context]: Historical distress signals preserved as "resolved" — never deleted
- [Context]: Scoring rules configurable via settings (weights + thresholds)
- [Context]: Tiered new-lead indicators: "New" → "Unreviewed" after 48h if not viewed
- [01-01]: ESM with Node16 module resolution -- .js extensions required in imports
- [01-01]: Pool max 3 connections with 5s connect timeout for Azure PostgreSQL B1ms
- [01-01]: Playwright Chromium installed in CI and deployed with package
- [01-02]: Recorder approach: option-a placeholder (no confirmed online portal for Carbon County recorder)
- [01-02]: Dynamic column mapping by header text for wpDataTables scraper resilience
- [01-02]: Random 1-2s rate limiting between paginated scraper requests
- [01-03]: Pure/orchestrator separation -- scoreProperty() pure function, scoreAllProperties() DB orchestrator
- [01-03]: Signals with null recorded_date assumed recent and included in scoring
- [01-03]: Unknown signal types silently skipped to allow gradual config expansion
- [01-04]: Each scraper runs in independent try/catch for partial failure tolerance
- [01-04]: runOnStartup: false to prevent Azure scale-out event firing
- [01-04]: Health alert threshold at 3 consecutive zero-result runs
- [02-01]: shadcn v4 uses render prop instead of asChild -- all components adapted accordingly
- [02-01]: Drizzle migration not run locally -- to be applied via drizzle-kit migrate on deployment
- [02-01]: Next.js 15 with Turbopack, output: standalone for Azure deployment
- [02-02]: URL searchParams for filter state -- bookmarkable, SSR-compatible
- [02-02]: count(*) filter (where ...) pattern for dashboard stats -- single query for all 4 metrics
- [02-02]: exists subquery for distress type filter -- correct for many-to-many signal relationship
- [02-03]: Added leadId to PropertyWithLead type and getPropertyDetail query -- needed for notes tab
- [02-03]: useOptimistic for immediate note display before server response
- [02-03]: Integrated VoiceNoteInput from Plan 02-04 into notes tab
- [02-04]: PipelineLead type extends PropertyWithLead with propertyId -- pipeline uses lead.id as primary id
- [02-04]: Voice input gracefully degrades in non-Chrome browsers -- disabled button with tooltip
- [02-04]: Status change auto-logged as note, optional user note for quick pipeline management

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Carbon County recorder site HTML structure is unverified (LOW confidence) — manually inspect carbon.utah.gov before writing selectors
- [Phase 4]: All remaining county portals unverified — some (Emery, Juab) may have no online portal and require GRAMA requests instead
- [Phase 5]: Utah voter roll permissible-use terms for commercial real estate unconfirmed — validate before building contact enrichment pipeline
- [Phase 5]: Geocoding approach not yet selected — evaluate Census Geocoder, Nominatim, or county GIS data at Phase 5 planning

## Session Continuity

Last session: 2026-03-18
Stopped at: Completed 02-04-PLAN.md
Resume file: .planning/phases/02-core-application/02-04-SUMMARY.md
