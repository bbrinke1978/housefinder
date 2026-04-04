# Phase 12: Email & Call Campaigns - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Build email outreach sequences and call logging into HouseFinder so the investor can contact distressed property owners directly from the platform. Includes: multi-step email sequences sent via email service, call outcome logging with activity timeline, campaign management page, mail settings configuration, and talk track/call scripts. Google Workspace API angles to be researched.

</domain>

<decisions>
## Implementation Decisions

### Email Sending Approach
- Send emails via a transactional email service (Resend) — not Gmail API, not copy-paste
- Multi-step drip sequences: Default follow-up cadence from Brian's sales system: Day 1 Call → Day 3 Text → Day 7 Call → Day 14 Call → Day 30 Call. Email sequences should mirror this cadence (Day 1, Day 3, Day 7, Day 14, Day 30) rather than generic 5/5/7 pattern
- Placeholders/merge fields: Claude's discretion based on available data in properties/contacts tables
- Auto-stop sequences when a lead's deal stage changes (e.g., Closed Won, Closed Lost)
- One sequence per lead at a time — enrolling in new sequence unenrolls from current
- Leads must have a contact email (from Tracerfy enrichment) before enrollment

### Call Logging & Workflow
- Log outcomes only — no integrated dialer. Users call from their own phone/Google Voice
- Phone numbers render as `tel:` links so Google Voice or native dialer handles them
- Contact types match reference app: Called client, Left voicemail, Emailed client, Sent text, Met in person, Received email
- Talk track / call script feature: display a configurable script with lead details pre-filled when about to call
- Pre-built call scripts from Brian's sales training system:
  - **Acquisitions Script**: "Hey this is ___, I'm looking to buy a few properties in {city}..." → Discovery → Motivation → Price → Surprise → Close
  - **Dispositions Script**: "Hey this is ___, I have an off-market deal in {city} — are you still buying?" → Price range, Rehab level, Cash ready, Timeline
  - **Agent Partnership Script**: Offering cash buy, front-end commission, back-end listing
  - **JV Partner Script**: "We find discounted deals. You bring capital. We split profit."
  - **Objection Handling**: Retail price response, Too low response, negotiation ladder (Ask → Mirror → Surprise → Silence → Soft counter)
- Touchpoint counter on property cards — Claude's discretion on badge design (simple count vs icon breakdown)
- Activity timeline on property and deal detail pages showing all contacts chronologically

### Campaign Targeting
- Manual enrollment only (no auto-enrollment rules)
- Enroll from both places: individual from property/deal detail page, OR bulk-select from dashboard
- Require contact email before enrollment — clear indicator showing which leads have email

### Dashboard Integration
- New "Campaigns" page in sidebar for sequence management (create/edit sequences, view active campaigns, enrollment counts, send stats)
- Mail Settings gear icon in bottom-left of sidebar, labeled "Mail Settings"
- Mail Settings includes: From Name, From Email, Reply-To Email, Resend API Key, Phone Number (for signature), Email Signature template — matching the reference app's settings pattern
- Keep existing deal stages from Phase 8 — campaign auto-stop triggers off those stages
- Contact outcome types are fixed (not user-configurable in this phase)

### Google Workspace
- Google Voice: `tel:` links on phone numbers (works immediately, no API needed)
- Gmail sync, Calendar follow-ups: RESEARCH NEEDED — researcher should investigate Google Workspace APIs (Gmail API, Calendar API) and recommend what's practical for this phase vs deferred
- Brian has a Google Voice number; multi-user scenario means each user dials from their own phone

### Claude's Discretion
- Merge field set based on available data in properties/contacts/deals tables
- Touchpoint badge design on property cards (count vs icon breakdown)
- Email signature template format
- Activity timeline UI design
- Best practices for email sending limits/throttling to avoid spam flags

</decisions>

<specifics>
## Specific Ideas

- Reference app uses Resend as email service with API key configuration
- Brian's proven follow-up cadence: Day 1 Call → Day 3 Text → Day 7 Call → Day 14 Call → Day 30 Call
- Default email sequence should pre-fill with 5 steps matching this cadence (Day 1, 3, 7, 14, 30)
- Buyer intake email template: "Hey! I'm building my buyers list for off-market deals in Utah. What's your buy box? Cities, Price Range, Rehab Level, Cash or Financing, Timeline to close?"
- Reference placeholders: {firstName}, {senderName} — email signature added automatically
- Reference settings: profile name, from email, reply-to email, API key, phone number for signature
- Reference pipeline stages auto-stop sequences (Closed Won / Closed Lost)
- Reference contact logging types: Called client, Left voicemail, Emailed client, Sent client a text, Met with client in person, Received email
- Brian wants a touchpoint counter visible on property cards in the dashboard
- Mail Settings should be a gear icon in the bottom-left sidebar area

</specifics>

<deferred>
## Deferred Ideas

- Gmail API sync (send record back to Gmail) — research first, may be future phase
- Google Calendar follow-up reminders — research first, may be future phase
- Auto-enrollment rules (score-based, distress-type-based) — future enhancement
- Configurable contact outcome types — future enhancement if needed
- SMS/text messaging integration — separate phase
- Buyers List CRM (tiers: VIP/Active/Mass, buy box, intake forms, dispositions pipeline) — separate phase
- KPI & Agent Scoring Dashboard (weighted formula: Calls*1 + Conversations*2 + Leads*3 + Offers*5 + Contracts*10, daily goals, team tracking) — separate phase
- Motivation scoring on leads (1-10 scale, Hot/Warm/Cold filter) — future enhancement
- Profit allocation tracker (Babylon system: 10% Nest Egg / 20% Debt / 20% Marketing / 50% Ops) — future financials enhancement
- Weekly accountability numbers dashboard (leads, offers, contracts, cash, nest egg, debt) — future analytics enhancement

</deferred>

---

*Phase: 12-email-call-campaigns*
*Context gathered: 2026-04-03*
