# Phase 33: Activity Feed Batch Refactor - Research

**Researched:** 2026-05-03
**Domain:** PostgreSQL batch query optimization, Drizzle ORM raw-SQL patterns, node-postgres pool tuning for serverless RSC
**Confidence:** HIGH

## Summary

The dashboard renders a property card grid (up to 500 properties) and currently fans out to `getActivityFeed(propertyId)` once per card via `Promise.all`. Each call runs ~9 sub-queries (lead lookup + deal lookup + 7 parallel source queries inside `getActivityFeed`). At 50 cards that is ~450 round-trips per dashboard render. Combined with Next.js 15 RSC streaming, every reload spawns a fresh fan-out before the previous batch's connections are released. With a small pool (the safe default), this exhausts connections; with a large pool (the e092480 hotfix that bumped `max:20`), it instead exhausts Azure Postgres B1ms server-side connection slots. Both modes produced the 2026-05-02 connection-storm outage that took `finder.no-bshomes.com` and `no-bshomes.com` offline.

The fix is structural, not a knob: the dashboard does NOT need full activity feeds — `ActivityCardIndicator` (`app/src/components/activity-card-indicator.tsx:13-87`) consumes only `lastActivity.type`, `lastActivity.description`, `lastActivity.occurredAt`, `lastActivity.source`, plus the `totalCount` integer. So we can replace 450 round-trips with a single batched SQL query that returns "for each propertyId in (...), the most-recent 1 activity row + total count" using a CTE with `UNION ALL` over the 7 sources, windowed by `ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY occurred_at DESC)`.

The single-property paths (`getActivityFeed(propertyId)` on properties/leads/deals detail pages and `getActivityFeedForLead(leadId)` for inbound leads) do NOT change — they still need full 100-row feeds with full ActivityEntry shape. Phase 33 adds ONE new function alongside them and rewires only the dashboard to use it.

**Primary recommendation:** Add `getDashboardActivityCards(propertyIds: string[])` to `app/src/lib/activity-queries.ts` using `db.execute<RowShape>(sql\`...\`)` with a single CTE that UNIONs the 7 sources, applies `ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY occurred_at DESC)`, and aggregates counts in the same query via a second windowed `COUNT(*) OVER (PARTITION BY property_id)`. Return `Map<propertyId, { lastActivity: { type, description, occurredAt, source } | null, activityCount: number }>`. Wire dashboard page to call ONCE with the full property-ID list. Revert `client.ts` to `max: 3, idleTimeoutMillis: 10000`. Commit orphaned `seed-config.ts` in same shipped commit set.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Single-query dashboard activity (one SQL round-trip for all cards regardless of count) | New `getDashboardActivityCards()` using one `db.execute(sql\`...\`)` with CTE+UNION ALL+ROW_NUMBER; replaces `Promise.all(properties.map(...))` fan-out at `app/src/app/(dashboard)/page.tsx:82-91` |
| PERF-02 | Pool config returns to serverless-safe defaults (`max: 3`, `idleTimeoutMillis: 10000`) | Revert commit e092480's bump back to safe defaults; current `client.ts` shows `max: 20, idleTimeoutMillis: 300000`. Single-query refactor makes this safe again |
| OPS-07 | Commit orphaned `seed-config.ts` SLC neighborhood-list edit | Verified diff: adds 17 SLC neighborhood entries (Salt Lake City, Sugar House, Midvale, Sandy, etc.) to `DEFAULT_TARGET_CITIES`. Bundling avoids the post-Phase-32 "uncommitted src/" outage pattern |
</phase_requirements>

## Standard Stack

### Core (already installed — do not add)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | ^0.45.1 | ORM with `db.execute(sql\`...\`)` raw-SQL escape hatch | Already used for all complex aggregations in this project (`analytics-queries.ts`, `audit-queries.ts`, `feedback-queries.ts`, etc.) |
| `pg` | ^8.20.0 | node-postgres driver with Pool | Already wired in `app/src/db/client.ts`; supports `max`/`idleTimeoutMillis`/`connectionTimeoutMillis` exactly as Phase 33 needs |
| Next.js | ^15.5.15 | React Server Components / RSC | The dashboard route is an `async` server component — single batched query is the canonical RSC data-fetching pattern |
| PostgreSQL | (managed) | LATERAL, CTE, ROW_NUMBER OVER PARTITION BY | All Postgres features required are in the SQL standard since 9.3+ — no version risk |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `date-fns` | (already used) | `formatDistanceToNow` in card indicator | No changes — consumer already imports it |

