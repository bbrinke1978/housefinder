# Stack Research

**Domain:** v1.3 Rose Park Pilot — Salt Lake County scraping + zip-based dashboard filter
**Researched:** 2026-04-17
**Confidence:** HIGH (sources: live county portals verified, existing codebase read in full)

---

## Executive Verdict

**No new scraper dependencies are required.** The existing Playwright + `pdf-parse` + `fetch` + Zod pattern covers every Salt Lake County data source investigated. The frontend zip-based filter requires zero new packages — it is a data labeling decision, not a UI library decision.

---

## Recommended Stack Additions

### Core Technologies — NONE

The existing scraper package.json already has everything needed:

| Already Present | Version | Covers |
|-----------------|---------|--------|
| `playwright` | ^1.50.0 | SLCo Auditor tax-sale HTML table (JS-rendered) |
| `pdf-parse` | ^2.4.5 | SLCo Treasurer PDF delinquent list (if published) |
| `cheerio` | ^1.0.0 | Static HTML fallback if Auditor list is server-side rendered |
| `zod` | ^3.24.0 | Validation of scraped records |
| `fetch` (Node built-in) | — | Direct PDF/JSON downloads |

No ArcGIS REST client, no ESRI JSON parser, no CAPTCHA solver, no OAuth library, no new npm packages for the scraper.

### Supporting Libraries — NONE FOR FRONTEND

The existing app package.json already has everything needed for zip-based filtering:

| Already Present | Version | Covers |
|-----------------|---------|--------|
| `drizzle-orm` | ^0.45.1 | WHERE zip = '84116' OR city = 'Rose Park' queries |
| `next` | ^15.5.15 | Server components / API routes for filtered queries |
| `@base-ui/react` | ^1.3.0 | Select/Combobox primitives for neighborhood dropdown if needed |
| `lucide-react` | ^0.577.0 | Filter icons |

---

## SLCo Data Source Assessment (What to Build With What)

### Source 1: SLCo Auditor Tax Sale List

**URL:** `https://apps.saltlakecounty.gov/auditor/tax-sale/`
**Format:** JavaScript-rendered page (confirmed: "View the 2025 tax sale list below" with no visible static HTML)
**Fields confirmed:** parcel number, owner name/info, property type, year, balance due (starting bid)
**CAPTCHA:** None found
**Login:** Not required for viewing

**Pattern:** Same as `carbon-delinquent.ts` — Playwright with `waitForSelector`, dynamic column header map, paginate. This is the natural analog. Create `slco-delinquent.ts` following the same shape as `carbon-delinquent.ts`.

**Timing caveat (MEDIUM confidence):** The tax sale list is published four weeks before the annual May tax sale and updated weekly. It is not a continuously updated delinquent list — it is specifically properties headed to auction. The 2026 sale is scheduled for May 2026. This means the scraper only surfaces actionable data in the ~4 weeks before May each year. For year-round delinquency signals, see Source 2.

**Action:** Build `slco-delinquent.ts`. Playwright pattern. No new deps.

---

### Source 2: SLCo Treasurer Delinquent Balance Search

**URL:** `https://www.saltlakecounty.gov/treasurer/property-taxes/find-delinquent-property-balance/`
**Format:** Lookup-by-parcel form — NOT a bulk list. Requires known parcel ID to query.
**Bulk use:** Not feasible without a pre-existing parcel list.

**Decision:** Skip as a primary source. Useful as a secondary enrichment step (query a known parcel to get its delinquent balance), but not a scraping target for discovery.

---

### Source 3: SLCo Recorder Document Search (NOD / Lis Pendens)

**URL:** `https://apps.saltlakecounty.gov/data-services/Search/DataSearches.aspx`
**Document types confirmed:** NT DF (Notice of Default), LIS PN (Lis Pendens), TRD (Trust Deed) — all present in the system.
**Auth:** Requires username + password. Free tier = parcel-lookup only (no document-type search). Full document-type search requires paid data units ($5 for 24-hour temp access; $300–$6,000 for subscription packages).
**CAPTCHA:** None found on login page.
**Technology:** ASP.NET — likely has `__VIEWSTATE` anti-forgery tokens on form posts.

