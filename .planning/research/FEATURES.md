# Feature Research

**Domain:** Distressed property lead generation (real estate investor tool)
**Researched:** 2026-03-17
**Confidence:** MEDIUM — competitive feature sets confirmed via web research; free-source-only constraint is unique to this project so some differentiators are inferred rather than observed

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. Based on analysis of BatchLeads, PropStream, DealMachine, and REIPro.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Property search with address/city lookup | Any lead tool must find properties by location | LOW | Utah county assessor data is free; basic search is foundational |
| Distress indicator display per property | This IS the product — users need to see what makes a property distressed | LOW | NOD, tax lien, lis pendens, probate, vacant flags per property |
| Property detail page | Every competitor has it; users need owner name, address, tax status, basic property facts | MEDIUM | Pull from county assessor + recorder; show all available public fields |
| Lead list / saved searches | Users build and revisit lists; no list = no workflow | MEDIUM | Save filter criteria and review saved leads on return visits |
| Lead status tracking | Users need to track what they've done with each lead (contacted, following up, closed, dead) | LOW | 5 statuses: New, Contacted, Follow-Up, Closed, Dead |
| Notes per lead | Universal expectation; investors take notes constantly | LOW | Simple text field per lead, timestamped |
| Mobile-responsive UI | Investors act in the field; mobile usability is assumed | MEDIUM | Mobile-first layout, large tap targets, readable at a glance |
| Map view of properties | BatchLeads, PropStream, DealMachine all have map view; users expect geographic browsing | HIGH | Map with property pins, filter by distress type on map; hardest feature to build well |
| Filter/sort by distress type | Core workflow: "show me all pre-foreclosures in Price, UT" | LOW | Filter UI over property list; sort by date added, distress count |
| Owner name visible | County assessor always has this; users need to know who to call | LOW | From county assessor scrape |

### Differentiators (Competitive Advantage)

