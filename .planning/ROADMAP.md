# Roadmap: HouseFinder

## Overview

HouseFinder delivers a single-user lead generation tool for distressed properties in rural Utah. The build order follows a hard dependency chain: data must exist before a dashboard can display it, scoring must be validated before alerts fire, one county must work end-to-end before expanding to nine more, and the map requires geocoded addresses from a live pipeline. Phase 1 establishes the entire data foundation. Phases 2-3 build the application and alert layers on top of real data. Phase 4 scales scraping to the full target geography. Phase 5 completes the map and contact enrichment features that depend on a full pipeline being live.

v1.1 adds three phases (21-23) that enrich existing properties with free UGRC assessor data, unlock court record signals via an agent-assisted XChange workflow, and rebalance scoring to handle the new signal types safely.

v1.2 adds one phase (24) that replaces the simple ARV x 0.65 MAO formula with a professional-grade dual-view calculator covering sell-side costs, hard money and carry costs, buyer/flipper profit targets, and wholesaler spread math.

v1.3 adds three phases (25-27) that pilot Rose Park (zip 84116) as an urban expansion — surfacing existing statewide-scraper data that is currently hidden by the rural-only city filter, then importing UGRC assessor enrichment for 84116 parcels, then adding map clustering to handle urban pin density.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - Scraping pipeline, database schema, and distress scoring for Carbon County (Price, UT) working end-to-end (completed 2026-03-18)
- [x] **Phase 2: Core Application** - Authenticated dashboard, property detail, and lead management built against real pipeline data (completed 2026-03-18)
- [x] **Phase 3: Contact and Alerts** - Owner contact lookup from free sources and hot lead email/SMS alerts (completed 2026-03-18)
- [x] **Phase 4: County Expansion** - Scraper coverage expanded to all ~10 target Utah counties (completed 2026-03-18)
- [x] **Phase 5: Map View** - Geographic map browsing with distress-scored property pins (completed 2026-03-19)
- [x] **Phase 6: Data Analytics & Insights** - Track everything, surface patterns, and make data-driven investment decisions (completed 2026-03-29)
- [x] **Phase 21: UGRC Assessor Enrichment** - Enrich existing properties with sqft, year built, assessed value, and lot size from free UGRC ArcGIS data (completed 2026-04-13)
- [x] **Phase 22: XChange Court Record Intake** - Agent-assisted browser workflow ingests probate, code violation, and lis pendens records from Utah Courts XChange and matches them to properties as distress signals (completed 2026-04-13)
- [x] **Phase 23: Scoring Rebalance** - Dry-run rescore validates new signal types, threshold adjusted to prevent hot lead flood, and same-property NOD/lis_pendens signals deduplicated within 90 days (completed 2026-04-13)
- [x] **Phase 24: Advanced MAO Calculator** - Replace simple ARV x 0.65 formula with professional dual-view calculator (buyer/flipper + wholesaler) including sell-side costs, hard money carry, iterative loan convergence, and wholesaler spread (completed 2026-04-14)
- ✅ **v1.3 — Rose Park Pilot + User Feedback System** (Phases 25, 25.5, 26, 27, 28) — SHIPPED 2026-05-03. See [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md) for full details.

## v1.4 — Team & Access *(added 2026-04-28)*

Brian is bringing on his first hires (Stacee as Lead Manager, Chris as Sales). The platform needs role-based access control, deal/lead assignment to specific team members, and an audit log so Brian can verify nobody is gaming the lead pipeline. Login is restricted to `@no-bshomes.com` accounts. Two phases:

- [x] **Phase 29: RBAC Foundation + Audit Log** *(added 2026-04-28)* - Multi-role schema (`users.roles text[]`), `is_active` flag, six built-in roles (owner / acquisition_manager / disposition_manager / lead_manager / transaction_coordinator / sales / assistant), domain-restricted login, deal & lead assignee FKs, audit-log table with 30-day rolling archive, server-side permission helpers + audit-log helper wrapped around every mutating server action (completed 2026-04-29)
- [x] **Phase 30: RBAC UI Gates + Admin Console + Assignment UX** *(added 2026-04-28)* - "My deals" / "My leads" filters scoped by role + assignment, hide-by-role buttons across the app, admin user-management page (create / assign roles / deactivate), audit-log viewer page, deal detail "Team" panel with three assignee slots + reassign dropdowns, auto-assignment on status transitions (completed 2026-04-29)
- [x] **Phase 30.1: Google Workspace OAuth Login** *(inserted 2026-04-29)* - "Sign in with Google" via NextAuth google provider. Auto-provisions new users with empty roles on first login from a `@no-bshomes.com` Workspace account; Owner approves via /admin/users. Eliminates the temp-password dance for new hires. Existing email/password login kept as a fallback. (completed 2026-04-29)
- [x] **Phase 31: Unified Activity Feed** *(added 2026-05-01)* - One activity stream per property that follows it through dashboard → leads → deals. Compact "last action · N events" indicator on every property card; full timeline on each detail page; unified Log Activity modal (Call / Email / Text / Meeting / Voicemail / Note) reachable from anywhere. Replaces the fragmented lead_notes / deal_notes / contact_events / audit_log views with one continuous feed. (completed 2026-05-01)
- [x] **Phase 32: Dismiss Leads + Archive Deals + Outreach Form Fix** *(added 2026-05-01)* - Soft-delete on dashboard property cards (dismiss with reason; suppresses re-scrapes via dismissed_parcels list) and on deals (archive with optional reason). Owner-only permanent delete behind a confirm-by-typing-address modal. "Show dismissed/archived" toggles. Plus: fix the broken empty Property/Lead dropdown on /analytics/outreach Log-a-call form; scope it to active deals only, add typeahead search, drop the redundant Source field. (completed 2026-05-01)
- [x] **Phase 33: Activity Feed Batch Refactor** *(added 2026-05-03)* - Eliminate the dashboard N+1 activity-feed fan-out that caused the 2026-05-02 connection-storm outage. Single batched CTE+UNION ALL+ROW_NUMBER query (`getDashboardActivityCards`) replaces per-property `Promise.all` over `getActivityFeed`, pg pool reverted from emergency `max:20/idle:300000` back to safe `max:3/idle:10000`, and the orphaned `seed-config.ts` SLC neighborhood edit folded into the same atomic commit. (completed 2026-05-03)
- [ ] **Phase 34: JV Partner Lead Pipeline** *(added 2026-05-03)* - External JV "driver" partners (modeled as internal `@no-bshomes.com` users with a NEW `jv_partner` role, separate from existing `sales`) submit motivated-seller leads via mobile-first form (address + front-of-property photo + condition notes). Brian triages incoming submissions against acceptance criteria; accepted leads enter the existing property/lead pipeline. System tracks each lead through three payment milestones — qualified ($10), active follow-up i.e. negotiation file opened ($15), deal closes ($500) — and surfaces a per-partner payment ledger plus monthly payment-run report (1st-of-month batch, paid/unpaid checkboxes). Account provisioning unchanged: Brian manually creates JV partners in /admin/users with the `jv_partner` role assigned. Implements the No-BS Homes JV Partner Lead Referral Agreement.

## Phase Details

### Phase 1: Data Foundation
**Goal**: Carbon County distressed properties are discovered, scored, and stored daily with zero manual intervention
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-07, DATA-08, DATA-09, SCORE-01, SCORE-02, SCORE-03, SCORE-04
**Success Criteria** (what must be TRUE):
  1. Running the scheduled job causes new property records to appear in the database within 15 minutes, sourced from Carbon County assessor and recorder data
  2. Each property in the database has a first-seen date and a calculated weighted distress score based on its active signals
  3. Properties with weighted score >= configurable threshold (default 4) are marked as hot leads automatically, with no manual intervention
  4. Each distress signal (NOD, tax lien, lis pendens) is stored as a distinct row linked to its property, with a recording date
  5. A scraper health check shows the last successful run time and raises a system alert after 3 consecutive zero-result runs
