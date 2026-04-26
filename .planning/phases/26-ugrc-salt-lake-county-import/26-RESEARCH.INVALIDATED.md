# Phase 26: UGRC Salt Lake County Import — Research

**Researched:** 2026-04-17
**Domain:** ArcGIS FeatureServer query with ZIP filter + existing import script extension
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| RP-01 | System runs UGRC assessor enrichment for Salt Lake County with `PARCEL_ZIP='84116'` ArcGIS WHERE filter (avoids 350k-parcel overload and Azure Function timeout) | UGRC LIR field schema confirmed: zip field is `PARCEL_ZIP`, not `ZIP_CODE`. Script extension pattern is clear. |
| RP-06 | User can see "Rose Park" as a selectable city in dashboard filter dropdown | `getDistinctCities()` delegates to `getTargetCitiesList()` which reads from `scraper_config`. "Rose Park" was seeded in Phase 25 migration 0013. Automatic once data lands. |
| RP-07 | User can see Rose Park properties (with all existing distress signals from statewide scrapers) in the dashboard property grid and stats bar | `getDashboardStats()` and `getProperties()` both call `getTargetCitiesList()` and filter by city. Once properties land with `city='Rose Park'`, they appear automatically — no query changes needed. |
</phase_requirements>

---

## Summary

Phase 26 has one concrete implementation task: extend `import-ugrc-assessor.mjs` to add a Salt Lake County entry with a zip-code ArcGIS WHERE filter, then run it against production. Everything else in this phase is either already done (RP-06, RP-07 are emergent from Phase 25 + Phase 26 data landing) or automatic (normalizeCity() is live and will tag rows as they are upserted).

**Critical field-name correction:** Prior research flagged `ZIP_CODE` as MEDIUM confidence for the zip field name in the UGRC `Parcels_Salt_Lake_LIR` service. This research has now verified from the official UGRC parcel documentation at `gis.utah.gov/products/sgid/cadastre/parcels/` that the field is named **`PARCEL_ZIP`**, not `ZIP_CODE`. The WHERE clause must be `PARCEL_ZIP='84116'`, not `ZIP_CODE='84116'`. Using the wrong field name will produce an ArcGIS error 400 and the import will fail silently or loudly.

The script's existing loop structure handles pagination, match-rate logging, and the COALESCE update pattern correctly. The only required changes are: (1) add the Salt Lake County entry to the `COUNTIES` array with a `where` parameter, (2) add `PARCEL_ZIP` to the `outFields` list so the field is returned, and (3) thread the `where` parameter into `fetchAllFeatures()`.

RP-06 and RP-07 are satisfied automatically: `getDistinctCities()` is an alias for `getTargetCitiesList()` which reads `scraper_config.target_cities` — "Rose Park" was confirmed present in production as of Phase 25-02. `getDashboardStats()` and `getProperties()` both filter by that same list. Once any property lands with `city='Rose Park'` and `distress_score > 0`, it appears in the grid, stats bar, and city filter dropdown with zero additional code.

**Primary recommendation:** Add Salt Lake County to `COUNTIES` with `where: "PARCEL_ZIP='84116'"`, add `PARCEL_ZIP` to `FIELDS`, expose `where` as a parameter in `fetchAllFeatures()`, then run locally against production DATABASE_URL. Expect 5k-15k parcels fetched and a low match rate against our DB (we have few SLC rows yet) — the match report satisfies RP-01's logging requirement.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pg` (node-postgres) | already in project | Direct DB queries in the .mjs import script | Script uses `pg.Client` directly, not Drizzle — consistent with existing script pattern |
| `fetch` (Node built-in) | Node 18+ | ArcGIS FeatureServer REST queries | Already used in the script for all ArcGIS calls |

No new npm packages required. The script is pure Node.js ESM using built-in `fetch` and the already-installed `pg` package.

### Supporting

No supporting libraries needed beyond what the script already uses.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PARCEL_ZIP filter in WHERE | Geometry bounding-box filter | Bounding box requires knowing 84116 polygon coordinates. PARCEL_ZIP is simpler, same result. |
| Manual script run | Azure Function trigger | Script is already a manual one-shot runner. No Azure Function needed for UGRC import — it is not a daily recurring task. |

**Installation:** No new packages. Script runs with `node app/src/scripts/import-ugrc-assessor.mjs`.

---

## Architecture Patterns

### Recommended Project Structure

No structural changes. The script lives at:

```
app/
└── src/
    └── scripts/
        └── import-ugrc-assessor.mjs   ← extend this file only
```

