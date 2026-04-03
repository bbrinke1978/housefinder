---
status: resolved
trigger: "Addresses showing as 'E MAIN ST: 1110' instead of '1110 E MAIN ST' — recurs after every scrape"
created: 2026-04-02T00:00:00Z
updated: 2026-04-03T00:00:00Z
root_cause: scraper-deploy-blocked
---

## Problem

Addresses in the dashboard and deals tab display in reversed "STREET: NUMBER"
format (e.g. "E MAIN ST: 1110") instead of correct "NUMBER STREET" format
(e.g. "1110 E Main ST"). This was fixed multiple times but kept recurring.

## Root Cause (REAL)

The address normalization fix (commit 95bb089) was committed to the repo but
**never actually deployed to Azure** because the scraper GitHub Actions workflow
has been failing at the TypeScript compilation step since at least March 27, 2026.

The build error:
```
src/functions/contactEnrichment.ts(232,47): error TS2339:
Property 'estimatedCost' does not exist on type 'TracerfyStats'.
```

This means the old scraper code (without normalizeAddress() and without the
COALESCE-style upsert protection) has been running in production the entire time,
re-corrupting addresses on every scrape cycle.

## Timeline

1. **2026-03-27** — Tracerfy rewrite introduced `estimatedCost` reference to a
   property that doesn't exist on `TracerfyStats` interface
2. **2026-04-01** — Address normalization + COALESCE upsert fix committed (95bb089)
3. **2026-04-01** — Deploy triggered but FAILED (TS2339 error) — fix never reached Azure
4. **2026-04-01** — Manual workflow_dispatch also FAILED (same error)
5. **2026-04-02** — User reports addresses still broken
6. **2026-04-03** — Root cause identified: every scraper deploy since March 27 has failed

## Fix Applied

1. **TS error fix**: Changed `stats.estimatedCost.toFixed(2)` to
   `(stats.found * 0.02).toFixed(2)` in contactEnrichment.ts:232
2. **Address normalization** (already in repo): `normalizeAddress()` in
   scraper/src/lib/upsert.ts converts "STREET: NUMBER" → "NUMBER STREET"
3. **COALESCE-style upsert** (already in repo): Empty address/city/ownerName
   from tax/recorder scrapers no longer overwrite good assessor data
4. **One-time SQL fix**: fix-addresses.mjs script corrects existing reversed
   addresses in both properties and deals tables

## Prevention

- The normalizeAddress() function in upsert.ts runs on EVERY address at insert
  time, so any future scraped data with reversed format gets auto-corrected
- The COALESCE guard prevents empty strings from overwriting good data
- **KEY LESSON**: Always verify GitHub Actions deploys succeed after pushing.
  A failed deploy means the fix never reached production, no matter how many
  commits exist in the repo.

## Files Changed

- `scraper/src/functions/contactEnrichment.ts:232` — TS error fix
- `scraper/src/lib/upsert.ts:14-34` — normalizeAddress() function
- `scraper/src/lib/upsert.ts:80-95` — COALESCE-style upsert guards
- `app/src/scripts/fix-addresses.mjs` — one-time DB repair script
