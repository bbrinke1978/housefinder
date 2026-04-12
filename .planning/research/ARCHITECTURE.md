# Architecture Patterns: UGRC Assessor Import + XChange Court Record Intake

**Domain:** Distressed property lead generation — data enrichment milestone
**Researched:** 2026-04-10
**Confidence:** HIGH for existing system (code confirmed); MEDIUM for UGRC REST API (confirmed field names via official SGID docs, endpoint URLs not directly verified); MEDIUM for XChange (no API exists, browser-only confirmed via official docs)

---

## What Already Exists (Do Not Rebuild)

The v1.0 system shipped with these integration points that the new milestone plugs into:

| Existing Component | Location | Relevant for This Milestone |
|--------------------|----------|-----------------------------|
| `properties` table | `app/src/db/schema.ts` | UGRC fields (`building_sqft`, `year_built`, `assessed_value`, `lot_acres`) already defined and nullable |
| `distressSignals` table | `app/src/db/schema.ts` | Court records become rows here; `signalTypeEnum` includes `probate` and `lis_pendens` already |
| `upsertProperty()` | `scraper/src/lib/upsert.ts` | Deduplicates on `parcel_id`; UGRC import extends this pattern |
| `upsertSignal()` | `scraper/src/lib/upsert.ts` | Court record signals use this directly |
| `scoreAllProperties()` | `scraper/src/scoring/score.ts` | Called after signal insertion; court record signals are automatically included |
| `signalTypeEnum` | `app/src/db/schema.ts` | `"probate"` and `"lis_pendens"` already in enum — no schema change for foreclosure/probate |
| Daily scrape pipeline | `scraper/src/functions/dailyScrape.ts` | UGRC import runs as a parallel step in this pipeline |
| `PropertyWithLead` type | `app/src/types/index.ts` | Already includes `buildingSqft`, `yearBuilt`, `assessedValue`, `lotAcres` |

**Key insight:** The schema already anticipates UGRC data. The `building_sqft`, `year_built`, `assessed_value`, and `lot_acres` columns exist as nullable on `properties`. The `PropertyWithLead` type already exposes them. The UGRC import just needs to fill them in.

---

## Component Map: New vs Modified

### New Components (must be built from scratch)

| Component | Type | Location (suggested) | Purpose |
|-----------|------|----------------------|---------|
| `import-ugrc-assessor.ts` | Script (one-shot + scraper source) | `scraper/src/sources/ugrc-assessor.ts` | Fetches UGRC LIR CSV for target counties, parses, upserts UGRC fields onto existing property rows |
| `xchange-parser.ts` | Library module | `scraper/src/lib/xchange-parser.ts` | Parses raw XChange case detail text (copy-pasted by agent) into structured `CourtRecord` objects |
| `xchange-intake.ts` | Server action or API route | `app/src/lib/xchange-intake.ts` | Receives parsed court records, matches to properties, inserts distress signals, triggers re-score |
| `/api/court-intake` route | Next.js API route | `app/src/app/api/court-intake/route.ts` | POST endpoint accepting structured court record payloads from the agent-assisted workflow |
| `court_intake_runs` table | DB table (migration) | `app/drizzle/` | Audit log of each XChange intake session: run date, case count, matched count, new signals created |

### Modified Components (extend, do not rewrite)

| Component | What Changes | Risk |
|-----------|--------------|------|
| `scraper/src/functions/dailyScrape.ts` | Add UGRC assessor step after existing assessor scrape step | Low — existing pattern, parallel try/catch block |
| `scraper/src/lib/upsert.ts` | Add `upsertUgrcFields()` function — UPDATE only, never INSERT, matching on `parcel_id` | Low — additive |
| `app/src/db/schema.ts` | Add `court_intake_runs` table; no changes to existing tables | Low — additive migration only |
| `signalTypeEnum` | Potentially add `"foreclosure"` as distinct from `"lis_pendens"` if XChange uses LM case type | Low — enum extension via migration |

---

## Data Flow: UGRC Assessor Import