**Decision:** This portal requires credentials and ASP.NET form-state management. It is NOT a simple Playwright scrape without a paid account. Do NOT add `puppeteer-extra-plugin-stealth` or anti-detection libraries — the barrier here is authentication + payment, not bot detection.

**Alternative for NOD/recorder signals in SLCo:** Route through the existing `utah-legals.ts` statewide scraper. Utah Legals (utahlegals.com) already covers Salt Lake County trustee sales. The scraper currently targets only Carbon, Emery, Juab, and Millard county checkboxes (indexes 3, 7, 11, 13). Salt Lake County is in the same checkbox list. Adding its index is a one-line change to `TARGET_COUNTIES` in `utah-legals.ts`, not a new scraper.

**Action for recorder signals:** Add Salt Lake County to `TARGET_COUNTIES` in `utah-legals.ts`. No new file, no new deps. The `carbon-recorder.ts` placeholder pattern (returns `[]` because no free portal exists) is the honest model for a standalone `slco-recorder.ts` — but it's unnecessary since Utah Legals already handles statewide trustee sale notices.

---

### Source 4: UGRC Statewide Assessor / Parcel Data

**Already handled.** The existing `import-ugrc-assessor` script already pulls statewide parcel data including Salt Lake County parcels. Rose Park (84116) properties are already being imported but filtered out by the rural-only city filter. This is the cheapest path: no new scraper needed, just remove the filter or retag 84116 records.

**SLCo CAMA bulk data:** Available for purchase at $1,500 (not free). Do not use.
**SLCo Open Data ArcGIS hub:** Parcel geometry available free but owner/address data is in UGRC already. No net gain from adding an ArcGIS REST client.

---

### Source 5: Utah Courts Tax Liens

**URL:** `https://legacy.utcourts.gov/liens/tax/`
**Format:** ZIP files updated every Tuesday by 1:00 PM. Contains tax lien data statewide including Salt Lake County.
**Auth:** None required.

**Decision:** This is a `fetch()` + unzip + parse pattern. If tax-lien signals are needed beyond the auditor tax-sale list, this is a free bulk source. It uses `fetch` (already present) plus a ZIP extraction step.

**If this source is added:** Use Node's built-in `zlib` or `unzipper` npm package. `unzipper` is the current standard for async ZIP streams in Node.js ESM.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `unzipper` | ^0.12.x | Decompress Utah Courts tax lien ZIP downloads | Only if pursuing Utah Courts tax lien integration |

This is optional for v1.3. The auditor tax-sale list is sufficient for the Rose Park pilot. Flag for a future phase.

---

## Frontend Filter: Zip-Based / Neighborhood

### Decision: Retag, Do Not Add UI Libraries

The schema already has `properties.zip` (text, nullable) and `properties.city` (text, not null). The existing city filter works by matching `city` values. The cleanest approach for Rose Park is:

1. In the UGRC import script, when `zip = '84116'`, set `city = 'Rose Park'` (or keep SLC as city and add a neighborhood column).
2. The existing dashboard city filter then surfaces Rose Park automatically, exactly like it surfaces Price or Helper.

This requires **zero new frontend packages**. It is a data transformation decision, not a UI library decision.

**If a dedicated zip/neighborhood picker is needed** (not required for v1.3, but possible for future expansion to multiple SLC zips), `@base-ui/react` already provides `Select` and `Combobox` primitives at version ^1.3.0. No additional install.

**Schema consideration:** `properties.zip` is already defined as nullable `text`. The existing `idx_properties_city` index covers city-based filtering. A `idx_properties_zip` index may help if zip becomes a primary filter column — this is a one-line Drizzle schema addition (no library change).

---

## What NOT to Add

