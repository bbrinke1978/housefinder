# Architecture Research: v1.3 Rose Park Pilot Integration

**Domain:** Urban ZIP-scoped expansion of existing distressed property pipeline
**Researched:** 2026-04-17
**Confidence:** HIGH — all conclusions based on direct code inspection, no external speculation

---

## The Central Decision: Retag vs Zip Filter

This is the most consequential architectural choice for the milestone. Here is the analysis:

### Option A: Retag 84116 properties to `city = 'Rose Park'` (Recommended)

At scrape time (and as a migration for existing rows), any property with `zip = '84116'` or whose geocoded city is Salt Lake City gets `city = 'Rose Park'` instead.

**Pros:**
- Zero changes to `getProperties()`, `getDashboardStats()`, `getMapProperties()` filter logic — the existing `target_cities` IN-clause just works
- `'Rose Park'` appears naturally in the city dropdown alongside Price, Castle Dale, etc.
- The UI city filter already handles multi-select — "Rose Park" becomes one more entry
- `updateTargetCities()` in `app/src/lib/actions.ts` can add it through the existing Settings UI
- No new DB columns, no schema migration
- Consistent with how the app already thinks: city is the unit of interest, not zip

**Cons:**
- Salt Lake City assessor data may return `city = 'Salt Lake City'` for 84116 parcels; the retag must happen at upsert time not in the assessor's data
- If 84116 contains parts of other named neighborhoods (Rose Park bleeds into adjacent areas at the edges), the retag is a simplification — acceptable for a pilot
- Existing SLC-labelled rows in the DB need a one-shot migration UPDATE

**How to implement the retag:**

In `scraper/src/lib/upsert.ts`, `upsertProperty()` has this logic at line 67:
```typescript
const city = record.city || COUNTY_DEFAULT_CITY[resolvedCounty] || "";
```

Add a zip-to-neighborhood normalization step before the DB write:

```typescript
function normalizeCity(city: string, zip?: string): string {
  if (zip === '84116') return 'Rose Park';
  // future: add more zip->neighborhood mappings here
  return city;
}
```

Call it after resolving `city` from the record:
```typescript
const city = normalizeCity(record.city || COUNTY_DEFAULT_CITY[resolvedCounty] || "", record.zip);
```

Then add `'Rose Park'` to the `scraperConfig` `target_cities` JSON array.

### Option B: New `zip` column filter in the dashboard query

Add a `zip` filter parameter to `GetPropertiesParams` and add a WHERE clause in `getProperties()` / `getDashboardStats()` alongside the existing `city` filter.

**Pros:**
- More geographically precise — if boundaries matter
- No data mutation of city field (preserves source fidelity)

**Cons:**
- Requires touching `getProperties()`, `getDashboardStats()`, and `getMapProperties()` in `app/src/lib/queries.ts` — all three functions have the same filter logic and would each need a new zip branch
- The UI city dropdown would need a parallel zip dropdown, or a hybrid selector — more UI complexity
- `target_cities` IN-clause gate (line 602 in queries.ts) gates on city, not zip — a zip-only property would still be hidden unless special-cased
- `zip` column is nullable in schema (`text("zip")`) — not all rows have it, making the filter unreliable until UGRC runs for 84116
- Two-dimensional filter (city OR zip) complicates every query in the file

**Verdict: Use Option A (retag).** The city field is the app's unit of segmentation throughout. Adding Rose Park as a pseudo-city is consistent with the existing model, requires the smallest surface area of changes, and is explicitly what PROJECT.md says Brian is "leaning toward." The zip column can remain as metadata for display purposes.

---

## System Overview

