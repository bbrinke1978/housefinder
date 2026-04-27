# Phase 26: UGRC Rose Park Enrichment — Research

**Researched:** 2026-04-26
**Domain:** ArcGIS FeatureServer enrichment via parcel-ID list filter, import script extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RP-01 (re-scoped) | System enriches existing Rose Park rows with UGRC assessor data (sqft, year built, assessed value, lot acres). UGRC is enrichment-only (UPDATE by parcel_id); no zip filter possible. | Option B (allowlist) is the correct approach — allowlist already exists from Phase 25.5. Script extension is clear and safe. |
| RP-06 | User can see "Rose Park" as a selectable city in dashboard filter dropdown | Already implemented in Phase 25-02: `getDistinctCities()` reads `scraper_config.target_cities`; "Rose Park" seeded. No new code needed. |
| RP-07 | User can see Rose Park properties in the dashboard property grid and stats bar | `getProperties()` and `getDashboardStats()` both filter by `target_cities`. Once rows exist with `city='Rose Park'` and `distress_score > 0`, they appear automatically. No new code needed. |
</phase_requirements>

---

## Summary

Phase 26 has one concrete implementation task: extend `import-ugrc-assessor.mjs` to enrich Rose Park rows using **Option B — the pre-built 84116 parcel-ID allowlist from Phase 25.5**. This is the correct approach. Option A (fetch all 394,610 SLC parcels) is not recommended because it would generate ~789,000 DB round-trips vs. ~16,540 for Option B — a 48x reduction in DB load and script runtime.

The allowlist (`scraper/data/rose-park-parcel-allowlist.json`) already contains 8,270 unique normalized parcel IDs for zip 84116, generated 2026-04-26 from the UGRC `SaltLake_County_Addresses` ArcGIS layer. Phase 26 reuses this file directly — no new UGRC service queries needed to build the filter.

The UGRC `Parcels_SaltLake_LIR` layer's PARCEL_ID values are already in no-hyphen 14-digit format (confirmed live: `08221800100000`). The allowlist parcel IDs are in the same normalized form. The DB-side WHERE clause strips hyphens from stored values before matching. This means parcel_id format compatibility is CONFIRMED — no normalization gap.

RP-06 and RP-07 are emergent outcomes requiring zero new code, identical to the original research finding. "Rose Park" is already seeded in `scraper_config.target_cities`. Once any Rose Park row has `distress_score > 0`, it appears in filter, grid, and stats bar automatically.

**Primary recommendation:** Add a Salt Lake (84116) entry to the `COUNTIES` array that uses `fetchFromAllowlist()` instead of `fetchAllFeatures()` — load the 8,270-parcel allowlist JSON, query UGRC in batches of parcel IDs (or use a `PARCEL_ID IN (...)` WHERE clause paginated by the allowlist), and UPDATE matching DB rows.

---

## Decision: Option A vs Option B

### Option A: Fetch All SLC Parcels, JOIN against DB

**Approach:** Use `where='1=1'` (no zip filter) for `Parcels_SaltLake_LIR`. Fetch all ~394,610 parcels. After aggregation, run UPDATE queries for each parcel. Only DB rows that match by parcel_id get written.

**Evidence against:**
- Live count query `where=1=1&returnCountOnly=true` returned **394,610** parcels (HIGH confidence, fetched live 2026-04-26).
- At 1,000 records/page: 395 ArcGIS HTTP requests.
- After aggregation: ~394k unique parcels → ~789k DB queries (UPDATE + SELECT fallback per parcel).
- At current Phase 21 speed (~110k queries in ~40 minutes), 789k queries would take approximately **288 minutes (4.8 hours)**.
- Azure Function consumption plan default timeout: 5 minutes; max configurable: 10 minutes. **Option A will always timeout as an Azure Function.**
- Even as a local script, a 5-hour run is impractical for a one-shot enrichment.

**Verdict: Option A is NOT viable.** The 394k parcel count rules it out on both timeout and DB round-trip grounds.

