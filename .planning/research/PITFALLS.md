# Pitfalls Research

**Domain:** Distressed property lead generation — free/public records, Utah small towns
**Researched:** 2026-03-17
**Confidence:** MEDIUM (legal claims are LOW without direct attorney verification; technical claims are MEDIUM-HIGH based on official sources)

---

## Critical Pitfalls

### Pitfall 1: Sending Unsolicited SMS to Pre-Foreclosure Homeowners Without Prior Express Written Consent

**What goes wrong:**
You build SMS alert delivery and assume "I'm not a marketer, I'm an investor making a cash offer" puts you outside TCPA scope. The FCC closed the "lead generator loophole" on January 27, 2025. Any commercial text to a number you found via public records — without prior express written consent directly tied to your business — is a TCPA violation. Class action filings are up 112% in Q1 2025 over the same period in 2024.

**Why it happens:**
Developers (and investors) conflate SMS alerts to themselves (the app user) with SMS outreach to the homeowner. The PROJECT.md requirement for "SMS/text alerts for urgent hot leads" is ambiguous — it could mean either. If it ever means texting the distressed homeowner directly, that is where TCPA exposure lives. Even texting yourself via an A2P 10DLC pipeline without proper campaign registration triggers carrier filtering.

**How to avoid:**
- SMS alerts to the app user (you) are fine — this is a personal notification to the app owner, not a marketing campaign.
- NEVER build a feature that texts the distressed homeowner without explicit opt-in flows and legal review.
- If A2P 10DLC registration is needed for your personal alerts, register the campaign as "transactional notifications" not marketing.
- Flag any future "outreach to homeowner via SMS" feature as requiring legal review before build.

**Warning signs:**
- Any feature spec that says "send SMS to homeowner" or "auto-notify lead"
- Using a phone number found in public records (voter roll, assessor data) as an SMS destination
- Sending more than 1 text from the app to any external party without documented consent

**Phase to address:**
Phase that builds SMS alert delivery (likely Phase 2-3). Architect so SMS flows only to the authenticated app user. Add a code comment or ADR explicitly prohibiting homeowner SMS without consent.

---

### Pitfall 2: Treating Utah as a Non-Judicial State Like Any Other — Missing the Trust Deed Timeline Reality

**What goes wrong:**
Utah is a trust deed state (non-judicial foreclosure). The NOD is recorded publicly at the county recorder, but the window between recordation and auction sale is roughly 90-120 days — not 30 days or 6 months. Scrapers that only check for NODs find leads with 3-4 months of runway. Scrapers that miss the NOD and only find Notice of Sale give leads with days left. The entire value of the system is the early detection window; missing it means you surface leads that are already too late.

**Why it happens:**
Developers model the scraping targets without understanding the state-specific timeline. In mortgage states (judicial foreclosure), the process is 6-24 months. In Utah's trust deed non-judicial process, the total timeline from first missed payment to auction is ~7 months — meaning NOD recordation happens around month 3, leaving only 3-4 months until sale.

**How to avoid:**
- Scrape for NODs as the PRIMARY trigger (county recorder, filed with trustee within 10 days of NOD recording per Utah Code § 57-1-26).
- Set up daily or at-minimum weekly polling of county recorder new filings — missing a week means potentially losing a week of a 90-day window.
- Treat Notice of Trustee's Sale (NTS) filings as a "late alert" — homeowner is likely past the point of easy contact.
- Target NODs recorded in last 0-60 days as hot. NODs 60-90 days old as warm. NTS filed = cold/dead lead.

**Warning signs:**
- Scraper only checks one filing type (e.g., only NTS, not NOD)
- No date-of-filing field stored per lead
- Lead scoring doesn't factor in days since NOD was filed

**Phase to address:**
Phase 1 (data scraping foundation). NOD-first priority must be established in the data model before anything else is built.

---

### Pitfall 3: Scraping County Websites Without Respecting Cease-and-Desist Risk and Format Instability

**What goes wrong:**
Utah county recorder and assessor websites (Carbon, Emery, Grand, San Juan, Sevier, etc.) are small county government sites. They range from modern portals with APIs to ancient ASP.NET sites that change structure without notice. Scrapers break silently — the job runs, returns 0 results, and you think there are no new NODs when in fact the county changed a table ID. You miss leads for days or weeks without knowing.

Additionally, while scraping publicly available data is generally legal post-*hiQ v. LinkedIn*, receiving a cease-and-desist from a county website and continuing to scrape after that point creates CFAA liability (the *Craigslist v. 3taps* precedent). Most small county sites do not enforce aggressively, but this is not zero risk.

**Why it happens:**
Developers assume government = stable and don't build monitoring for zero-result scrapes. They also don't check robots.txt or terms of use for county portals. Small county IT departments update sites without versioning or notice.

**How to avoid:**
- Check robots.txt for each county site before scraping. Follow disallows.
- Implement a "zero result alert" — if a scraper returns 0 new documents for 3+ days from a county that normally has activity, fire a system alert (not a lead alert).
- Store the raw HTML/response alongside parsed data so you can detect format changes (compare response fingerprints).
- Use respectful rate limits (1 request per 5-10 seconds, not burst scraping).
- If a county sends a cease-and-desist, honor it immediately — switch that county to GRAMA request-based data collection instead.
- Build per-county scraper modules in isolation so one breaking doesn't cascade.

**Warning signs:**
- Scraper runs but zero new records appear for multiple consecutive days
- HTML parsing returns empty arrays with no error thrown
- A CSS selector or table column stops matching

**Phase to address:**
Phase 1 (scraping infrastructure). Build zero-result monitoring into the first scraper, not as a later enhancement.

---

### Pitfall 4: Properties Owned by LLCs, Trusts, or Estates — Free Sources Can't Identify the Human Decision-Maker

**What goes wrong:**
The county assessor lists the owner as "SMITH FAMILY TRUST" or "CARBON CREEK LLC." Free public records tell you the entity name and a registered agent address — neither of which reaches a motivated seller. You have a distressed property lead with no usable contact. This is especially common in rural Utah where investors, out-of-state heirs, and estate situations are frequent. Probate leads in particular are often under estate names.

**Why it happens:**
The project is committed to free data sources only. Free skip tracing (voter rolls, assessor data) returns natural person names accurately. For entities, it returns the registered agent or the trust name. There is no free, automated way to pierce the corporate veil — that requires paid skip tracing (BatchSkipTracing, TLO, BeenVerified), which is out of scope.

