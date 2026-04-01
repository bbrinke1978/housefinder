# LLC and Trust Ownership Lookup Research

**Project:** HouseFinder — Rural Utah Distressed Property Lead Tool
**Question:** How do we find the actual humans behind LLC/Trust-owned distressed properties?
**Researched:** 2026-03-19
**Scale:** 401 entity-owned properties out of 2,011 total (370 LLCs, 28 trusts, 3 estates)
**Overall confidence:** HIGH for LLC lookup, MEDIUM for trusts, MEDIUM for estates

---

## Executive Summary

LLCs are the most tractable problem. Utah requires LLCs to register with the Division of Corporations and disclose a registered agent plus principal officers/members in filings. This data is publicly accessible for free via the state's business registration portal. The registered agent is almost always a real person with a name and mailing address — that's your contact.

Trusts are harder. Utah does not maintain a trust registry. A living trust is not filed with any government agency. The only public record that reveals trustee identity is the deed recorded when property was transferred into the trust — which is in the county recorder's records. For the four target counties, online deed search availability is partial (Carbon County has some online access; Emery County has GIS-based search; Juab and Millard have no confirmed online portal).

Estates (probate) are searchable via Utah Courts Xchange, but it costs $40/month + $1 per document. The personal representative's name and address appear in case filings. For only 3 estate-owned properties, manual lookup is sufficient.

**Bottom line for the app:** Two features are worth building. (1) Auto-generate a deep-link to the Utah Division of Corporations search pre-filled with the LLC name. (2) Auto-generate a deep-link to the county recorder's online search. Both are one-click from the property detail page and require zero API cost. The full automation path (scraping state records to resolve LLC → person name) is feasible but involves more complexity and is worth doing only after the one-click approach is validated.

---

## 1. Utah Division of Corporations (commerce.utah.gov)

### Overview

The Utah Division of Corporations and Commercial Code maintains a free, public, searchable database of all registered Utah businesses.

**Primary search portal:** https://businessregistration.utah.gov/EntitySearch/OnlineEntitySearch

**Searches page (all search types):** https://commerce.utah.gov/corporations/searches/

### What Is Searchable

