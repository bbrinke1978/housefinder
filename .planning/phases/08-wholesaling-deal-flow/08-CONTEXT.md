# Phase 8: Wholesaling Deal Flow - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Source:** User-provided wholesaling workflow + deal tracker data

<domain>
## Phase Boundary

Add a complete wholesaling deal pipeline to HouseFinder. This transforms HouseFinder from a lead-finding tool into an end-to-end deal management system. The pipeline covers the full wholesaling workflow: Lead intake → Qualify → Analyze (MAO calculator) → Offer → Contract → Title → Market → Assign → Close.

Key integration: Critical leads from the existing dashboard can be promoted directly into the wholesaling pipeline.

</domain>

<decisions>
## Implementation Decisions

### Deal Pipeline
- New "Deals" section in the app sidebar navigation
- Deal statuses: Lead → Qualified → Analyzed → Offered → Under Contract → Marketing → Assigned → Closing → Closed → Dead
- Each deal tracks: property address, seller name/phone, condition, timeline, motivation, asking price, ARV, repairs, MAO, offer price, buyer info, assignment fee, closing date
- Two preloaded deals: Sullivan Rd Ogden ($272k offer, $400k ARV) and Delta 496 W 300 N ($205k offer, $330k ARV)

### MAO Calculator
- Formula: MAO = ARV × .70 − Repairs − Wholesale Fee
- Auto-calculates: profit, ROI, cash needed, deal score
- Inputs: ARV, rehab estimate, wholesale fee (default $15k)
- Show sensitivity analysis (what if ARV is 10% lower? Repairs 20% higher?)

### Seller Qualification (4 Pillars)
- Condition: property repair needs
- Timeline: how soon they want to sell
- Price: what they're asking
- Motivation: why selling (inherited, financial distress, vacant, etc.)
- Hot seller indicators: needs repairs + wants quick sale + vacant/inherited/financial distress

### Buyer List Management
- Separate buyer database: name, phone, email, buy box, price range, cash/hard money, target areas, rehab level tolerance
- Buyer intake form for adding new buyers
- Match buyers to deals by criteria

### Deal Blast System
- When a deal is under contract, generate a "deal blast" with: address, price, ARV, repairs, pictures, assignment fee, closing date
- One-click share capability

### Contract Tracking
- Track contract status: sent → signed → in escrow → title clear → closing scheduled
- Assignment agreement tracking
- Earnest money tracking ($100 refundable during inspection)
- Inspection period tracking (14 days default)

### Integration with Existing HouseFinder
- "Start Deal" button on property detail page to promote a lead into the deal pipeline
- Pre-fill deal with existing property data (address, owner name, distress signals, contact info)
- Deal pipeline visible alongside existing dashboard/pipeline

### Claude's Discretion
- Database schema design for deals, buyers, contracts
- UI component architecture
- Mobile responsiveness approach
- Whether to use separate pages or tabs within existing structure

</decisions>

<specifics>
## Specific Ideas

### Preloaded Deals
1. Sullivan Rd, Ogden: Offer $272k, ARV $400k, Rehab $45k, Holding 4mo, Profit ~$43k, ROI ~12%
2. Delta 496 W 300 N: Offer $205k, ARV $330k, Rehab $35k, Holding 4mo, Profit ~$56k, ROI ~20%

### Pipeline Tracker Columns
Lead Source, Address, Seller Name, Phone, Condition, ARV, Repairs, MAO, Offer, Status, Buyer, Assignment Fee, Closing Date

### Buyer Intake Fields
Name, Phone, Email, Buy Box, Price Range, Cash/Hard Money, Areas, Rehab Level

### Deal Blast Template
Address, Price, ARV, Repairs, Pictures, Access info, Assignment fee, Closing date, "Cash buyers only"

</specifics>

<deferred>
## Deferred Ideas

- Hard money calculator
- Partner split model
- Rehab budget template with line items
- CRM automation
- Virtual assistant integration
- Deal blast email/SMS automation (manual share first)

</deferred>

---

*Phase: 08-wholesaling-deal-flow*
*Context gathered: 2026-03-28 from user-provided wholesaling workflow*
