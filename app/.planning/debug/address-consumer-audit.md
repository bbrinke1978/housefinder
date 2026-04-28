---
created: 2026-04-26
status: research
purpose: Identify all consumers of properties.address/city/zip to understand schema-change impact
---

## Summary

`properties.address`, `properties.city`, and `properties.zip` are consumed across 6 major categories: UI rendering (8 components), search/filtering (2 query sets in `queries.ts`), geocoding (1 script), skip-trace/contact enrichment (3 critical paths in `tracerfy-actions.ts`), exports/CSV (2 paths via `analytics-queries.ts`), and server actions/business logic (5 files). The highest-risk consumers are (1) the Tracerfy skip-trace engine, which sends `address + city + zip` as the property lookup key and hard-blocks with an error when `address` is empty; (2) the geocoding script, which constructs Mapbox queries from those three fields; and (3) the city-based filtering system that powers dashboard stats, map views, analytics, and campaign dispatch — all of which rely on `properties.city` to route records to the correct market. One existing mailing-vs-situs differentiation already exists: Tracerfy enrichment stores owner mailing addresses in `owner_contacts.email` with a `MAILING:` prefix, and this sentinel is actively filtered out in 6+ places throughout the app. No code currently holds or reads `owner_mailing_address` as a separate property column.

---

## Property type definition

From `app/src/db/schema.ts` (lines 44–78):

```ts
export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  parcelId: text("parcel_id").notNull().unique(),
  address: text("address").notNull(),   // ← NOT NULL but schema allows empty string
  city: text("city").notNull(),         // ← NOT NULL but schema allows empty string
  state: text("state").notNull().default("UT"),
  zip: text("zip"),                     // ← nullable
  county: text("county").notNull(),
  ownerName: text("owner_name"),        // nullable
  ownerType: ownerTypeEnum("owner_type").default("unknown"),
  propertyType: text("property_type"),  // nullable
  latitude: doublePrecision("latitude"),   // nullable — only set after geocoding
  longitude: doublePrecision("longitude"), // nullable
  buildingSqft: integer("building_sqft"),  // nullable — UGRC only
  yearBuilt: integer("year_built"),        // nullable
  assessedValue: integer("assessed_value"),// nullable
  lotAcres: numeric("lot_acres", ...),     // nullable
  ...timestamps
});
```

**Key observations:**
- `address` and `city` are `NOT NULL` in the DDL but the schema allows empty string `""`. The upsert guard in `scraper/src/lib/upsert.ts:157-162` preserves existing values when the incoming value is `""`, so the column will never become truly NULL today — but it can be `""`.
- If we adopt the new architecture (situs address populated by UGRC lookup, may be NULL/empty until then), the `NOT NULL` constraint on `address` and `city` would need to be dropped first.
- `zip` is already nullable.
- The `PropertyWithLead` TypeScript interface in `app/src/types/index.ts:25-58` declares `address: string` and `city: string` (non-nullable) and `zip: string | null` — consistent with schema.

---

## Consumers by category

### UI rendering

| File:Line | Component | What it renders | Behavior if address is empty |
|-----------|-----------|-----------------|------------------------------|
| `src/components/property-card.tsx:261` | `PropertyCard` | Primary headline of card: `property.address \|\| property.parcelId` | **Graceful** — falls back to parcelId. Google Maps link still works (uses parcelId). |
| `src/components/property-card.tsx:266` | `PropertyCard` | Google Maps search link: `${property.address}, ${property.city}, ${property.state}` | If address is empty the Maps link becomes `, city, UT` — broken but not a crash. |
| `src/components/property-overview.tsx:63-65` | `PropertyOverview` | Address card: `{property.address}` then `{property.city}, {property.state} {property.zip}` | Renders blank address line; city/state still show. |
| `src/components/map/property-bottom-sheet.tsx:36` | `PropertyCardContent` (map popup) | Address and city in popup header | Empty address renders blank; city still shows. Map pin appears regardless (it uses lat/lng). |
| `src/app/(dashboard)/properties/[id]/page.tsx:51` | Property detail page header | `{property.address}` as `<h1>` | Renders empty `<h1>` — visually broken. |
| `src/app/(dashboard)/properties/[id]/page.tsx:61` | Property detail page | `{property.city}, {property.state} {property.zip}` | City/state still display. |
| `src/components/deal-card.tsx:64,85-91` | `DealCard` | Deal address and Google Maps link | Uses `deal.address` (from `deals` table, not `properties`) — unaffected by property address change. |
| `src/components/deal-overview.tsx:307-315` | Deal detail | Deal address display and Maps link | Uses `deal.address` — unaffected. |
| `src/app/(dashboard)/leads/[id]/page.tsx:78-82` | Inbound lead detail | `{lead.address}{lead.city}` — this is from the website lead intake, not `properties` table | Guarded: `{lead.address && ...}` — renders nothing if empty. **Unaffected by properties schema change.** |