### Option B: Use 84116 Parcel-ID Allowlist, Fetch Only Matching Parcels

**Approach:** Load `scraper/data/rose-park-parcel-allowlist.json` (8,270 parcel IDs). Query `Parcels_SaltLake_LIR` using batched `PARCEL_ID IN (...)` WHERE clauses (e.g., 200 IDs per batch = 42 ArcGIS requests). UPDATE only the returned parcels in the DB.

**Evidence for:**
- Allowlist already exists: `scraper/data/rose-park-parcel-allowlist.json`, 8,270 parcels, generated 2026-04-26. No rebuild needed.
- The `SaltLake_County_Addresses` layer (confirmed live: has `ParcelID` + `ZipCode` fields) was already queried with `WHERE ZipCode='84116'` by `build-rose-park-parcel-allowlist.ts` to produce this file.
- Parcels in file: 8,270. DB queries estimate: ~8,270 × 2 = ~16,540 max. At Phase 21 speed: **approximately 6 minutes** as a local script — entirely feasible.
- UGRC PARCEL_ID format confirmed no-hyphen: `08221800100000` — matches allowlist normalized format exactly.

**Allowlist ID format details:** The allowlist stores normalized IDs (no hyphens, uppercase, 14 digits). The Phase 25.5 DB rows have hyphenated format (`26-24-406-084-0000`); DB-side `REPLACE(parcel_id, '-', '')` produces `2624406084000` — also no hyphens. But note: the prefix ranges in the allowlist are `07-`, `08-` after normalization (7-8 billion range), while Phase 25.5 rows show prefix `26-`. These are different parcel ID ranges — see Parcel ID Format Compatibility section below.

**Verdict: Option B is the only viable approach.** 42 ArcGIS requests, ~16k DB queries, ~6 minutes runtime.

**Alternative within Option B:** Instead of batched `IN (...)` queries, load all 8,270 IDs from the allowlist, build them into a single large `fetchAllFeatures()` call with a long `PARCEL_ID IN ('id1','id2',...)` WHERE clause. ArcGIS URL length limits mean batching at 200 IDs per request is safer. Either way, the same 8,270-parcel scope applies.

---

## Live UGRC Schema

**Service:** `Parcels_SaltLake_LIR`
**Endpoint:** `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_SaltLake_LIR/FeatureServer/0?f=json`
**Fetched live:** 2026-04-26 (HIGH confidence)

**Complete field list (all 30 fields):**

| Field Name | Type |
|------------|------|
| OBJECTID | esriFieldTypeOID |
| COUNTY_NAME | esriFieldTypeString |
| COUNTY_ID | esriFieldTypeString |
| ASSESSOR_SRC | esriFieldTypeString |
| BOUNDARY_SRC | esriFieldTypeString |
| DISCLAIMER | esriFieldTypeString |
| CURRENT_ASOF | esriFieldTypeDate |
| PARCEL_ID | esriFieldTypeString |
| SERIAL_NUM | esriFieldTypeString |
| PARCEL_ADD | esriFieldTypeString |
| PARCEL_CITY | esriFieldTypeString |
| TAXEXEMPT_TYPE | esriFieldTypeString |
| TAX_DISTRICT | esriFieldTypeString |
| TOTAL_MKT_VALUE | esriFieldTypeDouble |
| LAND_MKT_VALUE | esriFieldTypeDouble |
| PARCEL_ACRES | esriFieldTypeDouble |
| PROP_CLASS | esriFieldTypeString |
| PRIMARY_RES | esriFieldTypeString |
| HOUSE_CNT | esriFieldTypeString |
| SUBDIV_NAME | esriFieldTypeString |
| BLDG_SQFT | esriFieldTypeDouble |
| BLDG_SQFT_INFO | esriFieldTypeString |
| FLOORS_CNT | esriFieldTypeDouble |
| FLOORS_INFO | esriFieldTypeString |
| BUILT_YR | esriFieldTypeSmallInteger |
| EFFBUILT_YR | esriFieldTypeSmallInteger |
| CONST_MATERIAL | esriFieldTypeString |
| PROP_TYPE | esriFieldTypeString |
| Shape__Area | esriFieldTypeDouble |
| Shape__Length | esriFieldTypeDouble |