Features that set the product apart. Competitors charge $97–$299/month. We're free with a niche focus.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Multi-signal distress scoring (list stacking) | Properties with 2+ distress indicators are far more likely to sell; competitors charge extra for this; we surface it automatically | MEDIUM | Count distress signals per property, sort/flag by count. Threshold: 2+ = hot lead |
| Hot lead email alerts | BatchLeads has alerts but requires setup and subscription; we send daily/immediate alerts automatically | MEDIUM | Resend API already set up; trigger on new 2+ signal properties |
| Hot lead SMS alerts | SMS is faster than email for urgent leads; competitors treat this as premium | MEDIUM | Need free/cheap SMS provider (Twilio trial or similar); send for 3+ signal properties |
| Rural Utah market focus | BatchLeads/PropStream users target Phoenix, Las Vegas, SLC — Price, UT and similar towns have almost no tool-using competition | LOW | Pre-configured for ~10 Carbon/Emery/Sanpete/Sevier County towns |
| Tap-to-call from lead detail | Mobile-first investors want zero friction between seeing a hot lead and calling the owner | LOW | `tel:` link on owner phone number; works on any mobile browser |
| Free owner contact lookup from public sources | Competitors charge $0.15–$0.50 per skip trace; we pull from county assessor + voter rolls for free | HIGH | Carbon County assessor, Utah voter registration data, state business registry for LLCs. Coverage will be partial — flag when not found |
| Probate / estate lead detection | Competitors often miss this or charge extra; heirs who inherit distressed property are highly motivated sellers | HIGH | Scrape Utah state court OCAP system for probate filings; match to property addresses |
| Vacant / code violation detection | Code violations = neglect = distress; not all competitors surface this | HIGH | City/county code enforcement records where available; utility shutoff records |
| Daily automated scraping with new lead indicator | Users return to see "what's new since yesterday" — competitors require manual list refreshes | MEDIUM | Track first-seen date per property; badge new leads on dashboard |
| Configurable city/county scope | Investors want to lock in their market and only see noise from their area | LOW | Checkbox list of target towns; filter all data by selection |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable but create problems given our constraints.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Paid skip tracing integration | BatchLeads, REIPro, PropStream all offer it; users will ask for it | Breaks the zero-cost constraint. BatchSkipTracing, TLO, BeenVerified all cost money per lookup. Creates dependency on third-party paid API | Flag leads where contact info is missing with "Manual skip trace needed" badge. Free sources (voter rolls, assessor) cover a meaningful portion of owners |
| Auto-dialer / predictive dialer | BatchDialer is companion to BatchLeads; power dialers increase contact rates | Rural Utah markets have small lists (dozens, not thousands). Auto-dialers require TCPA compliance work and often paid telephony providers. Overkill for this scale | Tap-to-call with notes per contact attempt. Manual dialing is fine at this scale |
| Direct mail campaign builder | REIPro, BatchLeads offer postcard automation | Postcard printing costs money per send. Requires address normalization, mailing list management, third-party print API (PostGrid, Lob). Adds ongoing per-use cost | Contact by phone first. If user wants mail, export a CSV of addresses for manual use |
| MLS / on-market listing data | Users sometimes want to compare distressed prices to listed comps | MLS access requires REALTOR membership or paid API. Not needed for pre-foreclosure workflows where properties are off-market | Show Zillow/Redfin estimated value from public estimate sources if available; or prompt user to check Zillow manually |
| Native iOS / Android app | DealMachine's app store presence is a selling point | Native apps require App Store/Play Store accounts, separate builds, push notification infrastructure, and platform updates. Responsive web app with PWA achieves 90% of the value | PWA-capable responsive Next.js app with home screen install prompt |
| Real-time property alerts (push notifications) | Users want instant notification | Push notifications require service workers, notification permission flows, and backend WebSocket infrastructure. Complexity is high relative to value for a niche tool | Email + SMS alerts on a daily or immediate-trigger basis. Checked frequently enough for rural markets |
| Multi-user team management | BatchLeads, DealMachine support teams | Adds auth complexity, permission systems, shared pipeline management. Single user is the target persona | Simple single-account auth. Team features are v2+ if product finds multi-investor use |
| Deal analyzer / ROI calculator | REIPro, DealMachine include this | Adds substantial UI complexity. Requires ARV, repair cost, financing inputs. Not relevant until user has a specific deal to analyze | Link out to free external calculators (BiggerPockets, DealCheck free tier) |

---

## Feature Dependencies

```
[Distress Signal Scoring (hot lead threshold)]
    └──requires──> [Distress Indicator Scraping per property]
                       └──requires──> [County Recorder / Court Scraping]
                       └──requires──> [Tax Assessor Scraping]

[Hot Lead Email Alert]
    └──requires──> [Distress Signal Scoring]
    └──requires──> [Resend API integration]

[Hot Lead SMS Alert]
    └──requires──> [Distress Signal Scoring]
    └──requires──> [SMS provider setup]

[Owner Phone Number (tap-to-call)]
    └──requires──> [Owner Contact Lookup from public sources]
                       └──requires──> [County Assessor owner name]
                       └──requires──> [Voter roll lookup (by name + address)]

[Map View]
    └──requires──> [Property geocoding (lat/lng per address)]
    └──requires──> [Property list in database]

[Lead Status Tracking]
    └──requires──> [Property Detail Page]

[Notes per Lead]
    └──requires──> [Lead Status Tracking] (same data model)

[Probate Lead Detection] ──enhances──> [Distress Signal Scoring]
    └──requires──> [Utah OCAP court scraping]
    └──requires──> [Address matching between court filing and property record]

[Vacant / Code Violation Detection] ──enhances──> [Distress Signal Scoring]
    └──requires──> [City/county code enforcement data access]
    (availability varies by city — may not be available for all target towns)

[Daily New Lead Badge]
    └──requires──> [First-seen timestamp on every property]
    └──requires──> [Scheduled scraper runs]

[Map View] ──conflicts──> [Low-complexity MVP scope]
    (Map view is HIGH complexity and should be deferred post-core)
```

### Dependency Notes