### Search / filtering

| File:Line | What it searches/filters | Behavior if address is empty |
|-----------|--------------------------|------------------------------|
| `src/lib/queries.ts:392,653` | Full-text search: `properties.ownerName ILIKE term OR properties.address ILIKE term OR properties.parcelId ILIKE term` | Empty address rows would never match address-term searches — they'd only surface via owner name or parcel ID. |
| `src/lib/queries.ts:277-279,557-559` | `hideParcelOnly` filter: excludes rows where address IS NULL, empty, or equals parcelId | If `address = ""`, these rows pass through (not excluded). The filter only catches rows where address equals parcelId. Empty string would NOT be filtered. |
| `src/lib/queries.ts:283-295,563-575` | PO Box exclusion filters: `address IS NULL OR address NOT LIKE '%PO BOX%'` | **Interesting:** the PO Box filters use `IS NULL OR NOT LIKE` — meaning NULL address rows are admitted, not excluded. Empty-address (future situs-pending) rows would pass these filters correctly once address becomes nullable. |
| `src/lib/queries.ts:303-307` | Apartment unit filter: `address IS NULL OR address NOT LIKE '%#%'` | Same pattern — NULL rows are admitted, which is correct. |
| `src/lib/queries.ts:322-334,602-662` | City filter: `lower(properties.city) IN (...)` | **HIGH RISK.** If `city` is empty or NULL, these properties would be excluded from ALL target-city dashboard views. They would be invisible on the dashboard. |
| `src/lib/queries.ts:718` | Sort by city: `orderBy = asc(properties.city)` | Empty-city rows would sort to the top (empty string sorts before "A"). Nulls would sort differently depending on null handling. |
| `src/lib/analytics-queries.ts:193-200,230-243` | Analytics city grouping: `GROUP BY p.city` | Would create a `""` or `NULL` city bucket in analytics. |
| `src/lib/analytics-queries.ts:467` | Export sort: `ORDER BY p.city, p.address` | Empty-city/address rows appear first. |

### Geocoding / map

| File:Line | What it geocodes | Behavior if address is empty |
|-----------|------------------|------------------------------|
| `src/scripts/geocode-properties.ts:54-56` | Builds Mapbox query string: `[address, city, state, zip].filter(Boolean).join(", ")` | **Graceful** — `filter(Boolean)` drops empty/null values. If address is empty, query becomes `"city, state, zip"` — Mapbox returns city-level result, not parcel-level. Coordinates would be wrong (city centroid). |
| `src/scripts/geocode-properties.ts:64,75` | Warn/log messages | Logs `""` address — functional but misleading output. |
| `src/lib/queries.ts:905-940` | `getMapProperties()` — requires lat/lng; filtered by `isNotNull(latitude) AND isNotNull(longitude)` | If geocoding succeeds with bad coordinates (city centroid), the property appears on map at wrong location. If geocoding fails, the property doesn't appear on map at all — this may be the better outcome. |
| `src/lib/map-utils.ts:36-37` | `toGeoJSON()` — passes `address` and `city` as GeoJSON properties to Mapbox layer | If address is `""`, map popup shows blank address. No crash. |