You can search by:
- Business name (the most useful for this use case — you have the LLC name from the deed)
- Entity number
- Registered principal/officer name (search for a person's name and find all entities they are associated with)

### What Data Is Returned

For each LLC, the free public search returns:
- Legal entity name
- Entity type (LLC, Corp, etc.)
- Entity number
- Status (Active, Expired, Delinquent, Withdrawn)
- Registration date
- Principal address (mailing address of the LLC)
- **Registered agent name and address** — this is the key contact field
- Officers/principals via a "Principals" button

**Important caveat on principals:** One source reports a $1.00 fee per business entity to view the full principal/member list. The basic record showing registered agent is free. The registered agent is typically sufficient — they are legally obligated to receive correspondence on behalf of the LLC and in a small rural Utah LLC they are very often the actual owner.

### Registered Principal Search

A separate search mode called "Registered Principal Search" lets you find all entities associated with an individual. This is useful if you find one person connected to one LLC and want to know what else they own.

### Is There an API?

**No official API.** The Division of Corporations does not publish an API. However:

**Option A — Utah Open Data Portal (free):**
A Businesses dataset exists at: https://opendata.utah.gov/dataset/Businesses/pm22-ivf8

This portal runs on Socrata, which provides a standard REST API. The dataset appears to include registered agent and officer/principal data. The Socrata API pattern would be:
```
GET https://opendata.utah.gov/resource/pm22-ivf8.json?$where=entity_name="AJB HOLDINGS LLC"
```
Field names need verification against the actual dataset schema. The dataset is from the Division of Corporations bulk export, so it should contain the same fields as the web portal.

**Option B — Utah Bulk Data Request (paid, cheap):**
https://secure.utah.gov/datarequest/businesses/index.html

For $0.01/record (minimum $5.00 fee for first 200 records), you can download a customized list including:
- Business name and address
- Registered officers
- Principals/partners
- Registered agents

A one-time download of all active Utah LLCs with Carbon/Emery/Juab/Millard county addresses would cost approximately $5–$10 and give you a local lookup table. This could be re-downloaded monthly.

**Option C — Web scraping the search portal:**
The portal is a standard HTML form at businessregistration.utah.gov. It is not JavaScript-rendered — it responds to a GET/POST with the business name and returns HTML results. This is scrapable with a simple HTTP request + HTML parser (no Playwright needed). No terms of service explicitly prohibit scraping for non-commercial research use, though the bulk data purchase is the cleaner path.

**Option D — OpenCorporates API:**
- Free tier: 200 requests/month, 50/day
- Endpoint: `https://api.opencorporates.com/v0.4/companies/search?q=AJB+HOLDINGS+LLC&jurisdiction_code=us_ut`
- Returns: company name, registered address, incorporation date, officers array
- Officers array includes registered agent (position: "agent"), with name
- **Limitation:** Rate limit is too low for bulk processing (370 LLCs would exhaust 2 months of free quota). Use for on-demand lookups per property, not bulk enrichment.
- **Confidence:** MEDIUM — OpenCorporates pulls from state sources but may lag by weeks.

### Deep-Link Pattern (One-Click Lookup)

For any LLC name on a property, generate this URL:
```
https://businessregistration.utah.gov/EntitySearch/OnlineEntitySearch?searchValue=AJB+HOLDINGS+LLC&searchType=EntityName
```
This drops the user directly into the search results for that entity. Zero API cost. Works today.

---

## 2. Trust Ownership

### The Core Problem

Utah does not maintain a trust registry. A revocable living trust (by far the most common type for property ownership) is a **private document** — it is never filed with any state agency. The trust agreement itself is not public record.

### What IS Public Record

When real property is conveyed to a trust, the deed transferring title must be recorded with the county recorder. Under Utah law (Utah Code § 57-1-20 and recording standards), a deed to a trust must include:
- The name of the trustee
- The address of the trustee
- The name of the trust
- The date of the trust

**This means: the trustee's name and address are in the recorded deed.** This is the most reliable free source for trust ownership.

### How to Access It

You need to find the deed that transferred property into the trust. Search the county recorder's recorded documents by property address or parcel number. Look for a deed where the grantee contains the word "Trustee" or "Trust."

**County-by-county online access:**

| County | Online Deed Search | URL / Notes |
|--------|-------------------|-------------|
| Carbon | Partial — "select records online" available | https://www.carbon.utah.gov/department/recorder/ — limited online access; call (435) 636-3265 |
| Emery | GIS-based search only | https://experience.arcgis.com/experience/f249bb931aaa45f1b89131ccc3ce3fe0 — location search, not document search |
| Juab | Not confirmed online | https://juabcounty.gov/recorder/ — call (435) 623-3430 |
| Millard | Not confirmed online | Call (435) 743-6210, Connie Hansen |

**Third-party aggregator:** NETROnline lists Utah county recorder access:
https://publicrecords.netronline.com/state/UT

PropertyChecker.com has Carbon County property records:
https://utah.propertychecker.com/carbon-county

HomeInfoMax has Carbon County documents:
https://www.homeinfomax.com/public/county/49007/utah/carbon

### Practical Approach for the App

For trust-owned properties, generate a one-click link to the county recorder's document search pre-filled with the parcel number or property address. The user searches for the deed, finds the trustee name, and can then skip trace that person as an individual.

Deep-link pattern for Carbon County recorder:
```
https://www.carbon.utah.gov/department/recorder/
```
(No pre-fill URL pattern confirmed — may require manual navigation once on site.)

### Investor Reality on Trusts

From BiggerPockets forum research: "They are designed to make it nearly impossible to figure out who owns the trust." However, this overstates it for property-owning trusts. Because Utah law requires trustee name on the deed, the recorded deed is the key. The challenge is that many county recorders in rural Utah have poor online search interfaces, requiring either in-person visits or phone calls.

**Confidence:** MEDIUM — trustee name is legally required on recorded deeds, but online accessibility of those deeds varies by county.

---

## 3. Estate / Probate Ownership

### Scale

Only 3 estate-owned properties in the current dataset. Manual lookup is the right approach here.

### Where to Find Executor / Personal Representative

In Utah, probate cases are filed in the District Court for the county where the decedent lived or owned property. The personal representative (executor) is appointed by the court and their name appears in the probate case filing.

**Utah Courts Xchange** is the primary online search system:
- URL: https://xchange.utcourts.gov/
- Covers all Utah district courts including Carbon, Emery, Juab, and Millard counties
- You can search by party name or case number
- Returns: parties' names, documents filed, addresses (when entered), hearings, judgments

**Xchange fee structure (as of July 2025):**
- Monthly subscription: $25 setup + $40/month (includes 500 searches)
- Documents: $1.00 each
- One-time use account: $10 setup + $0.35/search + $1.00/document

### Free Alternative

Utah Division of Archives maintains digital probate record indexes, but these are historical (pre-2000s) and not useful for current estates.

For current probate: the Carbon County District Court is the 7th District Court. You can call the court clerk directly to ask about a specific estate without paying Xchange fees.

- Carbon/Emery 7th District Court (Price): (435) 636-3400
- Juab/Millard 4th District Court (Provo): (801) 429-1000

### Practical Approach for the App

Generate a one-click Xchange search link pre-filled with the owner name from the property record:
```
https://xchange.utcourts.gov/ (search manually — no deep-link URL pattern confirmed)
```

Because there are only 3 estate-owned properties, the better UX is simply to display a note: "This property is owned by an estate. Search Utah Courts Xchange for the personal representative: [link]"

---

## 4. County Recorder Online Document Search

### Purpose for This Project

County recorder records serve two functions:
1. Finding trustee name for trust-owned properties (deed shows trustee)
2. Finding individual behind LLC when LLC signed loan documents or building permits

### Per-County Assessment

**Carbon County**
- Online access: Partial — some records accessible online
- Website: https://www.carbon.utah.gov/department/recorder/
- Phone: (435) 636-3265
- Email: recorders@carbon.utah.gov
- Address: 751 E 100 N, Suite #1300, Price, UT 84501
- Note: Offers remote lookup via "Recorded Document Lookup" platform; search by recording date, entry number, book/page, instrument type, legal description. The URL for the online portal is not published on the main page — call to get the direct link.
- Confidence: MEDIUM

**Emery County**
- Online access: GIS map search only (not a document text search)
- Website: https://emerycounty.com/home/offices/recorder/
- ArcGIS portal: https://experience.arcgis.com/experience/f249bb931aaa45f1b89131ccc3ce3fe0
- Phone: (435) 381-3520
- Note: The ArcGIS portal allows location-based lookups but is not a deed document search. For actual deed text, in-person or phone request likely required.
- Confidence: MEDIUM (GIS confirmed online, full document search not confirmed)

**Juab County**
- Online access: Not confirmed
- Website: https://juabcounty.gov/recorder/
- Phone: (435) 623-3430
- Hours: Mon–Thu 7AM–6PM
- Note: Records are public but no online portal confirmed. Likely in-person only.
- Confidence: LOW

**Millard County**
- Online access: Not confirmed
- Recorder: Connie Hansen
- Address: 50 South Main, Fillmore, UT 84631
- Phone: (435) 743-6210
- Note: No online portal confirmed. In-person or phone request likely required.
- Confidence: LOW

### Third-Party Aggregators (Free)

Several commercial sites aggregate Utah county recorder data and may provide faster online lookup:

- **NETROnline:** https://publicrecords.netronline.com/state/UT — lists all Utah counties and links to their online portals; most authoritative directory
- **PropertyChecker.com:** https://utah.propertychecker.com/carbon-county — Carbon County deeds and permits
- **HomeInfoMax:** https://www.homeinfomax.com/public/county/49007/utah/carbon — Carbon County documents
- **Deeds.com:** https://www.deeds.com/recorder/utah/carbon/ — recorder info and document purchase

---

## 5. Should LLC/Trust Properties Be Filtered Separately?

### Investor Context

From industry research (PropertyRadar, REISkip, BiggerPockets forums):

**Are LLC-owned distressed properties worth pursuing?**
Yes — often more motivated than individual owners. An LLC that owns a distressed rural Utah property is likely:
- A small landlord who set up an LLC for liability protection (very common in rural UT)
- A family holding entity (often one person or a family)
- A small investor who stopped managing the property

The LLC structure adds one step (find the person), but the underlying seller motivation is the same or higher. Small rural LLCs are rarely professional institutional investors who would be hard to deal with.

**Are trusts worth pursuing?**
Mixed. Revocable living trusts are typically individual homeowners doing estate planning — these are normal sellers. Irrevocable trusts or complex family trusts can be harder deals (multiple trustees, court involvement). At 28 properties, treat them like individuals until you find one that's complicated.

**The real challenge:** You can't look up "AJB HOLDINGS LLC" in a phone book. The registered agent is the contact path.

### Recommended Dashboard Treatment

**Filter option:** Add "Owner Type" as a filter dimension with values:
- Individual (default selected)
- LLC / Corporation
- Trust
- Estate

This lets the user choose to work LLC-owned leads separately (for a skip-trace session) vs. individual-owned leads (direct phone outreach). They are different workflows.

**Property detail page badge:** Show "LLC-owned" or "Trust-owned" prominently with a one-click lookup button:
- For LLCs: "Look up registered agent" → opens Utah Division of Corporations search
- For Trusts: "Search county recorder for deed" → opens county recorder search
- For Estates: "Search probate court" → opens Utah Courts Xchange

---

## 6. Free Tools Summary and Automation Potential

### Tool Comparison

| Tool | Data Available | Free Tier | Automation Potential | Confidence |
|------|---------------|-----------|---------------------|------------|
| Utah Div. of Corporations (web) | Registered agent name + address, principal address, status | Fully free | Scrapable (no JS required); one-click deep-link works today | HIGH |
| Utah Open Data Portal (API) | Same as above, via Socrata API | Free (no key required for public datasets) | Full automation via REST API; needs schema verification | MEDIUM |
| Utah Bulk Data Request | Full officer/principal/agent list | $0.01/record (~$5 for all LLCs) | One-time download + local lookup table | HIGH |
| OpenCorporates API | Registered agent, officers, registration details | 200 req/month, 50/day | Too slow for bulk (370 LLCs = 2 months), fine for on-demand | MEDIUM |
| County Recorder (Carbon) | Deed documents showing trustee name | Free to view online (some records) | Partial — link generation only; parsing PDFs is hard | MEDIUM |
| County Recorder (Emery/Juab/Millard) | Same | In-person / phone only for most records | Link generation only | LOW |
| Utah Courts Xchange | Probate case: personal representative name/address | $40/month or $0.35/search | Not worth automating for 3 estate properties | MEDIUM |
| CorporationWiki | Cross-entity connections, officer associations | Free to browse | Scrapable but no official API; changes frequently | LOW |

### Recommended Implementation Path

**Phase A (quick win — 1 day of work):**

Add to every property detail page where owner_name matches `LLC|L\.L\.C\.|INC|CORP|TRUST|ESTATE` (case-insensitive):

1. An "Owner Type" badge (LLC / Trust / Estate)
2. A one-click lookup button:
   - LLC: `https://businessregistration.utah.gov/EntitySearch/OnlineEntitySearch?searchValue=<URL_ENCODED_NAME>&searchType=EntityName`
   - Trust: Link to county recorder based on property county
   - Estate: Link to Xchange with note about search

This costs nothing and works immediately.

**Phase B (moderate automation — 2–3 days of work):**

Add background enrichment for LLC-owned properties only:

1. On new property insert, if owner_name contains LLC indicators, queue an enrichment job
2. Job calls Utah Open Data Portal Socrata API:
   ```
   GET https://opendata.utah.gov/resource/pm22-ivf8.json?$where=entity_name="<LLC_NAME>"
   ```
3. If found: extract registered agent name, registered agent address, principal address
4. Store in `owner_contacts` table with source="utah_div_corps"
5. Display on property detail: "Registered Agent: John Smith, 123 Main St, Price UT"

**Phase C (bulk enrichment — worth doing once):**

Purchase the Utah bulk data export (~$5–$10) for all active Utah LLCs. Load into a local lookup table. For all 370 existing LLC-owned properties, batch-match against this table to pre-populate registered agent info. Re-run monthly to catch registration changes.

---

## 7. Detection Logic (Classifying Owner Type)

Current data has raw owner names from county assessor records. Classification logic:

```typescript
function classifyOwnerType(ownerName: string): 'individual' | 'llc' | 'trust' | 'estate' | 'unknown' {
  const upper = ownerName.toUpperCase();

  if (/\bLLC\b|L\.L\.C\.|L\.C\.|LIMITED LIABILITY/.test(upper)) return 'llc';
  if (/\bINC\b|\bINCORPORATED\b|\bCORP\b|\bCORPORATION\b/.test(upper)) return 'llc'; // treat corps same
  if (/\bTRUST\b|\bTRUSTEE\b|\bLIVING TRUST\b|\bREVOCABLE\b/.test(upper)) return 'trust';
  if (/\bESTATE\b|\bESTATE OF\b/.test(upper)) return 'estate';

  return 'individual';
}
```

This classification should be added to the `properties` table as an `owner_type` enum column, computed at scrape time. This enables dashboard filtering without re-parsing names on every query.

---

## 8. Pitfalls and Edge Cases

### LLC Registered in Another State
Some Utah property owners use Wyoming or Nevada LLCs (lower cost, more privacy). A "Wyoming LLC" owning Utah property would appear in Utah assessor records but NOT in the Utah Division of Corporations database. OpenCorporates covers all 50 states and is the fallback here. Wyoming charges $1.00/lookup via their Secretary of State site.

### Registered Agent is a Law Firm or Incorporation Service
Many LLCs use a registered agent service (Northwest Registered Agent, Registered Agents Inc., etc.) rather than a person. The registered agent will be something like "Northwest Registered Agent LLC" at a generic address. This is a dead end for direct contact. In this case, you need to find the managing member from state filings.

**Frequency in rural Utah:** LOW. Small rural LLCs typically use a local attorney or the owner directly as registered agent. The professional RA service pattern is more common with larger investors.

### Trust With No Recorded Deed
If the property was originally purchased in an individual's name and later transferred to a trust via an unrecorded trustee's deed or certificate of trust, the county assessor may show "JOHN SMITH TRUSTEE" but there may be no deed with a full address on record. In this case, the assessor record itself may have the trustee name — which is often the owner's real name.

### Delinquent / Withdrawn LLCs
An LLC that stopped paying annual fees becomes "delinquent" or "withdrawn" in the Division of Corporations records. The entity still shows up in searches but the registered agent info may be outdated. For a distressed property, this pattern (delinquent LLC + delinquent taxes) is actually a strong signal of motivated/unreachable owner. Flag these as "high distress, hard contact."

### Estate With No Probate Filed
Not all deaths require probate in Utah. Small estates (under $100,000) can transfer via affidavit. In this case there would be no court case to find. The property may still be listed under the deceased person's name in county records for months or years. Look for "ESTATE OF [NAME]" in the owner field — that phrasing typically means formal probate was opened.

---

## Sources

- [Utah Division of Corporations — Searches](https://corporations.utah.gov/searches/) — official portal
- [Utah Business Registration — Entity Search](https://businessregistration.utah.gov/EntitySearch/OnlineEntitySearch) — official search tool
- [Utah Bulk Data Request — Businesses](https://secure.utah.gov/datarequest/businesses/index.html) — $0.01/record export
- [Utah Open Data Portal — Businesses Dataset](https://opendata.utah.gov/dataset/Businesses/pm22-ivf8) — Socrata API
- [OpenCorporates API Reference](https://api.opencorporates.com/documentation/API-Reference) — 200 req/month free tier
- [OpenCorporates — Getting Started 2025](https://blog.opencorporates.com/2025/02/13/getting-started-with-the-opencorporates-api/)
- [PropertyRadar — 4 Ways to Find LLC Owners](https://www.propertyradar.com/blog/how-to-find-llc-owners) — investor workflow guide
- [BiggerPockets Forum — Skip Tracing LLCs and Trusts](https://www.biggerpockets.com/forums/93/topics/631845-skip-tracing-llcs-trusts-companies) — practitioner insights
- [Utah Courts Xchange — Subscribe](https://www.utcourts.gov/en/court-records-publications/records/xchange/subscribe.html) — $40/month probate search
- [Utah Courts Xchange — Public Case Search](https://www.utcourts.gov/en/court-records-publications/records/xchange.html)
- [Utah Division of Archives — Probate Records Guide](https://archives.utah.gov/research/guides/courts-probate/)
- [Carbon County Recorder](https://www.carbon.utah.gov/department/recorder/) — (435) 636-3265
- [Emery County Recorder](https://emerycounty.com/home/offices/recorder/) — (435) 381-3520
- [Juab County Recorder](https://juabcounty.gov/recorder/) — (435) 623-3430
- [NETROnline Utah Public Records](https://publicrecords.netronline.com/state/UT) — county recorder directory
- [Utah Code § 57-1-20 — Trust deed requirements](https://ascentlawfirm.com/utah-real-estate-code-57-1-20/) — trustee name required on deed
- [DealMachine — Corporate Skip Tracing](https://www.dealmachine.com/blog/mastering-corporate-skip-tracing-in-real-estate-investing) — investor workflow
- [Deeds.com — Carbon County Recorder](https://www.deeds.com/recorder/utah/carbon/)

---

*Researched: 2026-03-19*
*Author: Research agent (Phase 6 / LLC-trust ownership)*
