# Contact Enrichment Research: Phone, Email, and Mailing Address Lookup
# Rural Utah Property Owners — Carbon, Emery, Juab, Millard Counties

**Project:** HouseFinder — Rural Utah Distressed Property Lead Tool
**Question:** How do we find phone numbers, email addresses, and mailing addresses for 136 distressed property owners with zero contact info?
**Researched:** 2026-03-26
**Scale:** 136 critical leads — 113 individuals, 15 LLCs, 7 trusts, 1 unknown
**Overall Confidence:** HIGH for free manual tools, MEDIUM for paid automation, MEDIUM for government sources

---

## Executive Summary

There is no single free automated solution that will fill in all 136 records. The landscape breaks into three tiers:

**Tier 1 — Truly Free, Manual, Works Now:** TruePeopleSearch.com, ThatsThem.com, and FamilyTreeNow.com are genuinely free and do not require login for name-based reverse lookups. ThatsThem also supports free reverse address lookup. These three sites are the best starting point and the dashboard already links to two of them. Adding ThatsThem and FamilyTreeNow links would help immediately. For 136 leads, manual lookup via these sites takes 3–5 minutes per lead = roughly 7–12 hours total. That is realistic for a one-time enrichment session.

**Tier 2 — Very Cheap Paid Automation:** Tracerfy ($0.02/record) and DataZapp ($0.03/record) both offer REST APIs, no minimums, and pay-per-match pricing. Running all 136 critical leads through Tracerfy would cost $2.72 for the normal trace (up to 8 phone numbers + 5 emails per record) or $5.44 for the advanced trace (adds current mailing address). This is the highest ROI action available — under $10 total to enrich the entire critical leads list with phone numbers and emails. REISkip ($0.15/match, minimum 50 matches) is the next tier up with reportedly higher accuracy.

**Tier 3 — Government Sources (Free, Structured):** The county assessors already publish owner mailing addresses through their property search portals. Carbon County's property search at carbon.utah.gov explicitly shows owner mailing addresses that differ from property addresses — this is the tax bill mailing address. This data is already being scraped (or could be) since HouseFinder pulls from assessor data. The Utah SGID parcel LIR data does NOT include owner mailing addresses per its official schema, but the county assessor web portals do. A GRAMA request to any of the four county assessors could yield the full owner mailing address database for free or very low cost. Utah voter registration data explicitly excludes phone numbers and emails — that path is a dead end.

**Key constraint for rural Utah:** Many of these property owners are elderly, rural, and may only have landlines. National skip trace databases are weighted toward cell phone data from younger demographics. Expect a 50–70% match rate for phone numbers specifically, not the 90% quoted for national urban populations. Email match rates will be even lower — rural Utah seniors are less likely to have email addresses in any database. Managing this expectation is important: automated skip tracing will get phones for roughly half the leads; the other half require manual lookup or cold mail.

**TCPA compliance note:** The FCC's one-to-one consent rule that took effect January 27, 2025 was vacated by the Eleventh Circuit before it was enforced. The prior consent framework applies. More importantly, multiple federal courts have found that calls offering to BUY property (as opposed to selling services to the owner) do not constitute "telephone solicitation" under the TCPA at all. Brian's use case — calling distressed property owners to make an offer to purchase — has strong legal precedent as not requiring prior consent. Standard Do Not Call registry scrubbing is still required before calling.

---

## 1. Free People Search Websites (Manual Lookup)

These are the best free tools for individual manual lookups. No API, but one-click deep-links from the dashboard make them fast.

### 1.1 TruePeopleSearch.com

**Status:** Truly free. No login required. No credit card. Ad-supported.
**What it returns:** Current and historical phone numbers (cell + landline), current and historical addresses, known relatives and associates, age range.
**Reverse address lookup:** YES — can search by address to find residents.
**API:** No official API. Bot protection via Cloudflare + US geo-restriction makes automated scraping unreliable without a paid proxy service.
**ToS for automation:** TruePeopleSearch actively blocks non-browser traffic. Scraping requires a service like Scrape.do or Zyte API that handles Cloudflare bypass. n8n has a published workflow template for this. Not worth building unless you want to invest time in proxy management.
**Accuracy for rural Utah:** MEDIUM. Data is aggregated from public sources. Rural areas have less data density. Older residents may not appear.
**Deep-link for name search:**
```
https://www.truepeoplesearch.com/results?name=LARRY+LEON+CARTER&citystatezip=Green+River%2C+UT
```
**Deep-link for address search:**
```
https://www.truepeoplesearch.com/results?streetaddress=123+MAIN+ST&citystatezip=Green+River%2C+UT+84525
```
**Dashboard already links to this.** Keep. Add address-based link variant.