**How to avoid:**
- Store the entity type classification in the lead model: "individual", "LLC", "trust", "estate", "unknown".
- Build a "needs manual skip trace" flag that auto-activates for non-individual ownership.
- For LLCs, Utah's Division of Corporations database is public and free — the registered agent and members may be queryable. Build a manual lookup link to https://secure.utah.gov/bes/ in the lead detail page.
- For trusts and estates, link directly to the Carbon County District Court probate search.
- Do not waste alert budget (SMS, email) on entity-owned properties where no contact path exists without paid skip trace.

**Warning signs:**
- High percentage of leads showing "LLC" or "Trust" in owner name field
- Users reporting "no phone number found" for a disproportionate set of leads

**Phase to address:**
Phase 1 (data model) for entity classification. Phase 2 (lead detail page) for manual lookup links. Alert filtering in Phase 3.

---

### Pitfall 5: Alert Fatigue from Surfacing Too Many Leads With No Quality Filter

**What goes wrong:**
The scraper finds every property with any distress signal and fires an SMS or email. In a small market like Price, UT (pop ~8,500), even 5-10 new NOD filings per week creates an inbox flood if each one triggers an alert. If alerts are unreliable (false positives, stale records, entity-owned properties with no contact path), the user stops trusting them. Alert fatigue from a lead tool is fatal — the value proposition is urgency, and if every alert feels like noise, none of them feel urgent.

**Why it happens:**
Developers build alerting before scoring. They treat "new NOD found" and "hot lead" as the same thing. The PROJECT.md requirement is correct — alerts should only fire for "multiple distress signals" — but it's easy to ship alerts too early before scoring is validated.

**How to avoid:**
- Alerts fire ONLY when a lead scores 2+ distress signals stacked (NOD + tax lien, NOD + code violation, etc.).
- Single-signal properties appear in the dashboard (browsable) but do not trigger push alerts.
- Respect user-configurable thresholds: default to "hot leads only" alerting, let user opt into "all new leads" as an explicit setting.
- Rate-limit alerts: no more than 3 SMS per day, batch daily email digest for moderate leads.

**Warning signs:**
- Alert count per week exceeds 10 without user explicitly requesting that volume
- User mentions "I've been ignoring the texts"
- More than 30% of alerted leads are entity-owned (no contact path)

**Phase to address:**
Phase 2 (scoring engine). Must precede Phase 3 (alerts). Never ship alerts before scoring is validated.

---

### Pitfall 6: Netlify Serverless Function Timeout Breaks Daily Scraping Silently

**What goes wrong:**
A Netlify Scheduled Function has a 15-minute execution limit. Scraping 10 county recorder sites, parsing NODs, cross-referencing tax data, and updating the database in a single function invocation will exceed 15 minutes for even moderate data volumes. The function times out, the job is marked as failed by Netlify, but no error is visible to the user. Leads stop updating. The system appears healthy while data goes stale.

**Why it happens:**
Developers design a single monolithic scrape job ("run everything daily at 6am") without accounting for per-county scrape time. County websites are slow — government servers frequently respond in 2-5 seconds per request. Scraping 10 counties with 50 requests each = 500 requests × 3 seconds average = 25+ minutes, which exceeds the limit before any processing.

**How to avoid:**
- Split scraping into per-county scheduled functions that run staggered (Carbon County at 6:00am, Emery County at 6:05am, etc.).
- Each county's function runs independently, failing without affecting others.
- Store a "last_scraped_at" and "last_successful_scrape_at" timestamp per county in the database. Surface this on a health dashboard or simple admin page.
- Keep a scraper health check: if any county hasn't successfully scraped in 48 hours, trigger an alert to the app owner (not a lead alert).
- Use GitHub Actions as the scheduler instead of Netlify Scheduled Functions if timeout proves too restrictive — GitHub Actions has a 6-hour job limit and is free for this use case.

**Warning signs:**
- Daily scrape job shows as "completed" in Netlify logs but new leads count is 0
- Function invocation duration approaching 14 minutes in Netlify function logs
- Database timestamps show no new records despite scheduled jobs firing

**Phase to address:**
Phase 1 (scraping infrastructure). Architecture decision between monolithic vs. per-county functions must be made before first scraper is built.

---

## Moderate Pitfalls

### Pitfall 7: Stale Tax Lien Records — Utah Tax Liens Are Often Redeemed Before Scraper Detects Them

**What goes wrong:**
Utah county auditors publish delinquent tax lists, but these lists are updated infrequently — often annually around the tax sale period (spring). A property that appears on the delinquent list may have paid off the lien days later. The lead appears "distressed" but the homeowner is no longer in financial distress for that signal. This creates false positives in the scoring system.

**Prevention:**
- Store a `detected_at` timestamp for each distress signal, not just the property.
- Mark tax delinquency signals with a `confidence` field that degrades over time (fresh = high, 90+ days old = low).
- Scrape tax sale lists within 30 days of publication; mark records older than 6 months as "stale — verify."
- Do not stack a stale tax lien with a fresh NOD to hit the 2-signal threshold — require at least one signal to be fresh (< 60 days).

**Phase to address:** Phase 1 (data model) for timestamps. Phase 2 (scoring engine) for signal freshness weighting.

---

### Pitfall 8: Utah Probate Records Are Not Real-Time Searchable Without Court System Access

**What goes wrong:**
Utah probate records are filed with the District Court in the county where the decedent lived. Access to current (< 1 year old) probate filings requires either the XChange court system (paid subscription for external parties) or in-person courthouse access. The free online genealogical sources (FamilySearch, Archives) only cover records more than 50 years old. Building an automated probate scraper for current filings is not feasible without a paid subscription or courthouse visits.

**Prevention:**
- Do not promise automated probate lead detection in Phase 1. Flag it as requiring manual or subscription-based access.
- Build the lead model to support probate as a distress signal type, but leave the data entry workflow as manual for MVP.
- In the UI, provide a direct link to the Carbon County District Court public terminals as the suggested workflow for probate research.
- Evaluate XChange subscription cost ($30-$100/month range for court access) and document the decision. If budget allows, add it later.

**Phase to address:** Phase 1 planning. Must not be promised in MVP feature set without solving access method first.

---

### Pitfall 9: Fair Housing Act Exposure from Geographic or Demographic Targeting Patterns

**What goes wrong:**
The Fair Housing Act prohibits discrimination based on race, color, religion, sex, familial status, national origin, or disability. If the lead targeting or outreach patterns create a disparate impact on a protected class — even unintentionally — there is FHA exposure. For example, if the system's "distress signal stacking" systematically surfaces more properties in predominantly minority neighborhoods, and the investor's contact patterns follow that, this can constitute illegal steering. Penalties start at $25,597 per violation (as of March 2024 update).

**Prevention:**
- Do not build filters that target by race, religion, or national origin. This sounds obvious, but demographic data adjacent to the property (neighborhood composition data, school district ratings used as demographic proxies) can create indirect violations.
- Stick to objective financial distress signals only: NOD, tax liens, lis pendens, code violations, probate.
- If you ever add "neighborhood health score" or similar features, have legal review it against FHA disparate impact doctrine before shipping.

