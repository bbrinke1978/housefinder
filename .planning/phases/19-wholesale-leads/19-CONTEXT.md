# Phase 19: Wholesale Leads - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A dedicated "Wholesale Leads" section in the Workbench where the user can input deals received from 3rd party wholesaler email blasts (and social media/texts), run automated deal analysis with a verdict system, triage quickly, and promote good deals into the existing Deals pipeline. Includes a wholesaler directory for tracking sources over time.

</domain>

<decisions>
## Implementation Decisions

### Deal intake
- **Two entry methods:** Email forwarding with smart parse AND manual form entry
- **Smart parse:** AI/regex extraction from forwarded emails — pre-fills address, asking price, ARV, sqft, beds, baths, lot size, year built, tax ID, wholesaler contact. User verifies and corrects before saving.
- **Manual form fields:** Address, asking price, ARV, repair estimate, sqft, beds, baths, lot size, year built, wholesaler name + phone + email, source channel (email/social/text), notes
- **Example email format (reference):** Structured deal blast with "ASKING $XXK", "ARV: $XXXK", property details section, contact info. See Austin Howard / Rockwood & Company format as baseline for parser.

### Deal analysis
- **Formula:** Use existing MAO formula (ARV x 0.70 - Repairs - Fee) as baseline, but researcher should investigate whether better formulas exist in the wholesale space
- **Auto-run on entry:** Analysis calculates automatically when a deal is saved. Instant verdict displayed.
- **Editable + re-run:** User can edit any number (ARV, repairs, asking price) and re-run analysis
- **Verdict display:** Traffic light (green/yellow/red) PLUS a weighted score (1-10) with expandable breakdown showing individual factors
- **Profit estimate:** Big dollar amount showing estimated profit at a glance
- **Research question for planner:** Investigate scoring approaches — what factors beyond MAO spread should feed into the score? (market trends, days on market, neighborhood, rental potential)

### Deal workflow
- **4 statuses:** New → Analyzing → Interested → Pass/Promoted
- **"Promote to Deal" button:** Creates a new Deal in the existing Deals pipeline with all numbers pre-filled. The Deal should be tagged/flagged to show it originated from the Wholesale side.
- **Simple timestamped notes:** Same pattern as property/deal notes — quick notes about conversations with the wholesaler
- **Wholesaler directory:** Track wholesaler name + contact info. Aggregate stats: deals sent, deals promoted, average spread. Know which wholesalers consistently send good deals.

### List & filtering
- **Card grid layout:** Cards showing address, asking/ARV, traffic light verdict, profit estimate, wholesaler name. Designed for fast triage/scanning.
- **Filters:** Verdict (green/yellow/red), status (new/analyzing/interested/pass/promoted), wholesaler source
- **Navigation:** Own sidebar link at `/wholesale` — top-level page, separate from Deals

### Claude's Discretion
- Smart parse implementation approach (regex vs AI vs hybrid)
- Email forwarding endpoint design (Resend inbound webhook vs dedicated API route)
- Score factor weights and formula details
- Card layout and component structure
- Empty state design
- How to handle duplicate incoming deals (same property from different wholesalers)

</decisions>

<specifics>
## Specific Ideas

- Real email example provided as parser baseline: "2067 Quincy Ave, Ogden / ASKING $169K / ARV: $325K / Sq Ft: 1,328 / Beds: 2 / Baths: 1 / Year Built: 1972 / Tax ID: 01-066-0005 / Contact Austin @ (801) 819-5517"
- When promoting to Deals, the new deal should clearly show it came from the wholesale side (badge, source field, or tag)
- The wholesaler directory is like a lightweight CRM for your deal sources — who sends you deals and how good are they
- This is a triage workflow: most deals get quickly passed, only the gems get promoted. Speed matters.

</specifics>

<deferred>
## Deferred Ideas

- Automated comp lookup from external APIs (Zillow, Redfin) — could be its own phase
- Auto-reject rules (e.g., auto-pass anything with <$20K spread) — future optimization
- Rental analysis / BRRRR calculator alongside flip analysis — future phase

</deferred>

---

*Phase: 19-wholesale-leads*
*Context gathered: 2026-04-10*