### 1.2 FastPeopleSearch.com

**Status:** Free core data. No login required.
**What it returns:** Name, phone numbers, address history, age range.
**Reverse address lookup:** YES.
**API:** No official API. Same Cloudflare + geo-restriction issues as TruePeopleSearch.
**Accuracy for rural Utah:** Similar to TruePeopleSearch — MEDIUM.
**Deep-link pattern:**
```
https://www.fastpeoplesearch.com/name/larry-leon-carter_green-river-ut
```
(Name must be lowercased and hyphenated; city must be hyphenated.)
**Dashboard already links to this.** Keep.

### 1.3 ThatsThem.com (ADD THIS — NOT CURRENTLY IN DASHBOARD)

**Status:** Truly free. No login required for basic searches.
**What it returns:** Phone numbers (with line type: cell vs. landline), email addresses, current and historical addresses, relatives.
**Reverse address lookup:** YES — explicitly offers free reverse address lookup.
**Unique value:** Returns email addresses as part of free results; TruePeopleSearch does not.
**API:** No public API found. The site warns that account holders are "automatically exempt from anti-bot security checks" — implying free users face some throttling, but basic searches work without an account.
**Data:** Claims ~2.2 billion names from 50+ sources, updated monthly.
**Deep-link for name search:**
```
https://thatsthem.com/name/larry-leon-carter/green-river-ut
```
**Deep-link for address search:**
```
https://thatsthem.com/reverse-address-lookup?address=123+Main+St&city=Green+River&state=UT&zip=84525
```
**Recommendation: Add ThatsThem to the dashboard as a third lookup link.** It's the only free site that returns email addresses in the results.

### 1.4 FamilyTreeNow.com (ADD THIS — ESPECIALLY FOR RURAL UTAH)

**Status:** Truly free. No login required. Genealogy-oriented.
**What it returns:** Current and historical addresses, phone numbers (sometimes), known relatives, age, historical records (census, vital records).
**Reverse address lookup:** No — name search only.
**Unique value for rural Utah:** Rural Utah families are multi-generational and genealogy databases are more comprehensive for them than national phone databases. If an elderly owner doesn't appear in phone databases, a relative often does. The relative list from FamilyTreeNow can identify a family member you can reach.
**API:** No API found.
**Limitations:** Less reliable for phone numbers specifically; strong for address history and relatives.
**Deep-link:**
```
https://www.familytreenow.com/search/people/results?first=LARRY&middle=LEON&last=CARTER&state=UT&citysearch=Green+River
```
**Recommendation: Add FamilyTreeNow to the dashboard.** Particularly valuable for the rural Utah demographic.

### 1.5 Whitepages.com

**Status:** Free previews only. Phone numbers and full details require a paid subscription ($24.99/mo or per-report fees).
**What it returns (free):** Name confirmation, city/state, teaser of address. Not useful for extracting phone numbers without paying.
**Verdict:** Dead end for free phone number lookup. The free tier shows you the person exists but not how to contact them.

### 1.6 Spokeo

**Status:** Free to see that a record exists. Paid to see contact details ($2.95 for a single report or $19.95/month subscription).
**What it returns (free):** Preview only — name, state.
**Verdict:** Not useful for free contact lookup. Skip.

### 1.7 BeenVerified

**Status:** Subscription required — no free tier. $26.89/month for unlimited reports.
**What it returns:** Comprehensive — phone, email, address, relatives, background check data.
**Verdict:** Not worth the cost at this scale. Use Tracerfy at $0.02/record instead.

### 1.8 Radaris

**Status:** Free previews, paid reports ($39.95 single report or membership).
**Verdict:** Too expensive per-report for this use case.

### 1.9 USPhoneBook.com

**Status:** Free for basic reverse phone lookup (phone-to-name). Not useful for address-to-phone lookup.
**Verdict:** Wrong direction for this use case. Skip.

### 1.10 National Cellular Directory

**Status:** Offers 2 free premium searches during a daily "Happy Hour" window (announced on social media). Otherwise requires subscription ($19.99–$249.99/month).
**What it returns:** Cell phone numbers, reverse address lookups.
**Verdict:** The Happy Hour promotion is too unpredictable for systematic use. Not reliable enough to plan around. Skip.

---

## 2. Paid Skip Tracing Services (Low Cost)

### 2.1 Tracerfy — RECOMMENDED FOR BULK AUTOMATION

