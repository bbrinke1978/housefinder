---
phase: 30-rbac-ui-admin
plan: "01"
subsystem: ui
tags: [rbac, permissions, next-auth, drizzle, react, admin]

requires:
  - phase: 29-rbac-foundation
    provides: users.roles text[], users.is_active, deal assignee FKs, leads.lead_manager_id, audit_log + archive tables, permissions.ts, audit-log.ts, session gates on server actions

provides:
  - Mine/All toggle for deals and leads dashboard (URL param ?mine=true/false)
  - gates.ts helper computing all 17 UI boolean gates from session
  - Role-gated nav (sidebar + bottom-nav) with Admin section for owners
  - Hide-by-role: Start Deal, Edit Deal, Skip Trace, Send Blast, Add Buyer per role
  - DealTeamPanel component: 3 assignee slots with base-ui Dialog reassignment
  - Auto-fill disposition on marketing transition, coordinator on under_contract
  - /admin/users page: create user, edit roles, toggle active, reset password
  - /admin/audit page: paginated audit log with filter bar, Active/Archive tabs, diff expand

affects: [deals, leads, admin, buyers, nav, permissions]

tech-stack:
  added: []
  patterns:
    - "gates.ts: compute all UI boolean gates once per server render, pass as props"
    - "Hide-by-role pattern: canX prop on client component, wrap element in {canX && ...}"
    - "DealTeamPanel optimistic updates with rollback on server error"
    - "Auto-fill: read scraper_config KV for default_*_user_id, verify is_active, fallthrough to null with audit log"
    - "Admin pages: /users URL-gated (notFound), /audit nav-hide only"
    - "Audit queries: archive=false reads audit_log, archive=true reads audit_log_archive"

key-files:
  created:
    - app/src/lib/gates.ts
    - app/src/components/deal-team-panel.tsx
    - app/src/lib/admin-actions.ts
    - app/src/app/(dashboard)/admin/layout.tsx
    - app/src/app/(dashboard)/admin/users/page.tsx
    - app/src/components/admin/users-table.tsx
    - app/src/components/admin/new-user-form.tsx
    - app/src/lib/audit-queries.ts
    - app/src/app/(dashboard)/admin/audit/page.tsx
    - app/src/components/admin/audit-log-viewer.tsx
  modified:
    - app/src/lib/queries.ts
    - app/src/lib/deal-queries.ts
    - app/src/lib/deal-actions.ts
    - app/src/app/(dashboard)/page.tsx
    - app/src/app/(dashboard)/deals/page.tsx
    - app/src/app/(dashboard)/layout.tsx
    - app/src/app/(dashboard)/properties/[id]/page.tsx
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/src/app/(dashboard)/buyers/page.tsx
    - app/src/components/app-sidebar.tsx
    - app/src/components/bottom-nav.tsx
    - app/src/components/property-overview.tsx
    - app/src/components/deal-overview.tsx
    - app/src/components/contact-tab.tsx
    - app/src/components/buyers-list-table.tsx
    - app/src/types/index.ts

key-decisions:
  - "/admin/users URL-gated with notFound(); /admin/audit nav-hide only (read-only, small trusted team)"
  - "Hide buttons, never disable — role-gated controls simply absent from DOM"
  - "Non-owners default mine=true; owners default mine=false; ?mine= param overrides"
  - "Auto-fill uses scraper_config KV; inactive user falls through to null with audit log"
  - "canReassignOwn limited to disposition+coordinator slots (not acquisition) on own deals"
  - "DealTeamPanel uses base-ui Dialog for reassign dropdown (not shadcn Dialog)"

patterns-established:
  - "gates.ts pattern: compute all UI booleans once in server component, spread as props"
  - "Admin console: server page fetches + URL gate, client UsersTable for inline editing"

requirements-completed: []

duration: ~4h
completed: "2026-04-28"
---

# Phase 30 Plan 01: RBAC UI + Admin Summary

**Role-gated UI surfaces: Mine/All toggles, hide-by-role buttons, Deal Team panel with auto-fill, /admin/users console, /admin/audit log viewer**

