# Phase 2: Core Application - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Authenticated dashboard, property detail pages, and lead management (status tracking, notes, pipeline view) built against the real data pipeline from Phase 1. This is the Next.js web application — desktop-first with responsive mobile views. Authentication, navigation, and all CRUD operations for leads.

Does NOT include: contact lookup (Phase 3), alerts (Phase 3), map view (Phase 5), county expansion (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- Summary stats bar at top: Total leads, Hot leads, New today, Needs follow-up
- Claude's discretion on card vs list vs hybrid layout — pick what's best for the use case
- Claude's discretion on hot lead prominence (separate section vs inline badge)
- Claude's discretion on info density per lead card/row

### Property Detail Page
- Tabbed layout like BatchLeads with 4 tabs: Overview, Signals, Notes, Contact
- Overview tab: address, owner name, tax status, mortgage info, distress score, hot lead status
- Signals tab: chronological timeline showing when each signal was detected + active/resolved status
- Notes tab: timestamped notes from user + status change history
- Contact tab: owner phone/contact info, tap-to-call, skip trace flag (data from Phase 3, but tab structure built now)
- Claude's discretion on quick-action bar at bottom on mobile (Call, Add Note, Change Status)

### Lead Pipeline
- Both filtered list AND kanban board views with a toggle switch — user wants to try both
- Kanban columns: New, Contacted, Follow-Up, Closed, Dead
- "Last contacted" date visible on leads for follow-up prioritization
- Voice-to-text notes via Web Speech API — microphone button next to notes input for hands-free dictation while driving
- Claude's discretion on whether status changes require a note (optional vs required)

### Auth + Navigation
- Email + password authentication — standard login form, browser caches credentials
- Desktop: sidebar navigation with items: Dashboard, Pipeline, Settings
- Mobile: bottom tab navigation with same items — responsive layout shift
- Dark mode + light mode with toggle in settings
- Single-user app accessed via web browser (not app store)
- Session persists across browser refresh

### Claude's Discretion
- Card vs list vs hybrid dashboard layout
- Hot lead visual prominence approach
- Info density on lead cards/rows
- Quick-action bar implementation on mobile detail page
- Status change note requirement (optional vs required)
- Exact spacing, typography, and color palette (within dark/light mode constraint)
- Empty states for new users with no data
- Loading states and skeleton screens
- Error state handling

</decisions>

<specifics>
## Specific Ideas

- "Like BatchLeads" — tabbed property detail page is a direct reference to BatchLeads' property card layout
- Pipeline toggle: user isn't sure which view they'll prefer, so build both and let them switch
- Voice notes for mobile: user drives for real estate and needs hands-free note-taking while in the field
- Desktop-first with responsive mobile — user expects to primarily use this on a computer, mobile is secondary for quick actions on hot leads
- "Last contacted" date on leads — user specifically requested this for follow-up prioritization

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-core-application*
*Context gathered: 2026-03-18*