- **Distress signal scoring requires all scrapers to be running first:** Scoring is meaningless without data. All data collection must be in place before scoring is useful.
- **Owner contact lookup is partially independent:** Can show property + distress data without contact info; flag "no contact found" and let user manually skip trace.
- **Map view is a standalone enhancement:** Core workflow (dashboard list + detail + alerts) works without map. Map is a v1.x addition.
- **Probate detection conflicts with scraper complexity:** Utah OCAP (Online Court Assistance Program) is the source; parsing court filings to extract property addresses is non-trivial. Should be Phase 2.
- **Hot lead SMS conflicts with zero-cost constraint:** Twilio trial gives limited free credits; ongoing SMS has per-message cost. Design as optional or accept minimal cost (~$1–5/month at this scale).

---

## MVP Definition

### Launch With (v1)

Minimum viable product to validate the concept against real Utah distressed property data.

- [ ] Property database seeded from Carbon County assessor + recorder data — validates free-source-only approach
- [ ] Distress indicator flags per property (NOD, tax delinquency, lis pendens) — core value of the tool
- [ ] Multi-signal distress scoring (hot lead = 2+ indicators) — the key differentiator vs a raw list
- [ ] Lead list dashboard with filter by city, distress type, hot lead status — basic usability
- [ ] Property detail page with all available public data + owner name — gives user context to act
- [ ] Lead status tracking (New / Contacted / Follow-Up / Closed / Dead) — minimum CRM
- [ ] Notes per lead — minimum CRM
- [ ] Hot lead email alert via Resend — the "set it and forget it" value proposition
- [ ] Tap-to-call on owner phone number (when available from public sources) — mobile-first action
- [ ] Mobile-responsive UI — required for field use

### Add After Validation (v1.x)

Add once the core is proven to surface real leads.

- [ ] Map view of properties — add when users want geographic browsing (requires geocoding pipeline)
- [ ] Hot lead SMS alerts — add when email alerts are confirmed working; assess cost
- [ ] Voter roll phone number lookup — enriches owner contact rate; implement once assessor data is confirmed useful
- [ ] Daily new lead badge / "since your last visit" indicator — quality-of-life for return users
- [ ] Probate / estate lead detection via Utah OCAP — high-value leads, high scraping complexity

### Future Consideration (v2+)

Defer until product-market fit is established with the single user.

- [ ] Additional Utah markets beyond initial ~10 towns — expand based on whether current leads convert
- [ ] Vacant / code violation detection — value is real but data availability is inconsistent by city
- [ ] PWA / home screen installability — nice to have once users are habitual
- [ ] Export to CSV for manual mail campaigns — low effort, low urgency
- [ ] Multi-user / team support — only if investor shares tool with partner or VA

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Distress indicator scraping (NOD, tax lien, lis pendens) | HIGH | HIGH | P1 |
| Property detail page | HIGH | MEDIUM | P1 |
| Lead dashboard with filters | HIGH | MEDIUM | P1 |
| Multi-signal distress scoring (hot lead) | HIGH | LOW | P1 |
| Hot lead email alert (Resend) | HIGH | LOW | P1 |
| Lead status tracking (CRM basics) | HIGH | LOW | P1 |
| Notes per lead | MEDIUM | LOW | P1 |
| Tap-to-call (mobile) | HIGH | LOW | P1 |
| Mobile-responsive UI | HIGH | MEDIUM | P1 |
| Owner contact lookup (assessor + voter rolls) | HIGH | HIGH | P1 |
| Daily new lead indicator | MEDIUM | LOW | P2 |
| Map view | MEDIUM | HIGH | P2 |
| Hot lead SMS alerts | MEDIUM | MEDIUM | P2 |
| Voter roll phone number enrichment | MEDIUM | HIGH | P2 |
| Probate / estate lead detection | HIGH | HIGH | P2 |
| Vacant / code violation detection | MEDIUM | HIGH | P3 |
| PWA installability | LOW | LOW | P3 |
| CSV export | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch (MVP)
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

---

## Competitor Feature Analysis