### Pattern 1: Parameterized WHERE Clause in fetchAllFeatures

**What:** Pass an optional `where` parameter to `fetchAllFeatures()` to allow per-county ArcGIS query filters. Defaults to `"1=1"` for existing rural counties that need full downloads.

**When to use:** Any time a county's full parcel count would exceed safe limits for the import script (Salt Lake County = 350k parcels vs. Carbon County = ~8k).

**Example:**

```javascript
// Source: extension of existing import-ugrc-assessor.mjs fetchAllFeatures()
async function fetchAllFeatures(serviceName, where = "1=1") {
  const url = `${ARCGIS_BASE}/${serviceName}/FeatureServer/0/query`;
  let offset = 0;
  const all = [];

  while (true) {
    const params = new URLSearchParams({
      where,                                    // <-- was hardcoded "1=1"
      outFields: FIELDS,
      returnGeometry: "false",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      f: "json",
    });
    // ... rest of pagination logic unchanged
  }
}
```

### Pattern 2: County Entry with where Override

**What:** The `COUNTIES` array grows one entry. The entry includes an optional `where` field that is passed through to `fetchAllFeatures`.

**Example:**

```javascript
// Source: extension of existing COUNTIES array in import-ugrc-assessor.mjs
const COUNTIES = [
  { name: "Carbon",     service: "Parcels_Carbon_LIR" },
  { name: "Emery",      service: "Parcels_Emery_LIR" },
  { name: "Juab",       service: "Parcels_Juab_LIR" },
  { name: "Millard",    service: "Parcels_Millard_LIR" },
  {
    name: "Salt Lake (84116)",
    service: "Parcels_Salt_Lake_LIR",
    where: "PARCEL_ZIP='84116'",  // CRITICAL: field is PARCEL_ZIP, not ZIP_CODE
  },
];

// In main(), call site changes from:
//   features = await fetchAllFeatures(county.service);
// to:
//   features = await fetchAllFeatures(county.service, county.where);
```

### Pattern 3: Add PARCEL_ZIP to FIELDS

**What:** The `FIELDS` constant must include `PARCEL_ZIP` so the ArcGIS query returns the zip field. Without it, the WHERE clause still filters correctly (ArcGIS applies the filter server-side from the index) but the script receives no zip value in `f.attributes`.

**Note:** The zip value is not actually needed in the UPDATE statement — `normalizeCity()` runs at `upsertProperty()` in the scraper, not here. The UGRC import script only updates `building_sqft`, `year_built`, `assessed_value`, `lot_acres`. However, including `PARCEL_ZIP` in `outFields` enables future logging/validation (e.g., confirming the filter is working by spot-checking `f.PARCEL_ZIP`).

```javascript
// Current:
const FIELDS = "PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,PARCEL_ACRES,PROP_CLASS";

// After change:
const FIELDS = "PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,PARCEL_ACRES,PROP_CLASS,PARCEL_ZIP";
```

### Pattern 4: DB-Side Normalization Gap for Dots

**What:** The existing DB-side WHERE clause in the import script strips hyphens and spaces but NOT dots:

```javascript
// Current — strips hyphens and spaces only:
WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1
```

Salt Lake County parcel IDs in UGRC may use dots as separators. If they do, the `normalizeParcelId()` function (which strips dots) and the DB-side SQL (which does not) will produce a mismatch.

**How to address:** Run the import with the filter first. Check `countyNoMatch` for Salt Lake. If it is above 20%, update the DB-side REPLACE to also strip dots:

```sql
WHERE UPPER(REPLACE(REPLACE(REPLACE(parcel_id, '-', ''), ' ', ''), '.', '')) = $1
```

This is a wait-and-verify step, not a pre-emptive change.

### Anti-Patterns to Avoid

- **Using `where: "ZIP_CODE='84116'"`** — the field is `PARCEL_ZIP`. ArcGIS will return a 400 error or zero records.
- **Using `where: "1=1"` for Salt Lake County** — downloads 350k+ records and times out.
- **Adding Salt Lake County without the `where` override** — same timeout issue.
- **Treating the import as a recurring task** — this is a one-shot enrichment run, not a daily scraper. Run it once, verify match counts, run again if needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ArcGIS pagination | Custom offset tracker | Existing `fetchAllFeatures()` loop with `exceededTransferLimit` check | Already handles the edge case where ArcGIS caps pages below PAGE_SIZE |
| Match rate report | New logging system | Existing `countyUpdated / countyNoMatch / countySkipped` pattern | Already prints exactly what RP-01 requires |
| City tagging | Set city='Rose Park' in the UGRC import | `normalizeCity()` in `scraper/src/lib/upsert.ts` | UGRC import script does NOT call `upsertProperty()` — it does a direct SQL UPDATE by parcel_id. City normalization happens at scraper ingest time, not here. |
| "Rose Park" dropdown | Custom city filter UI | Existing `getDistinctCities()` / `getTargetCitiesList()` | Already returns Rose Park from scraper_config — seeded in Phase 25. |

