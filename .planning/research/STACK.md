# Technology Stack

**Project:** HouseFinder v1.1 — UGRC Assessor Data Enrichment + XChange Court Record Intake
**Researched:** 2026-04-10
**Confidence:** HIGH for UGRC (script already written and proven); MEDIUM for XChange parsing (approach is pattern-matching, no existing implementation to verify against)

---

## What Already Exists (Do Not Re-Research)

The v1.0 app is fully deployed on Netlify with this confirmed stack:

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 15.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | v4 + @base-ui/react |
| Database | Azure PostgreSQL (Flexible Server) | — |
| ORM | Drizzle ORM | 0.45.x |
| Direct SQL | `pg` | 8.x |
| Maps | Mapbox GL / react-map-gl | 3.x / 8.x |
| Email | Resend + @react-email/components | — |
| Skip trace | Tracerfy | — |
| Auth | NextAuth v5 beta | 5.0.0-beta.30 |
| Validation | Zod | 4.x |
| Dates | date-fns | 4.x |

**Nothing in this list needs to change for v1.1.**

---

## New Capabilities Required

### 1. UGRC Assessor Data Import

#### What It Is

UGRC (Utah Geographic Reference Center) maintains the State Geographic Information Database (SGID). County assessors voluntarily share tax roll data through the Land Information Records (LIR) work group. UGRC standardizes this into a common schema across all 29 Utah counties.

#### Access Method: ArcGIS FeatureServer (NOT the UGRC Geocoder API)

**Two UGRC data access paths exist. Use the FeatureServer, not the Geocoder.**

| Path | URL | Purpose | Auth | Rate Limit |
|------|-----|---------|------|-----------|
| UGRC Geocoder API | `api.mapserv.utah.gov` | Address-to-coordinate conversion | API key required (free, UtahID account) | Not rate limited; "use responsibly" |
| ArcGIS FeatureServer | `services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services` | Bulk parcel attribute download | None (public) | Not documented; no issues observed in practice |

**Use the ArcGIS FeatureServer.** The import script (`src/scripts/import-ugrc-assessor.mjs`) already uses this path and is proven to work. It hits per-county FeatureServer layers directly with no auth required.

The UGRC Geocoder API is for geocoding addresses to lat/lng, not for bulk assessor attribute downloads. Do not use it for this milestone.

#### Per-County FeatureServer Layer Names

Each county has its own service under the UGRC ArcGIS account:

```
https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/Parcels_{County}_LIR/FeatureServer/0/query
```

Confirmed layer names for target counties:
- `Parcels_Carbon_LIR`
- `Parcels_Emery_LIR`
- `Parcels_Juab_LIR`
- `Parcels_Millard_LIR`

Additional counties available if scope expands: Sanpete, Sevier, Grand, Wayne (verify service names via opendata.gis.utah.gov before scripting).

#### LIR Parcel Data Fields

Fields available in each county LIR service (availability varies by county — rural counties share less):

| Field | Type | Notes |
|-------|------|-------|
| `PARCEL_ID` | string | Match key to our `properties.parcel_id` |
| `BLDG_SQFT` | integer | Building square footage; may have multiple records per parcel |
| `BUILT_YR` | integer | Year built |
| `EFFBUILT_YR` | integer | Effective year built (use as fallback) |
| `TOTAL_MKT_VALUE` | float | Total assessed market value |
| `LAND_MKT_VALUE` | float | Land-only value |
| `PARCEL_ACRES` | float | Lot size in acres |
| `PROP_CLASS` | string | Property classification code |
| `CONST_MATERIAL` | string | Construction material |
| `FLOORS_CNT` | integer | Number of floors |

#### Update Frequency

- Carbon, Emery, Juab, Millard: Rural counties — quarterly to annual updates
- No webhook or push mechanism exists; pull via scheduled script

#### Query Pattern

