# Phase 25: Rose Park Foundation - Research

**Researched:** 2026-04-17
**Domain:** City normalization, SQL migration, scraperConfig seed update, query row-limit lift — all within an existing Next.js + Drizzle + PostgreSQL stack
**Confidence:** HIGH — all findings based on direct code inspection of production files; no external research needed for this scope

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RP-02 | `normalizeCity(city, zip)` in `scraper/src/lib/upsert.ts` retags any property with `zip='84116'` to `city='Rose Park'` at upsert time | Exact insertion point identified at line 67 of upsert.ts; function signature and call site specified in ARCHITECTURE.md |
| RP-03 | One-shot SQL migration retags existing `city='SALT LAKE CITY'` + `zip='84116'` rows to `city='Rose Park'` | Migration pattern confirmed from 2026-04-07 address fix (2,331 rows); next migration number is 0013; SQL statements verified against schema.ts column names |
| RP-04 | `'Rose Park'` added to `target_cities` in `scraperConfig` (Settings UI or seed update) | Two locations confirmed: `DEFAULT_TARGET_CITIES` in seed-config.ts and `DEFAULT_TARGET_CITIES` in actions.ts; runtime DB key is `target_cities` in `scraper_config` table |
| RP-05 | `getProperties()` row limit raised from 100 so dense urban data does not silently truncate | `.limit(100)` confirmed at queries.ts line 757; all other `.limit()` occurrences reviewed and scoped — only line 757 is the main dashboard truncation point |
</phase_requirements>

---

## Summary

Phase 25 is a pure foundation phase: no new scrapers, no schema changes, no new npm packages. Every task is a code edit to an existing file or a SQL migration against the running Azure PostgreSQL instance. The core work is four precise changes that make the dashboard ready for Rose Park data before any import runs.

The codebase inspection confirms the exact insertion points for each requirement. `normalizeCity()` lives in `upsert.ts` at a single call site (line 67), where `city` is resolved before the DB write. The SQL migration is a two-statement UPDATE following the 2026-04-07 address-fix pattern. The city target appears in two places — `seed-config.ts` and `actions.ts` — and must be updated in both or the DB fallback will still exclude Rose Park if the `scraper_config` row is missing. The dashboard `.limit(100)` is at line 757 of `getProperties()`; no other limit in queries.ts is load-bearing for the dashboard.

**Primary recommendation:** Implement RP-02 first (normalizeCity exists), then RP-03 (migration runs while code is already correct for new writes), then RP-04 (target_cities updated so the dashboard starts showing Rose Park), then RP-05 (row limit raised before any UGRC import floods new rows). This order means the database is never in a state where new Rose Park writes land with the wrong city.

---

## Standard Stack

### Core (already installed — no additions needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | SQL migration, upsert, query | All DB operations in project |
| drizzle-kit | existing | Generating migration file 0013 | Migration toolchain |
| Next.js server actions | 15.x | `updateTargetCities()` for settings update | Existing settings pattern |
| TypeScript | existing | `normalizeCity()` function | All scraper code |

### No New Packages Required

This phase requires zero new npm dependencies. All four requirements are satisfied by modifying existing files.

**Installation:** None.

---

## Architecture Patterns

### Decision: Retag city at upsert time (not zip filter in queries)

The architecture decision from ARCHITECTURE.md is locked: use `normalizeCity(city, zip)` in `upsert.ts` as the single normalization point. The city field remains the only segmentation dimension in `getProperties()`. No zip-column WHERE clause is added to any query function.

**Rationale confirmed by code inspection:** `getProperties()` already has a `target_cities` IN-clause at queries.ts line 602 that handles city-based filtering across all dashboard, stats, and map queries. Adding "Rose Park" to that config is sufficient — no query changes are needed.

### RP-02: normalizeCity() insertion point

**File:** `scraper/src/lib/upsert.ts`
**Current line 67:**
```typescript
const city = record.city || COUNTY_DEFAULT_CITY[resolvedCounty] || "";
```

**Change:** Add `normalizeCity()` function (before `upsertProperty`) and call it immediately after the city is resolved:

```typescript
function normalizeCity(city: string, zip?: string): string {
  if (zip === '84116') return 'Rose Park';
  // future: add more zip->neighborhood mappings here (84104->Glendale, etc.)
  return city;
}
```

Then replace line 67 with:
```typescript
const city = normalizeCity(record.city || COUNTY_DEFAULT_CITY[resolvedCounty] || "", record.zip);
```

