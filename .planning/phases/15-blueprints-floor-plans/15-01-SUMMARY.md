---
phase: 15-blueprints-floor-plans
plan: 01
subsystem: floor-plans
tags: [schema, migrations, blob-storage, server-actions, queries, types]
dependency_graph:
  requires: [deals table, properties table, budget_categories table, Azure Blob Storage]
  provides: [floor_plans table, floor_plan_pins table, blob upload/SAS, CRUD actions, query functions]
  affects: [deals.sqft, deal detail page]
tech_stack:
  added: []
  patterns: [drizzle-orm left join with TypeScript grouping, FormData server actions, 4-hour SAS expiry for editing]
key_files:
  created:
    - app/src/lib/floor-plan-queries.ts
    - app/src/lib/floor-plan-actions.ts
    - app/drizzle/0008_floor_plans.sql
  modified:
    - app/src/db/schema.ts
    - app/src/types/index.ts
    - app/src/lib/blob-storage.ts
decisions:
  - "Migration numbered 0008 (not 0004 as in plan) — existing migrations go up to 0007"
  - "recalculateDealSqft uses drizzle sum() aggregate to avoid N+1 on deal sqft updates"
  - "budgetCategoryId on floor_plan_pins has no FK constraint (soft link) per plan spec"
  - "Blob NOT deleted on deleteFloorPlan for safety — only DB row removed"
metrics:
  duration: 3min
  completed: 2026-04-05
  tasks_completed: 2
  files_changed: 6
---

# Phase 15 Plan 01: Schema, Types, Blob Storage, Queries, and Actions Summary

Floor plan data foundation: floorPlans and floorPlanPins tables with migration SQL, TypeScript types, Azure Blob Storage extension for PDF/image uploads with 4-hour SAS expiry, query functions with left-join pin grouping, and complete CRUD server actions including share link generation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Schema tables, migration, types, and blob storage extension | f5faf5a | schema.ts, types/index.ts, blob-storage.ts, 0008_floor_plans.sql |
| 2 | Query functions and server actions | 390e0a5 | floor-plan-queries.ts, floor-plan-actions.ts |

## What Was Built

### Schema (schema.ts)
- `floorPlans` table: id, dealId (nullable FK), propertyId (nullable FK), floorLabel, version, sourceType, blobName, blobUrl, mimeType, sketchData, naturalWidth, naturalHeight, totalSqft, shareToken (unique), shareExpiresAt, sortOrder, timestamps. Indexes on dealId, propertyId, shareToken.
- `floorPlanPins` table: id, floorPlanId (notNull FK with CASCADE), xPct, yPct, category, note, budgetCategoryId (soft link — no FK), sortOrder, createdAt. Index on floorPlanId.
- Added `sqft` integer column to `deals` table for price/sqft calculations.
- Exported `FloorPlanRow` and `FloorPlanPinRow` InferSelectModel types.

### Types (types/index.ts)
- `FloorLabel`, `FloorPlanVersion`, `FloorPlanSourceType` string union types
- `PinCategory` union with 13 values (plumbing through general)
- `PIN_COLORS` Record mapping each PinCategory to a hex color
- `SketchRoom` interface for sketch mode room objects
- `FloorPlanWithPins` interface: `{ plan: FloorPlanRow; pins: FloorPlanPinRow[]; sasUrl: string | null }`

### Blob Storage (blob-storage.ts)
- `FLOOR_PLANS_CONTAINER = 'floor-plans'` constant
- `uploadFloorPlanBlob(buffer, blobName, contentType)` — accepts explicit contentType for PDFs and images, creates container if not exists
- `generateFloorPlanSasUrl(blobName)` — 4-hour expiry (longer than photos for editing sessions)

### Migration (0008_floor_plans.sql)
- ALTER TABLE deals ADD COLUMN sqft
- CREATE TABLE floor_plans with all columns
- CREATE TABLE floor_plan_pins with FK cascade
- CREATE all indexes

### Queries (floor-plan-queries.ts)
- `getFloorPlansByDeal(dealId)` — fetch all plans with pins, ordered by sortOrder + floorLabel
- `getFloorPlansByProperty(propertyId)` — same by propertyId
- `getFloorPlanWithPins(planId)` — single plan with pins
- `getFloorPlanByShareToken(token)` — validates shareExpiresAt > now(), returns null if expired
- `getFloorPlanCount(dealId)` — count for tab badge

### Actions (floor-plan-actions.ts)
- `createFloorPlan(formData)` — upload mode: file buffer → uploadFloorPlanBlob → DB insert; sketch mode: sketchData JSON → DB insert. Recalculates deal.sqft after insert.
- `updateFloorPlan(formData)` — updates floorLabel, version, sketchData, totalSqft. Recalculates deal.sqft when totalSqft changes.
- `deleteFloorPlan(planId)` — cascade deletes pins via FK. Blob NOT deleted for safety. Recalculates deal.sqft.
- `createPin(formData)` — inserts pin with xPct, yPct, category, note, budgetCategoryId
- `deletePin(pinId)` — deletes a single pin
- `updatePin(formData)` — updates category, note, budgetCategoryId
- `generateShareLink(planId)` — generates UUID token with 7-day expiry, stores on floor plan row
- `revokeShareLink(planId)` — sets shareToken + shareExpiresAt to null

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Migration Number Deviation (Non-issue)

The plan specified `0004_floor_plans.sql` but existing migrations go up to `0007_nullable_lead_property_id.sql`. Used `0008_floor_plans.sql` as the correct next sequential number. No functional impact.

### Pre-existing Error (Out of Scope)

`src/lib/enrollment-actions.ts(61)`: TS2769 type error pre-existed before this plan. Not caused by any changes in this plan. Logged for future cleanup.

## Verification

- `npx tsc --noEmit` passes with zero new errors (one pre-existing error in enrollment-actions.ts unrelated to this plan)
- Schema tables defined with correct column types, FKs, and indexes
- `uploadFloorPlanBlob` and `generateFloorPlanSasUrl` added to blob-storage.ts
- All 5 query functions typed and exported
- All 8 action functions typed and exported with 'use server' directive

## Self-Check: PASSED

Files exist:
- app/src/lib/floor-plan-queries.ts: FOUND
- app/src/lib/floor-plan-actions.ts: FOUND
- app/drizzle/0008_floor_plans.sql: FOUND

Commits exist:
- f5faf5a: FOUND
- 390e0a5: FOUND
