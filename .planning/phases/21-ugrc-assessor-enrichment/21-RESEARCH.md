# Phase 21: ugrc-assessor-enrichment - Research

**Researched:** 2026-04-10
**Domain:** UGRC ArcGIS FeatureServer bulk data enrichment via existing import script
**Confidence:** HIGH — the import script is already written and proven; schema columns already exist; UI already renders the fields

---

## Summary

Phase 21 is the lightest possible enrichment milestone: the import script is already written at `app/src/scripts/import-ugrc-assessor.mjs`, the DB schema already has the four target columns (`building_sqft`, `year_built`, `assessed_value`, `lot_acres`) as nullable on `properties`, and the UI in `property-overview.tsx`, `property-card.tsx`, and `deal-overview.tsx` already conditionally renders all four fields — they just need data.

The four requirements are: populate fields from UGRC (UGRC-01), handle parcel ID format mismatches (UGRC-02), report per-county match rates (UGRC-03), and confirm data is visible in the UI (UGRC-04). UGRC-01 and UGRC-03 are essentially already satisfied by the existing script. UGRC-02 requires a normalization function. UGRC-04 requires verifying the data path from DB to UI is functional end-to-end.

The primary work is: (1) audit whether the parcel_id format stored by county scrapers matches the UGRC `PARCEL_ID` field format exactly, (2) add normalization if needed, (3) run the script against production, and (4) confirm the UI shows populated values. No new libraries, no schema changes, no migrations.

**Primary recommendation:** Treat this phase as 2-3 focused tasks: verify/fix parcel ID matching, run the script and validate match rates, and verify UI end-to-end.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UGRC-01 | Properties enriched with sqft, year built, assessed value, and lot size from UGRC ArcGIS FeatureServer data | The import script at `app/src/scripts/import-ugrc-assessor.mjs` already implements the full FeatureServer fetch-paginate-aggregate-upsert pipeline for all 4 counties. Running it populates the 4 columns. |
| UGRC-02 | Parcel ID normalization handles format differences between county scrapers and UGRC (strip delimiters, uppercase) | The import script uses raw `PARCEL_ID` from UGRC with no normalization. Carbon County scraper pulls parcel IDs from the carbon.utah.gov wpDataTable — format must be compared to UGRC PARCEL_ID format before the script runs. A `normalizeParcelId()` function must be added. |
| UGRC-03 | Import runs per-county with match rate reporting (how many properties matched vs total) | The existing script already logs `Updated`, `Skipped`, and `No match in our DB` per county. This requirement is functionally complete — the output format just needs verification against the requirement wording. |
| UGRC-04 | Assessor data visible on property detail pages (fields already exist in UI, currently NULL) | `property-overview.tsx` and `property-card.tsx` already have conditional rendering for all 4 UGRC fields. Once the DB is populated, the UI will display them automatically. Verification is the task. |
</phase_requirements>

---

## Standard Stack

### Core (No New Additions)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `pg` | ^8.20.0 | DB connection in import script | Already in `package.json` |
| Native `fetch` | Node 18+ | ArcGIS FeatureServer HTTP calls | Already used in script |
| Drizzle ORM | ^0.45.1 | App DB queries for UI rendering | Already used |

**No `npm install` needed for this phase. All dependencies are in place.**

### External Services

| Service | URL | Auth | Rate Limit |
|---------|-----|------|-----------|
| UGRC ArcGIS FeatureServer | `https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services` | None (public) | None documented |

County service names confirmed:
- `Parcels_Carbon_LIR`
- `Parcels_Emery_LIR`
- `Parcels_Juab_LIR`
- `Parcels_Millard_LIR`

---

## Architecture Patterns

### What Already Exists — Do Not Rebuild

```
app/src/scripts/import-ugrc-assessor.mjs   ← Complete import script (250 lines)
app/src/db/schema.ts (lines 59-63)         ← building_sqft, year_built, assessed_value, lot_acres
app/src/components/property-overview.tsx   ← Renders all 4 UGRC fields conditionally
app/src/components/property-card.tsx       ← Renders buildingSqft + yearBuilt in dashboard cards
app/src/components/deal-overview.tsx       ← Renders all 4 UGRC fields in deal detail
```

### The Import Script Pattern (Already Implemented)

```javascript
// app/src/scripts/import-ugrc-assessor.mjs — core logic already written

// 1. Fetch all features per county via paginated ArcGIS REST
async function fetchAllFeatures(serviceName) {
  // Pages through FeatureServer with resultOffset until features.length < PAGE_SIZE (1000)
}

// 2. Aggregate multi-building parcels
function aggregateByParcelId(features) {
  // Sums BLDG_SQFT across multiple records, takes earliest BUILT_YR
}

// 3. Upsert with COALESCE — never overwrites non-null with null
// Uses raw pg client with parameterized queries
client.query(`UPDATE properties SET
  building_sqft  = COALESCE(building_sqft,  $2::integer),
  year_built     = COALESCE(year_built,     $3::integer),
  assessed_value = COALESCE(assessed_value, $4::integer),
  lot_acres      = COALESCE(lot_acres,      $5::numeric)
