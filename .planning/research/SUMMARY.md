# Project Research Summary

**Project:** HouseFinder — Distressed Property Lead Generation
**Domain:** Real estate investor tool, public records scraping, rural Utah
**Researched:** 2026-03-17
**Confidence:** MEDIUM (stack HIGH, features MEDIUM, architecture MEDIUM, Utah-specific data LOW)

## Executive Summary

HouseFinder is a single-user lead generation tool for a real estate investor targeting distressed properties in rural Utah (Carbon, Emery, Sanpete, Juab, Millard, Sevier counties). The system's core value is automated daily scraping of free public records — county recorder NOD filings, tax delinquency lists, lis pendens — combined with multi-signal distress scoring that surfaces hot leads before competitors using paid national tools are even looking at this geography. The recommended approach is a Next.js 15 monolith on Netlify with Turso/libSQL for storage, Cheerio-first scraping with Playwright as a JS-rendering fallback, and alert delivery via Resend (email) and Twilio (SMS to the app user only). This entire stack runs at zero operating cost within free tier limits.

The key differentiator is list stacking: properties with two or more distress signals (e.g., NOD + tax lien) are flagged as hot leads and immediately trigger email alerts. Competitors like BatchLeads ($127–$297/month) and PropStream ($99–$199/month) offer national coverage with AI scoring; HouseFinder offers superior depth for a narrow geography at no cost. The critical constraint is that all data must come from free public sources, which means skip tracing for entity-owned properties (LLCs, trusts) is a real gap — approximately some percentage of leads will have no direct contact path without paid tools.

The two highest-risk areas are legal and architectural. Legally: SMS or contact outreach to homeowners via publicly-scraped phone numbers is a TCPA violation post-January 2025 FCC rule change — alerts go to the app user only, never to the distressed homeowner. Architecturally: the Netlify scheduled function 30-second timeout makes a monolithic scrape job impossible; the two-function split (scheduled trigger + background worker) is mandatory from day one. Both risks are entirely avoidable with upfront design decisions. Utah's non-judicial trust deed foreclosure timeline (90-120 days from NOD to auction) gives the investor a meaningful window, but only if NOD scraping is built first and polling is frequent.

## Key Findings

### Recommended Stack

The stack is constrained by the project (Next.js 15, TypeScript, Tailwind v4, shadcn/ui) and by the zero-cost requirement. Within those constraints, the research identifies Turso (libSQL/SQLite) over Supabase as the database choice — its free tier is more generous and its serverless startup latency is lower than PostgreSQL alternatives. Drizzle ORM is chosen over Prisma specifically because its ~7kb bundle vs Prisma's binary engine means 3-5x faster cold starts on Netlify serverless functions, which matters for scraping runs. The scraping approach is Cheerio-first (fast, no browser overhead) with Playwright + stealth plugin reserved for county sites that require JavaScript rendering — not all of them will.

**Core technologies:**
- Next.js 15.x: Full-stack framework — stay on 15.x, not 16 (breaking changes in params/middleware not yet ecosystem-stable)
- Turso (libSQL): Primary data store — free tier covers the entire projected scale; no database server to provision
- Drizzle ORM 0.45.x: Type-safe DB queries — ~7kb, fast serverless cold starts, code-first schema in TypeScript
- Netlify Scheduled + Background Functions: Cron pipeline — scheduled function triggers, background function executes (up to 15 min)
- Playwright 1.x + playwright-extra-stealth: Headless scraping — for JS-rendered county sites
- Cheerio 1.x: Static HTML parsing — use first; fall back to Playwright only when JS is required
- Resend: Email alerts — user already has account; free tier (3,000 emails/month) covers this use case
- Twilio: SMS alerts to app user — trial credit sufficient for months of hot-lead alerts
- react-leaflet 5.x + OpenStreetMap: Map view — free, no API key; must use `next/dynamic` with `ssr: false`
- Auth.js v5 (NextAuth beta): Session auth — Credentials provider for single-user login; v5 required for App Router
- Zod 3.x: Runtime validation of scraped data — essential because county field names and formats change without notice

