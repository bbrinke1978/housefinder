---
phase: 14-mobile-photo-capture
plan: 01
subsystem: database
tags: [postgres, drizzle, azure-blob-storage, server-actions, photo-upload]

# Dependency graph
requires:
  - phase: 08-wholesaling-deal-flow
    provides: deals table with uuid PK — propertyPhotos FK target
  - phase: 09-admin-budgeting-cost-analysis
    provides: blob-storage.ts uploadContract/generateContractSasUrl pattern to extend

provides:
  - propertyPhotos Drizzle table with photoCategory pgEnum, 3 indexes, PropertyPhotoRow type
  - blob-storage.ts photo functions: uploadPhotoBlob, generatePhotoSasUrl, deletePhotoBlob
  - photo-queries.ts: getDealPhotos, getPropertyPhotos, getInboxPhotos, getDealCoverPhoto, getInboxCount
  - photo-actions.ts: uploadPhoto, setPhotoCover, deletePhoto, assignPhotosToDeal, updatePhotoCaption

affects: [14-mobile-photo-capture plans 02 and 03, any UI consuming deal photos]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - uploadPhotoBlob/generatePhotoSasUrl/deletePhotoBlob follow same container-scoped pattern as receipts and contracts
    - photo-actions.ts "use server" auth-gate pattern consistent with deal-actions.ts and contract-actions.ts
    - PhotoWithSasUrl = PropertyPhotoRow & { sasUrl: string } — augmented type for SAS URL generation at query time

key-files:
  created:
    - app/src/lib/photo-queries.ts
    - app/src/lib/photo-actions.ts
    - app/drizzle/0006_powerful_devos.sql
  modified:
    - app/src/db/schema.ts
    - app/src/lib/blob-storage.ts

key-decisions:
  - "PhotoCategoryValue local type union used instead of inferred pgEnum type — avoids TypeScript Parameters<> hack"
  - "assignPhotosToDeal uses inArray(propertyPhotos.id, photoIds) to scope update to specified photos only (not all inbox)"
  - "isInbox = true auto-set when both dealId and propertyId are null/empty — inbox is the default landing zone"
  - "isCover auto-set to true for first exterior photo uploaded to a deal with no existing exterior cover"

patterns-established:
  - "PHOTOS_CONTAINER constant scopes all photo blob ops to 'photos' container (same as RECEIPTS/CONTRACTS pattern)"
  - "withSasUrl helper wraps every PropertyPhotoRow for consistent SAS URL generation across all query functions"

requirements-completed: [PHOTO-01, PHOTO-02, PHOTO-06, PHOTO-09]

# Metrics
duration: 3min
completed: 2026-04-05
---

# Phase 14 Plan 01: Mobile Photo Capture Data Layer Summary

**propertyPhotos Drizzle table with photoCategory enum, Drizzle migration, Azure Blob Storage photo functions, 5 server actions, and 5 query functions with SAS URL generation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T22:15:40Z
- **Completed:** 2026-04-05T22:18:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `property_photos` table with 13 columns, photoCategory pgEnum (10 values), 2 nullable FKs, 3 indexes, PropertyPhotoRow type export
- blob-storage.ts extended with uploadPhotoBlob, generatePhotoSasUrl, deletePhotoBlob for the "photos" container
- photo-queries.ts with getDealPhotos, getPropertyPhotos, getInboxPhotos, getDealCoverPhoto, getInboxCount — all return PhotoWithSasUrl types
- photo-actions.ts with 5 auth-gated server actions covering full CRUD + inbox-to-deal assignment flow

## Task Commits

1. **Task 1: Database schema and blob storage functions** - `5e7dbd6` (feat)
2. **Task 2: Server actions and query functions** - `15bc8de` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/src/db/schema.ts` — Added photoCategory pgEnum + propertyPhotos table + PropertyPhotoRow type
- `app/src/lib/blob-storage.ts` — Added PHOTOS_CONTAINER, uploadPhotoBlob, generatePhotoSasUrl, deletePhotoBlob
- `app/src/lib/photo-queries.ts` — Created: 5 query functions + PhotoWithSasUrl type
- `app/src/lib/photo-actions.ts` — Created: 5 server actions, all with auth() check
- `app/drizzle/0006_powerful_devos.sql` — Migration for property_photos table and photo_category enum

## Decisions Made

- `PhotoCategoryValue` local type union used instead of inferring from pgEnum — the `Parameters<>` TypeScript trick doesn't work on Drizzle enum columns
- `assignPhotosToDeal` uses `inArray(propertyPhotos.id, photoIds)` to scope updates to specified photo IDs only — prevents accidentally assigning all inbox photos
- `isInbox` auto-set to true when both dealId and propertyId are null/empty — inbox is the catch-all for field photos not yet tied to a deal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed assignPhotosToDeal scoping bug**
- **Found during:** Task 2 (server actions)
- **Issue:** Initial implementation used `eq(propertyPhotos.isInbox, true)` which would assign ALL inbox photos instead of the specified `photoIds`
- **Fix:** Replaced with `inArray(propertyPhotos.id, photoIds)` to scope update to only the provided photo IDs
- **Files modified:** app/src/lib/photo-actions.ts
- **Verification:** TypeScript compilation passes (0 errors)
- **Committed in:** 15bc8de (Task 2 commit)

**2. [Rule 1 - Bug] Fixed PhotoCategoryValue TypeScript type casting**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** Used `Parameters<typeof propertyPhotos._.inferInsert.category>[0]` which TypeScript rejected — undefined is not assignable to `(...args) => any`
- **Fix:** Defined local `PhotoCategoryValue` union type matching the pgEnum values
- **Files modified:** app/src/lib/photo-actions.ts
- **Verification:** `npx tsc --noEmit` reports 0 errors
- **Committed in:** 15bc8de (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs)
**Impact on plan:** Both fixes were necessary for correctness. No scope creep.

## Issues Encountered

None beyond the auto-fixed TypeScript issues above.

## User Setup Required

None - no external service configuration required. The "photos" Azure Blob Storage container will be auto-created by `uploadPhotoBlob` on first use (createIfNotExists pattern).

## Next Phase Readiness

- Data layer complete: all DB schema, blob storage functions, server actions, and query functions ready for UI consumption
- Plan 02 (photo upload UI / camera capture component) can import directly from photo-actions.ts and photo-queries.ts
- Plan 03 (photo inbox + deal assignment UI) can import from same modules
- Migration 0006 needs to be applied to Azure PostgreSQL before UI goes live

---
*Phase: 14-mobile-photo-capture*
*Completed: 2026-04-05*