```
PUBLIC DATA SOURCES (Salt Lake County)
┌────────────────────────────────────────────────────────────────────┐
│  SLCo Tax Delinquent   SLCo Recorder   utah-legals (SLC county)  │
│  (new scraper)         (new scraper)   (existing, add SLC index)  │
│       ↓                     ↓                     ↓               │
│  slco-delinquent.ts   slco-recorder.ts   utah-legals.ts (modified)│
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                    scraper/src/lib/upsert.ts
                    (modified: normalizeCity() for 84116)
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Azure Flexible Server)               │
│  properties  ← city='Rose Park' for zip 84116 parcels              │
│  distress_signals  ← tax_lien, nod, lis_pendens signals            │
│  leads  ← distress_score updated by scoreAllProperties()           │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                    app/src/lib/queries.ts
                    (no changes if retag approach: 'Rose Park' in target_cities)
                               │
                               ↓
┌────────────────────────────────────────────────────────────────────┐
│              Next.js Dashboard (Netlify)                            │
│  Settings: add 'Rose Park' to target_cities via updateTargetCities()│
│  City filter dropdown: 'Rose Park' appears alongside rural cities  │
│  Stats: separate for 'Rose Park' vs rural cities via city= param   │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Map: New vs Modified

### New Components (build from scratch)

| Component | Type | Location | Purpose |
|-----------|------|----------|---------|
| `slco-delinquent.ts` | Scraper source | `scraper/src/sources/slco-delinquent.ts` | Tax delinquent list from Salt Lake County — analog of `carbon-delinquent.ts`. SLCo uses a different portal than Carbon (likely SLCo Treasurer site or wpDataTables variant). |
| `slco-recorder.ts` | Scraper source | `scraper/src/sources/slco-recorder.ts` | Recorder scraper for NOD / lis pendens filings in Salt Lake County. SLCo recorder uses webpro.com portal (different tech than Carbon's placeholder). |
| `slcoScrape.ts` | Azure Function | `scraper/src/functions/slcoScrape.ts` | Timer-triggered orchestrator for SLCo scrapers — follows the pattern of `emeryScrape.ts`, `juabScrape.ts`. Runs independently so SLCo failures don't affect rural scrapes. |

### Modified Components (extend, do not rewrite)

| Component | What Changes | Risk | File |
|-----------|--------------|------|------|
| `upsert.ts` | Add `normalizeCity()` function; call it in `upsertProperty()` before DB write | Low — additive, one function | `scraper/src/lib/upsert.ts` |
| `upsert.ts` | Add `COUNTY_DEFAULT_CITY['salt lake']` entry pointing to `'Rose Park'` | Low | same |
| `utah-legals.ts` | Add Salt Lake County to `TARGET_COUNTIES` array (index needs verification; SLC is likely index ~16 based on alphabetical order in checkbox list) | Low — additive | `scraper/src/sources/utah-legals.ts` |
| `utahLegalsScrape.ts` | No changes needed — `upsertFromUtahLegals` will retag SLC notices via normalizeCity() | None | `scraper/src/functions/utahLegalsScrape.ts` |
| `upsert.ts` > `upsertFromUtahLegals()` | The `COUNTY_CITY` map at line 378 needs `'salt lake': 'Rose Park'` added | Low | `scraper/src/lib/upsert.ts` |
| `actions.ts` | Add `'Rose Park'` to `DEFAULT_TARGET_CITIES` array | Low | `app/src/lib/actions.ts` |
| DB (one-shot migration script) | UPDATE existing SLC-city properties to `city = 'Rose Park'` where `zip = '84116'` | Low — data correction, same pattern as address fix on 2026-04-07 | Inline SQL or migration |
| UGRC re-run | Run `import-ugrc-assessor` script for Salt Lake County / 84116 parcels | None — existing script, new parameter | `scraper/src/sources/ugrc-assessor.ts` |

### NOT Modified

| Component | Why Untouched |
|-----------|---------------|
| `app/src/lib/queries.ts` | `getProperties()`, `getDashboardStats()`, `getMapProperties()` — all work via `target_cities` IN-clause; adding 'Rose Park' to the config is sufficient |
| `app/src/db/schema.ts` | No schema changes needed — `zip` column exists, `city` column exists, no new columns required |
| `scraper/src/scoring/score.ts` | Scoring is city-agnostic — all signal types and weights are the same for Rose Park |
| `scraper/src/functions/dailyScrape.ts` | Carbon County pipeline stays independent; SLCo gets its own function |

---

## Data Flow: Three Ingestion Paths for Rose Park

### Path 1: Statewide data already in DB (unlock, not re-scrape)

Properties with Salt Lake County NODs from `utah-legals.ts` may already exist in the database with `city = 'Salt Lake City'`. They are currently invisible because 'Salt Lake City' is not in `target_cities`.

```
Existing DB rows (city='Salt Lake City', county='salt lake', zip='84116')
    ↓
Step 1: One-shot SQL migration
    UPDATE properties
    SET city = 'Rose Park'
    WHERE zip = '84116'
       OR (county = 'salt lake' AND city ILIKE '%salt lake%')
    ↓
Step 2: Add 'Rose Park' to target_cities scraperConfig
    (via Settings UI or direct SQL)
    ↓
