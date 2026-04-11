# HouseFinder — Todo List

Brian's personal action items and upcoming tasks. Check off as completed.

## Test Checklist (2026-04-11 deploy)

- [x] **Mobile settings gear** — dropdown with Mail Settings, Skip Tracing, Settings
- [x] **Trace icon on cards** — moved to right side next to "View details" on hover
- [x] **Paste Email** — working, multi-property splitting
- [x] **MAO formula** — updated to ARV × 0.65
- [ ] **Deals page speed** — index created, retest after deploy
- [ ] **Photo upload** — AZURE_STORAGE_CONNECTION_STRING refreshed, server action now returns errors instead of throwing. Retest.
- [ ] **Add Expense** — null handling fixed for optional fields. Retest.
- [ ] **Skip Tracing settings** — API key trim fix applied. Retest.
- [ ] **Rotate passwords** — all 3 users change passwords via forgot-password flow

## Action Items (Brian)

- [x] Get a Google Voice number — (435) 250-3678, live on nobshomes site
- [x] Create an LLC for wholesaling business
- [x] Buy a domain for No BS Homes — owns no-bshomes.com, finder.no-bshomes.com live on Netlify
- [ ] Sign up for Utah Courts XChange ($40/mo) — unlocks foreclosure, probate, code violation signals
- [ ] Get Utah real estate license — unlocks Bridge API for MLS comps, property details, Zestimates

## No BS Homes Site (nobshomes.netlify.app)

- [x] Build site — Home, About, How It Works, FAQ
- [x] Deploy to Netlify
- [x] Wire contact form (Netlify Forms)
- [x] Add logo
- [x] Replace placeholder phone number — (435) 250-3678 live on site
- [x] Buy and connect custom domain — no-bshomes.com on GoDaddy, DNS configured
- [ ] Add photos — Brian & Shawn headshots for About page
- [x] Set up Google Analytics — NEXT_PUBLIC_GA_ID configured
- [x] Add sitemap — sitemap.ts dynamic route in place

## Upcoming Features (Claude Builds)

- [ ] UGRC assessor data import — free sqft/year-built/assessed-value for all properties (no license needed, can do now)
- [ ] XChange scraper — foreclosure, probate, code violations (needs Brian's XChange subscription first)
- [ ] Bridge Data Output API integration — auto-ARV, comps, property details (needs Brian's RE license + Bridge API key)
- [ ] GitHub Actions upgrade — Azure/functions-action@v1 → v2 before June 2026
- [ ] Resend inbound webhook setup — configure Resend to forward wholesaler emails to /api/inbound endpoint

## Completed

- [x] Phase 1-5: Core platform built and deployed
- [x] Phase 6: Data Analytics (funnel, markets, trends, health, outreach, activity, CSV export)
- [x] Phase 7: Frontend design polish
- [x] Phase 8: Wholesaling deal flow (kanban, MAO calculator, buyers, deal blast, guides)
- [x] Phase 9: Admin budgeting & cost analysis (receipt OCR, budget tracking, charts, alerts)
- [x] Phase 10: No BS Homes public website (nobshomes.netlify.app)
- [x] Phase 11: UI revamp — structural changes (nav restructure, pipeline removed, 4-tab deals, mobile polish)
- [x] Scraper pipeline: Carbon, Emery, Millard, Juab counties
- [x] NOD scraper: Utah Legals trustee sale notices
- [x] LLC enrichment: 295 registered agents resolved via Utah BES
- [x] Tracerfy skip trace: 113 critical leads enriched (265 phones, 85 emails)
- [x] Tiered scoring: 1-10 display scale, Critical/Hot/Warm/Cool tiers
- [x] Dashboard filters: big operators, vacant land, LLC/Trust/Estate, parcel-only, multi-select
- [x] Search box: owner name, address, parcel ID
- [x] Map: 291 geocoded pins, satellite view
- [x] MLS comps tab: utahrealestate.com quick-link + comp entry form
- [x] Wholesaling guides: kanban tooltips + stage guide panel with scripts
- [x] Contact enrichment: Tracerfy, ThatsThem, FamilyTreeNow links
- [x] Carbon County mailing address extraction
- [x] Vacant land filter (829 properties tagged, DATA-11)
- [x] Lead source tracking (7 sources with colored badges)
- [x] Clickable addresses → Google Maps
- [x] Contact data carries to deals
- [x] "Deal Active" badge on dashboard
- [x] Address format fix (4,727 colon-format addresses corrected)
- [x] Sticky filters (back button preserves filter state)
- [x] Filtered count display on dashboard
- [x] Phase 12: Email & call campaigns (sequences, templates, dispatch, contact timeline)
- [x] Phase 13: Contract e-signature (PDF generation, signing flow, countersign)
- [x] Phase 14: Mobile photo capture (inbox, deal photos, lightbox)
- [x] Phase 15: Blueprints & floor plans (PDF viewer, pin annotations, sketch, share links)
- [x] Phase 16: Buyers list CRM (directory, tags, deal interactions, blast tracking, CSV import)
- [x] Phase 17: Netlify migration & design system (deployment, fonts, brand polish, mobile)
- [x] Phase 18: Tracerfy skip trace UI (single/bulk triggers, settings dashboard, auto-trace on deals)
- [x] Phase 19: Wholesale leads (scoring engine, email parser, list/detail pages, promote to deal, wholesaler directory)
- [x] Phase 20: Security review (OWASP audit, CVE patches, headers, password policy, Key Vault, secrets inventory)
- [x] Mapbox token domain-restricted to finder.no-bshomes.com
- [x] CSP promoted from Report-Only to enforcing
- [x] Azure App Service decommissioned (~$13/mo saved)
- [x] DB migrations applied (wholesale tables + deals.leadSource)
