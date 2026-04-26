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

- [x] **ANALYTICS-01**: User can view pipeline conversion funnel showing lead progression rates (New -> Contacted -> Follow-Up -> Closed/Dead) with average time at each stage
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
- [x] **PHOTO-03**: Deal detail photo gallery displays photos grouped by category in a responsive grid with full-screen lightbox (swipe navigation, caption overlay) via yet-another-react-lightbox
- [x] **PHOTO-04**: Photo Inbox page (/photos/inbox) stores unassigned captures for later review and assignment to deals — accessible from sidebar navigation
- [x] **PHOTO-05**: Floating action button (FAB) on mobile views opens camera for quick single-photo capture to inbox, positioned above MobileBottomNav
- [x] **PHOTO-06**: Photos can be attached to properties OR deals; property photos carry over to deal automatically when "Start Deal" creates a deal from that property
- [x] **PHOTO-07**: Deal cards in deals list show cover photo thumbnail (48x48) when a cover photo exists
- [x] **PHOTO-08**: Deal blast generator auto-populates cover photo SAS URL in the "Photos:" line; field remains editable for manual override
- [x] **PHOTO-09**: User can manually delete photos, set/change cover photo, and edit captions from the deal detail Photos tab

### Blueprints & Floor Plans

- [x] **FLOOR-01**: User can upload PDF and image (JPG/PNG) floor plans to Azure Blob Storage with attachment to deals or properties, client-side image compression (1920px max, JPEG 0.8), and 10MB file size limit for PDFs
- [x] **FLOOR-02**: Uploaded floor plans display in a pan/zoom viewer with pinch-to-zoom on mobile and scroll-wheel zoom on desktop, rendering both PDF and image formats
- [x] **FLOOR-03**: User can sketch floor plans in-app using a react-konva room rectangle tool with draggable/resizable rooms, snap-to-grid, editable labels, and L x W dimension inputs
- [ ] **FLOOR-04**: Multiple floors per property supported with floor selector (Main, Upper, Basement, Garage, Other) and floor label on each plan
- [x] **FLOOR-05**: Pin-based annotations with colored category markers (plumbing, electrical, structural, cosmetic, etc.) can be dropped on floor plans with text notes and optional links to rehab budget categories
- [x] **FLOOR-06**: Floor plans support versioning (As-Is and Proposed) per floor, allowing comparison of pre-rehab and post-rehab layouts
- [x] **FLOOR-07**: Dedicated Floor Plans tab on deal detail page with floor selector, version toggle, upload/sketch mode, and plan count badge
- [x] **FLOOR-08**: Shareable time-limited public link for contractors (token-gated, 7-day expiry) provides view-only access to floor plans with annotations — no HouseFinder account required
- [x] **FLOOR-09**: Sketched floor plans auto-calculate total square footage from room dimensions, feeding into deal metrics (price/sqft, rehab cost/sqft, ARV/sqft) on the MAO calculator
- [x] **FLOOR-10**: Floor plans carry over from property to deal automatically when Start Deal creates a deal, following the same best-effort pattern as photo carry-over

### Buyers List CRM