**Plans:** 4/4 plans complete
Plans:
- [ ] 01-01-PLAN.md — Project scaffold, Drizzle schema, DB client, GitHub Actions CI/CD
- [ ] 01-02-PLAN.md — Carbon County scrapers (assessor, delinquent tax, recorder)
- [ ] 01-03-PLAN.md — Configurable distress scoring engine with default weights
- [ ] 01-04-PLAN.md — Daily timer trigger, upsert layer, health monitoring, end-to-end verification

### Phase 2: Core Application
**Goal**: The investor can log in, browse and filter distressed properties, view full property detail, and manage their lead pipeline from any mobile device
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, PROP-01, PROP-02, PROP-03, PROP-04, LEAD-01, LEAD-02, LEAD-03, LEAD-04
**Success Criteria** (what must be TRUE):
  1. Unauthenticated users who visit any page are redirected to login; after logging in, their session persists across browser refresh
  2. The dashboard lists all distressed properties and can be filtered by city, distress type, and hot lead status, and sorted by score or date
  3. Properties discovered since the user's last visit display a "new" badge on the dashboard without any manual action
  4. Each property detail page shows owner name, address, tax status, mortgage info, all active distress signals with dates, and the hot lead flag
  5. The user can set a lead status (New, Contacted, Follow-Up, Closed, Dead), add timestamped notes, and filter the dashboard by status to see their full pipeline
**Plans:** 5/5 plans complete
Plans:
- [ ] 02-01-PLAN.md — Next.js scaffold, Drizzle schema extensions, Auth.js auth, navigation shell
- [ ] 02-02-PLAN.md — Dashboard with stats bar, property list, filters, sorting, new-lead badges
- [ ] 02-03-PLAN.md — Tabbed property detail page (Overview, Signals, Notes, Contact)
- [ ] 02-04-PLAN.md — Lead pipeline with kanban + list views, status management, voice notes
- [ ] 02-05-PLAN.md — Settings page, GitHub Actions deployment, end-to-end verification

### Phase 3: Contact and Alerts
**Goal**: Hot leads trigger immediate alerts to the investor and owner contact information is surfaced from free public sources
**Depends on**: Phase 2
**Requirements**: CONTACT-01, CONTACT-02, CONTACT-03, CONTACT-04, ALERT-01, ALERT-02, ALERT-03, ALERT-04
**Success Criteria** (what must be TRUE):
  1. When a new property scores 2+ distress signals, an email alert fires via Resend containing the property address, active signals, owner name, and a link to the detail page — with no duplicate alerts on re-runs
  2. When a property scores 3+ signals or has an imminent auction timeline, an SMS alert fires to the investor's own number with the address and detail page link
  3. Owner phone numbers sourced from free public records (county assessor, voter rolls) appear as tappable tel: links on the property detail page on mobile
  4. Properties where no contact information was found display a "manual skip trace needed" flag on both the detail page and dashboard
**Plans:** 3/3 plans complete
Plans:
- [ ] 03-01-PLAN.md — Schema additions (owner_contacts, alert_history), dependencies, alert config seeding
- [ ] 03-02-PLAN.md — Alert pipeline (Resend email digest, Twilio SMS, dailyScrape integration)
- [ ] 03-03-PLAN.md — Contact tab UI, manual phone entry, skip trace flag, alert settings

### Phase 4: County Expansion
**Goal**: Scraping expanded to 5 new counties (Emery, Sevier, Juab, Millard, Sanpete) covering ~10 target cities, with manual signal entry for probate and vacant properties
**Depends on**: Phase 1
**Requirements**: DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. Properties from Emery, Sanpete, Juab, Millard, and Sevier counties appear in the database alongside Carbon County records
  2. Probate signals can be manually added to any property from the detail page (XChange subscription declined per user decision)
  3. Vacant properties can be flagged from the property detail page with a toggle, creating/resolving a vacant distress signal
  4. Per-county scraper health status is visible — each county shows its last successful scrape timestamp independently so a failing county is immediately identifiable
**Plans:** 3/3 plans complete
Plans:
- [x] 04-01-PLAN.md — Emery County wpDataTables scraper, county-parameterized upsert, pdf-parse install
- [x] 04-02-PLAN.md — Manual vacant/probate signal UI on property detail page, target cities update
- [x] 04-03-PLAN.md — PDF delinquent parsers for Sevier/Juab/Millard/Sanpete + staggered Azure Function timers

### Phase 5: Map View
**Goal**: The investor can browse all distressed properties geographically on a mobile-friendly interactive map
**Depends on**: Phase 4
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04
**Success Criteria** (what must be TRUE):
  1. All properties in the database appear as map pins colored by distress score — hot leads visually distinct from lower-score properties
  2. The map can be filtered by distress type, city, and hot lead status, and updates pin visibility without a page reload
  3. Tapping a map pin shows a summary card with the property address, distress score, and a link to its detail page
  4. The map supports pinch-to-zoom and pan gestures on mobile and does not crash or produce a blank screen during server-side rendering
**Plans:** 2 plans

Plans:
- [x] 24-01-PLAN.md — Math engine, sell-side costs, HML iterative convergence, buyer/flipper view
- [ ] 24-02-PLAN.md — Wholesaler view, view toggle, human verification checkpoint

### Phase 6: Data Analytics & Insights
**Goal**: The investor has full visibility into lead pipeline performance, market trends, outreach effectiveness, and scraper health — enabling data-driven decisions about which markets to focus on, when to act, and what's working
**Depends on**: Phase 3
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05, ANALYTICS-06, ANALYTICS-07, ANALYTICS-08
**Success Criteria** (what must be TRUE):
  1. An analytics dashboard shows pipeline conversion rates: how many leads move from New -> Contacted -> Closed, with average time at each stage
  2. Market comparison view shows which cities/counties produce the most hot leads, highest conversion rates, and fastest response times
  3. Outreach tracking records every call attempt, outcome (answered/voicemail/no-answer/wrong-number), and time spent — showing contact rate per source
  4. Trend charts show distressed property volume over time per city/county — spot markets heating up or cooling down
  5. Scraper health dashboard shows per-county success rates, data freshness, and alerts on degrading sources
  6. Lead source attribution tracks which distress signal type (NOD, tax lien, etc.) produces the most conversions
  7. Activity log captures all user actions (calls, notes, status changes) with timestamps for personal productivity review
  8. Export capability for all analytics data (CSV) for external analysis
**Plans:** 4/4 plans complete

Plans:
- [x] 06-01-PLAN.md — Schema (call_logs), recharts install, analytics queries, nav update, page shell
- [ ] 06-02-PLAN.md — Pipeline funnel, market comparison, trends, attribution chart components
- [ ] 06-03-PLAN.md — Scraper health table, outreach tracking, call log form
- [ ] 06-04-PLAN.md — Activity log timeline, CSV export route handler

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

Note: Phase 4 depends on Phase 1 only (not Phase 3). Phases 2 and 3 can be completed before Phase 4 begins, as planned. This is the optimal order.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 0/4 | Complete    | 2026-03-18 |
| 2. Core Application | 0/5 | Complete    | 2026-03-18 |
| 3. Contact and Alerts | 0/3 | Complete    | 2026-03-18 |
| 4. County Expansion | 3/3 | Complete    | 2026-03-19 |
| 5. Map View | 3/3 | Complete   | 2026-03-19 |
| 6. Data Analytics & Insights | 4/4 | Complete    | 2026-03-29 |
| 21. UGRC Assessor Enrichment | 2/2 | Complete    | 2026-04-13 |
| 22. XChange Court Record Intake | 2/2 | Complete   | 2026-04-13 |
| 23. Scoring Rebalance | 1/2 | Complete    | 2026-04-13 |
| 24. Advanced MAO Calculator | 2/2 | Complete    | 2026-04-14 |
| 25. Rose Park Foundation | 2/2 | Complete    | 2026-04-26 |
| 26. UGRC Rose Park Enrichment | 3/3 | Complete   | 2026-05-03 |
| 27. Map Clustering | 0/0 | Complete (descoped)   | 2026-05-03 |
| 28. User Feedback System | 5/5 | Complete    | 2026-04-28 |
| 29. RBAC Foundation + Audit Log | 0/1 | Complete    | 2026-04-29 |
| 30. RBAC UI + Admin Console | 0/1 | Complete    | 2026-04-29 |
| 30.1. Google Workspace OAuth Login | 1/1 | Complete   | 2026-04-29 |
| 31. Unified Activity Feed | 1/1 | Complete    | 2026-05-01 |
| 32. Dismiss Leads + Archive Deals | 1/1 | Complete    | 2026-04-26 |
| 33. Activity Feed Batch Refactor | 1/1 | Complete    | 2026-05-03 |