### Expected Features

Research benchmarked against BatchLeads, PropStream, DealMachine, and REIPro — all national tools costing $49–$299/month. HouseFinder wins on depth-for-niche and price, not breadth.

**Must have (table stakes):**
- Property list dashboard with filter by city, distress type, hot lead status
- Property detail page with all available public data and owner name
- Distress indicator display per property (NOD, tax lien, lis pendens flags)
- Multi-signal distress scoring: 2+ signals = hot lead threshold
- Lead status tracking: New / Contacted / Follow-Up / Closed / Dead
- Notes per lead (timestamped)
- Hot lead email alert via Resend — fires on new 2+ signal properties
- Tap-to-call on owner phone number (tel: link, mobile-first)
- Mobile-responsive UI — investors work in the field
- Owner name from county assessor (contact info partially available from free sources)

**Should have (differentiators, post-MVP v1.x):**
- Map view with property pins (react-leaflet + OSM; requires geocoding pipeline)
- Hot lead SMS alerts — to the app user's own number only, never homeowner
- Daily new lead badge ("new since your last visit")
- Voter roll name/address cross-reference for contact enrichment
- Probate / estate lead detection — high value, but requires Utah court access complexity

**Defer (v2+):**
- Additional Utah markets beyond initial ~10 towns
- Vacant / code violation detection (data availability is inconsistent by city)
- PWA / home screen installability
- CSV export for manual mail campaigns
- Multi-user / team support

**Explicit anti-features (never build):**
- SMS outreach to distressed homeowners — TCPA violation post-Jan 2025
- Auto-dialer / predictive dialer — overkill and legal exposure at this scale
- Paid skip tracing integration — violates zero-cost constraint
- MLS / on-market listing data — requires REALTOR membership or paid API

### Architecture Approach

The system has four distinct layers: (1) a scheduled scraping layer using Netlify's two-function pattern (scheduled trigger + background worker), (2) a data pipeline that fetches county HTML, parses with Cheerio, normalizes to typed records, scores by signal count, and upserts to Turso, (3) the Next.js application layer serving the dashboard, map, and lead detail pages via RSC, and (4) an alert dispatch layer that fires Resend email (and optionally Twilio SMS) when a new hot lead is detected. The critical architectural decision is storing distress signals as individual rows in a `distress_signals` table rather than boolean columns on properties — this allows adding new signal types without schema migrations and makes the score computation a simple COUNT query.

**Major components:**
1. Netlify Scheduled Function (cron 6am daily) — fires trigger, returns in < 30s
2. Netlify Background Function (scrape-run) — does the actual work up to 15 minutes; per-county isolation recommended from day one
3. Per-county scraper modules (lib/scraper/sources/) — isolated files, one per county; Cheerio-first, Playwright fallback
4. Drizzle schema + Turso (libSQL) — five tables: properties, owners, distress_signals, leads, lead_notes
5. Distress scoring engine (lib/scoring/score.ts) — pure function; COUNT signals per property, flag >= 2 as hot
6. Next.js RSC dashboard + detail pages — initial load via server components; client state for filters
7. Alert dispatcher (lib/alerts/) — called from background function after scoring; email (Resend) + SMS (Twilio)
8. Map component (components/map/MapView.tsx) — client-only via next/dynamic ssr:false; needs geocoded lat/lng

### Critical Pitfalls

1. **Netlify 30-second timeout on scheduled functions** — never put scraping logic in the scheduled function; it must POST to a background function that runs the work. This is a day-one architecture decision, not a refactor. Failure mode is silent: the job appears to complete but zero leads are written.

2. **TCPA violation from homeowner SMS outreach** — SMS alert delivery must flow only to the authenticated app user's own phone number. Any feature that sends a text to a phone number found in public records (voter rolls, assessor data) is a post-January 2025 TCPA violation with class action exposure. Architect the SMS module to only accept the app owner's verified number as a destination.