**Pricing:** $0.02/record for Normal Trace; $0.04/record for Advanced Trace. Pay-per-match (no charge if not found). No minimums. No monthly fees.
**What it returns:**
- Normal Trace: Up to 8 phone numbers (cell + landline + VOIP), up to 5 email addresses
- Advanced Trace: All of Normal + current mailing address, relative names, aliases, past addresses
**API:** YES — REST API with Bearer token authentication. Endpoints include POST /trace/ (submit CSV), GET /queue/:id (fetch results), webhooks for job completion. Also supports bulk CSV upload via web UI.
**DNC scrubbing:** Built-in DNC scrub endpoint at no extra cost.
**Automation:** Fully automatable. Can be integrated into Azure Functions. Input: CSV with owner_name + property_address. Output: CSV with appended contact fields.
**Match rate:** 75–90% claimed. No rural Utah-specific data, but rural vs. urban match rates are reportedly similar for cell phones (80% of US homes are cell-only). Elderly landline-only owners in rural Utah are the hard cases — expect lower match rates for this subset.
**Cost for all 136 critical leads:**
- Normal trace: 136 × $0.02 = $2.72 (phone + email only)
- Advanced trace: 136 × $0.04 = $5.44 (phone + email + mailing address)
- At 75% match rate: you pay for ~102 records that return data
**ToS for automation:** Explicitly supports API use. Legal for real estate investor skip tracing.
**Integration approach for HouseFinder:**
1. Azure Function triggered when a lead has no contact info and score >= threshold
2. POST to `api.tracerfy.com/v1/trace/` with owner_name + property_address
3. On webhook callback, store returned phones/emails in `owner_contacts` table
4. Flag contacted_source = 'tracerfy_api' for attribution

**Confidence:** HIGH for pricing and API existence. MEDIUM for rural Utah match rates specifically.

### 2.2 DataZapp — ALTERNATIVE, SLIGHTLY CHEAPER

**Pricing:** $0.03/match (pay-per-go requires $125 minimum; pre-pay plans at $1,000+ reduce to $0.025/match and unlock API).
**What it returns:** Cell phone numbers, landlines, email addresses. No mailing address append in the basic skip trace service.
**API:** YES, but only with $1,000+ prepay account. Below that, upload-only via web portal.
**Minimum:** $125 minimum for pay-as-you-go = 4,167 records at $0.03. Too large a minimum for 136 records.
**Verdict:** The $125 minimum makes DataZapp impractical for this scale. Tracerfy's no-minimum model is better for under 200 records.

### 2.3 REISkip

**Pricing:** $0.15/match, minimum 50 matches ($7.50 minimum).
**What it returns:** Phone numbers, email addresses, social media handles. Uses "Skip Trace Triangulation Technology" — cross-references multiple sources.
**Match rate claimed:** 85–90%
**API:** Not found in research. Upload-only appears to be the primary interface.
**Verdict:** 5x more expensive than Tracerfy. The higher match rate claim is unverified. Use Tracerfy first; if match rate is poor, try REISkip for unmatched records.

### 2.4 BatchData (formerly BatchSkipTracing)

**Pricing:** ~$0.07–$0.20/match depending on volume. Also rebranded with new pricing tiers.
**What it returns:** Phone, email, owner data.
**API:** YES.
**Verdict:** More expensive than Tracerfy. Well-known brand but not the cheapest option anymore. Fine alternative if Tracerfy underperforms.

### 2.5 SearchBug People Search API

**Pricing:** $0.33–$0.79 per hit (sliding scale by volume). No charge if not found.
**What it returns:** Full names, all known phone numbers (with landline/wireless type), all addresses, relatives, date of birth, bankruptcy/lien/judgment records.
**API:** YES — REST API supporting search by name + address or address alone. Requires sandbox account request to test first.
**Match rate:** Claimed 87% average.
**Unique value:** Returns lien and judgment records alongside contact data — could be an additional distress signal.
**Verdict:** 10–40x more expensive per record than Tracerfy. Justified only if you need the legal records component. For contact-only enrichment, use Tracerfy.

---

## 3. Government / Public Record Sources

### 3.1 County Assessor Property Search — OWNER MAILING ADDRESSES (FREE)

**Status:** CONFIRMED AVAILABLE for Carbon County, likely available for others.

**Carbon County:** The property search at `https://www.carbon.utah.gov/service/property-search/` explicitly shows owner mailing addresses where they differ from the property address. A confirmed example shows "1710 W 3500 N, HELPER, UT" as the owner's mailing address while the property is at "605 E 400 S, PRICE, UT." This is the address the county sends tax bills to — the most reliable mailing address for reaching an absentee owner.

