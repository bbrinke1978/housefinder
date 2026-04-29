# Phase 29: RBAC Foundation + Audit Log — Context

**Gathered:** 2026-04-28
**Status:** Light spec — ready to execute
**Source:** Direct conversation with Brian after his first /feedback submission and hiring of Stacee + Chris

## Goal

Establish the schema, auth gates, server-side permission helpers, and audit-log infrastructure that Phase 30's UI consumes. After this phase ships, the database knows who can do what; after Phase 30 ships, the UI reflects it.

## Locked decisions

### Roles (multi-role; users have 0..N)

Stored as `users.roles text[] NOT NULL DEFAULT '{}'`. Permission checks return true if **any** role grants the action.

| Role | Identifier | Notes |
|---|---|---|
| Owner | `owner` | Brian + Shawn. Full access. |
| Acquisition Manager | `acquisition_manager` | Negotiates with sellers, locks contracts |
| Disposition Manager | `disposition_manager` | Builds buyers list, markets deals, closes assignments |
| Lead Manager | `lead_manager` | Inbound leads, pre-qualification (Stacee starts here) |
| Transaction Coordinator | `transaction_coordinator` | Title, closing, escrow logistics |
| Sales | `sales` | Field rep — driving for dollars, photo capture, outbound calls (Chris starts here) |
| Assistant | `assistant` | Read-only across the app; layer additional roles on top for write access as needed |

### Multi-role mechanics

- Roles is a Postgres `text[]` (not a junction table). Simpler queries at our scale.
- Permission check helper: `userCan(session, action)` — returns true if any of `session.user.roles` grants the action.
- A user with `['lead_manager', 'sales']` gets the union: can both pre-qualify inbound leads AND log field activity / take photos.
- Role grants/revokes by Owner only.

### Day-1 user assignments

- `brian@no-bshomes.com` → `['owner']`
- `shawn@no-bshomes.com` → `['owner']`
- `admin@no-bshomes.com` → `['owner']`, `is_active = true` (kept active per Brian's correction 2026-04-28; password reset URL issued separately so the account is recoverable)
- Stacee (created in Phase 30 UI or seeded) → `['lead_manager']`
- Chris (created in Phase 30 UI or seeded) → `['sales']`

### Login gates

- Email must end in `@no-bshomes.com` (strict — Owner can grant exceptions later via a `users.allow_external` flag if real-world need arises).
- `is_active = false` users cannot log in.
- `users.roles` empty → user cannot log in (unless `is_active=true` AND has at least one role).
- 2FA deferred (Phase 31+).

### Deal & lead assignment

Three new FKs on `deals`, two on `leads`:

| Column | Phase responsibility |
|---|---|
| `deals.acquisition_user_id` | Lead → Under Contract. Whoever clicked Start Deal by default. |
| `deals.disposition_user_id` | Marketing → Assigned. Auto-set on transition to `marketing` status. |
| `deals.coordinator_user_id` | Under Contract → Closed. Auto-set on transition to `under_contract` status. |
| `leads.lead_manager_id` | Inbound qualification. Defaults to first user with `lead_manager` role. |
| `leads.created_by_user_id` | Whoever first created the lead (NULL for scraper-created legacy leads). Drives the Sales role's "edit my own creations" permission. |

Reassignment is allowed by Owner at any time. Acquisition Managers can reassign their own deals' coordinator/disposition slots.

### Sales role permission model

Sales people drive for dollars and create leads from the field. They should be able to edit:
- Leads where they are the `lead_manager_id` (assigned), AND
- Leads where they are the `created_by_user_id` (their own creations)

Implemented via an entity-scoped helper `canEditLead(session, lead)` in permissions.ts (alongside the action-only `userCan(roles, action)` helper). The Sales role's `lead.edit` permission requires this entity check; broader roles (owner, acquisition_manager, lead_manager) get an unconditional pass.

### Auto-assignment defaults

- Stored in `scraper_config` table (existing key/value store) under keys: `default_disposition_user_id`, `default_coordinator_user_id`, `default_lead_manager_user_id`.
- Day-1 values: all three default to Stacee's user_id (only non-owner team member at start).
- Owner edits these via Phase 30 admin console.

### Audit log

| Aspect | Choice |
|---|---|
| Coverage | Writes only. Every mutating server action calls `logAudit(...)`. Reads are NOT logged (too noisy). |
| Entities tracked | `leads`, `deals`, `properties` (specifically address / owner_name / owner_mailing_*), `buyers`, `users` (role grants, deactivations, password resets), `owner_contacts` (skip-trace runs, manual entries), `distress_signals` (re-scoring). |
| Retention | **30 / 60 / drop** (per Brian 2026-04-28). Active 30-day window in `audit_log`. Daily cron copies rows aged 30 days into `audit_log_archive`. Same cron deletes archived rows aged 60+ days from creation. Net: maximum 60 days of audit history retained anywhere. |
| Storage | `audit_log` table (active) + `audit_log_archive` table (cold, 30-60 day band) — both in the same Postgres DB. |
| Volume | ~100-300 entries/day at current usage. With 60-day cap: ~12,000 rows / ~6 MB peak. Negligible. |
| Schema | id, actor_user_id, action (e.g. `lead.status_changed`), entity_type, entity_id, old_value (jsonb), new_value (jsonb), ip_address, user_agent, created_at |

### Out of scope (deferred)

- 2FA (Phase 31)
- IP-based access controls
- Per-row ACLs (e.g. "share this deal with just user X")
- Audit-log alerts on suspicious patterns ("user X edited 50 leads in 5 minutes")
- Read-action logging
- External-account exceptions to the @no-bshomes.com domain rule

## Brian's locked decisions (2026-04-28)

All open questions resolved:

1. **Sales role** — `canEditLead` returns true if `lead_manager_id = me OR created_by_user_id = me`. Confirmed.
2. **Assistant** — read-only baseline; Owner grants additional roles to layer write access (multi-role union of permissions). Confirmed.
3. **Default disposition + coordinator** — Stacee on day 1. Configurable in `scraper_config`. Confirmed.
4. **Existing-lead backfill** — assign `lead_manager_id` to Brian on every existing lead at Phase 29 seed time. The "carve out leads Stacee touched" rule from Brian's instruction is forward-looking and irrelevant for the initial backfill (Stacee hasn't existed as a user yet, so nothing in the DB can be attributed to her). Phase 30 admin console gets a "reassign by query" tool that Brian can use later to bulk-shift specific leads to Stacee once she's been working.
5. **admin@no-bshomes.com** — Owner role, active. Reset URL issued; whoever owns it sets a new password.

---

*Phase: 29-rbac-foundation*
*Context gathered: 2026-04-28*