3. **Duplicate leads across data sources** — the county recorder, tax auditor, and court system all use different identifiers for the same property. Without the parcel number (APN) as the canonical deduplication key from day one, the same distressed property creates three separate lead records that each score 1 signal and none hit the hot-lead threshold. The parcel number must be the primary cross-source key before the second scraper is built.

4. **Alert fatigue from poor scoring discipline** — alerts must never fire before the scoring engine is validated. Single-signal properties belong in the dashboard browse view only. Every alert that isn't a genuine hot lead erodes the tool's primary value. The build order must be: scraper → score → validate score quality → alerts.

5. **County website format changes cause silent data corruption** — HTML selectors break when county IT updates a portal. The scraper returns 0 results with no error thrown. Defense: validate that "owner name" fields look like names (not dates), implement zero-result monitoring that fires a system alert after 3 consecutive zero-result runs from a county that normally has activity, and write snapshot-based integration tests per county parser.

## Implications for Roadmap

Based on research, dependencies between components drive a clear phase order. The scraping infrastructure must precede the UI. Scoring must precede alerts. One county working end-to-end must precede expanding to all counties.

### Phase 1: Data Foundation

**Rationale:** Everything in the system depends on having real data in the database. The scraping pipeline, database schema, and parcel-based deduplication must be established before any UI or alert work begins. This is also where the highest-risk architectural decisions live (two-function split, per-county isolation, canonical parcel ID).

**Delivers:** Working end-to-end pipeline for Carbon County (Price, UT) — daily scrape of NOD and tax delinquency records, parsed, scored, stored in Turso. One county, one complete vertical slice.

**Addresses features from FEATURES.md:** Distress indicator scraping (NOD, tax lien), multi-signal scoring, daily automated scraping with new-lead tracking.

**Avoids pitfalls:** Netlify timeout (two-function architecture), duplicate records (parcel number as canonical ID), stale signals (recording date stored per signal), county format changes (zero-result monitoring built in from the start).

**Research flag:** NEEDS research-phase — Utah county portal structure is LOW confidence. Carbon County recorder site HTML structure must be inspected manually before writing selectors. GRAMA request as fallback for counties with no online portal should be evaluated.

### Phase 2: Core Application

**Rationale:** With real data flowing, the dashboard and lead management features can be built against actual records rather than fixtures. Auth must be in place before any UI is accessible.

**Delivers:** Authenticated dashboard with lead list, filter by city and distress type, hot lead flag, property detail page, lead status tracking (New/Contacted/Follow-Up/Closed/Dead), notes per lead, mobile-responsive UI.

**Uses from STACK.md:** Next.js App Router RSC for server-side data fetching, shadcn/ui components, Tailwind v4, Auth.js v5 Credentials provider.

**Implements from ARCHITECTURE.md:** Next.js application layer (dashboard, detail pages), API routes for lead CRUD, Drizzle read queries with indexes on is_hot/status and city.

**Avoids pitfalls:** Default view shows hot leads only (avoids UX pitfall of burying hot leads), entity-type classification stored in lead model (LLC/trust/estate flagged visually), tap-to-call as tel: links on all phone numbers.

**Research flag:** Standard patterns — well-documented Next.js App Router patterns apply. No additional research needed.

### Phase 3: Alerts

**Rationale:** Alerts must come after scoring is validated against real data. Premature alerts create irreversible trust damage. Email alerts via Resend are already set up (user has existing account), so this phase is lower effort than it appears.

**Delivers:** Hot lead email alerts via Resend (fires when a new property scores 2+ signals), alert deduplication (alert_sent flag prevents repeat alerts on re-run), daily digest email for moderate (1-signal) leads.

**Uses from STACK.md:** Resend + @react-email/components for structured HTML email, called from the background function after scoring.