### Skip trace / contact enrichment

| File:Line | What it sends/receives | Notes |
|-----------|------------------------|-------|
| `src/lib/tracerfy-actions.ts:149-153` | `submitBatch()` — sends `address`, `city`, `state`, `zip` to Tracerfy API as the property lookup key for finding owner contact info | **HIGHEST RISK.** Tracerfy uses property address + owner name as its primary matching key. Sending empty address = near-0% match rate. The API still accepts the call but returns no results. |
| `src/lib/tracerfy-actions.ts:550-552` | `runSkipTrace()` — hard-blocks: `if (!prop.address?.trim()) return { error: "Property has no address — cannot skip trace" }` | **Already guarded.** Single skip trace returns a user-visible error if address is empty. |
| `src/lib/tracerfy-actions.ts:645` | `runBulkSkipTrace()` — filters: `props.filter((p) => p.address?.trim())` | **Already guarded.** Properties with empty address are silently skipped from bulk batch. |
| `src/lib/tracerfy-actions.ts:291` | `storeResults()` — address+city fallback matching: `${address}|${city}` as a secondary match key | If address is empty, fallback key becomes `|city` — could cause false-positive matches across multiple properties in same city. |
| `src/lib/tracerfy-actions.ts:314-381` | Tracerfy result processing — extracts `mail_address`, `mail_city`, `mail_state` from Tracerfy response and stores as `MAILING: <address>` in `owner_contacts.email` with `source = "tracerfy-address"` | **Existing mailing address handling.** The app already receives and stores owner mailing addresses from Tracerfy, but does so in the `owner_contacts` table (not `properties`). |
| `src/lib/tracerfy-actions.ts:829` | `findOrCreatePropertyForDeal()` — looks up existing property by `lower(trim(address)) = normalized AND lower(city) = city` | If address is empty, this lookup would never find a match and always creates a new property stub. |

### Exports / CSV / mailers

| File:Line | Format | What field is used |
|-----------|--------|--------------------|
| `src/lib/analytics-queries.ts:449-484` | `getPropertiesForExport()` → leads CSV export | Exports `address`, `city`, `state`, `zip`, `county` for every property. Empty address exports as empty string. Headers are still present. |
| `src/lib/analytics-queries.ts:410-426` | `getLeadsForCallLog()` — call log form dropdown | Returns `p.address` as display label. Empty address shows blank in dropdown. |
| `src/lib/analytics-queries.ts:360-403` | `getRecentActivity()` — activity log | Returns `p.address` and `p.city` for display. Empty = blank in activity feed. |
| `src/app/api/export/route.ts:76,134` | Budget and expense CSVs — uses `deal.address` for filename: `budget-summary-${safeAddress}.csv` | Uses `deal.address`, not `properties.address` — unaffected by properties schema change. Falls back to `dealId` if address is null. |
| `src/lib/campaign-queries.ts:136-137,190-191` | Campaign enrollment listings — selects `properties.address` and `properties.city` | Used in enrollment tables to identify which property is enrolled. Empty = blank display. |
| `src/lib/enrollment-actions.ts:108-109` | Email merge fields in campaign send — `address` and `city` used as `{address}` and `{city}` merge fields in email templates | **HIGH RISK for mailers.** If address is empty, outreach emails go out with blank property address — unprofessional and confusing to recipient. |

### Server actions / business logic

| File:Line | Action | What it uses address for |
|-----------|--------|--------------------------|
| `src/lib/deal-actions.ts:68-69,110-111,406-407` | `createDeal`, `updateDeal` | Writes `deal.address` and `deal.city` (to the `deals` table, not `properties`). Unaffected. |
| `src/lib/contract-actions.ts:103-104` | `createContract` | Writes `propertyAddress` and `city` to `contracts` table (copied from deal at creation time). Unaffected. |
| `src/lib/buyer-actions.ts:306` | Deal blast notification — `deal.address` used in notification text | Uses `deal.address` — unaffected. |
| `src/lib/buyer-queries.ts:172,185,236-237` | Deal history and interaction queries | Use `deals.address` and `deals.city` — unaffected. |
| `src/app/api/leads/route.ts:83-94` | Website lead intake — assembles `fullAddress` from webhook payload `address + city + state + zip` | Not `properties.address` — this is the seller's self-reported address from the website form. Unaffected. |
| `src/app/(dashboard)/deals/new/page.tsx:44-54` | New deal form — filters `MAILING:` contacts when pre-filling seller phone | Only reads contacts, not property address. Aware of mailing sentinel. |

