# HouseFinder

## What This Is

A free, mobile-first web application that finds distressed properties in small Utah towns before they hit foreclosure, scores them by urgency, and alerts the user to hot leads so they can contact homeowners directly. Think BatchLeads + BatchDialer but free, focused on rural Utah markets with less competition.

## Core Value

Surface pre-foreclosure and distressed properties with enough lead time to contact the owner before the bank forecloses — the earlier the better, the more distress signals the hotter the lead.

## Current Milestone: v1.4 Team & Access *(extending with Phase 34: JV Partner Lead Pipeline)*

v1.3 (Rose Park Pilot + User Feedback System) shipped 2026-05-03 — see [.planning/milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md). v1.4 RBAC + audit + activity feed shipped Phases 29-33 between 2026-04-29 and 2026-05-03. v1.4 stays open to absorb **Phase 34 — JV Partner Lead Pipeline**: external JV "driver" partners (modeled as internal `@no-bshomes.com` sales-role users) submit motivated-seller leads with photo + condition notes; Brian triages; system tracks the qualified → active follow-up → closed pipeline and produces a per-partner monthly payment ledger ($10 / $15 / $500 milestones per the JV Partner Lead Referral Agreement).

## Requirements

### Validated

- ✓ v1.0: Core platform shipped (20 phases) — scraping, scoring, deals, contracts, photos, CRM, campaigns, security
- ✓ v1.1: Data enrichment (Phases 21-23) — UGRC assessor enrichment, XChange court record intake pipeline, scoring rebalance
- ✓ v1.2: Advanced MAO Calculator (Phase 24) — dual buyer/flipper + wholesaler views, HML convergence
- ✓ v1.3: Rose Park Pilot + User Feedback System (Phases 25, 25.5, 26, 27 closed without impl, 28) — 84116 surfaced via Utah Legals SLC + UGRC enrichment; internal Jira-style backlog with paste-screenshot attachments + Resend notifications
- ✓ v1.4 (Phases 29-33): RBAC foundation + audit log; admin console + assignment UX; Google Workspace OAuth login; unified activity feed; dismiss leads + archive deals + outreach form fix; activity-feed N+1 batch refactor (post-mortem hotfix)

### Active

- [ ] **Phase 34 — JV Partner Lead Pipeline** (in v1.4): lead intake form (address + front-of-property photo + condition notes), Brian's triage queue with dedup vs existing properties + prior submissions, status pipeline → per-partner payment ledger ($10 qualified / $15 active follow-up / $500 closed), monthly payment-run report (1st-of-month batch)
- [ ] Re-run UGRC SLCo enrichment against the v1.4 wider SLC neighborhood map to flush the 26 unenriched Rose Park rows (parcel prefixes 14/21/22/33/15) deferred from Phase 26

### Out of Scope

- Paid skip tracing services (BatchSkipTracing, TLO, BeenVerified) — keep it free
- Auto-dialer / predictive dialing — manual calls only
- Direct mail campaigns — focus on phone contact
- Markets outside Utah — start small, expand later
- Native mobile app — responsive web app is sufficient
- Real-time chat or messaging features
- Video content or virtual tours
- External (non-`@no-bshomes.com`) auth surface for JV partners — Brian provisions them with internal Workspace accounts instead

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
*Last updated: 2026-05-03 after v1.3 milestone completion (Rose Park Pilot + User Feedback System shipped)*
