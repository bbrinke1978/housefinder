# Phase 31: Unified Activity Feed — Context

**Gathered:** 2026-05-01
**Status:** Light spec — ready to execute
**Source:** Direct conversation with Brian

## Goal

One activity stream per property that follows it through its entire lifecycle (dashboard → leads → deals). Surface a compact indicator on dashboard property cards, the full timeline on every detail page, and a unified "Log Activity" modal that any team member can use from anywhere to record what just happened.

After this phase ships, the answer to "what happened with this lead/property" is a single feed, never split across `lead_notes` / `deal_notes` / `contact_events` / `audit_log` etc. Reps record outreach in one place; the record carries with the property forever.

## Locked decisions

### Card-level scope

- **Always show all activity (Brian's choice).** Once a property has been promoted to a deal, the dashboard card still shows everything that ever happened, including post-promotion deal-side actions ("Sent contract 2h ago"). One mental model, no surprises about where to look.
- **Compact format on cards:** `📞 Called 2d ago · 5 events`. Click → opens the property/deal detail page's Activity tab.
- **One-click "Log Activity"** affordance on each card (small `+` icon bottom-right of the card). Opens the unified modal in-place.

### Unified modal UX

Single modal handles all activity types via a type selector at top:

```
[📞 Call] [📧 Email] [💬 Text] [🗣️ Meeting] [🎙 Voicemail] [📝 Note]
```

Per-type fields:

| Type | Extra fields | Storage |
|---|---|---|
| Call | Outcome (`answered` / `voicemail` / `no_answer` / `wrong_number` / `disconnected`) + notes | `contact_events` with `event_type='called_client'` |
| Email | Optional subject + notes | `contact_events` with `event_type='emailed_client'` |
| Text | Notes only | `contact_events` with `event_type='sent_text'` |
| Meeting | Notes only | `contact_events` with `event_type='met_in_person'` |
| Voicemail | Notes (transcript) | `contact_events` with `event_type='left_voicemail'` |
| Note | Notes only — for observations not tied to outreach ("drove past, looks vacant") | `lead_notes` |

Modal opens from:
- Dashboard property card (✚ icon)
- `/properties/[id]` Activity area (button at top)
- `/leads/[id]` (button at top)
- `/deals/[id]` Activity tab (button at top)

After save: modal closes, the relevant view reloads (Server Action with `revalidatePath`).

### Feed sources

The unified `getActivityFeed(propertyId)` query UNIONs from these sources:

| Source | What it surfaces |
|---|---|
| `contact_events` | All call/email/text/meeting/voicemail rows |
| `lead_notes` | Free-text notes (status_change auto-notes too) |
| `deal_notes` | Notes on the linked deal, if any |
| `deals` (status changes) | Auto-derived from deal_notes where note_type='status_change' (existing pattern) |
| `audit_log` (material edits only) | Filter to action IN ('deal.terms_updated', 'lead.status_changed', 'deal.assignee_changed', 'property.address_edited', 'deal.status_changed'). Skip noisy actions like 'lead.note_added' (already shown via lead_notes) and skip-trace runs (separate, see below). |
| `propertyPhotos` (new uploads) | "Brian uploaded 3 photos" |
| `dealContracts` (generated) | "Generated purchase contract" |
| `tracerfy` skip-trace runs | "Brian skip-traced this property — 2 phones, 1 email returned" |

Reads from these tables already exist in piecemeal form (`getLeadTimeline`, `getDealNotes`, etc.). Phase 31 unifies them.

### Schema changes

| Table | Change | Why |
|---|---|---|
| `contact_events` | Add `actor_user_id uuid REFERENCES users(id)` (nullable for legacy rows) | Phase 29 added users; contact_events still has no actor FK — we need to know WHO logged each event for filtering and analytics. |
| `contact_events` | Add `outcome text` (nullable) | Currently outcome is stuffed into `notes`; structuring it makes "answered vs voicemail" filterable in /analytics/outreach without parsing free text. |

No other schema changes. Use existing `lead_notes`, `deal_notes`, `audit_log`, `property_photos`, `deal_contracts`, owner-contacts (skip-trace) tables as-is.

### What stays the same

- `/analytics/outreach` keeps its current per-user productivity view. Same data source; no UX change.
- `/properties/[id]` Notes tab and Contact tab don't go away — they each show a *filtered* view of the unified feed (Notes tab = notes only, Contact tab = comms only). The "everything" view is the new Activity tab/section.
- Deal detail Activity tab continues to be the unified feed (it's already mostly that — Phase 31 just extends what it includes).

### Out of scope

- Editing or deleting an activity entry (just appends; bad entries are appended-with-correction)
- Bulk activity actions (e.g. "log a call to all 5 selected properties")
- Activity export to CSV (per-property; analytics-page export already covers per-user)
- Auto-detect duplicate activities (e.g. two reps log the same call)
- Activity-based scoring boost (e.g. "warm lead because contacted 3 times this week")
- SMS sending integration (logging a sent text only — no actual send)

---

*Phase: 31-unified-activity-feed*
*Context gathered: 2026-05-01*