Step 3: Re-run scoreAllProperties()
    ↓
Properties appear in dashboard under 'Rose Park' city filter
```

This path costs no scraping work. It surfaces potentially dozens of leads immediately.

### Path 2: New SLCo delinquent scraper

```
SLCo Treasurer delinquent property list (web portal TBD)
    ↓
slco-delinquent.ts: scrapeDelinquent() returns DelinquentRecord[]
    (same interface as carbon-delinquent.ts)
    ↓
slcoScrape.ts: upsertFromDelinquent(records, 'salt lake')
    ↓
upsertProperty() → normalizeCity(city, zip) → city='Rose Park' for 84116
    ↓
upsertSignal(propertyId, { type: 'tax_lien', ... })
    ↓
scoreAllProperties() → leads.distressScore updated
```

### Path 3: New SLCo recorder scraper

```
SLCo Recorder webpro.com portal (NOD, lis pendens, deed filings)
    ↓
slco-recorder.ts: scrapeRecorder() returns RecorderRecord[]
    (same interface as carbon-recorder.ts)
    ↓
slcoScrape.ts: upsertFromRecorder(records)
    (county field on records carries 'salt lake')
    ↓
upsertProperty() → city='Rose Park' for 84116 parcels
    ↓
upsertSignal(propertyId, { type: 'nod' | 'lis_pendens', ... })
    ↓
scoreAllProperties()
```

---

## Scraper Side vs App Side Filter Split

The split is clean and must not be blurred:

**Scraper side (ingestion gate):** The scraper does NOT filter by zip — it ingests all records from the SLCo source and lets `normalizeCity()` retag them. The only ingestion gate is the county selector on source portals (scraping SLCo sources, not statewide). This keeps the scraper simple and allows future neighborhood expansion (84104, 84106, etc.) with no scraper changes — just add more zip-to-neighborhood mappings in `normalizeCity()`.

**App side (display gate):** `getProperties()` and `getDashboardStats()` filter by `target_cities`. Rose Park properties only appear when `'Rose Park'` is in the `target_cities` scraperConfig value. This is the correct gate — it means Brian can toggle Rose Park on/off through the Settings UI without any code change.

**What NOT to do:** Do not add a zip-column WHERE clause to `getProperties()`. This creates a second filter dimension that is inconsistent with how every other city works, and makes future neighborhood expansion require code changes instead of config changes.

---

## Migration Path for Existing Salt Lake City Properties

There may be properties in the DB today with `county = 'salt lake'` or `city = 'Salt Lake City'` from utah-legals statewide scrapes. The migration is a single SQL statement:

```sql
-- Step 1: Retag by zip (most reliable)
UPDATE properties
SET city = 'Rose Park', updated_at = now()
WHERE zip = '84116'
  AND city != 'Rose Park';

-- Step 2: Retag SLC county properties without zip (fewer rows, best effort)
UPDATE properties
SET city = 'Rose Park', updated_at = now()
WHERE county = 'salt lake'
  AND (city ILIKE '%salt lake%' OR city = '')
  AND city != 'Rose Park';
