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
- [ ] **DATA-11**: System identifies vacant land vs improved properties using assessor property type or improvement value, and filters out vacant land (no structure) from the dashboard

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

- [x] **ANALYTICS-01**: User can view pipeline conversion funnel showing lead progression rates (New → Contacted → Follow-Up → Closed/Dead) with average time at each stage
- [x] **ANALYTICS-02**: User can compare markets showing which cities/counties produce the most hot leads, highest conversion rates, and fastest deal timelines
- [x] **ANALYTICS-03**: User can track outreach activity per lead — call attempts, outcomes (answered/voicemail/no-answer/wrong-number), and contact rates by source
- [x] **ANALYTICS-04**: User can view trend charts showing distressed property volume over time per city/county to spot markets heating up or cooling down
- [x] **ANALYTICS-05**: User can view scraper health dashboard showing per-county success rates, data freshness, and degrading source alerts
- [x] **ANALYTICS-06**: User can see which distress signal types (NOD, tax lien, etc.) produce the most conversions — lead source attribution
- [x] **ANALYTICS-07**: System captures all user actions (calls, notes, status changes) with timestamps in an activity log for personal productivity review
- [x] **ANALYTICS-08**: User can export all analytics data to CSV for external analysis

### Wholesaling Deal Flow

- [x] **DEAL-01**: User can manage deals in a kanban pipeline with 10 statuses (Lead, Qualified, Analyzed, Offered, Under Contract, Marketing, Assigned, Closing, Closed, Dead) and drag-and-drop status updates
- [x] **DEAL-02**: MAO calculator computes MAO = ARV x 0.70 - Repairs - Wholesale Fee with auto-calculated profit, ROI, deal score, and sensitivity analysis (ARV -10%, repairs +20%)
- [x] **DEAL-03**: Seller qualification captures 4 pillars (condition, timeline, price, motivation) with hot seller indicator for high-urgency combinations
- [x] **DEAL-04**: Buyer database stores cash buyers with name, phone, email, buy box, price range, funding type, target areas, and rehab tolerance — with buyer-to-deal matching by price range
- [x] **DEAL-05**: Deal blast generates formatted marketing text (address, price, ARV, repairs, assignment fee, closing date, photo URL) with one-click copy to clipboard
- [x] **DEAL-06**: Contract tracking shows status progression (sent, signed, in escrow, title clear, closing scheduled) with earnest money tracking and inspection deadline countdown
- [x] **DEAL-07**: "Start Deal" button on property detail page creates a new deal pre-filled with existing property data (address, owner name, contact info)
- [x] **DEAL-08**: Two preloaded seed deals (Sullivan Rd Ogden and Delta 496 W 300 N) populate the pipeline for immediate use

### Rehab Budgeting & Cost Analysis

- [x] **BUDGET-01**: User can create a rehab budget per deal with 19 default categories (Demo, Foundation, Framing, Roofing, Exterior, Windows/Doors, Plumbing, Electrical, HVAC, Insulation, Drywall, Paint, Flooring, Kitchen, Bathrooms, Interior Trim, Landscaping, Permits, Miscellaneous), auto-populated from the deal's repair_estimate
- [x] **BUDGET-02**: User can add expenses manually against budget categories with vendor, amount, date, description, and notes — with running totals per category
- [x] **BUDGET-03**: User can upload receipt photos from phone camera or file picker, with Azure Document Intelligence OCR auto-scanning to extract vendor, date, and total for expense pre-fill
- [x] **BUDGET-04**: Visual budget health via category progress bars (green/yellow/red), Recharts pie chart (spending by category), and grouped bar chart (planned vs actual per category)
- [x] **BUDGET-05**: Profit/break-even/loss indicators show whether actual costs stay under (profitable), match (break-even), or exceed (loss) the deal's repair_estimate — using MAO math
- [x] **BUDGET-06**: 10% contingency reserve auto-added on top of planned total, with warning when spending eats into contingency
- [x] **BUDGET-07**: Budget summary (category/planned/actual/variance) and detailed expenses exportable to CSV
- [x] **BUDGET-08**: Alert banners at 80% budget usage (yellow warning) and 100%+ (red over-budget), displayed on budget tab

### UI Revamp

