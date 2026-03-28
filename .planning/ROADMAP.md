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
- [ ] **Phase 6: Data Analytics & Insights** - Track everything, surface patterns, and make data-driven investment decisions

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
**Plans**: TBD

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
| 6. Data Analytics & Insights | 0/? | Not started | - |

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
**Plans:** 3/4 plans executed

Plans:
- [ ] 08-01-PLAN.md — Schema (deals, buyers, deal_notes), types, navigation, seed data
- [ ] 08-02-PLAN.md — Deal pipeline page with kanban/list views, deal CRUD, new deal form
- [ ] 08-03-PLAN.md — Deal detail page with MAO calculator, contract tracker, notes
- [ ] 08-04-PLAN.md — Buyer management, deal blast generator, "Start Deal" integration
