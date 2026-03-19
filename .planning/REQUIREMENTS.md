# Requirements: HouseFinder

**Defined:** 2026-03-17
**Core Value:** Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Collection

- [x] **DATA-01**: System scrapes Carbon County (Price, UT) assessor records daily for property owner, address, tax status, and mortgage info
- [x] **DATA-02**: System scrapes Carbon County recorder for NOD (Notice of Default) and lis pendens filings
- [x] **DATA-03**: System scrapes tax delinquency records for properties with unpaid taxes
- [x] **DATA-04**: System expands scraping to ~10 similar small Utah towns/counties (Emery, Sanpete, Juab, Millard, Sevier, Grand, San Juan, Wayne, Piute, Duchesne)
- [x] **DATA-05**: System detects probate/estate filings from Utah court records and matches to property addresses
- [x] **DATA-06**: System detects vacant/neglected properties from code violation records and utility shutoff data where available
- [ ] **DATA-10**: Fix Juab County scraper — dynamically discover delinquent tax PDF URL from WordPress posts and parse alphanumeric parcel format
- [x] **DATA-07**: System tracks first-seen date per property for new lead detection
- [x] **DATA-08**: System runs daily automated scraping on a scheduled basis
- [x] **DATA-09**: System stores all scraped data in a persistent database with property as canonical entity

### Distress Scoring

- [x] **SCORE-01**: System assigns distress signals per property (NOD, tax delinquent, lis pendens, probate, vacant, code violation)
- [x] **SCORE-02**: System calculates a weighted distress score from active signals per property (configurable weights per signal type)
- [x] **SCORE-03**: System flags properties with weighted score >= configurable threshold as "hot leads" (default threshold: 4, with NOD=3, tax_lien=2, lis_pendens=2)
- [x] **SCORE-04**: System distinguishes between signal types and displays each on property detail

### Lead Dashboard

- [x] **DASH-01**: User can view a list of all distressed properties in their target area
- [x] **DASH-02**: User can filter properties by city, county, distress type, and hot lead status
- [x] **DASH-03**: User can sort properties by distress score, date added, or city
- [x] **DASH-04**: User can see a "new since last visit" badge on recently discovered properties
- [x] **DASH-05**: Dashboard is mobile-first responsive design with large tap targets
- [x] **DASH-06**: User can configure which cities/counties are in their target scope

### Property Detail

- [x] **PROP-01**: User can view a detail page for each property showing address, owner name, tax status, mortgage info, and all available public data
- [x] **PROP-02**: User can see all active distress signals with dates on the property detail page
- [x] **PROP-03**: User can see the property's distress score and hot lead status
- [x] **PROP-04**: User can see owner contact information (phone number) when available from free sources

### Lead Management

- [x] **LEAD-01**: User can set lead status per property (New, Contacted, Follow-Up, Closed, Dead)
- [x] **LEAD-02**: User can add timestamped notes to any lead
- [x] **LEAD-03**: User can view their full pipeline by status (e.g., "show me all Follow-Ups")
- [x] **LEAD-04**: System flags leads where no contact info was found as "manual skip trace needed"

### Contact Lookup

- [x] **CONTACT-01**: System pulls owner name from county assessor data for every property
- [x] **CONTACT-02**: System provides owner phone lookup infrastructure (owner_contacts table, manual entry on Contact tab, skip trace flag with free search site links) — automated voter roll lookup infeasible per research (Utah voter data excludes phone numbers)
- [x] **CONTACT-03**: System displays a "manual skip trace needed" flag when free sources don't yield contact info
- [x] **CONTACT-04**: User can tap-to-call owner phone number directly from mobile (tel: link)

### Alerts

- [x] **ALERT-01**: System sends email alert via Resend when a new hot lead (2+ signals) is detected
- [x] **ALERT-02**: System sends SMS alert for urgent hot leads (3+ signals or imminent auction timeline)
- [x] **ALERT-03**: Email includes property address, distress signals, owner name, and link to detail page
- [x] **ALERT-04**: SMS includes property address and link to detail page for quick mobile access

### Map View

- [x] **MAP-01**: User can view properties on an interactive map with pins colored by distress score
- [x] **MAP-02**: User can filter map by distress type, city, and hot lead status
- [x] **MAP-03**: User can click a map pin to see property summary and link to detail page
- [x] **MAP-04**: Map is mobile-friendly with touch gestures (pinch-to-zoom, pan)

### Authentication

- [x] **AUTH-01**: User can log in with email and password
- [x] **AUTH-02**: User session persists across browser refresh
- [x] **AUTH-03**: Unauthenticated users are redirected to login page

### Data Analytics

