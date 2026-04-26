# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-17)

**Core value:** Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses
**Current focus:** Milestone v1.3 — Rose Park Pilot (urban expansion, zip 84116). Mid-milestone re-org: Phase 25.5 inserted, Phase 26 re-scoped.

## Current Position

Phase: 25.5 — Utah Legals SLC Activation (next to plan)
Plan: —
Status: Re-org complete after Phase 26 hit two false research assumptions; ready for `/gsd:plan-phase 25.5`
Last activity: 2026-04-26 — Phase 26 attempted, found UGRC Parcels_SaltLake_LIR has no zip field and is enrichment-only (cannot create rows). Cleaned 404 misclassified Emery rows (city='SALT LAKE CITY'). Pulled RP-FW-01 forward as Phase 25.5 (RP-09/RP-10/RP-11). Phase 26 re-scoped to depend on 25.5 (UGRC enrichment by parcel_id JOIN, no zip filter).

Progress: Phase 25 ✓ | Phase 25.5 next | Phase 26 re-scoped | Phase 27 pending

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
| Phase 06-data-analytics-insights P03 | 4min | 2 tasks | 6 files |
| Phase 09-admin-budgeting-cost-analysis P01 | 2min | 2 tasks | 4 files |
| Phase 09-admin-budgeting-cost-analysis P02 | 2 | 2 tasks | 5 files |
| Phase 09-admin-budgeting-cost-analysis P03 | 5min | 2 tasks | 6 files |
| Phase 09-admin-budgeting-cost-analysis P04 | 2min | 2 tasks | 4 files |
| Phase 11-housefinder-ui-revamp P01 | 5min | 2 tasks | 11 files |
| Phase 11-housefinder-ui-revamp P04 | 8min | 2 tasks | 11 files |
| Phase 11-housefinder-ui-revamp P02 | 5min | 2 tasks | 5 files |
| Phase 11-housefinder-ui-revamp P05 | 5min | 1 tasks | 3 files |
| Phase 12-email-call-campaigns P01 | 8min | 2 tasks | 7 files |
| Phase 12-email-call-campaigns P02 | 5min | 2 tasks | 10 files |
| Phase 12-email-call-campaigns P03 | 7 | 2 tasks | 12 files |
| Phase 12-email-call-campaigns P04 | 6 | 2 tasks | 12 files |
| Phase 12-email-call-campaigns P05 | 3min | 1 tasks | 6 files |
| Phase 13-contract-e-signature P01 | 6min | 2 tasks | 10 files |
| Phase 13-contract-e-signature P03 | 2min | 2 tasks | 5 files |
| Phase 13-contract-e-signature P02 | 3min | 2 tasks | 8 files |
| Phase 13-contract-e-signature P04 | 2min | 2 tasks | 3 files |
| Phase 14-mobile-photo-capture P01 | 3min | 2 tasks | 5 files |
| Phase 14-mobile-photo-capture P02 | 4min | 2 tasks | 7 files |
| Phase 14-mobile-photo-capture P03 | 4min | 2 tasks | 11 files |
| Phase 15-blueprints-floor-plans P01 | 3min | 2 tasks | 6 files |
| Phase 15-blueprints-floor-plans P02 | 6min | 2 tasks | 8 files |
| Phase 15-blueprints-floor-plans P03 | 7min | 2 tasks | 7 files |
| Phase 15-blueprints-floor-plans P04 | 3min | 2 tasks | 6 files |
| Phase 16-buyers-list-crm P01 | 3min | 2 tasks | 5 files |
| Phase 16-buyers-list-crm P02 | 3min | 2 tasks | 7 files |
| Phase 16-buyers-list-crm P03 | 5min | 2 tasks | 4 files |
| Phase 16-buyers-list-crm P05 | 1min | 1 tasks | 2 files |
| Phase 16-buyers-list-crm P04 | 4min | 2 tasks | 5 files |
| Phase 17-netlify-migration-design-system P01 | 4min | 2 tasks | 3 files |
| Phase 17-netlify-migration-design-system P02 | 2 | 2 tasks | 2 files |
| Phase 17-netlify-migration-design-system P04 | 2 | 2 tasks | 4 files |
| Phase 18-tracerfy-options P01 | 3min | 2 tasks | 2 files |
| Phase 18-tracerfy-options P03 | 3min | 2 tasks | 5 files |
| Phase 18-tracerfy-options P02 | 5min | 2 tasks | 10 files |
| Phase 19-wholesale-leads P01 | 6min | 2 tasks | 7 files |
| Phase 19-wholesale-leads P02 | 6min | 2 tasks | 6 files |
| Phase 19-wholesale-leads P03 | 8min | 2 tasks | 8 files |
| Phase 19-wholesale-leads P04 | 4min | 2 tasks | 11 files |
| Phase 19 P04 | 4min | 2 tasks | 11 files |
| Phase 20-security-review P01 | 8min | 2 tasks | 8 files |
| Phase 20-security-review P02 | 6min | 1 tasks | 4 files |
| Phase 20-security-review P03 | 12min | 2 tasks | 4 files |
| Phase 21-ugrc-assessor-enrichment P01 | 7min | 2 tasks | 1 files |
| Phase 21-ugrc-assessor-enrichment P02 | 40min | 1 tasks | 0 files |
| Phase 22-xchange-court-record-intake P01 | 5 | 2 tasks | 3 files |
| Phase 22-xchange-court-record-intake P02 | 15 | 2 tasks | 2 files |
| Phase 24-advanced-mao-calculator P01 | 4min | 2 tasks | 1 files |
| Phase 25-rose-park-foundation P01 | 2min | 2 tasks | 4 files |
| Phase 25-rose-park-foundation P02 | 4min | 2 tasks | 3 files |
| Phase 25.5-utah-legals-slc-activation P01 | 2min | 2 tasks | 3 files |

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
- [Phase 06-data-analytics-insights]: useActionState<LogCallResult|null,FormData> for call log form — consistent with React 19 form action pattern
- [Phase 06-data-analytics-insights]: logCall returns union {success:true}|{error:string} not throw — graceful client-side feedback
- [Phase 09-admin-budgeting-cost-analysis]: ExpenseLine interface in types/index.ts (not ExpenseRow) to avoid collision with schema InferSelectModel export
- [Phase 09-admin-budgeting-cost-analysis]: createBudget seeds 19 DEFAULT_BUDGET_CATEGORIES, auto-populates from deal.repairEstimate, computes 10% contingencyCents
- [Phase 09-admin-budgeting-cost-analysis]: actualCents computed via COALESCE(SUM(expenses.amount_cents), 0) on read — no denormalized column in budget_categories
- [Phase 09-admin-budgeting-cost-analysis]: analyzeReceipt wraps OCR in try/catch, returns all nulls on error — never blocks expense creation
- [Phase 09-admin-budgeting-cost-analysis]: SAS URL parsed from single AZURE_STORAGE_CONNECTION_STRING (AccountName + AccountKey) — no extra credential env vars
- [Phase 09-admin-budgeting-cost-analysis]: resizeImage client-side canvas resize before upload: max 1920px, JPEG 0.8 — reduces 5MB phone photo to ~400KB
- [Phase 09-02]: Budget data fetched at page level and passed as props — no client-side fetching, consistent with deal detail pattern
- [Phase 09-02]: Contingency warning triggers when totalSpentCents > totalPlannedCents (excl contingency) — visually distinguishes planned overage from contingency use
- [Phase 09-admin-budgeting-cost-analysis]: BudgetAlertBanner returns null below 80%; orange at over planned, red at over planned+contingency
- [Phase 09-admin-budgeting-cost-analysis]: Budget CSV export includes Contingency and TOTAL rows; filename uses deal address slug
- [Phase 11-housefinder-ui-revamp]: Violet accent selected over terracotta — matches Linear/Raycast tool aesthetic
- [Phase 11-housefinder-ui-revamp]: Inter via next/font replaces Bebas Neue+Oswald+Nunito Sans — single variable font, dark defaultTheme
- [Phase 11-housefinder-ui-revamp]: Login hero replaced with CSS gradient panel — no Unsplash network request, cleaner mobile
- [Phase 11-housefinder-ui-revamp]: text-primary replaces all text-blue-* link colors in detail pages — violet matches new brand accent
- [Phase 11-housefinder-ui-revamp]: bg-primary/5 + border-primary/20 replaces blue tinted info boxes — works in both modes without dark: variants
- [Phase 11-housefinder-ui-revamp]: Mobile filter drawer uses controlled state with plain button (not SheetTrigger) to avoid base-ui asChild composition pitfall
- [Phase 11-05]: CommandMenu built on @base-ui/react/dialog directly (no cmdk/Radix) — project uses @base-ui/react exclusively; custom activeIndex state provides identical keyboard UX
- [Phase 12-01]: DEFAULT_SEQUENCE_DELAY_DAYS [1,3,7,14,30] mirrors Brian's Day 1/3/7/14/30 call cadence from CONTEXT.md update
- [Phase 12-01]: CALL_SCRIPTS TypeScript constant has 5 pre-built scripts (Acquisitions, Dispositions, Agent Partnership, JV Partner, Objection Handling) with {senderName}/{city}/{address} merge fields
- [Phase 12-01]: contactEventTypeEnum pgEnum for DB-level type safety; campaignEnrollments.stopReason text for auto-stop triggers (deal_closed/unenrolled/completed/email_bounced/re_enrolled)
- [Phase 12-01]: MAIL_SETTINGS_KEYS maps TS keys to scraperConfig DB keys (mail.fromName, mail.resendApiKey, etc) — extends existing key-value config pattern
- [Phase 12-02]: logContactEvent accepts (_prevState, formData) signature for useActionState — consistent with React 19 form action pattern established in Phase 06
- [Phase 12-02]: getLeadTimeline uses parallel fetch + client-side merge/sort (not SQL UNION) — easier to extend with future event types
- [Phase 12-02]: getProperties enriches touchpointCount via post-query inArray groupBy — single extra query for all cards, not N+1 subqueries
- [Phase 12-02]: CallScriptModal uses Dialog.Close directly without asChild — @base-ui/react does not support asChild on Close unlike Radix
- [Phase 12-02]: CALL_SCRIPTS merge fields resolved client-side from props — no scraperConfig DB fetch at call time since scripts are constants
- [Phase 12-email-call-campaigns]: fetchSequenceForEdit as server action prevents pg/net/tls bundling into client components
- [Phase 12-email-call-campaigns]: useTransition for campaign server actions — actions use (formData) signature not (prevState, formData)
- [Phase 12-email-call-campaigns]: MAILING: prefix filter required in enrollLeadInSequence — ownerContacts email column stores both real emails and mailing addresses with MAILING: prefix
- [Phase 12-email-call-campaigns]: logContactEvent after email send is non-fatal — enrollment not rolled back if timeline event fails
- [Phase 12-05]: scraper schema.ts extended with 7 campaign tables — separate from app schema, must stay in sync when app schema changes
- [Phase 12-05]: nextStepNumber = currentStep + 2 in dispatch — 0-based currentStep + 1-indexed stepNumber offset; dispatch sends stepNumber = currentStep + 2
- [Phase 12-05]: campaignDispatch Resend send uses text: not react: — scraper has no JSX compilation; plain text + appended signature used instead of react-email component
- [Phase 13-01]: advanceContractStatus uses db.execute(sql) for NOT IN multi-status check — drizzle lacks native notInArray for text columns
- [Phase 13-01]: Inter-Regular.ttf committed to public/fonts/ — CDN fonts unreliable in server-side PDF generation on Azure App Service
- [Phase 13-01]: Contract blob path pattern: {dealId}/{contractId}-executed.pdf — deal-scoped, predictable, no collisions
- [Phase 13-contract-e-signature]: Pointer Events API for signature canvas: single handler for mouse/touch/stylus, setPointerCapture prevents events escaping canvas boundary
- [Phase 13-contract-e-signature]: touchAction:none on canvas: prevents iOS Safari scroll interception during drawing — critical mobile compatibility fix
- [Phase 13-contract-e-signature]: new Uint8Array(buffer) wraps Node Buffer for Web Response BodyInit compatibility in strict TypeScript
- [Phase 13-contract-e-signature]: ContractTab uses 'use client' (not server wrapper) — simpler pattern matching BudgetTab, data fetched server-side in parent page
- [Phase 13-contract-e-signature]: contracts/page.tsx groups by Active/Executed/Expired+Voided — workflow-ordered, terminal contracts at bottom
- [Phase 13-contract-e-signature]: Contracts nav item placed between Deals and Buyers — deal lifecycle order
- [Phase 13-contract-e-signature]: contract-emails.tsx returns { subject, html } tuple — subject and HTML kept co-located to prevent subject/body mismatch bugs
- [Phase 13-contract-e-signature]: sendCountersignNotificationEmail distinct from signing invitation — uses buildCountersignNotificationHtml which emphasizes first signer completed
- [Phase 14-01]: PhotoCategoryValue local type union used instead of inferred pgEnum type — avoids TypeScript Parameters<> hack
- [Phase 14-01]: assignPhotosToDeal uses inArray(propertyPhotos.id, photoIds) to scope update to specified photos only (not all inbox)
- [Phase 14-01]: isInbox = true auto-set when both dealId and propertyId are null/empty — inbox is the default landing zone
- [Phase 14-01]: isCover auto-set to true for first exterior photo uploaded to a deal with no existing exterior cover
- [Phase 14-02]: Captions imported statically (not via next/dynamic) — plain Plugin function, not React component; dynamic() fails type checks
- [Phase 14-02]: YARL Lightbox uses dynamic/ssr:false; Captions cast as unknown as Plugin for TypeScript plugins prop compatibility
- [Phase 14-02]: Deal detail page now has 5 tabs: Overview, Analysis, Financials, Photos, Activity
- [Phase 14-03]: coverPhotos passed as Record<string,string> (not Map) through prop chain — plain objects serialize cleanly as Next.js server-to-client props
- [Phase 14-03]: createDeal photo carry-over is best-effort (try/catch) — deal creation never blocked by photo migration failure
- [Phase 14-03]: PhotoFab uses md:hidden CSS class for mobile-only visibility — simpler than useSidebar hook
- [Phase 15-01]: Migration numbered 0008 (not 0004 as in plan) — existing migrations go up to 0007
- [Phase 15-01]: recalculateDealSqft uses drizzle sum() aggregate to update deals.sqft after floor plan mutations
- [Phase 15-01]: budgetCategoryId on floor_plan_pins has no FK constraint (soft link) per plan spec
- [Phase 15-01]: Blob NOT deleted on deleteFloorPlan for safety — only DB row removed
- [Phase 15-02]: react-pdf v10 + pdfjs-dist v5 used for PDF rendering — compatible with React 19 peerDeps
- [Phase 15-02]: pdfjs worker via new URL(import.meta.url) — required for correct bundling in Next.js; CDN worker avoided
- [Phase 15-02]: Click handler on inner TransformComponent content div (not wrapper) — ensures correct pin coordinates when zoomed
- [Phase 15-02]: FloorPlanSketch stub created in 15-02 to satisfy linter dynamic import; full sketch implementation is 15-03
- [Phase 15-03]: FloorPlanSketch uses string (not union types) for floorLabel/version props — avoids casting at call sites where DB returns plain strings
- [Phase 15-03]: PIXELS_PER_FOOT=10 sketch scale factor: 120px wide room = 12 feet at default zoom
- [Phase 15-03]: sqft added to DealWithBuyer type and getDeal query — deal header shows sqft from floor plan totals
- [Phase 15-04]: ShareLinkPanel manages own generate/copy/revoke state inline — no prop-drilling to FloorPlanTab
- [Phase 15-04]: budgetCategoryId set to null on carried floor plan pins — deal budget IDs differ from property budget IDs
- [Phase 15-04]: Per-sqft metrics derived at render time from deal.sqft — DealMaoCalculator signature unchanged, reads deal.sqft from existing deal prop
- [Phase 16-01]: Buyer CRM tables placed after dealNotes in schema.ts — forward references use arrow functions () => deals.id which resolve at runtime (Drizzle pattern)
- [Phase 16-01]: Tag fetching uses inArray() not raw SQL ANY(ARRAY[]) — safer, type-checked, consistent with project patterns
- [Phase 16-01]: getBuyersForList fetches buyers then tags in two queries — simpler type inference, no SQL array agg needed
- [Phase 16-01]: importBuyers accepts typed array directly (not FormData) — arrays don't serialize cleanly to FormData, uses useTransition pattern
- [Phase 16-01]: logDealBlast auto-logs both comm event and deal interaction in one action — single atomic call for blast tracking
- [Phase 15-04]: FloorPlanShareView passes dealId='' to viewers in readOnly mode — dealId unused when readOnly=true
- [Phase 16-02]: BuyerCsvImport uses custom parseCsvLine (no library) — handles quoted fields, small data avoids dependency
- [Phase 16-02]: Dual filter: server URL params for tag/status/area/funding + client-side search for name/email/phone on fetched data
- [Phase 16-02]: Bottom-nav Campaigns replaced by Buyers — /buyers is now first-class CRM, campaigns accessible from sidebar
- [Phase 16-02]: /api/buyers/export is a dedicated route (not a type= param on shared /api/export) — cleaner URL for anchor download
- [Phase 16-03]: datalist for tag autocomplete — native HTML, no library needed, works with existing Input component
- [Phase 16-03]: BuyerTimeline filter tabs use client-side useState (not URL params) — single-buyer detail page context doesn't need bookmarkable filter state
- [Phase 16-03]: formKey increment resets log event form after submit — avoids manual field clearing
- [Phase 16-03]: Two-column layout on lg+ (timeline main, deal history 340px sidebar); single column mobile
- [Phase 16-05]: Widget uses return null pattern (not conditional render at call site) — cleaner, self-contained, per plan spec
- [Phase 16-05]: getOverdueBuyerFollowups added to Promise.all with .catch([]) fallback — dashboard never fails due to CRM query error
- [Phase 16-04]: BuyerList union type: Buyer[] mode for /deals/buyers; BuyerWithMatchInfo[] mode for deal detail — preserves backward compat
- [Phase 16-04]: sendDealBlast returns mail_not_configured sentinel — DealBlastGenerator shows inline warning with settings link, copy-to-clipboard unaffected
- [Phase 17-01]: netlify.toml has no plugins block — Netlify auto-installs @netlify/plugin-nextjs for Next.js
- [Phase 17-01]: output: standalone removed from next.config.ts — OpenNext/Netlify requires default output mode
- [Phase 17-01]: deploy-app.yml renamed to .disabled not deleted — Azure App Service fallback reference during 1-week transition
- [Phase 17-02]: Playfair_Display + Source_Sans_3 via next/font/google with --font-display/--font-body CSS variables — font variables match Tailwind @theme inline keys
- [Phase 17-02]: ThemeProvider defaultTheme changed from dark to light — warm cream palette reads poorly as forced dark default
- [Phase 17-02]: Grain overlay uses inline SVG data URI on body::before — no network request, no CSP issues on Netlify
- [Phase 17-02]: card-elevated and card-surface upgraded to rounded-2xl — matches nobshomes card style per CONTEXT.md
- [Phase 17-03]: Brand renamed to "No BS Homes" with font-display on login, sidebar, public pages — aligns with CONTEXT.md brand identity
- [Phase 17-03]: Hero banners: brand blue gradient (from-[#1e4d8c] to-[#0f2645]) replaces violet gradients across campaigns/contracts/mail pages
- [Phase 17-03]: Chart color arrays (analytics-trends, budget-charts) use raw brand hex #1e4d8c — recharts doesn't consume Tailwind tokens
- [Phase 17-03]: Badge tinting pattern: bg-primary/10 text-primary border-primary/20 replaces violet-500 variants throughout
- [Phase 17-03]: No Signal tier and inactive states: bg-muted text-muted-foreground border-border replaces zinc-500
- [Phase 17-04]: ownerPhone not on PropertyWithLead — swipe-right navigates to /properties/[id]#contact instead of direct tel: dial
- [Phase 17-04]: light-v11 Mapbox style replaces satellite-streets-v12 — clean street map matches cream/sand palette
- [Phase 18-01]: PascalCase-dash field names (Email-1, Mobile-1, Landline-1) fix — scraper used snake_case which returned no results from Tracerfy API
- [Phase 18-01]: MAX_POLL_MS=25000 wall-clock limit (not attempt count) for Netlify 26s serverless function timeout safety
- [Phase 18-01]: property_id in json_data for reliable Tracerfy result matching; address+city as fallback only
- [Phase 18-tracerfy-options]: SkipTracingSettings derives monthly spend client-side by filtering runHistory by current YYYY-MM prefix
- [Phase 18-tracerfy-options]: Dialog shows only when propertyId present + !hasContacts + tracerfyConfigured — prevents useless prompts for unconfigured installs
- [Phase 18-02]: BulkSkipTrace via BulkEnroll extra prop — avoids two overlapping fixed bars, renders button inline in shared action bar
- [Phase 18-02]: traceStatus populated via post-query inArray lookup — consistent with touchpointCount/hasEmail enrichment pattern in getProperties()
- [Phase 19-01]: text for wholesale status fields (new/analyzing/interested/pass/promoted) — consistent with Phase 08-01 deal status pattern
- [Phase 19-01]: upsertWholesaler does email-first lookup before insert — prevents duplicate wholesaler records for same sender
- [Phase 19-01]: normalizeAddress exported from wholesale-parser.ts for reuse in both actions and queries
- [Phase 19-01]: createWholesaleLeadFromEmail uses repairEstimate=0 for email-derived leads (repair cost not typically in blast)
- [Phase 19-01]: wholesaleLeads.promotedDealId FK to deals.id with no cascade — link is optional, not structural
- [Phase 19-02]: WholesaleLeadGrid provides modal overlay for form — form renders just form content, grid provides dialog chrome
- [Phase 19-02]: WholesaleAnalysis returns null when arv or askingPrice missing — prevents nonsensical partial scores
- [Phase 19-02]: Wholesale sidebar nav item placed between Buyers and Analytics — deal intake flow grouping
- [Phase 19-03]: skipAuth param on createWholesaleLeadFromEmail — webhook is server-side with no user session, public endpoint doesn't have auth context
- [Phase 19-03]: parsedDraft added to WholesaleLeadWithWholesaler type — required for parse review form to access email-extracted fields
- [Phase 19-03]: Two-view detail page: parse review mode for status=new+parsedDraft, full detail otherwise — clean separation without route duplication
- [Phase 19-03]: Promote to Deal button renders disabled for interested/analyzing statuses — signals next step without broken functionality (Plan 04 implements)
- [Phase 19-04]: promoteToDeal inserts deal directly (not via createDeal) — createDeal calls redirect() unconditionally, cannot return dealId to caller
- [Phase 19-04]: leadSource column added to deals table via migration 0011 — column was missing from schema despite plan assuming it existed
- [Phase 19-04]: WholesalerDirectory uses plain HTML table — @/components/ui/table does not exist in this project
- [Phase 19-04]: View Deal uses styled Link not Button+asChild — @base-ui/react/button does not support asChild prop
- [Phase 20-security-review]: api/migrate deleted entirely — eliminates attack surface at source; middleware exclusion removed
- [Phase 20-security-review]: next.config.ts async headers() for SSR-reliable security headers over netlify.toml on Netlify adapter
- [Phase 20-security-review]: CSP promoted from Report-Only to enforcing on 2026-04-11 — no violations observed in browser console
- [Phase 20-02]: nobshomes CSP allows unsafe-inline script and Google Analytics/GTM — required for @next/third-parties and JSON-LD structured data
- [Phase 20-02]: git config windows.appendAtomically false required in nobshomes git repo — fixes HEAD log append failure on OneDrive
- [Phase 20-security-review]: MED-03: missing auth() on some server actions accepted as risk — 3-user single-tenant, middleware protects pages
- [Phase 20-security-review]: sql.raw() usages verified safe and documented with inline SECURITY: comments
- [Phase 20-security-review]: Netlify firewall limitation accepted risk — full lockdown requires Enterprise tier; SSL compensating controls adequate
- [v1.1-init]: UGRC import script already exists at app/src/scripts/import-ugrc-assessor.mjs — Phase 21 activates and completes it, not builds from scratch
- [v1.1-init]: Schema already has UGRC columns (building_sqft, year_built, assessed_value, lot_acres) — currently NULL, need parcel normalization + import run
- [v1.1-init]: Signal types probate, lis_pendens, code_violation already in distress signal enum — no schema migration needed for Phase 22
- [v1.1-init]: XChange is browser-only, $40/mo subscription, no API — Phase 22 uses agent-assisted manual workflow, not automated scraping
- [v1.1-init]: Parcel ID format normalization is prerequisite for UGRC import — strips delimiters, uppercases to match UGRC format
- [v1.1-init]: Dry-run rescore is mandatory before activating new signal types — prevents hot lead flood on Phase 23 activation
- [Phase 21-ugrc-assessor-enrichment]: Normalize parcel IDs on both UGRC (app) and DB (SQL UPPER/REPLACE) sides before matching to handle county format differences
- [Phase 21-ugrc-assessor-enrichment]: Check exceededTransferLimit before breaking ArcGIS pagination loop to avoid early exit on server-capped pages
- [Phase 21-ugrc-assessor-enrichment]: High no-match rate for Carbon/Juab/Millard is expected — DB holds only distress-signal properties, not all county parcels. Emery 97.5% match rate validates normalization.
- [Phase 22-01]: Used serial PK for court_intake_runs audit table (not uuid); county nullable for multi-county sessions; unmatched_cases stored as TEXT JSON
- [Phase 22]: Replicate scoreAllProperties inline in xchange-intake.ts using app Drizzle client — no cross-package import from scraper due to Next.js bundler incompatibility with ESM .js extensions
- [Phase 22]: COURT_INTAKE_API_KEY env var for court intake auth — separate from WEBSITE_LEAD_API_KEY to allow independent revocation
- [Phase 23-01]: Deduplicate only nod and lis_pendens — probate/code_violation/tax_lien/vacant each filing is distinct
- [Phase 23-01]: Null and sentinel 1970-01-01 dates treated as distinct signals that cannot be proximity-checked; always kept
- [Phase 23-01]: deduplicateSignals() called on pre-filtered activeSignals inside scoreProperty() — dedup runs only on scoreable signals
- [Phase 23-01]: dry-run Pass B ensures XChange signal weights are non-zero (defaults 1/1/2) even if scraperConfig has them at 0
- [Phase 24-01]: convergeMao() defined inside component body to close over all 13 state variables without parameter threading
- [Phase 24-01]: Two convergeMao calls (minProfit, maxProfit) produce the MAO range; activeView stubbed for Plan 02 wholesaler panel
- [Phase 24-01]: wholesaleFee key kept in handleSave FormData (mapped to assignmentFee value) to preserve DB action contract
- [v1.3-init]: Rose Park architecture: retag city='Rose Park' for zip='84116' at upsert time via normalizeCity() — keeps city as single segmentation unit, no zip-filter dimension in getProperties()
- [v1.3-init]: normalizeCity() in scraper/src/lib/upsert.ts is the single normalization point — future SLC neighborhood expansion (84104 Glendale, etc.) is one line here
- [v1.3-init]: UGRC SLCo query must include ZIP_CODE='84116' WHERE clause — without filter, 350k-parcel full county download will timeout Azure Function
- [v1.3-init]: SLCo parcel ID format is all-numeric 10-digit (inferred) — existing Carbon-format regex in extractParcelId() will produce synthetic ul- IDs and break signal stacking; must fix in Phase 25 or before
- [v1.3-init]: RP-06 and RP-07 are emergent outcomes of Phase 25+26 — no separate implementation work; verified via Phase 26 success criteria
- [v1.3-init]: Map clustering (RP-08) is independent of the data pipeline; Phase 27 can be planned and executed in parallel after Phase 25 completes
- [v1.3-init]: New SLCo scrapers (slco-delinquent, slco-recorder, utah-legals SLC activation) deferred to v1.4+ as RP-FW-01 through RP-FW-05
- [Phase 25]: normalizeCity() in scraper/upsert.ts is single normalization point for zip-to-neighborhood city mapping; zip added to PropertyRecord schema to support call site
- [Phase 25-rose-park-foundation]: scraper_config table has no created_at column — INSERT uses (key, value, updated_at) only; migration SQL template corrected
- [Phase 25-rose-park-foundation]: Data-only migrations run via node pg script (not psql/drizzle-kit) — psql not installed on dev machine, drizzle-kit journal only covers 0000-0007
- [Phase 25-rose-park-foundation]: 0 rows retagged in migration is correct — production DB has no zip=84116 or SLC rows yet; Rose Park data arrives in Phase 26 UGRC import
- [Phase 25.5-utah-legals-slc-activation]: City-name allowlist (SLC_84116_CITIES Set) used over zip-from-address extraction — zip not reliably in 300-char snippet
- [Phase 25.5-utah-legals-slc-activation]: Dry-run as standalone script preserving scrapeUtahLegalsForeclosures() signature unchanged

### Roadmap Evolution

- Phase 7 added: Frontend Design Polish
- Phase 8 added: Wholesaling Deal Flow
- Phase 18 added: Tracerfy Options
- Phase 19 added: Wholesale Leads
- Phase 20 added: Security Review
- Phases 21-23 added: Milestone v1.1 Data Enrichment & Court Records
- Phase 24 added: Milestone v1.2 Advanced MAO Calculator
- Phases 25-27 added: Milestone v1.3 Rose Park Pilot

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Carbon County recorder site HTML structure is unverified (LOW confidence) — manually inspect carbon.utah.gov before writing selectors
- [Phase 4]: All remaining county portals unverified — some (Emery, Juab) may have no online portal and require GRAMA requests instead
- [Phase 5]: Utah voter roll permissible-use terms for commercial real estate unconfirmed — validate before building contact enrichment pipeline
- [Phase 5]: Geocoding approach not yet selected — evaluate Census Geocoder, Nominatim, or county GIS data at Phase 5 planning
- [Phase 22]: XChange $40/mo subscription must be active before court record intake workflow can be tested — confirm subscription status before planning Phase 22
- [Phase 25]: Confirm UGRC LIR service has ZIP_CODE field before adding filter clause — run a 1-record sample query against the REST endpoint (5-minute task at plan time)
- [Phase 25]: SLCo parcel ID format not authoritatively confirmed — inspect 10 SLC NOD notice texts from Utah Legals before writing extractParcelId() regex
- [Phase 26]: April 29, 2026 is deadline for slco-delinquent.ts to capture 2026 tax sale data — this is a v1.4 scraper but timing is noted

## Session Continuity

Last session: 2026-04-17
Status: v1.3 roadmap created — Phases 25-27 defined, ready to plan Phase 25
Final actions: ROADMAP.md updated with Phases 25-27, STATE.md updated for v1.3 focus, REQUIREMENTS.md traceability updated
Remaining manual: None