```
UGRC ArcGIS Open Data (opendata.gis.utah.gov)
    ↓
    ArcGIS REST Feature Service query
    URL pattern: https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/
                 UT_[County]_Parcels_LIR/FeatureServer/0/query
    Params: where=1=1, outFields=PARCEL_ID,BLDG_SQFT,BUILT_YR,TOTAL_MKT_VALUE,
                        PARCEL_ACRES,EFFBUILT_YR, f=json, resultOffset=0...
    ↓
    Paginate (resultRecordCount=1000, offset++) until features.length < 1000
    ↓
    For each feature:
        Normalize PARCEL_ID to match existing parcel_id format
        Skip if PARCEL_ID not in our properties table (we only enrich known parcels)
    ↓
    upsertUgrcFields(parcelId, { buildingSqft, yearBuilt, assessedValue, lotAcres })
        → UPDATE properties SET building_sqft=?, year_built=?, assessed_value=?,
                                 lot_acres=?, updated_at=now()
          WHERE parcel_id=? AND (building_sqft IS NULL OR ...)
    ↓
    Log: N features fetched, M properties matched and updated
```

**Match strategy:** Match on `parcel_id` (exact string). The UGRC field is `PARCEL_ID` / `SERIAL_NUM` — Carbon County uses a `XX-XXXX-XXXX` format. Normalize both sides to stripped lowercase before comparison to handle formatting differences.

**Overwrite policy:** Only overwrite if the incoming value is non-null AND (current DB value is null OR the new value differs). Never blank out an existing sqft with a null. This is consistent with the existing `upsertProperty()` guard pattern in `upsert.ts`.

**Run cadence:** UGRC LIR updates annually (year-end tax roll). Run UGRC import monthly; it is cheap (simple HTTP, no browser) and the data changes infrequently. Add as an optional step in `dailyScrape.ts` gated by `scraperConfig` key (e.g., `ugrc.runDaily=false` with monthly override).

---

## Data Flow: XChange Court Record Intake

XChange has no API. It is a browser-based subscription system ($40/month). The intake workflow is agent-assisted: Claude uses browser tools to search and parse case results, then submits structured data to the app.

```
Agent (Claude with browser tools)
    ↓
    Login to xchange.utcourts.gov with stored credentials
    ↓
    Search by:
        - Case type: LM (Lien/Mortgage Foreclosure) → maps to "lis_pendens" or new "foreclosure"
        - Case type: ES/OT/TR (Probate types) → maps to "probate"
        - County scope: Carbon, Emery, Juab, Millard, Sanpete, Sevier
        - Date range: last 30 days (or since last intake run)
    ↓
    For each case result page:
        Extract: case number, case type, party names, party addresses, filing date
        Extract: property address from party address field (if available)
    ↓
    POST structured JSON to /api/court-intake
    Body: { cases: [ { caseNumber, caseType, filingDate, partyName,
                        partyAddress, county, rawText } ] }
    ↓
    /api/court-intake handler (xchange-intake.ts):
        For each case:
            1. Parse party address → attempt match to properties table
               Primary match: normalize address, compare to properties.address + city
               Fallback match: fuzzy address (if primary fails, log as unmatched)
            2. If matched:
               → upsertSignal(propertyId, { type, recordedDate, sourceUrl, raw })
               → scoreAllProperties() (or score single property for efficiency)
            3. Log result to court_intake_runs
    ↓
    Return: { matched: N, unmatched: M, signalsCreated: K, newHotLeads: J }
```

**Case type mapping:**

| XChange Code | Description | Signal Type |
|---|---|---|
| `LM` | Lien/Mortgage Foreclosure | `lis_pendens` (or `foreclosure` if enum extended) |
| `ES` | Estate / Personal Representative | `probate` |
| `OT` | Other Probate | `probate` |
| `TR` | Trust | `probate` |
| `CO` | Conservatorship | `probate` |
| `WG` | Wrongful Lien | `lis_pendens` |

**Address matching strategy:**

XChange party addresses are mailing addresses of case parties, not necessarily the property address. This is the primary challenge. Three-tier matching:

1. **Exact normalized match:** Strip punctuation, lowercase, compare to `properties.address + properties.city`. Catches clean cases.
2. **Street number + street name match:** Split into components, match on number + primary street name, same city. Catches formatting variations.
3. **Owner name match:** If party name matches `properties.owner_name` (normalized), flag for manual review rather than auto-inserting signal.

Unmatched cases are logged in `court_intake_runs.unmatched_cases` (jsonb) so the user can manually review and associate.

**When to create a new property:** If the case address does not match any existing property but looks like a residential address in a target county, create a property stub with the address and county, then attach the signal. The daily scraper will later enrich it with assessor data.

---

## Database Changes

### No changes to existing tables

The existing schema already has UGRC columns on `properties` and already has `probate` + `lis_pendens` in the signal type enum. The schema was designed for this milestone.