| Do Not Add | Why | Use Instead |
|------------|-----|-------------|
| `arcgis-rest-js` or `esri-leaflet` | UGRC already imports SLCo parcels statewide; ArcGIS REST not needed for scraping | Existing UGRC import script |
| CAPTCHA solver (2captcha, anti-captcha) | SLCo Auditor has no CAPTCHA; Recorder requires paid account, not CAPTCHA bypass | Accept recorder limitation; use Utah Legals for NOD signals |
| `puppeteer-extra-plugin-stealth` | No bot-detection evidence on SLCo Auditor page | Plain Playwright is sufficient |
| OAuth library | No OAuth flows on any SLCo public data source | N/A |
| `selenium-webdriver` | Already using Playwright | Playwright |
| `axios` | Already using `fetch` (Node built-in) | Native `fetch` |
| Paid CAMA database ($1,500) | Budget constraint; UGRC statewide data is free | Existing UGRC import |
| Separate `slco-recorder.ts` scraper | Recorder portal requires paid account; Utah Legals covers NOD/trustee sales statewide | Add SLCo to `utah-legals.ts` TARGET_COUNTIES |

---

## Integration Points With Existing Structure

### Scraper: New File

```
scraper/src/sources/slco-delinquent.ts
```

Pattern: Copy `carbon-delinquent.ts` shape. Playwright + `waitForSelector` + dynamic header map + pagination. Target URL: `https://apps.saltlakecounty.gov/auditor/tax-sale/`. Column names will differ from Carbon — the header map approach already handles this defensively.

### Scraper: One-Line Change to Existing File

In `scraper/src/sources/utah-legals.ts`, add Salt Lake County to `TARGET_COUNTIES`:

```typescript
// Utah Legals county checkboxes are 0-based; Salt Lake is index 17 (verify from live HTML)
{ index: 17, name: "salt lake" },
```

The exact index must be verified against the live checkbox list HTML before implementation. This is a reconnaissance task for the implementation phase, not a dependency issue.

### Schema: No Changes Required

`properties.zip` and `properties.city` already exist. The recommended "retag 84116 as Rose Park" approach is handled in the UGRC import script logic, not the schema.

**Optional schema addition** (low priority): `idx_properties_zip` index if zip becomes a frequently filtered column:

```typescript
index("idx_properties_zip").on(table.zip),
```

This is a Drizzle migration, not a library change.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| SLCo Auditor tax-sale scrapeability | HIGH | Live URL confirmed, JS-rendered table pattern matches existing scraper |
| SLCo Recorder requires paid account | HIGH | Official data-services page explicitly states login + payment required |
| Utah Legals covers SLCo NOD/trustee sales | HIGH | Site confirmed statewide coverage; existing scraper already uses this pattern |
| UGRC already has 84116 parcels | HIGH | Import script is statewide; PROJECT.md confirms data exists but is filtered out |
| Auditor list is annual/seasonal, not continuous | MEDIUM | "Published 4 weeks before May tax sale" — year-round delinquency coverage is limited |
| SLCo checkbox index in Utah Legals | LOW | Index value must be verified against live HTML; 17 is an estimate |
| Utah Courts tax-lien ZIP format | MEDIUM | Described in search results; exact schema unknown until accessed |

---

## Sources

- `apps.saltlakecounty.gov/auditor/tax-sale/` — tax sale list confirmed JS-rendered, no CAPTCHA
- `apps.saltlakecounty.gov/data-services/PropertyWatch/DocumentTypes.aspx` — NT DF, LIS PN, TRD document types confirmed present
- `apps.saltlakecounty.gov/data-services/Search/DataSearches.aspx` — login required, ASP.NET, no free doc-type search
- `saltlakecounty.gov/recorder/data-services/` — free tier = parcel lookup only; document search = paid ($5–$6,000)
- `saltlakecounty.gov/assessor/parcel-data/` — CAMA database confirmed $1,500 purchase price (not free)
- `legacy.utcourts.gov/liens/tax/` — statewide tax lien ZIPs, free, updated Tuesdays
- `slcrecord.com/unauthenticated/trusteepublic` — SLC Record trustee reports require annual subscription; comma-delimited format; no parcel numbers
- Codebase read: `scraper/src/sources/carbon-delinquent.ts`, `carbon-recorder.ts`, `pdf-delinquent-parser.ts`, `utah-legals.ts`, `scraper/package.json`, `app/package.json`, `app/src/db/schema.ts`

---

*Stack research for: v1.3 Rose Park Pilot — Salt Lake County scraping additions*
*Researched: 2026-04-17*