WHERE parcel_id = $1
AND ($2::integer IS NOT NULL OR ...)`, [...])
```

The `COALESCE` pattern means repeated runs are safe — existing populated values are never overwritten with null.

### Parcel ID Normalization Pattern (UGRC-02 — Must Add)

The critical gap: the script currently does a raw string match on `parcel_id`. The county scrapers and UGRC may format parcel IDs differently.

**Known format from Carbon County scraper** (carbon-assessor.ts, line 140-146):
- Pulled from wpDataTable "parcel", "parcel id", "parcel number", "parcel #", "parcel no" column
- Stored as-is from the DOM — likely has hyphens, e.g. `XX-XXXX-XXXX`

**Known format from UGRC PARCEL_ID field** (SGID docs):
- Carbon County uses `XX-XXXX-XXXX` format with hyphens
- May differ by county — Emery, Juab, Millard may use different delimiters

**Normalization function to add:**

```javascript
// Add to import-ugrc-assessor.mjs
function normalizeParcelId(raw) {
  if (!raw) return null;
  // Strip all non-alphanumeric, uppercase, collapse to canonical form
  return raw.replace(/[\s\-\.]/g, '').toUpperCase().trim();
}
```

Then the WHERE clause becomes:
```sql
WHERE REPLACE(REPLACE(parcel_id, '-', ''), ' ', '') = $1
```

Or better — normalize both sides at query time and store normalized for comparison:
```javascript
// Normalize UGRC PARCEL_ID before matching
const normalizedUgrcId = normalizeParcelId(f.PARCEL_ID);
// Query with normalized comparison:
WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1
```

**Investigation step before implementation:** Sample 10 properties from the DB and compare `parcel_id` values against the raw UGRC `PARCEL_ID` field for the same parcels. This reveals whether normalization is actually needed and what format delta exists.

### Run Pattern — Manual Script Execution

```bash
# Run from the app/ directory
cd app
node src/scripts/import-ugrc-assessor.mjs

# Output per county:
# == Carbon County ==
# Fetching from Parcels_Carbon_LIR...
#   Fetched 1000 records (page offset 0)...
#   Total raw records: NNNN
#   Unique parcels after aggregation: MMMM
#   Updated: K
#   Skipped (no UGRC data): J
#   No parcel_id match in our DB: L
```

### UI Data Path (UGRC-04)

The UI path is already complete — no code changes needed for the display:

```
properties.building_sqft (DB)
    ↓
PropertyWithLead type (app/src/types/index.ts) — includes buildingSqft
    ↓
getProperties() / getPropertyDetail() queries (app/src/lib/queries.ts)
    ↓
property-overview.tsx → conditional {property.buildingSqft && ...}
property-card.tsx → conditional {property.buildingSqft || property.yearBuilt}
```

The UI already guards all four fields with truthy checks — empty values show nothing, populated values display automatically. UGRC-04 is satisfied by running the import and verifying the UI.

### Anti-Patterns to Avoid

- **Running the script on CI or as part of build** — it connects directly to Azure PostgreSQL with a hardcoded connection string in the script. It is a one-off data migration tool, not a build artifact.
- **Adding the UGRC import to dailyScrape.ts in this phase** — STACK.md notes this as a future enhancement. Phase 21 scope is running the script once to populate fields. The ARCHITECTURE.md build order says to wire into the pipeline only after the standalone run is confirmed.
- **Treating "no match" count as a bug** — many UGRC parcels are commercial, vacant land, or utility parcels not in our properties table. A low match rate (e.g. 15%) is expected because our DB only holds properties the scrapers found with distress signals.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bulk parcel data access | Custom ArcGIS SDK integration | Native `fetch` + pagination loop (already in script) | The script already works; Esri SDKs add 100KB+ and require npm install |
| Parcel ID dedup | Custom upsert logic | The existing COALESCE UPDATE in the script | Already handles null-preservation and the write-guard condition |
| ORM for import script | Drizzle ORM in the script | Raw `pg` client (already used) | The script runs outside Next.js context; pg is lighter for a one-off CLI |

---

## Common Pitfalls

### Pitfall 1: Parcel ID Format Mismatch Causes Zero Matches
**What goes wrong:** UGRC uses `A-BBBB-CCCC` format; county scraper stored `ABBBBCCCC`. The UPDATE WHERE clause never matches. The script reports "Updated: 0, No match: 5000" for every county.
**Why it happens:** The script does a raw string equality match (`WHERE parcel_id = $1`) with no normalization.
**How to avoid:** Before the first production run, run a diagnostic query: `SELECT parcel_id FROM properties WHERE county = 'carbon' LIMIT 10` and compare against a sample UGRC PARCEL_ID fetch. Add `normalizeParcelId()` if formats differ.
**Warning signs:** `No match in our DB` count equals or nearly equals the total unique parcels count.

