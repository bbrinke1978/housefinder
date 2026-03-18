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