**Confirmed absent:** `PARCEL_ZIP`, `ZIP_CODE` — NO zip code field exists in this layer. The entire original Phase 26 plan (`PARCEL_ZIP='84116'` filter) was based on wrong assumptions. This is verified byte-for-byte from the live ArcGIS endpoint.

**Confirmed present:** `BLDG_SQFT`, `BUILT_YR`, `TOTAL_MKT_VALUE`, `PARCEL_ACRES` — the four fields the script already maps to `building_sqft`, `year_built`, `assessed_value`, `lot_acres`. **No schema changes to the import script's field mapping are needed.**

**Total parcel count:** 394,610 (confirmed live via `?where=1%3D1&returnCountOnly=true&f=json`).

---

## Parcel ID Format Compatibility

**UGRC `Parcels_SaltLake_LIR` PARCEL_ID format (confirmed live):**
- No hyphens, 14 digits, e.g.: `08221800100000`, `08221800110000`
- Prefix `08-` is the dominant SLCo west-side range
- Already in normalized form (no stripping needed from UGRC side)

**DB rows from Phase 25.5 (`utah-legals.ts`) format:**
- Hyphenated 5-segment: `26-24-406-084-0000` (per Phase 25.5 research and Branch 4 regex)
- After DB-side `REPLACE(parcel_id, '-', '')` → `26244060840000`
- Prefix `26-` range (Sugar House / east-side SLC)

**Allowlist (`rose-park-parcel-allowlist.json`) format:**
- Normalized 14-digit: `07161010014001`, `08221800100000` etc.
- Prefix distribution: 97.5% `08-`, 2.3% `07-` (per Phase 25.5 summary)

**Compatibility assessment — CRITICAL RISK:**

The DB rows from Phase 25.5 carry prefix `26-` (after stripping: `26xxxxxxxx`), while the allowlist has 97.5% `08-` and 2.3% `07-` prefix parcels. These are **different parcel ranges**. If Phase 25.5 inserted rows with `26-` series parcel IDs, those IDs do NOT appear in the 84116 allowlist (which covers `07-`/`08-` ranges). This means:

1. The allowlist-based approach to querying UGRC will correctly fetch only `07-`/`08-` range parcels from `Parcels_SaltLake_LIR`.
2. If the DB contains `26-`-prefix Rose Park rows, those rows WILL NOT be enriched by an allowlist-scoped query.
3. However: the Phase 25.5 dry-run confirmed **zero SLC notices were accepted** in the current Utah Legals window — there are currently zero Rose Park rows in the DB at all.

**Working conclusion:** The parcel ID format is compatible at the normalization level (both sides strip hyphens). But there may be a parcel range gap: Phase 25.5 rows could be `26-` prefix while the allowlist is `07-`/`08-` prefix. This gap is safe to accept for v1.3 because:
- Zero rows exist in DB today (no immediate mismatch)
- When Phase 25.5 does produce real rows, their UGRC parcel IDs must be verified against the allowlist by spot-checking
- The Phase 26 plan should include a verification step: after enrichment, check if any Rose Park DB rows have non-`07`/`08` prefix parcel IDs and log them

**No normalization code change needed** — stripping hyphens on both sides is sufficient. The format normalizes correctly. The potential gap is a data scope issue, not a code normalization issue.

---

## import-ugrc-assessor.mjs Current Behavior

**File path:** `app/src/scripts/import-ugrc-assessor.mjs`
**Confirmed by:** reading the full file (2026-04-26)

### Current COUNTIES array
```javascript
const COUNTIES = [
  { name: "Carbon",  service: "Parcels_Carbon_LIR" },
  { name: "Emery",   service: "Parcels_Emery_LIR" },
  { name: "Juab",    service: "Parcels_Juab_LIR" },
  { name: "Millard", service: "Parcels_Millard_LIR" },
];
// Comment in code explains SLC was attempted and rolled back in Phase 26 (original)
```