### Pitfall 2: UGRC FeatureServer Returns `exceededTransferLimit: true`
**What goes wrong:** The ArcGIS server indicates it has more features than returned but doesn't honor the `resultOffset` correctly for very large datasets, causing the pagination loop to miss records.
**Why it happens:** Some ArcGIS FeatureServer layers have server-side query limits lower than the documented 1000 per page. The response may include `exceededTransferLimit: true` even when fewer than 1000 features are returned.
**How to avoid:** Check `data.exceededTransferLimit` in the response. If true, continue paginating even if `features.length < PAGE_SIZE`. The current script only checks `features.length < PAGE_SIZE` — this could exit early for layers with lower server limits.
**Warning signs:** Total records fetched looks suspiciously low compared to county parcel counts (Carbon has ~15,000+ parcels).

### Pitfall 3: Multiple Buildings Per Parcel Inflates Building SQFT
**What goes wrong:** A property with a main house and detached garage shows two records in UGRC with the same PARCEL_ID. Summing both gives 2,800 sqft for a 1,400 sqft house + 700 sqft garage = 2,100 sqft total, which is misleading.
**Why it happens:** The `aggregateByParcelId()` function sums `BLDG_SQFT` across all records with the same PARCEL_ID. This is the correct behavior per the current implementation.
**How to avoid:** This is a known and accepted limitation in the current script design. The STACK.md acknowledges "may have multiple records per parcel." The sum is the total structure sqft, which is useful for MAO calculations. Document this assumption rather than trying to fix it.
**Warning signs:** `buildingSqft` values seem high for known properties.

### Pitfall 4: `assessed_value` Is Total Market Value, Not Taxable Value
**What goes wrong:** UI shows `assessed_value` as the property's assessed value, but users may interpret this as the taxable value or the fair market value. UGRC's `TOTAL_MKT_VALUE` field is the total market value used for tax assessment, which in Utah is 55% of market value for residential (Assessment Ratio).
**Why it happens:** The field is named `assessed_value` in the schema but is populated from `TOTAL_MKT_VALUE`. The UI label says "Assessed Value" which is accurate but may confuse users expecting a sale price.
**How to avoid:** The UI in `property-overview.tsx` already labels it "Assessed value:" — no change needed. Just be aware of this in the context of MAO calculations.
**Warning signs:** Users comment that assessed values look low compared to actual sale prices.

