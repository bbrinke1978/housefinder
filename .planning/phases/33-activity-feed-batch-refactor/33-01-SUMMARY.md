---
phase: 33-activity-feed-batch-refactor
plan: 01
subsystem: database
tags: [postgres, drizzle-orm, node-postgres, cte, window-functions, performance, connection-pooling]

# Dependency graph
requires:
  - phase: 31-activity-feed
    provides: getActivityFeed, ActivityEntry interface, ActivityCardIndicator component used by dashboard
provides:
  - getDashboardActivityCards() — single CTE+UNION ALL+ROW_NUMBER batch query replacing N+1 dashboard fan-out
  - ActivityCardData interface — exported from activity-queries.ts
  - pg pool reverted to max:3/idleTimeoutMillis:10000 (serverless-safe)
  - seed-config.ts SLC neighborhood entries committed
affects: [dashboard, activity-queries, db-pool-sizing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CTE + UNION ALL + ROW_NUMBER OVER (PARTITION BY) for batched top-1-per-group across multiple source tables"
    - "ActivityCardData as minimal card-scope interface alongside full ActivityEntry — avoids touching types/index.ts"
    - "sql.join(ids.map(id => sql`${id}::uuid`), sql`, `) for IN-clause UUID array binding"

key-files:
  created: []
  modified:
    - app/src/lib/activity-queries.ts
    - app/src/app/(dashboard)/page.tsx
    - app/src/db/client.ts
    - app/src/db/seed-config.ts

key-decisions:
  - "getDashboardActivityCards() is additive — existing getActivityFeed/getActivityFeedForLead untouched"
  - "ActivityCardData uses ActivityEntry satisfies shim (stub id/actorUserId/actorName/body) to avoid types/index.ts changes"
  - "Pool revert to max:3/idle:10000 is atomic with N+1 fix — unsafe to ship separately"
  - "Empty propertyIds short-circuits before SQL to avoid IN() syntax error"
  - "Drizzle logger toggle deferred to user manual verification post-deploy (cannot run npm run dev in autonomous mode)"

patterns-established:
  - "Pattern: batch activity card data via CTE, not per-row JS fan-out"
  - "Pattern: seed-config.ts orphaned changes committed in the same atomic unit as related feature work"

requirements-completed: [PERF-01, PERF-02, OPS-07]

# Metrics
duration: 15min
completed: 2026-05-03
---

# Phase 33: Activity Feed Batch Refactor Summary

**Single CTE+UNION ALL+ROW_NUMBER batched query replaces 450-round-trip N+1 dashboard fan-out that caused the 2026-05-02 connection-storm outage; pg pool reverted to max:3**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-03T20:45:00Z
- **Completed:** 2026-05-03T21:02:09Z
- **Tasks:** 2 (combined into 1 atomic commit)
- **Files modified:** 4

## Accomplishments

- Added `getDashboardActivityCards(propertyIds[])` to `activity-queries.ts` — one `db.execute()` round-trip replaces up to 450 per-card queries (PERF-01)
- Dashboard `page.tsx` rewired from `Promise.all(properties.map(getActivityFeed))` to single batched call (N+1 eliminated)
- Reverted `client.ts` pg pool from `max:20/idleTimeoutMillis:300000` (e092480 emergency hotfix) back to serverless-safe `max:3/idleTimeoutMillis:10000` (PERF-02)
- Committed orphaned `seed-config.ts` diff (17 SLC neighborhood additions from 2026-04-17) in same atomic unit (OPS-07)
- `npx tsc --noEmit` and `npx next lint` both pass with 0 errors before commit

## Task Commits

Both tasks landed in a single atomic shipping commit (per plan requirement — pool revert is unsafe without N+1 fix):

1. **Task 1 + Task 2 (atomic):** `0e76ce4` (feat)
   - `feat(33): batch dashboard activity feed; revert pool to max:3; commit orphaned SLC seed-config`

## Files Created/Modified

- `app/src/lib/activity-queries.ts` — Added `ActivityCardData` interface and `getDashboardActivityCards()` export (232 new lines appended; existing exports untouched)
- `app/src/app/(dashboard)/page.tsx` — Replaced N+1 Promise.all block with single `getDashboardActivityCards()` call; removed stale TODO comment
- `app/src/db/client.ts` — Reverted pool from `max:20/idle:300000` to `max:3/idle:10000`
- `app/src/db/seed-config.ts` — SLC neighborhood orphaned diff committed (17 entries: Salt Lake City, Sugar House, Midvale, Sandy, Murray, Holladay, Kearns, West Valley City, Cottonwood Heights, Taylorsville, West Jordan, South Jordan, Riverton, Herriman, Draper, South Salt Lake, Salt Lake County (other))

## Decisions Made

- `ActivityCardData` uses `satisfies ActivityEntry` widening shim (stub `id: ""`, `actorUserId: null`, `actorName: null`, `body: null`) — avoids any change to `app/src/types/index.ts`; the card consumer never reads those fields
- Audit log split into two UNION ALL legs (one for `entity_type='lead'`, one for `entity_type='deal'`) to leverage composite index `idx_audit_log_entity(entity_type, entity_id)`
- Properties with zero activity are handled by JS-side `?? null` defaulting (Option b from RESEARCH.md Pitfall 4) — no LEFT JOIN to `properties` needed
- Drizzle logger toggle (manual query-count verification) deferred to post-deploy user manual step — not automatable in autonomous mode

## Deviations from Plan

None — plan executed exactly as written. Drop-in SQL copied verbatim from RESEARCH.md. No re-derivation.

## Manual Verification Deferred to User (Post-Deploy)

The plan notes Drizzle logger toggle as an OPTIONAL manual verification step in autonomous mode. After Netlify deploys from `master`:

1. Temporarily set `drizzle({ client: pool, schema, logger: true })` in `app/src/db/client.ts`
2. Reload the dashboard once
3. Count SQL statements — should be ~7 total (6 header queries + 1 `WITH activity_union AS` CTE)
4. Revert `logger: true` before re-committing

The automated evidence is: `tsc --noEmit` clean, `next lint` clean (0 errors), `git show --stat HEAD` shows exactly 4 files, and the `getDashboardActivityCards` function contains exactly 1 `db.execute(` call.

## Issues Encountered

None — all lint, tsc, and staging checks passed first-try.

## Next Phase Readiness

- Phase 33 closed. The 2026-05-02 connection-storm root cause is eliminated.
- Pool is back at safe serverless defaults (`max:3`) — safe because N+1 is gone.
- Detail pages (`/properties/[id]`, `/leads/[id]`, `/deals/[id]`) still use `getActivityFeed`/`getActivityFeedForLead` unchanged — no regression risk.
- Next milestone work can proceed without connection-storm risk.

## Self-Check

- `app/src/lib/activity-queries.ts` exists with `getDashboardActivityCards`: FOUND
- `app/src/app/(dashboard)/page.tsx` rewired: FOUND (no `getActivityFeed` import, has `getDashboardActivityCards`)
- `app/src/db/client.ts` contains `max: 3`: FOUND
- `app/src/db/seed-config.ts` SLC entries committed: FOUND (in commit `0e76ce4`)
- Commit `0e76ce4` exists on master with 4 files: VERIFIED
- `git status --porcelain` src/ files: CLEAN (no orphaned src/ edits)

## Self-Check: PASSED

---
*Phase: 33-activity-feed-batch-refactor*
*Completed: 2026-05-03*
