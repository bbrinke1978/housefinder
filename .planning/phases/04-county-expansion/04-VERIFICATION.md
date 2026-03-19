---
phase: 04-county-expansion
verified: 2026-03-18T12:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 4: County Expansion Verification Report

**Phase Goal:** Scraping expanded to 5 new counties (Emery, Sevier, Juab, Millard, Sanpete) covering ~10 target cities, with manual signal entry for probate and vacant properties
**Verified:** 2026-03-18T12:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Adjusted Scope (from prompt context)

The following scope adjustments were confirmed before verification began:

- DATA-05 (probate): Deliberately scoped as manual-entry only — XChange subscription declined ($40/mo). Goal is met by the manual UI, not automated scraping.
- DATA-06 (vacant): Deliberately scoped as manual flagging only — no online code violation data exists in rural Utah. Goal is met by the vacant toggle UI.
- County count: 5 new counties (Emery, Sevier, Juab, Millard, Sanpete) — research showed other counties have no online data. The ROADMAP goal text was updated to reflect this (5 counties, not "~10").
- Success criteria verified against ROADMAP.md Phase 4 section (updated wording), not original DATA-04 description.

---

### Observable Truths (from ROADMAP.md Success Criteria)

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Properties from Emery, Sanpete, Juab, Millard, and Sevier counties appear in the database alongside Carbon County records | VERIFIED | `upsertFromAssessor(records, "emery")` in emeryScrape.ts:57; `upsertFromDelinquent(records, "sevier"|"juab"|"millard"|"sanpete")` in all four county handlers; `upsertProperty` writes `county` field from param (upsert.ts:23) |
| 2  | Probate signals can be manually added to any property from the detail page (XChange subscription declined per user decision) | VERIFIED | `addManualSignal` server action exists in actions.ts:400-425, accepts "probate" signal type, inserts into distressSignals. `FieldObservations` component exposes the form (field-observations.tsx:50-62). Page wires it in Signals tab (page.tsx:81). |
| 3  | Vacant properties can be flagged from the property detail page with a toggle, creating/resolving a vacant distress signal | VERIFIED | `setVacantFlag(propertyId, true)` inserts `signalType:"vacant", status:"active"` (actions.ts:361-371); `setVacantFlag(propertyId, false)` updates to `status:"resolved"` (actions.ts:373-386). Checkbox in FieldObservations calls this on change (field-observations.tsx:38-48). |
| 4  | Per-county scraper health status is visible — each county shows its last successful scrape timestamp independently | VERIFIED | `updateScrapeHealth({ county: "emery", source: "tax-roll" ... })` and `updateScrapeHealth({ county: "emery", source: "delinquent-pdf" ... })` in emeryScrape.ts:58-63 and 116-121. Same pattern for sevier (sevierScrape.ts:81-86), juab (juabScrape.ts:81-86), millard (millardScrape.ts:81-86), sanpete (sanpeteScrape.ts:81-86). `checkHealthAlert` called per county in each handler. |

**Score:** 4/4 success criteria verified

---

