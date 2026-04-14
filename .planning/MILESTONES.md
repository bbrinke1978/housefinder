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
