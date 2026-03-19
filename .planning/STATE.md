# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses
**Current focus:** Phase 4 — County Expansion

## Current Position

Phase: 4 of 5 (County Expansion)
Plan: 3 of 3 in current phase
Status: Phase Complete
Last activity: 2026-03-18 — Completed 04-03 (PDF County Scrapers)

Progress: [██████████] 93%

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: 3min
- Total execution time: 0.73 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 4/4 | 8min | 2min |
| 02-core-application | 5/5 | 23min | 5min |
| 03-contact-and-alerts | 3/3 | 8min | 3min |
| 04-county-expansion | 3/3 | 9min | 3min |

**Recent Trend:**
- Last 5 plans: 2min, 4min, 3min, 3min, 3min
- Trend: stable

*Updated after each plan completion*
| Phase 04 P01 | 5min | 2 tasks | 8 files |
| Phase 04 P02 | 3min | 2 tasks | 3 files |
| Phase 04 P03 | 3min | 2 tasks | 5 files |

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
- [02-05]: force-dynamic export on settings page to prevent build-time DB queries
- [02-05]: Target cities stored as JSON array in scraperConfig key-value table
- [02-05]: Azure App Service deployment via standalone output with static asset copy step
- [03-01]: Alert config keys use same scraperConfig table with onConflictDoNothing for idempotent seeding
- [03-01]: ownerContacts unique on (propertyId, source) to allow multiple sources per property without duplicates
- [03-02]: Email digest sent as function call not JSX -- avoids .tsx requirement in orchestrator
- [03-02]: SMS to: always from ALERT_PHONE_NUMBER env var, never from owner_contacts table (TCPA compliance)
- [03-02]: Alert config defaults (email threshold 2, SMS threshold 3) tunable via scraperConfig table
- [03-03]: FastPeopleSearch as second people-search link for individuals (not Utah Business Registry which is for entities)
- [03-03]: Native checkbox inputs for alert toggles (no shadcn Switch component installed)
- [03-03]: onConflictDoUpdate on (propertyId, source) for manual phone upserts
- [04-02]: Native checkbox for vacant toggle (consistent with 03-03 pattern)
- [04-02]: onConflictDoNothing for signal dedup via existing uq_distress_signal_dedup index
- [04-02]: Duplicate active signal check done client-side from signals prop (no extra query)
- [Phase 04-01]: pdf-parse v2 class-based API (PDFParse.getText().text) -- @types/pdf-parse incompatible with v2, removed
- [Phase 04-01]: County param defaults to 'carbon' for backward compatibility -- existing Carbon pipeline unchanged
- [Phase 04-01]: Annual PDF parse tracked via scraperConfig key emery.delinquent.lastParsedYear
- [Phase 04-03]: Factory pattern for PDF parser -- PdfCountyConfig type with per-county line parser, URL, and text pattern
- [Phase 04-03]: Generic line parser matches parcel pattern XX-XXXX-XXXX at line start with dollar amount extraction
- [Phase 04-03]: Inline annual skip logic per handler (simpler than shared helper for 4 small files)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Carbon County recorder site HTML structure is unverified (LOW confidence) — manually inspect carbon.utah.gov before writing selectors
- [Phase 4]: All remaining county portals unverified — some (Emery, Juab) may have no online portal and require GRAMA requests instead
- [Phase 5]: Utah voter roll permissible-use terms for commercial real estate unconfirmed — validate before building contact enrichment pipeline
- [Phase 5]: Geocoding approach not yet selected — evaluate Census Geocoder, Nominatim, or county GIS data at Phase 5 planning

## Session Continuity


Last session: 2026-03-18
Stopped at: Completed 04-03-PLAN.md (Phase 4 complete)
Resume file: .planning/phases/04-county-expansion/04-03-SUMMARY.md
