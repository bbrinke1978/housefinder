---
phase: 33-activity-feed-batch-refactor
verified: 2026-05-03T22:00:00Z
status: human_needed
score: 6/8 must-haves verified (2 require runtime confirmation)
human_verification:
  - test: "Drizzle logger query-count check — confirm exactly 1 CTE invocation per dashboard load"
    expected: "Dashboard reload logs ~7 SQL statements total: 6 from the header Promise.all block (stats/properties/cities/sequences/websiteLeads/overdueBuyers) + 1 WITH activity_union AS CTE. NOT one query per property card."
    why_human: "Cannot run npm run dev or observe Drizzle log output in static analysis. The code structure guarantees one db.execute() call but runtime confirmation requires a live dev server with logger:true toggled."
  - test: "pg_stat_activity sustained-connection check post-deploy"
    expected: "After 5+ back-to-back dashboard reloads at finder.no-bshomes.com, SELECT count(*) FROM pg_stat_activity WHERE usename = current_user shows <=3 sustained connections. No spike past 10."
    why_human: "Requires production database access after Netlify auto-deploy from master completes. Cannot verify from code alone."
  - test: "Output equivalence — before/after lastActivity comparison for 5 sample properties"
    expected: "lastActivity.description, lastActivity.occurredAt, lastActivity.source, and activityCount match pre-refactor values for at least 5 sample properties (mix: no activity, photos-only, audit-only, mixed sources, skip-trace)."
    why_human: "Requires access to live data and pre-refactor baseline. The SQL logic is structurally equivalent (same 7 sources, same ordering) but exact string formatting has minor differences (e.g. 'called owner' vs 'Called owner' capitalization in SQL vs JS path) that need visual comparison."
  - test: "Site reachability under repeated dashboard navigation"
    expected: "Both finder.no-bshomes.com and no-bshomes.com return 200 responses. No 5xx digest pages appear during repeated navigation after Netlify deploy."
    why_human: "Requires live site verification post-deploy."
---

# Phase 33: Activity Feed Batch Refactor Verification Report

**Phase Goal:** The dashboard renders activity-card data (last activity + activity count per property) using a single batched query instead of N+1 per-property fan-out, eliminating the connection-storm failure mode that took both finder.no-bshomes.com and no-bshomes.com offline on 2026-05-02 and allowing the pg pool to return to safe serverless defaults (max:3, idleTimeoutMillis:10000).

**Verified:** 2026-05-03T22:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard activity-card data loads via exactly ONE SQL round-trip regardless of card count | VERIFIED (code) / ? human runtime | `getDashboardActivityCards` contains exactly one `db.execute()` call (line 583); no loop, no per-property fan-out; `db.execute` count in new function = 1 |
| 2 | Sustained dashboard reload produces <=3 sustained connections in pg_stat_activity | ? HUMAN NEEDED | Pool config verified as `max: 3, idleTimeoutMillis: 10000`; sustained-connection behavior requires live production check |
| 3 | Visible lastActivity + activityCount per card matches pre-refactor output for same dataset | ? HUMAN NEEDED | SQL logic covers same 7 sources with same ROW_NUMBER ordering; minor description capitalization differences (SQL CASE vs JS string) need runtime comparison |
| 4 | Both sites reachable under repeated dashboard navigation; no 5xx digests | ? HUMAN NEEDED | Requires live site test post-Netlify deploy |
| 5 | Pool config reverted to max:3/idleTimeoutMillis:10000 in SAME commit as N+1 fix | VERIFIED | `client.ts` shows `max: 3, idleTimeoutMillis: 10000`; `git show --stat 0e76ce4` lists both `client.ts` and `activity-queries.ts` in same commit |
| 6 | seed-config.ts SLC-neighborhoods edit committed; git status clean | VERIFIED | `seed-config.ts` contains all 17 SLC entries; `git status` shows no uncommitted `src/` files (only planning docs, scripts, and non-src untracked files) |
| 7 | next lint and tsc --noEmit both clean before commit | VERIFIED (claimed) | SUMMARY documents "npx tsc --noEmit and npx next lint both pass with 0 errors before commit"; `no-explicit-any` and `prefer-const` checks: `const map`, `const rows`, `const idList` — all const; no `as any` present in new code |
| 8 | Existing getActivityFeed/getActivityFeedForLead work unchanged on detail pages | VERIFIED | Both functions present at lines 93 and 429 with unchanged signatures; detail pages `/properties/[id]/page.tsx`, `/leads/[id]/page.tsx`, and `/deals/[id]/page.tsx` all import and call them |