- [x] **BUYER-01**: System stores buyer communication events (called, voicemail, emailed, text, met, deal_blast, note), buyer-deal interactions (blasted, interested, closed), and buyer tags in PostgreSQL with follow-up date and last-contacted columns on buyers table
- [x] **BUYER-02**: User can view a searchable, filterable buyers list at /buyers with columns for name, phone, email, buy box, tags, status, last contact date, and follow-up date — with filters for search, tag, active/inactive, target area, and funding type
- [x] **BUYER-03**: User can view a buyer detail page at /buyers/[id] showing full profile, communication timeline, deal interaction history, and matched deals
- [x] **BUYER-04**: User can add and remove free-form tags per buyer (e.g., VIP, cash-only, fix-and-flip) with autocomplete suggestions from existing tags — tags filterable on list page
- [x] **BUYER-05**: System auto-matches buyers to deals by price range AND target area (case-insensitive city match), showing full-match and price-only-match badges on deal detail buyer list
- [x] **BUYER-06**: Buyer-deal interactions tracked through blasted/interested/closed funnel — auto-logged on deal blast, manually updatable from deal detail and buyer detail
- [x] **BUYER-07**: User can log buyer communication events (call, voicemail, email, text, meeting, note) from buyer detail page with unified chronological timeline showing icons/colors per type
- [x] **BUYER-08**: User can set follow-up reminder dates per buyer; overdue follow-ups display as a widget on the main dashboard with buyer name links — widget hidden when no overdue reminders
- [x] **BUYER-09**: User can import buyers from CSV with column mapping UI (auto-map matching headers, preview first 5 rows, per-row error reporting) via direct server action call
- [x] **BUYER-10**: User can export filtered or full buyer list to CSV using established buildCsv pattern with columns for all buyer fields plus tags and dates
- [x] **BUYER-11**: Deal blast generator supports email sending to selected buyers via Resend (alongside existing copy-to-clipboard), with auto-logging to buyer communication history and buyer-deal interaction upsert
- [x] **BUYER-12**: Sidebar navigation updates Buyers href from /deals/buyers to /buyers; bottom nav replaces Campaigns with Buyers; command menu updated

### Netlify Migration & Design System