### New table: `court_intake_runs`

```typescript
// Add to app/src/db/schema.ts
export const courtIntakeRuns = pgTable("court_intake_runs", {
  id: serial("id").primaryKey(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  county: text("county"),                   // null = all counties in session
  casesProcessed: integer("cases_processed").notNull().default(0),
  propertiesMatched: integer("properties_matched").notNull().default(0),
  signalsCreated: integer("signals_created").notNull().default(0),
  newHotLeads: integer("new_hot_leads").notNull().default(0),
  unmatchedCases: text("unmatched_cases"),  // JSON array of unmatched case summaries
  agentNotes: text("agent_notes"),          // free text from the agent session
});
```

This is the only migration. It is additive and backward-compatible.

### Enum extension (if `foreclosure` type wanted)

If the team wants `"foreclosure"` as distinct from `"lis_pendens"` (LM cases are formal foreclosure filings, distinct from a notice of lis pendens), add to the enum:

```sql
ALTER TYPE signal_type ADD VALUE 'foreclosure';
```

This is a non-destructive Postgres ALTER. No existing data is affected. Defer this decision until after XChange intake proves out — `lis_pendens` may be sufficient.

---

## Component Boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│ UGRC IMPORT PATH                                                  │
│                                                                   │
│  scraper/src/sources/ugrc-assessor.ts                             │
│      fetchUgrcLirPage(county, offset) → UgrcFeature[]             │
│      ↓                                                            │
│  scraper/src/lib/upsert.ts (MODIFIED)                             │
│      upsertUgrcFields(parcelId, fields) → void                    │
│      (UPDATE only — never creates new property rows)              │
│      ↓                                                            │
│  Azure PostgreSQL  properties.building_sqft / year_built / etc.   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ XCHANGE INTAKE PATH                                               │
│                                                                   │
│  Claude (browser tools) → POST /api/court-intake                  │
│      ↓                                                            │
│  app/src/app/api/court-intake/route.ts                            │
│      validates payload (zod), requires auth token                 │
│      ↓                                                            │
│  app/src/lib/xchange-intake.ts                                    │
│      matchCaseToProperty(partyAddress, county) → propertyId|null  │
│      upsertSignal(propertyId, courtSignal) [existing]             │
│      scoreAllProperties() [existing]                              │
│      logIntakeRun(stats) → court_intake_runs row                  │
│      ↓                                                            │
│  Azure PostgreSQL  distress_signals + leads + court_intake_runs   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ SHARED DOWNSTREAM (unchanged)                                     │
│                                                                   │
│  scoreAllProperties() → leads.distress_score + is_hot            │
│      ↓                                                            │
│  sendAlerts() → Resend email + SMS for new hot leads              │
│      ↓                                                            │
│  Next.js dashboard reads properties + leads (already shows UGRC  │
│  fields via PropertyWithLead type — no UI changes needed to       │
│  display buildingSqft, yearBuilt, assessedValue once populated)   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Build Order

Dependencies drive this order:

### Step 1: UGRC Field Populate (no new schema, no risk)

Build `upsertUgrcFields()` in `upsert.ts`. Write `ugrc-assessor.ts` that:
- Queries the UGRC ArcGIS Feature Service REST endpoint for Carbon County
- Paginates through all features
- Calls `upsertUgrcFields()` for each matching parcel

Run as a standalone script first (`npx ts-node scraper/src/sources/ugrc-assessor.ts`) against production DB. Verify `building_sqft`, `year_built`, `assessed_value` populate on known Carbon County properties.

**Why first:** Purely additive, zero risk, immediately visible value on the dashboard (sqft and year built appear in PropertyWithLead which is already exposed in the property detail view).

**Done when:** Running the script populates UGRC fields on 80%+ of existing Carbon County properties.

### Step 2: Wire UGRC Import into Daily Pipeline

Add UGRC step to `dailyScrape.ts` as a separate try/catch block after the existing assessor step. Gate with `scraperConfig` key so it can be disabled without code changes.

**Why second:** Once the standalone script is confirmed working, promoting it to the daily pipeline is low-risk wiring.

**Done when:** UGRC import runs automatically and is visible in scraper health logs.

### Step 3: XChange Parser

Build `xchange-parser.ts` with pure functions (no I/O):
- `parseXchangeCaseList(rawText)` → `CourtCase[]`
- `mapCaseTypeToSignalType(xchangeCode)` → `SignalType`
- Zod schema for the `CourtCase` type