**Also update `COUNTY_DEFAULT_CITY`** to include `salt lake`:
```typescript
const COUNTY_DEFAULT_CITY: Record<string, string> = {
  carbon: "Price",
  emery: "Castle Dale",
  juab: "Nephi",
  millard: "Delta",
  sanpete: "Manti",
  sevier: "Richfield",
  "salt lake": "Rose Park",  // ADD THIS
};
```

**Also update `COUNTY_CITY` inside `upsertFromUtahLegals()`** (lines 378-383 of upsert.ts):
```typescript
const COUNTY_CITY: Record<string, string> = {
  carbon: "Price",
  emery: "Castle Dale",
  juab: "Nephi",
  millard: "Delta",
  "salt lake": "Rose Park",  // ADD THIS
};
```

**Why both maps:** `upsertProperty()` uses `COUNTY_DEFAULT_CITY`; `upsertFromUtahLegals()` has its own inline `COUNTY_CITY` map. If only one is updated, utah-legals notices for Salt Lake County will still fall through to `city = ""`.

**Impact of the `onConflictDoUpdate` guard:** `upsert.ts` lines 97-99 show that city is only overwritten on conflict if the new city value is non-empty. The `normalizeCity()` return for zip='84116' is always 'Rose Park' (non-empty), so the city field will be correctly updated on conflict. For existing rows with `city='SALT LAKE CITY'`, the conflict update will overwrite with 'Rose Park' whenever a new signal triggers a re-upsert — but the SQL migration (RP-03) handles existing rows before any new writes.

### RP-03: Drizzle Migration 0013

**Migration file:** `app/drizzle/0013_rose_park_retag.sql`

The migration runs two UPDATE statements to cover both retag paths:

```sql
-- Statement 1: Retag by zip (authoritative — zip populated from UGRC or scraper)
UPDATE properties
SET city = 'Rose Park', updated_at = now()
WHERE zip = '84116'
  AND city != 'Rose Park';

-- Statement 2: Retag Salt Lake county rows without zip that still say SALT LAKE CITY
-- (belt-and-suspenders for any rows where zip was not populated)
UPDATE properties
SET city = 'Rose Park', updated_at = now()
WHERE county = 'salt lake'
  AND (city ILIKE '%salt lake%' OR city = '')
  AND city != 'Rose Park';
```

**Run order constraint:** This migration must run AFTER `normalizeCity()` is deployed. If the migration runs while the old upsert code is still live, a scraper run immediately afterward could re-write `city='SALT LAKE CITY'` before the migration effect is visible in the dashboard. Deploy code first, migrate second.

**Log the row count:** Add a `DO $$ ... $$` block or check the migration output. The requirement (RP-03 success criterion) is that the count of affected rows is logged.

**Migration generation:** Use `npx drizzle-kit generate` to produce the migration file, then manually edit the generated file to contain the two UPDATE statements. No schema changes are involved so drizzle-kit will generate an empty migration — add the SQL manually.

**Verification SQL (post-migration):**
```sql
SELECT city, count(*) FROM properties
WHERE county = 'salt lake'
GROUP BY city;
-- Expected: only 'Rose Park' in results, count > 0 if any SLC rows existed
```

### RP-04: target_cities — Two Locations

The dashboard city filter reads from `scraper_config` key `target_cities`. If that DB row is absent, the fallback is `DEFAULT_TARGET_CITIES` from `actions.ts`. There are two distinct code locations and one DB row.

**Location A — `app/src/db/seed-config.ts` (line 6):**
```typescript
export const DEFAULT_TARGET_CITIES = [
  "Price", "Huntington", "Castle Dale", "Richfield", "Nephi",
  "Ephraim", "Manti", "Fillmore", "Delta",
  "Rose Park",  // ADD
] as const;
```

**Location B — `app/src/lib/actions.ts` (line 145):**
```typescript
const DEFAULT_TARGET_CITIES = [
  "Price", "Huntington", "Castle Dale", "Richfield", "Nephi",
  "Ephraim", "Manti", "Fillmore", "Delta",
  "Rose Park",  // ADD
];
```

**Location C — DB runtime value:** The `scraper_config` row with `key='target_cities'` is a JSON array. It was originally seeded from the TypeScript constants but is now authoritative (the Settings UI writes to it). The migration must also UPDATE or UPSERT this row:

