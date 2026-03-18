# Phase 3: Contact and Alerts - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Owner contact lookup from free public sources and hot lead alerts (email via Resend + SMS). This phase wires the "action layer" — when a hot lead surfaces after the daily scrape, the user gets notified and can contact the owner. Also includes manual skip trace UX for leads where free sources don't find contact info.

Does NOT include: map view (Phase 5), county expansion (Phase 4), new data sources beyond contact lookup.

</domain>

<decisions>
## Implementation Decisions

### Alert Content
- Email: rich detail — property address, owner name, all distress signals, score, city, days since discovered. User should be able to decide from the email alone whether to act.
- Email: branded HTML template with HouseFinder branding, colored score badge, signal icons — professional look
- SMS: minimal — "HOT LEAD: [address], [city] (score: X) — [link]" — just enough to tap and act
- Alert on both NEW hot leads and EXISTING leads that cross the hot threshold (score increases from new signals)

### Alert Frequency
- Email: fires once daily after the 5 AM scrape — single digest email with all new/upgraded hot leads from that run
- SMS: fires only for 3+ weighted score leads (the hottest of hot) — keeps texts rare and urgent
- No quiet hours — SMS fires anytime. User controls notifications at the phone/OS level.
- Alert settings configurable from Settings page: toggle email on/off, SMS on/off, adjust score thresholds

### Contact Sources
- Aggressive free-source strategy: try county assessor, voter rolls, state business registry (for LLCs), whitepages-style free sources
- LLC/Trust owners: flag differently with "Entity Owner — LLC/Trust" badge + suggest state business registry for registered agent contact
- Individual owners: attempt phone number lookup from all free sources
- Claude's discretion on whether to show multiple numbers from different sources or pick the best one
- Claude's discretion on Contact tab layout (cards per source vs unified view)

### Skip Trace UX
- "Manual skip trace needed" flag shows owner name + address — enough to search on free sites like TruePeopleSearch, FastPeopleSearch
- User can manually add a phone number on the Contact tab — it becomes the lead's contact info
- Claude's discretion on whether adding a phone number auto-clears the skip trace flag
- Dashboard stats bar should include "Needs Skip Trace: X" count
- Tap-to-call on all phone numbers (both auto-found and manually entered)

### Claude's Discretion
- Multiple phone numbers display (show all vs pick best)
- Contact tab layout (cards per source vs unified)
- Skip trace flag auto-clear behavior when phone number added
- Email template exact design (within branded HTML constraint)
- SMS provider choice (Twilio trial vs alternative)
- Deduplication logic for alerts (don't re-alert on same lead)

</decisions>

<specifics>
## Specific Ideas

- Email should be rich enough to make a go/no-go decision without opening the app — address, owner, all signals, score, city
- SMS is the "drop everything" alert — only for the hottest leads (3+ score)
- For LLC/trust owners, the app should guide the user to check the Utah state business registry for registered agent info
- Skip trace flag + "Needs Skip Trace" count in dashboard stats — user wants visibility into how many leads need manual work
- Manual phone number entry on Contact tab — not just as a note, but as actual contact data with tap-to-call

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-contact-and-alerts*
*Context gathered: 2026-03-18*