---

## Existing mailing-address handling (if any)

There is **already a partial mailing-address awareness** in the codebase:

### 1. Tracerfy enrichment — `MAILING:` prefix in `owner_contacts.email`

`src/lib/tracerfy-actions.ts:365-381` stores owner mailing addresses (received from Tracerfy's `mail_address + mail_city + mail_state` response fields) into `owner_contacts` with:
- `source = "tracerfy-address"`
- `email = "MAILING: <full mailing address string>"`

This sentinel is filtered out in **6 places**:
1. `tracerfy-actions.ts:573` — single skip trace phone count
2. `tracerfy-actions.ts:576` — single skip trace email count
3. `tracerfy-actions.ts:592` — deal seller phone backfill
4. `queries.ts:817` — `traced_found` status computation
5. `enrollment-actions.ts:67-70` — campaign email address lookup
6. `app/(dashboard)/deals/new/page.tsx:51,54` — new deal pre-fill

### 2. `contact-tab.tsx` — displays mailing address as a separate UI section

`src/components/contact-tab.tsx:84-95` explicitly separates `mailingContacts` from `emailContacts`, extracts `mailingAddress` by stripping the `MAILING:` prefix, and renders it in a distinct "Mailing Address" section (lines 236-251).

### 3. `src/types/index.ts:49` — comment documents the convention

```ts
/** True when a real (non-mailing) email exists in ownerContacts for this property */
hasEmail?: boolean;
```

### 4. What is NOT handled

- **No `owner_mailing_address` column exists on `properties`.** The mailing address lives in `owner_contacts.email` as a prefixed string — a deliberate hack that works for display but is not query-friendly.
- **No out-of-state owner filter** exists anywhere. The `properties.state` column is always `"UT"` (scraper default). Out-of-state owners can only be detected by reading the `MAILING:` entry in `owner_contacts` and checking the state component — which is not implemented.
- **The SLCo tax-delinquent scraper** (`slco-tax-delinquent.ts`) extracts a `TAX_SALE_ADDRESS` field that is the **owner's mailing address** (e.g. `"PO BOX 1099 RIVERTON UT 84065"`). It passes this to `upsertFromDelinquent()` which then calls `upsertProperty()` — writing the mailing address into `properties.address/city/zip`. This is the root of the contamination.

---

## Risk assessment for proposed architecture

Proposed: `properties.address/city/zip` = situs only (populated by UGRC lookup, NULL/empty until then). New columns: `properties.owner_mailing_address`, `properties.owner_mailing_city`, `properties.owner_mailing_state`, `properties.owner_mailing_zip`.

| Consumer | Risk if address NULL | Migration recommendation |
|----------|----------------------|--------------------------|
| **Tracerfy single skip trace** | **HIGH** — already returns error `"Property has no address"`. Users would see this error for all SLCo tax-delinquent properties until UGRC enrichment runs. | Add fallback: if situs address is NULL, check `owner_mailing_address` as Tracerfy input (mailing address trace is supported by Tracerfy via `mail_address_column`). |
| **Tracerfy bulk skip trace** | **MEDIUM** — silently skips properties with empty address. SLCo properties would be excluded from bulk runs. | Same as above — use `owner_mailing_address` as fallback input. |
| **City filter on dashboard** | **HIGH** — SLCo properties with NULL `city` would be invisible on the dashboard (filtered out by `lower(city) IN (target_cities)`). | UGRC enrichment must populate `city` before these properties appear; OR add a special "pending" city bucket in UI. |
| **Analytics city grouping** | **MEDIUM** — creates NULL/empty bucket in market stats. | Filter out NULL city in analytics queries, or handle in the chart component. |
| **Map pins** | **LOW** — map requires lat/lng coordinates. Properties without situs address can't be geocoded, so they won't appear on map anyway. No regression. | Once UGRC lookup provides situs, geocode and they appear. |
| **Geocoding script** | **MEDIUM** — `filter(Boolean)` skips empty address. Script would geocode at city level if address is empty, placing pin at wrong location. | Guard: skip geocoding if address is NULL/empty. Wait for UGRC. |
| **Email merge fields** | **HIGH** — campaign emails would go out with blank `{address}` in body text. | Add pre-send guard: skip enrollment or hold emails for properties without situs address. |
| **Property detail page h1** | **MEDIUM** — renders empty `<h1>`. | Render parcelId as fallback (already done in `property-card.tsx`; should add same pattern to detail page). |
| **Property card display** | **LOW** — already falls back to `property.parcelId`. No change needed. | None. |
| **Skip-trace fallback address match** | **LOW** — `address|city` fallback key becomes `|city`. Risk of false-positive matches is low since primary match is `property_id`. | Low priority. |
| **CSV export** | **LOW** — exports blank address column. Not a crash. | Add note in export header or filter. |
| **Activity log / call log dropdown** | **LOW** — shows blank. Usable. | Display parcelId as fallback. |
| **Contract creation** | **LOW** — contracts copy from `deal.address`, not `properties.address`. Unaffected. | None. |

---

## Key write paths (for completeness)

The root cause of today's contamination and the paths that would be retargeted under the new schema:

| Scraper/Source | What it currently writes to `properties.address` | What it should write under new schema |
|----------------|--------------------------------------------------|---------------------------------------|
| `slco-tax-delinquent.ts` | Owner mailing address (from `TAX_SALE_ADDRESS`, e.g. `PO BOX 1099 RIVERTON UT 84065`) | Write to `owner_mailing_address/city/state/zip` instead; leave `properties.address` NULL |
| `utah-legals.ts` | Property situs address extracted from NOD notice (already correct) | No change — continues to write to `properties.address` |
| `carbon-assessor.ts`, `emery-*`, etc. | Property situs address from assessor roll (correct) | No change |
| UGRC enrichment script (future) | Would populate `properties.address` from parcel_id lookup | This is the intended canonical writer for situs address |
| `tracerfy-enrichment.ts` (scraper side) | Stores `MAILING:` in `owner_contacts.email` | Should move to `owner_mailing_*` columns on `properties` OR a dedicated `property_mailing_addresses` table |

---

## Open questions for Brian

1. **Dashboard visibility during UGRC gap:** SLCo tax-delinquent properties with NULL situs would be invisible on the dashboard (city filter excludes them). Should there be a temporary "unlocated" or "pending address" view, or should these properties simply not appear until UGRC enriches them?

2. **Skip trace for mailing-address-only properties:** Tracerfy can take either property address OR mailing address as input. If we store the owner mailing address in `owner_mailing_*`, should skip trace automatically fall back to it when situs is NULL? (Tracerfy supports `mail_address_column` input — the batch already passes it but currently it's not populated from DB.)

3. **Email campaign holds:** Should properties without a situs address be blocked from email campaign enrollment? Right now the merge field `{address}` would render empty in the email body.

4. **Map pins before UGRC:** Should tax-delinquent properties appear on the map before their situs is known? If yes, we need a geocoding path for them (could geocode owner mailing address as a proxy, though imprecise). If no, they simply don't show until enriched.

5. **Schema change timing:** `properties.address` is `NOT NULL` today. Dropping that constraint requires a migration. Do we want to do this before or after the SLCo re-scrape? (A re-scrape without the migration would continue writing mailing addresses to `properties.address`.)

6. **Out-of-state owner filter:** The `MAILING:` data from Tracerfy already contains the state of the owner's mailing address. Should an "out-of-state owner" filter be added to the dashboard using this data? (Absentee/out-of-state owners are a strong motivation signal in wholesaling.)