**Phase to address:** All phases. This is a standing constraint on feature design, not a single-phase fix.

---

### Pitfall 10: Duplicate Lead Records Across Data Sources

**What goes wrong:**
The same distressed property appears as an NOD at the county recorder, as a delinquent tax parcel from the auditor, and as a lis pendens in the court system — all as separate scrape events. Without deduplication, the system creates three separate leads for the same property, each with one distress signal, and none of them hit the two-signal threshold for hot lead alerts. The scoring system fails to recognize the stacked distress.

**Why it happens:**
Each data source uses different identifiers. The recorder uses document number. The auditor uses parcel number. The court system uses case number. There is no single universal key across Utah county systems.

**Prevention:**
- Use the parcel number (APN/serial number from the county assessor) as the canonical property identifier across all sources.
- Before creating a new lead, query existing leads by parcel number first. If found, add the new distress signal to the existing lead record.
- Before shipping scraper #2, implement the deduplication logic. Never let two scrapers run without a shared canonical property ID.

**Phase to address:** Phase 1 (data model). Parcel number as canonical ID must be established before the second data source is added.

---

## Minor Pitfalls

### Pitfall 11: County Website Format Changes Break Parsers Without Notice

**What goes wrong:**
Carbon County redesigns their recorder portal. The HTML table that had 6 columns now has 7. Every row parsed after the update is offset by one field, causing owner names to end up in the address column and addresses in the filing date column. The scraper succeeds with no error but writes corrupt data.

**Prevention:**
- Parse with explicit field validation: assert that "owner name" looks like a name (not a date, not a dollar amount). Log a parsing warning if validation fails.
- Add a simple checksum/fingerprint to raw scrape responses — detect when page structure changes.
- Write integration tests for each county parser using saved HTML snapshots.

**Phase to address:** Phase 1, built into initial parser structure.

---

### Pitfall 12: Voter Registration Data for Phone Numbers — Utah Restricts Commercial Use

**What goes wrong:**
Utah voter registration data is public, but access and permissible use varies. Using voter registration data for commercial solicitation (which real estate investor outreach is) may violate the terms under which the data is provided. Accuracy is also low for this purpose — Utah voter files may not include phone numbers at all or may include only registration addresses that differ from property ownership.

**Prevention:**
- Do not rely on voter registration as a primary phone number source. Use it only as a name-verification cross-reference.
- County assessor mailing address is more reliable for first-pass contact than voter registration address.
- Build the data pipeline to clearly label the source of each piece of contact information so you can audit and remove data from restricted sources if needed.

**Phase to address:** Phase 2 (contact info aggregation). Source labeling must be designed from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single monolithic scrape job | Simpler to build | Timeout failures, no per-county failure isolation | Never — split from the start |
| Hardcode county website HTML selectors without version tracking | Faster initial build | Silent breakage when site updates | MVP only if you add zero-result monitoring as a compensating control |
| Score leads only on presence/absence of signals, not signal freshness | Simpler scoring logic | Stale signals trigger false hot-lead alerts | Never — freshness timestamp is a day-one data model requirement |
| Store raw owner name without entity-type classification | Skip entity parsing initially | Can't filter entity-owned leads from alerts | MVP only if entity leads are manually reviewed before alerts fire |
| Build alerts before scoring is validated | Faster demo | Alert fatigue destroys user trust immediately | Never — alerts must follow validated scoring |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Netlify Scheduled Functions | Treat as a reliable cron job with no timeout concern | Treat as a 15-minute budget per county; split into per-county functions |
| County recorder websites | Assume HTML structure is stable | Version-pin HTML snapshots; detect structure changes proactively |
| Resend (email alerts) | Send one email per new lead as it's detected | Batch into a daily digest; reserve immediate alerts for hot leads only |
| Utah court XChange system | Assume it's free like assessor data | XChange requires paid subscription for non-courthouse access |
| A2P 10DLC for SMS | Skip campaign registration for personal alerts | Register the campaign — even personal alert pipelines need 10DLC registration to avoid carrier filtering |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Scraping all 10 counties synchronously in sequence | 15+ minute jobs, timeout failures | Per-county async functions with independent scheduling | Immediately at 10 counties |
| Re-scraping all historical records every run | Slow runs, redundant database writes | Track last-scraped document ID/date per county; only fetch new filings | At ~100 records per county |
| Loading all leads into memory for scoring | Memory errors in serverless environment | Score on insert, not as a batch job; store computed score in DB | At ~1,000 total lead records |
| No database index on parcel number | Slow deduplication lookups | Index parcel_number at table creation time | At ~500 records |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing raw scraped personal data (SSNs, full DOBs) from public records | Liability if breached; may violate GRAMA data-use terms | Store only what's needed for the lead workflow; explicitly drop sensitive fields at parse time |
| No rate limiting on the app itself | Scraper credentials or Resend API key gets scraped | Rate-limit all API routes; never expose keys in client-side code |
| Logging full contact information in application logs | PII exposure in Netlify function logs | Mask or omit names/phone numbers from log statements |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing all leads including cold/stale on the default view | User has to hunt for hot leads; loses trust in the tool | Default view = hot leads only; "all leads" is an explicit filter |
| Phone numbers that aren't tap-to-call on mobile | User has to copy-paste to dial; friction kills speed | Every phone number must be a tel: link on mobile |
| No indication of when data was last updated | User can't tell if leads are fresh or stale | Show "Last updated: 2 hours ago" per county on dashboard |
| Showing entity-owned leads (LLCs/trusts) mixed with individual leads without distinction | User wastes time on leads with no contact path | Badge entity-owned leads visually; default-exclude from hot lead view |

---

## "Looks Done But Isn't" Checklist

