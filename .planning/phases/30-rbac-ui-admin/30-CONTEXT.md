# Phase 30: RBAC UI Gates + Admin Console + Assignment UX — Context

**Gathered:** 2026-04-28
**Status:** Light spec — depends on Phase 29 schema + helpers
**Source:** Direct conversation with Brian (continuation of Phase 29 planning)

## Goal

Make Phase 29's permission system visible to users. Hide buttons by role, scope dashboards to "my work", let Brian create/manage users + assign roles via UI, surface the audit log, and wire up the deal-assignment UX so deals can be passed between team members.

After this phase ships: Stacee logs in, sees only the leads she should work; Chris logs in, sees only field-stuff he can act on; Brian gets a `/admin` console for user management.

## Locked decisions

### Read-side scoping (the "My X" filter)

All major list pages get a `?mine=true` URL param toggle. Server-side query layer:

- **Properties / Leads dashboard:** when `mine=true`, filter to `leads.lead_manager_id = currentUser`.
- **Deals dashboard:** when `mine=true`, filter to `acquisition_user_id = me OR disposition_user_id = me OR coordinator_user_id = me`.
- **Buyers list:** no per-user scoping (buyers are shared org assets); `mine=true` is a no-op.

Default-on for non-owner roles. Owner sees all by default; can toggle to "Mine".

### UI gates (hide-by-role)

For every action button currently visible to all logged-in users, gate via `sessionCan(session, action)`. Examples:

| Component | Button | Gate |
|---|---|---|
| `property-overview.tsx` | "Start Deal" | `deal.create` |
| `deal-overview.tsx` | "Edit Deal" | `deal.edit_terms` (acquisition phases) or `deal.edit_disposition` (marketing) or `deal.edit_closing_logistics` (closing) — depending on current status |
| `buyer-list.tsx` | "Add Buyer" | `buyer.create_or_edit` |
| `tracerfy-button.tsx` | "Skip Trace" | `tracerfy.run` |
| `deal-blast-generator.tsx` | "Send Blast" | `blast.send` |
| `feedback-status-controls.tsx` | shipped/wontfix/duplicate options | `feedback.triage` (replaces hardcoded admin gate) |
| `app-sidebar.tsx`, `bottom-nav.tsx` | nav links | per route — Campaigns hidden if no `campaign.send` etc. |

When the gate fails, the button is **hidden**, not disabled. Clean UX. Server-side gates from Phase 29 still enforce — this is just visual.

### Deal "Team" panel

On deal detail, replace the simple seller-info block with a Team section:

- Three labeled slots: **Acquisition** / **Disposition** / **Coordinator**, each showing the assignee's name (or "Unassigned" with a +) and a chevron dropdown.
- Owner can reassign any slot. Acquisition Manager can reassign their own deal's disposition + coordinator.
- Reassigning fires `updateDealAssignment(dealId, slot, newUserId)` server action (Phase 29 added the server side; Phase 30 adds the UI).

### Auto-assignment on status transition

In `updateDealStatus` (already in deal-actions.ts), after the status update:

- New status === `marketing` AND `disposition_user_id IS NULL` → set to `default_disposition_user_id` from scraper_config (defaults to Stacee day-1).
- New status === `under_contract` AND `coordinator_user_id IS NULL` → set to `default_coordinator_user_id` (defaults to Stacee day-1).
- Audit-logged.

If the configured default user is `is_active=false`, fall through to NULL (unassigned). Don't auto-assign to a deactivated user.

### Admin console (`/admin/users`, `/admin/audit`)

Owner-only routes. Server component layout. Two sub-pages:

**`/admin/users`** — list, create, deactivate, role-assign:
- Table of all users: email, name, roles (multi-select edit), is_active toggle, created_at.
- "+ New User" button: opens a form (email must end @no-bshomes.com, name, password reset link generated on creation, roles checkboxes).
- Per-row "Reset password" button → triggers admin-reset-password.ts equivalent server action (already exists at lib/password-reset-actions.ts).
- Per-row "Deactivate" button → sets is_active=false. Hard delete is a separate admin-only escape hatch.

**`/admin/audit`** — audit log viewer:
- Last 30 days from `audit_log` (active table). "View archive" link queries `audit_log_archive`.
- Filters: actor (dropdown of users), action (text search), entity type (lead/deal/property/buyer/user), entity_id (paste a UUID to see all changes to one item), date range.
- Table: time, actor, action, entity, old → new (collapsed; expand to see full JSON diff).
- Pagination at 50 rows.

### Deferred (NOT Phase 30)

- Per-user-action analytics ("show me Stacee's productivity"). Phase 30 builds the audit log viewer; analytics are a future phase that can read from it.
- Suspicious-pattern alerting on the audit log.
- 2FA.
- Granular per-row ACLs ("share this one deal with Chris").
- A user can BE the actor in an audit-log row but their NAME shows as "deactivated" if they're later deactivated. The viewer still surfaces their email + the actor_user_id link for forensics.

## Open questions for Brian (non-blocking)

1. **Hide vs disable** — confirm hide-not-disable on role-gated buttons. (My recommendation: hide.)
2. **Admin console auth** — do you want the `/admin/*` routes also gated by URL (404 unless `userCan('user.manage')`)? Or just hide the nav link? (My recommendation: gate at both URL + nav.)
3. **Audit log retention** — 30-day active + archive forever, vs 30-day active + 90-day archive + drop after that?

---

*Phase: 30-rbac-ui-admin*
*Context gathered: 2026-04-28*
