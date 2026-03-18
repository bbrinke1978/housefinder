# Roadmap: HouseFinder

## Overview

HouseFinder delivers a single-user lead generation tool for distressed properties in rural Utah. The build order follows a hard dependency chain: data must exist before a dashboard can display it, scoring must be validated before alerts fire, one county must work end-to-end before expanding to nine more, and the map requires geocoded addresses from a live pipeline. Phase 1 establishes the entire data foundation. Phases 2-3 build the application and alert layers on top of real data. Phase 4 scales scraping to the full target geography. Phase 5 completes the map and contact enrichment features that depend on a full pipeline being live.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - Scraping pipeline, database schema, and distress scoring for Carbon County (Price, UT) working end-to-end (completed 2026-03-18)
- [ ] **Phase 2: Core Application** - Authenticated dashboard, property detail, and lead management built against real pipeline data
- [ ] **Phase 3: Contact and Alerts** - Owner contact lookup from free sources and hot lead email/SMS alerts
- [ ] **Phase 4: County Expansion** - Scraper coverage expanded to all ~10 target Utah counties
- [ ] **Phase 5: Map View** - Geographic map browsing with distress-scored property pins

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
**Plans:** 5 plans
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
**Plans**: TBD

### Phase 4: County Expansion
**Goal**: All ~10 target Utah counties are scraped daily and their distressed properties appear in the same pipeline as Carbon County
**Depends on**: Phase 1
**Requirements**: DATA-04, DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. Properties from Emery, Sanpete, Juab, Millard, Sevier, Grand, San Juan, Wayne, Piute, and Duchesne counties appear in the database alongside Carbon County records
  2. Probate and estate filings from Utah court records are matched to property addresses and recorded as a distinct distress signal type
  3. Vacant and neglected properties detected from code violation records or utility shutoff data appear with their own signal type where county data is available
  4. Per-county scraper health status is visible — each county shows its last successful scrape timestamp independently so a failing county is immediately identifiable
**Plans**: TBD

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

Note: Phase 4 depends on Phase 1 only (not Phase 3). Phases 2 and 3 can be completed before Phase 4 begins, as planned. This is the optimal order.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 0/4 | Complete    | 2026-03-18 |
| 2. Core Application | 0/5 | Not started | - |
| 3. Contact and Alerts | 0/? | Not started | - |
| 4. County Expansion | 0/? | Not started | - |
| 5. Map View | 0/? | Not started | - |