**Avoids pitfalls:** Alerts fire only for 2+ stacked signals (not single-signal), alert_sent flag prevents spam on re-runs, SMS outreach to homeowners explicitly prohibited in code comments and architecture.

**Research flag:** Standard patterns for Resend + Next.js (official docs, HIGH confidence). No additional research needed.

### Phase 4: Remaining Counties + Scraper Scale

**Rationale:** Once the single-county pattern is proven, expanding to the remaining ~9 target towns is mostly replication with per-county selector adjustments. The per-county function isolation from Phase 1 makes this a low-risk expansion.

**Delivers:** Full coverage of target geography — Carbon, Emery, Sanpete, Juab, Millard, Sevier counties. Scraper health dashboard showing last_successful_scrape_at per county.

**Avoids pitfalls:** Per-county function isolation means one county's selector breaking doesn't cascade to others. Health monitoring surfaces silent failures.

**Research flag:** NEEDS research-phase — each county's portal must be manually inspected. Some counties (Emery, Juab) may have no online portal and require GRAMA requests instead of scraping. Confidence on scrapability is LOW for all counties except Carbon.

### Phase 5: Map View + Contact Enrichment (v1.x)

**Rationale:** Map requires geocoded lat/lng data, which requires running the full pipeline first to have real addresses to geocode. Contact enrichment (voter roll cross-reference) is complex enough to warrant its own phase.

**Delivers:** Interactive map view with property pins and distress-type filter (react-leaflet + OpenStreetMap), owner contact enrichment from county assessor and public records, hot lead SMS alerts to the app user's own number.

**Uses from STACK.md:** react-leaflet 5.x loaded via next/dynamic ssr:false, Twilio for SMS (trial credits sufficient at this scale), p-limit for rate-limited concurrent lookups.

**Avoids pitfalls:** Leaflet dynamic import is non-negotiable (window access during SSR crashes the build), SMS sends only to authenticated user's number (never to scraped homeowner contacts), voter roll data labeled by source for future compliance auditing.

**Research flag:** NEEDS research-phase for contact enrichment — Utah voter roll access terms and data availability for phone numbers are LOW confidence. Geocoding approach (which free API, rate limits) needs evaluation.

### Phase Ordering Rationale

- Phase 1 before Phase 2: No real data = no dashboard to validate. Building UI against fixtures creates integration risk.
- Scoring validated before alerts (Phases 1-2 before Phase 3): Pitfalls research is unambiguous — premature alerts are unrecoverable trust damage.
- One county before all counties (Phase 1 before Phase 4): Per-county scraper pattern must be proven before replication. County portal research is LOW confidence; discovering issues with one county is far cheaper than discovering issues with nine simultaneously.
- Map and contact enrichment last (Phase 5): Map depends on geocoded data from the pipeline; contact enrichment is a research-heavy feature that shouldn't block core lead management.

### Research Flags

Phases needing deeper `/gsd:research-phase` during planning:
- **Phase 1:** Carbon County recorder site HTML structure — manual portal inspection required before writing selectors. Current scrapeability confidence is MEDIUM.
- **Phase 4:** All remaining county portals — Emery, Sanpete, Juab, Millard, Sevier county portal scrapability is LOW confidence. Some may require GRAMA requests instead.
- **Phase 5:** Utah voter roll access terms for commercial use, geocoding API selection (free tier rate limits), and A2P 10DLC SMS campaign registration requirements.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 2:** Next.js App Router RSC + shadcn/ui dashboard patterns are well-established.
- **Phase 3:** Resend + Next.js alert integration has official documentation and HIGH confidence.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core framework (Next.js 15, Drizzle, Turso) verified via official docs and version compatibility confirmed. Scraping library choices (Playwright vs Cheerio) MEDIUM — community consensus, single benchmarking source. |
| Features | MEDIUM | Competitor feature set confirmed via multiple review sources. Free-source-only constraint is unique, so some feature gaps (LLC skip tracing, probate access) are inferred from first principles rather than observed precedent. |
| Architecture | MEDIUM | Netlify function limits confirmed via official docs. Scraping patterns confirmed via multiple sources. Database schema derived from first principles. Neon reference in ARCHITECTURE.md is superseded by STACK.md recommendation of Turso — see gap below. |
| Pitfalls | MEDIUM | Legal claims (TCPA, FHA) are MEDIUM-LOW without attorney verification. Technical claims (Netlify timeouts, Leaflet SSR) are MEDIUM-HIGH from official sources and corroborated community reports. Utah-specific legal (trust deed timeline, GRAMA access) is MEDIUM from practitioner sources. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Database inconsistency between research files:** ARCHITECTURE.md recommends Neon Postgres (Netlify DB integration), while STACK.md recommends Turso (libSQL/SQLite). The STACK.md rationale (zero-cost, zero-maintenance, better serverless cold starts) is more thoroughly justified. Use Turso as specified in STACK.md. The ARCHITECTURE.md schema and query patterns translate directly to SQLite/Drizzle with minor syntax differences.

