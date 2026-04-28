---
created: 2026-04-27
status: research
purpose: Audit scraper data flow to determine which scrapers conflate owner mailing address with property situs
---

## Summary

Only one scraper is a confirmed bug: **slco-tax-delinquent.ts**, which parses the
`TAX_SALE_ADDRESS` field from the SLCo Auditor API and writes it directly to
`properties.address / .city / .zip`. That field is semantically the owner's mailing
address (evidenced by PO Boxes, out-of-state addresses, and non-SLCo Utah cities in
live data), not the property's situs address. All other active scrapers that write to
`properties.address` either use unambiguously-named situs columns
(`PropertyAddress / PropertyCity / PropertyZip` in Carbon and Emery data), derive
address from notice body text (utah-legals), or write empty strings when no address
is available (emery-5year-backtax, carbon-recorder, emery-delinquent-pdf). The schema
has **no dedicated owner mailing address column** on the `properties` table; mailing
addresses are shunted into `owner_contacts.email` with a `"MAILING: ..."` prefix —
a pragmatic workaround that conflates the email column. There are no
`owner_mailing_street / _city / _zip` columns anywhere in the DB.

---

## Schema state (as-is)

| Table | Column | What it currently holds |
|-------|--------|------------------------|
| properties | address | Intended: property situs street. Actual: **situs for Carbon/Emery/utah-legals rows; owner mailing address for SLCo tax-delinquent rows** |
| properties | city | Intended: situs city. Actual: same mixed-provenance problem for SLCo rows; overridden via normalizeCity(zip) for SLC zips |
| properties | zip | Used by upsert.ts `normalizeCity()` to retag SLC neighborhoods; not stored directly for most delinquent rows |
| properties | state | Hardcoded "UT" by upsert.ts |
| properties | county | Populated from scraper metadata, correct |
| properties | latitude / longitude | NULL — never populated by any scraper (only by UGRC import script) |
| owner_contacts | phone | Real phone or null |
| owner_contacts | email | Real email OR `"MAILING: <address>, <city>, <state> <zip>"` (hack) for carbon-assessor and tracerfy-enrichment results |
| owner_contacts | source | `'county-assessor'`, `'tracerfy'`, `'tracerfy-address'`, `'utah-bes'` etc. |

**No dedicated mailing address columns exist** on `properties` or any related table.
The `owner_contacts` table has no free-text / notes field — mailing address data is
encoded in `email` with a "MAILING:" prefix, which is a known workaround (see
comments in carbon-assessor.ts and tracerfy-enrichment.ts).

---

## Per-scraper audit

### slco-tax-delinquent.ts

- **Upstream source:** SLCo Auditor TaxMQ JSON API — `https://apps.saltlakecounty.gov/Services/Treasurer/TaxMQ/api/TaxDue/GetTaxSale`
- **Source address field:** `TAX_SALE_ADDRESS` (a single freeform string)
- **Example values from live data:** `PO BOX 1099 RIVERTON UT 84065`, `11898 S WEST BAY SHORE DR TRAVERSE CITY MI 49684`, `5289 W WOODASH CIR WEST VALLEY UT 84120`
- **What it really is:** **Owner mailing address.** PO Boxes, out-of-state cities (Michigan, etc.), and Utah cities outside Salt Lake County (Riverton is in SLC County but Lehi/Ogden/Park City/Moab/St George are not) are all impossible as SLC property situs addresses. The SLCo Auditor API backing the public tax-sale page does not expose a separate situs address field.
- **Evidence:**
  - The file's own comment (lines 17-20) says "propertyAddress: street portion of TAX_SALE_ADDRESS" — implying situs — but the data refutes this.
  - Brian's live data inspection confirmed PO Boxes and out-of-state addresses in the field.
  - The SLCo Auditor's public page (auditor.slco.org/tax-sale) displays this same address as "Tax Sale Address" next to the owner name column, not a property column.
- **Where it lands in DB:** `properties.address` (via `record.propertyAddress`), `properties.city` (via `record.propertyCity`), and used by `normalizeCity()` for zip-based neighborhood retagging (`properties.city`)
- **Severity:** **confirmed-bug** — owner mailing address is being stored as property situs address for all ~200 SLCo delinquent rows

---

### carbon-delinquent.ts