The data table at that URL is HTML with JavaScript-rendered rows. Fields include: parcel number, owner name, owner mailing address (Add1, Add2, city, state, zip), property address, status, acreage, district info.

**This is exactly what we need and it appears to be already in our assessor scraping pipeline or adjacent to it.** If the scraper doesn't currently extract the owner mailing address, adding that field extraction is a high-value, zero-cost enhancement.

**Emery County:** `https://emery.utah.gov/home/offices/assessor/` — online property search exists but specific fields not confirmed from research. Likely includes owner mailing address based on standard assessor data practices.

**Juab County:** `https://juabcounty.gov/recorder/` — no confirmed online property search for owner mailing addresses. May require GRAMA request.

**Millard County:** `https://millardcounty.gov/your-government/elected-officials/assessor/` — "County Property Information Search" tool exists. Fields not confirmed.

**Recommendation:** Verify that the current assessor scrapers extract owner mailing addresses. If not, add that field. The Carbon County scraper in particular can pull owner mailing address from the existing HTML table with minimal additional work.

### 3.2 GRAMA Request for Bulk Assessor Data (FREE or LOW COST)

**What it is:** Utah's Government Records Access and Management Act (GRAMA) gives the public a right to access unrestricted government records from any county agency.

**What you can request:** The complete assessor parcel database including owner names and mailing addresses. This is standard practice — county assessors routinely fulfill these requests for title companies, investors, and researchers.

**Cost:** Varies by county. Typically a nominal fee for staff time and media ($5–$50 for a data export). Some counties provide it free.

**Process:**
1. Write a letter to the county assessor's records officer requesting "a complete export of the parcel database including owner name and owner mailing address for all parcels in [County] County, Utah" under GRAMA (Utah Code §63G-2)
2. Response required within 10 business days
3. Likely delivered as a CSV or Excel file

**Counties to request from:**
- Carbon County Assessor: 120 East Main, Price, UT 84501 — assessor@carbon.utah.gov — (435) 636-3248
- Emery County Assessor: emery.utah.gov/home/offices/assessor/ — (435) 381-3560
- Juab County Assessor: (435) 623-3430
- Millard County Assessor: Fillmore (435) 743-5719, Delta (435) 864-3901 ext. 2

**Assessment:** A GRAMA request to all four counties would yield owner mailing addresses for every property in the database at essentially zero cost. This solves the mailing address problem completely. It does not provide phone numbers or emails.

**Confidence:** HIGH — GRAMA requests for assessor data are routine and well-established in Utah.

### 3.3 Utah SGID Parcel Data (GIS) — DOES NOT INCLUDE MAILING ADDRESSES

**Status:** The Utah SGID parcel LIR (Land Information Records) data is free to download for all four target counties via the ArcGIS Open Data portal. However, the standard LIR schema includes: PARCEL_ID, PARCEL_ADD, PARCEL_CITY, PARCEL_ZIP, OWN_TYPE (generalized: Federal/Private/State/Tribal), TOTAL_MKT_VALUE, LAND_MKT_VALUE, PARCEL_ACRES, PROP_CLASS, BLDG_SQFT, BUILT_YR, etc.

**Critical finding:** The standard SGID schema does NOT include owner name or owner mailing address. These fields are county-specific additions, not part of the standardized SGID export.

**For bulk parcel data with owner name and mailing address:** Use GRAMA request (section 3.2) or buy the commercial GIS parcel file from Mapping Solutions GIS ($300 one-time for Carbon County with 23,651 parcels including owner name + mailing address + site address).

**Verdict:** SGID is not the path to owner contact info. GRAMA is.

### 3.4 Utah Voter Registration Records — DEAD END FOR PHONES/EMAIL

**Confirmed:** Utah voter registration data explicitly EXCLUDES phone numbers and email addresses. These fields are classified as private under Utah Code §63G-2-302(j). The available voter file contains: name, voter ID, status, registration date, party, mailing address, precinct, district, and 2-cycle voting history.

**Cost:** $1,050 one-time purchase for the statewide file.

**Verdict:** Even if you bought the voter file, you would only get mailing addresses (which you can already get from assessor records for free). No phones. No emails. The $1,050 cost is not justified.

### 3.5 County Recorder Deed Records — MAILING ADDRESSES FOR TRUSTS

**Relevance:** For the 7 trust-owned critical leads specifically, the recorded deed transferring property to the trust must include the trustee's name and address by Utah law. This is already documented in the LLC/Trust research file. For the general individual owner population, deed records do not add contact information beyond what the assessor already has.