### Required Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `scraper/src/sources/emery-tax-roll.ts` | wpDataTables scraper for Emery County tax roll, exports scrapeEmeryTaxRoll | Yes | 167 lines, full Playwright loop with pagination, header map, Zod validation | emeryScrape.ts imports and calls it | VERIFIED |
| `scraper/src/sources/emery-delinquent-pdf.ts` | Annual PDF parser with dynamic URL discovery, exports parseEmeryDelinquentPdf | Yes | 133 lines, Playwright URL discovery, pdf-parse v2 (PDFParse class), line-by-line regex parsing, Zod validation | emeryScrape.ts imports and calls it | VERIFIED |
| `scraper/src/functions/emeryScrape.ts` | Azure Function timer at 5:15 AM | Yes | 187 lines, full pipeline: seedDefaultConfig → tax roll → delinquent PDF (annual skip) → score → health → alerts | Registered as app.timer("emery-scrape", { schedule: "0 15 5 * * *", runOnStartup: false }) | VERIFIED |
| `scraper/src/lib/upsert.ts` | County-parameterized upsertProperty, upsertFromAssessor, upsertFromDelinquent | Yes | 150 lines, all three functions accept optional `county?: string` param; `county ?? record.county ?? "carbon"` default chain (line 23) | Called with explicit county from all 6 county handlers | VERIFIED |
| `scraper/src/sources/pdf-delinquent-parser.ts` | Shared PDF parser with PdfCountyConfig type, parsePdfDelinquent, 4 county configs | Yes | 238 lines, exports PdfCountyConfig type, makeGenericDelinquentLineParser factory, parsePdfDelinquent function, sevierConfig, juabConfig, millardConfig, sanpeteConfig | Imported by sevierScrape, juabScrape, millardScrape, sanpeteScrape | VERIFIED |
| `scraper/src/functions/sevierScrape.ts` | Sevier County Azure Function at 5:30 AM | Yes | 151 lines, parsePdfDelinquent(sevierConfig), upsertFromDelinquent(records, "sevier"), updateScrapeHealth({ county: "sevier" }), annual skip logic | Registered: "0 30 5 * * *", runOnStartup: false | VERIFIED |
| `scraper/src/functions/juabScrape.ts` | Juab County Azure Function at 5:45 AM | Yes | 151 lines, parsePdfDelinquent(juabConfig), upsertFromDelinquent(records, "juab"), updateScrapeHealth({ county: "juab" }), annual skip logic | Registered: "0 45 5 * * *", runOnStartup: false | VERIFIED |
| `scraper/src/functions/millardScrape.ts` | Millard County Azure Function at 6:00 AM | Yes | 151 lines, parsePdfDelinquent(millardConfig), upsertFromDelinquent(records, "millard"), updateScrapeHealth({ county: "millard" }), annual skip logic | Registered: "0 0 6 * * *", runOnStartup: false | VERIFIED |
| `scraper/src/functions/sanpeteScrape.ts` | Sanpete County Azure Function at 6:15 AM | Yes | 151 lines, parsePdfDelinquent(sanpeteConfig), upsertFromDelinquent(records, "sanpete"), updateScrapeHealth({ county: "sanpete" }), annual skip logic | Registered: "0 15 6 * * *", runOnStartup: false | VERIFIED |
| `app/src/components/field-observations.tsx` | Vacant toggle and probate manual entry UI, min 40 lines | Yes | 148 lines, full client component with native checkbox (vacant), select + text input + button (manual signal), useTransition pending states, duplicate-signal guard | Imported and rendered in property detail page Signals tab | VERIFIED |
| `app/src/lib/actions.ts` | setVacantFlag, addManualSignal, getActiveVacantFlag server actions | Yes | All three present: setVacantFlag (lines 351-389), addManualSignal (lines 400-425), getActiveVacantFlag (lines 430-446). Auth checks on mutations, Zod validation on addManualSignal. | Called from field-observations.tsx and property detail page | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `emeryScrape.ts` | `emery-tax-roll.ts` | import scrapeEmeryTaxRoll | WIRED | emeryScrape.ts line 2: `import { scrapeEmeryTaxRoll }`, called line 56 |
| `emery-tax-roll.ts` | `upsert.ts` | upsertFromAssessor with county='emery' | WIRED | emeryScrape.ts line 57: `upsertFromAssessor(taxRollRecords, "emery")` |
| `emeryScrape.ts` | `health.ts` | updateScrapeHealth({ county: 'emery' }) | WIRED | Lines 58-63 (tax-roll) and 116-121 (delinquent-pdf); checkHealthAlert("emery") line 149 |
| `sevierScrape.ts` | `pdf-delinquent-parser.ts` | import parsePdfDelinquent with sevierConfig | WIRED | Lines 3-5: imports both; line 60: `parsePdfDelinquent(sevierConfig)` |
| `pdf-delinquent-parser.ts` | `upsert.ts` | upsertFromDelinquent with county param | WIRED (via handler) | Parser returns records; each handler calls `upsertFromDelinquent(records, "{county}")` with explicit county |
| `field-observations.tsx` | `actions.ts` | server action calls setVacantFlag, addManualSignal | WIRED | Line 4: imports both; line 42: `setVacantFlag(propertyId, checked)`; line 54: `addManualSignal(propertyId, signalType, notes)` |
| `actions.ts` | `distressSignals` table | inserts into distressSignals table | WIRED | setVacantFlag: `db.insert(distressSignals)` line 362; addManualSignal: `db.insert(distressSignals)` line 413 |
| `properties/[id]/page.tsx` | `field-observations.tsx` | renders FieldObservations in Signals tab | WIRED | Line 12: `import { FieldObservations }`, line 81: `<FieldObservations propertyId={id} isVacant={vacantFlag} signals={signals} />` inside `TabsContent value="signals"` |
| `properties/[id]/page.tsx` | `actions.ts` | getActiveVacantFlag in data fetch | WIRED | Line 7: import, line 25: `getActiveVacantFlag(id)` in `Promise.all` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Scope Adjustment | Status | Evidence |
|-------------|-------------|-------------|-----------------|--------|----------|
| DATA-04 | 04-01, 04-03 | Expand scraping to ~10 similar small Utah towns/counties | Scoped to 5 counties with online data: Emery, Sevier, Juab, Millard, Sanpete — others have no online data | SATISFIED | 5 new county scrapers exist and wire into the upsert pipeline with correct county tags |
| DATA-05 | 04-02 | Detect probate/estate filings from Utah court records | Scoped to manual-entry only — XChange subscription declined | SATISFIED (scoped) | addManualSignal server action accepts "probate" signal type; FieldObservations UI exposes it; ROADMAP success criteria updated to match |
| DATA-06 | 04-02 | Detect vacant/neglected properties from code violation records | Scoped to manual flagging only — no rural Utah online code violation data | SATISFIED (scoped) | setVacantFlag server action creates/resolves "vacant" distress signals; vacant toggle in FieldObservations component |