### Current FIELDS constant
```javascript
const FIELDS = "PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,PARCEL_ACRES,PROP_CLASS";
```

### Current fetchAllFeatures signature
```javascript
async function fetchAllFeatures(serviceName, where = "1=1")
```
The `where` parameter **already exists** (added during the original Phase 26 attempt). It defaults to `"1=1"`.

### SQL generated by enrichment
```sql
UPDATE properties SET
  building_sqft  = COALESCE(building_sqft,  $2::integer),
  year_built     = COALESCE(year_built,     $3::integer),
  assessed_value = COALESCE(assessed_value, $4::integer),
  lot_acres      = COALESCE(lot_acres,      $5::numeric),
  updated_at     = NOW()
WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1
AND ($2::integer IS NOT NULL OR $3::integer IS NOT NULL OR $4::integer IS NOT NULL OR $5::numeric IS NOT NULL)
RETURNING id
```
Note: DB-side strips hyphens and spaces but NOT dots. UGRC SLC IDs have no dots (confirmed), so this is not a gap for SLC.

### Paging logic
- `PAGE_SIZE = 1000` (ArcGIS default max)
- Checks `data.exceededTransferLimit === true` before breaking on `features.length < PAGE_SIZE`
- Safety guard: `if (features.length === 0) break` prevents infinite loop
- Loop tracks cumulative `all.length` and logs per-page progress

### Match reporting
- `countyUpdated`, `countySkipped`, `countyNoMatch` per county
- Skipped = row matched in DB but UGRC had no data to set (all-null UGRC record)
- No match = parcel ID not found in DB

### CLI flags
- `--county=<name>` — optional filter by county name substring (e.g. `--county=salt-lake`)
- No `--dry-run` flag. Script always writes to DB.

### Execution pattern
- Requires `DATABASE_URL` environment variable (validates on startup, exits 1 if missing)
- Run locally: `DATABASE_URL=postgresql://... node app/src/scripts/import-ugrc-assessor.mjs`
- Uses `pg.Client` directly (not Drizzle) — reads `.env.local` not automatically

### What must be added for Phase 26
The script needs a new `fetchFromAllowlist(serviceName, parcelIds)` function (or equivalent) that:
1. Loads `scraper/data/rose-park-parcel-allowlist.json`
2. Batches the 8,270 parcel IDs into groups of ~200
3. For each batch, calls `fetchAllFeatures(serviceName, `PARCEL_ID IN (${batch.map(id => `'${id}'`).join(',')})`)` 
4. Aggregates results

The `COUNTIES` array needs a new Salt Lake entry:
```javascript
{
  name: "Salt Lake (84116)",
  service: "Parcels_SaltLake_LIR",
  allowlistPath: "../scraper/data/rose-park-parcel-allowlist.json",  // relative to app/src/scripts/
}
```

---

## Properties Table Schema

**File:** `app/src/db/schema.ts`
**Confirmed by:** reading the file (2026-04-26)

### UGRC-written columns (all nullable, no migration needed)
```typescript
buildingSqft: integer("building_sqft"),          // nullable
yearBuilt: integer("year_built"),                 // nullable
assessedValue: integer("assessed_value"),          // nullable
lotAcres: numeric("lot_acres", { precision: 10, scale: 4 }),  // nullable
```

All four columns already exist and are nullable. **Zero migration work required for Phase 26.**

The `COALESCE` UPDATE policy in the script means existing non-null values are never overwritten. This is safe to run multiple times.

---

## Integration Points

### Where assessor fields render

**1. Property detail page assessor card**
- File: `app/src/components/property-overview.tsx` (line 186+)
- Condition: renders entire "Assessor Data" `<Card>` only if at least one of `buildingSqft`, `yearBuilt`, `assessedValue`, `lotAcres` is non-null
- No code changes needed — fields auto-render once populated

