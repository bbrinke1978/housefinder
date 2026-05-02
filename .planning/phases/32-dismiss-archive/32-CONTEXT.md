# Phase 32: Dismiss Leads + Archive Deals — Context

**Gathered:** 2026-05-01
**Status:** Light spec — ready to execute
**Source:** Direct conversation with Brian (originally raised in Phase 28 user feedback as F7, deferred then; revisited 2026-05-01)

## Goal

Soft-delete on dashboard property cards (called "Dismiss") and on deals (called "Archive"). Dismissed leads disappear from the dashboard but stay in DB; the parcel_id is added to a suppression list so the next scrape doesn't recreate the lead. Owner can un-dismiss. Hard delete remains owner-only escape hatch behind a confirmation modal.

## Locked decisions

### Suppression strategy

- **Suppression key: `parcel_id`** (not property_id). Re-scrapes might write a new property row with a slightly normalized parcel_id, so the canonical key is the parcel.
- New table `dismissed_parcels` (parcel_id PK, dismissed_by, dismissed_at, reason, notes).
- The scraper's `upsertProperty` function checks the suppression list before inserting; if parcel_id is suppressed, it skips entirely (doesn't even insert the property row). Existing suppressed leads stay marked.

### Reason dropdown values

Required field on dismiss. Options:
- `wrong_owner` — Owner data is wrong (LLC parsing failed, etc.)
- `already_sold` — Already sold / off market
- `not_in_target` — Not in target area or price range
- `duplicate` — Duplicate of another lead
- `other` — Free text in the notes field

Notes textarea is optional unless reason='other' (then required, ≥5 chars).

### Permissions

- **Dismiss / Un-dismiss:** anyone with `lead.edit_status` (Owner, Acquisition Manager, Lead Manager). Sales role can dismiss leads they created or are assigned to (uses existing `canEditLead` helper from Phase 29).
- **Archive / Un-archive deal:** anyone with `deal.edit_terms` (Owner, Acquisition Manager). Disposition Manager and Transaction Coordinator can NOT archive — preserves the work-in-progress.
- **Permanent delete (hard):** Owner only. Behind a confirm modal that requires typing the property address or deal address to confirm.

### UI placement

**Dashboard property card:**
- Small × icon (or 3-dot menu) at top-right of each card.
- Click → small dropdown: "Dismiss lead..." opens the dismiss modal.
- Dismissed leads have a thin gray "Dismissed" ribbon and don't appear by default.
- Filter chip "Show dismissed" toggles them on (off by default).

**Property detail page (`/properties/[id]`):**
- "Dismiss this lead" button in the header (next to Hot Lead badge area).
- If already dismissed: shows "Dismissed by {name} {timeAgo} — {reason}" with an "Un-dismiss" button.

**Deal detail page (`/deals/[id]`):**
- "Archive Deal" button in the deal status controls area (alongside the status dropdown).
- Archived deals don't show in the kanban by default; "Show archived" toggle on the kanban brings them back.
- Archived deals show a gray banner at top of the detail page.

**Admin escape hatch (Owner only):**
- `/admin/users` → no, doesn't fit there.
- Better: button on the property/deal detail page that says "Permanently delete" — only visible to Owner, behind a confirm modal that requires typing the address. Audit-logged with action='lead.hard_deleted' or 'deal.hard_deleted'.

### What gets dismissed/archived together

When a property's lead is dismissed:
- The `leads` row is soft-marked (dismissed_at set)
- The `properties` row stays
- The `parcel_id` is added to `dismissed_parcels` (suppresses re-scrape)
- All `distress_signals`, `lead_notes`, `contact_events`, `owner_contacts`, photos stay — historical record preserved

When a deal is archived:
- The `deals` row is soft-marked (archived_at set)
- The linked property's `lead` is NOT auto-dismissed (you might want to keep the property visible even after killing the deal)
- All `deal_notes`, `deal_contracts`, photos, budget stay
- Activity feed continues to show the archived deal's history when viewing the property

When permanent-delete is invoked (Owner only):
- Hard DELETE the lead row, deal row, and all child rows (cascade via FK)
- Suppression list entry remains (parcel_id stays suppressed)
- Audit log row preserved

### Out of scope (deferred)

- Bulk dismiss (select multiple cards → dismiss all). UX gets fiddly; can add later if Stacee asks for it.
- Dismiss "expires after N days" (auto-resurrect). Just relies on manual un-dismiss.
- Reason analytics dashboard (% of leads dismissed by reason). Worth doing but not Phase 32 scope.
- Auto-dismiss based on signal aging (e.g. dismiss leads with no signals updated in 6 months). Different problem.

---

*Phase: 32-dismiss-archive*
*Context gathered: 2026-05-01*
