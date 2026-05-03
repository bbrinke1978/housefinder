# Milestones

## v1.0 — Core Platform (Completed 2026-04-11)

**Phases:** 1-20
**Goal:** Build the complete HouseFinder platform — property scraping, distress scoring, deal management, contracts, photos, floor plans, buyers CRM, campaigns, analytics, and security hardening.

**Key deliverables:**
- 4-county property scraping (Carbon, Emery, Millard, Juab)
- NOD trustee sale scraper (Utah Legals)
- Distress signal scoring (1-10 scale, tiered)
- Wholesaling deal flow (kanban, MAO calculator, contracts, e-signature)
- Buyers CRM (directory, tags, deal blast)
- Email/call campaigns with sequences
- Mobile photo capture + floor plans
- Tracerfy skip trace integration
- Wholesale leads (scoring, email parser, paste email)
- Data analytics dashboard
- Netlify migration + design system
- Security review (OWASP audit, headers, Key Vault)

**Last phase:** 20 (Security Review)

## v1.1 — Data Enrichment & Court Records (Completed 2026-04-13)

**Phases:** 21-23
**Goal:** Enrich property data with free UGRC assessor records and unlock court record intake via agent-assisted XChange workflow.

**Key deliverables:**
- UGRC assessor enrichment (5,038 properties with sqft/year-built/assessed-value)
- XChange court record intake pipeline (parser, 3-tier address matcher, /api/court-intake)
- Scoring rebalance (signal dedup, dry-run CLI, signal weights configured)

**Last phase:** 23 (Scoring Rebalance)

## v1.2 — Advanced MAO Calculator (Completed 2026-04-13)

**Phases:** 24
**Goal:** Replace simple ARV × 0.65 formula with professional dual-view calculator.

**Key deliverables:**
- Sell-side costs (buyer's agent %, selling agent %, closing/title %)
- Hard money + carry costs with iterative convergence
- Buyer/flipper view with MAO range at min/max profit targets
- Wholesaler view with max purchase price, end buyer out-of-pocket, spread
- View toggle preserves all inputs

**Last phase:** 24 (Advanced MAO Calculator)

## v1.3 — Rose Park Pilot + User Feedback System (Shipped 2026-05-03)

**Phases:** 25, 25.5 (inserted), 26, 27 (closed without implementation), 28
**Plans:** 12 plans complete (+ 25.5-PATH-A follow-on)
**Goal:** Pilot urban expansion to Salt Lake City zip 84116 (Rose Park) and ship an internal feedback backlog so bug reports + feature requests stop falling through the cracks.

**Key deliverables:**
- Rose Park (84116) added to `target_cities` with `normalizeCity()` retag at the scraper upsert layer + dashboard `.limit(500)` for urban density (Phase 25)
- Salt Lake County activated in `utah-legals.ts` NOD scraper — first SLC NOD path with SLCo hyphenated 5-segment parcel regex (Phase 25.5)
- 84116 parcel-ID allowlist (8,270 parcels from UGRC Address Points) — superseded the planned zip-snippet filter after dry-run revealed property zip never appears in the snippet (Phase 25.5 Path A pivot)
- UGRC SLCo enrichment by parcel_id JOIN — 4 Rose Park rows enriched with sqft / year-built / assessed-value (Phase 26)
- User Feedback System (Phase 28): internal Jira-style backlog with markdown comments, paste-from-clipboard screenshots → Azure Blob, status workflow, threaded comments, Resend email notifications, floating Report button on every authenticated page
- Mid-milestone scope adjustment: original v1.3 design assumed UGRC could create Rose Park rows; Phase 26 execution exposed UGRC is enrichment-only → Phase 25.5 inserted to provide the missing Utah-Legals SLC source path

**Mid-milestone descope:**
- Phase 27 (Mapbox supercluster pin clustering, RP-08) closed without implementation 2026-05-03 — SLC pin density never became a real dashboard problem (only 4 enriched Rose Park rows in production)

**Known gaps (deferred):**
- 26 of 30 Rose Park rows have parcel-ID prefixes outside the v1.3 84116-only allowlist (14/21/22/33/15) — superseded by v1.4 SLC neighborhood map (`scraper/data/slc-parcel-neighborhood-map.json`); needs `import-ugrc-assessor.mjs --county=salt-lake` re-run against the wider allowlist

**Audit:** `.planning/milestones/v1.3-MILESTONE-AUDIT.md` (passed; 21/21 requirements satisfied, RP-08 descoped)
**Last phase:** 28 (User Feedback System)

---