### Alternatives Considered
| Instead of | Could Use | Why we did NOT choose it |
|------------|-----------|----------|
| Single CTE+UNION+ROW_NUMBER (recommended) | LATERAL subquery joining `properties` to a UNION'd subquery | LATERAL with a UNION subquery is harder to read and Drizzle's `leftJoinLateral()` API doesn't materially help when the source itself is a UNION; raw `sql\`...\`` in `db.execute()` is the established project pattern |
| Single CTE | Two queries (one for last activity, one for count) | Two queries doubles round-trips. The `COUNT(*) OVER (PARTITION BY property_id)` window function gives both in one pass |
| Single CTE | Per-source last/count queries unioned in JS | Same N+1 problem as today, just hidden differently |
| node-postgres `Pool` reverted to `max:3` | Switch to `@neondatabase/serverless` HTTP driver | Would require infrastructure change (Azure Postgres ≠ Neon), and out of scope. The N+1 fix makes `max:3` safe again |
| node-postgres `Pool` reverted to `max:3` | Add PgBouncer | Azure B1ms tier doesn't support PgBouncer (NETLIFY-03 documented this); deferred to v2 |

**Installation:** No new dependencies needed.

## Architecture Patterns

### Project Structure (existing — touch these files only)
```
app/src/
├── lib/
│   ├── activity-queries.ts          # ADD getDashboardActivityCards() here
│   └── queries.ts                    # (untouched — getProperties stays as-is)
├── app/(dashboard)/
│   └── page.tsx                      # MODIFY: replace Promise.all fan-out with one call
├── db/
│   ├── client.ts                     # MODIFY: revert pool to max:3, idleTimeoutMillis:10000
│   ├── seed-config.ts                # COMMIT orphaned diff (already on disk)
│   └── schema.ts                     # untouched
└── types/
    └── index.ts                      # (PropertyWithLead.lastActivity / activityCount types stay; possibly add a narrower type for the card-specific subset)
```

### Pattern 1: Raw SQL via `db.execute<T>(sql\`...\`)` — established project precedent

**What:** Drizzle's escape hatch for SQL features beyond the query builder. Parameters interpolated with `${value}` are auto-bound to `$1, $2, ...` placeholders (no injection risk).

**When to use:** Any time you need CTE, UNION, window functions, or PostgreSQL-specific features. This is THE pattern in this codebase — `app/src/lib/analytics-queries.ts` uses it 8+ times.

**Example precedent (verified, in repo):**
```typescript
// Source: app/src/lib/analytics-queries.ts:359-404 (getRecentActivityLog)
const rows = await db.execute<{
  id: string;
  type: "note" | "call";
  address: string;
  city: string;
  text: string;
  created_at: Date;
}>(sql`
  SELECT
    ln.id::text,
    'note' AS type,
    p.address,
    p.city,
    ln.note_text AS text,
    ln.created_at
  FROM lead_notes ln
  JOIN leads l ON l.id = ln.lead_id
  JOIN properties p ON p.id = l.property_id

  UNION ALL

  SELECT
    cl.id::text,
    'call' AS type,
    p.address,
    p.city,
    COALESCE(cl.notes, cl.outcome::text) AS text,
    cl.created_at
  FROM call_logs cl
  JOIN leads l ON l.id = cl.lead_id
  JOIN properties p ON p.id = l.property_id

  ORDER BY created_at DESC
  LIMIT ${limit}
`);

return (rows.rows ?? []).map((r) => ({
  id: r.id,
  type: r.type,
  address: r.address,
  city: r.city,
  text: r.text,
  createdAt: new Date(r.created_at),
}));
```

### Pattern 2: Parameterized array IN clause via `sql.join()`

**What:** Bind a `string[]` of UUIDs into a SQL `IN (...)` clause with proper placeholder binding.

**When to use:** Whenever you need `WHERE x IN (:uuid1, :uuid2, ...)` from JS — this phase needs it for the property-ID array.

**Example precedent (verified, in repo):**
```typescript
// Source: app/src/lib/queries.ts:528 (getProperties)
sql`(${properties.ownerName} IS NULL OR ${properties.ownerName} NOT IN (${sql.join(bigOpNames.map(n => sql`${n}`), sql`, `)}))`
```

For our phase, the property-ID binding looks like:
```typescript
const propertyIdSql = sql.join(propertyIds.map((id) => sql`${id}::uuid`), sql`, `);
// Used as: WHERE p.id IN (${propertyIdSql})
```

### Pattern 3: Single CTE + UNION ALL + window function for batched top-1-per-group

**What:** Wrap the 7-source UNION in a CTE, then apply `ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY occurred_at DESC)` to get rank, AND `COUNT(*) OVER (PARTITION BY property_id)` to get total count, in the SAME pass. Filter to `rn = 1` to get only the most-recent row per property.

**When to use:** Any "for each X, give me top-1 of Y plus count of Y" pattern at scale. This is the canonical Postgres pattern for activity feed cards.