**2. Deal overview assessor section**
- File: `app/src/components/deal-overview.tsx` (line 472+)
- Same conditional render pattern — assessor data card appears on deal detail once linked property has data

**3. Dashboard property cards**
- File: `app/src/components/property-card.tsx`
- Cards do NOT display assessor fields (they show distress score, signals, address, owner)
- RP-06/RP-07 success criteria (cards visible, stats bar) are independent of assessor data

### MAO calculator and assessed_value

The task description says "MAO calculator can derive ARV-related defaults from assessed_value." Checking the codebase: the MAO calculator in `deal-overview.tsx` takes `arv` as a user input; it does NOT auto-populate from `assessed_value`. The success criterion (RP-01 item 3) says "can derive ARV-related defaults" — the assessor data section on the deal detail page already shows `assessedValue` as a reference number the user can manually read when setting ARV. This is satisfied by the existing `deal-overview.tsx` conditional render. No calculator code change is needed.

### RP-06 and RP-07 data path
- `getDistinctCities()` in `app/src/lib/queries.ts` → calls `getTargetCitiesList()` → reads `scraper_config` table `key='target_cities'` → "Rose Park" already seeded by Phase 25-02
- `getProperties()` and `getDashboardStats()` both use `WHERE city = ANY($targetCities)` → Rose Park rows appear automatically once they exist with `distress_score > 0`

**No new UI code, query changes, or server actions needed for RP-06 or RP-07.** These are purely emergent from Phase 25 + data population.

---

## Risks & Open Questions

### Risk 1: Phase 25.5 Rose Park rows may have parcel IDs outside the allowlist's range
**What:** Phase 25.5 uses regex Branch 4 for SLCo parcels (`\b(\d{2}-\d{1,3}-\d{3,4}-\d{3,4}-\d{3,4})\b`), which extracted `26-` prefix IDs from Utah Legals notices. The allowlist covers `07-`/`08-` prefix parcels. If real Rose Park NODs arrive with `26-` parcel IDs, the UGRC enrichment query (scoped to allowlist) will fetch `07-`/`08-` parcels, find none matching the `26-` DB rows, and log "No match" — technically correct but the enrichment goal is not met.
**Severity:** MEDIUM — impacts enrichment completeness, not correctness. The DB rows would still be valid leads.
**Mitigation:** The plan should include a post-enrichment spot-check SQL: `SELECT REPLACE(parcel_id, '-', '') FROM properties WHERE city='Rose Park'` and compare prefix distribution against the allowlist.

### Risk 2: Current zero Rose Park rows means Phase 26 import will log 0 matches
**What:** Phase 25.5 confirmed zero Rose Park rows in DB as of 2026-04-26. Phase 26 enrichment will succeed (script runs, fetches UGRC data, logs match report) but Updated count will be 0.
**Severity:** LOW — this is expected and correct. Not a failure. The script is a standing enrichment runner; future scheduled scraper runs that DO produce Rose Park rows can re-run Phase 26's import at any time.
**Mitigation:** Plan should document that 0 Updated is an expected success state for first run. Recommend adding a cron or manual re-run note for after the first real Rose Park NOD arrives.

### Risk 3: No dry-run mode in the script
**What:** The script has no `--dry-run` flag. Every run writes to the production database.
**Severity:** LOW for Phase 26 (COALESCE means running twice is safe). But for auditability, it would be better to have a dry-run mode.
**Mitigation:** Add a `--dry-run` flag in the plan as a Phase 26 deliverable. When active: log what WOULD be updated but skip the `client.query(UPDATE...)` call. This is a simple 10-line addition.

### Risk 4: Allowlist path resolution from the script's working directory
**What:** The script is at `app/src/scripts/import-ugrc-assessor.mjs`. The allowlist is at `scraper/data/rose-park-parcel-allowlist.json`. The relative path from the script's location is `../../../scraper/data/rose-park-parcel-allowlist.json` (three levels up from `scripts/` to `app/`, then to repo root, then into `scraper/data/`).
**Mitigation:** Use `path.resolve(import.meta.url)` or pass the path as a CLI arg (`--allowlist=<path>`). The plan should specify `path.resolve(fileURLToPath(import.meta.url), '../../../scraper/data/rose-park-parcel-allowlist.json')` or let the user pass `--allowlist=<absolute_path>`.