**Verdict:** Only useful for trust-owned leads. Already covered in llc-trust-ownership-research.md.

### 3.6 USPS NCOA (National Change of Address) — MAILING ADDRESS UPDATES

**What it does:** USPS NCOA processes your list of mailing addresses against the NCOA database (160 million change-of-address records from postal service filings) to return updated forwarding addresses when an owner has moved.

**Cost:** Multiple licensed providers offer NCOA processing:
- TrueNCOA: $20 flat per file (any size up to their tier limits)
- DMR Mail: $10 per thousand records ($40 minimum)
- NcoaSource: $0.75 per thousand records (very cheap for bulk)

**For 136 records:** TrueNCOA's $20 flat rate is simplest.

**What it returns:** For each record where a COA was filed: new forwarding address. Covers moves filed up to 48 months ago.

**Limitation:** Only returns a new address if the person filed a change-of-address with USPS. Rural Utah residents who own but don't live at a property may have moved without filing NCOA. Match rate for this use case is probably 15–25% — useful for a subset of leads but not comprehensive.

**Verdict:** Worth running for $20 as a one-time enrichment. Returns current mailing address for a fraction of leads where owners have moved. Complements assessor mailing address data.

---

## 4. Phone-Specific Lookup Services

### 4.1 NumLookup — REVERSE PHONE ONLY (Wrong Direction)

**What it does:** Given a phone number, returns the owner's name, carrier, and line type. Truly free.
**Limitation:** This goes phone → name. We need name → phone. NumLookup cannot help with the initial contact lookup problem.
**Use case:** Once Tracerfy returns a phone number, use NumLookup to verify the number is still active before calling.

### 4.2 411.com — FREE REVERSE ADDRESS

**Status:** 411.com claims free reverse address lookup for "finding who lives at an address." Aggregates 250+ million US records.
**Bot protection:** Google Tag Manager and analytics present, but no confirmed Cloudflare block.
**What it returns (free):** Resident names linked to an address. Phone numbers may require a paid report.
**Verdict:** Useful as a backup for reverse address lookups. Not confirmed to provide free phone numbers in the results. Use ThatsThem as the primary reverse address tool (confirmed free phone data).

### 4.3 AnyWho

**Status:** Free people search with reverse phone lookup. Updated weekly.
**What it returns:** Name, address lookups from name or phone.
**Verdict:** Secondary to TruePeopleSearch and ThatsThem. Smaller database. Lower confidence for rural Utah.

---

## 5. Email Discovery Services

### 5.1 Hunter.io — NOT USEFUL FOR HOMEOWNERS

**What it does:** Finds professional email addresses for people at companies, given a name + company domain.
**Why it doesn't apply:** Hunter.io requires a company domain name (e.g., @carboncoalcompany.com). Property owners in rural Utah are individuals, not corporate employees. Hunter.io cannot find personal email addresses (Gmail, Yahoo, etc.) for homeowners.
**Free tier:** 25 searches/month + 50 verifications/month. Not useful for this use case.
**Verdict:** Dead end. Not designed for residential individual contact finding.

### 5.2 Clearbit — NOT RELEVANT

**Same limitation as Hunter.io:** B2B email finder requiring company association. Not useful for individual rural Utah homeowners.
**Verdict:** Dead end.

### 5.3 Email Permutation (Guessing Common Patterns) — NOT PRACTICAL

**Approach:** Given a name, generate common email patterns (firstname.lastname@gmail.com, flastname@gmail.com, etc.) and verify via SMTP ping or email verification API.
**Problems:**
1. No way to know which email provider the person uses
2. SMTP verification is blocked by most major providers (Gmail, Yahoo, Outlook) with privacy protections
3. Even if you generate 10 patterns, hit rate is probably under 5% for non-technical rural Utah residents
**Verdict:** Not worth building. ThatsThem (free) and Tracerfy (paid) both return email addresses when they exist in public databases.

### 5.4 Email From Skip Trace (Tracerfy / REISkip)

Skip tracing services including Tracerfy and REISkip return email addresses as part of their standard results. These come from public records (voter registration in states that include email, social media profiles, e-commerce account registrations, etc.).

**Expected email match rate for rural Utah:** LOW — probably 20–35%. Rural Utah seniors are less likely to have email addresses in national databases. But at $0.02/record for Tracerfy, getting even 30 email addresses out of 136 leads is worth it.

---

## 6. LLC and Trust Owners (15 LLCs + 7 Trusts)