- [x] **UI-01**: App uses a premium dark-first color palette (zinc neutrals + violet accent) replacing the terracotta/desert theme — dark mode as primary with light mode option
- [x] **UI-02**: App uses Inter variable font via next/font/google replacing Bebas Neue, Oswald, and Nunito Sans — single font system matching Linear/Notion aesthetic
- [x] **UI-03**: Navigation uses polished sidebar on desktop and bottom nav on mobile with violet active states, 44px minimum touch targets, and active indicator dot
- [x] **UI-04**: Dashboard stats bar is a compact horizontal scroll row (~56px) instead of 5 large cards, and hero banner replaced with compact text header
- [x] **UI-05**: Dashboard filters are hidden behind a Sheet drawer on mobile with active filter count badge, search always visible — desktop keeps inline filters
- [x] **UI-06**: Login page has premium dark aesthetic with centered card, violet accent line, and polished form inputs
- [x] **UI-07**: All pages (deals, analytics, property detail, deal detail, pipeline, settings, map) use semantic color tokens with zero remnants of old palette — including responsive chart colors and mobile kanban horizontal scroll
- [x] **UI-08**: Command palette (Ctrl+K / Cmd+K) provides keyboard navigation to all major pages via shadcn Command + Dialog components

### Email & Call Campaigns

- [x] **CAMP-01**: System stores email sequence definitions (name, steps with subject/body/delay) and campaign enrollment state in PostgreSQL
- [x] **CAMP-02**: System stores contact event types (called_client, left_voicemail, emailed_client, sent_text, met_in_person, received_email) with notes and timestamps in a contact_events table
- [x] **CAMP-03**: User can log contact events (6 types) from the property detail page Contact tab with optional notes
- [x] **CAMP-04**: Activity timeline on property detail shows all contact events, notes, and sent emails chronologically
- [x] **CAMP-05**: Touchpoint count badge appears on dashboard property cards showing total contact events per lead; call script modal shows configurable talk track with lead details pre-filled
- [x] **CAMP-06**: User can create, edit, and manage email sequences with configurable multi-step drip delays from a Campaigns page accessible via sidebar navigation
- [x] **CAMP-07**: Mail Settings page (gear icon in sidebar) stores from name, from email, reply-to, Resend API key, phone number, and email signature template
- [x] **CAMP-08**: User can enroll a lead in a sequence from property detail page — step 0 sends immediately via Resend; one active enrollment per lead enforced
- [x] **CAMP-09**: User can bulk-select leads from dashboard and enroll them in a sequence; leads without contact email show clear disabled state
- [x] **CAMP-10**: Outreach emails use react-email templates with merge fields ({firstName}, {address}, {city}, {senderName}, {phone}) and auto-appended email signature
- [x] **CAMP-11**: Follow-up emails dispatch automatically daily via Azure Functions timer trigger for enrollments where nextSendAt is past due, with idempotency protection against duplicate sends
- [x] **CAMP-12**: Enrollments auto-stop when lead's deal status changes to closed or dead; activity timeline visible on deal detail pages

### Contract & E-Signature

- [x] **CONTRACT-01**: System stores contract definitions (purchase agreement and assignment types) with deal linkage, parties, financial terms, and editable clauses in PostgreSQL
- [x] **CONTRACT-02**: System stores signer records with unique signing tokens, expiration, signature data (drawn/typed), IP address, user agent, and document hash for legal audit trail
- [x] **CONTRACT-03**: Standard Utah wholesale contract templates with default clauses (as-is condition, inspection period, earnest money, closing timeline, assignment clause, default & remedies) auto-populate on contract creation
- [x] **CONTRACT-04**: Contract creation auto-fills all available deal data: property address, city, county, parcel ID, seller name, offer price, ARV, assignment fee
- [x] **CONTRACT-05**: User can review and edit contract before sending — add, remove, modify, and reorder clauses per deal
- [x] **CONTRACT-06**: Contracts tab on deal detail page shows all contracts for that deal with status badges and action buttons (send, void, resend, download)
- [x] **CONTRACT-07**: Global Contracts page shows all contracts across all deals with status filtering and deal links
- [x] **CONTRACT-08**: Sidebar navigation includes Contracts link between Deals and Campaigns
- [x] **CONTRACT-09**: Contract PDF generated server-side via @react-pdf/renderer with property details, parties, financial terms, clauses, signature lines, and audit trail page
- [x] **CONTRACT-10**: User can preview contract as downloadable PDF before sending
- [x] **CONTRACT-11**: Public signing page (/sign/[token]) allows sellers and buyers to sign without a HouseFinder account — token-gated with 72-hour default expiration
- [x] **CONTRACT-12**: Signer can draw (canvas) or type their signature on mobile or desktop; canvas uses Pointer Events with touchAction:none for iOS Safari compatibility
- [x] **CONTRACT-13**: Signing page validates token expiration and already-signed status, showing appropriate messages for expired or completed links
- [x] **CONTRACT-14**: Signing invitation email sent via Resend with prominent "Sign Now" CTA button linking to /sign/[token]
- [x] **CONTRACT-15**: Contract lifecycle: Draft -> Sent (email) -> Seller Signed -> Countersigned -> Executed; countersign link sent automatically after first signature; fully executed PDF emailed to both parties
- [x] **CONTRACT-16**: Deal auto-advances to "Under Contract" status and active campaign enrollment auto-stops (stopReason: contract_executed) when purchase agreement reaches Executed status