- [ ] **NOD Scraper:** Often missing — confirm the scraper captures the recording DATE (not just document existence); required for scoring freshness
- [ ] **Lead deduplication:** Often missing — verify that two separate scrape sources for the same property merge to one lead record with both signals
- [ ] **SMS alerts:** Often missing — confirm SMS fires only to the authenticated app user (you), never to a homeowner phone number found in public records
- [ ] **Zero-result monitoring:** Often missing — verify that a county scraper returning 0 new records triggers a system health alert, not silence
- [ ] **Parcel number as canonical ID:** Often missing — verify every lead record has a parcel number and it's used as the deduplication key across all data sources
- [ ] **Entity-type classification:** Often missing — verify the lead model stores whether owner is individual/LLC/trust/estate, not just the raw owner name string

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| TCPA violation from homeowner SMS outreach | HIGH — attorney fees, class action exposure | Immediately cease outreach; consult Utah attorney; do not retain contact lists |
| Monolithic scraper hitting timeout | MEDIUM | Refactor into per-county functions; data gap can be backfilled by re-scraping with date range |
| County site format change corrupts data | MEDIUM | Roll back to last good scrape snapshot; fix parser; re-scrape from last good date |
| Alert fatigue (user ignoring alerts) | MEDIUM — trust damage is hard to rebuild | Immediately raise hot-lead threshold; audit last 30 alerts; remove false positives; implement daily digest |
| Duplicate leads (same property, multiple records) | LOW if caught early; MEDIUM if scores already sent | Write migration to merge duplicates by parcel number; add deduplication constraint |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Homeowner SMS TCPA violation | Phase that adds SMS delivery | Verify SMS sends only to authenticated user's own number; code review for any outbound SMS to scraped phone numbers |
| Trust deed timeline misunderstanding | Phase 1 — data model & scraping | Confirm NOD is primary trigger; lead model has `filing_date` and `days_since_nod` derived field |
| County website format changes | Phase 1 — first scraper | Zero-result monitoring fires on test run with intentionally broken selector |
| LLC/trust entity ownership gap | Phase 1 (model) + Phase 2 (UI) | Lead detail page shows entity-type badge; entity leads excluded from default hot-lead view |
| Alert fatigue | Phase that builds alerts (post-scoring) | Alerts only fire for 2+ stacked signals; single-signal leads appear in dashboard only |
| Netlify 15-min timeout | Phase 1 — scraping architecture | Each county is a separate scheduled function; function duration logged and stays under 10 min |
| Stale tax lien false positives | Phase 1 (model) + Phase 2 (scoring) | Each distress signal has `detected_at` timestamp; scoring weights by freshness |
| Probate lead over-promise | Phase 1 planning | Probate is in data model but marked as "manual entry" until access method resolved |
| FHA disparate impact | All phases | No demographic filters in any feature; code review checklist item for new filter additions |
| Duplicate lead records | Phase 1 — data model | DB unique constraint on parcel_number; deduplication test in scraper integration tests |

---

## Sources