This is covered in detail in `llc-trust-ownership-research.md`. Summary for contact enrichment specifically:

### LLCs (15 critical leads)

**Primary path:** Utah Division of Corporations registered agent name + address. Already implemented as a one-click lookup link.

**For phone number:** The registered agent name can be fed into Tracerfy or TruePeopleSearch as an individual. If the registered agent is "John Smith" at "123 Main St, Price UT," skip trace John Smith directly.

**Alternative:** Utah Open Data Portal Socrata API returns registered agent name and address for free. Once you have the agent's name, treat them as an individual lookup.

### Trusts (7 critical leads)

**Primary path:** Trustee name is on the recorded deed. Extract trustee name from county recorder records.

**For phone number:** Once you have the trustee name (usually the same as the property owner's personal name), skip trace that person as an individual.

**Practical note:** For 7 trust-owned leads, manual lookup is the right approach. Not worth building automation for this scale.

---

## 7. TCPA Compliance and Legal Framework

### Is Calling Distressed Property Owners Compliant?

**Good news:** Multiple federal courts have ruled that calls offering to BUY property are NOT "telephone solicitations" under the TCPA. The TCPA targets calls that induce the recipient to make a purchase from the caller. A call from Brian offering to buy a distressed property owner's house is the opposite — Brian is the potential buyer. Several 2025 court decisions reaffirmed this distinction.

**What still applies:**
1. **Do Not Call Registry:** Still must scrub all phone numbers against the national DNC registry before calling. Most skip trace services (Tracerfy, REISkip) offer integrated DNC scrubbing.
2. **State-level laws:** Utah has its own telemarketing statute. However, the same buyer-side exemption reasoning generally applies at the state level.
3. **Robocall/ATDS rules:** Brian is calling manually, not using an auto-dialer. TCPA robocall restrictions don't apply to manual calls.

**Practical compliance for HouseFinder:**
- After skip tracing, run phone numbers through DNC scrub (included in Tracerfy's API)
- Flag DNC numbers in the dashboard as "DNC — mail only"
- For non-DNC numbers: manual calling is fully compliant

**Confidence:** MEDIUM — based on case law research. Not legal advice. Brian should verify current state with an attorney before large-scale calling campaigns.

---

## 8. Strategy by Owner Type

### Individuals (113 critical leads) — Recommended Approach

**Phase 1 — Free (Do This Week):**
1. Add ThatsThem and FamilyTreeNow as additional one-click lookup buttons in the dashboard contact tab (alongside existing TruePeopleSearch and FastPeopleSearch links)
2. For any lead already being worked, manually look up on TruePeopleSearch + ThatsThem (takes 3–5 min each)

**Phase 2 — Paid Bulk ($2.72–$5.44 total for all 136):**
1. Export all 136 critical leads to CSV (owner_name + property_address columns)
2. Upload to Tracerfy or use their API
3. Retrieve results (phone numbers, emails, optionally mailing address)
4. Import into `owner_contacts` table with `source = 'tracerfy'`
5. Run DNC scrub on returned phone numbers
6. Show enriched phone numbers in dashboard for click-to-call

**Phase 3 — Mailing Addresses (Free via GRAMA):**
1. Submit GRAMA requests to all four county assessors requesting parcel database export
2. Match returned data to existing properties by parcel ID
3. Populate owner mailing addresses for all properties, not just critical leads

### LLCs (15 critical leads) — Recommended Approach

1. Utah Div of Corporations one-click lookup (already in dashboard) — get registered agent name
2. Skip trace registered agent name as an individual through Tracerfy
3. Store contact as "Registered Agent: [Name]" in notes field

### Trusts (7 critical leads) — Recommended Approach

1. Pull deed from county recorder to identify trustee name
2. Skip trace trustee as individual through Tracerfy
3. If trustee matches owner name (common with living trusts), the individual path above already covers this

---

## 9. Automation Architecture for Paid Skip Tracing

When the time comes to build automated enrichment (Phase 2 above), this is the recommended implementation:

```typescript
// Azure Function: enrichLeadContacts
// Trigger: HTTP or timer (daily for new leads with no contact info)

interface TraceRequest {
  owner_name: string;
  property_address: string;
  parcel_id: string; // for matching results back to DB
}

interface TracerfyJobResult {
  phones: { number: string; type: 'cell' | 'landline' | 'voip'; dnc: boolean }[];
  emails: { email: string }[];
  mailing_address?: string; // Advanced trace only
}

// 1. Query DB: SELECT properties WHERE id NOT IN (SELECT property_id FROM owner_contacts)
//              AND distress_score >= 4  -- Only critical leads
// 2. POST batch to Tracerfy API: Bearer token from env var TRACERFY_API_KEY
// 3. Poll GET /queue/:jobId or receive webhook callback
// 4. For each result: INSERT INTO owner_contacts
//    (property_id, phone, source, created_at, dnc_flag)
// 5. Log: enriched N leads, match rate X%
```

**API endpoint:** `https://api.tracerfy.com/v1/trace/` (POST with CSV or JSON)
**Authentication:** Bearer token in Authorization header
**Cost control:** Add a daily cap (e.g., max 20 records per day) to stay within budget during testing
**Environment variable:** `TRACERFY_API_KEY` stored in Azure Key Vault or Function App settings

---

## 10. Summary Comparison Table

| Source | Cost | Data Returned | Automation | Match Rate | Best For |
|--------|------|---------------|------------|------------|---------|
| TruePeopleSearch | Free | Phone, address, relatives | Manual only (bot-blocked) | Medium | One-off lookups |
| ThatsThem | Free | Phone, email, address | Manual only | Medium | Email discovery + reverse address |
| FamilyTreeNow | Free | Address history, relatives, some phones | Manual only | Low-Med phones | Finding relatives of rural owners |
| FastPeopleSearch | Free | Phone, address | Manual only (bot-blocked) | Medium | Batch manual checks |
| Tracerfy API | $0.02/record | Up to 8 phones, 5 emails | YES — REST API | 75-90% | Bulk automated enrichment |
| Tracerfy Advanced | $0.04/record | Phones + emails + mailing address | YES — REST API | 75-90% | Full contact + mailing enrichment |
| DataZapp | $0.03/record ($125 min) | Phones, emails | API ($1K+ prepay) | 60% match | Too expensive for this scale |
| REISkip | $0.15/record | Phones, email | Upload only | 85-90% | Higher accuracy fallback |
| BatchData | $0.07-0.20/record | Phones, email | YES — REST API | Medium | Well-known brand |
| SearchBug API | $0.33-0.79/hit | Phone, address, legal records | YES — REST API | 87% | Legal records bonus |
| County Assessor (GRAMA) | Free–$50 | Owner mailing address | One-time bulk import | 100% | Mailing address only |
| USPS NCOA | $20 flat (TrueNCOA) | Updated forwarding address | Batch upload | 15-25% | Updated addresses for movers |
| Utah Voter File | $1,050 | Mailing address only (no phone/email) | One-time import | N/A | NOT WORTH IT |
| Hunter.io | 25/mo free | Professional email only | API | N/A | NOT USEFUL (needs domain) |
| OpenPeopleSearch | Discontinued | N/A | N/A | N/A | Dead end |

---

## 11. Gaps and Unknowns

| Question | Status | How to Resolve |
|----------|--------|----------------|
| Emery/Juab/Millard assessor portals — do they expose owner mailing addresses online? | Unconfirmed | Visit each portal, try a parcel search |
| Current scraper — does it extract owner mailing address field from Carbon assessor? | Unknown | Review scraper source code and check `properties` table schema |
| Tracerfy actual match rate for Green River UT / rural Carbon/Emery county addresses | Untested | Run a 10-record test batch ($0.20) to validate before full enrichment |
| DNC scrub results — what % of returned phones are on DNC list? | Unknown | Will be known after first Tracerfy run with DNC scrub enabled |
| ThatsThem ToS — does automated/bulk use via API violate terms? | Unknown | No public API found; manual use via browser link is clearly fine |

---

## 12. Recommended Action Plan (In Priority Order)

**Immediate (no cost, 1–2 hours of work):**

1. **Add ThatsThem to dashboard** as a third one-click lookup button (returns emails, free reverse address)
2. **Add FamilyTreeNow to dashboard** as a fourth button (relatives + address history for rural owners)
3. **Verify current scraper captures owner mailing address** from Carbon County assessor table — it's already in the data; just needs extraction

**Short term ($5–10, 1 day of work):**

4. **Run Tracerfy batch on all 136 critical leads** — export CSV, upload to Tracerfy, pay ~$3–6, import results to owner_contacts table. One-time manual operation; no code needed to start.
5. **DNC scrub all returned phone numbers** using Tracerfy's included DNC scrub endpoint

**Medium term (free, 1–3 weeks for GRAMA responses):**

6. **Submit GRAMA requests to all 4 county assessors** for bulk parcel export with owner mailing addresses. This solves mailing addresses for all properties, not just critical leads. Enables direct mail as a backup channel.

**Later (optional, ~1 day of API integration work):**

7. **Build Tracerfy API integration** as an Azure Function — auto-enrich new high-score leads without manual CSV export. Trigger: new lead reaches score >= 4 with no contact info.

---

## Sources

- [TruePeopleSearch — Scraping with Scrape.do](https://scrape.do/blog/true-people-search-scraping/) — confirms bot protection details
- [n8n workflow: TruePeopleSearch skip tracing via Zyte API](https://n8n.io/workflows/6886-skip-tracing-extract-phones-and-emails-from-truepeoplesearch-with-zyte-api/)
- [Utah Voter Registration Data — official state page](https://vote.utah.gov/obtain-voter-registration-or-election-data/) — confirms no phone/email in voter file, $1,050 cost
- [ThatsThem Free Reverse Address Lookup](https://thatsthem.com/reverse-address-lookup) — confirmed free, returns phone + email
- [FamilyTreeNow — skip tracing review](https://www.skipease.com/blog/site/familytreenow/) — rural use cases
- [Ballpoint Marketing — 6 Free Skip Tracing Tools 2025](https://ballpointmarketing.com/blogs/agents/6-free-skip-tracing-tools-for-real-estate-in-2025)
- [Tracerfy Skip Tracing API](https://www.tracerfy.com/skip-tracing-api) — API endpoints, $0.02/record pricing, DNC scrub
- [Tracerfy Pricing](https://www.tracerfy.com/pricing) — $0.02 normal / $0.04 advanced
- [DataZapp Skip Tracing](https://www.datazapp.com/skip-tracing-real-estate-marketing/) — $0.03/match, $125 minimum
- [DataZapp API Documentation](https://knowledgebase.datazapp.com/apis/) — API requires $1K+ prepay
- [REISkip Pricing](https://www.reiskip.com/pricing/) — $0.15/match, 50 minimum
- [BatchData Pricing](https://batchdata.io/pricing) — $0.07+ per record
- [SearchBug People Search API](https://www.searchbug.com/api/phone-name-address-email.aspx) — $0.33-0.79/hit with lien data
- [PropStream Free Skip Tracing](https://www.propstream.com/skip-tracing) — included in $99/mo subscription
- [BatchData Skip Tracing Review](https://www.realestateskills.com/blog/batchskiptracing-review)
- [Top 12 Free Skip Tracing Sites](https://tabtablabs.com/blog/free-skip-tracing-sites) — comparison article
- [Carbon County Property Search](https://www.carbon.utah.gov/service/property-search/) — confirmed shows owner mailing addresses
- [Carbon County GIS Parcel Data — Mapping Solutions](https://mappingsolutionsgis.com/carbon-county-utah-gis-parcel-data/) — $300 for shapefile with owner name + mailing address
- [UGRC Utah Parcels](https://gis.utah.gov/products/sgid/cadastre/parcels/) — SGID LIR schema (does NOT include owner name/mailing address)
- [Utah Carbon County Parcels LIR — ArcGIS](https://opendata.gis.utah.gov/maps/utah::utah-carbon-county-parcels-lir/explore)
- [USPS NCOALink Overview](https://postalpro.usps.com/mailing-and-shipping-services/NCOALink)
- [TrueNCOA Pricing](https://truencoa.com/pricing/) — $20 flat per file
- [NcoaSource Pricing](https://www.ncoasource.com/pricing.htm) — $0.75/thousand records
- [Weber County GRAMA Records Request](https://www.webercountyutah.gov/Assessor/grama1.php) — GRAMA process example
- [TCPA Cold Calling — Are Real Estate Purchase Calls Solicitations?](https://www.rothjackson.com/blog/2025/06/are-real-estate-purchase-calls-telephone-solicitations-another-federal-district-court-says-no/)
- [NAR Telemarketing and Cold Calling Guide](https://www.nar.realtor/telemarketing-cold-calling)
- [FCC One-to-One Consent Rule Vacated by Eleventh Circuit](https://www.nar.realtor/videos/window-to-the-law/fcc-one-to-one-consent-rule-vacated)
- [TCPA Compliance for Real Estate Investors — DealMachine](https://www.dealmachine.com/blog/tcpa-compliance-for-real-estate-investors-what-to-know)
- [DNC List for Real Estate — REDX Guide](https://www.redx.com/blog/agents-dnc-list-tcpa-guide/)

---

*Researched: 2026-03-26*
*Author: Research agent (contact enrichment)*
*Confidence: HIGH for free manual tools and pricing; MEDIUM for match rates and rural Utah accuracy; HIGH for GRAMA/government sources*