**Why this over LATERAL:** A LATERAL subquery would need its own UNION inside the lateral, which Postgres handles fine but is harder to read. The CTE+window approach reads top-down (define source events → rank/count → pick top per property) and lets the planner pick the optimal access path.

### Pattern 4: Mapping the 7 sources into a normalized union row shape

The existing `getActivityFeed()` builds rich `ActivityEntry` objects in JS (formatted descriptions, joined actor names, day-grouping for photos, etc.). For the **dashboard card path only**, we can simplify drastically because the consumer (`ActivityCardIndicator`) only needs:
- `description: string` — pre-formatted one-liner
- `type: string` — for icon selection
- `occurredAt: Date`
- `source: ActivitySource` — fallback icon

So the SQL itself can compute `description` for each row using `CASE` expressions (and join `users.name` for contact_events/audit_log actors), avoiding ALL post-processing in JS.

**Tradeoff:** Some description shapes have outcome suffixes ("(no answer)") and actor prefixes ("Stacee — called owner") that are straightforward CASE/CONCAT in SQL. Photo day-grouping and skip-trace day-grouping in the existing `getActivityFeed()` are NOT needed on the card (card just shows the most recent activity, not "N photos uploaded today" aggregation). For card-level use, we can drop the day-grouping and just show the most-recent individual photo upload as the description.

### Anti-Patterns to Avoid

- **Don't try to share code with `getActivityFeed(propertyId)`.** The single-property function returns FULL `ActivityEntry[]` with rich `body`/`metadata` for the timeline UI. The batch function returns a TINY shape for cards. Trying to share rendering logic forces the batch query to be heavier than needed. Keep them as two functions.
- **Don't replace the JS post-processing in `getActivityFeed()`.** It works, the detail-page UI depends on its full shape, and it's only called once per detail-page load. Touching it adds risk for zero outage benefit.
- **Don't use `db.execute(sql\`SELECT ... FROM\`)` then ignore `rows.rows`.** node-postgres returns `{ rows: T[], ... }`. The pattern is `(result.rows ?? []).map(...)`.
- **Don't drop the activity feed from inbound-lead detail pages.** `getActivityFeedForLead(leadId)` is a separate function used only on `/leads/[id]` inbound pages — leave it alone.
- **Don't bump `connectionTimeoutMillis`.** Current value `10000ms` is fine. The outage was caused by query volume, not slow connection acquisition.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Top-N per group across multiple source tables | JS loop fanning out per property | One CTE + UNION ALL + `ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY occurred_at DESC)` | The fan-out IS the bug we are fixing |
| Aggregating count + last-row in one shot | Two queries (`SELECT MAX(...)` + `SELECT COUNT(...)`) | `COUNT(*) OVER (PARTITION BY property_id)` window in same CTE | One round-trip vs two; the planner reads source rows once |
| Verifying "exactly one query" empirically | `pg_stat_statements` snapshot diff | Drizzle's built-in logger: `drizzle({ client: pool, schema, logger: true })` toggled in dev or count via local Postgres logs | Logger fires on every SQL execution and is one line to enable; pg_stat_statements requires a server-side extension and superuser DDL |
| pg-pool serverless tuning | Building a custom pool wrapper or singleton hack | The existing `new Pool({ max, idleTimeoutMillis, connectionTimeoutMillis })` literal — just revert the values | The instance is already module-scoped; Next.js dev hot-reload re-uses it because client.ts is server-only and cached |
| Parameter binding for `WHERE id IN (uuid_array)` | Manual string concatenation | `sql.join(items.map(x => sql\`${x}\`), sql\`, \`)` | Existing project pattern at `queries.ts:528`; injection-safe |

**Key insight:** All the building blocks already exist in this codebase. Phase 33 is a recombination, not a green-field design. The single biggest mistake to avoid is building a generic "batch ActivityFeed" that tries to also serve the detail pages — keep the new function dashboard-card-specific.

## Common Pitfalls

### Pitfall 1: Audit log entityId binding to lead OR deal IDs
**What goes wrong:** Audit log rows reference `entityId = leadId OR entityId = dealId`, with `entityType` discriminating which. In a batched query for 50 properties, that's potentially 50 leads + N deals = ~100 entity IDs to filter on.
**Why it happens:** Audit log is denormalized — it doesn't have a property_id column. Existing `getActivityFeed` resolves leadId/dealId per property via two extra queries, then filters audit_log by `entityId IN (...)`.
**How to avoid:** In the batched query, JOIN audit_log → leads → properties (where `entityType='lead'` and `entityId = leads.id`), and audit_log → deals → properties (where `entityType='deal'` and `entityId = deals.id`). Both legs UNION into the same source pipeline, with property_id projected out so the final partition works.
**Warning sign:** If audit rows in dashboard cards stop appearing after refactor, the JOIN legs are mis-typed.

