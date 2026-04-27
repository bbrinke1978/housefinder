---
phase: 26-ugrc-salt-lake-county-import
plan: 02
subsystem: database
tags: [ugrc, arcgis, postgres, parcel-enrichment, salt-lake-county, rose-park, enrichment-run]

# Dependency graph
requires:
  - phase: 26-ugrc-salt-lake-county-import
    plan: 01
    provides: fetchFromAllowlist() + --dry-run flag in import-ugrc-assessor.mjs
provides:
  - Production enrichment: 4 Rose Park rows now have UGRC assessor fields populated
  - Prefix-mismatch empirical finding: 26/30 Rose Park rows have non-allowlist prefixes
  - SC #1 status: MET (log shows match count 4, updated count 4)
affects:
  - 26-ugrc-salt-lake-county-import/26-03 (dashboard verification)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - dry-run-then-prod: shadow execute against prod DB, verify counts match, run real

key-files:
  created:
    - .planning/phases/26-ugrc-salt-lake-county-import/26-02-SUMMARY.md
  modified: []

key-decisions:
  - "Prefix-mismatch risk MATERIALIZED: 26/30 Rose Park rows have prefixes 14/21/22/33/15 outside the 07-/08- allowlist — defer allowlist expansion to v1.4 (separate plan)"
  - "SC #1 MET: script ran cleanly, fetched 8,254 UGRC records, matched 4 Rose Park rows, updated 4"
  - "4 enriched rows have valid UGRC data (sqft 750-1971, year_built 1952-1997, assessed $329k-$594k)"

requirements-completed: [RP-01]

# Metrics
duration: 18min
completed: 2026-04-27
---

# Phase 26 Plan 02: UGRC Assessor Import — Production Run Summary

**UGRC enrichment script ran against production DB: 8,254 parcel records fetched from Parcels_SaltLake_LIR, 4 Rose Park rows matched and enriched with assessor data; prefix-mismatch risk confirmed (26/30 rows outside allowlist range — deferred to v1.4)**

## Performance

- **Duration:** ~18 min (dry-run ~9 min + prod run ~9 min)
- **Dry-run started:** 2026-04-27T03:28:00Z (approx)
- **Production run started:** 2026-04-27T03:38:28Z
- **Completed:** 2026-04-27T03:47:00Z (approx)
- **Tasks:** 2 (dry-run + production execution)
- **Files created:** 1 (this SUMMARY)

## Run Results

### Dry-Run (Task 1)

| Metric | Value |
|--------|-------|
| Allowlist parcels loaded | 8,270 (zip 84116) |
| Batches to UGRC | 83 (100 IDs/batch, POST) |
| Total raw records from UGRC | 8,254 |
| Unique parcels after aggregation | 8,212 |
| WOULD update | **4** |
| Skipped (no UGRC data) | 0 |
| No match in our DB | 8,208 |

Verification: `SELECT COUNT(*) FROM properties WHERE city='Rose Park' AND updated_at > NOW() - INTERVAL '10 minutes'` returned **0** immediately after dry-run — confirmed no writes.

### Production Run (Task 2)

| Metric | Value |
|--------|-------|
| Total raw records from UGRC | 8,254 |
| Unique parcels after aggregation | 8,212 |
| Updated | **4** |
| Skipped (no UGRC data) | 0 |
| No match in our DB | 8,208 |

Dry-run and production counts match exactly — expected behavior.

## Prefix-Distribution Spot-Check (RISK 1 Mitigation)

**Finding: Prefix-mismatch risk MATERIALIZED.**

The allowlist (`rose-park-parcel-allowlist.json`) was generated from UGRC address data covering zip 84116. The 8,270 parcel IDs it contains span the `08-` prefix range. However, the 30 Rose Park rows in our DB (sourced from multiple SLC data feeds) have a broader prefix distribution:

| Prefix | Count | In Allowlist? | Enriched? |
|--------|-------|---------------|-----------|
| 14     | 19    | NO            | NO        |
| 08     | 4     | YES           | YES       |
| 21     | 2     | NO            | NO        |
| 22     | 2     | NO            | NO        |
| 33     | 2     | NO            | NO        |
| 15     | 1     | NO            | NO        |
| **TOTAL** | **30** | | **4 enriched, 26 not** |

**Root cause:** The allowlist was built from UGRC zip-84116 address features, which appear to cover only the `08-` district. Rose Park spans multiple SLC district boundaries; leads sourced from Utah Legals NOD data carry parcel IDs from the `14-`, `21-`, `22-`, `33-`, and `15-` districts.

**Decision:** Defer allowlist expansion to v1.4. The 26 un-enriched rows are valid leads (parcel IDs are real SLC parcels) but will not have assessor fields until a broader allowlist regeneration is run. No data is corrupted — COALESCE ensures existing nulls stay null rather than being overwritten.

**TODO for v1.4:** Regenerate allowlist to cover all Rose Park district prefixes (`14-`, `21-`, `22-`, `33-`, `15-`) and re-run enrichment. See `deferred-items.md` in this phase directory.

## Post-Enrichment Field Check

`SELECT COUNT(*) FROM properties WHERE city='Rose Park' AND building_sqft IS NOT NULL` returned **4** — matches the script's "Updated: 4" count exactly.

## Sample Enriched Rows (5 Rose Park rows with UGRC data)

| parcel_id | address | building_sqft | year_built | assessed_value | lot_acres |
|-----------|---------|---------------|------------|----------------|-----------|
| 08342310080000 | 542 | 1,243 sqft | 1959 | $374,200 | 0.15 ac |
| 08273010250000 | 1990 W 900 | 1,971 sqft | 1997 | $594,300 | 0.36 ac |
| 08263010280000 | 933 N 1300 | 750 sqft | 1952 | $329,400 | 0.19 ac |
| 08261010100000 | 1255 | 1,829 sqft | 1956 | $483,500 | 0.22 ac |

All 4 have realistic Rose Park values. Assessed values $329k-$594k reflect current SLC market. Building sizes 750-1,971 sqft are consistent with post-WWII Rose Park housing stock. Year-built 1952-1997 range is plausible.

## Success Criteria Status

### SC #1: "UGRC data fetched and JOINed against existing Rose Park rows by parcel_id — log shows match count and updated count"

**STATUS: MET**

- Log shows "Total raw records: 8254" (fetch confirmed)
- Log shows "Updated: 4" (JOIN confirmed — 4 parcel_id matches found and enriched)
- Both match count and updated count are captured
- The expected-empty case (zero matches) did NOT occur — there were real Rose Park rows in the DB

### Prefix-Mismatch Risk: Did it materialize?

**YES** — 26/30 Rose Park rows have prefixes outside the allowlist (`14`, `21`, `22`, `33`, `15`). These rows will not be enriched until allowlist is expanded. Deferred to v1.4.

## Deviations from Plan

None — plan executed exactly as written.

The "expected zero" case noted in the plan objective did not occur (there are 30 Rose Park rows, not 0), but this is a better outcome than expected — the script ran and actually enriched 4 rows.

## Issues Encountered

**Prefix-mismatch gap (known risk from research, now empirically confirmed):** 26 of 30 Rose Park rows were not enriched because their parcel prefixes (`14-`, `21-`, `22-`, `33-`, `15-`) are not in the allowlist. These are valid leads — they simply lack assessor data until v1.4 allowlist expansion.

This was anticipated in the research as RISK 1 (MEDIUM severity). The decision is to accept and defer per the plan's Option (a) guidance.

---
*Phase: 26-ugrc-salt-lake-county-import*
*Completed: 2026-04-27*