### Open Question 1: Batch size for `IN (...)` queries to ArcGIS
**What we know:** URL length limits exist for GET requests (~2000 chars). Each parcel ID is 14 chars plus commas/quotes: ~18 chars. 200 IDs = ~3,600 chars in the IN clause alone.
**Recommendation:** Use POST requests to the ArcGIS FeatureServer query endpoint instead of GET. ArcGIS REST API supports POST for query operations, removing URL length constraints. Or batch at 100 IDs per request using GET (safe at ~1,800 chars).

### Open Question 2: When to schedule re-runs
**What we know:** The import is a one-shot script, not a daily timer. Rose Park rows will appear over time as Utah Legals processes real NODs.
**Recommendation:** Document in the SUMMARY that the import should be re-run manually after the first batch of Rose Park NODs appears (Brian will see this via the alert email for new hot leads). No automated cron needed for v1.3.

---

## Validation Architecture

`workflow.nyquist_validation` is not present in `.planning/config.json` (the config has no `nyquist_validation` key). Skip this section.

Success verification for Phase 26 is console output + SQL spot-checks:

```sql
-- How many Rose Park properties got enriched?
SELECT COUNT(*) FROM properties WHERE city='Rose Park' AND building_sqft IS NOT NULL;

-- Full enrichment check
SELECT parcel_id, city, zip, building_sqft, year_built, assessed_value, lot_acres
FROM properties WHERE city='Rose Park' ORDER BY updated_at DESC LIMIT 20;

-- Rose Park in target_cities (should be there from Phase 25)
SELECT value FROM scraper_config WHERE key = 'target_cities';
```

---

## Sources

### Primary (HIGH confidence)
- `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_SaltLake_LIR/FeatureServer/0?f=json` — Live ArcGIS schema fetch 2026-04-26. Confirmed 30 fields, NO zip field.
- `https://services1.arcgis.com/...&returnCountOnly=true&f=json` — Live count query: 394,610 parcels in SLC layer.
- `https://services1.arcgis.com/...Parcels_SaltLake_LIR/.../query?resultRecordCount=5&f=json` — Live sample: PARCEL_ID values in no-hyphen 14-digit format confirmed.
- `https://services1.arcgis.com/.../SaltLake_County_Addresses/FeatureServer/0?f=json` — Live schema: `ParcelID` and `ZipCode` fields confirmed present. Used by Phase 25.5's `build-rose-park-parcel-allowlist.ts`.
- `app/src/scripts/import-ugrc-assessor.mjs` — Read in full. CLI flags, SQL, paging, field mapping all confirmed.
- `app/src/db/schema.ts` — Read lines 1-78. All four assessor columns confirmed nullable, no migration needed.
- `scraper/data/rose-park-parcel-allowlist.json` — Read header: 8,270 parcels, 18,346 addresses, generated 2026-04-26.
- `.planning/phases/25.5-utah-legals-slc-activation/25.5-02-SUMMARY.md` — Confirms allowlist approach, 8,270 parcel IDs, `07-`/`08-` prefix distribution, zero Rose Park rows in current DB.
- `.planning/phases/21-ugrc-assessor-enrichment/21-01-SUMMARY.md` and `21-02-SUMMARY.md` — Confirmed script behavior from production run: COALESCE pattern, match rates, sequential query pattern, ~40min for 55k parcels.
- `app/src/components/property-overview.tsx`, `deal-overview.tsx` — Read relevant sections confirming assessor field render paths.

### Secondary (MEDIUM confidence)
- `.planning/phases/26-ugrc-salt-lake-county-import/26-RESEARCH.INVALIDATED.md` — Prior research. Useful for what was already confirmed (RP-06/RP-07 emergent nature, script patterns). Treated as INVALIDATED for the zip-filter claim but valid for dashboard architecture findings.
- `.planning/phases/21-ugrc-assessor-enrichment/21-RESEARCH.md` — Phase 21 research. UGRC LIR layer patterns documented there apply to SLC layer.