## Performance

- **Duration:** ~4 hours (across 2 sessions)
- **Started:** 2026-04-28T21:39:59-06:00
- **Completed:** 2026-04-28
- **Tasks:** 5/5
- **Files modified:** 25

## Accomplishments

- Role-gated navigation and all action buttons (Start Deal, Edit Deal, Skip Trace, Send Blast, Add Buyer) are hidden per role — no disabled states, clean removal from DOM
- Deal Team Panel ships with 3 assignee slots; reassignment gated by canReassignAny / canReassignOwn, auto-fills disposition/coordinator slots on status transitions using scraper_config defaults
- /admin/users: owner-only console for creating, role-editing, deactivating, and password-resetting team members
- /admin/audit: paginated audit log with filter bar (actor, action substring, entity type, entity UUID, date range), Active/Archive tabs, per-row diff expansion

## Task Commits

1. **Task 1: Read-side query scoping** - `2fad897` (feat)
2. **Task 2: UI hide-by-role gates** - `3e8a0a7` (feat)
3. **Task 3: Deal Team panel + auto-fill** - `f76d52a` (feat)
4. **Task 4: Admin user-management page** - `6ad6294` (feat)
5. **Task 5: Audit log viewer** - `813605e` (feat)

## Files Created/Modified

**Created:**
- `app/src/lib/gates.ts` - 17-boolean UI gate helper computed from session
- `app/src/components/deal-team-panel.tsx` - 3-slot team panel with base-ui Dialog reassignment
- `app/src/lib/admin-actions.ts` - owner-only server actions: createUser, updateUserRoles, setUserActive, triggerPasswordReset
- `app/src/app/(dashboard)/admin/layout.tsx` - shared admin chrome (no gating at layout level)
- `app/src/app/(dashboard)/admin/users/page.tsx` - URL-gated user management page
- `app/src/components/admin/users-table.tsx` - inline role editing, active toggle, reset PW
- `app/src/components/admin/new-user-form.tsx` - collapsible create user form
- `app/src/lib/audit-queries.ts` - listAuditEntries, countAuditEntries, listActorUsers
- `app/src/app/(dashboard)/admin/audit/page.tsx` - no-gate audit log server page
- `app/src/components/admin/audit-log-viewer.tsx` - filter bar, tabs, paginated table, diff expando

**Modified:** queries.ts, deal-queries.ts, deal-actions.ts, page.tsx (dashboard + deals + property + deal + buyers), layout.tsx, app-sidebar.tsx, bottom-nav.tsx, property-overview.tsx, deal-overview.tsx, contact-tab.tsx, buyers-list-table.tsx, types/index.ts

## Decisions Made

- `/admin/users` is URL-gated with `notFound()`; `/admin/audit` is nav-hidden only (read-only, team is small and trusted; revisit if team scales beyond ~5)
- Buttons hidden (not disabled) when user lacks permission — cleaner UX and prevents confusion
- Non-owners default to `mine=true` scoping; owners see everything by default
- Auto-fill inactive user fallthrough: transition still succeeds, assignee stays null, audit log records `deal.auto_assign_failed` — owner sees open slot in Team panel and reassigns manually
- `canReassignOwn` covers disposition and coordinator slots only (acquisition is a management-level assignment, not self-service)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all 5 tasks passed `npx tsc --noEmit` clean on first attempt.

## User Setup Required

None - no external service configuration required. (RESEND_API_KEY was already in scope from prior phases; admin-actions.ts gracefully falls back to returning the reset URL if RESEND is not configured.)

## Next Phase Readiness

- RBAC UI complete end-to-end: foundation (Phase 29) + surfaces (Phase 30)
- Wholesale lead assignee FK not yet added (deferred per plan — mine filter is no-op on wholesale leads until that FK exists)
- All admin workflows operational: team creation, role assignment, deactivation, audit trail

---
*Phase: 30-rbac-ui-admin*
*Completed: 2026-04-28*