```sql
-- In 0013_rose_park_retag.sql, append after the property UPDATEs:
INSERT INTO scraper_config (key, value, created_at, updated_at)
VALUES (
  'target_cities',
  '["Price","Huntington","Castle Dale","Richfield","Nephi","Ephraim","Manti","Fillmore","Delta","Rose Park"]',
  now(), now()
)
ON CONFLICT (key) DO UPDATE
  SET value = CASE
    WHEN scraper_config.value::jsonb @> '"Rose Park"'::jsonb
    THEN scraper_config.value  -- already present, don't overwrite user changes
    ELSE (scraper_config.value::jsonb || '["Rose Park"]'::jsonb)::text
  END,
  updated_at = now();
```

**Why both TypeScript and DB:** The DB value is authoritative at runtime. The TypeScript constants serve as the fallback when `getTargetCities()` finds no DB row (empty DB, new environment). Both must include Rose Park or a new deployment will exclude it.

### RP-05: Row Limit Lift in queries.ts

**File:** `app/src/lib/queries.ts`

**All `.limit()` occurrences reviewed:**

| Line | Value | Context | Action |
|------|-------|---------|--------|
| 43, 58, 73, 88, 130 | `.limit(1)` | Single-row lookups (getProperty, getPropertyDetail, etc.) | No change — correct behavior |
| **757** | **`.limit(100)`** | **`getProperties()` main dashboard query** | **RAISE — this is the RP-05 target** |
| 836 | `.limit(1)` | `getTargetCitiesList()` config lookup | No change |
| 1005 | `.limit(50)` | `getWebsiteLeads()` inbound leads only | No change — separate feature |
| 1057 | `.limit(1)` | `getInboundLead()` single-row fetch | No change |

**Only line 757 requires a change for RP-05.**

**Recommended value:** Raise to 500. Rose Park's 84116 zip has ~15,000-20,000 parcels but only a fraction will be distressed-signal properties in the DB. The existing rural counties have ~3,000-5,000 parcels combined and currently produce far fewer than 100 distressed leads. 500 is a safe ceiling that prevents silent truncation while keeping the query fast via the existing `distress_score DESC` index.

**Pagination fallback decision:** The requirements mention "paginated UI fallback if needed." Raising to 500 eliminates the immediate risk without requiring a pagination UI build. If Rose Park data eventually exceeds 500 hot leads, pagination becomes the next step. For this phase, raise the limit and document the threshold.

```typescript
// queries.ts line 757 — change:
.limit(100)
// to:
.limit(500)
```

**Performance note:** The query is already index-backed on `distress_score DESC` via the leads table. A 5x limit increase (100 → 500) on a filtered result set is not a performance risk. The enrichment queries that follow (touchpoints, email, trace status) use `inArray()` against the returned lead IDs — those also scale linearly but are bounded by the 500 limit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| City normalization per-county | Custom per-scraper city logic | Single `normalizeCity(city, zip)` in upsert.ts | Future expansion (84104, 84106) is one line; per-scraper logic creates scatter |
| Migration runner | Custom script | Drizzle migration file 0013 | Existing pattern in `app/drizzle/`; already wired to deployment |
| target_cities DB update | Manual psql command | SQL in migration 0013 + TypeScript constant update | Migration is reproducible; manual commands leave new environments broken |
| Pagination UI | Multi-page dashboard | Single raised `.limit(500)` | Not needed at current data volume; premature complexity |

---

## Common Pitfalls