- **Upstream source:** Carbon County delinquent properties wpDataTable — `https://www.carbon.utah.gov/service/delinquent-properties/`
- **Source address field:** `PropertyAddress` / `PropertyCity` columns (by header name lookup)
- **What it really is:** **Property situs address.** Carbon County's table has explicit separate columns: `Name/Add1/Add2/City/State/Zip` (mailing) and `PropertyAddress/PropertyCity/PropertyZip` (situs). The scraper's column-lookup priority is `getCell("propertyaddress") || getCell("property address") || getCell("add1") || getCell("address") || getCell("situs address")`.
- **Evidence:** The comment in `carbon-assessor.ts` (lines 84-89) documents this column distinction for the assessor table explicitly: "Name/Add1/City/State/Zip are MAILING address fields; PropertyAddress/PropertyCity/PropertyZip are the property address." The delinquent table is from the same county system and uses the same column naming convention.
- **Risk caveat:** The fallback chain in `carbon-delinquent.ts` falls through to `getCell("add1")` if neither `propertyaddress` nor `property address` is found. If Carbon County ever renames or reorders columns such that `PropertyAddress` disappears and only `Add1` is present, the scraper would silently fall back to the mailing address. This is a latent fragility, not a current bug.
- **Where it lands in DB:** `properties.address` (via `record.propertyAddress`), `properties.city` (via `record.propertyCity`)
- **Severity:** **clean** (with latent fragility in fallback chain)

---

### carbon-assessor.ts

- **Upstream source:** Carbon County property search wpDataTable — `https://www.carbon.utah.gov/service/property-search/`
- **Source address fields:** Two distinct sets — `PropertyAddress/PropertyCity/PropertyZip` (situs) AND `Add1/Add2/City/State/Zip` (mailing)
- **What they really are:** The code explicitly documents the distinction in its comment block (lines 84-89) and handles both sets separately.
- **Situs fields:** `getCell("propertyaddress") || getCell("property address")` — written to `record.address` and `record.city`
- **Mailing fields:** `getCell("add1") / getCell("city") / getCell("state") / getCell("zip")` — written to `record.mailingAddress / .mailingCity / .mailingState / .mailingZip`
- **Where it lands in DB:**
  - Situs → `properties.address`, `properties.city` via `upsertFromAssessor()`
  - Mailing → `owner_contacts.email` (formatted as `"MAILING: <address>, <city>, <state> <zip>"`) with `source = 'county-assessor'`, only when mailing differs from situs
- **Severity:** **clean** — correctly separates situs from mailing; mailing address is NOT written to `properties.address`

---

### emery-delinquent-pdf.ts

- **Upstream source:** Emery County annual delinquent tax PDF — discovered dynamically from `https://emery.utah.gov/home/offices/treasurer/`
- **Source address field:** None. The PDF is parsed line-by-line with regex `^(\d{2}-\d{3,4}-\d{4})\s+(.+?)\s+\$?([\d,]+\.?\d*)\s*$` which extracts only parcel ID, owner name, and amount. No address column exists in the Emery PDF format.
- **What it really is:** N/A — no address is parsed
- **Where it lands in DB:** `properties.address` = `""`, `properties.city` = `""` (empty defaults passed to `upsertProperty()` via `upsertFromDelinquent()`). The upsert guard in `upsert.ts` (lines 157-162) preserves existing non-empty values on conflict, so emery-delinquent-pdf does not overwrite a good address set by an earlier assessor run.
- **Severity:** **clean** — no address data at all; no conflation risk

---

### emery-tax-roll.ts