**Orphaned requirements check:** No additional Phase 4 requirements found in REQUIREMENTS.md beyond DATA-04, DATA-05, DATA-06. All three are claimed by plans and verified.

---

### Anti-Patterns Found

| File | Pattern | Severity | Assessment |
|------|---------|----------|------------|
| `scraper/src/sources/carbon-recorder.ts` | PLACEHOLDER / TODO comments, returns [] always | Info | Pre-existing Phase 1 issue, out of scope for Phase 4. Not introduced by this phase. |
| All county scraper sources | `return []` in error/no-data branches | Info | Legitimate guard clauses (no-link-found, download failure, empty results). Not stubs — full parsing logic present on the happy path. |
| `pdf-delinquent-parser.ts` lineParser | `return null` on no parcel match | Info | Correct filter behavior in a line-parser factory. Not a stub. |

No blockers or warnings introduced by Phase 4 work.

---

### Notable Implementation Details

**pdf-parse v2 API deviation:** Plan specified `import pdfParse from "pdf-parse"` (v1 default export) but the installed version (2.4.5) uses a class-based API. Implementation correctly uses `import { PDFParse } from "pdf-parse"` with `new PDFParse({ data: buffer }).getText()`. This is consistent across both emery-delinquent-pdf.ts and pdf-delinquent-parser.ts.

**Annual PDF skip logic:** All 5 county handlers (Emery + 4 PDF-only counties) correctly check `{county}.delinquent.lastParsedYear` in scraperConfig before parsing, and only update the key after `records.length > 0` (not on empty parse). This prevents marking as "parsed" when the county's page had no PDF link yet.

**Backward compatibility:** `upsertProperty(record, county?)` defaults to `county ?? record.county ?? "carbon"`. Existing Carbon County `dailyScrape.ts` passes no county argument and remains unmodified.

**Target cities expanded:** `DEFAULT_TARGET_CITIES` in actions.ts updated from `["Price"]` to 9 cities: Price, Huntington, Castle Dale, Richfield, Nephi, Ephraim, Manti, Fillmore, Delta.

---

### Human Verification Required

#### 1. Emery Tax Roll Live Scrape

**Test:** Run emeryScrape locally against the live Emery County site (https://emery.utah.gov/home/offices/treasurer/tax-roll/) and observe whether the wpDataTables table loads and returns records.
**Expected:** Non-zero record count; properties appear in DB with county='emery'.
**Why human:** The wpDataTables page may require JavaScript interaction to trigger table population. Cannot verify actual HTTP response behavior from static analysis.

#### 2. PDF URL Discovery at Runtime

**Test:** Trigger any one of the PDF county scrapers (e.g., sevierScrape) and observe whether Playwright finds a PDF link on the treasurer page.
**Expected:** Log line `[sevier-delinquent-pdf] Found PDF URL: https://...` followed by parsed record count.
**Why human:** Playwright link discovery depends on actual live HTML. If the county hasn't published this year's delinquent list yet, the parser correctly returns [] and skips — which is valid behavior but cannot be distinguished from a broken scraper without a live check.

#### 3. Vacant Toggle Visual Flow

**Test:** Open a property detail page in the app, go to the Signals tab, click the "Mark as Vacant" checkbox.
**Expected:** Checkbox shows "(saving...)" while pending, then reflects the new state. A "vacant" signal appears in the SignalTimeline after revalidation. Unchecking resolves the signal.
**Why human:** useTransition pending state, revalidatePath-triggered re-render, and SignalTimeline display are runtime behaviors not verifiable statically.

#### 4. Manual Probate Signal Entry

**Test:** On a property detail page Signals tab, select "Probate Filing", enter an optional case note, click "Add Signal".
**Expected:** Signal appears in the SignalTimeline. Clicking "Add Signal" again for the same type shows "Active probate signal already exists" and disables the button.
**Why human:** Client-side duplicate guard uses the `signals` prop from the server; needs runtime verification that prop is correctly threaded.

---

### Gaps Summary

No gaps found. All 10 required artifacts exist, are substantive (not stubs), and are fully wired. All 4 ROADMAP success criteria are met. All 3 requirement IDs (DATA-04, DATA-05, DATA-06) are satisfied within their documented scope adjustments.

---

*Verified: 2026-03-18T12:00:00Z*
*Verifier: Claude (gsd-verifier)*