### Pitfall 2: Owner-mailing rows poisoning skip-trace counts
**What goes wrong:** `ownerContacts` contains both real skip-trace entries AND owner-mailing addresses (`source` like `'assessor%'` or `'mailing%'`). Existing query filters with `like(ownerContacts.source, "tracerfy%")`.
**Why it happens:** The `skip_trace` source is gated by `source LIKE 'tracerfy%'`.
**How to avoid:** Carry that `LIKE 'tracerfy%'` filter into the SQL exactly. Don't drop it.
**Warning sign:** Activity counts on cards spike weirdly after refactor — the LIKE was dropped.

### Pitfall 3: ROW_NUMBER vs DISTINCT ON
**What goes wrong:** Postgres has TWO idiomatic top-1-per-group patterns: `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) = 1` and `DISTINCT ON (property_id) ... ORDER BY property_id, occurred_at DESC`. The latter is faster on large datasets but cannot be combined with `COUNT(*) OVER (PARTITION BY ...)` in the same SELECT.
**Why it happens:** Mixing window functions with DISTINCT ON makes the planner unhappy.
**How to avoid:** Use `ROW_NUMBER()` so the SAME CTE row exposes BOTH `rn` and `total_count` window aggregates. Filter `WHERE rn = 1` in the outer SELECT. This is the simplest correct shape.
**Warning sign:** "DISTINCT ON works only with..." planner errors when adding count column.

### Pitfall 4: Cards with zero activity disappearing
**What goes wrong:** A property with no activity in any source has zero rows in the UNION. If the outer query is `SELECT ... FROM activity_cte WHERE rn = 1`, that property simply isn't returned. The dashboard JS map lookup then returns `undefined` and the card shows "No activity yet".
**Why it happens:** Empty result sets don't carry the property ID forward.
**How to avoid:** Either (a) start the outer SELECT from `properties LEFT JOIN activity_cte ON ...` to guarantee one row per requested property, or (b) handle the missing-property case in JS by defaulting to `{ lastActivity: null, activityCount: 0 }`. Option (b) is simpler and matches existing card behavior (`No activity yet` is a valid display state at `activity-card-indicator.tsx:50`).
**Recommended:** Option (b) — JS-side default in the Map lookup. Avoids the extra JOIN to `properties` in SQL.

### Pitfall 5: prefer-const ESLint promotion to error
**What goes wrong:** This project promotes `prefer-const` and `no-explicit-any` to ERROR (per `feedback_lint_before_commit.md`). Commit `07c407b` shows that exact issue caused a fix in the same `activity-queries.ts` file.
**Why it happens:** A `let entries = ...` followed by no reassignment trips the rule.
**How to avoid:** Use `const entries: ActivityCardData[] = (rows.rows ?? []).map(...)` — single declaration, single use. Avoid `let` and `as any` entirely. If the row type needs widening, add a typed interface to the file.
**Warning sign:** Netlify build fails at lint step with `'foo' is never reassigned. Use 'const' instead.`

### Pitfall 6: Missing index on `audit_log(entity_id)` for our IN clause
**What goes wrong:** Existing index is `idx_audit_log_entity` on `(entity_type, entity_id)` (verified at `schema.ts:1255`). The CTE filter must include `entity_type IN ('lead', 'deal')` to use the composite index.
**Why it happens:** Postgres won't use a composite index if the leading column isn't filtered.
**How to avoid:** Always include `audit_log.entity_type IN ('lead', 'deal')` in the WHERE clause for the audit leg.
**Warning sign:** EXPLAIN shows Seq Scan on audit_log.

### Pitfall 7: Drizzle types break when adding a new exported function
**What goes wrong:** Adding `getDashboardActivityCards()` requires also exporting a row type. If the file's other exports get a new dependency on the row type, downstream `tsc --noEmit` may break in unpredictable files.
**Why it happens:** Cross-file type leakage.
**How to avoid:** Define `ActivityCardData` as an interface local to `activity-queries.ts` and export it only if needed by the dashboard page. The dashboard page already does narrowing via `lastActivity?: ActivityEntry | null` — if the shape is a strict subset, you can keep the existing `PropertyWithLead.lastActivity?: ActivityEntry | null` typing by widening the new shape with `description`, `type`, `occurredAt`, `source` and stub fields (`id: ''`, `actorUserId: null`, `actorName: null`, `body: null`) that the card never reads. This avoids changes to `types/index.ts`.