### Mobile Photo Capture

- [x] **PHOTO-01**: User can upload multiple photos from phone camera or gallery with client-side compression (1600px max, JPEG 80% quality) and per-file upload progress indicators
- [x] **PHOTO-02**: Photos are organized by predefined area categories (Exterior, Kitchen, Bathroom, Living, Bedroom, Garage, Roof, Foundation, Yard, Other) with tag selection during upload; first Exterior photo auto-selected as cover
- [ ] **PHOTO-03**: Deal detail photo gallery displays photos grouped by category in a responsive grid with full-screen lightbox (swipe navigation, caption overlay) via yet-another-react-lightbox
- [ ] **PHOTO-04**: Photo Inbox page (/photos/inbox) stores unassigned captures for later review and assignment to deals — accessible from sidebar navigation
- [ ] **PHOTO-05**: Floating action button (FAB) on mobile views opens camera for quick single-photo capture to inbox, positioned above MobileBottomNav
- [x] **PHOTO-06**: Photos can be attached to properties OR deals; property photos carry over to deal automatically when "Start Deal" creates a deal from that property
- [ ] **PHOTO-07**: Deal cards in deals list show cover photo thumbnail (48x48) when a cover photo exists
- [ ] **PHOTO-08**: Deal blast generator auto-populates cover photo SAS URL in the "Photos:" line; field remains editable for manual override
- [x] **PHOTO-09**: User can manually delete photos, set/change cover photo, and edit captions from the deal detail Photos tab

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Expansion

