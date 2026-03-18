# Requirements: HouseFinder

**Defined:** 2026-03-17
**Core Value:** Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data Collection

- [ ] **DATA-01**: System scrapes Carbon County (Price, UT) assessor records daily for property owner, address, tax status, and mortgage info
- [ ] **DATA-02**: System scrapes Carbon County recorder for NOD (Notice of Default) and lis pendens filings
- [ ] **DATA-03**: System scrapes tax delinquency records for properties with unpaid taxes
- [ ] **DATA-04**: System expands scraping to ~10 similar small Utah towns/counties (Emery, Sanpete, Juab, Millard, Sevier, Grand, San Juan, Wayne, Piute, Duchesne)
- [ ] **DATA-05**: System detects probate/estate filings from Utah court records and matches to property addresses
- [ ] **DATA-06**: System detects vacant/neglected properties from code violation records and utility shutoff data where available
- [x] **DATA-07**: System tracks first-seen date per property for new lead detection
- [ ] **DATA-08**: System runs daily automated scraping on a scheduled basis
- [x] **DATA-09**: System stores all scraped data in a persistent database with property as canonical entity

### Distress Scoring

- [x] **SCORE-01**: System assigns distress signals per property (NOD, tax delinquent, lis pendens, probate, vacant, code violation)
- [ ] **SCORE-02**: System calculates a distress score based on count of active signals per property
- [ ] **SCORE-03**: System flags properties with 2+ distress signals as "hot leads"
- [x] **SCORE-04**: System distinguishes between signal types and displays each on property detail

### Lead Dashboard

- [ ] **DASH-01**: User can view a list of all distressed properties in their target area
- [ ] **DASH-02**: User can filter properties by city, county, distress type, and hot lead status
- [ ] **DASH-03**: User can sort properties by distress score, date added, or city
- [ ] **DASH-04**: User can see a "new since last visit" badge on recently discovered properties
- [ ] **DASH-05**: Dashboard is mobile-first responsive design with large tap targets
- [ ] **DASH-06**: User can configure which cities/counties are in their target scope

### Property Detail

- [ ] **PROP-01**: User can view a detail page for each property showing address, owner name, tax status, mortgage info, and all available public data
- [ ] **PROP-02**: User can see all active distress signals with dates on the property detail page
- [ ] **PROP-03**: User can see the property's distress score and hot lead status
- [ ] **PROP-04**: User can see owner contact information (phone number) when available from free sources

### Lead Management

- [ ] **LEAD-01**: User can set lead status per property (New, Contacted, Follow-Up, Closed, Dead)
- [ ] **LEAD-02**: User can add timestamped notes to any lead
- [ ] **LEAD-03**: User can view their full pipeline by status (e.g., "show me all Follow-Ups")
- [ ] **LEAD-04**: System flags leads where no contact info was found as "manual skip trace needed"

### Contact Lookup

- [ ] **CONTACT-01**: System pulls owner name from county assessor data for every property
- [ ] **CONTACT-02**: System cross-references voter registration rolls to find owner phone numbers for free
- [ ] **CONTACT-03**: System displays a "manual skip trace needed" flag when free sources don't yield contact info
- [ ] **CONTACT-04**: User can tap-to-call owner phone number directly from mobile (tel: link)

### Alerts

- [ ] **ALERT-01**: System sends email alert via Resend when a new hot lead (2+ signals) is detected
- [ ] **ALERT-02**: System sends SMS alert for urgent hot leads (3+ signals or imminent auction timeline)
- [ ] **ALERT-03**: Email includes property address, distress signals, owner name, and link to detail page
- [ ] **ALERT-04**: SMS includes property address and link to detail page for quick mobile access

### Map View

- [ ] **MAP-01**: User can view properties on an interactive map with pins colored by distress score
- [ ] **MAP-02**: User can filter map by distress type, city, and hot lead status
- [ ] **MAP-03**: User can click a map pin to see property summary and link to detail page
- [ ] **MAP-04**: Map is mobile-friendly with touch gestures (pinch-to-zoom, pan)

### Authentication

- [ ] **AUTH-01**: User can log in with email and password
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: Unauthenticated users are redirected to login page

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
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-07 | Phase 1 | Complete |
| DATA-08 | Phase 1 | Pending |
| DATA-09 | Phase 1 | Complete |
| SCORE-01 | Phase 1 | Complete |
| SCORE-02 | Phase 1 | Pending |
| SCORE-03 | Phase 1 | Pending |
| SCORE-04 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 2 | Pending |
| DASH-03 | Phase 2 | Pending |
| DASH-04 | Phase 2 | Pending |
| DASH-05 | Phase 2 | Pending |
| DASH-06 | Phase 2 | Pending |
| PROP-01 | Phase 2 | Pending |
| PROP-02 | Phase 2 | Pending |
| PROP-03 | Phase 2 | Pending |
| PROP-04 | Phase 2 | Pending |
| LEAD-01 | Phase 2 | Pending |
| LEAD-02 | Phase 2 | Pending |
| LEAD-03 | Phase 2 | Pending |
| LEAD-04 | Phase 2 | Pending |
| CONTACT-01 | Phase 3 | Pending |
| CONTACT-02 | Phase 3 | Pending |
| CONTACT-03 | Phase 3 | Pending |
| CONTACT-04 | Phase 3 | Pending |
| ALERT-01 | Phase 3 | Pending |
| ALERT-02 | Phase 3 | Pending |
| ALERT-03 | Phase 3 | Pending |
| ALERT-04 | Phase 3 | Pending |
| DATA-04 | Phase 4 | Pending |
| DATA-05 | Phase 4 | Pending |
| DATA-06 | Phase 4 | Pending |
| MAP-01 | Phase 5 | Pending |
| MAP-02 | Phase 5 | Pending |
| MAP-03 | Phase 5 | Pending |
| MAP-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 32 total
- Mapped to phases: 32
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-03-17 — traceability populated after roadmap creation*