### Phase 7: Frontend Design Polish

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 6
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 7 to break down)

### Phase 8: Wholesaling Deal Flow

**Goal:** The investor can manage the full wholesaling deal lifecycle — from promoting a lead into a deal, through seller qualification, MAO analysis, contract tracking, buyer matching, and deal blast marketing — all within HouseFinder
**Depends on:** Phase 5
**Requirements**: DEAL-01, DEAL-02, DEAL-03, DEAL-04, DEAL-05, DEAL-06, DEAL-07, DEAL-08
**Success Criteria** (what must be TRUE):
  1. A "Deals" section with kanban pipeline shows all deals across 10 statuses (Lead through Closed/Dead) with drag-and-drop status updates
  2. The MAO calculator computes MAO = ARV x 0.70 - Repairs - Fee with sensitivity analysis showing impact of ARV -10% and repairs +20%
  3. Seller qualification captures the 4 pillars (condition, timeline, price, motivation) and highlights hot sellers
  4. A buyer database stores cash buyers with buy box criteria, and buyers can be matched to deals by price range
  5. Deal blast generates formatted marketing text with one-click copy to clipboard
  6. Contract tracking shows status progression, earnest money, inspection deadline countdown, and closing date
  7. "Start Deal" button on property detail pre-fills a new deal with existing property data
  8. Two preloaded deals (Sullivan Rd Ogden and Delta 496 W 300 N) seed the pipeline
**Plans:** 4/4 plans complete

Plans:
- [ ] 08-01-PLAN.md — Schema (deals, buyers, deal_notes), types, navigation, seed data
- [ ] 08-02-PLAN.md — Deal pipeline page with kanban/list views, deal CRUD, new deal form
- [ ] 08-03-PLAN.md — Deal detail page with MAO calculator, contract tracker, notes
- [ ] 08-04-PLAN.md — Buyer management, deal blast generator, "Start Deal" integration

### Phase 9: Admin Budgeting & Cost Analysis

**Goal:** The investor can create rehab budgets per deal, track expenses against categories with receipt OCR scanning, and see visual budget health indicators with profit/loss analysis tied to MAO math
**Depends on:** Phase 8
**Requirements**: BUDGET-01, BUDGET-02, BUDGET-03, BUDGET-04, BUDGET-05, BUDGET-06, BUDGET-07, BUDGET-08
**Success Criteria** (what must be TRUE):
  1. Each deal has a "Budget" tab where the investor can create a rehab budget with 19 default categories, auto-populated from the deal's repair_estimate
  2. Expenses can be added manually or via receipt photo upload with OCR auto-scanning (Azure Document Intelligence) that pre-fills vendor, date, and amount
  3. Category progress bars show green/yellow/red based on spending percentage, with alert banners at 80% and over-budget thresholds
  4. A 10% contingency reserve is auto-added on top of the planned total with a warning when spending eats into it
  5. Profit/break-even/loss indicators show whether actual costs stay under, match, or exceed the deal's repair_estimate
  6. Budget summary and detailed expenses can be exported to CSV
**Plans:** 4/4 plans complete

Plans:
- [ ] 09-01-PLAN.md — Schema (budgets, budget_categories, receipts, expenses), types, queries, server actions
- [ ] 09-02-PLAN.md — Budget tab on deal detail, KPI header, category editor, expense form/list
- [ ] 09-03-PLAN.md — Receipt upload (Azure Blob Storage), OCR scanning (Azure Document Intelligence), receipt gallery
- [ ] 09-04-PLAN.md — Budget visualizations (progress bars, pie/bar charts), alert banners, CSV export

### Phase 10: Public Marketing Website

**Goal:** Public-facing website for No BS Homes — professional marketing site for distressed property sellers
**Requirements**: Separate repo (nobshomes), Netlify hosting
**Depends on:** Independent
**Status:** Complete (2026-03-29)
**Plans:** Built directly (not via GSD plans — separate project)