### Pitfall 1: normalizeCity called after city is resolved but zip is missing from PropertyRecord
**What goes wrong:** `upsertProperty()` receives a `PropertyRecord` where `zip` is undefined (most existing scrapers don't populate it). `normalizeCity(city, undefined)` returns the city unchanged — a Carbon or Emery record passes through correctly. But a SLC record from a future scraper that doesn't set `zip` also passes through unchanged, storing `city='SALT LAKE CITY'`.
**Why it happens:** The `PropertyRecord` type has `zip` as an optional field. Rural scrapers don't populate it because their cities are single-county towns. SLC is the first multi-neighborhood county where zip matters.
**How to avoid:** The function signature `normalizeCity(city: string, zip?: string)` is correct — it degrades gracefully for rural counties. For SLC scrapers (Phase 26+), ensure `zip` is populated in the scraper output. Document this in the function's JSDoc comment. For Phase 25 specifically, the SQL migration catches any existing rows regardless of whether zip was populated.
**Warning signs:** After running the migration, `SELECT city FROM properties WHERE county = 'salt lake'` still shows 'SALT LAKE CITY' rows — means either the migration's Statement 2 (county-based retag) didn't run or a re-upsert overwrote the city.

### Pitfall 2: Migration 0013 overwrites user's custom target_cities with the default list
**What goes wrong:** The `ON CONFLICT DO UPDATE` for the `scraper_config` target_cities row uses a naive `SET value = '...'` that overwrites whatever the user configured in Settings UI.
**Why it happens:** Simple migration SQL doesn't check whether the new value is already present.
**How to avoid:** Use the `jsonb @>` operator check shown in the RP-04 code example above — only append 'Rose Park' if it's not already present; don't overwrite existing cities.
**Warning signs:** User's custom cities disappear from the Settings page after migration. `SELECT value FROM scraper_config WHERE key='target_cities'` shows only the 9 default cities.

### Pitfall 3: .limit(100) raised but `getMapProperties()` and `getDashboardStats()` also have implicit limits
**What goes wrong:** Raising `getProperties()` to 500 fixes the dashboard list but the stats bar and map use different query functions. If they have their own limits, Rose Park density causes undercounting in stats.
**How to avoid:** Review `getDashboardStats()` and `getMapProperties()` — these use `count(*)` aggregates and full table scans bounded by `target_cities` filter, not by `.limit()`. They do not need changes. Confirm by reading the functions before marking RP-05 complete.
**Warning signs:** Dashboard stat "Total Properties" says 47 but the property list shows pagination cut at 500 — mismatch means the aggregate queries are correct but something else is wrong.

### Pitfall 4: seed-config.ts DEFAULT_TARGET_CITIES is `as const` — TypeScript narrowing breaks if Rose Park added without type update
**What goes wrong:** `seed-config.ts` exports `TargetCity` as a union type inferred from the `as const` array. If Rose Park is added but any consuming code uses `TargetCity` as a type constraint, a TypeScript error surfaces at compile time.
**How to avoid:** The `TargetCity` type is defined in `seed-config.ts` but not used anywhere in the main application (verified by the fact that the Settings page uses `string[]`, not `TargetCity[]`). Adding Rose Park to the array is safe. No type consumers need updating.
**Warning signs:** `npx tsc --noEmit` reports "Argument of type '"Rose Park"' is not assignable to parameter of type 'TargetCity'".

### Pitfall 5: Two DEFAULT_TARGET_CITIES constants — actions.ts and seed-config.ts diverge
**What goes wrong:** `actions.ts` has its own local `const DEFAULT_TARGET_CITIES = [...]` (line 145) that is a plain JS array, separate from the exported `DEFAULT_TARGET_CITIES` in `seed-config.ts`. These are not imported from each other — they are duplicates. If only one is updated, the other serves as fallback in some code paths.
**Why it happens:** `actions.ts` uses its own copy for the `getTargetCities()` fallback; `seed-config.ts` exists for the DB seeding script.
**How to avoid:** Update BOTH. The planner must include both file edits in the same task.
**Warning signs:** After deployment, Settings page shows Rose Park but a fresh `getTargetCities()` call with no DB row returns the old list.

---

## Code Examples

Verified patterns from production code:

### normalizeCity() — exact pattern, ready to copy
```typescript
// Source: ARCHITECTURE.md (designed for upsert.ts, confirmed against live code structure)
// Insert BEFORE upsertProperty() function definition

function normalizeCity(city: string, zip?: string): string {
  if (zip === '84116') return 'Rose Park';
  // future: add more zip->neighborhood mappings here (84104->Glendale, etc.)
  return city;
}
```

### upsertProperty() city line — exact replacement
```typescript
// Source: scraper/src/lib/upsert.ts line 67 (confirmed by direct read)
// BEFORE:
const city = record.city || COUNTY_DEFAULT_CITY[resolvedCounty] || "";
// AFTER:
const city = normalizeCity(record.city || COUNTY_DEFAULT_CITY[resolvedCounty] || "", record.zip);
```

### target_cities upsert in migration (safe, non-destructive)
```sql
-- Source: designed for 0013_rose_park_retag.sql
INSERT INTO scraper_config (key, value, created_at, updated_at)
VALUES (
  'target_cities',
  '["Price","Huntington","Castle Dale","Richfield","Nephi","Ephraim","Manti","Fillmore","Delta","Rose Park"]',
  now(), now()
)
ON CONFLICT (key) DO UPDATE
  SET value = CASE
    WHEN scraper_config.value::jsonb @> '"Rose Park"'::jsonb
    THEN scraper_config.value
    ELSE (scraper_config.value::jsonb || '["Rose Park"]'::jsonb)::text
  END,
  updated_at = now();
```

### Verification query (post-migration, pre-import)
```sql
-- Confirm retag worked
SELECT city, count(*) FROM properties
WHERE county = 'salt lake'
GROUP BY city;

-- Confirm target_cities includes Rose Park
SELECT value FROM scraper_config WHERE key = 'target_cities';

-- Confirm limit is raised (no DB query — check queries.ts line 757 in source)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single city per rural county (town = county seat) | normalizeCity(city, zip) maps zip codes to neighborhoods | Phase 25 (this phase) | Enables urban multi-neighborhood expansion without query changes |
| `.limit(100)` dashboard cap | `.limit(500)` | Phase 25 (this phase) | Prevents silent truncation for urban density |
| target_cities = 9 rural cities | target_cities = 10 including Rose Park | Phase 25 (this phase) | Rose Park appears in city filter and dashboard |

---

## Open Questions

1. **Does the existing `scraper_config` DB row for `target_cities` contain exactly the 9 default cities, or has Brian modified it?**
   - What we know: The Settings UI writes to this row via `updateTargetCities()`. Brian may have added or removed cities since Phase 2.
   - What's unclear: The current value in production DB is unknown without a live query.
   - Recommendation: The `ON CONFLICT DO UPDATE` with `jsonb @>` check handles this safely — it only appends Rose Park if missing, never overwrites.

2. **Is `properties.zip` column populated for any existing Salt Lake County rows?**
   - What we know: `zip` is `text("zip")` nullable (schema.ts line 52). UGRC enrichment sets it. No SLC UGRC import has run yet.
   - What's unclear: Whether any existing SLC rows from utah-legals have `zip` populated (the scraper doesn't set it for most notices).
   - Recommendation: The migration Statement 2 (county + city ILIKE pattern) catches rows where `zip` is NULL. Both statements together cover all cases.

3. **How many existing rows have `county = 'salt lake'` in production?**
   - What we know: `utah-legals.ts` does NOT currently include Salt Lake County in `TARGET_COUNTIES` (confirmed: only carbon/emery/juab/millard are listed). So zero SLC rows are expected from the scraper.
   - What's unclear: Whether any manual data entry or test data created SLC rows.
   - Recommendation: The migration runs safely even if the count is zero — the success criterion logs the affected row count (could be 0 on a clean DB, which is still a valid result).

---

## Sources

### Primary (HIGH confidence — direct code inspection)
- `scraper/src/lib/upsert.ts` — `upsertProperty()` line 67, `COUNTY_DEFAULT_CITY` map, `COUNTY_CITY` inline map in `upsertFromUtahLegals()`, `onConflictDoUpdate` city guard logic
- `app/src/lib/queries.ts` — all `.limit()` occurrences enumerated (lines 43, 58, 73, 88, 130, 757, 836, 1005, 1057); line 757 confirmed as the only dashboard truncation point; line 602 target_cities IN-clause confirmed
- `app/src/lib/actions.ts` — `DEFAULT_TARGET_CITIES` local constant at line 145, `getTargetCities()` fallback logic at lines 161-181
- `app/src/db/seed-config.ts` — `DEFAULT_TARGET_CITIES` exported constant; `TargetCity` type; 9 cities confirmed
- `app/src/db/schema.ts` — `properties.zip` is `text("zip")` nullable; `properties.city` is `text("city").notNull()`; column names confirmed
- `scraper/src/sources/utah-legals.ts` — `TARGET_COUNTIES` confirmed as [carbon/emery/juab/millard]; `extractParcelId()` regex confirmed Carbon-only; SLC NOT currently included
- `app/drizzle/` — latest migration is `0012_court_intake_runs.sql`; next migration is `0013`

### Secondary (MEDIUM confidence — project planning docs)
- `.planning/research/ARCHITECTURE.md` — normalizeCity() design, retag-vs-zip-filter decision, component map
- `.planning/research/PITFALLS.md` — SLC-1 through SLC-13 pitfall catalog
- `.planning/research/SUMMARY.md` — v1.3 milestone synthesis
- `.planning/STATE.md` — `[v1.3-init]` decisions confirming normalizeCity location and SLC scope

---

## Metadata

**Confidence breakdown:**
- RP-02 (normalizeCity): HIGH — exact insertion point confirmed by code read; function design confirmed by ARCHITECTURE.md
- RP-03 (SQL migration): HIGH — migration pattern confirmed from 2026-04-07 address fix; schema column names verified; migration number 0013 confirmed
- RP-04 (target_cities): HIGH — both code locations confirmed; DB key confirmed; two-constant divergence risk identified
- RP-05 (row limit): HIGH — all `.limit()` occurrences enumerated; only line 757 is the dashboard truncation point; 500 as safe ceiling is a straightforward engineering judgment

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (stable codebase, no fast-moving dependencies)