### Pitfall 8: The 2026-05-02 connection storm root cause
**What was triggered:** Dashboard-load N+1 (~450 round-trips) combined with Next.js 15 RSC parallel rendering. Each reload fanned out, opened ~50 concurrent connections from the pool, and before the prior page's connections were released, the pool either (a) blocked new acquisitions and stalled RSC streaming or (b) (after e092480) opened up to 20 concurrent server-side connections, multiplied by however many concurrent dashboards were rendering, exceeding Azure Postgres B1ms's `max_connections` ceiling. Symptoms: "RSC stream cutoff on dashboard" (commit message) and full site outage of `finder.no-bshomes.com` and `no-bshomes.com`.
**Why it happens:** Small B1ms instance has limited connection slots (typically 50-100). N+1 × pool max × concurrent users hits the ceiling fast.
**How to avoid:** Eliminate the N+1 (this phase). Pool size becomes a non-issue once each dashboard render is one query. Verification: post-refactor, repeat 5 back-to-back dashboard reloads, observe `pg_stat_activity` shows ≤ 3 active connections from this app.
**Warning sign for regression:** "FATAL: too many connections for role" or "remaining connection slots are reserved" in Postgres logs; 5xx errors with empty body on `/`.

## Code Examples

### Recommended SQL shape for `getDashboardActivityCards()`

**Source:** Adapted from the established pattern in `app/src/lib/analytics-queries.ts:359-404` (verified in-repo precedent), combined with the 7-source UNION extracted from `getActivityFeed()` in `app/src/lib/activity-queries.ts:92-403`.

