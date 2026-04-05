# Roadmap: HouseFinder

## Overview

HouseFinder delivers a single-user lead generation tool for distressed properties in rural Utah. The build order follows a hard dependency chain: data must exist before a dashboard can display it, scoring must be validated before alerts fire, one county must work end-to-end before expanding to nine more, and the map requires geocoded addresses from a live pipeline. Phase 1 establishes the entire data foundation. Phases 2-3 build the application and alert layers on top of real data. Phase 4 scales scraping to the full target geography. Phase 5 completes the map and contact enrichment features that depend on a full pipeline being live.

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
**Plans**: TBD

### Phase 6: Data Analytics & Insights
**Goal**: The investor has full visibility into lead pipeline performance, market trends, outreach effectiveness, and scraper health — enabling data-driven decisions about which markets to focus on, when to act, and what's working
**Depends on**: Phase 3
**Requirements**: ANALYTICS-01, ANALYTICS-02, ANALYTICS-03, ANALYTICS-04, ANALYTICS-05, ANALYTICS-06, ANALYTICS-07, ANALYTICS-08
**Success Criteria** (what must be TRUE):
  1. An analytics dashboard shows pipeline conversion rates: how many leads move from New → Contacted → Closed, with average time at each stage
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
**Plans:** 3 plans

Plans:
- [ ] 14-01-PLAN.md — Schema (property_photos, photo_category enum), blob storage extension, server actions, query functions
- [ ] 14-02-PLAN.md — Photo upload component (dual iOS input, batch, progress), photo gallery with YARL lightbox, Photos tab on deal detail
- [ ] 14-03-PLAN.md — Photo FAB, Photo Inbox page, sidebar nav, deal card thumbnails, deal blast cover photo, property-to-deal carry-over

### Phase 15: Blueprints & Floor Plans

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 14
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 15 to break down)

### Phase 16: Buyers List CRM

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 15
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 16 to break down)

### Phase 17: KPI Agent Scoring Dashboard

**Goal:** [To be planned]
**Requirements**: TBD
**Depends on:** Phase 16
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 17 to break down)