```
GET /FeatureServer/0/query?where=1%3D1&outFields=PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,PARCEL_ACRES,PROP_CLASS&returnGeometry=false&resultOffset=0&resultRecordCount=1000&f=json
```

ArcGIS returns max 1,000 features per page. Paginate using `resultOffset`. Page size of 1,000 is the observed default max. The existing script handles this correctly.

#### No New Dependencies Required

The import script uses only:
- `pg` (already in `package.json`) — for direct SQL upserts against Azure PostgreSQL
- Native `fetch` (Node 18+) — for ArcGIS FeatureServer HTTP calls

**No new npm packages needed for UGRC import.** The script is already written in `src/scripts/import-ugrc-assessor.mjs`.

#### Schema Impact

The `properties` table already has the UGRC fields stubbed in schema.ts (lines 59-63):
- `building_sqft` (integer)
- `year_built` (integer)
- `assessed_value` (integer)
- `lot_acres` (numeric 10,4)

No schema migration needed.

#### Open SGID (Alternative — Avoid for This Use Case)

UGRC also exposes a public read-only PostgreSQL database:
- Host: `opensgid.ugrc.utah.gov:5432`
- DB: `opensgid`
- Credentials: `agrc` / `agrc` (public, in GitHub readme)

This is useful for ad-hoc GIS queries but is the wrong tool here. The FeatureServer approach is faster for bulk export, requires no direct DB connection from Netlify functions, and is already implemented.

---

### 2. XChange Court Record Intake

#### What XChange Is

Utah Courts XChange (`xchange.utcourts.gov`) is the state's district and justice court case search portal, backed by CORIS (Courts Information System). It holds all district court filings since July 1, 2010, including foreclosure/mortgage cases, probate, and civil cases that generate distress signals.

#### Access Reality — No API, No Bulk Export

XChange has no public API. It is a subscription web portal with per-search pricing.

| Tier | Setup | Monthly | Included Searches | Extra Search | Document |
|------|-------|---------|------------------|-------------|---------|
| One-time account | $10 | $0 | 0 (pay per search) | $0.35 | $1.00 |
| Monthly subscription | $25 | $40 | 500 | $0.35 | $1.00 |

**The correct approach for this project is agent-assisted browser workflow, not automated scraping.** The user logs into XChange via browser, searches for cases by county and case type, copies/exports the results, and pastes them into the HouseFinder import UI. The HouseFinder app parses the pasted text and creates distress signals.

This is explicit in the milestone context: "agent-assisted browser workflow (NOT automated scraper)."

#### Case Types to Target

From the official Case Type Codes page (`utcourts.gov/en/court-records-publications/records/xchange/case.html`):

| Code | Name | Signal Type |
|------|------|------------|
| `LM` | Lien/Mortgage Foreclosure | `lis_pendens` |
| `ES` | Estate / Personal Representative | `probate` |
| `CO` | Conservatorship | `probate` |
| `GM` | Guardian - Minor | `probate` |
| `GT` | Guardian - Adult | `probate` |
| `EV` | Eviction | `lis_pendens` (post-foreclosure occupancy) |
| `IF` | Infraction | `code_violation` |
| `MO` | Other Misdemeanor | `code_violation` |

#### What XChange Returns Per Case

Based on the help documentation, each case record surfaces:
- Case number, case type code, filing date
- Party names and addresses (when available)
- Court location and assigned judge
- Attorneys of record
- Event history (proceedings, hearings, judgments)

The user search result list shows: County, Case Number, Case Type, Filing Date, Party Name(s), Disposition.

#### Parsing Approach: Regex Over LLM

For XChange text output, **regex/keyword pattern matching is the right approach**, not NLP/LLM. Reasons:

1. The text structure is semi-structured and consistent (CORIS system generates it uniformly)
2. Case type codes (`LM`, `ES`, `IF`) are definitive signal classifiers — no inference needed
3. Field labels are explicit ("Case Number:", "Filing Date:", "Plaintiff:", "Defendant:")
4. No legal interpretation required — just field extraction and signal classification