```typescript
// app/src/lib/activity-queries.ts (NEW EXPORT — additive, do not modify existing functions)

import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export interface ActivityCardData {
  /** Most-recent activity entry, or null if no activity exists */
  lastActivity: {
    type: string;
    description: string;
    occurredAt: Date;
    source: ActivitySource;
  } | null;
  /** Total count of activity entries across all 7 sources for this property */
  activityCount: number;
}

/**
 * Phase 33: Batched activity-card data for the dashboard.
 *
 * Replaces the N+1 fan-out of getActivityFeed(propertyId) per card.
 * Returns ONE row per propertyId (or null entry if no activity).
 *
 * SINGLE QUERY GUARANTEE: Issues exactly one db.execute() round-trip
 * regardless of input size. Verified by toggling drizzle logger.
 *
 * Shape note: This intentionally does NOT use the rich ActivityEntry
 * shape from getActivityFeed(). The card consumer
 * (components/activity-card-indicator.tsx) only reads type, description,
 * occurredAt, source — so we keep the SQL light.
 */
export async function getDashboardActivityCards(
  propertyIds: string[]
): Promise<Map<string, ActivityCardData>> {
  if (propertyIds.length === 0) return new Map();

  const idList = sql.join(
    propertyIds.map((id) => sql`${id}::uuid`),
    sql`, `
  );

  const rows = await db.execute<{
    property_id: string;
    source: ActivitySource;
    type: string;
    description: string;
    occurred_at: Date;
    rn: number;
    total_count: number;
  }>(sql`
    WITH activity_union AS (
      -- 1. contact_events (joined to leads.property_id, with users.name)
      SELECT
        l.property_id::text AS property_id,
        'contact_event'::text AS source,
        CASE ce.event_type
          WHEN 'called_client' THEN 'call'
          WHEN 'left_voicemail' THEN 'voicemail'
          WHEN 'emailed_client' THEN 'email'
          WHEN 'sent_text' THEN 'text'
          WHEN 'met_in_person' THEN 'meeting'
          WHEN 'received_email' THEN 'email_received'
          ELSE ce.event_type::text
        END AS type,
        TRIM(
          COALESCE(u.name || ' — ', '') ||
          CASE ce.event_type
            WHEN 'called_client' THEN 'called owner'
            WHEN 'left_voicemail' THEN 'left voicemail'
            WHEN 'emailed_client' THEN 'emailed owner'
            WHEN 'sent_text' THEN 'sent text'
            WHEN 'met_in_person' THEN 'met in person'
            WHEN 'received_email' THEN 'received email from owner'
            ELSE ce.event_type::text
          END ||
          COALESCE(' (' || REPLACE(ce.outcome, '_', ' ') || ')', '')
        ) AS description,
        ce.occurred_at AS occurred_at
      FROM contact_events ce
      JOIN leads l ON l.id = ce.lead_id
      LEFT JOIN users u ON u.id = ce.actor_user_id
      WHERE l.property_id IN (${idList})

      UNION ALL

      -- 2. lead_notes
      SELECT
        l.property_id::text,
        'lead_note'::text,
        CASE WHEN ln.note_type = 'status_change' THEN 'status_changed' ELSE 'note' END,
        CASE WHEN ln.note_type = 'status_change'
             THEN 'Lead status changed to ' || COALESCE(ln.new_status, 'unknown')
             ELSE 'Note added'
        END,
        ln.created_at
      FROM lead_notes ln
      JOIN leads l ON l.id = ln.lead_id
      WHERE l.property_id IN (${idList})

      UNION ALL

      -- 3. deal_notes (multiple deals per property possible)
      SELECT
        d.property_id::text,
        'deal_note'::text,
        CASE WHEN dn.note_type = 'status_change' THEN 'status_changed' ELSE 'note' END,
        CASE WHEN dn.note_type = 'status_change'
             THEN 'Deal status changed to ' || COALESCE(dn.new_status, 'unknown')
             ELSE 'Deal note added'
        END,
        dn.created_at
      FROM deal_notes dn
      JOIN deals d ON d.id = dn.deal_id
      WHERE d.property_id IN (${idList})

      UNION ALL

      -- 4. audit_log — material actions only, scoped via lead OR deal entity
      SELECT
        l.property_id::text,
        'audit'::text,
        al.action,
        TRIM(COALESCE(u.name || ' — ', '') || REPLACE(REPLACE(al.action, '.', ' '), '_', ' ')),
        al.created_at
      FROM audit_log al
      JOIN leads l ON l.id = al.entity_id
      LEFT JOIN users u ON u.id = al.actor_user_id
      WHERE al.entity_type = 'lead'
        AND al.action IN (
          'deal.terms_updated', 'lead.status_changed', 'deal.assignee_changed',
          'deal.status_changed', 'property.address_edited', 'lead.assignee_changed'
        )
        AND l.property_id IN (${idList})

      UNION ALL

      SELECT
        d.property_id::text,
        'audit'::text,
        al.action,
        TRIM(COALESCE(u.name || ' — ', '') || REPLACE(REPLACE(al.action, '.', ' '), '_', ' ')),
        al.created_at
      FROM audit_log al
      JOIN deals d ON d.id = al.entity_id
      LEFT JOIN users u ON u.id = al.actor_user_id
      WHERE al.entity_type = 'deal'
        AND al.action IN (
          'deal.terms_updated', 'lead.status_changed', 'deal.assignee_changed',
          'deal.status_changed', 'property.address_edited', 'lead.assignee_changed'
        )
        AND d.property_id IN (${idList})

      UNION ALL

      -- 5. property_photos (no day-grouping at card scope — show most-recent individual upload)
      SELECT
        pp.property_id::text,
        'photo_upload'::text,
        'photo_added'::text,
        'Photo uploaded'::text,
        pp.created_at
      FROM property_photos pp
      WHERE pp.property_id IN (${idList})

      UNION ALL

      -- 6. contracts via deals
      SELECT
        d.property_id::text,
        'contract_generated'::text,
        'contract_generated'::text,
        CASE c.contract_type
          WHEN 'purchase_agreement' THEN 'Purchase agreement generated'
          ELSE 'Assignment contract generated'
        END,
        c.created_at
      FROM contracts c
      JOIN deals d ON d.id = c.deal_id
      WHERE d.property_id IN (${idList})

      UNION ALL

      -- 7. owner_contacts skip-trace runs (filter to tracerfy% only)
      SELECT
        oc.property_id::text,
        'skip_trace'::text,
        'skip_trace'::text,
        'Skip-traced'::text,
        oc.created_at
      FROM owner_contacts oc
      WHERE oc.source LIKE 'tracerfy%'
        AND oc.property_id IN (${idList})
    ),
    ranked AS (
      SELECT
        property_id,
        source,
        type,
        description,
        occurred_at,
        ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY occurred_at DESC) AS rn,
        COUNT(*) OVER (PARTITION BY property_id)::int AS total_count
      FROM activity_union
    )
    SELECT property_id, source, type, description, occurred_at, rn, total_count
    FROM ranked
    WHERE rn = 1
  `);

  const map = new Map<string, ActivityCardData>();
  for (const r of rows.rows ?? []) {
    map.set(r.property_id, {
      lastActivity: {
        type: r.type,
        description: r.description,
        occurredAt: new Date(r.occurred_at),
        source: r.source,
      },
      activityCount: r.total_count,
    });
  }
  return map;
}
```

### Recommended dashboard page rewire

**Source:** Replaces `app/src/app/(dashboard)/page.tsx:79-96`.

```typescript
// BEFORE (lines 79-96 of page.tsx):
const activityDataList = await Promise.all(
  properties.map(async (p) => {
    try {
      const feed = await getActivityFeed(p.id);
      return { propertyId: p.id, lastActivity: feed[0] ?? null, activityCount: feed.length };
    } catch {
      return { propertyId: p.id, lastActivity: null, activityCount: 0 };
    }
  })
);
const activityByPropertyId = new Map(activityDataList.map((a) => [a.propertyId, a]));
const propertiesWithActivity = properties.map((p) => {
  const a = activityByPropertyId.get(p.id);
  return { ...p, lastActivity: a?.lastActivity ?? null, activityCount: a?.activityCount ?? 0 };
});

// AFTER:
const activityByPropertyId = await getDashboardActivityCards(
  properties.map((p) => p.id)
).catch(() => new Map<string, ActivityCardData>());

const propertiesWithActivity = properties.map((p) => {
  const a = activityByPropertyId.get(p.id);
  return {
    ...p,
    lastActivity: a?.lastActivity ?? null,
    activityCount: a?.activityCount ?? 0,
  };
});
```