- **Upstream source:** Emery County tax roll wpDataTable — `https://emery.utah.gov/home/offices/treasurer/tax-roll/`
- **Source address field:** `address` / `property address` / `propertyaddress` / `situs address` / `address 1` / `addr1` / `prop address` (priority lookup); city from `city` / `propertycity` / `property city` / `prop city`
- **What it really is:** **Unknown / suspect.** Unlike Carbon County, Emery's table column naming is not documented in the code comments. The scraper tries `getCell("city")` before `getCell("propertycity")` for the city — the opposite priority order from Carbon assessor. If Emery's tax roll has a generic `City` column that is the mailing city (like Carbon's table does), this scraper would pick that up instead of the property city.
- **Evidence for concern:** The Emery table is cloned from the Carbon assessor pattern but with looser fallbacks. Carbon County's table has `PropertyCity` as the correct column; if Emery's equivalent is just `City` (the mailing city in Carbon's schema), `emery-tax-roll.ts` would pull the wrong field.
- **Evidence against concern:** The page is specifically a "tax roll" (not the assessor's dual-address table), and many county tax rolls only publish the property/situs address. However, this has not been verified against live Emery data.
- **Where it lands in DB:** `properties.address`, `properties.city` via `upsertFromAssessor()`
- **Severity:** **suspect — needs live data verification** (cannot confirm without inspecting the actual Emery tax roll table headers)

---

### emery-5year-backtax.ts

- **Upstream source:** Emery County 5-year back tax wpDataTable — `https://emery.utah.gov/home/offices/treasurer/5-year-back-tax-info/`
- **Source address field:** None. The table provides only `PARCEL NUMBER`, `NAME`, year columns (2021-2025), `OTHER YEARS`, and `TOTAL TAX`. No address column is parsed.
- **What it really is:** N/A — no address
- **Where it lands in DB:** `properties.address` = `""`, `properties.city` = `""` (explicit empty strings in `upsertFromEmery5Year()` call at upsert.ts line 301-304). Upsert guard preserves existing values.
- **Severity:** **clean** — no address data; no conflation risk

---

### utah-legals.ts (NOD scraper)

- **Upstream source:** utahlegals.com Foreclosures search — scrapes the 300-char snippet visible on search results (does NOT visit detail pages due to reCAPTCHA)
- **Source address field:** `extractAddress(snippet)` — a regex extraction from the notice body text looking for "commonly known as ...", "property located at ...", or bare street number patterns
- **What it really is:** **Property situs address** — foreclosure notices by law must describe the subject property, so the address extracted is the property being foreclosed, not the owner's mailing address.
- **Evidence:** Utah trustee sale notices (Utah Code 57-1-25) must identify the property being sold. The "commonly known as" language is legal boilerplate for the situs address. No mailing address appears in the snippet.
- **City determination:** For SLC notices, city is overridden with the UGRC parcel map lookup result (definitive), not the snippet's city. For rural counties, it uses the Utah Legals search-result city field, which is the law-firm's jurisdiction city (e.g., "Price" for Carbon County) — this is acceptable as a county-level approximation for rural properties.
- **Where it lands in DB:** `properties.address` (via `notice.propertyAddress`), `properties.city` (via `notice.city` or UGRC map override), `properties.zip` (via `notice.zip` for SLC only) — all through `upsertFromUtahLegals()`
- **Severity:** **clean** — extracted address is legally required to be situs; city determination is handled correctly for SLC via UGRC map

---

### carbon-recorder.ts

- **Upstream source:** None (placeholder — Carbon County recorder has no confirmed public online portal)
- **Source address field:** N/A — function always returns `[]`
- **Where it lands in DB:** Never called effectively
- **Severity:** **clean** (inactive placeholder)

---

### pdf-delinquent-parser.ts (Sevier, Juab, Millard, Sanpete counties)

- **Upstream sources:** County treasurer PDF pages
  - Sevier: `https://www.sevier.utah.gov/.../current_year_delinquent_tax_report.php`
  - Juab: `https://juabcounty.gov/notice-2025-delinquent-tax-list-copy/`
  - Millard: `https://millardcounty.gov/.../delinquent-tax-listing/`
  - Sanpete: `https://www.sanpetecountyutah.gov/treasurer.html` (no PDF yet — returns `[]`)
- **Source address field:** None. All county-specific line parsers extract only `parcelId`, `ownerName`, and `amountDue` from PDF text. No address columns exist in these PDF formats.
- **What it really is:** N/A — no address
- **Where it lands in DB:** `properties.address` = `""`, `properties.city` = `""` (empty defaults). Upsert guard preserves existing values.
- **Severity:** **clean** — no address data; no conflation risk

---

### llc-enrichment.ts

- **Upstream source:** Utah Division of Corporations BES — `https://businessregistration.utah.gov`
- **Source address field:** `agentAddress` — the registered agent's street address from BES entity detail page
- **What it really is:** The registered agent's address, which is the agent's office address (not the property situs address, not the owner's mailing address). This is a third type of address entirely.
- **Where it lands in DB:** NOT written to `properties.address`. Currently stored nowhere — the code comment (lines 490-511) acknowledges there is no freetext field in `owner_contacts` and leaves `phone` and `email` as `null`. The `agentAddress` is fetched but discarded.
- **Severity:** **clean** — registered agent address is not written to properties table

---

### tracerfy-enrichment.ts

- **Upstream source:** Tracerfy skip-trace API — `https://tracerfy.com/v1/api`
- **Source address fields:** `mail_address / mail_city / mail_state` from Tracerfy results (owner's mailing address as returned by skip trace)
- **What it really is:** Owner mailing address from skip trace — distinct from the property situs address that was submitted as input to Tracerfy.
- **Where it lands in DB:** Stored in `owner_contacts.email` as `"MAILING: <mail_address>, <mail_city>, <mail_state>"` with `source = 'tracerfy-address'`. **NOT written to `properties.address`.**
- **Input to Tracerfy:** Uses `properties.address / .city / .state / .zip` as the "property address" for skip trace input (lines 80-104). If those columns contain mailing addresses (as they do for SLCo delinquent rows), Tracerfy would receive wrong input for those properties — a downstream consequence of the slco-tax-delinquent bug.
- **Severity:** **clean for DB writes** (mailing address correctly segregated to owner_contacts); **indirectly affected** by slco-tax-delinquent bug (wrong input to Tracerfy for ~200 SLC rows)

---

## Findings

1. **Only slco-tax-delinquent.ts is confirmed-bugged.** It is the only scraper that writes an owner mailing address field directly to `properties.address / .city / .zip`. All other address-writing scrapers either use unambiguously-named situs columns (`PropertyAddress / PropertyCity` in Carbon's table), parse from legally-mandated situs descriptions (utah-legals), or write no address at all.

2. **Carbon County correctly handles dual-address data.** carbon-assessor.ts is the most sophisticated — it explicitly documents and handles the mailing/situs column separation, storing mailing address in `owner_contacts` (not `properties`). This is the reference implementation to follow.

3. **emery-tax-roll.ts is suspect but unverified.** Its fallback chain hits `getCell("city")` before `getCell("propertycity")`. If Emery's tax roll table has a mailing `City` column (as Carbon's assessor table does), the scraper would silently pull mailing city. This requires live verification by inspecting the actual Emery table headers.

4. **The schema has no proper owner_mailing_address path.** There are no `owner_mailing_street`, `owner_mailing_city`, `owner_mailing_zip`, or `owner_mailing_state` columns on the `properties` table. Mailing address data is shunted into `owner_contacts.email` with a `"MAILING: ..."` prefix — a known pragmatic workaround documented in the code. Any proper schema fix for the slco-tax-delinquent bug would require either (a) adding `owner_mailing_*` columns to `properties`, or (b) storing mailing in `owner_contacts` consistently with carbon-assessor's pattern.

5. **The slco bug has a downstream Tracerfy effect.** tracerfy-enrichment.ts uses `properties.address` as input to skip trace. For the ~200 SLCo delinquent rows where `properties.address` contains a PO Box or out-of-state mailing address, Tracerfy receives wrong property address input, wasting credits and likely returning no results.

6. **The SLCo API does not expose a situs address field.** The `TAX_SALE_ADDRESS` is the only address-like field in the TaxMQ endpoint response (`TaxSaleApiRow` interface). There is no `PROPERTY_ADDRESS` or `SITUS_ADDRESS` field available. A fix would require a second API call to the SLCo Parcel viewer or UGRC to look up situs address by parcel ID.

---

## Open questions for Brian

1. **emery-tax-roll.ts city column ambiguity.** Does the live Emery tax roll table have a `PropertyCity` column distinct from a mailing `City` column, or just one `City` column? This determines whether the scraper is clean or also conflated. Can be verified by looking at the live table headers logged by the scraper on next run.

2. **Schema decision for slco fix.** Two options:
   - Add `owner_mailing_street / _city / _zip / _state` columns to `properties` (proper schema separation) — requires migration + UI changes to display them
   - Store mailing in `owner_contacts` with source `'slco-auditor-mailing'` using the existing "MAILING:" convention — no migration needed, consistent with carbon-assessor pattern
   - Do nothing and live without a situs address for SLCo delinquent rows (set `address = ""`) until a situs lookup is added

3. **SLCo situs address source.** The UGRC `SaltLake_County_Addresses` layer (already used for the neighborhood map) contains parcel IDs and situs addresses. Is the full UGRC dataset with situs street addresses available in the already-generated data files, or would a new import job be needed?

4. **Retroactive data repair.** ~200 SLCo delinquent rows currently have mailing addresses in `properties.address`. If the schema decision is to use UGRC for situs, should those rows be backfilled, or is it acceptable to wait for the next scrape run after the fix?