Regex patterns to implement:

```typescript
// Case type → signal type mapping
const CASE_TYPE_TO_SIGNAL: Record<string, SignalType> = {
  LM: 'lis_pendens',   // Lien/Mortgage Foreclosure
  ES: 'probate',       // Estate
  CO: 'probate',       // Conservatorship
  GM: 'probate',       // Guardian Minor
  GT: 'probate',       // Guardian Adult
  EV: 'lis_pendens',   // Eviction (post-foreclosure)
  IF: 'code_violation',
  MO: 'code_violation',
};

// Extraction patterns
const CASE_NUMBER = /Case\s+(?:No|Number)[:\s]+([A-Z0-9\-]+)/i;
const FILING_DATE = /(?:Filing|Filed)\s+Date[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i;
const CASE_TYPE = /Case\s+Type[:\s]+([A-Z]{2})\b/i;
const PARTY_NAME = /(?:Defendant|Respondent)[:\s]+([^\n]+)/i;
const PARTY_ADDRESS = /Address[:\s]+([^\n]+)/i;
```

The existing `signalTypeEnum` in schema.ts already supports all required signal types: `nod`, `tax_lien`, `lis_pendens`, `probate`, `code_violation`, `vacant`.

#### No New Dependencies Required for Parsing

Pattern matching uses native JavaScript RegExp. No new packages needed.

The `distress_signals` table already exists with the correct schema:
- `property_id` (FK to properties)
- `signal_type` (enum: matches all XChange case types)
- `recorded_date`
- `source_url`
- `raw_data` (store original XChange case text for audit)

#### Property Matching Strategy

XChange records contain defendant name + address, not parcel ID. Matching to existing `properties` records requires address-based fuzzy lookup:

```typescript
// Match by normalized address string
// Normalize: lowercase, remove punctuation, collapse whitespace
// Query: SELECT id FROM properties WHERE lower(address) LIKE '%123 main%' AND city ILIKE '%price%'
```

This is a `ILIKE` query against `properties.address` and `properties.city`. No new library needed — use existing Drizzle ORM queries or raw `pg` SQL.

**Unmatched records** (no property found for the case address) should be surfaced in the import UI as "unmatched cases" for manual review. Do not silently drop them.

---

## What NOT to Add

| Avoid | Why |
|-------|-----|
| UGRC Geocoder API (`api.mapserv.utah.gov`) | This API is for geocoding addresses to coordinates, not for bulk parcel attribute download. Requires UtahID account and API key. The FeatureServer is already implemented and needs no auth. |
| `@arcgis/core` or `esri-leaflet` | Heavy Esri client SDKs are for building map applications, not for bulk data fetch. The ArcGIS REST API is just HTTP — native `fetch` is all you need. |
| LLM-based court record parsing | XChange records are semi-structured with explicit field labels and definitive case type codes. LLM adds cost, latency, and hallucination risk to a problem that regex solves cleanly. |
| `natural`, `compromise`, or `nlp.js` | NLP libraries are for unstructured text. XChange output is structured enough for regex. If it proves inadequate, revisit — but try regex first. |
| Playwright or headless browser automation for XChange | Utah Courts Terms of Service do not authorize automated scraping. The subscription model ($0.35/search) implies per-search billing; automated scraping would both violate ToS and generate unexpected cost. Agent-assisted manual workflow is the right design. |
| Open SGID direct PostgreSQL connection | Adds a second external DB connection from Netlify functions. The FeatureServer HTTP approach is already working and requires no credentials or connection pool management. |
| Any paid court record API (CourtListener, StateRecords.org) | These cover federal courts or aggregate state records with paid tiers. Utah has no official third-party API. XChange is the authoritative source. |

---

## Integration Points with Existing Code

