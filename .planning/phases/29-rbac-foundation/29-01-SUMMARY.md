---
phase: 29-rbac-foundation
plan: 01
subsystem: auth-rbac
tags: [rbac, auth, audit-log, schema, nextauth, azure-functions]
dependency_graph:
  requires: []
  provides: [rbac-schema, permission-helper, audit-log-helper, nextauth-gates, audit-archive-cron]
  affects: [all-server-actions, auth-flow, audit-log-table]
tech_stack:
  added: [jsonb-drizzle, audit_log-table, audit_log_archive-table]
  patterns: [userCan-permission-helper, logAudit-fire-and-forget, nextauth-jwt-callbacks]
key_files:
  created:
    - app/drizzle/0016_rbac_foundation.sql
    - app/scripts/migrate-0016-rbac.ts
    - app/scripts/seed-rbac-day1.ts
    - app/src/lib/permissions.ts
    - app/src/lib/audit-log.ts
    - scraper/src/functions/auditLogArchive.ts
  modified:
    - app/src/db/schema.ts
    - scraper/src/db/schema.ts
    - app/src/auth.ts
    - app/src/lib/actions.ts
    - app/src/lib/deal-actions.ts
    - app/src/lib/wholesale-actions.ts
    - app/src/lib/buyer-actions.ts
    - app/src/lib/tracerfy-actions.ts
    - app/src/lib/feedback-actions.ts
    - app/src/lib/feedback-admin.ts
decisions:
  - "ROLE_GRANTS matrix in permissions.ts owns all permission definitions; server actions use userCan() not role checks directly"
  - "logAudit() wraps its own DB insert in try/catch — audit failure never blocks user action"
  - "Auth gates return null (not error) for domain/active/roles rejection — avoids leaking user existence"
  - "feedback-admin.isAdmin() re-routed through userCan(roles, 'feedback.triage') — backward compat for Brian as owner"
  - "scraper auditLogArchive.ts uses (tx: any) for transaction callback — Drizzle Node16 generic constraint"
  - "admin@no-bshomes.com kept active with owner role per Brian's correction 2026-04-28"
metrics:
  duration: "~45min"
  completed: "2026-04-26"
  tasks: 6
  files: 16
---

# Phase 29 Plan 01: RBAC Foundation Summary

**One-liner:** Full RBAC foundation — schema migration (users/deals/leads FKs + audit tables), NextAuth domain+active+roles gates, permission helper with ROLE_GRANTS matrix, logAudit() helper, server-action wrapping (~30 actions gated), and daily archive cron.

## What Was Built

### Task 1: Schema migration 0016 (prod applied)
- `users.roles text[]`, `users.is_active boolean` — with index
- `deals`: 3 assignee FK columns (acquisition/disposition/coordinator_user_id) + indexes
- `leads`: 2 assignee FK columns (lead_manager_id, created_by_user_id) + indexes
- `audit_log` table: 4 indexes; `audit_log_archive` (LIKE audit_log INCLUDING ALL)
- Both `app/src/db/schema.ts` and `scraper/src/db/schema.ts` updated with Drizzle types
- All 15 SQL statements applied to prod; migration verified with SELECT queries

### Task 2: Day-1 RBAC seed
- `brian@`, `shawn@`, `admin@no-bshomes.com` all set to `roles=['owner']`, `is_active=true`
- 3,339 existing leads backfilled with `lead_manager_id = Brian's user_id`
- Idempotent script, verified with 0 remaining NULL lead_manager_id rows

### Task 3: Permission helper + audit-log helper
- `permissions.ts`: Role/Action types, ROLE_GRANTS matrix (7 roles × 25+ actions), `userCan()`, `sessionCan()`, `canEditLead()` entity-scoped helper
- `audit-log.ts`: `logAudit()` reads IP/UA from Next.js `headers()`; catches all errors internally

### Task 4: NextAuth gates
- Domain restriction: non-`@no-bshomes.com` emails → null (no info leak)
- `is_active=false` → null; `roles=[]` → null
- JWT/session callbacks thread `roles` and `userId` through via `as any` casts

### Task 5: Server action wrapping (~30 actions across 6 files)
- `feedback-admin.ts`: `isAdmin()` now routes through `userCan(roles, 'feedback.triage')`
- `actions.ts`: 7 actions gated (lead.edit_status / scraper_config.manage / user.manage) + 6 logAudit calls
- `deal-actions.ts`: 8 actions gated (deal.create / deal.edit_terms / deal.edit_disposition / buyer.*) + 8 logAudit calls
- `wholesale-actions.ts`: 5 actions gated + 4 logAudit calls
- `tracerfy-actions.ts`: 3 actions gated (tracerfy.run) + 2 logAudit calls
- `feedback-actions.ts`: 3 logAudit calls added; isAdmin() already delegates to RBAC
- `buyer-actions.ts`: sendDealBlast gated (blast.send) + 1 logAudit call

### Task 6: Audit log archive cron
- `scraper/src/functions/auditLogArchive.ts`: timer trigger `0 0 3 * * *`
- Step 1: copy `audit_log` rows >30 days → `audit_log_archive` in a transaction, then delete from active
- Step 2: DELETE `audit_log_archive` rows >60 days entirely
- Deploys with next scraper GitHub Action push

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] scraper auditLogArchive.ts needs .js extensions and tx: any**
- **Found during:** Task 6
- **Issue:** scraper uses `--moduleResolution node16` which requires `.js` file extensions in relative imports; `tx` callback had implicit any
- **Fix:** Changed imports to `../db/client.js` and `../db/schema.js`; added `(tx: any)` annotation
- **Files modified:** `scraper/src/functions/auditLogArchive.ts`
- **Commit:** 04e931a

**2. [Rule 2 - Missing functionality] unused NodePgQueryResultHKT import**
- **Found during:** Task 6 fix
- **Issue:** Import was added but not used; removed it in cleanup
- **Files modified:** `scraper/src/functions/auditLogArchive.ts`

## Verification

All success criteria met:
- Migration 0016: all 15 statements OK in prod; all new tables/columns confirmed
- Day-1 seed: 3 users with ['owner']/active; 0 leads with NULL lead_manager_id
- `app/npx tsc --noEmit`: clean
- `scraper/npx tsc --noEmit`: clean
- Auth gates: domain restriction + active + roles all implemented
- Session exposes `session.user.roles` and `session.user.id` via callbacks
- logAudit() integrated across ~30 actions
- auditLogArchive cron wired; deploys with next scraper push

## Self-Check: PASSED

All key files confirmed present on disk. All 6 task commits confirmed in git log:
- a63e72a: schema migration 0016
- f37c4f0: day-1 RBAC seed
- 7906120: permission helper + audit-log helper
- db4ad14: NextAuth gates
- 78ced71: server action wrapping
- 04e931a: audit log archive cron