| Feature | BatchLeads | PropStream | DealMachine | REIPro | HouseFinder Approach |
|---------|------------|------------|-------------|--------|---------------------|
| Property search | 155M+ properties, 300+ filters | 165+ filters, 20 pre-built lists | 700+ data points, 70+ filters | Millions of motivated seller leads | ~10 Utah towns; deep county-level data vs national breadth |
| Distress indicators | Pre-foreclosure, tax delinquent, vacant, absentee, high equity | Pre-foreclosure, tax lien, vacant, lis pendens, probate | Pre-foreclosure, vacant, absentee | Foreclosure, distressed property filters | Same core indicators; sourced free from county records |
| List stacking / scoring | Yes — BatchRank AI for scoring | Yes — list stacking by overlap count | Yes — 700+ data point stacking | Yes — motivation scoring | Manual count of distress signals; 2+ = hot lead flag |
| Skip tracing | Paid — $0.15–$0.50/record | Paid — enhanced skip tracing add-on | Paid — included in subscription tiers | Paid — built-in skip tracing | Free only — county assessor + voter rolls; manual flag when not found |
| Map view | Yes — boundary map search, virtual canvassing | Yes — Mobile Scout driving app | Yes — route tracking, satellite/street view | No prominent map feature | Planned v1.x; not MVP |
| Driving for dollars | Yes — mobile app | Yes — Mobile Scout app | Yes — core feature | No | Out of scope (no field driving workflow) |
| Email/SMS alerts | Yes — requires SMS provider setup | Yes — Lead Automator email alerts | Limited | Yes — automated follow-up sequences | Email via Resend (day 1); SMS via cheap provider (v1.x) |
| CRM / lead pipeline | Built-in CRM, conversation history | Basic lead management | Basic pipeline | Full CRM with 10-step workflow | Lightweight: status + notes per lead |
| Mobile app | Native iOS + Android | Mobile Scout app (iOS + Android) | Native iOS + Android | Web-based | Responsive web / PWA — no native app |
| AI lead scoring | BatchRank AI | Predictive AI for off-market leads | AI Street View analysis for distress | No | No AI — signal count is the score |
| Price | $127–$297/month | $99–$199/month | $49–$299/month | $109/month | Free |
| Geographic scope | National | National | National | National | Utah only (~10 small towns) |

---

## Sources

- [BatchLeads features overview](https://batchleads.io/) — official site
- [BatchLeads Review 2026 — Real Estate Skills](https://www.realestateskills.com/blog/batch-leads-review)
- [BatchLeads Review 2026 — REsimpli](https://resimpli.com/blog/batchleads-review/)
- [BatchLeads vs PropStream 2026](https://resimpli.com/blog/batchleads-vs-propstream/)
- [PropStream features page](https://www.propstream.com/propstream-features)
- [PropStream pre-foreclosure lead list](https://www.propstream.com/news/quick-list-spotlight-pre-foreclosures)
- [DealMachine all-in-one platform](https://www.dealmachine.com/all-in-one-platform)
- [DealMachine Review 2026 — Real Estate Skills](https://www.realestateskills.com/blog/dealmachine-review)
- [DealMachine vs PropStream](https://resimpli.com/blog/dealmachine-vs-propstream/)
- [REIPro review 2025](https://realestatebees.com/software/reipro/)
- [REIPro review 2026 — Real Estate Skills](https://www.realestateskills.com/blog/reipro-review)
- [Driving for dollars apps 2025](https://realestatebees.com/guides/software/driving-for-dollars/)
- [BatchLeads distressed property guide](https://batchleads.io/blog/how-to-find-distressed-properties-your-investment-opportunity-guide)
- [BatchLeads tax delinquent properties](https://batchleads.io/properties/tax-delinquent-properties-for-sale)
- [Carbon County Recorder — Utah](https://www.carbon.utah.gov/department/recorder/)
- [Emery County Recorder — Utah](https://emerycounty.com/home/offices/recorder/)
- [Utah Public Records Online Directory — NETROnline](https://publicrecords.netronline.com/state/UT)

---

*Feature research for: distressed property lead generation (rural Utah)*
*Researched: 2026-03-17*
