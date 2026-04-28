---
created: 2026-04-27
status: recommendation
purpose: Architecture recommendation for separating property situs from owner mailing address
---

## TL;DR

**Recommend Option A: add four `owner_mailing_*` columns to the `properties` table** (`owner_mailing_street`, `owner_mailing_city`, `owner_mailing_state`, `owner_mailing_zip`). Pair the schema change with (1) a one-shot backfill that moves the ~200 SLCo rows' contaminated situs data into the new mailing columns and clears `properties.address/city/zip`, then (2) a fixed `slco-tax-delinquent.ts` that writes mailing fields to mailing columns and never touches situs, then (3) UGRC enrichment as the canonical situs writer (Phase 26 already in flight). Mailing data becomes first-class and queryable (out-of-state owner reports become a 1-line WHERE), the dashboard gap is bounded to "rows that haven't been UGRC-enriched yet," and the existing `MAILING:` prefix workaround in `owner_contacts` can be deprecated cleanly without losing any data. Brian needs to make 3 decisions before code starts (see "Decisions" section). Estimated 7 sequential steps, each independently revertable except the actual backfill which is one-way (but the source rows are preserved, just blanked in different columns).

## Goals (must satisfy)

1. Property situs (real address of the parcel) is stored in fields that consumers can rely on
2. Owner mailing address (PO Box, out-of-state, etc.) is preserved and queryable
3. Dashboard does not break during migration
4. SLCo's 200+ rows of currently-scraped data is preserved — even if the situs portion is wrong, the mailing-address signal it carries is valuable
5. UGRC remains the canonical source of property situs going forward
6. Out-of-state-owner queries become trivial (currently a separate todo on Brian's list)
7. Skip-trace continues to work

## Options Considered

### Option A: Add `owner_mailing_*` columns to `properties`

Add four new columns to the `properties` table:

- `owner_mailing_street text` (nullable)
- `owner_mailing_city text` (nullable)
- `owner_mailing_state text` (nullable)
- `owner_mailing_zip text` (nullable)

`properties.address/city/zip` becomes situs-only. `slco-tax-delinquent.ts` stops writing to those and writes to the new columns instead. UGRC enrichment fills in situs (Phase 26 path). `owner_contacts` mailing pragma is deprecated — it stays operational during transition, then a follow-up backfill copies any remaining "MAILING:" entries into the new columns.

**Pros:**
- Mailing address is first-class, query-friendly. Out-of-state owner filter becomes a trivial WHERE clause: `owner_mailing_state != 'UT'`.
- Single source of truth for mailing per property (1-to-1 is the natural cardinality — every property has at most one current mailing address from county records; skip-trace results are deltas tracked over time but the *primary* one belongs on the property).
- Tracerfy skip-trace fallback chain becomes clean: `address ?? owner_mailing_street`.
- Email merge fields can fall back: `{address || owner_mailing_street}`.
- Eliminates the email-column-as-mailing-address hack that's filtered in 6 places throughout `tracerfy-actions.ts`, `queries.ts`, `enrollment-actions.ts`, and the new-deal page. The "MAILING:" sentinel-string filtering is fragile and easy to forget.
- Schema-level visibility: looking at `\d properties` in psql tells you everything about a property's address state, including whether the owner is local or absentee.

**Cons:**
- Requires a Drizzle migration + `properties.address`/`city` constraint relaxation (drop NOT NULL — currently enforced as NOT NULL even though scrapers write `""` to satisfy it). This is a breaking schema change.
- 30+ consumer callsites touch `address/city/zip`. Most are graceful with empty/NULL; the genuinely-risky 4 (Tracerfy single skip trace, dashboard city filter, email campaign merge, property detail h1) need explicit fallback logic.
- Two separate "address" concepts on one row visually muddies the schema if not labeled clearly. Mitigated by clear column names.

**Migration sketch:** schema migration → backfill (move SLCo rows' contaminated situs into new mailing columns, clear situs) → ship fixed scraper → re-run scraper to validate → adjust consumers (skip-trace fallback, dashboard city handling, email merge, detail-page h1 fallback) → deprecate `MAILING:` sentinel in `owner_contacts` (follow-up).

**Risks:**
- Backfill SQL needs to be exactly right — moving 200+ rows' data between columns. Mitigated by writing a SELECT-first audit query and running backfill in a transaction.
- Dropping `NOT NULL` on `address`/`city` means historical scrapers writing `""` continue to work, but new code paths that assume non-null will need to handle null. The audit confirms most consumers already handle empty string the same as null; remaining ones are listed in the consumer audit's high-risk table.

---

### Option B: Use `owner_contacts` with `MAILING:` prefix (extend the existing tracerfy convention)

Keep `properties.address/city/zip` as situs-only. Move SLCo-scraped mailing addresses into `owner_contacts` as new rows with `email = "MAILING: <full string>"` and `source = "slco-auditor-mailing"` (matching the existing `tracerfy-address` pattern). Fix `slco-tax-delinquent.ts` to write to `owner_contacts` instead of `properties`. The existing `contact-tab.tsx` UI already renders these as a "Mailing Address" section.

**Pros:**
- No schema migration needed. Zero risk of breaking the constraint surface.
- Consistent with the carbon-assessor and tracerfy-enrichment patterns already in production.
- UI rendering is already built in `contact-tab.tsx:84-95`.
- Reversible per-row trivially: just delete `owner_contacts` rows.

**Cons:**
- **Out-of-state owner filter remains expensive and ugly.** Brian's separate todo "out-of-state owner counts on NOD and tax-delinquent" requires parsing the prefixed string in SQL: `regexp_match(email, 'MAILING:.*\\s([A-Z]{2})\\s\\d{5}')`. This is fragile, slow, and won't be indexable.
- The "email" column literally holding a non-email is a known smell. The string-prefix sentinel is filtered in 6 places already; adding a new producer makes that filtering more load-bearing, not less.
- Doesn't allow indexing on mailing state/city/zip for analytics.
- One row per property gets multiplexed across multiple `owner_contacts` rows of different `source` values, with mailing addresses possibly differing between county-assessor data, SLCo auditor data, and Tracerfy data — no clear "current" mailing address.
- Doesn't solve the Tracerfy skip-trace fallback question cleanly: skip-trace input has to query `owner_contacts` for the prefixed string, parse it, and pass it back as input. Awkward.

**Migration sketch:** Backfill SLCo rows' contaminated situs into `owner_contacts` rows (new `source = 'slco-auditor-mailing'`) → clear `properties.address/city/zip` for those rows → ship fixed scraper that writes to `owner_contacts` → leave consumers unchanged (they keep filtering `MAILING:`).

**Risks:**
- Cements the "email column holds mailing address" anti-pattern as the long-term architecture. Future data work (out-of-state reports, CSV export with separate mailing columns, SQL analytics) becomes a string-parsing exercise.
- Still requires a backfill, but the backfill is into a non-unique structure where mismatches/duplicates are silently tolerated — easier to make subtle errors.

---

### Option C: Separate `owner_mailing_addresses` table (1-to-1 with properties)

Create a new table `owner_mailing_addresses` with `property_id` as a unique FK and `street/city/state/zip/source/captured_at` columns. One row per property maximum.

**Pros:**
- Clean separation. Mailing data has its own table with its own indexes.
- Allows tracking source/timestamp of mailing address (when did Tracerfy give us this? when did county assessor?).
- Doesn't pollute the `properties` row.

**Cons:**
- Every consumer that wants a mailing address now needs a JOIN. Adds query complexity for a dataset that is functionally 1-to-1.
- Can't index `properties.owner_mailing_state` directly — joining table for the dashboard out-of-state filter means an extra plan node.
- Migration footprint is larger: new table + new Drizzle relation + new query helpers + new types + new test fixtures. More surface area for bugs in a "no staging" environment.
- Brian explicitly wants "automated and smooth" — adding a relational join for a 1-to-1 relationship adds friction without proportional benefit.

**Migration sketch:** Create table → backfill from SLCo rows → fix scraper → update Tracerfy/email/dashboard consumers to JOIN. More code than Option A.

**Risks:**
- More moving parts in production. JOINs that should never have been JOINs are a recurring maintenance tax.

---

### Option D: Multi-source mailing history table (`property_mailing_address_history`)

Like Option C but keeps every mailing address ever observed (one row per (property_id, source, captured_at)). Useful if Brian wants to see mailing-address changes over time (e.g., owner moved; was at PO Box, now at residential).

**Pros:**
- Full audit trail of mailing addresses.
- Detects skip-flagging signal: owner's mailing address suddenly changes → potential life event.

**Cons:**
- Way more than the goal requires. The current goal is to fix the situs/mailing conflation, not build a history-of-mailing system.
- Adds the "which mailing address is current?" lookup problem to every consumer.
- Brian has not asked for mailing history; this is gold-plating.

**Risks:**
- Scope creep delays the actual fix.

---

## Recommendation

**Option A — add `owner_mailing_*` columns to `properties`.**

Top reasons tied to the goals:

1. **Goal 6 (out-of-state owner queries trivially)** is only met cleanly by Option A. Options B and C make this analytically painful.
2. **Goal 4 (preserve the 200+ rows)** is met identically by all options, but Option A puts that data in a queryable shape immediately rather than encoding it as a prefixed string or hiding it behind a JOIN.
3. **Goal 5 (UGRC as canonical situs)** is naturally aligned with Option A: `properties.address/city/zip` becomes situs-only and Phase 26's UGRC enrichment is the canonical writer. No mental gymnastics about "which scraper writes what to which column."
4. **Goal 3 (don't break the dashboard)** is achievable in all options but Option A makes the fallback patterns simpler. `address ?? owner_mailing_street` is one line; B requires parsing a sentinel string; C requires a JOIN.
5. The existing `MAILING:` sentinel pattern in `owner_contacts.email` is technical debt. Option A lets us deprecate it cleanly. Option B doubles down on it.

The migration plan below assumes Option A.

---

## Migration Plan

Each step is sequenced so that the system remains functional between steps. Steps marked "Brian's review required" should not proceed without sign-off because they touch production data or production write paths.

### Step 1: Schema migration — add columns and relax NOT NULL

- **What:** Drizzle migration that:
  - Adds nullable `owner_mailing_street text`, `owner_mailing_city text`, `owner_mailing_state text`, `owner_mailing_zip text` to `properties`.
  - Drops `NOT NULL` on `properties.address` and `properties.city` (kept default `''` for back-compat).
  - Adds index on `owner_mailing_state` (lowercase) for the future out-of-state filter.
  - Updates `app/src/db/schema.ts` to reflect the new columns and nullability. Updates `PropertyWithLead` type.
- **Risk:** If migration fails partway, schema is in an inconsistent state. Mitigate by running it as a single `BEGIN; ALTER ...; ALTER ...; COMMIT;`.
- **Verify:** `\d properties` in psql shows the four new columns. Existing rows have NULL for all four (correct — none have been backfilled yet). App still builds and renders properties; `address`/`city` show as before because no consumer reads the new columns yet.
- **Reversible:** yes — `ALTER TABLE ... DROP COLUMN` for the four added columns; re-add `NOT NULL` after backfilling `''` for any null rows. (Brian: review required because this changes constraints on a production table.)

### Step 2: Audit query — what we're about to backfill

- **What:** Run a SELECT (no writes) that identifies every SLCo property whose current `address` is actually a mailing address. Criteria: `county = 'salt lake'` AND has a `tax_lien` distress signal sourced from slco-tax-delinquent. Output the rowcount, sample 10 rows, and confirm "PO BOX" rows are included. This is a script in `scraper/src/scripts/audit-slco-mailing-conflation.ts` (read-only).
- **Risk:** None — read only. But if the count differs significantly from the audit's "200+" estimate, pause and figure out why before backfilling.
- **Verify:** Output a CSV summary of every row that will be touched in Step 3. Brian reads it.
- **Reversible:** yes (no writes).

### Step 3: Backfill — move SLCo contaminated situs into new mailing columns (BRIAN'S REVIEW REQUIRED)

- **What:** Backfill script (`scraper/src/scripts/backfill-slco-mailing-addresses.ts`) wrapped in a transaction that, for the rows identified in Step 2:
  1. Copy current `address` → `owner_mailing_street`
  2. Copy current `city` → `owner_mailing_city`
  3. Hardcode `owner_mailing_state = 'UT'` (the SLCo API's TAX_SALE_ADDRESS always has UT — verified in audit; out-of-state addresses like Michigan are encoded as `... TRAVERSE CITY MI 49684` with the state in the city slot from current parsing — needs special handling).

  **Sub-task 3a:** Re-parse `address` for any row where the current "city" parses as a 2-letter state code (e.g. `MI`, `CA`, `AZ`) — these are the mis-parsed out-of-state mailing addresses. Use the actual full `TAX_SALE_ADDRESS` if available in `distress_signals.raw_data`; otherwise leave them flagged for manual review.
  4. Copy current `zip` → `owner_mailing_zip` (the persistence bug means most are NULL today — it's fine).
  5. Set `address = NULL`, `city = NULL`, `zip = NULL` on those rows so UGRC enrichment can populate situs.
- **Risk:** **HIGHEST RISK STEP.** Wrong data movement is hard to undo without a DB snapshot. Mitigations: (a) take a manual `pg_dump` of the `properties` table before running; (b) wrap in BEGIN/COMMIT; (c) print row IDs that were modified.
- **Verify:** After completion, `SELECT count(*) FROM properties WHERE owner_mailing_street IS NOT NULL` should match the Step 2 count exactly. SELECT 10 random rows and visually confirm the mailing data looks right and `address`/`city` are now NULL.
- **Reversible:** with caveats — only via the pre-run `pg_dump` snapshot. The mailing columns alone do not preserve the original column-of-origin information after Step 4 nullifies the situs columns.

### Step 4: Fix the scraper — write mailing to mailing columns

- **What:** Edit `scraper/src/sources/slco-tax-delinquent.ts` to populate three new fields on its output records: `ownerMailingStreet`, `ownerMailingCity`, `ownerMailingState`, `ownerMailingZip`. Stop populating `propertyAddress`, `propertyCity`, `propertyZip` (or set them to `undefined` always — they refer to situs which this source doesn't have). Edit `scraper/src/lib/upsert.ts` `upsertFromDelinquent` and `upsertProperty` to accept and write the new mailing fields. Fix the persistence bug for `zip` while we're in there (currently read but never written for situs zip — a separate bug noted in the audit).

  Also: harden the regex in `parseTaxSaleAddress` to handle the named-street collapsed-address case (the 102 rows mentioned in the audit). Add unit tests if a test harness exists.
- **Risk:** New scraper run could fail to upsert if the schema change in Step 1 wasn't fully deployed. Mitigated by running scraper after Step 1's migration is confirmed live.
- **Verify:** Run the SLCo scraper once. New rows should land with `owner_mailing_*` populated and `address/city/zip` NULL. Existing rows (post-backfill) should not be modified by the scraper since the upsert guard preserves NULL situs.
- **Reversible:** yes — git revert the scraper change; the previously written `owner_mailing_*` data stays.

### Step 5: Fix the high-risk consumers (BRIAN'S REVIEW REQUIRED before deploy)

- **What:** Surgical edits to the four consumers flagged by the audit as high-risk if `address`/`city` is null:
  1. `app/src/lib/tracerfy-actions.ts:550` (single skip trace) — change `if (!prop.address?.trim())` to `const inputAddr = prop.address?.trim() || prop.ownerMailingStreet?.trim()` and pass that into Tracerfy. Same for the bulk path.
  2. `app/src/lib/queries.ts` city filter — wrap with `(lower(city) IN (...) OR (city IS NULL AND county = 'salt lake'))` so SLCo properties pending UGRC enrichment still appear in dashboard "salt lake county" views, just under a "Pending address" pseudo-bucket. Or add a UI toggle "Show pending-address properties." Brian decides.
  3. `app/src/lib/enrollment-actions.ts:108-109` email merge — block enrollment if both `address` and `owner_mailing_street` are NULL; otherwise merge with `{address || owner_mailing_street}`.
  4. `app/src/app/(dashboard)/properties/[id]/page.tsx:51` — make `<h1>` fall back to `parcelId` like `property-card.tsx:261` does.
- **Risk:** A consumer change that's wrong silently breaks user-visible behavior. Mitigated by Brian reviewing each change as a small PR.
- **Verify:** Manual: open dashboard, confirm SLCo tax-delinquent properties show; click a row, see detail page renders; try a skip trace on one with mailing-only and confirm it submits; confirm an email campaign refuses to enroll a property with neither situs nor mailing.
- **Reversible:** yes (git revert).

### Step 6: Trigger Phase 26 UGRC enrichment for the now-NULL-situs SLCo rows

- **What:** Phase 26 is already in flight. Re-run/expand it to cover all `properties` rows where `county = 'salt lake'` AND `address IS NULL`. UGRC fills in `address`/`city` from `Parcels_SaltLake_LIR.PARCEL_ADD/PARCEL_CITY` keyed by parcel_id.
- **Risk:** UGRC may not have a row for every SLCo parcel (rural/edge cases). Those rows stay NULL until manually addressed. Acceptable.
- **Verify:** After UGRC run, `SELECT count(*) FROM properties WHERE county = 'salt lake' AND address IS NULL` shrinks. The dashboard's pending-address bucket from Step 5 shrinks correspondingly.
- **Reversible:** yes — UGRC writes are additive and can be undone by setting the rows back to NULL.

### Step 7: Deprecate the `MAILING:` prefix in `owner_contacts` (follow-up — not blocking)

- **What:** One-time backfill script that takes any `owner_contacts.email` starting with `"MAILING: "`, parses the string, and copies the components to `properties.owner_mailing_*` (only if currently NULL — don't overwrite SLCo-sourced mailing data). After backfill, delete those `owner_contacts` rows. Then update `tracerfy-enrichment.ts` and `carbon-assessor.ts` to write directly to `properties.owner_mailing_*` going forward. Remove the 6 sentinel filters listed in the audit.
- **Risk:** Carbon assessor mailing data is preserved already; this just moves it to a cleaner location. Risk is low if we're careful about ordering (backfill before deleting source rows).
- **Verify:** No `owner_contacts.email` rows match `LIKE 'MAILING:%'`. All previously-flagged properties have non-NULL `owner_mailing_*`.
- **Reversible:** with caveats — the backfill is straightforward to reverse from a `pg_dump`, but the consumer-code refactor is "real code" that gets rolled forward, not back.

---

## Decisions Brian must make BEFORE Step 1

- [ ] **Decision 1: Dashboard handling of NULL-city SLCo rows during the UGRC gap.**
  Options:
  - (a) Add a "Pending address" pseudo-bucket — properties with `county='salt lake' AND city IS NULL` show under that label in dashboard target-city views.
  - (b) Hide them entirely until UGRC enriches — they don't appear on the dashboard at all between Step 3 and Step 6.
  - (c) Show them under a generic "Salt Lake County (other)" bucket, same as today's behavior for unmapped SLC zips.
  Recommended: (a) — keeps Brian aware of inflight backfill state. (b) is the safest if Brian wants zero visual noise; revisit after UGRC catches up.

- [ ] **Decision 2: Email campaign behavior for properties with mailing-only address.**
  Options:
  - (a) Block enrollment until situs is known.
  - (b) Allow enrollment, fall back to mailing address in `{address}` merge field. (May confuse the recipient if the mailing address is a PO Box.)
  - (c) Allow enrollment, render `{address}` as blank.
  Recommended: (a). Wholesale outreach should reference the actual property; sending an email about "your property at PO Box 1099" is unprofessional.

- [ ] **Decision 3: SLCo backfill — full or batched?**
  Full: one transaction, all ~200 rows. Fast, atomic.
  Batched: 25 rows at a time with a pause. Safer if the script crashes mid-run.
  Recommended: **Full**, in one transaction, with a `pg_dump` taken immediately before the run. 200 rows is small.

---

## What this DOES NOT solve

- **`emery-tax-roll.ts` is suspect but unverified.** Agent 1 flagged it as `suspect — needs live data verification`. This plan does not address it. Once Option A is in place, fixing emery-tax-roll if needed is a follow-up that follows the same pattern: check column headers live, route mailing-vs-situs to the appropriate columns. Tracking suggested as a separate todo, not blocking.
- **Multiple historical mailing addresses per property** (e.g., owner moved, county data is older than Tracerfy data). Option A only stores the *current* mailing. If Brian eventually wants mailing history (Option D), it can be layered on without breaking Option A — add a `property_mailing_address_history` table later that the scrapers also write to.
- **Lat/lng for SLCo rows that have only mailing addresses.** The geocoding script's `filter(Boolean)` already drops rows with empty situs, so these rows just won't appear on the map until UGRC enriches them. That's the right behavior — geocoding a PO Box centroid would be misleading.
- **Tracerfy skip-trace input quality for rows where Tracerfy already burned credits on the wrong (mailing) address pre-fix.** Those credits are spent. Going forward, fixed input avoids the waste.
- **The unrelated `zip` persistence bug** (zip read but never written by `upsertProperty`) is mentioned in the audit. Step 4 includes the fix as a side-task, but it could be teased out as its own pre-Step-1 fix if Brian prefers maximum atomic changes.

## Open questions / unknowns

1. **TAX_SALE_ADDRESS shape for out-of-state mailings.** The audit shows examples like `11898 S WEST BAY SHORE DR TRAVERSE CITY MI 49684`. The current regex assumes `UT` always appears as the state. Out-of-state addresses end with a different two-letter code, which the regex returns `null` for — meaning these rows currently have NULL `address`/`city` (they failed parsing). Need to confirm by counting `properties` rows where `county = 'salt lake'` AND a slco-source distress signal exists AND `address` is non-null vs null. Brian can run that SELECT or we can run it as part of Step 2's audit query. Plan accommodates this in Step 3a.

2. **`distress_signals.raw_data` retention.** Step 3a relies on having the raw `TAX_SALE_ADDRESS` available somewhere to re-parse out-of-state cases. Confirm `upsertSignal` is storing the raw row (it is, per line 199-205 of upsert.ts: `rawData: signal.raw ? JSON.stringify(signal.raw) : null`). But check whether the slco-tax-delinquent caller actually passes the full row in — looks like it passes only `{ year, amountDue }` (line 268-272). If so, the original `TAX_SALE_ADDRESS` is **not** preserved anywhere queryable. Step 3a may have to flag those rows for manual review or wait for the next scraper run (which can be modified in Step 4 to also store `TAX_SALE_ADDRESS` in `raw_data`).

3. **Dashboard's `target_cities` config.** The audit references `target_cities` — confirm whether there's a "pending" or "unspecified" bucket already in seed-config. If Decision 1a is chosen, it may need a new entry.

4. **UGRC coverage.** What percent of SLCo's ~200 tax-delinquent parcels are covered by `Parcels_SaltLake_LIR`? If it's 99%+, the dashboard gap is tiny; if it's 80%, we have ~40 rows that need a manual situs source (or just stay parcel-id-only on dashboard). Worth probing in Step 6 before declaring done.

5. **Tracerfy `mail_address_column` input.** The audit notes Tracerfy supports a separate mailing-address input field. Worth confirming with Tracerfy docs whether passing `owner_mailing_street` as input improves match rate vs. only sending owner name + situs. Out of scope for this plan but a follow-on optimization once Option A is in place.