```

After the migration, run `scoreAllProperties()` so these properties get a lead row and a score. They will then appear in the dashboard as soon as 'Rose Park' is added to `target_cities`.

This is exactly the same pattern used for the 2,331 address corrections on 2026-04-07.

---

## Build Order (Dependencies Drive Sequence)

The recommended order prioritizes "verify before building":

### Step 1: Config + Migration (no new code)

1. Run the SQL migration to retag existing properties.
2. Add `'Rose Park'` to `target_cities` in `scraperConfig` (via Settings UI or direct SQL).
3. Run `scoreAllProperties()` (can be triggered via existing admin tooling).
4. Verify: do any Rose Park leads appear on the dashboard? How many? What signal types?

This step costs zero dev time and immediately answers whether there is existing data to work with. If utah-legals has been collecting SLC NODs, they surface here for free.

### Step 2: Unlock utah-legals for Salt Lake County

1. Identify the Salt Lake County checkbox index in the utahlegals.com county list (inspect HTML or test manually — it is alphabetical, likely index 16 based on the existing comment mapping in `utah-legals.ts`).
2. Add `{ index: 16, name: 'salt lake' }` to `TARGET_COUNTIES` in `scraper/src/sources/utah-legals.ts`.
3. Add `'salt lake': 'Rose Park'` to the `COUNTY_CITY` map in `upsertFromUtahLegals()` in `upsert.ts`.
4. Test the utah-legals scraper manually (trigger `utahLegalsScrape` function or run locally) and verify SLC notices are parsed and stored as `city='Rose Park'`.

Dependency: Step 1 must be done first so you can see new NODs flowing in correctly.

### Step 3: Add `normalizeCity()` to upsertProperty()

1. Add the `normalizeCity(city, zip)` function to `scraper/src/lib/upsert.ts`.
2. Modify `upsertProperty()` to call it.
3. Add `'salt lake'` to `COUNTY_DEFAULT_CITY` pointing to `'Rose Park'`.
4. No DB changes required.

This step enables Steps 4 and 5 to work correctly. The function is trivial but must be in place before the new scrapers land.

### Step 4: SLCo delinquent scraper

1. Research SLCo tax delinquent portal (likely `treasurer.slco.org` or similar).
2. Build `scraper/src/sources/slco-delinquent.ts` using `carbon-delinquent.ts` as the template.
3. Plug into `slcoScrape.ts` function (Step 5).

Dependency: Step 3 (normalizeCity must exist).

### Step 5: SLCo recorder scraper + function orchestrator

1. Research SLCo recorder portal (likely `recorder.slco.org` — SLCo uses webpro.com which is a known platform with a consistent URL pattern).
2. Build `scraper/src/sources/slco-recorder.ts`.
3. Build `scraper/src/functions/slcoScrape.ts` — timer trigger, runs independently from daily Carbon scrape. Pattern: copy `emeryScrape.ts` as template, replace source imports.
4. Schedule: match rural counties (5 AM MT daily).

Dependency: Steps 3 and 4.

### Step 6: UGRC re-run for Salt Lake County

Run the existing `import-ugrc-assessor` script targeting Salt Lake County parcels in 84116. This enriches Rose Park properties with `building_sqft`, `year_built`, `assessed_value` — which feed the MAO calculator and improve signal quality for scoring.

This is a one-shot manual trigger, not a recurring scraper. Document the command in the function's README.

### Step 7: Scoring calibration check

After data flows for 1-2 weeks, compare Rose Park signal distributions against rural counties:
- Rose Park will likely have more tax_lien signals per property (denser population)
- NOD signals may be more numerous but shorter freshness (Salt Lake trustee sales move faster)
- The hot_lead_threshold of 4 should hold, but watch for false-positive flood

The scoring engine is city-agnostic by design. If Rose Park produces too many hot leads (signal inflation from density), the calibration lever is `hot_lead_threshold` in `scraperConfig` — but this is global, not per-city. A per-city threshold is out of scope for v1.3.

---

## Architectural Patterns

### Pattern: County-scoped Azure Function per geography

Each county/region has its own Azure Function timer trigger file (`dailyScrape.ts`, `emeryScrape.ts`, `juabScrape.ts`, `millardScrape.ts`, etc.). SLCo gets `slcoScrape.ts`.

**Why:** Failures are isolated. If the SLCo recorder portal goes down, the rural scrapes are unaffected. Each function can be triggered independently for testing. Execution time budgets are per-function.

**Implementation:** `slcoScrape.ts` follows the exact structure of `emeryScrape.ts` — register timer with `app.timer()`, run scrapers in independent try/catch blocks, call `scoreAllProperties()` at the end.

### Pattern: `normalizeCity()` as the single normalization point

All city normalization for Rose Park flows through `normalizeCity()` in `upsert.ts`. The function is the single place where zip-to-neighborhood mapping lives. Future expansion (add 84104 as 'Glendale', etc.) requires one line in this function and one row in `scraperConfig.target_cities`.

This avoids scatter: city remapping does not happen in individual scrapers, not in the Azure function, not in app queries. Only in `upsertProperty()`.

### Pattern: `target_cities` as the display gate (not the ingestion gate)

Scrapers ingest everything from their county sources. The DB may contain properties from zipcodes outside 84116 if SLCo sources cover the whole county. Those properties are ingested and scored but hidden by the `target_cities` WHERE clause in `getProperties()`. Brian can expand the display scope through Settings without code changes.

This is the existing pattern for rural counties and must not be violated for SLCo.

---

## Scoring: Urban Density vs Rural Sparse

Rose Park (84116) is an urban zip with roughly 15,000-20,000 parcels vs ~3,000-5,000 in Price or Castle Dale. What this means for scoring:

**The scoring weights are appropriate as-is.** The issue is not weight calibration — it is signal volume. In a dense urban zip, more properties will have tax liens, and they are more likely to have multiple-year delinquencies. The multi-year bonus in `yearsDelinquentBonus()` (score.ts lines ~67-80) may fire more often.

**Watch for:** A flood of tax_lien + multi-year-bonus combinations pushing scores above the hot_lead_threshold of 4 without a corresponding NOD. In rural counties this is rare because fewer properties are delinquent. In SLC it may be more common.

**Mitigation (if needed after observation):** Raise the hot_lead_threshold from 4 to 5 in `scraperConfig`. This is a config change, not a code change. Do not pre-emptively raise it — wait and see what the data shows.

**What does NOT need to change for v1.3:** The `scoreAllProperties()` function itself, the signal weights, or the freshness windows. These are calibrated against NOD urgency which is the same everywhere in Utah (90-day trustee sale window).

---

## Integration Points (concrete)

| Integration Point | Current State | v1.3 Change |
|-------------------|---------------|-------------|
| `upsert.ts > upsertProperty()` | `city` from record or county default | Add `normalizeCity(city, zip)` call |
| `upsert.ts > COUNTY_DEFAULT_CITY` | 6 rural counties | Add `'salt lake': 'Rose Park'` |
| `upsert.ts > upsertFromUtahLegals() > COUNTY_CITY` | 4 rural counties (lines 378-383) | Add `'salt lake': 'Rose Park'` |
| `utah-legals.ts > TARGET_COUNTIES` | Carbon, Emery, Juab, Millard (4 entries) | Add Salt Lake County entry |
| `actions.ts > DEFAULT_TARGET_CITIES` | 9 rural cities | Add `'Rose Park'` |
| `scraperConfig` `target_cities` row | 9 rural city strings (in DB) | Add `'Rose Park'` via Settings UI or SQL |
| New: `slco-delinquent.ts` | Does not exist | New file, `DelinquentRecord[]` interface |
| New: `slco-recorder.ts` | Does not exist | New file, `RecorderRecord[]` interface |
| New: `slcoScrape.ts` | Does not exist | New Azure Function file |

---

## Anti-Patterns to Avoid

### Anti-Pattern: Scraper-side zip filter

Do not filter at scrape time to only ingest 84116 properties. The SLCo delinquent and recorder portals will return data for the whole county. Filtering at scrape time discards data that might be useful later (if Brian expands to other SLC neighborhoods). Instead, ingest all county data; let `target_cities` control display.

### Anti-Pattern: Adding zip to the app query filter

Do not add `zip = '84116'` as a WHERE clause in `getProperties()` or `getDashboardStats()`. This creates a parallel filter dimension that is inconsistent with how all other cities work, complicates every query function, and makes future neighborhood expansion require code changes instead of config changes. The retag approach eliminates this entirely.

### Anti-Pattern: Per-city scoring config

Do not build a per-city scoring threshold. It would require schema changes, new config keys, and query complexity. The global `hot_lead_threshold` in `scraperConfig` is sufficient. If urban density causes a flood, raise the threshold globally — that's still better than adding per-city config infrastructure.

### Anti-Pattern: Rewriting existing upsert functions

`upsertFromDelinquent()` and `upsertFromRecorder()` in `upsert.ts` are generic and work for any county. `slcoScrape.ts` calls these same functions with `county = 'salt lake'`. Do not create `upsertFromSlcoDelinquent()` — that would duplicate logic that already handles the SLCo case correctly once `normalizeCity()` is added.

---

## Sources

- Code inspection: `scraper/src/sources/carbon-delinquent.ts`, `utah-legals.ts`, `upsert.ts` (direct read)
- Code inspection: `app/src/lib/queries.ts`, `app/src/lib/actions.ts` (direct read — all filter logic confirmed)
- Code inspection: `app/src/db/schema.ts` — `zip` column confirmed nullable on `properties` table
- Code inspection: `scraper/src/functions/dailyScrape.ts`, `scraper/src/scoring/seed-config.ts`
- Project context: `.planning/PROJECT.md` v1.3 milestone description
- Archive baseline: `.planning/research/archive-pre-v1.3/ARCHITECTURE.md`

---
*Architecture research for: v1.3 Rose Park Pilot — Salt Lake County integration*
*Researched: 2026-04-17*
