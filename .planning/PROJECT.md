# HouseFinder

## What This Is

A free, mobile-first web application that finds distressed properties in small Utah towns before they hit foreclosure, scores them by urgency, and alerts the user to hot leads so they can contact homeowners directly. Think BatchLeads + BatchDialer but free, focused on rural Utah markets with less competition.

## Core Value

Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses — the earlier the better, the more distress signals the hotter the lead.

## Requirements

### Validated

(None yet — ship to validate)

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
- **Hosting**: Azure App Service in West US 3, resource group `rg-housefinder`, production only
- **Geography**: Utah small towns only, starting with ~10 cities around Price, UT
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
| Start with 10 Utah small towns | Less competition, manageable scope, expand based on results | — Pending |
| Mobile-first design | User needs to act on hot leads from phone — tap-to-call is critical | — Pending |
| Distress signal stacking for scoring | Multiple indicators = higher urgency = hot lead alert | — Pending |
| Email + SMS dual alerts | Email for details, SMS for urgency on hot leads | — Pending |

---
*Last updated: 2026-03-17 after platform decision (Azure over Netlify)*
