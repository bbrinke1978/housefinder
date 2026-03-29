# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses
**Current focus:** Phase 6 — Data Analytics & Insights

## Current Position

Phase: 6 of 10 (Data Analytics & Insights)
Plan: 4 of 4 in current phase
Status: Complete
Last activity: 2026-03-29 — Completed 06-04 (Activity log timeline + CSV export route, all 6 analytics tabs complete)

Progress: [██████░░░░] 60%

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: 3min
- Total execution time: 0.90 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-data-foundation | 4/4 | 8min | 2min |
| 02-core-application | 5/5 | 23min | 5min |
| 03-contact-and-alerts | 3/3 | 8min | 3min |
| 04-county-expansion | 3/3 | 9min | 3min |
| 05-map-view | 3/3 | 10min | 3min |
| 06-data-analytics-insights | 4/4 | 6min | 1.5min |
| 08-wholesaling-deal-flow | 4/5 | 20min | 5min |

**Recent Trend:**
- Last 5 plans: 3min, 3min, 3min, 5min, 2min
- Trend: stable

*Updated after each plan completion*
| Phase 05 P01 | 3min | 2 tasks | 6 files |
| Phase 05 P02 | 5min | 2 tasks | 8 files |
| Phase 05 P03 | 2min | 2 tasks | 2 files |
| Phase 08 P01 | 3min | 2 tasks | 7 files |
| Phase 08-wholesaling-deal-flow P03 | 7min | 2 tasks | 7 files |
| Phase 08-wholesaling-deal-flow P04 | 3min | 2 tasks | 8 files |
| Phase 06-data-analytics-insights P01 | 4min | 2 tasks | 7 files |
| Phase 06-data-analytics-insights P04 | 2min | 2 tasks | 5 files |
| Phase 06-data-analytics-insights P02 | 7 | 2 tasks | 5 files |

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
- [Phase 05-01]: Mapbox GL JS via react-map-gl v8 -- requires /mapbox subpath import
- [Phase 05-01]: lat/lng as nullable doublePrecision columns -- properties without coords excluded from map
- [Phase 05-02]: MapWrapper client component for dynamic({ ssr: false }) -- Next.js 15 server component restriction
- [Phase 05-02]: Satellite-streets-v12 map style per user decision (satellite hybrid)
- [Phase 05-02]: Client-side GeoJSON filtering -- no server roundtrip for filter changes
- [Phase 05-03]: Batch geocoding script with 50-property batches and 1s delay for rate limiting
- [Phase 08-01]: text for deal status field (not pgEnum) — 10 statuses unwieldy as Postgres enum; zod/v4 validation in server actions
- [Phase 08-01]: nullable propertyId FK on deals with no onDelete cascade — standalone deals not linked to scraped properties
- [Phase 08-01]: no drizzle relations() on deal tables — consistent with existing direct join pattern
- [Phase 08-03]: updateDeal called from client components via FormData — consistent with existing updateDeal signature
- [Phase 08-03]: Contract stepper: clicking any step sets contractStatus directly — wholesaler may need to jump steps
- [Phase 08-03]: MAO formula: ARV * 0.70 - repairs - wholesaleFee pure client-side, no DB roundtrip for computation
- [Phase 08-04]: Buyer soft-delete only (isActive = false) — preserves deal assignment history
- [Phase 08-04]: getMatchingBuyers: null min/max treated as open (no restriction) — buyers without price set match all deals
- [Phase 08-04]: Deal blast disabled state (not hidden) pre-under_contract — communicates next step to user
- [Phase 08-04]: Start Deal as styled link not Button — secondary role doesn't compete with existing lead management CTAs
- [Phase 06-01]: recharts requires react-is@19.1.0 overrides in package.json for React 19 blank-chart fix
- [Phase 06-01]: callLogs uses pgEnum callOutcomeEnum (answered/voicemail/no_answer/wrong_number) for type safety
- [Phase 06-01]: Analytics replaces Settings in mobile bottom-nav — Settings still accessible from desktop sidebar
- [Phase 06-01]: Per-tab data fetching on /analytics — only active tab queries run, not all tabs on every load
- [Phase 06-01]: HealthStatus (green/yellow/red) computed in TypeScript from scraper_health rows
- [Phase 06-04]: Export buttons use <a href download> anchor tags — native browser download, no JS required
- [Phase 06-04]: buildCsv uses JSON.stringify per cell to safely handle commas, quotes, and newlines in CSV values
- [Phase 06-04]: ActivityLog "use client" for date-fns format — data passed from server page as prop
- [Phase 06-02]: Custom Tooltip components used for all charts to show domain-specific context (avgDaysInStage, conversionRate, deal counts)
- [Phase 06-02]: Attribution chart uses horizontal BarChart (layout=vertical) for readability of signal type labels
- [Phase 06-02]: Trends chart transforms flat TrendPoint[] to week-keyed rows with one key per city for recharts multi-line

### Roadmap Evolution

- Phase 7 added: Frontend Design Polish
- Phase 8 added: Wholesaling Deal Flow

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Carbon County recorder site HTML structure is unverified (LOW confidence) — manually inspect carbon.utah.gov before writing selectors
- [Phase 4]: All remaining county portals unverified — some (Emery, Juab) may have no online portal and require GRAMA requests instead
- [Phase 5]: Utah voter roll permissible-use terms for commercial real estate unconfirmed — validate before building contact enrichment pipeline
- [Phase 5]: Geocoding approach not yet selected — evaluate Census Geocoder, Nominatim, or county GIS data at Phase 5 planning

## Session Continuity


Last session: 2026-03-29
Stopped at: Completed 06-04-PLAN.md (Phase 6 Plan 4 — Activity log timeline + CSV export, all 6 analytics tabs complete)
Resume file: .planning/phases/06-data-analytics-insights/06-04-SUMMARY.md