Note the import change at the top of the file:
```typescript
// Replace: import { getActivityFeed } from "@/lib/activity-queries";
// With:
import { getDashboardActivityCards, type ActivityCardData } from "@/lib/activity-queries";
```

### Recommended pool revert

**Source:** Reverts `app/src/db/client.ts` to pre-e092480 state.

```typescript
// app/src/db/client.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 3,                        // ← was 20 (e092480 hotfix); revert
  idleTimeoutMillis: 10000,      // ← was 300000 (e092480 hotfix); revert
  connectionTimeoutMillis: 10000, // unchanged
});

export const db = drizzle({ client: pool, schema });
```

### lastActivity type compatibility shim (optional)

The existing `PropertyWithLead.lastActivity` is typed as `ActivityEntry | null` (full shape with `id`, `actorUserId`, `actorName`, `body`, `metadata`). If we want to avoid touching `types/index.ts`, the `getDashboardActivityCards()` return shape can be widened with default-stubbed fields:

```typescript
// In activity-queries.ts, when constructing the Map:
map.set(r.property_id, {
  lastActivity: {
    id: '',                                    // unused by card
    source: r.source,
    type: r.type,
    occurredAt: new Date(r.occurred_at),
    actorUserId: null,                         // unused by card
    actorName: null,                           // unused by card
    description: r.description,
    body: null,                                // unused by card
  } satisfies ActivityEntry,
  activityCount: r.total_count,
});
```

This keeps `PropertyWithLead.lastActivity?: ActivityEntry | null` unchanged. Recommended approach — minimizes blast radius, matches the rule "don't touch types/index.ts unless necessary" (Phase 32 outage lesson).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N+1 per-card `Promise.all(properties.map(p => getActivityFeed(p.id)))` | Single batched CTE+UNION+ROW_NUMBER query via `db.execute(sql\`...\`)` | This phase | Reduces ~450 round-trips to 1; eliminates the connection-storm failure mode |
| `pool: { max: 20, idleTimeoutMillis: 300000 }` (e092480 hotfix) | `pool: { max: 3, idleTimeoutMillis: 10000 }` | This phase | Returns to safe serverless defaults — only safe AFTER N+1 is gone |
| Orphaned `seed-config.ts` working-tree edit | Committed alongside Phase 33 changes | This phase | Avoids the post-Phase-32 hygiene issue (orphaned types/index.ts edit broke production) |

**Deprecated/outdated:**
- The TODO comment at `page.tsx:81` ("switch to LATERAL join if dashboard load slows with 100+ cards") is the proximate cause of the deferral — Phase 33 finally executes it. Update or remove the comment.
- The Phase 31 STATE entry "LATERAL join deferred unless perf degrades" is now historically accurate but no longer reflects current state — STATE.md will need a new Phase 33 entry.

## Open Questions

1. **Should we add an integration test that asserts "exactly one query" for the dashboard route?**
   - What we know: This project does NOT have a Jest/Vitest test harness in `app/`. Verification has historically been manual + tsc/lint gates.
   - What's unclear: Whether to introduce a test-runner just for this assertion is out of scope.
   - Recommendation: For Phase 33, verify the single-query property manually via Drizzle logger toggle in dev (`drizzle({ ..., logger: true })`) and capture a screenshot of the log output as the SC #1 evidence. Don't introduce a test framework just for this check.

2. **Does the Resend website-leads query (`getWebsiteLeads`) inside the dashboard's existing `Promise.all` (page.tsx:70-77) also contribute to connection pressure?**
   - What we know: That `Promise.all` runs 6 queries (stats, properties, cities, sequences, websiteLeads, overdueBuyers). All are single-table single-shot queries — fixed cost per request.
   - What's unclear: Their absolute cost is small (~6 round-trips). The N+1 (~450) dwarfs them.
   - Recommendation: Out of scope. The 6-query header is already efficient. Phase 33 only needs to fix the per-card fan-out.

3. **What threshold of properties should trigger an empty-array short-circuit?**
   - What we know: With `properties.length === 0` (no leads), the SQL `IN ()` clause is a syntax error.
   - What's unclear: Nothing — implementation must guard.
   - Recommendation: First line of `getDashboardActivityCards()` is `if (propertyIds.length === 0) return new Map();` — already in the recommended code shape above.

## Sources