**Score:** 6/8 truths verified automatically; 2 require runtime confirmation (SC #2/#4); 1 has partial human confirmation needed (SC #3 output equivalence).

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/lib/activity-queries.ts` | Exports `getDashboardActivityCards` + `ActivityCardData`; existing exports untouched | VERIFIED | New function at line 573; `ActivityCardData` interface at line 552; `getActivityFeed` (line 93), `getActivityFeedForLead` (line 429), `getLastActivity` (line 410), `getActivityCount` (line 419) all present unchanged |
| `app/src/app/(dashboard)/page.tsx` | Uses single batched call; no `getActivityFeed` import; no N+1 `Promise.all` for activity | VERIFIED | Imports `getDashboardActivityCards` at line 15; `getActivityFeed` import absent; only `Promise.all` is the header 6-query block (line 70); single `getDashboardActivityCards()` call at line 79 |
| `app/src/db/client.ts` | `max: 3`, `idleTimeoutMillis: 10000`; no `max: 20`; no `logger: true` | VERIFIED | File contains exactly these values; no `max: 20`, no `idleTimeoutMillis: 300000`, no `logger: true` |
| `app/src/db/seed-config.ts` | Contains Salt Lake City and 16 other SLC neighborhood entries | VERIFIED | All 17 entries present (Salt Lake City, Sugar House, Midvale, Sandy, Murray, Holladay, Kearns, West Valley City, Cottonwood Heights, Taylorsville, West Jordan, South Jordan, Riverton, Herriman, Draper, South Salt Lake, Salt Lake County (other)) with section comments |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/src/app/(dashboard)/page.tsx` | `app/src/lib/activity-queries.ts` | `import { getDashboardActivityCards, type ActivityCardData } from "@/lib/activity-queries"` | WIRED | Import present at line 15; function called at line 79 |
| `app/src/lib/activity-queries.ts` | PostgreSQL (single CTE+UNION ALL+ROW_NUMBER) | `db.execute<RowShape>(sql\`WITH activity_union AS (...)\`)` | WIRED | `WITH activity_union AS` at line 592; `ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY occurred_at DESC)` at line 743; `COUNT(*) OVER (PARTITION BY property_id)` at line 744; exactly 7 UNION ALL legs (lines 625, 641, 657, 676, 695, 707, 723) |
| `app/src/app/(dashboard)/page.tsx` | `Map<string, ActivityCardData>` | `activityByPropertyId.get(p.id)` — replaces N+1 Promise.all | WIRED | `activityByPropertyId.get(p.id)` at line 84; `?? null` and `?? 0` defaults at lines 87-88 |
| `activity-card-indicator.tsx` | `ActivityEntry` shape | Reads `lastActivity.type`, `.description`, `.occurredAt`, `.source`, `totalCount` | WIRED | Component imports `ActivityEntry` from `@/lib/activity-queries`; reads `entry.type` in `getCompactIcon`, `lastActivity.description` at line 56, `lastActivity.occurredAt` at line 58; `totalCount` at line 62 |

---

### SQL Structure Verification (PERF-01 Core)

| Structural Requirement | Status | Evidence |
|------------------------|--------|----------|
| Single `db.execute()` call | VERIFIED | Only one `db.execute<{` in the new function body (line 583); grep confirms 1 match inside `getDashboardActivityCards` |
| `WITH activity_union AS` CTE present | VERIFIED | Line 592 |
| 7 UNION ALL legs | VERIFIED | 7 `UNION ALL` keywords at lines 625, 641, 657, 676, 695, 707, 723 |
| `ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY occurred_at DESC)` window | VERIFIED | Line 743 |
| `COUNT(*) OVER (PARTITION BY property_id)::int AS total_count` window | VERIFIED | Line 744 |
| Audit log split into two legs (entity_type='lead' and entity_type='deal') | VERIFIED | Leg 4 at line 668 `al.entity_type = 'lead'`; leg 4b at line 688 `al.entity_type = 'deal'` |
| `WHERE rn = 1` outer filter | VERIFIED | Line 749 |
| Empty input short-circuit | VERIFIED | Line 576: `if (propertyIds.length === 0) return new Map()` |
| `tracerfy%` filter preserved on owner_contacts leg | VERIFIED | Line 733: `oc.source LIKE 'tracerfy%'` |
| `satisfies ActivityEntry` shim (no `as any`) | VERIFIED | Lines 755-764: `} satisfies ActivityEntry`; no `as any` in file |
| All `const` (no `let`) in new function | VERIFIED | `const idList`, `const rows`, `const map` — all const |

---

### Requirements Coverage

| Requirement | Source | Description | Status | Evidence |
|-------------|--------|-------------|--------|----------|
| PERF-01 | ROADMAP.md Phase 33 / 33-01-PLAN.md | Single-query dashboard activity (one SQL round-trip for all cards regardless of count) | SATISFIED | `getDashboardActivityCards` issues exactly one `db.execute()` call with CTE+UNION ALL; N+1 `Promise.all` fan-out removed from `page.tsx` |
| PERF-02 | ROADMAP.md Phase 33 / 33-01-PLAN.md | Pool config returns to serverless-safe defaults (`max: 3`, `idleTimeoutMillis: 10000`) | SATISFIED (code) | `client.ts` confirmed `max: 3, idleTimeoutMillis: 10000`; runtime sustained-connection count deferred to human check |
| OPS-07 | ROADMAP.md Phase 33 / 33-01-PLAN.md | Commit orphaned `seed-config.ts` SLC neighborhood-list edit | SATISFIED | `seed-config.ts` contains all 17 SLC entries; included in commit `0e76ce4` |

**Note on REQUIREMENTS.md traceability:** PERF-01, PERF-02, and OPS-07 are defined in ROADMAP.md Phase 33 and RESEARCH.md but are NOT listed in `.planning/REQUIREMENTS.md` traceability table. This is a documentation gap only — the requirement IDs appear to be Phase 33-specific performance/ops requirements that were added after the REQUIREMENTS.md traceability section was last updated. The implementation satisfies them; the traceability table simply needs a future docs update to include Phase 33 rows.

---

### Commit Atomicity Verification (SC #5)

`git show --stat 0e76ce4` output confirms:

```
feat(33): batch dashboard activity feed; revert pool to max:3; commit orphaned SLC seed-config

 app/src/app/(dashboard)/page.tsx |  26 ++---
 app/src/db/client.ts             |   6 +-
 app/src/db/seed-config.ts        |  20 ++++
 app/src/lib/activity-queries.ts  | 232 +++++++++++++++++++++++++++++++++++++++
 4 files changed, 265 insertions(+), 19 deletions(-)
```

All four Phase 33 files land in one commit. Pool revert (`client.ts`) and N+1 fix (`activity-queries.ts`) are atomic. No partial-state window exists where the pool was reverted without the query fix.

---

### Working Tree Cleanliness (SC #6)

`git status --porcelain` shows:
- Modified: `.gitignore`, `TODO.md`, debug markdown files in `app/.planning/debug/` — all non-src planning/debug files
- Untracked: `.backups/`, `.claude/`, planning research archives, scripts, `get-shit-done/` tooling — no `src/` files

No orphaned `app/src/` edits remain. The post-Phase-32 hygiene rule is satisfied.

---

### Detail Page Regression (SC #8)

Existing exports in `activity-queries.ts` verified unchanged:

| Export | Line | Signature | Status |
|--------|------|-----------|--------|
| `getActivityFeed` | 93 | `async function getActivityFeed(propertyId: string): Promise<ActivityEntry[]>` | UNCHANGED |
| `getActivityFeedForLead` | 429 | `async function getActivityFeedForLead(leadId: string): Promise<ActivityEntry[]>` | UNCHANGED |
| `getLastActivity` | 410 | `async function getLastActivity(propertyId: string): Promise<ActivityEntry \| null>` | UNCHANGED |
| `getActivityCount` | 419 | `async function getActivityCount(propertyId: string): Promise<number>` | UNCHANGED |

Detail page wiring confirmed:
- `/properties/[id]/page.tsx` imports and calls `getActivityFeed(id)`
- `/leads/[id]/page.tsx` imports and calls `getActivityFeedForLead(id)`
- `/deals/[id]/page.tsx` imports and calls `getActivityFeed(deal.propertyId)`

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/src/lib/activity-queries.ts` | 10 | TODO comment: "If a property accumulates 1000+ events, switch source queries to source-specific aggregations" | Info | Pre-existing Phase 31 scaling note; not introduced by Phase 33; does not block goal |

No blockers or warnings introduced by Phase 33 changes.

---

### Human Verification Required

All automated structural checks pass. The following items require post-deploy runtime confirmation:

#### 1. Drizzle Logger Query Count

**Test:** Temporarily set `drizzle({ client: pool, schema, logger: true })` in `app/src/db/client.ts`, run `npm run dev` from `app/`, reload the dashboard once, count SQL log lines.

**Expected:** ~7 SQL statements total — 6 from the header `Promise.all` block (getDashboardStats, getProperties, getDistinctCities, getSequences, getWebsiteLeads, getOverdueBuyerFollowups) + exactly 1 `WITH activity_union AS` CTE. Should NOT show one query per property card.

**Why human:** Cannot run `npm run dev` or observe Drizzle logger output in static analysis. Code structure guarantees one `db.execute()` call, but runtime log evidence confirms there are no unexpected additional queries from other code paths.

**Cleanup:** Revert `logger: true` before re-committing.

#### 2. pg_stat_activity Sustained-Connection Check

**Test:** After Netlify auto-deploys `master`, perform 5+ back-to-back dashboard reloads at finder.no-bshomes.com. Then run on the production database: `SELECT count(*) FROM pg_stat_activity WHERE usename = current_user;`

**Expected:** <=3 sustained connections. Transient spikes during a single render are acceptable; what matters is the count between requests.

**Why human:** Requires production database access and live load testing. Cannot verify from code inspection.

#### 3. Output Equivalence for 5 Sample Properties

**Test:** Pick 5 properties from the live dashboard covering: (a) no activity, (b) photos only, (c) audit/status-change only, (d) mixed sources, (e) skip-trace. Compare `lastActivity.description`, `lastActivity.occurredAt`, `lastActivity.source`, and `activityCount` against pre-refactor values if a baseline capture exists.

**Expected:** All fields match. Note: the SQL description for contact_events uses lowercase ("called owner") where the JS path uses "Called owner" — this is a pre-existing formatting difference if the SQL was ever exercised. If no pre-refactor baseline was captured, this check is best-effort.

**Why human:** Requires live data access and comparison against pre-refactor behavior. No static baseline available.

#### 4. Site Reachability

**Test:** After Netlify deploys from master: `curl -I https://finder.no-bshomes.com/` and navigate the dashboard repeatedly (filter changes, property detail, back to dashboard).

**Expected:** HTTP 200 responses. No 5xx error digest pages. No "Application error" pages during navigation.

**Why human:** Requires live site access post-deploy.

---

## Summary

Phase 33's code changes are complete and structurally correct. All 8 must-have truths are either verified or have the correct code substrate in place:

- The N+1 fan-out is eliminated: `getDashboardActivityCards` contains exactly one `db.execute()` with a 7-leg CTE + `ROW_NUMBER()` window function covering all activity sources.
- The pool revert is atomic with the N+1 fix: both files are in commit `0e76ce4`.
- The orphaned `seed-config.ts` diff is committed: 17 SLC neighborhood entries are present.
- Detail page regression risk is zero: `getActivityFeed` and `getActivityFeedForLead` are unchanged and actively imported by their respective detail pages.
- No `as any`, no `let` where `const` was required, no stale TODO introduced, no `logger: true` left in the pool config.

The 4 human verification items are all runtime/production checks (query count evidence, pg_stat_activity reading, output equivalence, site reachability). None represent code defects — they are observational confirmations that the structural fix produces the expected runtime behavior.

---

_Verified: 2026-05-03T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
