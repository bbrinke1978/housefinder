---
phase: 16-buyers-list-crm
plan: "01"
subsystem: buyer-crm-data-layer
tags: [schema, drizzle, server-actions, types, buyer-crm]
dependency_graph:
  requires: []
  provides:
    - buyer_communication_events table
    - buyer_deal_interactions table
    - buyer_tags table
    - buyers.follow_up_date column
    - buyers.last_contacted_at column
    - buyer-queries.ts (8 query functions)
    - buyer-actions.ts (7 server actions)
    - BuyerWithTags, BuyerTimelineEntry, BuyerDealInteraction, BuyerWithMatchInfo, OverdueBuyer types
  affects:
    - app/src/db/schema.ts
    - app/src/types/index.ts
tech_stack:
  added: []
  patterns:
    - drizzle pgTable + pgEnum for new tables/enums
    - Zod v4 safeParse validation in server actions
    - parallel fetch + client-side merge for timeline (mirrors getLeadTimeline)
    - inArray for batch tag fetching
    - onConflictDoNothing/onConflictDoUpdate for safe upserts
key_files:
  created:
    - app/drizzle/0009_buyer_crm.sql
    - app/src/lib/buyer-queries.ts
    - app/src/lib/buyer-actions.ts
  modified:
    - app/src/db/schema.ts
    - app/src/types/index.ts
decisions:
  - "Buyer CRM tables placed after dealNotes in schema.ts — forward references use arrow functions () => deals.id which resolve at runtime (Drizzle pattern)"
  - "Tag fetching uses inArray() not raw SQL ANY(ARRAY[]) — safer, type-checked, consistent with project patterns"
  - "getBuyersForList fetches buyers then tags in two queries (not GROUP BY + aggregate) — simpler type inference, no SQL array agg needed"
  - "importBuyers accepts typed array directly (not FormData) — arrays don't serialize cleanly to FormData, uses useTransition pattern per research"
  - "logDealBlast auto-logs both comm event and deal interaction in one action — keeps blast auto-logging as a single atomic call"
metrics:
  duration: 3min
  completed: 2026-04-05
  tasks_completed: 2
  files_created: 3
  files_modified: 2
---

# Phase 16 Plan 01: Buyer CRM Data Layer Summary

**One-liner:** Drizzle schema extension with 3 new tables (buyer_communication_events, buyer_deal_interactions, buyer_tags), 2 enums, 2 new buyers columns, 8 read queries, and 7 server actions for full buyer CRM data layer.

## What Was Built

### Schema Extensions (schema.ts + migration 0009)
- `buyerCommEventTypeEnum` — 7 event types: called_buyer, left_voicemail, emailed_buyer, sent_text, met_in_person, deal_blast, note
- `buyerDealInteractionStatusEnum` — 3 statuses: blasted, interested, closed
- `buyers.followUpDate` (nullable date) + `buyers.lastContactedAt` (nullable timestamptz)
- `buyerCommunicationEvents` table with buyerId FK, eventType enum, dealId nullable FK, occurredAt, indexes on buyerId + occurredAt
- `buyerDealInteractions` table with unique (buyerId, dealId), status enum default "blasted", indexes on both FKs
- `buyerTags` table with unique (buyerId, tag), indexes on buyerId and tag
- Migration 0009_buyer_crm.sql with full DDL (CREATE TYPE, ALTER TABLE, CREATE TABLE, all indexes)

### TypeScript Types (types/index.ts)
- `BuyerWithTags` — extends Buyer with tags[], followUpDate, lastContactedAt
- `BuyerTimelineEntry` — unified timeline entry for both comm events and deal interactions
- `BuyerDealInteraction` — deal interaction with joined deal address/city
- `BuyerWithMatchInfo` — extends Buyer with matchesArea + isFullMatch booleans + tags
- `OverdueBuyer` — minimal type for dashboard widget

### Query Functions (buyer-queries.ts)
8 exported functions:
1. `getBuyersForList(filters)` — dynamic filter query + tag aggregation in two DB calls
2. `getBuyerById(id)` — single buyer with tags
3. `getBuyerTimeline(buyerId)` — parallel fetch + merge + sort, mirrors getLeadTimeline pattern
4. `getBuyerDealInteractions(buyerId)` — interactions joined with deal address/city
5. `getAllBuyerTags()` — distinct tags for filter dropdown
6. `getOverdueBuyerFollowups()` — indexed date query for dashboard widget
7. `getBuyersForExport(filters?)` — flat rows for CSV export
8. `getMatchingBuyersForDeal(price, city)` — enhanced price + area matching

### Server Actions (buyer-actions.ts)
7 exported actions (all "use server", Zod validated, revalidatePath):
1. `logBuyerCommEvent(formData)` — insert event + update lastContactedAt
2. `setBuyerFollowUp(formData)` — set or clear follow_up_date
3. `addBuyerTag(formData)` — insert tag with onConflictDoNothing
4. `removeBuyerTag(formData)` — delete tag
5. `updateBuyerDealInteraction(formData)` — upsert interaction status
6. `importBuyers(rows[])` — batch insert with per-row try/catch, returns { imported, errors }
7. `logDealBlast(buyerId, dealId)` — insert comm event + upsert interaction + update lastContactedAt

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist
- `app/drizzle/0009_buyer_crm.sql` — FOUND
- `app/src/lib/buyer-queries.ts` — FOUND
- `app/src/lib/buyer-actions.ts` — FOUND
- `app/src/db/schema.ts` (modified) — FOUND
- `app/src/types/index.ts` (modified) — FOUND

### Commits Exist
- `9bf316e` — feat(16-01): schema extensions for buyer CRM — FOUND
- `cd9a242` — feat(16-01): buyer CRM types, queries, and server actions — FOUND

### TypeScript
- `npx tsc --noEmit` — PASSED (zero errors)

## Self-Check: PASSED