Build this as pure logic first, test against sample XChange output pasted from the browser. No database, no HTTP.

**Why third:** Parser is the most uncertain part — XChange's HTML structure is unknown until the agent browses it. Build and test this in isolation before wiring the endpoint.

### Step 4: `/api/court-intake` Endpoint + `xchange-intake.ts`

Build the intake handler:
- POST endpoint with auth (internal API key in headers, same pattern as existing scraper endpoints)
- Zod validation of incoming payload
- Address matching logic (three tiers described above)
- Call existing `upsertSignal()` and `scoreAllProperties()`
- Write `court_intake_runs` log row

Add the `court_intake_runs` migration.

**Why fourth:** Depends on parser being stable. The endpoint is the glue — once it exists, agent can POST to it.

### Step 5: Agent-Assisted XChange Session

With the endpoint live, run a manual XChange intake session:
- Agent logs in to XChange
- Searches by case type (LM, ES) for target counties, last 30 days
- Posts results to `/api/court-intake`
- Reviews `court_intake_runs` log for match rate and unmatched cases

Tune address matching based on real-world match rate. Target 70%+ auto-match.

**Why last:** Requires all prior steps. The first real run will expose address matching gaps that need iteration.

---

## Integration Risks and Mitigations

### Risk 1: UGRC parcel ID format mismatch
**Problem:** UGRC `PARCEL_ID` field may use different formatting than what the county assessor scrapers stored (e.g., leading zeros, hyphens vs. spaces).
**Mitigation:** Before the first production run, query a sample of UGRC features for Carbon County and compare against 10 existing `properties.parcel_id` values. Write a `normalizeParcelId()` function that strips/standardizes both sides before comparison. The existing `carbon-assessor.ts` scraper already handles some normalization — check that first.

### Risk 2: XChange party address ≠ property address
**Problem:** XChange shows party mailing addresses, not necessarily the subject property address. A foreclosure defendant may have a different mailing address.
**Mitigation:** Fall back to owner name matching when address fails. Log all unmatched cases in `court_intake_runs.unmatched_cases` so they can be manually reviewed. Do not auto-create stubs for unmatched cases unless confident in the address.

### Risk 3: `scoreAllProperties()` is slow at scale
**Problem:** The current `scoreAllProperties()` scores ALL properties with active signals every time it is called. After XChange intake adds signals to 20-50 new properties, calling it is fine. But calling it after every individual signal upsert is wasteful.
**Mitigation:** The XChange intake handler should batch all signal inserts first, then call `scoreAllProperties()` once at the end of the session. Do not call it per-case.

### Risk 4: XChange subscription cost
**Problem:** XChange is $40/month. This is not free.
**Mitigation:** This is a known requirement (PROJECT.md accepts it as the mechanism for court record intake). The session-based agent workflow limits usage to intentional searches, avoiding the per-search overage charges ($0.15 each past 500/month).

---

## Sources

- UGRC LIR field list: https://gis.utah.gov/products/sgid/cadastre/parcels/ (MEDIUM confidence — field names BLDG_SQFT, BUILT_YR, TOTAL_MKT_VALUE, PARCEL_ACRES confirmed from official UGRC docs)
- Carbon County LIR dataset: https://opendata.gis.utah.gov/maps/utah::utah-carbon-county-parcels-lir/explore (MEDIUM confidence — exists, ArcGIS REST endpoint URL pattern not directly confirmed in this research)
- Emery County LIR dataset: https://opendata.gis.utah.gov/datasets/utah-emery-county-parcels-lir/about (MEDIUM confidence)
- Utah XChange overview: https://www.utcourts.gov/en/court-records-publications/records/xchange.html (HIGH confidence — official Utah Courts site; $40/month subscription confirmed; browser-only confirmed)
- XChange case type codes: https://www.utcourts.gov/en/court-records-publications/records/xchange/case.html (HIGH confidence — LM = Lien/Mortgage Foreclosure; ES/OT/TR/CO = Probate types confirmed from official docs, last updated Feb 2022)
- XChange search capabilities: https://www.utcourts.gov/en/court-records-publications/records/xchange/help.html (HIGH confidence — search by case type, party name, date range confirmed; no search by address or parcel confirmed)
- Existing codebase — schema.ts, upsert.ts, score.ts, dailyScrape.ts: confirmed via direct code inspection (HIGH confidence)

---

*Architecture research for: HouseFinder v1.1 — UGRC assessor import + XChange court record intake*
*Researched: 2026-04-10*