- [Utah Foreclosure Laws and Procedures — Nolo](https://www.nolo.com/legal-encyclopedia/summary-utahs-foreclosure-laws.html) — MEDIUM confidence (legal reference site, not official state code)
- [Utah Code § 57-1-26 — Notice of Default requirements](https://law.justia.com/codes/utah/title-57/chapter-1/section-26/) — HIGH confidence (official state code)
- [Utah Foreclosure Timeline — How Long Does Foreclosure Take in Utah](https://www.garybuyshouses.com/blog/how-long-does-foreclosure-take-in-utah/) — MEDIUM confidence (practitioner site)
- [Timelines for Foreclosing on a Trust Deed in Utah — SNJ Legal](https://snjlegal.com/2021/04/16/timelines-and-the-statute-of-limitations-for-foreclosing-on-a-trust-deed-in-utah/) — MEDIUM confidence (Utah law firm)
- [TCPA 2025 Updates for Real Estate — LabCoat Agents](https://www.labcoatagents.com/blog/upcoming-tcpa-rule-changes-in-2025-what-real-estate-agents-need-to-know/) — MEDIUM confidence (industry source, aligns with FCC rule change effective Jan 27 2025)
- [TCPA Text Messages Guide 2026 — ActiveProspect](https://activeprospect.com/blog/tcpa-text-messages/) — HIGH confidence (TCPA compliance vendor, current)
- [A2P 10DLC Compliance — mytcrplus.com](https://mytcrplus.com/solutions/real-estate-messaging-compliance/) — MEDIUM confidence (compliance vendor)
- [Web Scraping Public Pages Legality 2024 — SerpApi](https://serpapi.com/blog/scraping-public-pages-legality/) — MEDIUM confidence (references actual case law)
- [Ninth Circuit on Public Web Scraping — JDSupra/Pillsbury](https://www.jdsupra.com/legalnews/ninth-circuit-finds-again-that-4300492/) — HIGH confidence (law firm analysis of hiQ v. LinkedIn ruling)
- [Skip Tracing LLCs and Trusts — BiggerPockets Forum](https://www.biggerpockets.com/forums/93/topics/631845-skip-tracing-llcs-trusts-companies) — LOW confidence (community forum)
- [Skip Trace an LLC or Trust — Lead Sherpa](https://leadsherpa.freshdesk.com/support/solutions/articles/44001648305-how-to-skip-trace-an-llc-or-trust) — MEDIUM confidence (practitioner product documentation)
- [Utah Probate Records Access — Utah State Archives](https://archives.utah.gov/research/guides/courts-probate/) — HIGH confidence (official state source)
- [Netlify Scheduled Functions Docs](https://docs.netlify.com/build/functions/scheduled-functions/) — HIGH confidence (official Netlify documentation)
- [Netlify Background Functions Overview](https://docs.netlify.com/build/functions/background-functions/) — HIGH confidence (official Netlify documentation)
- [Carbon County Delinquent Tax Sales](https://www.carbon.utah.gov/service/delinquent-tax-sales/) — HIGH confidence (official county source)
- [Utah Tax Liens — State Tax Commission](https://tax.utah.gov/billing/liens/) — HIGH confidence (official state source)
- [Fair Housing Act Penalties — HUD](https://www.hud.gov/program_offices/fair_housing_equal_opp/fair_housing_act_overview) — HIGH confidence (official federal source)
- [Foreclosure Rescue Scams Utah — Duckworth Legal Group](https://duckworthlegalgroup.com/foreclosure-rescue-scams-utah/) — MEDIUM confidence (Utah attorney blog)
- [Utah Foreclosure Posting Requirements — Beacon Default](https://beacondefault.com/States/utah.pdf) — MEDIUM confidence (title/trustee industry reference)

---

**Legal Disclaimer:** This research is informational only and based on publicly available sources, not attorney advice. Before building any feature that contacts homeowners or transmits their personal data, consult a Utah-licensed attorney familiar with TCPA, FHA, and Utah consumer protection law. The legal landscape for investor-homeowner contact is actively shifting as of 2025.

---
*Pitfalls research for: HouseFinder — distressed property lead generation, Utah small towns*
*Researched: 2026-03-17*

---

---

# Milestone Pitfalls: v1.1 UGRC Assessor Data + XChange Court Record Intake

**Milestone:** Adding UGRC assessor enrichment and Utah Courts XChange court record intake to existing HouseFinder system
**Researched:** 2026-04-10
**Confidence:** MEDIUM-HIGH for UGRC (official docs verified); MEDIUM for XChange workflow (access pattern verified, text parsing is empirical); MEDIUM for scoring rebalance (based on code inspection of live system)

These pitfalls are specific to adding these two features to an **already-running** system with 3,114+ scored properties. The existing scoring engine and parcel dedup key are already in production — every pitfall here carries a migration cost if ignored.

---

## Critical Pitfalls — UGRC Assessor Integration

### Pitfall U1: UGRC Desktop API Key Tied to a Single Public IP — Breaks on Azure App Service

**What goes wrong:**
The UGRC API issues two key types: browser keys (authenticated by URL pattern) and desktop/server keys (authenticated by the originating public IP address). Azure App Service does not have a stable outbound IP — the IP can change during scaling events, redeployments, or platform maintenance. If the scraper runs with a desktop key locked to an IP that no longer matches, every UGRC API call returns an authentication error. The import script fails silently if the error response is not explicitly checked.

**Why it happens:**
Developers register the key once with the IP shown at the time of registration, then deploy to Azure and forget that Azure IPs are not guaranteed stable. The UGRC docs explicitly warn: "IP Confusion: Users often mistake their local IP for their public IP when creating desktop keys — a critical error since ISP-assigned addresses aren't always static." On Azure this is structural, not accidental.

**How to avoid:**
- Use the UGRC API with a **browser key** pattern by making requests from a Next.js API route (server-side), not from a long-running scraper process. Browser keys authenticate by the registered URL domain, which is stable.
- Alternatively, register the key against the Azure App Service's outbound IPs (which are listed in the Azure portal under "Outbound IP addresses") and set up an Azure alert if those IPs change.
- Always check the response body on every UGRC request — authentication failures return HTTP 200 with a JSON error body, not HTTP 401. The UGRC docs state: "Be sure to always read the response body when making requests" to catch authentication issues early.
- Log the HTTP response body whenever `result` is null or `status` is non-zero.

**Warning signs:**
- Import script runs without error but `building_sqft`, `year_built`, `assessed_value` columns remain NULL for all properties
- UGRC API response contains `"message": "Invalid API key"` in a 200 response body (not an HTTP error)
- Scraper logs show 0 enriched records despite properties existing in DB

**Phase to address:** UGRC import phase. Verify authentication before writing a single enrichment record.

---

### Pitfall U2: Parcel ID Format Mismatch — UGRC Uses Normalized Formats, Existing DB Uses Raw County Formats

**What goes wrong:**
The existing `properties` table uses `parcel_id` as the unique dedup key, populated directly from county scraper output. Carbon County stores parcel numbers as `07:049:0002` (colon-delimited). Emery County uses `07-049-0002` (hyphen-delimited) or all-numeric `070490002`. UGRC's SGID standardizes parcel IDs into its own schema, but the PARCEL_ID field in UGRC data may use a different format than what the county scraper stored.

The join between UGRC enrichment data and existing properties will fail silently: the UPDATE finds 0 matching rows because `07:049:0002` does not equal `07049-0002`. The enrichment import completes successfully with 0 rows updated, and the developer assumes no matching properties exist.

**Why it happens:**
The county assessor websites (the source for existing `parcel_id` values) use county-specific formats. UGRC normalizes across 29 counties but uses its own canonical form. There is no documented guarantee that UGRC's PARCEL_ID exactly matches what a given county's website displays. The research found that Utah County alone accepts at least four format variants: `123456789`, `12:345:6789`, `12 345 6789`, `12-345-6789`.

**How to avoid:**
- Before running the enrichment import at scale, sample 10-20 properties from each county: pull the `parcel_id` from the DB and the `PARCEL_ID` from UGRC, and compare character-by-character.
- Build a normalizer function that strips all non-alphanumeric characters and zero-pads to a canonical length before matching: `normalizeParcelId(id) => id.replace(/[^0-9A-Za-z]/g, '').toUpperCase()`.
- Store the normalized form in a separate indexed column (`parcel_id_normalized`) on the properties table. Run the UGRC join on the normalized form, not the raw form.
- Do not overwrite `parcel_id` — it's the existing dedup key. The normalized column is only for join purposes.

**Warning signs:**
- UGRC import reports 0 matched properties despite known overlapping geographies
- Spot-checking: a parcel ID from the DB doesn't appear in UGRC results even when manually searched at parcels.utah.gov
- The same property has different `parcel_id` formats in the DB depending on which county scraper inserted it

**Phase to address:** UGRC import phase, before writing any enrichment code. The normalizer must be proven correct for each target county before the import runs.

---

### Pitfall U3: UGRC LIR (Land Information Record) Coverage Is Not Uniform — Rural Counties Have Gaps

**What goes wrong:**
UGRC's Land Information Record (LIR) parcels include the assessor data fields the project needs: `BLDG_SQFT`, `BUILT_YR`, `PROP_CLASS`. But the UGRC documentation explicitly states: "Since each county has its own database and process for maintaining tax year assessment information, users should expect some variability in each County's LIR dataset." The address quality documentation specifically calls out Daggett, Duchesne, Juab, Uintah, Rich, and Sanpete counties as having "data gaps." Several of these are in the project's target geography.

The import runs, matches correctly, but those fields are NULL in the UGRC data for a significant portion of properties. The developer assumes the data exists and was not matched; in reality the data does not exist in the source.

**How to avoid:**
- Before building the import script, download a sample of UGRC LIR data for Juab, Sanpete, and Sevier counties and manually count NULL rates for `BLDG_SQFT` and `BUILT_YR`. If null rate exceeds 40%, treat UGRC as supplementary for those counties, not authoritative.
- Log enrichment coverage per county after each import run: `{county: 'juab', total: 450, enriched: 180, coverage_pct: 40}`. Surface this in the health dashboard.
- Design the enrichment as non-blocking: `building_sqft` and `year_built` remain optional columns in the schema (they already are, per the current schema.ts). Never gate scoring or alerting on their presence.
- Contact UGRC (ugrc-developers@utah.gov) to ask about LIR coverage for Carbon and Emery counties specifically before assuming full coverage.

**Warning signs:**
- `building_sqft` is NULL for >50% of properties in a given county after import
- Properties in Juab, Sanpete, or Sevier show 0% enrichment despite format-matching parcel IDs
- UGRC API search returns results with `BLDG_SQFT: null` or `BLDG_SQFT: 0` for known residential parcels

**Phase to address:** UGRC import phase. Coverage audit is a prerequisite step before the import is considered complete.

---

### Pitfall U4: UGRC Assessor Data Is a Point-in-Time Snapshot, Not a Live Feed

**What goes wrong:**
UGRC receives parcel data from counties "on a schedule" — not in real time. The LIR dataset is a best-effort aggregation that may lag county assessor records by weeks to months. Running the UGRC enrichment import daily adds no value and creates unnecessary API load. More importantly, using `assessed_value` from UGRC in scoring as a "freshness signal" is wrong — it may reflect last year's assessment.

**How to avoid:**
- Run the UGRC enrichment import at most once per quarter, not daily or weekly.
- Store an `assessor_data_as_of` date column on the properties table when writing enrichment data, populated from the UGRC data's own vintage field (if available) or the import timestamp.
- Do not use `assessed_value` as a distress signal component in scoring. It is contextual metadata for the lead detail page, not a real-time indicator of financial distress.
- Mark properties as "enriched" with a boolean flag so repeat imports skip already-enriched properties unless explicitly forced.

**Warning signs:**
- Import is scheduled to run nightly alongside scraper jobs
- Scoring logic references `assessed_value` as a signal weight input
- No timestamp stored for when assessor data was last refreshed per property

**Phase to address:** UGRC import phase. Schedule and staleness handling must be decided before import is built.

---

## Critical Pitfalls — XChange Court Record Intake

### Pitfall X1: The XChange Subscription Agreement Prohibits Automated Scraping — Violating It Risks Account Termination

**What goes wrong:**
XChange is a paid subscription service run by the Utah Administrative Office of the Courts under UCJA Rule 4-202.08. The rule states that the AOC "may disconnect a user of public online services whose use interferes with computer performance or access by other users." While the exact automated-access prohibition language is in the subscription agreement (not publicly available), court data services universally prohibit automated scraping without explicit bulk data agreements. Building a Playwright scraper against xchange.utcourts.gov would violate the subscription terms and risks account termination.

The project has correctly identified agent-assisted manual browser access as the workflow. The pitfall is scope creep: a developer building the "intake pipeline" decides to automate the browser session to save time, which crosses the line.

**How to avoid:**
- The intake pipeline must be designed as: human opens browser → human searches XChange → human copies case details → structured intake form in the app accepts the paste/entry → app parses and creates distress signals.
- Never automate the XChange browser session, even partially (no auto-fill, no auto-submit, no programmatic navigation to XChange URLs from the app).
- Bulk data access IS available from the AOC's Office of Judicial Data and Research under Rule 4-202.08, but requires a separate agreement and approval process. If scale demands it later, pursue that path — not scraping.
- Add a comment in the XChange intake code: `// IMPORTANT: This intake pipeline is manual-only. Do not automate browser interaction with xchange.utcourts.gov.`

**Warning signs:**
- Any code that opens a browser, navigates to xchange.utcourts.gov, or submits XChange search forms programmatically
- A "batch import" feature that tries to process multiple XChange cases at once via automation
- Using Playwright or Puppeteer against the XChange domain

**Phase to address:** XChange intake phase. The constraint must be stated in the phase plan before any code is written.

---

### Pitfall X2: Court Case Titles Are Not Standardized — Parser Will Miss Cases Without Keyword Normalization

**What goes wrong:**
XChange displays case information as entered by court clerks into CORIS. Case titles for foreclosure cases might appear as any of: "FORECLOSURE", "FORE CLOSURE", "NONJUDICIAL FORECLOSURE", "TRUSTEE SALE", "NOTICE OF DEFAULT", "U.S. BANK NA V JONES JAMES". Probate cases might be "IN RE: ESTATE OF SMITH JOHN", "IN THE MATTER OF THE ESTATE OF", "JONES MARY PROBATE", or just "ESTATE SMITH". Code violation cases have no consistent naming convention at all.

A parser with exact keyword matching will miss 30-60% of relevant cases. A parser that is too broad will import civil suits, divorces, and criminal cases as false distress signals.

**Why it happens:**
Court data entry is done by humans with no enforced vocabulary. Each county courthouse has its own clerk practices. CORIS is a data entry system, not a semantic system.

**How to avoid:**
- Build the parser with a tiered keyword system: high-confidence terms (exact match, always import) + medium-confidence terms (pattern match, flag for manual review) + exclusion terms (civil suits, criminal, family law).
- High-confidence: `FORECLOS`, `TRUSTEE SALE`, `NOD`, `LIS PENDENS`, `PROBATE`, `IN RE ESTATE`, `TAX DEED`, `CODE VIOLATION`.
- Medium-confidence: `DEFAULT`, `LIEN`, `IN RE`, `MATTER OF` (require secondary keyword to confirm).
- Exclusion: `DIVORCE`, `CUSTODY`, `CRIMINAL`, `DUI`, `ASSAULT`, `CONTRACT DISPUTE` (these are civil/criminal, not distress signals).
- Store the raw case title alongside the parsed signal type in `distress_signals.raw_data`. This allows retroactive reclassification if the parser is tuned later.
- Treat the first 30 cases parsed as a calibration batch — manually verify every classification before trusting the parser at scale.

**Warning signs:**
- Parser imports 0 probate cases despite manual XChange searches showing them
- Parser imports divorce or contract cases as "probate" or "foreclosure" signals
- The `raw_data` field on distress signals doesn't contain the original case title

**Phase to address:** XChange parser phase. The keyword taxonomy must be designed and reviewed before the parser is built.

---

### Pitfall X3: Matching Court Cases to Existing Properties by Address Is the Hardest Part — and Failures Are Silent

**What goes wrong:**
XChange shows the party address if it was provided to the court, but this is not guaranteed. When an address is available, it may be in any of these forms: `1110 E MAIN ST PRICE UT 84501`, `1110 E. Main Street, Price`, `E MAIN 1110`, `N/A`, or blank. The existing properties table has addresses in normalized form (`1110 E Main St`). A string comparison will fail silently — the court case exists but no property is matched, and no distress signal is created.

Even when addresses do match by string, the match might be wrong: `123 N Main St` could be a different property than `123 N Main St #2` (a unit number). In rural Utah, street addresses without apartment numbers are common and unique, but address-only matching is still fragile.

**Why it happens:**
Court records are not a property database. They capture party addresses as provided by attorneys or clerks, with no geocoding or assessor cross-reference. The project's existing `normalizeAddress()` function handles county assessor format quirks, but it was not designed for court record address formats.

**How to avoid:**
- Match on multiple strategies in priority order, stopping at the first match:
  1. Parcel ID — if the case documents contain a parcel number (trustee sale and tax deed cases often do), use it directly against `properties.parcel_id_normalized`.
  2. Normalized address + city — strip punctuation, normalize abbreviations, then match against `properties.address` + `properties.city`.
  3. Owner name + city — match `parties` from the case against `properties.owner_name`.
  4. No match — store the court signal as an "unmatched_court_records" staging table for manual review.
- Never discard a court record because it didn't match a property. Store it. The property may not yet exist in the system and could be added later.
- Build a `match_confidence` field on the distress signal: `parcel_match` = HIGH, `address_match` = MEDIUM, `name_match` = LOW. Surface LOW-confidence matches for manual review before scoring.
- Extend `normalizeAddress()` to handle court address formats: strip periods, expand `St.` to `St`, `Ave.` to `Ave`, handle `N/A` as blank.

**Warning signs:**
- 0% match rate between court case imports and existing properties despite known overlapping addresses
- Court case records are silently discarded when no match is found
- Distress signals imported from court cases show owner names from the case instead of the assessor record

**Phase to address:** XChange intake phase. The matching strategy must be designed before the intake form is built.

---

### Pitfall X4: Court Case Search Results Cap at 500 — Bulk Research Sessions Will Miss Cases

**What goes wrong:**
XChange FAQ explicitly states: "Narrow searches when exceeding 500 result maximum." Any search that returns more than 500 results is silently truncated to 500. When researching all foreclosure cases in Carbon County over a date range, it is easy to exceed 500 results and not notice. The researcher believes they have a complete picture; in fact they have a partial one.

**How to avoid:**
- Structure XChange searches to stay under 500 results: search by case type AND date range (one month at a time, not one year). If a month still exceeds 500, search by case type AND plaintiff/petitioner category.
- Record the search parameters used for each batch in the intake form so you know what was covered.
- Build the intake pipeline to accept a "search batch ID" field so multiple XChange sessions can be aggregated without duplication. Each session should note the date range it covered.
- Do not assume one XChange session per county covers all cases. Multiple sessions covering different date ranges are required for historical backfill.

**Warning signs:**
- XChange search shows exactly 500 results (the cap — not a coincidence)
- Intake sessions cover wide date ranges ("all 2024 foreclosures in Carbon County") rather than narrow ones
- No record of what date ranges have been covered in previous sessions

**Phase to address:** XChange intake phase. Session management and date range tracking must be built into the intake UI.

---

## Critical Pitfalls — Distress Scoring Rebalance

### Pitfall S1: Adding Court Record Signals Without Adjusting `hot_lead_threshold` Inflates Hot Lead Count Immediately

**What goes wrong:**
The current scoring system has a `hot_lead_threshold` of 4 (configurable in `scraper_config`). The current signals are tax liens (weight 1-4 by amount) + years-delinquent bonus (0-4). Adding court record signals (probate, lis pendens, code violation) at non-trivial weights means existing properties that were just below threshold will now cross it — not because they became more distressed, but because the scoring system changed. The hot lead count jumps from 275 to potentially 800+ in one rescore run. The user gets a flood of email/SMS alerts for leads that aren't newly distressed.

**Why it happens:**
Developers add new signal types to `scoring_signals` config with reasonable per-signal weights, then run `scoreAllProperties()` and observe the new count. They don't realize the new signals promoted hundreds of existing borderline properties to hot status.

**How to avoid:**
- Before adding any new signal type to the config, run a dry-run rescore: simulate the new weights without writing to the DB, count how many properties would cross threshold, and compare to current hot count.
- Raise `hot_lead_threshold` proportionally when adding new signal types. Current threshold = 4 for 2 signal types. Adding 3 more signal types suggests threshold needs to rise to 6-7 to maintain signal quality.
- Stage the rollout: add one signal type at a time, rescore, observe hot count, adjust threshold before adding the next.
- Suppress alerts for the first rescore after adding new signals: set a flag in `scraper_config` like `scoring_version_changed = true` that prevents alert dispatch. Clear the flag after manually reviewing the new hot lead set.

**Warning signs:**
- Hot lead count more than doubles after a rescore that added new signal types
- Alerts fire for properties that were already in the system with no new activity
- `scoring_signals` config has new types added but `hot_lead_threshold` unchanged

**Phase to address:** Scoring rebalance phase, before any new signal types go live.

---

### Pitfall S2: Court Record Signals and Tax Lien Signals Can Double-Count the Same Distress Event

**What goes wrong:**
A property with a trustee sale notice will have:
- An `nod` signal (from Utah Legals scraper, already in DB)
- A `lis_pendens` signal (from XChange court intake, newly added)

These two signals represent the same foreclosure proceeding. Stacking them treats one event as two distress indicators, artificially inflating the score. A property that is in foreclosure but otherwise healthy scores higher than a property with two independent distress events (e.g., tax lien + probate).

**Why it happens:**
The data model treats each signal as independent. There is no concept of "same underlying event" across signal types. The dedup constraint on `distress_signals` (unique on `property_id + signal_type + recorded_date`) prevents duplicate signals of the same type, but not signals of different types representing the same event.

**How to avoid:**
- Treat `nod` and `lis_pendens` as mutually exclusive in scoring: if both exist for the same property with dates within 90 days of each other, score only the higher-weight one. In the current scoring engine (`score.ts`), add a deduplication step for foreclosure-type signals before summing weights.
- Document the signal taxonomy: NOD = trust deed foreclosure (non-judicial), lis pendens = judicial lien/foreclosure action. They can co-exist as genuinely separate events (e.g., a judicial foreclosure AND a trust deed NOD from a different creditor) but are more often the same event seen from two data sources.
- Add a `source_category` field to distress signals: `foreclosure_proceeding`, `tax_delinquency`, `probate`, `code_violation`. Only score one signal per `source_category` per property (the freshest/highest-weight one).

**Warning signs:**
- A property with one foreclosure has a higher score than a property with an NOD + tax lien (two genuinely independent events)
- `nod` and `lis_pendens` consistently co-occur on the same properties within the same date ranges
- Score distribution shifts dramatically after adding `lis_pendens` signals even for properties that already had `nod` signals

**Phase to address:** Scoring rebalance phase. Signal taxonomy must be defined before new court-derived signal types are weighted.

---

### Pitfall S3: Scoring Config Is in the Database — Adding New Signal Types Requires a Data Migration, Not Just a Code Change

**What goes wrong:**
The current `scoring_signals` JSON in `scraper_config` only contains entries for the signal types that existed when `seed-config.ts` was last run. Adding `probate`, `code_violation`, and `lis_pendens` as new types requires updating this JSON in the production database. Developers who add the signal type to the `signalTypeEnum` in schema.ts and add import code for the new signals forget that `scoreProperty()` skips signals with no matching config entry (`if (!signalCfg) continue`). New signals are silently ignored in scoring.

**Why it happens:**
The scoring config is runtime-configurable (stored in DB, not hardcoded), which is correct for production flexibility. But this means a deploy that adds new signal types is incomplete until the DB config is also updated. These are two separate steps that can be done out of order or one can be forgotten.

**How to avoid:**
- Write a migration script (not a seed script) that adds new signal type configs to the `scraper_config` table via `INSERT ... ON CONFLICT DO NOTHING`. This is safe to run multiple times.
- Add an assertion to the scoring engine startup: if `distressSignals` contains a `signal_type` value that has no entry in `scoring_signals` config, log a warning: `[scoring] Unknown signal type 'probate' — 0 weight applied. Add to scoring_signals config.`
- The migration and the code change should be deployed together in the same release.

**Warning signs:**
- `probate` or `lis_pendens` signals exist in `distress_signals` table but no properties are scoring higher after those signals are imported
- `scoreProperty()` logs 0 for a property known to have a court-derived signal
- `scraper_config` row for `scoring_signals` does not contain entries for the new signal types

**Phase to address:** Scoring rebalance phase, as part of the first release that adds new signal types.

---

## Moderate Pitfalls — Integration-Specific

### Pitfall I1: UGRC Enrichment Import Overwrites Good Data with NULL When a County Has Sparse LIR Coverage

**What goes wrong:**
The existing `upsertProperty()` function in `upsert.ts` has a guard for address/city: it only overwrites if the new value is non-empty. The UGRC enrichment import script, if written naively, might use a simple `UPDATE properties SET building_sqft = $1, year_built = $2 WHERE parcel_id = $3` — which sets those fields to NULL when the LIR row has no value, overwriting any data that might have been manually entered.

**How to avoid:**
- Write the UGRC enrichment UPDATE as: `SET building_sqft = COALESCE($1, building_sqft), year_built = COALESCE($2, year_built)` — only overwrite if the new value is non-null.
- This is the same pattern used in `upsert.ts` for address/city. Apply it consistently to all enrichment fields.
- Track `ugrc_enriched_at` timestamp separately from `updated_at` so you can distinguish UGRC updates from other property updates.

**Phase to address:** UGRC import phase. COALESCE guards must be in the first version of the import query.

---

### Pitfall I2: XChange Costs $0.35 Per Search — Uncontrolled Research Sessions Accumulate Cost Quickly

**What goes wrong:**
XChange subscription costs $40/month for 500 searches, then $0.35 per additional search. A researcher running broad searches to find all foreclosure/probate cases for 6 counties over 2 years of history could easily hit 2,000+ searches in a single session. At $0.35 overage, that's $525 above the monthly fee for one session.

**How to avoid:**
- Before any research session, estimate the expected search count: number of case type searches × number of date range slices × number of counties = total searches.
- Prefer narrow, targeted searches (specific case type + specific date month) over broad searches ("all civil cases in Carbon County").
- Track searches used per month in the intake UI by recording each session's search count. Alert when approaching 400 searches in a month (buffer before overage).
- The $40/month subscription covers 500 searches — for targeted use (researching new leads monthly, not bulk historical backfill), this is sufficient.

**Phase to address:** XChange intake phase. Cost awareness must be built into the intake workflow design.

---

## Phase-Specific Warnings Summary

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| UGRC import — API key setup | Desktop key IP mismatch on Azure | Use browser key pattern from Next.js API route, or verify Azure outbound IPs |
| UGRC import — parcel matching | Format mismatch (colons vs hyphens vs bare digits) | Build `parcel_id_normalized` column before import; audit each county |
| UGRC import — coverage | Rural county LIR gaps (Juab, Sanpete, Sevier) | Coverage audit pre-import; treat as supplementary, not required |
| UGRC import — staleness | LIR data lags assessor by weeks/months | Run quarterly only; never use assessed_value as a scoring signal |
| XChange intake — legal | Automating XChange browser session | Manual-only intake; no Playwright/Puppeteer against XChange |
| XChange intake — parsing | Inconsistent case title text | Tiered keyword taxonomy; store raw_data; calibration batch |
| XChange intake — matching | Address mismatch between court and assessor formats | Multi-strategy matching; unmatched staging table; match_confidence field |
| XChange intake — completeness | 500-result cap on searches | Narrow searches by month; track date ranges covered |
| Scoring rebalance — threshold | Hot lead count explosion after adding signals | Dry-run rescore before going live; raise threshold proportionally |
| Scoring rebalance — double-counting | NOD + lis pendens both scoring for same foreclosure | Signal deduplication by source_category in scoreProperty() |
| Scoring rebalance — config | New signal types silently ignored (no config entry) | DB migration for scoring_signals config; startup warning for unconfigured types |

---

## Sources — v1.1 Milestone Pitfalls

- [UGRC API Getting Started](https://api.mapserv.utah.gov/getting-started/) — HIGH confidence (official UGRC documentation; browser vs desktop key distinction, IP confusion warning, and response body monitoring requirement all sourced here)
- [UGRC API Self-Service Portal](https://developer.mapserv.utah.gov/) — HIGH confidence (official UGRC developer portal)
- [UGRC Understanding the API for Address Locating](https://gis.utah.gov/blog/2024-08-22-understanding-the-ugrc-api-for-address-locating/) — HIGH confidence (official UGRC blog; rural county data gaps, accuracy dependencies)
- [UGRC Utah Parcels — SGID](https://gis.utah.gov/products/sgid/cadastre/parcels/) — HIGH confidence (official UGRC; LIR field descriptions, county variability acknowledgment)
- [Utah Courts XChange FAQ](https://www.utcourts.gov/en/court-records-publications/records/xchange/faq.html) — HIGH confidence (official Utah Courts; 500-result cap, case title entry by clerks)
- [Utah Courts XChange Subscription Fees](https://www.utcourts.gov/en/court-records-publications/records/xchange/subscribe.html) — HIGH confidence (official Utah Courts; $40/month, $0.35/search overage)
- [UCJA Rule 4-202.08](https://legacy.utcourts.gov/rules/view.php?type=ucja&rule=4-202.08) — HIGH confidence (official Utah Code of Judicial Administration; bulk data access process, interference/disconnection provision)
- [HouseFinder schema.ts](../../../app/src/db/schema.ts) — HIGH confidence (live production code; parcel_id as unique key, signalTypeEnum values, existing assessor columns)
- [HouseFinder score.ts](../../../scraper/src/scoring/score.ts) — HIGH confidence (live production code; scoring config loading, signal type skip behavior, hot_lead_threshold)
- [HouseFinder upsert.ts](../../../scraper/src/lib/upsert.ts) — HIGH confidence (live production code; normalizeAddress() implementation, COALESCE guard pattern)
- [Utah County Parcel Map — serial number formats](https://maps.utahcounty.gov/ParcelMap/ParcelMap.html) — MEDIUM confidence (official Utah County; four format variants documented)
- Address matching pitfalls — fuzzy matching complexity, false positives from over-broad matching — MEDIUM confidence (multiple independent sources agree on core failure modes)

---
*Milestone pitfalls for: HouseFinder v1.1 — UGRC assessor enrichment + XChange court record intake*
*Researched: 2026-04-10*