**Key insight:** The UGRC import script updates `building_sqft`, `year_built`, `assessed_value`, `lot_acres` on rows that already exist in the DB. It does NOT create new property rows and does NOT set `city`. City is set by the scraper's `upsertProperty()` call via `normalizeCity()`. The import script and the city normalization are independent — running the UGRC import does not retag cities.

---

## Common Pitfalls

### Pitfall 1: Wrong Zip Field Name — `ZIP_CODE` vs `PARCEL_ZIP`
**What goes wrong:** The WHERE clause `ZIP_CODE='84116'` returns 0 results or an ArcGIS 400 error. The script completes successfully but fetches 0 parcels for Salt Lake County.
**Why it happens:** Prior planning docs used `ZIP_CODE` as the field name at MEDIUM confidence. The correct field confirmed from official UGRC schema documentation is `PARCEL_ZIP`.
**How to avoid:** Use `where: "PARCEL_ZIP='84116'"` exactly. Verify on first run that the fetch log shows 5,000-15,000 records, not 0.
**Warning signs:** `"Total raw records: 0"` in the console output for Salt Lake County.

### Pitfall 2: Low Match Rate is Expected — Not a Bug
**What goes wrong:** The import reports 95%+ `countyNoMatch` for Salt Lake County and the developer thinks the script is broken.
**Why it happens:** Our DB only contains properties that have distress signals (NODs, tax liens, etc.). The UGRC 84116 parcel set contains ~5k-15k total parcels — most of which are normal homeowners with no distress signal in our system. The match rate for rural counties is also low (Carbon/Juab/Millard) but was validated as correct behavior.
**How to avoid:** Expect `countyNoMatch` to be 90%+ until SLC scrapers add more properties to our DB. A match rate of 5-50 properties is a success if those properties get enriched.
**Warning signs:** Match rate of exactly 0 updated rows combined with non-zero parcels fetched (that would indicate DB-side normalization mismatch, not a data absence issue).

### Pitfall 3: DB-Side Parcel ID Strip Missing Dots
**What goes wrong:** Zero rows updated for Salt Lake County despite parcels being fetched. `countyNoMatch` is high even for properties known to be in the DB.
**Why it happens:** `normalizeParcelId()` strips dots (`[\s\-\.]`) but the DB-side SQL only strips hyphens and spaces. If SLCo UGRC sends `PARCEL_ID` values with dots, the normalized key from the script (no dots) doesn't match the stored parcel_id after the DB-side strip (still has dots).
**How to avoid:** After first run, do a spot-check: take 3 parcel IDs from the UGRC log output, manually check if those same parcel IDs exist in the DB (with or without dots/hyphens). If the IDs exist but are not updating, add dot-stripping to the DB-side REPLACE chain.

### Pitfall 4: RP-06 and RP-07 Are Already Satisfied — Don't Over-Build
**What goes wrong:** Developer adds hardcoded city list to a component or writes a custom getDistinctCities() query.
**Why it happens:** RP-06 ("Rose Park appears in dropdown") and RP-07 ("Rose Park properties appear in grid") look like active implementation tasks.
**How to avoid:** Both are emergent outcomes. `getDistinctCities()` at `queries.ts` line 847-849 is a direct alias for `getTargetCitiesList()` which reads `scraper_config.target_cities`. "Rose Park" is already in that config (Phase 25-02 migration confirmed). The grid and stats bar both filter by `target_cities`. Nothing needs to be built — just run the UGRC import and verify.

### Pitfall 5: Triggering the Script Correctly
**What goes wrong:** Developer tries to run the script in an Azure Function or via npm script and it times out or lacks DATABASE_URL.
**Why it happens:** The script is a local one-shot runner, not an Azure-deployed function.
**How to avoid:** Run it locally via:
```bash
DATABASE_URL=postgresql://... node app/src/scripts/import-ugrc-assessor.mjs
```
Or load `.env.local` first. The script already validates `DATABASE_URL` on startup. Brian runs Node scripts locally against production DB (established pattern from Phase 25 migration runner).