- **County portal scrapability is unverified:** Confidence on the actual HTML structure of each county recorder and assessor site is LOW. Before writing Phase 1 scraper code, manually visit carbon.utah.gov and inspect page structure. Use publicrecords.netronline.com/state/UT to inventory all county portals and categorize them as static HTML (Cheerio), JS-rendered (Playwright), or no online portal (GRAMA).

- **Probate lead detection is blocked:** Utah court XChange system requires a paid subscription for automated access. ARCHITECTURE.md and FEATURES.md both note probate as a high-value signal. Treat this as manual-entry-only for MVP. Decision on XChange subscription ($30-100/month) should be made at Phase 5 planning.

- **Geocoding source not identified:** Map view requires lat/lng per property address. No free geocoding API was specifically evaluated in the research. Options to evaluate at Phase 5: Census Geocoder (free, US addresses), Nominatim (OpenStreetMap, free with rate limits), or address-level coordinates from county GIS data if available.

- **Voter roll phone numbers:** PITFALLS.md flags that Utah voter registration data may prohibit commercial use for investor outreach, and that phone number coverage is likely low. This source should be validated for terms of use before building any contact enrichment pipeline that relies on it.

## Sources

### Primary (HIGH confidence)
- Utah Code § 57-1-26 (official state code) — NOD recording requirements and timeline
- Netlify Scheduled + Background Functions official docs — confirmed 30s / 15min limits
- Resend official Next.js docs — confirmed alert integration pattern
- Turso pricing page (March 2026) — confirmed free tier: 500M reads, 10M writes, 5GB, 100 databases
- HUD Fair Housing Act overview — FHA penalty structure
- Carbon County Delinquent Tax Sales (official county source) — tax lien data availability
- Utah State Archives probate records guide — confirmed current probate access requires paid XChange

### Secondary (MEDIUM confidence)
- Nolo, SNJ Legal, GaryBuysHouses — Utah non-judicial foreclosure timeline (90-120 days NOD to auction)
- LabCoat Agents, ActiveProspect — TCPA 2025 updates and A2P 10DLC requirements
- BatchLeads, PropStream, DealMachine, REIPro official sites and review articles — competitor feature benchmarking
- SerpApi, JDSupra/Pillsbury — web scraping legality and hiQ v. LinkedIn ruling analysis
- Drizzle vs Prisma serverless cold start comparisons (bytebase.com, makerkit.dev)
- react-leaflet SSR issue GitHub thread — confirmed window error persists in Next.js 15

### Tertiary (LOW confidence — needs validation)
- Utah county portal scrapability (carbon.utah.gov, emery.utah.gov, etc.) — HTML structure and scrape difficulty unverified
- Voter roll phone number coverage and permissible use for commercial real estate
- Skip tracing entity-owned properties (LLCs/trusts) via free public sources — BiggerPockets community forum

---
*Research completed: 2026-03-17*
*Ready for roadmap: yes*