- **EXP-01**: System extends to Utah towns beyond initial ~10 based on lead conversion results
- **EXP-02**: PWA home screen installability with app-like experience
- **EXP-03**: Export leads to CSV for manual mail campaigns
- **EXP-04**: Scrape code violation signals (weed tickets, abandoned autos, cleanup orders) from Utah Courts XChange ($40/mo subscription) — covers all 6 target counties via justice court ordinance violation records

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
| Markets outside Utah | Start small, expand later based on results |
| Real-time push notifications | Email + SMS is sufficient; push adds service worker complexity |
| Hard money calculator | Deferred — not in Phase 8 scope |
| Partner split model | Deferred — not in Phase 8 scope |
| Multi-user expense approval workflow | Single user tool; team approval is v2+ |
| Contractor payment tracking | Out of scope for Phase 9 |
| Invoice generation | Out of scope for Phase 9 |
| QuickBooks/accounting integration | Out of scope for Phase 9 |
| Historical budget templates | Deferred — use last project's actuals as next project's estimate |
| Deal blast email/SMS automation | Manual copy-paste first; automation deferred |
| Customizable dashboard layouts | Deferred — drag-and-drop widgets are v2+ |
| User card density preferences | Deferred — compact/comfortable/spacious is v2+ |
| Custom themes/skins | Deferred — not in Phase 11 scope |
| Gmail API sync | Deferred — sensitive OAuth scope, weeks for verification; Resend handles sending |
| Google Calendar follow-up reminders | Deferred — OAuth complexity, activity timeline provides visibility |
| Auto-enrollment rules | Deferred — manual enrollment first, automation later |
| SMS/text messaging integration | Deferred — separate phase |
| SMS delivery of signing links | Requires SMS integration not in scope |
| JV Partnership Agreement template | Future phase if needed |
| Custom contract template upload | Future enhancement |
| Notarization integration | Out of scope |
| Title company integration for closing | Future phase |
| Video capture/walkthrough clips | Deferred — separate phase |
| AI-based photo tagging | Deferred — future enhancement |
| Before/after comparison views | Deferred — rehab documentation phase |

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
| ANALYTICS-01 | Phase 6 | Complete |
| ANALYTICS-02 | Phase 6 | Complete |
| ANALYTICS-03 | Phase 6 | Complete |
| ANALYTICS-04 | Phase 6 | Complete |
| ANALYTICS-05 | Phase 6 | Complete |
| ANALYTICS-06 | Phase 6 | Complete |
| ANALYTICS-07 | Phase 6 | Complete |
| ANALYTICS-08 | Phase 6 | Complete |
| DEAL-01 | Phase 8 | Complete |
| DEAL-02 | Phase 8 | Complete |
| DEAL-03 | Phase 8 | Complete |
| DEAL-04 | Phase 8 | Complete |
| DEAL-05 | Phase 8 | Complete |
| DEAL-06 | Phase 8 | Complete |
| DEAL-07 | Phase 8 | Complete |
| DEAL-08 | Phase 8 | Complete |
| BUDGET-01 | Phase 9 | Complete |
| BUDGET-02 | Phase 9 | Complete |
| BUDGET-03 | Phase 9 | Complete |
| BUDGET-04 | Phase 9 | Complete |
| BUDGET-05 | Phase 9 | Complete |
| BUDGET-06 | Phase 9 | Complete |
| BUDGET-07 | Phase 9 | Complete |
| BUDGET-08 | Phase 9 | Complete |
| UI-01 | Phase 11 | Complete |
| UI-02 | Phase 11 | Complete |
| UI-03 | Phase 11 | Complete |
| UI-04 | Phase 11 | Complete |
| UI-05 | Phase 11 | Complete |
| UI-06 | Phase 11 | Complete |
| UI-07 | Phase 11 | Complete |
| UI-08 | Phase 11 | Complete |
| CAMP-01 | Phase 12 | Complete |
| CAMP-02 | Phase 12 | Complete |
| CAMP-03 | Phase 12 | Complete |
| CAMP-04 | Phase 12 | Complete |
| CAMP-05 | Phase 12 | Complete |
| CAMP-06 | Phase 12 | Complete |
| CAMP-07 | Phase 12 | Complete |
| CAMP-08 | Phase 12 | Complete |
| CAMP-09 | Phase 12 | Complete |
| CAMP-10 | Phase 12 | Complete |
| CAMP-11 | Phase 12 | Complete |
| CAMP-12 | Phase 12 | Complete |
| CONTRACT-01 | Phase 13 | Planned |
| CONTRACT-02 | Phase 13 | Planned |
| CONTRACT-03 | Phase 13 | Planned |
| CONTRACT-04 | Phase 13 | Planned |
| CONTRACT-05 | Phase 13 | Planned |
| CONTRACT-06 | Phase 13 | Planned |
| CONTRACT-07 | Phase 13 | Planned |
| CONTRACT-08 | Phase 13 | Planned |
| CONTRACT-09 | Phase 13 | Planned |
| CONTRACT-10 | Phase 13 | Planned |
| CONTRACT-11 | Phase 13 | Planned |
| CONTRACT-12 | Phase 13 | Planned |
| CONTRACT-13 | Phase 13 | Planned |
| CONTRACT-14 | Phase 13 | Planned |
| CONTRACT-15 | Phase 13 | Planned |
| CONTRACT-16 | Phase 13 | Planned |
| PHOTO-01 | Phase 14 | Planned |
| PHOTO-02 | Phase 14 | Planned |
| PHOTO-03 | Phase 14 | Planned |
| PHOTO-04 | Phase 14 | Planned |
| PHOTO-05 | Phase 14 | Planned |
| PHOTO-06 | Phase 14 | Planned |
| PHOTO-07 | Phase 14 | Planned |
| PHOTO-08 | Phase 14 | Planned |
| PHOTO-09 | Phase 14 | Planned |

**Coverage:**
- v1 requirements: 101 total
- Mapped to phases: 101
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-04-05 — added Phase 14 mobile photo capture requirements (PHOTO-01 through PHOTO-09)*