- [x] **NETLIFY-01**: HouseFinder frontend deployed to Netlify with auto-deploy from master, netlify.toml config, output:standalone removed, and all environment variables migrated from Azure App Service
- [x] **NETLIFY-02**: GitHub Actions deploy-app.yml disabled or removed — Netlify auto-deploy replaces it; deploy-scraper.yml preserved for Azure Functions
- [x] **NETLIFY-03**: Azure PgBouncer skipped for this phase (B1ms Burstable tier does not support it) — documented as future upgrade item
- [x] **DESIGN-01**: App uses Playfair Display for display headings and Source Sans 3 for body text via next/font/google, replacing Inter — matching nobshomes.netlify.app brand typography
- [x] **DESIGN-02**: App uses No BS Homes warm color palette (brand blue #1e4d8c, sand accent #c4884f, cream backgrounds #fdfbf7) replacing zinc/violet palette — both light and dark mode tokens updated
- [x] **DESIGN-03**: Subtle grain/noise texture overlay (0.015 opacity) on all background surfaces matching nobshomes aesthetic
- [x] **DESIGN-04**: Light mode as default theme, dark mode available via toggle — warm navy dark mode with sand accents
- [x] **DESIGN-05**: White cards with subtle warm shadows and rounded-2xl corners; sand gradient buttons for primary actions, blue for CTAs/links
- [x] **DESIGN-06**: Login page restyled with cream background, centered card, logo area, no imagery — premium warm aesthetic
- [x] **DESIGN-07**: Map page switches from satellite-streets-v12 to light-v11 Mapbox style matching cream/sand palette
- [x] **DESIGN-08**: ALL pages restyled in one phase — no mixed old/new styling; dashboard, properties, deals, analytics, campaigns, contracts, photos, floor plans, buyers, settings, pipeline, map
- [x] **DESIGN-09**: Mobile swipe actions on lead/deal cards (swipe left to change status, swipe right to call) via framer-motion
- [x] **DESIGN-10**: 44px minimum touch targets throughout; compact stat row on dashboard; mobile-first responsive on all pages
- [x] **DESIGN-11**: images.remotePatterns configured for *.blob.core.windows.net in next.config.ts to prevent Azure Blob Storage image breakage after migration
- [x] **DESIGN-12**: All existing features preserved — zero functionality removed during migration and restyling

### Wholesale Leads

- [x] **WHOLESALE-01**: User can enter wholesale deals via two methods: email forwarding with smart parse AND manual form entry with all deal fields (address, asking price, ARV, repair estimate, sqft, beds, baths, lot size, year built, wholesaler info, source channel)
- [x] **WHOLESALE-02**: System smart-parses forwarded wholesaler email blasts via regex extraction, pre-filling address, asking price, ARV, sqft, beds, baths, year built, tax ID, and wholesaler contact -- user reviews and corrects before saving
- [x] **WHOLESALE-03**: System auto-runs analysis on save using MAO formula (ARV x 0.70 - Repairs - Fee) with instant verdict; user can edit numbers and re-run
- [x] **WHOLESALE-04**: Verdict displayed as traffic light (green/yellow/red) plus weighted 1-10 score with expandable breakdown showing MAO spread, equity percentage, and end buyer ROI factors
- [x] **WHOLESALE-05**: Profit estimate displayed as prominent dollar amount (MAO - asking price) for at-a-glance triage
- [x] **WHOLESALE-06**: Wholesale leads follow 4-status workflow: New -> Analyzing -> Interested -> Pass/Promoted
- [x] **WHOLESALE-07**: Promote to Deal button creates a new Deal in existing pipeline with all numbers pre-filled and deal tagged/flagged as wholesale-sourced
- [x] **WHOLESALE-08**: Timestamped notes on wholesale leads following existing deal notes pattern -- quick notes about conversations with wholesaler
- [x] **WHOLESALE-09**: Wholesaler directory tracks name, contact info, and aggregate stats: deals sent, deals promoted, average spread -- showing which wholesalers consistently send good deals
- [x] **WHOLESALE-10**: Card grid layout showing address, asking/ARV, traffic light verdict, profit estimate, and wholesaler name -- designed for fast triage/scanning
- [x] **WHOLESALE-11**: Filters for verdict (green/yellow/red), status (new/analyzing/interested/pass/promoted), and wholesaler source
- [x] **WHOLESALE-12**: Own sidebar link at /wholesale as top-level page, separate from Deals; command menu navigation included


### Security Review

- [x] **SEC-01**: Live /api/migrate endpoint deleted and removed from middleware auth exclusion list -- eliminates account-seeding attack vector
- [x] **SEC-02**: Next.js upgraded to 15.5.15 in housefinder app, patching high-severity DoS CVE (GHSA-q4gf-8mx6-v5v3) and moderate disk cache CVE
- [x] **SEC-03**: Security response headers (Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) configured via next.config.ts headers() for housefinder
- [x] **SEC-04**: Content-Security-Policy deployed in Report-Only mode on housefinder to detect violations without breaking functionality
- [x] **SEC-05**: Password reset enforces minimum 8 characters plus at least one uppercase letter and one number, server-side validated
- [x] **SEC-06**: Next.js upgraded to 15.5.15 in nobshomes marketing site, patching same CVEs as housefinder
- [x] **SEC-07**: Security response headers and CSP-Report-Only configured on nobshomes via next.config.ts headers()
- [x] **SEC-08**: OWASP Top 10 code audit completed across both repos with every checklist item reviewed and documented
- [x] **SEC-09**: All sql.raw() and db.execute() calls audited to confirm no user-controlled input reaches unparameterized SQL
- [x] **SEC-10**: All public routes (sign, floor-plans, api/leads) verified as properly token-gated with no data leakage
- [x] **SEC-11**: Git history scanned for leaked secrets in both repos using gitleaks or manual grep; any found secrets rotated immediately
- [x] **SEC-12**: SECURITY-FINDINGS.md and SECRETS-INVENTORY.md delivered documenting all findings, severity ratings, fix status, and secret rotation cadence
## v1.1 Requirements — Data Enrichment & Court Records

### UGRC Assessor Enrichment

- [x] **UGRC-01**: Properties enriched with sqft, year built, assessed value, and lot size from UGRC ArcGIS FeatureServer data
- [x] **UGRC-02**: Parcel ID normalization handles format differences between county scrapers and UGRC (strip delimiters, uppercase)
- [x] **UGRC-03**: Import runs per-county with match rate reporting (how many properties matched vs total)
- [x] **UGRC-04**: Assessor data visible on property detail pages (fields already exist in UI, currently NULL)

### XChange Court Record Intake

- [x] **XCHG-01**: Agent-assisted browser workflow searches XChange by county and case type (probate, code violation)
- [x] **XCHG-02**: Court record text parsed into structured data (case type, parties, address, filing dates)
- [x] **XCHG-03**: Parsed records matched to existing properties via parcel ID, normalized address, or owner name
- [x] **XCHG-04**: Unmatched records staged for manual review (not silently discarded)
- [x] **XCHG-05**: Matched records create distress signals (probate, code_violation, lis_pendens types)
- [x] **XCHG-06**: Court intake runs logged with audit trail (date, county, case type, match stats)

### Scoring Rebalance

- [x] **SCORE2-01**: Dry-run rescore simulates impact of new signal types before activating them live
- [ ] **SCORE2-02**: Hot lead threshold adjusted based on dry-run results to prevent hot lead flood
- [x] **SCORE2-03**: NOD and lis_pendens signals deduplicated for same property within 90-day window

## v1.2 Requirements — Advanced MAO Calculator

### MAO Calculator Core

- [x] **MAO-01**: Calculator accepts ARV and rehab estimate as primary inputs with sell-side cost percentages
- [x] **MAO-02**: Sell-side costs computed from configurable buyer's agent %, selling agent %, and closing/title %
- [x] **MAO-03**: Net proceeds at resale displayed (ARV minus all sell-side costs)

### Hard Money + Carry

- [x] **HML-01**: Hard money loan parameters configurable (annual interest rate, points, LTV %, hold time months)
- [x] **HML-02**: Monthly carry costs configurable (tax, insurance, utilities combined dollar amount)
- [x] **HML-03**: Loan amount computed iteratively via convergence (MAO × LTV)
- [x] **HML-04**: Total HML + carry cost displayed (interest + points + monthly carry)

### Buyer/Flipper View

- [x] **FLIP-01**: Buy-side closing costs configurable as dollar amount
- [x] **FLIP-02**: Min and max profit targets configurable as dollar amounts
- [x] **FLIP-03**: MAO range displayed showing offer at min profit and max profit targets
- [x] **FLIP-04**: MAO as percentage of ARV displayed for quick reference

### Wholesaler View

- [x] **WSALE-01**: Assignment fee configurable as dollar amount
- [x] **WSALE-02**: Seller-side closing costs shown (assignee pays both sides noted)
- [x] **WSALE-03**: Max purchase price from seller computed (end buyer MAO minus fee minus closing costs)
- [x] **WSALE-04**: End buyer's total out-of-pocket displayed
- [x] **WSALE-05**: Wholesaler's spread displayed

## v1.3 Requirements — Rose Park Pilot

Urban expansion: surface Salt Lake City Rose Park (zip 84116) properties already collected by statewide scrapers. Foundation only — new SLCo-specific scrapers deferred to v1.4+ pending signal-volume validation.

### Rose Park Data Foundation

- [ ] **RP-01**: System runs UGRC assessor enrichment for Salt Lake County with `ZIP_CODE='84116'` ArcGIS WHERE filter (avoids 350k-parcel overload and Azure Function timeout)
- [x] **RP-02**: `normalizeCity(city, zip)` in `scraper/src/lib/upsert.ts` retags any property with `zip='84116'` to `city='Rose Park'` at upsert time — single normalization point for future neighborhood expansion
- [ ] **RP-03**: One-shot SQL migration retags any existing properties stored as `city='SALT LAKE CITY'` with `zip='84116'` to `city='Rose Park'` so historical statewide-scraper data surfaces without rerun
- [x] **RP-04**: `'Rose Park'` added to `target_cities` in `scraperConfig` (Settings UI or seed update) so dashboard's existing city filter includes it
- [ ] **RP-05**: `getProperties()` row limit raised from 100 to a value safely above expected Rose Park lead density (with paginated UI fallback if needed) so dense urban data does not silently truncate

### Rose Park Display

- [ ] **RP-06**: User can see "Rose Park" as a selectable city in dashboard filter dropdown
- [ ] **RP-07**: User can see Rose Park properties (with all existing distress signals from statewide scrapers) in the dashboard property grid and stats bar
- [ ] **RP-08**: Mapbox map clusters dense pin groups using supercluster pattern (benefits Rose Park urban density and improves all dense-area views)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Expansion

- **EXP-01**: System extends to Utah towns beyond initial ~10 based on lead conversion results
- **EXP-02**: PWA home screen installability with app-like experience
- **EXP-03**: Export leads to CSV for manual mail campaigns
- **EXP-04**: Scrape code violation signals (weed tickets, abandoned autos, cleanup orders) from Utah Courts XChange ($40/mo subscription) — covers all 6 target counties via justice court ordinance violation records

### Rose Park v1.4+ Follow-On (deferred from v1.3 2026-04-25)

- **RP-FW-01**: Activate Salt Lake County in `utah-legals.ts` `TARGET_COUNTIES` (one-line + parcel-ID regex fix for SLCo 10-digit format + 84116 zip allowlist) — cheapest new NOD signal for Rose Park
- **RP-FW-02**: Build `slco-delinquent.ts` Playwright scraper for SLCo Auditor tax-sale page (annual-only schedule; 2026 list publishes April 29)
- **RP-FW-03**: Build `slco-recorder.ts` for NOD/lis pendens/trustee sale documents — gated on `/gsd:research-phase` because portal is paywalled and per-parcel auto-complete required
- **RP-FW-04**: Proximity-to-home badge on Rose Park lead cards (haversine from Brian's home coordinates)
- **RP-FW-05**: SLC code violations via XChange court intake (zero new code; activates when XChange subscription goes live)

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
| Automated buyer email sequences | Deferred — separate phase per CONTEXT.md |
| Buyer portal (buyers log in to see deals) | Deferred — separate phase per CONTEXT.md |
| Buyer referral tracking | Future enhancement per CONTEXT.md |

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
| FLOOR-01 | Phase 15 | In Progress (15-01) |
| FLOOR-02 | Phase 15 | Planned |
| FLOOR-03 | Phase 15 | Planned |
| FLOOR-04 | Phase 15 | In Progress (15-01) |
| FLOOR-05 | Phase 15 | In Progress (15-01) |
| FLOOR-06 | Phase 15 | In Progress (15-01) |
| FLOOR-07 | Phase 15 | Planned |
| FLOOR-08 | Phase 15 | Planned |
| FLOOR-09 | Phase 15 | Planned |
| FLOOR-10 | Phase 15 | Planned |
| BUYER-01 | Phase 16 | Planned |
| BUYER-02 | Phase 16 | Planned |
| BUYER-03 | Phase 16 | Planned |
| BUYER-04 | Phase 16 | Planned |
| BUYER-05 | Phase 16 | Planned |
| BUYER-06 | Phase 16 | Planned |
| BUYER-07 | Phase 16 | Planned |
| BUYER-08 | Phase 16 | Planned |
| BUYER-09 | Phase 16 | Planned |
| BUYER-10 | Phase 16 | Planned |
| BUYER-11 | Phase 16 | Planned |
| BUYER-12 | Phase 16 | Planned |

| NETLIFY-01 | Phase 17 | Planned |
| NETLIFY-02 | Phase 17 | Planned |
| NETLIFY-03 | Phase 17 | Planned |
| DESIGN-01 | Phase 17 | Planned |
| DESIGN-02 | Phase 17 | Planned |
| DESIGN-03 | Phase 17 | Planned |
| DESIGN-04 | Phase 17 | Planned |
| DESIGN-05 | Phase 17 | Planned |
| DESIGN-06 | Phase 17 | Planned |
| DESIGN-07 | Phase 17 | Planned |
| DESIGN-08 | Phase 17 | Planned |
| DESIGN-09 | Phase 17 | Planned |
| DESIGN-10 | Phase 17 | Planned |
| DESIGN-11 | Phase 17 | Planned |
| DESIGN-12 | Phase 17 | Planned |

| WHOLESALE-01 | Phase 19 | Planned |
| WHOLESALE-02 | Phase 19 | Planned |
| WHOLESALE-03 | Phase 19 | Planned |
| WHOLESALE-04 | Phase 19 | Planned |
| WHOLESALE-05 | Phase 19 | Planned |
| WHOLESALE-06 | Phase 19 | Planned |
| WHOLESALE-07 | Phase 19 | Planned |
| WHOLESALE-08 | Phase 19 | Planned |
| WHOLESALE-09 | Phase 19 | Planned |
| WHOLESALE-10 | Phase 19 | Complete |
| WHOLESALE-11 | Phase 19 | Complete |
| WHOLESALE-12 | Phase 19 | Planned |

| SEC-01 | Phase 20 | Planned |
| SEC-02 | Phase 20 | Planned |
| SEC-03 | Phase 20 | Planned |
| SEC-04 | Phase 20 | Planned |
| SEC-05 | Phase 20 | Planned |
| SEC-06 | Phase 20 | Planned |
| SEC-07 | Phase 20 | Planned |
| SEC-08 | Phase 20 | Planned |
| SEC-09 | Phase 20 | Planned |
| SEC-10 | Phase 20 | Planned |
| SEC-11 | Phase 20 | Planned |
| SEC-12 | Phase 20 | Planned |

**Coverage:**
- v1 requirements: 162 total
- Mapped to phases: 162
- Unmapped: 0

---
*Requirements defined: 2026-03-17*
*Last updated: 2026-04-10 — added Phase 20 security review requirements (SEC-01 through SEC-12)

| UGRC-01 | Phase 21 | Complete |
| UGRC-02 | Phase 21 | Complete |
| UGRC-03 | Phase 21 | Complete |
| UGRC-04 | Phase 21 | Complete |
| XCHG-01 | Phase 22 | Complete |
| XCHG-02 | Phase 22 | Complete |
| XCHG-03 | Phase 22 | Complete |
| XCHG-04 | Phase 22 | Complete |
| XCHG-05 | Phase 22 | Complete |
| XCHG-06 | Phase 22 | Complete |
| SCORE2-01 | Phase 23 | Complete |
| SCORE2-02 | Phase 23 | Pending |
| SCORE2-03 | Phase 23 | Complete |

**v1.1 Coverage:**
- v1.1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Last updated: 2026-04-10 — added Phases 21-23 (v1.1 Data Enrichment & Court Records): UGRC-01 through UGRC-04, XCHG-01 through XCHG-06, SCORE2-01 through SCORE2-03*

| MAO-01 | Phase 24 | Complete |
| MAO-02 | Phase 24 | Complete |
| MAO-03 | Phase 24 | Complete |
| HML-01 | Phase 24 | Complete |
| HML-02 | Phase 24 | Complete |
| HML-03 | Phase 24 | Complete |
| HML-04 | Phase 24 | Complete |
| FLIP-01 | Phase 24 | Complete |
| FLIP-02 | Phase 24 | Complete |
| FLIP-03 | Phase 24 | Complete |
| FLIP-04 | Phase 24 | Complete |
| WSALE-01 | Phase 24 | Complete |
| WSALE-02 | Phase 24 | Complete |
| WSALE-03 | Phase 24 | Complete |
| WSALE-04 | Phase 24 | Complete |
| WSALE-05 | Phase 24 | Complete |

**v1.2 Coverage:**
- v1.2 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Last updated: 2026-04-12 — added Phase 24 (v1.2 Advanced MAO Calculator): MAO-01 through MAO-03, HML-01 through HML-04, FLIP-01 through FLIP-04, WSALE-01 through WSALE-05*

| RP-02 | Phase 25 | Complete |
| RP-03 | Phase 25 | Pending |
| RP-04 | Phase 25 | Complete |
| RP-05 | Phase 25 | Pending |
| RP-01 | Phase 26 | Pending |
| RP-06 | Phase 26 | Pending |
| RP-07 | Phase 26 | Pending |
| RP-08 | Phase 27 | Pending |

**v1.3 Coverage:**
- v1.3 requirements: 8 total (RP-01 through RP-08)
- Mapped to phases: 8
- Unmapped: 0

Note: RP-06 and RP-07 are emergent display outcomes of Phase 25+26. They require no separate implementation work — they are verified as observable success criteria of Phase 26.

---
*Last updated: 2026-04-17 — added Phases 25-27 (v1.3 Rose Park Pilot): RP-01 through RP-08*
