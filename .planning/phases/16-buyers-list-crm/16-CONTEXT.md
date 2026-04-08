# Phase 16: Buyers List CRM - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn the existing basic buyers table into a full CRM experience: buyer detail pages with unified communication timelines, auto-matching buyers to deals by price range and target area, deal interaction tracking (blasted, interested, closed), follow-up reminders with a dashboard widget, CSV import/export, and a searchable/filterable buyers list page replacing the old /deals/buyers page.

</domain>

<decisions>
## Implementation Decisions

### Buyer Profiles & Data
- Keep existing buyer fields as-is (name, phone, email, buy box, price range, funding type, target areas, rehab tolerance, notes) — no additional fields needed
- Active/Inactive status only (existing boolean) — no multi-step lifecycle
- Free-form tags per buyer (e.g., VIP, new, cash-only, fix-and-flip, buy-and-hold) — filterable on the list page
- Dedicated buyer detail page (click buyer to see full profile, deal history, communication timeline, matched deals)

### Buyer-Deal Matching
- Auto-match + manual override — system auto-suggests matching buyers when viewing a deal, user picks which to blast
- Match criteria: price range (deal price within buyer's min/max) AND target area (deal city matches buyer's target_areas)
- Matching buyers shown on deal detail page + pre-selected in the deal blast flow. Unmatched buyers still available to add manually
- Track buyer-deal interactions: blasted (auto-logged when deal blast sent), interested (manually marked), closed (linked to deal outcome)

### Communication Tracking
- Full CRM: track calls, emails, texts, meetings, deal blasts, and notes
- Unified chronological timeline on buyer detail page — icons/colors per type, filterable by type. Same pattern as deal activity timeline
- Follow-up reminders: set follow-up date per buyer. Overdue follow-ups show on main dashboard as a reminder widget. Click to jump to buyer
- Auto-log deal blasts: when a deal is blasted to a buyer via Resend email, it automatically appears in their communication history with the deal link

### Buyers List View & Management
- Searchable table with filters — rows show name, phone, email, buy box summary, tags, status, last contact date
- Filters: search, tag, active/inactive status, target area, funding type
- CSV import: upload CSV, map columns to buyer fields, bulk add existing buyer list
- CSV export: download filtered or full buyer list as CSV
- Manual entry: add buyers one at a time through a form (alongside CSV import)
- Replace existing /deals/buyers with new top-level /buyers page in sidebar

### Claude's Discretion
- Communication type enum values and color coding
- Follow-up reminder widget design on dashboard
- CSV import column mapping UI
- Buyer detail page tab layout vs single-scroll
- Match score display (percentage, badge, or simple "matches" indicator)

</decisions>

<specifics>
## Specific Ideas

- Buyer-deal interaction tracking (blasted → interested → closed) creates a funnel view of buyer engagement over time
- Auto-logged blasts close the loop between the deal blast feature and buyer CRM — no manual data entry needed
- Follow-up reminders on the main dashboard ensure buyers don't fall through the cracks between deals
- Tags enable segmentation for targeted blasts (e.g., blast only to VIP cash buyers who do fix-and-flips)

</specifics>

<deferred>
## Deferred Ideas

- Automated buyer email sequences (drip campaigns for new buyers) — separate phase
- Buyer portal (buyers log in to see available deals) — separate phase
- SMS/text integration with actual sending — separate phase
- Buyer referral tracking — future enhancement

</deferred>

---

*Phase: 16-buyers-list-crm*
*Context gathered: 2026-04-07*