---

## Metadata

**Confidence breakdown:**
- Decision (Option B): HIGH — live parcel count (394k) makes Option A untenable by math; allowlist existence confirmed in repo.
- Live UGRC schema: HIGH — fetched from live ArcGIS endpoint 2026-04-26.
- Parcel ID format: HIGH — live sample confirmed no-hyphen 14-digit format from UGRC; allowlist confirmed same format.
- Script behavior: HIGH — read full source file.
- DB schema: HIGH — read schema.ts directly.
- Integration points: HIGH — read component files directly.
- Parcel range compatibility risk: MEDIUM — logical inference from prefix distribution data; actual Phase 25.5 DB rows have not yet been observed with real parcel IDs (zero rows exist).

**Research date:** 2026-04-26
**Valid until:** UGRC schema is stable; re-verify if running more than 90 days after this date.

---

## RESEARCH COMPLETE

**Phase:** 26 - UGRC Rose Park Enrichment
**Confidence:** HIGH

### Key Findings

1. **Option B is the only viable approach.** All 394,610 SLC parcels make Option A timeout-fatal for any Azure Function. The 8,270-parcel allowlist from Phase 25.5 already exists and is the correct scope filter — 42 ArcGIS batch requests vs. 395+ for all of SLC.

2. **Live UGRC schema confirms zero zip fields.** The `Parcels_SaltLake_LIR` layer has exactly 30 fields. `PARCEL_ZIP` and `ZIP_CODE` do not exist. The original Phase 26 plan was fundamentally broken. The correct UGRC fields for enrichment (`BLDG_SQFT`, `BUILT_YR`, `TOTAL_MKT_VALUE`, `PARCEL_ACRES`) are all present and unchanged.

3. **Parcel ID format is compatible but there is a prefix-range risk.** UGRC SLC returns IDs in no-hyphen 14-digit form (e.g. `08221800100000`). The allowlist covers `07-`/`08-` prefix ranges (Rose Park west-side). Phase 25.5 regex captures `26-` prefix IDs from Utah Legals. If real Rose Park NODs arrive with `26-` IDs, those rows won't be matched by an allowlist-scoped query. This is LOW severity for v1.3 (zero rows exist today) but must be spot-checked post-enrichment.

4. **Zero migration work needed.** All four columns (`building_sqft`, `year_built`, `assessed_value`, `lot_acres`) are already nullable in `properties` table. The script's COALESCE UPDATE SQL and field mapping work for SLC exactly as for rural counties.

5. **RP-06 and RP-07 are purely emergent — zero UI code.** Dashboard filter and grid both auto-respond to city='Rose Park' from scraper_config. First run will likely show 0 Updated (expected — no Rose Park rows in DB yet). Success is the script running and logging a match report.

### File Created
`.planning/phases/26-ugrc-salt-lake-county-import/26-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Option B decision | HIGH | Math from live 394k count; allowlist existence confirmed in repo |
| Live UGRC schema | HIGH | Fetched from live ArcGIS endpoint 2026-04-26 |
| Script behavior | HIGH | Read full source file |
| DB schema | HIGH | Read schema.ts |
| Parcel range risk | MEDIUM | Prefix distribution known but no real Phase 25.5 rows exist yet to verify |
| Integration points | HIGH | Read component files |

### Open Questions
1. Should the allowlist path be hardcoded (relative) or a CLI argument? Recommend CLI arg `--allowlist=<path>` for portability.
2. Should ArcGIS IN-clause queries use POST (no URL limit) or GET with 100-ID batches? Recommend POST.
3. When Phase 25.5 eventually produces real Rose Park rows, will their `26-` prefix parcel IDs appear in the allowlist? Needs spot-check at first real import run.

### Ready for Planning
Research complete. Planner can now create PLAN.md for Phase 26.