### Primary (HIGH confidence)
- `app/src/lib/activity-queries.ts` (in-repo) — full text of existing `getActivityFeed`, `getActivityFeedForLead`, `MATERIAL_AUDIT_ACTIONS`, EVENT_TYPE maps. The 7-source UNION shape and JS post-processing logic. Verified by direct file read.
- `app/src/app/(dashboard)/page.tsx:79-96` (in-repo) — the exact N+1 fan-out being replaced. Verified.
- `app/src/db/client.ts` (in-repo) — current pool config `max:20, idleTimeoutMillis:300000, connectionTimeoutMillis:10000`. Verified by direct file read.
- `app/src/db/seed-config.ts` (in-repo) — current working-tree state. Verified plus `git diff` showing the orphaned 17-line addition.
- `app/src/db/schema.ts` (in-repo) — table definitions for contact_events, lead_notes, deal_notes, audit_log, property_photos, contracts, owner_contacts, leads, deals, users. Verified all relevant indexes exist (`idx_contact_events_lead_id`, `idx_lead_notes_lead_id`, `idx_deal_notes_deal_id`, `idx_property_photos_property_id`, `idx_audit_log_entity` composite).
- `app/src/lib/analytics-queries.ts:359-404` (in-repo) — the EXACT precedent for `db.execute<T>(sql\`UNION ALL\`)` pattern this phase uses. Verified.
- `app/src/lib/queries.ts:528` (in-repo) — the `sql.join(items.map(c => sql\`${c}\`), sql\`, \`)` precedent for IN-clause array binding. Verified.
- `app/src/components/activity-card-indicator.tsx:46-87` (in-repo) — confirms card consumer reads only `type`, `description`, `occurredAt`, `source` plus `totalCount`. Verified.
- Git log — commits e092480 (pool bump), 07c407b (prefer-const fix in activity-queries.ts), Phase 31 completion sequence (7c2bfa0 through 4ea6801).

### Secondary (MEDIUM confidence — verified against multiple sources)
- [Drizzle ORM — Magic sql\`\` operator](https://orm.drizzle.team/docs/sql) — confirms `${value}` → `$1` placeholder binding and that `db.execute<T>(sql\`...\`)` accepts a result row type parameter. Cross-verified by in-repo usage in 13 lib files.
- [Drizzle ORM — Joins](https://orm.drizzle.team/docs/joins) — confirms `leftJoinLateral()` exists for LATERAL joins, but recommended approach uses raw SQL given the UNION inside.
- [PostgreSQL: Documentation: 18: Table Expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html) — official docs for LATERAL semantics and CTE rules.

### Tertiary (LOW confidence — single-source ecosystem signals)
- [Selecting Top N Per Group in PostgreSQL — Atomic Spin](https://spin.atomicobject.com/select-top-n-per-group-postgresql/) — community guidance on ROW_NUMBER vs DISTINCT ON tradeoffs.
- [How to Use LATERAL JOIN vs Subquery in PostgreSQL — OneUptime, Jan 2026](https://oneuptime.com/blog/post/2026-01-25-postgresql-lateral-join-vs-subquery/view) — recent comparison; informs the "we picked CTE+window over LATERAL" call.
- [Connection Pooling with Vercel Functions — Vercel KB](https://vercel.com/kb/guide/connection-pooling-with-functions) — serverless pool sizing guidance. Note: applies to Vercel; this project deploys on Netlify with Azure Postgres (different infrastructure), but the principle (small max, short idleTimeout) holds.
- [node-postgres pool sizing](https://node-postgres.com/guides/pool-sizing) — official driver guidance: default max:10, but "for serverless reduce to 1-3".

## Validation Architecture

> Skipped — `.planning/config.json` does not have `workflow.nyquist_validation = true`. Existing project workflow uses tsc + next lint as the gates plus manual verification, per `feedback_lint_before_commit.md`.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in repo, all patterns have in-repo precedent at specific verified line numbers
- Architecture (CTE + UNION + window function shape): HIGH — pattern is canonical Postgres, established project precedent for `db.execute<T>(sql\`...\`)`, all seven source-table column names + indexes verified against schema.ts
- Pitfalls: HIGH — pitfalls 1, 2, 4, 6, 7 are derived from direct reading of the existing implementations; pitfall 5 (prefer-const) verified via git commit 07c407b in same file; pitfall 8 (outage root cause) corroborated by commit messages e092480 + memory note + STATE.md
- Pool tuning: HIGH for "revert to max:3, idleTimeoutMillis:10000" specifically (phase explicitly requires it); MEDIUM for general "is max:3 the right ceiling" — depends on Azure B1ms `max_connections`, which we did not introspect live, but the phase-spec value is the explicit requirement

**Research date:** 2026-05-03
**Valid until:** 2026-06-03 (30 days — Drizzle/pg APIs stable; only invalidated if upstream Drizzle changes `db.execute()` shape, unlikely)
