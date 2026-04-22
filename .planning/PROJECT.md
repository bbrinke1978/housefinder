# HouseFinder

## What This Is

A free, mobile-first web application that finds distressed properties in small Utah towns before they hit foreclosure, scores them by urgency, and alerts the user to hot leads so they can contact homeowners directly. Think BatchLeads + BatchDialer but free, focused on rural Utah markets with less competition.

## Core Value

Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses — the earlier the better, the more distress signals the hotter the lead.

## Current Milestone: v1.3 Rose Park Pilot

**Goal:** Pilot urban expansion by adding Salt Lake City's Rose Park neighborhood (zip 84116) as a distress-scraping target — additive to the rural counties, not a replacement. Brian is personally familiar with the area and it is close to his homes.

**Target features:**
- Surface Rose Park (84116) properties already collected by statewide scrapers (NOD, UGRC assessor) that are currently hidden by the rural-only city filter
- Salt Lake County tax delinquent scraper (analog of carbon-delinquent / emery-delinquent-pdf)
- Salt Lake County recorder scraper for deed/lien/lis pendens filings (analog of carbon-recorder)
- Rose Park–specific filter in the dashboard UI (leaning toward retagging 84116 as `city = 'Rose Park'` so the existing city filter just works)
- Daily scraper schedule if feasible; weekly acceptable as a fallback
- Light scoring calibration check — Rose Park density may surface different signal mixes than rural

## Requirements

### Validated

- v1.0: Core platform shipped (20 phases) — scraping, scoring, deals, contracts, photos, CRM, campaigns, security
- v1.1: Data enrichment (Phases 21-23) — UGRC assessor enrichment, XChange court record intake pipeline, scoring rebalance
- v1.2: Advanced MAO Calculator (Phase 24) — dual buyer/flipper + wholesaler views, HML convergence

### Active

- [ ] Daily scraping of public records for distressed property indicators (NOD, tax liens, lis pendens, probate)
- [ ] Property search focused on Price, UT + ~10 similar small Utah towns by population demographics
- [ ] Distress signal scoring — properties with 2+ indicators flagged as hot leads
- [ ] Mobile-first responsive dashboard to browse leads, filter, and take action
- [ ] Tap-to-call from mobile — phone numbers clickable on hot lead alerts
- [ ] Email alerts (via Resend) for hot leads with multiple distress signals
- [ ] SMS/text alerts for urgent hot leads
- [ ] Map-based property view for geographic browsing
- [ ] Lead status tracking — new, contacted, follow-up, closed, dead
- [ ] Property detail pages with all available public data (owner name, address, tax status, mortgage info, equity estimate)
- [ ] Owner contact information sourced from free/public data (county assessor, voter rolls, public records)
- [ ] Hot lead flagging for manual skip tracing when free sources don't have contact info
- [ ] Configurable target cities/counties — start with 10, expand as needed
- [ ] Vacant/neglected property detection from code violations and utility shutoff records
- [ ] Probate/estate lead detection from court filings
- [ ] Notes and follow-up tracking per lead (mini-CRM)

### Out of Scope

- Paid skip tracing services (BatchSkipTracing, TLO, BeenVerified) — keep it free
- Auto-dialer / predictive dialing — manual calls only
- Direct mail campaigns — focus on phone contact
- Markets outside Utah — start small, expand later
- Native mobile app — responsive web app is sufficient
- OAuth/social login — simple auth is fine
- Real-time chat or messaging features
- Video content or virtual tours

## Context

- **Inspiration:** BatchLeads (property lead gen, list stacking, skip tracing, map view) and BatchDialer (call management, lead tracking, follow-up reminders). We're building the free/DIY version focused on a specific niche.
- **Market strategy:** Small Utah towns like Price (pop ~8,500) where competition from other investors using tools like BatchLeads is minimal. Target towns with similar population demographics.
- **Data approach:** All free/public sources — county recorder filings, tax records, court filings (probate), code violation databases, utility records where available. No paid APIs.
- **Tech stack:** Next.js + TypeScript + Tailwind + shadcn/ui (frontend, same as nychvac). Azure App Service for hosting, Azure PostgreSQL Flexible Server for database, Azure Functions for scheduled scraping. Pattern follows run4luv project.
- **Existing accounts:** User has Resend (email), Azure (with existing run4luv RGs), and GitHub (bbrinke1978) already configured.
- **Reference projects:** github.com/bbrinke1978/nychvac (frontend stack), github.com/bbrinke1978/run4luv (Azure infrastructure pattern).

## Constraints

- **Budget**: Minimal ongoing cost — no paid APIs, no paid skip tracing. Azure free/cheap tiers (F1 App Service, B1ms PostgreSQL ~$13/mo)
- **Tech stack**: Next.js + TypeScript + Tailwind + shadcn/ui (frontend) + Azure PostgreSQL + Azure Functions (scraping)
- **Hosting**: Azure App Service in West US 3, resource group `rg-housefinder`, production only. No local development — build and deploy directly to Azure from day one.
- **DNS**: Use Azure DNS zone for the domain (no external DNS needed)
- **Geography**: Utah — 9 rural small towns (Carbon/Emery/Sanpete/Sevier/Juab/Millard counties) + Rose Park (Salt Lake City zip 84116) as urban pilot. Rose Park is a scoped experiment; if it produces deals, expand to other SLC neighborhoods. If not, stay rural.
- **Data sources**: Public records only — county, state, and federal databases
- **SMS provider**: Need to identify a free/cheap SMS service for text alerts

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Free data sources only | Keep operating cost at zero; paid skip tracing deferred to manual process | — Pending |
| Next.js + same stack as nychvac | User already has accounts, tooling, and familiarity set up | — Pending |
| Azure over Netlify | Need real database (PostgreSQL) and long-running scraper jobs (Azure Functions); Netlify's 15-min limit too tight | — Pending |
| Single production environment | Only user is the investor; no need for dev/prod separation | — Pending |
| West US 3 region | Consistent with existing Azure infrastructure | — Pending |
| Start with 10 Utah small towns | Less competition, manageable scope, expand based on results | ✓ Good — v1.0 validated rural strategy |
| v1.3 Rose Park urban pilot | Test urban market with a scoped zip (84116) close to Brian's homes. Augments rural; does not replace. | — Pending |
| Mobile-first design | User needs to act on hot leads from phone — tap-to-call is critical | — Pending |
| Distress signal stacking for scoring | Multiple indicators = higher urgency = hot lead alert | — Pending |
| Email + SMS dual alerts | Email for details, SMS for urgency on hot leads | — Pending |
| No local dev — all Azure | Deploy directly to Azure from day one; no local machine setup needed. Saves time and avoids local/cloud drift | — Pending |
| Azure DNS for domain | Keep everything in Azure — DNS zone in rg-housefinder | — Pending |

---
*Last updated: 2026-04-21 after v1.3 Rose Park Pilot milestone kickoff*