Delivered:
- [x] Home page with hero, trust points, situations, how-it-works preview, contact form
- [x] About Us page (Brian & Shawn's story)
- [x] How It Works page (4-step process)
- [x] FAQ page (10 expandable Q&As)
- [x] Netlify Forms integration
- [x] Deployed to nobshomes.netlify.app
- [ ] Custom domain, logo, photos, analytics (see TODO.md)

### Phase 11: HouseFinder UI Revamp

**Goal:** The HouseFinder dashboard is visually transformed into a premium, mobile-first, dark-mode-primary SaaS tool with a zinc/violet palette, Inter font, decluttered dashboard, intuitive navigation, and command palette — while preserving all existing functionality
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08
**Depends on:** Phase 9
**Success Criteria** (what must be TRUE):
  1. Dark mode renders with zinc neutrals and violet accent — no terracotta/desert colors visible anywhere
  2. All pages work on a 360px Android phone screen with 44px minimum touch targets
  3. Dashboard stats are compact (single row), filters hidden in a bottom drawer on mobile, search always visible
  4. Inter variable font renders on all text — no Bebas Neue, Oswald, or Nunito Sans
  5. Login page has a premium dark aesthetic as the first visual impression
  6. Deals kanban scrolls horizontally on mobile; list view works as fallback
  7. Command palette (Ctrl+K) navigates to all major pages
  8. All existing features preserved — zero functionality removed
**Plans:** 5/5 plans complete

Plans:
- [ ] 11-01-PLAN.md — Design foundation: violet/zinc palette, Inter font, nav shell refresh, login page
- [ ] 11-02-PLAN.md — Dashboard: compact stats bar, mobile filter drawer, property card refresh
- [ ] 11-03-PLAN.md — Inner pages: deals kanban mobile scroll, analytics chart refresh, map styling
- [ ] 11-04-PLAN.md — Detail pages: property detail, deal detail, pipeline, settings palette sweep
- [ ] 11-05-PLAN.md — Command palette (Ctrl+K) and final visual verification checkpoint

### Phase 12: Email & Call Campaigns

**Goal:** The investor can run multi-step email drip sequences to distressed property owners via Resend, log all contact events (calls, emails, texts, meetings) with an activity timeline, and manage campaigns from a dedicated page — all without leaving HouseFinder
**Depends on:** Phase 11
**Requirements**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05, CAMP-06, CAMP-07, CAMP-08, CAMP-09, CAMP-10, CAMP-11, CAMP-12
**Success Criteria** (what must be TRUE):
  1. Contact events (6 types: called, voicemail, emailed, text, met, received email) can be logged from property detail pages with an activity timeline showing all outreach chronologically
  2. Touchpoint count badges appear on dashboard property cards showing total contact events per lead
  3. A call script modal shows a configurable talk track with lead details pre-filled when about to call
  4. Email sequences with configurable multi-step drip delays (e.g., 0/5/5/7 day pattern) can be created and managed from a Campaigns page
  5. Mail settings (from name, email, reply-to, Resend API key, phone, signature) are configurable from a dedicated Mail Settings page
  6. Leads can be enrolled in sequences individually from property detail or in bulk from the dashboard — step 0 sends immediately
  7. Leads without a contact email show a clear disabled state and cannot be enrolled
  8. Follow-up emails dispatch automatically daily via Azure Functions timer trigger for all due enrollments
  9. Enrollments auto-stop when the lead's deal status changes to closed or dead
  10. Activity timeline appears on both property detail and deal detail pages
**Plans:** 5/5 plans complete

Plans:
- [x] 12-01-PLAN.md — Schema (email_sequences, email_steps, campaign_enrollments, email_send_log, contact_events), types, npm install
- [x] 12-02-PLAN.md — Contact event logging, activity timeline, touchpoint badges, call script modal
- [ ] 12-03-PLAN.md — Campaigns page (sequence CRUD), mail settings page, navigation updates
- [ ] 12-04-PLAN.md — Email enrollment actions, outreach template, enroll button + bulk enroll UI
- [ ] 12-05-PLAN.md — Scraper campaign dispatch timer, deal auto-stop, deal detail timeline, verification

### Phase 13: Contract & E-Signature

**Goal:** The investor can generate, e-sign, and manage wholesale contracts (purchase agreements and assignment contracts) within HouseFinder — auto-filled from deal data, sent for signature via email with token-gated signing pages, tracked through a full lifecycle from draft to executed, with signed PDFs stored in Azure Blob Storage and automatic deal stage advancement on execution
**Depends on:** Phase 12
**Requirements**: CONTRACT-01, CONTRACT-02, CONTRACT-03, CONTRACT-04, CONTRACT-05, CONTRACT-06, CONTRACT-07, CONTRACT-08, CONTRACT-09, CONTRACT-10, CONTRACT-11, CONTRACT-12, CONTRACT-13, CONTRACT-14, CONTRACT-15, CONTRACT-16
**Success Criteria** (what must be TRUE):
  1. Two contract types (Purchase Agreement and Assignment) can be created from deal detail with all available deal data auto-filled and standard Utah wholesale clauses pre-populated
  2. User can edit clauses (add, remove, modify, reorder) before sending a contract for signature
  3. Contracts tab on deal detail shows all contracts with status badges and actions; global Contracts page shows all contracts across deals
  4. Contract PDF is generated server-side via @react-pdf/renderer with property details, parties, terms, clauses, and audit trail
  5. Signing link sent via email opens a public page where seller/buyer can draw or type their signature without a HouseFinder account
  6. Signing order enforced: first signer signs, then countersigner is notified automatically; both get the fully executed PDF by email
  7. Signed contract PDFs are stored in Azure Blob Storage and downloadable from deal detail
  8. Deal auto-advances to "Under Contract" and active campaign enrollment auto-stops when purchase agreement is fully executed
**Plans:** 4/4 plans complete

Plans:
- [ ] 13-01-PLAN.md — Schema (contracts, contract_signers), types, @react-pdf/renderer install, blob storage extension, contract queries/actions/PDF generation
- [ ] 13-02-PLAN.md — Contract tab on deal detail, create form with clause editor, global contracts page, sidebar nav
- [ ] 13-03-PLAN.md — Public signing page (/sign/[token]), signature canvas (draw/type), PDF API endpoint
- [ ] 13-04-PLAN.md — Email delivery (signing invitation, countersign, executed PDF), signed PDF download, auto-advance deal, auto-stop campaign

### Phase 14: Mobile Photo Capture

**Goal:** The investor can capture, organize, and manage property photos from mobile devices — with categorized uploads, a photo inbox for field captures, deal detail galleries with lightbox, cover photo thumbnails on deal cards, and auto-populated deal blast photos — enabling a complete visual documentation workflow for driving-for-dollars and deal management
**Depends on:** Phase 13
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05, PHOTO-06, PHOTO-07, PHOTO-08, PHOTO-09
**Success Criteria** (what must be TRUE):
  1. User can upload multiple photos from phone camera or gallery with client-side compression and per-file progress, tagged by area category (Exterior, Kitchen, etc.)
  2. Deal detail page has a Photos tab showing all photos grouped by category in a responsive grid, with full-screen lightbox (swipe, caption overlay)
  3. First Exterior photo auto-selected as cover; user can change cover photo and delete/edit captions
  4. Photo Inbox at /photos/inbox stores unassigned captures with assign-to-deal flow; accessible from sidebar
  5. Floating action button on mobile opens camera for quick single-photo capture to inbox
  6. Property photos carry over to deal when "Start Deal" creates a deal from that property
  7. Deal cards in deals list show cover photo thumbnail
  8. Deal blast generator auto-populates cover photo SAS URL
**Plans:** 3/3 plans complete

Plans:
- [ ] 14-01-PLAN.md — Schema (property_photos, photo_category enum), blob storage extension, server actions, query functions
- [ ] 14-02-PLAN.md — Photo upload component (dual iOS input, batch, progress), photo gallery with YARL lightbox, Photos tab on deal detail
- [ ] 14-03-PLAN.md — Photo FAB, Photo Inbox page, sidebar nav, deal card thumbnails, deal blast cover photo, property-to-deal carry-over

### Phase 15: Blueprints & Floor Plans

**Goal:** The investor can upload, sketch, view, and annotate property floor plans within HouseFinder — with PDF/image upload, in-app room rectangle sketching with dimensions, pin-based annotations linked to rehab budget categories, multiple floors and versions (as-is/proposed), square footage feeding deal metrics, and shareable contractor links
**Requirements**: FLOOR-01, FLOOR-02, FLOOR-03, FLOOR-04, FLOOR-05, FLOOR-06, FLOOR-07, FLOOR-08, FLOOR-09, FLOOR-10
**Depends on:** Phase 14
**Success Criteria** (what must be TRUE):
  1. User can upload PDF or image floor plans and view them with pan/zoom (pinch on mobile, scroll on desktop)
  2. User can sketch floor plans in-app with named room rectangles, editable L x W dimensions, and auto-calculated sq ft
  3. Pin annotations with category colors can be dropped on floor plans with notes and links to rehab budget categories
  4. Multiple floors (Main, Upper, Basement, Garage) and versions (As-Is, Proposed) are supported per deal
  5. Floor Plans tab on deal detail shows all plans with floor selector, version toggle, and plan count badge
  6. Total square footage from floor plans feeds into deal metrics (price/sqft, rehab/sqft, ARV/sqft)
  7. Shareable time-limited links give contractors view-only access to floor plans with annotations
  8. Floor plans carry over from property to deal on Start Deal
**Plans:** 4/4 plans complete

Plans:
- [x] 15-01-PLAN.md — Schema (floor_plans, floor_plan_pins), types, blob storage extension, queries, server actions
- [ ] 15-02-PLAN.md — Floor plan upload, pan/zoom viewer, pin annotations, Floor Plans tab on deal detail
- [ ] 15-03-PLAN.md — react-konva room rectangle sketch tool with dimensions, sqft calculation, save to DB
- [ ] 15-04-PLAN.md — Contractor share links, Start Deal carry-over, sqft deal metrics integration

### Phase 16: Buyers List CRM

**Goal:** The investor can manage cash buyers as a full CRM — with dedicated buyer detail pages, unified communication timelines, auto-matching buyers to deals by price range and target area, buyer-deal interaction tracking (blasted/interested/closed), follow-up reminders on the dashboard, free-form tags, CSV import/export, and a searchable/filterable top-level buyers list replacing the old /deals/buyers sub-page
**Requirements**: BUYER-01, BUYER-02, BUYER-03, BUYER-04, BUYER-05, BUYER-06, BUYER-07, BUYER-08, BUYER-09, BUYER-10, BUYER-11, BUYER-12
**Depends on:** Phase 15
**Success Criteria** (what must be TRUE):
  1. A top-level /buyers page shows a searchable, filterable table of all buyers with tags, status, last contact, and follow-up dates
  2. Each buyer has a detail page (/buyers/[id]) showing full profile, communication timeline, deal interaction history, and tag management
  3. Buyers auto-match to deals by price range AND target area, with match quality badges on deal detail
  4. Deal blasts can be emailed to selected buyers via Resend with auto-logging to buyer communication history and buyer-deal interaction tracking
  5. Follow-up reminder dates per buyer surface as an overdue widget on the main dashboard
  6. CSV import with column mapping and CSV export both work for buyer list management
  7. Sidebar and bottom nav updated to point to /buyers as first-class page
**Plans:** 5/5 plans complete

Plans:
- [ ] 16-01-PLAN.md — Schema (buyer_communication_events, buyer_deal_interactions, buyer_tags), types, queries, server actions
- [ ] 16-02-PLAN.md — /buyers list page with searchable table, CSV import/export, navigation updates
- [ ] 16-03-PLAN.md — /buyers/[id] detail page with communication timeline, deal history, tags, follow-up
- [ ] 16-04-PLAN.md — Deal detail integration: enhanced matching (price + area), email blast, interaction tracking
- [ ] 16-05-PLAN.md — Dashboard follow-up reminder widget

### Phase 17: Netlify Migration & No BS Homes Design System

**Goal:** HouseFinder frontend migrated from Azure App Service to Netlify with the No BS Homes brand design system (Playfair Display + Source Sans 3, brand blue/sand palette, warm cream backgrounds, mobile-first responsive), Azure PgBouncer skipped (B1ms limitation), and all existing features verified end-to-end on the new platform
**Requirements**: NETLIFY-01, NETLIFY-02, NETLIFY-03, DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, DESIGN-05, DESIGN-06, DESIGN-07, DESIGN-08, DESIGN-09, DESIGN-10, DESIGN-11, DESIGN-12
**Depends on:** Phase 16
**Success Criteria** (what must be TRUE):
  1. HouseFinder loads on a Netlify URL with auto-deploy from master — no Azure App Service involvement
  2. All pages render with Playfair Display headings and Source Sans 3 body text on warm cream/blue/sand palette — no zinc/violet remnants
  3. Light mode is the default; dark mode toggle switches to warm navy dark theme
  4. Login page has cream background with centered card and warm aesthetic
  5. Map uses light-v11 Mapbox style matching the warm palette
  6. Mobile swipe actions work on lead/deal cards with 44px touch targets throughout
  7. All existing features (auth, dashboard, deals, campaigns, contracts, photos, floor plans, buyers, analytics) function correctly on Netlify
  8. Azure Blob Storage images load correctly via configured remotePatterns
**Plans:** 4/5 plans executed

Plans:
- [ ] 17-01-PLAN.md — Netlify deployment config, next.config.ts updates, disable GH Actions
- [ ] 17-02-PLAN.md — Design system foundation: fonts, globals.css tokens, grain overlay, layout.tsx
- [ ] 17-03-PLAN.md — Page-by-page design sweep: login, dashboard, sidebar, bottom nav, all inner pages
- [ ] 17-04-PLAN.md — Mobile swipe actions (framer-motion), map style swap, mobile navigation polish
- [ ] 17-05-PLAN.md — Environment migration checkpoint + end-to-end verification on Netlify

### Phase 18: Tracerfy Options

**Goal:** The investor can trigger Tracerfy skip traces from the UI (single property, bulk dashboard selection, or auto-prompt on deal creation), view results on contact cards with source badges, monitor API spend on a dedicated settings page with run history and cost controls, and see trace status badges on dashboard property cards
**Requirements**: TRACE-01, TRACE-02, TRACE-03, TRACE-04, TRACE-05, TRACE-06, TRACE-07, TRACE-08, TRACE-09, TRACE-10, TRACE-11, TRACE-12, TRACE-13, TRACE-14, TRACE-15
**Depends on:** Phase 17
**Plans:** 3/3 plans complete

Plans:
- [ ] 18-01-PLAN.md — Tracerfy types, config constants, and server actions (submit, poll, store, status, history)
- [ ] 18-02-PLAN.md — Skip Trace button on ContactTab, bulk skip trace bar on dashboard, confirmation dialog, trace status badges
- [ ] 18-03-PLAN.md — Skip tracing settings page (mini-dashboard), auto-trace prompt on deal creation, sidebar nav

### Phase 19: Wholesale Leads

**Goal:** The investor can receive wholesale deals from 3rd-party wholesalers (via email forward or manual entry), auto-analyze them with a traffic light verdict + weighted score, triage via card grid, promote gems into the Deals pipeline, and track wholesaler performance over time
**Requirements**: WHOLESALE-01, WHOLESALE-02, WHOLESALE-03, WHOLESALE-04, WHOLESALE-05, WHOLESALE-06, WHOLESALE-07, WHOLESALE-08, WHOLESALE-09, WHOLESALE-10, WHOLESALE-11, WHOLESALE-12
**Depends on:** Phase 18
**Success Criteria** (what must be TRUE):
  1. User can manually enter a wholesale deal or forward a wholesaler email blast to auto-parse property details, asking price, ARV, and wholesaler contact info
  2. Each wholesale lead shows an auto-computed traffic light verdict (green/yellow/red) with a 1-10 weighted score and expandable breakdown (MAO spread, equity %, end buyer ROI)
  3. The wholesale leads page shows a card grid with verdict badges, profit estimates, and filters for verdict, status, and wholesaler
  4. Wholesale leads follow a 4-status workflow (New/Analyzing/Interested/Pass/Promoted) with timestamped notes
  5. Promote to Deal creates a new Deal pre-filled with wholesale lead data and tagged as wholesale-sourced
  6. Wholesaler directory tracks name, contact info, deals sent, deals promoted, and average spread per wholesaler
  7. Wholesale appears in sidebar navigation and command menu; promoted deals show a Wholesale badge on deal cards
**Plans:** 4/4 plans complete

Plans:
- [x] 19-01-PLAN.md -- Schema (wholesalers, wholesale_leads, wholesale_lead_notes), types, scoring engine, email parser, server actions, queries
- [x] 19-02-PLAN.md -- /wholesale list page with card grid, verdict badges, filters, manual entry form with live analysis
- [ ] 19-03-PLAN.md -- Resend inbound webhook, parse review form, /wholesale/[id] detail page with notes
- [ ] 19-04-PLAN.md -- Promote to Deal action, wholesaler directory, sidebar + command menu nav, deal card badge

### Phase 20: Security Review

**Goal:** Both the No BS Workbench (housefinder) and the No BS Homes marketing site (nobshomes) pass a comprehensive security audit -- all critical and high vulnerabilities fixed, security headers deployed, password policy enforced, OWASP Top 10 code review completed, and secrets inventory delivered for ongoing rotation management
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11, SEC-12
**Depends on:** Phase 19
**Success Criteria** (what must be TRUE):
  1. The /api/migrate endpoint is deleted and no longer accessible -- middleware matcher updated to remove the exclusion
  2. Both repos run Next.js 15.5.15 with zero high/critical npm audit findings
  3. All HTTP responses include Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers
  4. CSP deployed in Report-Only mode on both sites to detect violations without breaking functionality
  5. Password reset enforces minimum 8 characters plus at least one uppercase letter and one number
  6. OWASP Top 10 code review completed across both repos with findings documented
  7. Git history scanned for leaked secrets in both repos
  8. SECURITY-FINDINGS.md delivered with severity-rated findings and fix status for each
  9. SECRETS-INVENTORY.md delivered listing every secret across all deployment targets with rotation cadence
**Plans:** 4/4 plans complete

Plans:
- [ ] 20-01-PLAN.md -- Remove /api/migrate, upgrade Next.js, password policy, security headers (housefinder)
- [ ] 20-02-PLAN.md -- Upgrade Next.js, security headers (nobshomes)
- [ ] 20-03-PLAN.md -- OWASP Top 10 audit, git secret scan, findings report, secrets inventory
- [ ] 20-04-PLAN.md -- Migrate Functions secrets to Key Vault, decommission old App Service

---

## Milestone v1.1 — Data Enrichment & Court Records (Phases 21-23)

### Phase 21: UGRC Assessor Enrichment

**Goal:** Every scraped property has sqft, year built, assessed value, and lot size populated from free UGRC ArcGIS data — fields that already exist in the schema and UI but are currently NULL
**Depends on:** Phase 20
**Requirements**: UGRC-01, UGRC-02, UGRC-03, UGRC-04
**Success Criteria** (what must be TRUE):
  1. Running the UGRC import script against any target county populates building_sqft, year_built, assessed_value, and lot_acres on matched property rows — fields that were previously NULL are now filled
  2. The import script normalizes parcel ID format before matching (strips delimiters, uppercases) so Carbon County format differences do not prevent matches against UGRC data
  3. After each import run, a match rate report shows how many properties in that county matched vs total (e.g., "Carbon: 312/418 matched, 74%")
  4. Property detail pages display sqft, year built, assessed value, and lot size when the data is present — no code changes required, only data population
**Plans:** 2/2 plans complete

Plans:
- [ ] 21-01-PLAN.md — Harden import script: remove hardcoded credential, add normalizeParcelId(), fix exceededTransferLimit pagination
- [ ] 21-02-PLAN.md — Run import against production, record match rates, verify UI end-to-end

### Phase 22: XChange Court Record Intake

**Goal:** Probate, code violation, and lis pendens court records from Utah Courts XChange are ingested via an agent-assisted browser workflow, parsed into structured distress signals, and matched to existing properties — with unmatched records staged rather than discarded
**Depends on:** Phase 21
**Requirements**: XCHG-01, XCHG-02, XCHG-03, XCHG-04, XCHG-05, XCHG-06
**Success Criteria** (what must be TRUE):
  1. A documented agent-assisted workflow (prompt or script) searches XChange by county and case type, extracts case text, and passes it to a parser — producing structured records (case type, parties, address, filing dates) without requiring an XChange API
  2. Parsed records that match an existing property (by parcel ID, normalized address, or owner name) create distress signal rows of the correct type (probate, code_violation, or lis_pendens)
  3. Parsed records that do not match any property are written to a staging table for manual review — not silently dropped
  4. Each court intake run is logged with date, county, case type searched, records parsed, records matched, and records staged — visible as an audit trail
**Plans:** 2/2 plans complete

Plans:
- [ ] 22-01-PLAN.md — court_intake_runs schema addition (app/src/db/schema.ts) and migration 0012
- [ ] 22-02-PLAN.md — xchange-intake.ts three-tier matching + /api/court-intake POST endpoint

### Phase 23: Scoring Rebalance

**Goal:** New signal types from XChange are activated safely — a dry-run rescore validates the impact on hot lead count before going live, the hot lead threshold is tuned to prevent a flood, and same-property NOD/lis_pendens duplicates within 90 days are collapsed to one signal
**Depends on:** Phase 22
**Requirements**: SCORE2-01, SCORE2-02, SCORE2-03
**Success Criteria** (what must be TRUE):
  1. A dry-run rescore command runs against the live database and reports how many properties would cross the hot lead threshold with the new signal types active — without writing any changes to the database
  2. Based on dry-run output, the hot lead threshold or signal weights are adjusted in scraperConfig so the hot lead count remains actionable (not flooded) before new signal types are enabled
  3. The scoring engine deduplicates NOD and lis_pendens signals for the same property within a 90-day window — a property with two NOD filings 30 days apart scores as one NOD signal, not two
**Plans:** 2/2 plans complete

Plans:
- [x] 23-01-PLAN.md — 90-day dedup in scoreProperty() + dry-run CLI reporting baseline vs simulated hot counts
- [ ] 23-02-PLAN.md — Human reviews dry-run output, chooses threshold, updates scraperConfig, runs live rescore

---

## Milestone v1.2 — Advanced MAO Calculator (Phase 24)

### Phase 24: Advanced MAO Calculator

**Goal:** The investor sees professional-grade deal math with sell-side costs, hard money carry costs, and both buyer/flipper and wholesaler perspectives in one calculator -- replacing the single-line ARV x 0.65 formula
**Depends on:** Phase 23
**Requirements**: MAO-01, MAO-02, MAO-03, HML-01, HML-02, HML-03, HML-04, FLIP-01, FLIP-02, FLIP-03, FLIP-04, WSALE-01, WSALE-02, WSALE-03, WSALE-04, WSALE-05
**Success Criteria** (what must be TRUE):
  1. User enters ARV and rehab estimate and immediately sees net proceeds at resale after configurable sell-side costs (buyer's agent %, selling agent %, closing/title %) -- replacing the old static formula
  2. Hard money loan parameters (rate, points, LTV, hold time) and monthly carry costs (tax + insurance + utilities) are configurable, and the loan amount converges iteratively on MAO x LTV -- total HML + carry cost displayed
  3. Buyer/flipper view shows a MAO range (offer at min profit vs offer at max profit) plus MAO as a percentage of ARV, with buy-side closing costs as a configurable input
  4. Wholesaler view shows assignment fee, max purchase price from seller (end buyer MAO minus fee minus closing costs), end buyer's total out-of-pocket, and wholesaler's spread -- all derived from the same inputs without any additional data entry
  5. Switching between buyer/flipper and wholesaler views updates the displayed numbers without losing entered inputs
**Plans:** 2/2 plans complete

Plans:
- [x] 24-01-PLAN.md — Math engine, sell-side costs, HML iterative convergence, buyer/flipper view
- [x] 24-02-PLAN.md — Wholesaler view, view toggle, human verification checkpoint

<details>
<summary>✅ Milestone v1.3 — Rose Park Pilot + User Feedback System (Phases 25, 25.5, 26, 27, 28) — SHIPPED 2026-05-03</summary>

Full phase details archived: [.planning/milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)
Audit: [.planning/milestones/v1.3-MILESTONE-AUDIT.md](milestones/v1.3-MILESTONE-AUDIT.md)

- [x] Phase 25: Rose Park Foundation (2/2 plans) — completed 2026-04-26
- [x] Phase 25.5: Utah Legals SLC Activation *(inserted)* (2/2 plans + Path A pivot) — completed 2026-04-26
- [x] Phase 26: UGRC Rose Park Enrichment (3/3 plans) — completed 2026-05-03
- [x] Phase 27: Map Clustering — *closed without implementation 2026-05-03 (RP-08 descoped)*
- [x] Phase 28: User Feedback System (5/5 plans) — completed 2026-04-28

</details>

## Milestone v1.4 — Team & Access (Phases 29-33)

### Phase 29: RBAC Foundation + Audit Log *(added 2026-04-28)*

**Goal:** Multi-role access control with full audit logging is enforced at the auth/server-action layer so Brian can bring on hires (Stacee, Chris) without granting blanket access — and can verify after the fact that nobody is gaming the lead pipeline
**Depends on:** Phase 10 (auth/users)
**Requirements:** RBAC-01, RBAC-02, RBAC-03, RBAC-04, RBAC-05
**Success Criteria** (what must be TRUE):
  1. `users` table has `roles text[]` and `is_active boolean` columns; existing users (brian@, shawn@, admin@) backfilled with `roles=['owner']` and `is_active=true`
  2. Six built-in roles defined in a `ROLE_GRANTS` permission matrix: `owner`, `acquisition_manager`, `disposition_manager`, `lead_manager`, `transaction_coordinator`, `sales`, `assistant`
  3. Auth callback rejects logins from non-`@no-bshomes.com` emails AND from valid-domain users with `is_active=false` or `roles=[]` — all return null without leaking user existence
  4. `audit_log` + `audit_log_archive` tables exist; every mutating server action wraps writes with `logAudit(actor, action, entity, old, new)`; an Azure Function timer trigger runs daily at 3am UTC to archive >30-day rows and drop >60-day rows
  5. `userCan(roles, action)` helper returns true iff at least one role grants the action; `feedback-admin.isAdmin()` re-routed through `userCan(roles, 'feedback.triage')` (backward compatible for Brian)
  6. Deals gain `acquisition_user_id`, `disposition_user_id`, `coordinator_user_id` nullable FKs; leads gain `lead_manager_id` and `created_by_user_id` — populated by future assignment flows
**Plans:** 1/1 plans complete

Plans:
- [x] 29-01-PLAN.md — Schema migration 0016, day-1 backfill, permissions matrix, audit-log helpers, ~30 server actions wrapped with userCan + logAudit, auditLogArchive Azure Function (RBAC-01..05)

### Phase 30: RBAC UI Gates + Admin Console + Assignment UX *(added 2026-04-28)*

**Goal:** The role-based gates established in Phase 29 are enforced at the UI surface — non-owners cannot see admin pages, role-restricted buttons are hidden (not just disabled), and Brian has an admin console to manage users + an audit-log viewer to investigate after-the-fact
**Depends on:** Phase 29
**Requirements:** RBAC-06, RBAC-07, RBAC-08, RBAC-09, RBAC-10
**Success Criteria** (what must be TRUE):
  1. "My deals" / "My leads" toggles on dashboard, leads, and deals pages filter by current-user assignment; default scope respects role (sales sees only their own, owner sees all)
  2. `gates.ts` enforces 17 role-restricted UI gates (Add Buyer, Tracerfy, Skip Trace, Deal Blast Generator, Reassign, etc.) — buttons absent from DOM for users without grant, not greyed out
  3. `/admin/users` route is URL-gated: non-owners get a 404 server-side; the nav link is also hidden. Owner can create users, set roles, deactivate
  4. `/admin/audit` is nav-hidden but accessible by URL (read-only audit-log viewer with pagination + actor + entity filters) — small trusted team, no need for harder gating
  5. Deal detail "Team" panel shows three assignee slots (acquisition / disposition / coordinator) with role-filtered reassignment dropdowns; auto-fill on status transitions populates the right slot from the right role pool
  6. `canReassignOwn` permits dispositions and coordinators to reassign themselves on their own deals; acquisition stays management-level
**Plans:** 1/1 plans complete

Plans:
- [x] 30-01-PLAN.md — Mine/All toggles, gates.ts, hide-by-role buttons, DealTeamPanel + auto-fill, /admin/users console, /admin/audit log viewer (RBAC-06..10)

### Phase 30.1: Google Workspace OAuth Login *(inserted 2026-04-29)*

**Goal:** New hires can sign in to No BS Workbench with their `@no-bshomes.com` Google Workspace account on first try — no temp-password dance — and Brian gets visibility into pending users so he can grant roles in one click
**Depends on:** Phase 29 (users.roles + is_active), Phase 30 (/admin/users console)
**Requirements:** AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. NextAuth `auth.ts` configures Google provider alongside the existing Credentials provider; both flows work; tsc clean
  2. Google sign-in with an `@no-bshomes.com` email creates (or reuses) a `users` row and returns a session; non-domain emails are rejected at the `signIn` callback
  3. Auto-provisioned users (roles=[]) are redirected to `/pending-approval` on every protected route via middleware until an Owner grants roles via `/admin/users`
  4. Existing users (Brian, Shawn, admin@, Stacee) signing in via Google reuse their existing row — no duplicates created; their `roles` and `id` flow through `session.user`
  5. Login page shows the Google button on top, then a divider, then the existing email/password form. Both flows work
  6. `/admin/users` surfaces pending users (roles=[]) with a yellow "Pending" badge sorted to the top
**Plans:** 1/1 plans complete

Plans:
- [x] 30.1-01-PLAN.md — Google provider + signIn domain gate + auto-provision + middleware redirect + /pending-approval page + login page button + Pending badge in admin users (AUTH-04, AUTH-05)

### Phase 31: Unified Activity Feed *(added 2026-05-01)*

**Goal:** A single chronological activity stream follows every property through dashboard → leads → deals so the team never has to hunt across three views to reconstruct what happened. Replaces the fragmented `lead_notes` / `deal_notes` / `contact_events` / `audit_log` views with one continuous feed
**Depends on:** Phase 28 (feedback activity timeline pattern reused)
**Requirements:** ACT-01, ACT-02, ACT-03, ACT-04, ACT-05
**Success Criteria** (what must be TRUE):
  1. Schema migration 0017 adds `contact_events.actor_user_id` + `contact_events.outcome` (nullable for legacy rows)
  2. `getActivityFeed(propertyId)` returns a unified chronological list pulling from 7 sources: `contact_events`, `lead_notes`, `deal_notes`, deal status changes, `audit_log` (material edits only — chatty actions like comments-added and feedback-* excluded), `property_photos`, `deal_contracts`, and skip-trace `owner_contacts` entries. `getActivityFeedForLead(leadId)` exists for inbound (propertyId=NULL) leads
  3. Every property card on the dashboard shows a compact indicator: `<icon> <last action> · N events` (or "No activity")
  4. Property cards have a small ✚ affordance that opens the Log Activity modal in place — no navigation away. After submit the card refreshes via `revalidatePath('/')`
  5. The Log Activity modal has a type selector (Call / Email / Text / Meeting / Voicemail / Note); per-type fields render below; submit writes to `contact_events` (most types) or `lead_notes` (note type)
  6. `/properties/[id]`, `/leads/[id]`, and `/deals/[id]` all show the same unified feed component with a Log Activity button at top; the deal detail Activity tab uses it (replacing the partial implementation); `/properties/[id]` Notes and Contact tabs continue as filtered views (notes-only and comms-only) of the same feed
  7. Activity entries display with consistent formatting across all sources: actor avatar (initials), action verb, target, relative time, expandable detail row
**Plans:** 1/1 plans complete

Plans:
- [x] 31-01-PLAN.md — Schema 0017, getActivityFeed (7 sources) + getActivityFeedForLead, logActivity server action, ActivityLogModal, ActivityFeed, ActivityCardIndicator, dashboard + 3 detail pages wired (ACT-01..05)

### Phase 32: Dismiss Leads + Archive Deals + Outreach Form Fix *(added 2026-05-01)*

**Goal:** The team can clear noise from the dashboard without losing data — soft-delete leads with reason capture, archive deals when they go quiet, owner-only permanent delete for true junk — and the broken Log-a-call form on `/analytics/outreach` is fixed so call logging works again
**Depends on:** Phase 29 (userCan gates), Phase 31 (activity feed surfaces deletions)
**Requirements:** MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05
**Success Criteria** (what must be TRUE):
  1. Schema migration 0018 adds `leads.dismissed_at + dismissed_by_user_id + dismissed_reason`, `deals.archived_at + archived_by_user_id + archived_reason`, and `dismissed_parcels` table (parcel_id PK)
  2. Dashboard property cards have a × icon top-right that opens a Dismiss modal with required reason dropdown (`wrong_owner` / `already_sold` / `not_in_target` / `duplicate` / `other`); default dashboard query excludes dismissed leads; `?show_dismissed=true` toggle brings them back
  3. When a lead is dismissed, parcel_id is added to `dismissed_parcels` (idempotent INSERT ON CONFLICT DO NOTHING); `scraper/src/lib/upsert.ts` checks `dismissed_parcels` before INSERT and skips suppressed parcels with a console log — so re-scrapes don't recreate dismissed leads
  4. Property detail header shows "Dismiss this lead" when not dismissed; shows "Dismissed by {name} {timeAgo} — {reason}" + Un-dismiss button when dismissed
  5. Deal detail has an "Archive Deal" button in status controls; archived deals show a gray banner; default deals query excludes archived; "Show archived" toggle brings them back
  6. Owner-only Permanent Delete button on property and deal detail behind a confirm modal that requires typing the address (case-insensitive) before the Delete button enables; `dismissed_parcels` row is preserved on hard delete so scraper suppression survives
  7. All dismiss / archive / un-dismiss / un-archive / hard-delete actions are audit-logged and gated by `userCan` checks
  8. `/analytics/outreach` Log-a-call form: Property/Lead dropdown is populated (was broken — empty), filters to deals NOT in closed/dead/archived statuses, supports typeahead search via combobox, redundant Source field removed (deals already carry `lead_source`)
**Plans:** 1/1 plans complete

Plans:
- [x] 32-01-PLAN.md — Schema 0018, dismiss/archive server actions + queries, scraper upsert suppression, dismiss/archive/permanent-delete modals, dashboard + property/deal detail wiring, Log-a-call combobox fix (MGMT-01..05)

### Phase 33: Activity Feed Batch Refactor *(added 2026-05-03)*

**Goal:** The dashboard renders activity-card data (last activity + activity count per property) using a single batched query instead of N+1 per-property fan-out, eliminating the connection-storm failure mode that took both `finder.no-bshomes.com` and `no-bshomes.com` offline on 2026-05-02 and allowing the pg pool to return to safe serverless defaults (`max:3`, `idleTimeoutMillis:10000`).

**Depends on:** Phase 31 (Unified Activity Feed — defines the source-of-truth `getActivityFeed` shape and 7-source UNION pattern that this phase batches)

**Requirements:** PERF-01 (single-query dashboard activity), PERF-02 (pool config returns to serverless-safe defaults), OPS-07 (commit orphaned `seed-config.ts` SLC neighborhood-list edit)

**Success Criteria** (what must be TRUE):
  1. The dashboard route (`src/app/(dashboard)/page.tsx`) issues exactly **one** SQL query for activity-feed-on-card data, regardless of how many property cards are rendered (verified by query log or `pg_stat_statements`)
  2. `pg_stat_activity` shows ~3 sustained connections during sustained dashboard reload (5+ reloads back-to-back) — no spike past 10 connections from this app
  3. Visible `lastActivity` description and `activityCount` value for each rendered property card is **identical** to pre-refactor output for the same dataset (compare against a sample of 5+ properties before/after)
  4. Both `finder.no-bshomes.com` and `no-bshomes.com` remain reachable under repeated dashboard navigation — no server-side exception digests appear
  5. `app/src/db/client.ts` is reverted to `max: 3, idleTimeoutMillis: 10000` and that change is in the same shipped commit as the LATERAL refactor (no half-state where pool stays at `max:20` after the N+1 is fixed)
  6. `app/src/db/seed-config.ts` SLC-neighborhoods edit (currently uncommitted) is committed as part of this phase — `git status` clean after merge per the post-Phase-32 hygiene rule
  7. `next lint` and `tsc --noEmit` clean before the commit lands (per `feedback_lint_before_commit.md`)
  8. Existing `getActivityFeed(propertyId)` and `getActivityFeedForLead(leadId)` continue to work unchanged — detail pages (properties/leads/deals) still load full feeds correctly

**Plans:** 1/1 plans complete

Plans:
- [x] 33-01-PLAN.md — Batched dashboard activity query (PERF-01) + pg pool revert (PERF-02) + orphaned seed-config commit (OPS-07), all in one atomic shipping unit

### Phase 34: JV Partner Lead Pipeline *(added 2026-05-03)*

**Goal:** Brian and his JV "driver" partners can submit, triage, track, and pay for motivated-seller lead referrals end-to-end inside No BS Workbench — replacing the manual SMS-photo-Venmo workflow with a mobile lead-intake form, a triage queue, an automatic per-partner payment ledger driven by the existing deal lifecycle, and a monthly batch payment-run report — per the No-BS Homes JV Partner Lead Referral Agreement.

**Depends on:** Phase 29 (RBAC + audit log — adds `jv_partner` role to `ROLE_GRANTS`), Phase 30 (admin user provisioning — Brian creates JV partner accounts in `/admin/users`), Phase 14 (mobile photo capture — reuses the front-of-property photo upload pattern), Phase 31 (unified activity feed — JV submissions log into the same feed)

**Requirements:** [JV-01, JV-02, JV-03, JV-04, JV-05, JV-06, JV-07, JV-08, JV-09, JV-10, JV-11, JV-12, JV-13, JV-14, JV-15] — see `REQUIREMENTS.md > v1.4 Requirements > JV Partner Lead Pipeline`

**Success Criteria** (what must be TRUE):
  1. New `jv_partner` role exists in `app/src/lib/permissions.ts` `ROLE_GRANTS` with explicit per-action grants scoped to: submit own leads, view own ledger. NO grants for full lead pipeline, deals, buyers, contracts, Tracerfy, Skip Trace, Deal Blast, etc.
  2. Brian provisions a JV partner account in `/admin/users` (existing console from Phase 30) by selecting the `jv_partner` role from the role dropdown — no Google auto-provision changes, no external auth surface.
  3. A logged-in `jv_partner` reaches a mobile-first lead-submission form from the bottom nav. The form requires: full address, at least one photo of the front of the property (camera or gallery, reuses the Phase 14 upload pattern → Azure Blob), and condition notes (free-text). Submit creates a pending JV-lead record linked to the submitting user.
  4. Brian's triage queue (`/jv-leads` or similar, owner-gated) shows pending JV submissions sorted oldest-first with submitter name, address, photo thumbnail, condition notes, dedup hint (matches against existing `properties.address` + prior JV submissions of the same parcel). Accept/Reject buttons; accept against Section 3 criteria, reject requires a reason.
  5. Accepting a JV lead creates (or links to) a row in the existing `properties` table (with the JV photo attached and the JV partner stored as `lead_source`). The pipeline thereafter is the existing one — the JV submission carries its `jv_lead_id` link forward through any deal that materializes.
  6. Each accepted lead automatically generates the $10 "qualified" payment milestone in the JV ledger. When a property linked to a JV lead transitions to a deal with first contact_event logged (i.e. negotiation file opened), the $15 "active follow-up" milestone is created. When a deal linked to a JV lead transitions to status `closed`, the $500 "deal closes" milestone is created. All milestones are idempotent (re-running transitions does not double-pay).
  7. Each `jv_partner` sees their own ledger at `/jv-ledger`: list of submitted leads with current status (pending / accepted / rejected), each accepted lead's milestone status (earned / paid / not yet), running total owed for the current month. Cannot see other partners' submissions or ledgers.
  8. Owner sees an aggregated payment-run page (`/admin/jv-payments`): for each partner, current month's earned-but-unpaid milestones with paid/unpaid checkboxes, a "Mark all paid as of {date}" action, and a printable/downloadable monthly summary. Marking paid is logged in the audit log and idempotent.
  9. Submissions, accepts, rejects, status transitions, and payments are all written to the unified activity feed (Phase 31) and the audit log (Phase 29).
  10. `next lint` and `tsc --noEmit` clean before commit (per `feedback_lint_before_commit.md`); `git status` clean per the post-Phase-32 hygiene rule.

**Plans:** 2/5 plans executed

Plans:
- [x] 34-01-PLAN.md — DB schema + migration 0019 + jv_partner role + jv-milestones helpers + jv-leads blob container + admin role-picker option (JV-01, JV-02, JV-15)
- [x] 34-02-PLAN.md — submitJvLead server action + photo upload API + mobile submission form + bottom-nav/sidebar/middleware role gates + redirect to /jv-ledger (JV-03, JV-04, JV-13, JV-14, JV-15)
- [ ] 34-03-PLAN.md — Triage queue at /jv-leads with dedup hints + acceptJvLead/rejectJvLead actions + property+lead upsert + qualified milestone trigger (JV-05, JV-06, JV-15)
- [ ] 34-04-PLAN.md — active_follow_up + deal_closed milestone hooks into logActivity + updateDealStatus + per-partner ledger at /jv-ledger (JV-07, JV-08, JV-11, JV-15)
- [ ] 34-05-PLAN.md — Payment-run admin page + race-safe markMilestonesPaid + 5 Resend notifications + end-to-end production human-verify checkpoint (JV-09, JV-10, JV-11, JV-12, JV-15)