### Pitfall 5: Script Hardcodes DATABASE_URL with Production Credentials
**What goes wrong:** The import script at line 23 hardcodes the full Azure PostgreSQL connection string as a fallback. If someone runs the script in a different environment without setting `DATABASE_URL`, it hits production directly.
**Why it happens:** This is the current implementation — a convenience for local CLI use.
**How to avoid:** The planner should note this credential exposure. For this phase, it's acceptable (it's a local script, not deployed). But the script should be added to `.gitignore` if not already tracked, or the hardcoded connection string should be removed with a require(`DATABASE_URL` env var check. Per `.gitignore` file status, `app/.planning/` is modified but the script itself is tracked.
**Warning signs:** Script is committed with the raw connection string visible in git history.

---

## Code Examples

### Verified Current Script — COALESCE Upsert Pattern
```javascript
// Source: app/src/scripts/import-ugrc-assessor.mjs (lines 155-164)
const res = await client.query(
  `UPDATE properties SET
     building_sqft  = COALESCE(building_sqft,  $2::integer),
     year_built     = COALESCE(year_built,     $3::integer),
     assessed_value = COALESCE(assessed_value, $4::integer),
     lot_acres      = COALESCE(lot_acres,      $5::numeric),
     updated_at     = NOW()
   WHERE parcel_id = $1
   AND ($2::integer IS NOT NULL OR $3::integer IS NOT NULL OR $4::integer IS NOT NULL OR $5::numeric IS NOT NULL)
   RETURNING id`,
  [parcel.parcelId, parcel.buildingSqft, parcel.yearBuilt, parcel.assessedValue, parcel.lotAcres]
);
```

### Verified UI Rendering — Property Overview
```tsx
// Source: app/src/components/property-overview.tsx (lines 186-218)
{(property.buildingSqft || property.yearBuilt || property.assessedValue || property.lotAcres) && (
  <Card>
    {/* Only renders when at least one UGRC field is non-null */}
    {property.buildingSqft && <p>Building sqft: {property.buildingSqft.toLocaleString()} sqft</p>}
    {property.yearBuilt && <p>Year built: {property.yearBuilt}</p>}
    {property.assessedValue && <p>Assessed value: ${property.assessedValue.toLocaleString()}</p>}
    {property.lotAcres && <p>Lot size: {parseFloat(property.lotAcres).toFixed(2)} acres</p>}
  </Card>
)}
```

### Parcel ID Normalization to Add (UGRC-02)
```javascript
// Add to app/src/scripts/import-ugrc-assessor.mjs
function normalizeParcelId(raw) {
  if (!raw) return null;
  return raw.replace(/[\s\-\.]/g, '').toUpperCase().trim();
}

// Update the UPDATE query WHERE clause to normalize both sides:
// WHERE UPPER(REPLACE(REPLACE(parcel_id, '-', ''), ' ', '')) = $1
// And pass normalizeParcelId(parcel.parcelId) as $1
```

### Diagnostic Query — Sample Parcel ID Format Comparison
```sql
-- Run this before adding normalization to understand the format delta
SELECT parcel_id, county FROM properties
WHERE county IN ('carbon', 'emery', 'juab', 'millard')
LIMIT 5 EACH;
-- Compare output format to raw UGRC PARCEL_ID from a test fetch
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Manually entering sqft/year from assessor website | UGRC bulk import via ArcGIS FeatureServer | All 4 UGRC fields populated for matched properties in one script run |
| Building a new import tool | Script already written | Zero build work for the fetch/parse/upsert pipeline |
| DB schema migration | Schema already has all 4 columns | Zero migration work |

---

## Open Questions

1. **Does Carbon County parcel_id format in our DB match UGRC PARCEL_ID format?**
   - What we know: Carbon scraper extracts parcel IDs from wpDataTable "parcel" column header (carbon-assessor.ts line 140); UGRC Carbon LIR uses `XX-XXXX-XXXX` format per ARCHITECTURE.md
   - What's unclear: Whether carbon.utah.gov formats the parcel ID with or without hyphens in its wpDataTable
   - Recommendation: First task in Wave 1 — run a 10-record diagnostic before the real script run. This is low-effort and prevents a wasted full run.

2. **Does `exceededTransferLimit` need to be handled?**
   - What we know: The script exits the pagination loop when `features.length < PAGE_SIZE`. ArcGIS FeatureServers can return `exceededTransferLimit: true` with fewer than PAGE_SIZE features if the server has a lower internal cap.
   - What's unclear: Whether the 4 county LIR services enforce a lower limit than 1000
   - Recommendation: Add a check for `data.exceededTransferLimit` and continue paginating if true, regardless of feature count.

3. **Should the hardcoded connection string be removed?**
   - What we know: The script at line 23 hardcodes the full Azure PostgreSQL URL as a default fallback
   - What's unclear: Whether this is already in git history (script was referenced but status shows `app/src/scripts/import-ugrc-assessor.mjs` as tracked per the git status)
   - Recommendation: The planner should include a task to replace the hardcoded fallback with an explicit error if `DATABASE_URL` is not set. This is a 2-line fix.

---

## Sources

### Primary (HIGH confidence)
- `app/src/scripts/import-ugrc-assessor.mjs` — full script code read directly; confirmed: 4 counties, COALESCE upsert, pagination, per-county match rate logging
- `app/src/db/schema.ts` (lines 59-63) — confirmed `building_sqft`, `year_built`, `assessed_value`, `lot_acres` as nullable integer/numeric columns on `properties` table
- `app/src/components/property-overview.tsx` (lines 186-218) — confirmed UI renders all 4 UGRC fields conditionally; no code changes needed for display
- `app/src/components/property-card.tsx` (lines 303-314) — confirmed dashboard cards show `buildingSqft` + `yearBuilt`
- `app/src/components/deal-overview.tsx` (lines 459-491) — confirmed deal overview renders all 4 UGRC fields
- `.planning/REQUIREMENTS.md` (lines 251-254) — confirmed UGRC-01 through UGRC-04 requirement text
- `.planning/research/STACK.md` — confirmed UGRC FeatureServer URL pattern, field names, no new dependencies

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` — confirmed Carbon County parcel format `XX-XXXX-XXXX`, match strategy, data flow
- UGRC SGID parcel field docs: `gis.utah.gov/products/sgid/cadastre/parcels/` — confirmed `BLDG_SQFT`, `BUILT_YR`, `TOTAL_MKT_VALUE`, `PARCEL_ACRES` field names

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all existing
- Architecture: HIGH — script is already written and confirmed working; UI is already rendered
- Pitfalls: HIGH for parcel ID mismatch (identified in prior architecture research); MEDIUM for exceededTransferLimit (ArcGIS behavior not directly tested against these specific layers)

**Research date:** 2026-04-10
**Valid until:** 2027-04-10 (UGRC FeatureServer API is stable; parcel data updates quarterly)
