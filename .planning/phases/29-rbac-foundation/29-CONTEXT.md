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
- `admin@no-bshomes.com` → `[]` (no roles) + `is_active = false` (already locked at password level via admin-lock-account.ts)
- Stacee (created in Phase 30 UI or seeded) → `['lead_manager']`
- Chris (created in Phase 30 UI or seeded) → `['sales']`

### Login gates

- Email must end in `@no-bshomes.com` (strict — Owner can grant exceptions later via a `users.allow_external` flag if real-world need arises).
- `is_active = false` users cannot log in.
- `users.roles` empty → user cannot log in (unless `is_active=true` AND has at least one role).
- 2FA deferred (Phase 31+).

### Deal & lead assignment

Three new FKs on `deals`, one on `leads`:

| Column | Phase responsibility |
|---|---|
| `deals.acquisition_user_id` | Lead → Under Contract. Whoever clicked Start Deal by default. |
| `deals.disposition_user_id` | Marketing → Assigned. Auto-set on transition to `marketing` status. |
| `deals.coordinator_user_id` | Under Contract → Closed. Auto-set on transition to `under_contract` status. |
| `leads.lead_manager_id` | Inbound qualification. Defaults to first user with `lead_manager` role. |

Reassignment is allowed by Owner at any time. Acquisition Managers can reassign their own deals' coordinator/disposition slots.

### Auto-assignment defaults

- Stored in `scraper_config` table (existing key/value store) under keys: `default_disposition_user_id`, `default_coordinator_user_id`, `default_lead_manager_user_id`.
- Day-1 values: all three default to Stacee's user_id (only non-owner team member at start).
- Owner edits these via Phase 30 admin console.

### Audit log

| Aspect | Choice |
|---|---|
| Coverage | Writes only. Every mutating server action calls `logAudit(...)`. Reads are NOT logged (too noisy). |
| Entities tracked | `leads`, `deals`, `properties` (specifically address / owner_name / owner_mailing_*), `buyers`, `users` (role grants, deactivations, password resets), `owner_contacts` (skip-trace runs, manual entries), `distress_signals` (re-scoring). |
| Storage | `audit_log` table for active 30-day window. Daily Azure Function timer copies rows older than 30 days into `audit_log_archive` table (same DB). DELETE source row after copy. |
| Volume | ~100-300 entries/day at current usage. ~30 MB/year total. Negligible. |
| Schema | id, actor_user_id, action (e.g. `lead.status_changed`), entity_type, entity_id, old_value (jsonb), new_value (jsonb), ip_address, user_agent, created_at |

### Out of scope (deferred)

- 2FA (Phase 31)
- IP-based access controls
- Per-row ACLs (e.g. "share this deal with just user X")
- Audit-log alerts on suspicious patterns ("user X edited 50 leads in 5 minutes")
- Read-action logging
- External-account exceptions to the @no-bshomes.com domain rule

## Open questions for Brian (flagged in 29-RESEARCH.md)

None blocking — defaults are documented above. Brian can amend before /gsd:execute-phase 29 runs, or live with the defaults and adjust via the admin console after Phase 30 ships.

---

*Phase: 29-rbac-foundation*
*Context gathered: 2026-04-28*