---

## Code Examples

### Complete Modified Script Structure (key diffs only)

```javascript
// Source: app/src/scripts/import-ugrc-assessor.mjs — show only changed sections

// CHANGE 1: Add PARCEL_ZIP to outFields
const FIELDS = "PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,PARCEL_ACRES,PROP_CLASS,PARCEL_ZIP";

// CHANGE 2: Add Salt Lake County with zip filter
const COUNTIES = [
  { name: "Carbon",                service: "Parcels_Carbon_LIR" },
  { name: "Emery",                 service: "Parcels_Emery_LIR" },
  { name: "Juab",                  service: "Parcels_Juab_LIR" },
  { name: "Millard",               service: "Parcels_Millard_LIR" },
  {
    name: "Salt Lake (84116)",
    service: "Parcels_Salt_Lake_LIR",
    where: "PARCEL_ZIP='84116'",  // PARCEL_ZIP confirmed from UGRC schema docs
  },
];

// CHANGE 3: fetchAllFeatures accepts optional where parameter
async function fetchAllFeatures(serviceName, where = "1=1") {
  const url = `${ARCGIS_BASE}/${serviceName}/FeatureServer/0/query`;
  let offset = 0;
  const all = [];
  while (true) {
    const params = new URLSearchParams({
      where,             // <-- was hardcoded "1=1"
      outFields: FIELDS,
      returnGeometry: "false",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE_SIZE),
      f: "json",
    });
    // ... rest unchanged
  }
}

// CHANGE 4: Call site in main() passes county.where
features = await fetchAllFeatures(county.service, county.where);
```

### Verifying RP-01 Match Report Output

The existing logging already produces what RP-01 requires. After a successful run the console will show:

```
== Salt Lake (84116) County ==
Fetching from Parcels_Salt_Lake_LIR...
  Fetched 1000 records (page offset 0)...
  Fetched 2000 records (page offset 1000)...
  ...
  Total raw records: 8247
  Unique parcels after aggregation: 7891
  Updated: 23
  Skipped (no UGRC data): 5
  No match in our DB: 7863

== Summary ==
Total properties enriched: 23
Skipped (no assessor data): 5
No parcel_id match in our DB: 7863
```

This output satisfies the RP-01 success criterion: "logs a match rate report showing how many 84116 parcels were enriched."

### Verifying RP-06 and RP-07 (Dashboard Spot-Check SQL)

After running the UGRC import, run these SQL queries to confirm end-to-end:

