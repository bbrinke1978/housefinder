---
phase: 19-wholesale-leads
plan: "01"
subsystem: wholesale-leads-data-foundation
tags: [schema, types, scoring, parser, server-actions, queries]
dependency_graph:
  requires: []
  provides:
    - wholesalers DB table
    - wholesaleLeads DB table
    - wholesaleLeadNotes DB table
    - computeWholesaleScore pure function
    - parseWholesaleEmail regex parser
    - CRUD server actions for wholesale leads
    - Query functions for wholesale leads and wholesalers
  affects:
    - app/src/db/schema.ts
    - app/src/types/index.ts
tech_stack:
  added: []
  patterns:
    - drizzle ORM table definitions with FK constraints and indexes
    - text status fields (not pgEnum) — Phase 08-01 decision
    - pure scoring function (no DB imports)
    - regex parser with null-safe extraction
    - upsert-by-email wholesaler deduplication
    - two-query + post-merge pattern for stats aggregation
key_files:
  created:
    - app/src/lib/wholesale-score.ts
    - app/src/lib/wholesale-parser.ts
    - app/src/lib/wholesale-actions.ts
    - app/src/lib/wholesale-queries.ts
    - app/drizzle/0007_lowly_vance_astro.sql
  modified:
    - app/src/db/schema.ts
    - app/src/types/index.ts
decisions:
  - "[19-01]: text for wholesale status fields (new/analyzing/interested/pass/promoted) — consistent with Phase 08-01 deal status pattern"
  - "[19-01]: upsertWholesaler does email-first lookup before insert — prevents duplicate wholesaler records for same sender"
  - "[19-01]: normalizeAddress exported from wholesale-parser.ts for reuse in both actions and queries"
  - "[19-01]: createWholesaleLeadFromEmail uses repairEstimate=0 for email-derived leads (repair not typically in blast)"
  - "[19-01]: wholesaleLeads.promotedDealId FK to deals.id with no cascade — link is optional, not structural"
metrics:
  duration: 6min
  completed: "2026-04-10T22:22:05Z"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 19 Plan 01: Wholesale Leads — Data Foundation Summary

**One-liner:** 3 DB tables (wholesalers, wholesale_leads, wholesale_lead_notes) with MAO/equity/ROI scoring engine, regex email parser, CRUD server actions, and query functions for the wholesale leads feature.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schema tables, migration, and type definitions | 97affdb | schema.ts, types/index.ts, drizzle/0007_*.sql |
| 2 | Scoring engine, email parser, server actions, and queries | 4a97e68 | wholesale-score.ts, wholesale-parser.ts, wholesale-actions.ts, wholesale-queries.ts |

## What Was Built

### Database Schema (Task 1)

Three new tables added to `app/src/db/schema.ts` after the existing buyer tables:

- **wholesalers**: id, name, phone, email, company, sourceChannel, notes, isActive, createdAt, updatedAt — indexed on email for upsert lookups
- **wholesaleLeads**: 27 columns including address/addressNormalized, deal financials (askingPrice/arv/repairEstimate), scoring outputs (mao/dealScore/verdict/scoreBreakdown), FK to wholesalers and deals, rawEmailText/parsedDraft for email ingestion
- **wholesaleLeadNotes**: id, wholesaleLeadId FK, noteText, noteType (user/status_change), previousStatus, newStatus

Migration `0007_lowly_vance_astro.sql` generated via `npx drizzle-kit generate`.

Four types added to `app/src/types/index.ts`: `WholesaleLeadWithWholesaler`, `WholesalerWithStats`, `WholesaleScoreBreakdown`, `ParsedWholesaleDeal`.

### Scoring Engine (Task 2)

`computeWholesaleScore(arv, repairEstimate, askingPrice, wholesaleFee=15000)`:
- Factor 1 (40%): MAO spread ratio (spread/MAO) — 10/7/5/2/0 pts
- Factor 2 (30%): Equity % of ARV (spread/ARV) — 10/7/4/0 pts
- Factor 3 (30%): End-buyer ROI ((ARV - allIn)/allIn * 100) — 10/7/4/0 pts
- Verdict: >=7 green, >=4 yellow, <4 red

### Email Parser (Task 2)

`parseWholesaleEmail(text, fromEmail, subject)` extracts: address, askingPrice (with K-notation), ARV, sqft, beds, baths, yearBuilt, taxId, wholesalerName/phone/email. Confidence score = non-null fields / total fields. Never throws.

`normalizeAddress(addr)`: lowercases, strips apt/unit/#, removes punctuation — exported for duplicate detection.

### Server Actions (Task 2)

- `createWholesaleLead(formData)`: zod validation, score computation, address normalization, wholesaler upsert, lead insert
- `updateWholesaleLead(formData)`: same pipeline for updates
- `updateWholesaleLeadStatus(id, newStatus, note?)`: status update + auto-logged status_change note
- `addWholesaleNote(formData)`: user note insert
- `createWholesaleLeadFromEmail(bodyText, fromEmail, subject)`: full pipeline from email text to DB lead

### Query Functions (Task 2)

- `getWholesaleLeads(filters?)`: filtered list with wholesaler join, newest first
- `getWholesaleLead(id)`: single lead with wholesaler join
- `getWholesaleLeadNotes(wholesaleLeadId)`: notes newest first
- `getWholesalers()`: all wholesalers by name
- `getWholesalerStats(wholesalerId)`: totalSent/totalPromoted/avgSpread for one wholesaler
- `getWholesalersWithStats()`: two-query + post-merge for all wholesalers with stats
- `checkDuplicateAddress(addressNormalized, excludeId?)`: duplicate detection by normalized address

## Verification

- `npx tsc --noEmit`: PASS (zero errors)
- Migration file `app/drizzle/0007_lowly_vance_astro.sql`: EXISTS
- `wholesale-score.ts` has no DB imports — pure function confirmed
- `parseWholesaleEmail` handles K-notation via `parseDollars()` helper

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `app/src/lib/wholesale-score.ts` exists
- [x] `app/src/lib/wholesale-parser.ts` exists
- [x] `app/src/lib/wholesale-actions.ts` exists
- [x] `app/src/lib/wholesale-queries.ts` exists
- [x] `app/drizzle/0007_lowly_vance_astro.sql` exists
- [x] Commit 97affdb: feat(19-01): add wholesale leads schema tables and type definitions
- [x] Commit 4a97e68: feat(19-01): add wholesale scoring engine, email parser, server actions, and queries