- [ ] **ANALYTICS-01**: User can view pipeline conversion funnel showing lead progression rates (New → Contacted → Follow-Up → Closed/Dead) with average time at each stage
- [ ] **ANALYTICS-02**: User can compare markets showing which cities/counties produce the most hot leads, highest conversion rates, and fastest deal timelines
- [ ] **ANALYTICS-03**: User can track outreach activity per lead — call attempts, outcomes (answered/voicemail/no-answer/wrong-number), and contact rates by source
- [ ] **ANALYTICS-04**: User can view trend charts showing distressed property volume over time per city/county to spot markets heating up or cooling down
- [ ] **ANALYTICS-05**: User can view scraper health dashboard showing per-county success rates, data freshness, and degrading source alerts
- [ ] **ANALYTICS-06**: User can see which distress signal types (NOD, tax lien, etc.) produce the most conversions — lead source attribution
- [ ] **ANALYTICS-07**: System captures all user actions (calls, notes, status changes) with timestamps in an activity log for personal productivity review
- [ ] **ANALYTICS-08**: User can export all analytics data to CSV for external analysis

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Expansion

- **EXP-01**: System extends to Utah towns beyond initial ~10 based on lead conversion results
- **EXP-02**: PWA home screen installability with app-like experience
- **EXP-03**: Export leads to CSV for manual mail campaigns

### Advanced Contact

- **ADV-01**: Integration with paid skip tracing API as optional upgrade
- **ADV-02**: Automated follow-up reminder scheduling per lead

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Paid skip tracing integration | Breaks zero-cost constraint; manual process is sufficient at this scale |
| Auto-dialer / predictive dialing | Rural Utah lists are small (dozens, not thousands); manual calls are fine |
| Direct mail campaigns | Ongoing cost per send; phone contact is primary outreach method |
| MLS / on-market listing data | Requires REALTOR membership or paid API; not needed for off-market leads |
| Native iOS/Android app | Responsive web + PWA achieves 90% of value without App Store complexity |
| Multi-user / team management | Single user tool; team features are v2+ if product finds multi-investor use |
| Deal analyzer / ROI calculator | Substantial complexity; use free external tools (BiggerPockets, DealCheck) |
| Markets outside Utah | Start small, expand later based on results |
| Real-time push notifications | Email + SMS is sufficient; push adds service worker complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-07 | Phase 1 | Complete |
| DATA-08 | Phase 1 | Complete |
| DATA-09 | Phase 1 | Complete |
| SCORE-01 | Phase 1 | Complete |
| SCORE-02 | Phase 1 | Complete |
| SCORE-03 | Phase 1 | Complete |
| SCORE-04 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| DASH-01 | Phase 2 | Complete |
| DASH-02 | Phase 2 | Complete |
| DASH-03 | Phase 2 | Complete |
| DASH-04 | Phase 2 | Complete |
| DASH-05 | Phase 2 | Complete |
| DASH-06 | Phase 2 | Complete |
| PROP-01 | Phase 2 | Complete |
| PROP-02 | Phase 2 | Complete |
| PROP-03 | Phase 2 | Complete |
| PROP-04 | Phase 2 | Complete |
| LEAD-01 | Phase 2 | Complete |
| LEAD-02 | Phase 2 | Complete |
| LEAD-03 | Phase 2 | Complete |
| LEAD-04 | Phase 2 | Complete |
| CONTACT-01 | Phase 3 | Complete |
| CONTACT-02 | Phase 3 | Complete |
| CONTACT-03 | Phase 3 | Complete |
| CONTACT-04 | Phase 3 | Complete |
| ALERT-01 | Phase 3 | Complete |
| ALERT-02 | Phase 3 | Complete |
| ALERT-03 | Phase 3 | Complete |
| ALERT-04 | Phase 3 | Complete |
| DATA-04 | Phase 4 | Complete |
| DATA-05 | Phase 4 | Complete |
| DATA-06 | Phase 4 | Complete |
| MAP-01 | Phase 5 | Complete |
| MAP-02 | Phase 5 | Complete |
| MAP-03 | Phase 5 | Complete |
| MAP-04 | Phase 5 | Complete |
| ANALYTICS-01 | Phase 6 | Pending |
| ANALYTICS-02 | Phase 6 | Pending |
| ANALYTICS-03 | Phase 6 | Pending |
| ANALYTICS-04 | Phase 6 | Pending |
| ANALYTICS-05 | Phase 6 | Pending |
| ANALYTICS-06 | Phase 6 | Pending |
| ANALYTICS-07 | Phase 6 | Pending |
| ANALYTICS-08 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-18 — added Phase 6 analytics requirements*