```sql
-- Confirm any SLC properties exist and are tagged correctly
SELECT city, county, zip, building_sqft, year_built
FROM properties
WHERE zip = '84116'
LIMIT 10;

-- Confirm Rose Park is in target_cities config
SELECT value FROM scraper_config WHERE key = 'target_cities';

-- Confirm leads exist with distress_score > 0 for Rose Park
SELECT p.city, l.distress_score, l.is_hot_lead
FROM properties p
JOIN leads l ON l.property_id = p.id
WHERE p.city = 'Rose Park'
ORDER BY l.distress_score DESC
LIMIT 10;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `where: "1=1"` for all counties | Per-county `where` override for high-volume counties | Phase 26 | Prevents 350k-parcel timeout for SLC |
| ZIP_CODE assumed as field name | PARCEL_ZIP confirmed from UGRC schema docs | Phase 26 research | WHERE clause will actually work |

**Deprecated/outdated:**
- Any reference to `ZIP_CODE='84116'` as the ArcGIS WHERE clause — the correct field is `PARCEL_ZIP='84116'`.

---

## Open Questions

1. **SLCo parcel ID format — do UGRC values use dots as separators?**
   - What we know: `normalizeParcelId()` strips dots but DB-side SQL does not. UGRC LIR parcel IDs for rural counties use hyphens (already handled). SLC format unconfirmed from UGRC's source data.
   - What's unclear: Whether `Parcels_Salt_Lake_LIR` `PARCEL_ID` values contain dots.
   - Recommendation: Run the import, spot-check 3-5 fetched `PARCEL_ID` values in the console output, compare to what is stored in our DB for any SLC properties. If mismatch, add dot-stripping to DB-side REPLACE. This is a 5-minute diagnostic task at run time.

2. **How many 84116 parcels will the import fetch?**
   - What we know: Rose Park is approximately 15,000-20,000 total parcels in the neighborhood; 84116 includes parts of Poplar Grove and Fair Park, so total may be higher.
   - What's unclear: Exact count — could be 5k-15k based on residential vs. total parcel count.
   - Recommendation: The import log will reveal this immediately. If > 50k records are fetched, the zip filter is likely not applying (wrong field name). Flag and stop.

3. **Will any 84116 properties already in the DB match UGRC parcel IDs?**
   - What we know: Phase 25-02 confirmed 0 SLC rows exist in production DB currently. The UGRC import enriches rows that already exist — it does NOT create new rows.
   - What's unclear: Whether any SLC properties will arrive in the DB before this UGRC import runs (e.g., if utah-legals produces SLC NODs between Phase 25 and Phase 26).
   - Recommendation: Run the UGRC import as soon as possible after Phase 25. If match rate is 0, that is correct and expected. The import establishes the enrichment baseline so future scraper-created rows can be enriched on subsequent runs.

---

## Validation Architecture

> Skipping — `workflow.nyquist_validation` not enabled for this project (no .planning/config.json found with this key). The success criteria are verified via console log output from the script and SQL spot-checks, not automated tests.

---

## Sources

### Primary (HIGH confidence)

- `gis.utah.gov/products/sgid/cadastre/parcels/` — Official UGRC parcel schema documentation. Confirms `PARCEL_ZIP` as the zip field name. Also confirms: `PARCEL_ID`, `PARCEL_ADD`, `PARCEL_CITY`, `BLDG_SQFT`, `BUILT_YR`, `TOTAL_MKT_VALUE`, `PARCEL_ACRES`, `PROP_CLASS` are all valid fields in the LIR layer.
- `app/src/scripts/import-ugrc-assessor.mjs` — Read in full. Confirmed: `fetchAllFeatures()` structure, `FIELDS` constant, `COUNTIES` array, pagination loop with `exceededTransferLimit` guard, per-county match reporting, `normalizeParcelId()` strips `[\s\-\.]`.
- `app/src/lib/queries.ts` — Read relevant sections. Confirmed: `getDistinctCities()` at line 847-849 is a direct alias for `getTargetCitiesList()`. Both `getDashboardStats()` and `getProperties()` call `getTargetCitiesList()` and filter by city. No hardcoded city list exists.
- `.planning/phases/25-rose-park-foundation/25-01-SUMMARY.md` — Confirms `normalizeCity()` is deployed in production. Phase 25-01 commit `25a7be8`.
- `.planning/phases/25-rose-park-foundation/25-02-SUMMARY.md` — Confirms `"Rose Park"` is in `scraper_config.target_cities` in production. `getProperties()` limit raised to 500. Migration 0013 applied.

### Secondary (MEDIUM confidence)

- `opendata.gis.utah.gov/maps/utah-salt-lake-county-parcels-lir` — UGRC Open Data hub page for SLC LIR service. Confirmed service exists. (Field list not directly readable from this page — schema confirmed from gis.utah.gov instead.)
- `.planning/research/PITFALLS.md` — SLC-2 (350k volume), SLC-9 (dot-stripping gap) pitfalls directly applicable to this phase.
- `.planning/research/SUMMARY.md` v1.3 — UGRC integration approach locked. `ZIP_CODE` flagged MEDIUM confidence (now resolved: correct field is `PARCEL_ZIP`).

### Tertiary (LOW confidence — require validation at run time)

- SLCo UGRC parcel count for 84116: estimated 5k-15k based on Rose Park neighborhood size (unitedstateszipcodes.org). Actual count confirmed at import run time.
- SLCo PARCEL_ID dot-separator usage: unconfirmed. Validated by spot-checking console output during import run.

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new packages, existing script extended
- Architecture: HIGH — both the WHERE filter change and the field name correction are based on official UGRC schema documentation
- Pitfalls: HIGH — `PARCEL_ZIP` field name confirmed; volume risk fully documented; match rate expectation set correctly
- RP-06 / RP-07 satisfaction: HIGH — code confirmed by reading queries.ts: `getDistinctCities()` reads scraper_config, "Rose Park" is seeded, filters are city-based and automatic

**Research date:** 2026-04-17
**Valid until:** Stable — UGRC schema changes infrequently. The `PARCEL_ZIP` field name finding is authoritative from official docs.

**Key correction vs. prior research:** All prior planning documents used `ZIP_CODE='84116'` as the ArcGIS WHERE clause. This research confirms from official UGRC parcel schema documentation (`gis.utah.gov/products/sgid/cadastre/parcels/`) that the correct field name is `PARCEL_ZIP`. The WHERE clause must be `PARCEL_ZIP='84116'`. This is the single most important finding of this research phase.