| New Feature | Integrates With | How |
|------------|----------------|-----|
| UGRC import script | `properties` table (Azure PostgreSQL) | `COALESCE` UPDATE by `parcel_id` — already implemented in `import-ugrc-assessor.mjs` |
| UGRC import trigger | Netlify scheduled function or manual run via `node src/scripts/import-ugrc-assessor.mjs` | No UI needed; script runs on demand or cron |
| XChange parser | `distress_signals` table | INSERT with `source='xchange'` and `raw_data` = original case text |
| XChange import UI | New Next.js Server Action in `src/lib/` | Paste-to-parse form → validate → insert signals → revalidatePath('/') |
| Unmatched XChange cases | Property lookup in `properties` table | `ILIKE` address match; surface misses in UI |
| Signal deduplication | `uq_distress_signal_dedup` index on `(property_id, signal_type, recorded_date)` | Drizzle `onConflictDoNothing()` — already defined in schema |

---

## No Installation Required

All dependencies for the new features are already in `package.json`:

| Existing Package | Used For |
|-----------------|---------|
| `pg` ^8.20.0 | UGRC import script DB connection |
| `drizzle-orm` ^0.45.1 | XChange signal inserts via Server Actions |
| `zod` ^4.3.6 | Validate parsed XChange fields before DB insert |
| `date-fns` ^4.1.0 | Normalize XChange `Filing Date` string to Date object |
| Native `fetch` (Node 18+) | ArcGIS FeatureServer HTTP requests |
| Native `RegExp` | XChange text parsing |

**No `npm install` commands needed for this milestone.**

---

## Scheduling: UGRC Import

The UGRC import is a manual/periodic operation (LIR data updates quarterly for rural counties). Two delivery options:

| Option | How | When to Use |
|--------|-----|------------|
| Manual CLI script | `node src/scripts/import-ugrc-assessor.mjs` from local machine or Netlify shell | Simplest. Run when UGRC data is known to have updated. |
| Netlify Scheduled Function | Add `netlify/functions/ugrc-import.mts` with `schedule: "0 6 1 */3 *"` (quarterly) | If fully automated refresh is wanted in a future phase. |

For v1.1, the manual CLI approach is sufficient. The script is already written and tested.

---

## Sources

- ArcGIS FeatureServer layer verification: `opendata.gis.utah.gov/maps/utah::utah-carbon-county-parcels-lir` — confirmed Carbon County LIR service exists and is public
- UGRC parcel field documentation: `gis.utah.gov/products/sgid/cadastre/parcels/` — confirmed `BLDG_SQFT`, `BUILT_YR`, `TOTAL_MKT_VALUE`, `PARCEL_ACRES`, `PROP_CLASS` field names (HIGH confidence — official UGRC documentation)
- UGRC Geocoder API: `api.mapserv.utah.gov/getting-started/` — confirmed API key requirement and "Desktop key" type needed for server-side use; NOT used for this milestone
- Open SGID credentials: `github.com/agrc/open-sgid` — host `opensgid.ugrc.utah.gov`, user `agrc`, pass `agrc` (publicly documented)
- XChange subscription tiers: `utcourts.gov/en/court-records-publications/records/xchange/subscribe.html` — confirmed $25 setup + $40/month for 500 searches, $0.35/search overage, $1.00/document (HIGH confidence — official source)
- XChange case type codes: `utcourts.gov/en/court-records-publications/records/xchange/case.html` — confirmed LM (foreclosure), ES/CO/GM/GT (probate), IF/MO (code violations) (HIGH confidence — official source)
- Existing import script: `app/src/scripts/import-ugrc-assessor.mjs` — already implemented using ArcGIS FeatureServer with pagination, aggregation, and COALESCE upsert logic
- Existing schema: `app/src/db/schema.ts` — UGRC fields already stubbed, distress_signals table already supports all required signal types

---

*Updated: 2026-04-10 — Milestone: v1.1 UGRC + XChange*
