---
phase: 14-mobile-photo-capture
plan: 03
subsystem: ui-components
tags: [photo-fab, photo-inbox, deal-cards, sidebar-nav, photo-carry-over]

# Dependency graph
requires:
  - phase: 14-mobile-photo-capture
    plan: 01
    provides: photo-actions.ts + photo-queries.ts + propertyPhotos schema
  - phase: 14-mobile-photo-capture
    plan: 02
    provides: PhotoUpload + PhotoGallery + PhotoTab components

provides:
  - photo-fab.tsx: mobile-only FAB for quick single-photo capture to inbox
  - photo-inbox.tsx: multi-select inbox grid with assign-to-deal flow and delete
  - photos/inbox/page.tsx: server-rendered Photo Inbox page at /photos/inbox
  - layout.tsx: PhotoFab injected above MobileBottomNav in dashboard layout
  - app-sidebar.tsx: Photos nav item between Contracts and Buyers
  - deal-actions.ts: createDeal carries property photos to new deal, auto-sets exterior cover
  - deal-card.tsx: 48x48 cover photo thumbnail at left of each deal card
  - deals/page.tsx: batch-fetches cover photos for all deals via inArray + isCover

affects: [all dashboard pages (FAB visible), /photos/inbox, /deals, deal kanban + list]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PhotoFab uses canvas resize (same resizeImage function as photo-upload.tsx) before uploadPhoto server action
    - Cover photos batch-fetched with inArray(propertyPhotos.dealId, dealIds) + isCover=true — single query for all deal cards, not N+1
    - coverPhotos Record<string,string> passed as prop through DealsSearchWrapper → DealKanban/DealList → DealCard
    - createDeal photo carry-over wrapped in try/catch — best-effort, deal creation never blocked by photo errors

key-files:
  created:
    - app/src/components/photo-fab.tsx
    - app/src/components/photo-inbox.tsx
    - app/src/app/(dashboard)/photos/inbox/page.tsx
  modified:
    - app/src/app/(dashboard)/layout.tsx
    - app/src/components/app-sidebar.tsx
    - app/src/lib/deal-actions.ts
    - app/src/app/(dashboard)/deals/page.tsx
    - app/src/components/deal-card.tsx
    - app/src/components/deal-kanban.tsx
    - app/src/components/deal-list.tsx
    - app/src/components/deals-search-wrapper.tsx

key-decisions:
  - "coverPhotos passed as Record<string,string> (not Map) through prop chain — plain objects serialize cleanly as Next.js server-to-client props"
  - "createDeal photo carry-over is best-effort (try/catch) — deal creation is never rolled back due to a photo migration failure"
  - "DealList gets 36x36 thumbnail (vs 48x48 in DealCard) — smaller thumbnail fits the compact table row height"
  - "PhotoFab uses md:hidden CSS class for mobile-only visibility — simpler than useSidebar hook, no JS required"

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 14 Plan 03: Photo Inbox, FAB, Sidebar Nav, Deal Card Thumbnails, and Photo Carry-Over Summary

**Mobile FAB for field capture to inbox, Photo Inbox page at /photos/inbox with assign-to-deal, sidebar Photos nav entry, createDeal property-photo carry-over, and 48x48 cover photo thumbnails on deal cards**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T22:28:37Z
- **Completed:** 2026-04-05T22:32:54Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- `photo-fab.tsx`: fixed-position mobile-only (`md:hidden`) circular FAB at `bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px)`, right: 1rem, z-40. Canvas-resizes each capture (1600px max side), calls `uploadPhoto` with no dealId/propertyId. Brief green Check icon feedback on success (1.5s).
- `photo-inbox.tsx`: multi-select photo grid (2/3/4 col responsive), checkbox overlay per photo, "Assign to Deal" toolbar with deal selector + category dropdown + Assign button. Delete-per-photo with X button. Empty state with ImageOff icon and field-capture hint.
- `photos/inbox/page.tsx`: server component fetching `getInboxPhotos()` + deals list (id, address, createdAt desc, limit 50) via `Promise.all`. Renders count badge and `<PhotoInbox>`.
- `layout.tsx`: `<PhotoFab />` injected above `<MobileBottomNav />`.
- `app-sidebar.tsx`: `ImageIcon` added to lucide imports; `{ label: "Photos", href: "/photos/inbox", icon: ImageIcon }` inserted between Contracts and Buyers.
- `deal-actions.ts`: after deal INSERT, if `propertyId` provided, runs `UPDATE property_photos SET deal_id=?, is_inbox=false WHERE property_id=? AND deal_id IS NULL`. Then auto-sets cover: finds first exterior photo and sets `is_cover=true` if no existing cover. All wrapped in try/catch with console.error.
- `deals/page.tsx`: batch-fetches cover photos via `inArray(propertyPhotos.dealId, dealIds) AND isCover=true`. Generates SAS URLs. Builds `coverPhotos: Record<string,string>` and passes to `DealsSearchWrapper`.
- `deal-card.tsx`: 48x48 rounded thumbnail using `next/image` at left; `ImageOff` placeholder when no cover.
- `deal-kanban.tsx`, `deal-list.tsx`, `deals-search-wrapper.tsx`: `coverPhotos` prop threaded through the component chain.

## Task Commits

1. **Task 1: Photo FAB, Inbox page, and sidebar navigation** - `7a93571` (feat)
2. **Task 2: Deal card thumbnails and property-to-deal photo carry-over** - `c775460` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/src/components/photo-fab.tsx` — Created: mobile FAB, canvas resize, uploadPhoto to inbox, green check feedback
- `app/src/components/photo-inbox.tsx` — Created: multi-select grid, assign toolbar, delete per photo, empty state
- `app/src/app/(dashboard)/photos/inbox/page.tsx` — Created: server page fetching inbox photos + deals list
- `app/src/app/(dashboard)/layout.tsx` — Added PhotoFab import + render above MobileBottomNav
- `app/src/components/app-sidebar.tsx` — Added ImageIcon import + Photos nav item between Contracts and Buyers
- `app/src/lib/deal-actions.ts` — createDeal: photo carry-over UPDATE + exterior cover auto-set, try/catch
- `app/src/app/(dashboard)/deals/page.tsx` — Batch-fetch cover photos via inArray, pass to DealsSearchWrapper
- `app/src/components/deal-card.tsx` — 48x48 Image thumbnail or ImageOff placeholder, coverPhotoUrl prop
- `app/src/components/deal-kanban.tsx` — coverPhotos prop threaded to DealCard
- `app/src/components/deal-list.tsx` — 36x36 thumbnail in address column, coverPhotos prop
- `app/src/components/deals-search-wrapper.tsx` — coverPhotos prop forwarded to kanban/list

## Decisions Made

- `coverPhotos` passed as `Record<string,string>` (plain object) through the prop chain — plain objects serialize cleanly as Next.js server-to-client props without needing Map serialization
- `createDeal` photo carry-over is best-effort (`try/catch`) — deal creation is never rolled back or blocked due to a photo migration failure
- `DealList` uses 36x36 thumbnail vs 48x48 in `DealCard` — more compact for the table row height
- `PhotoFab` uses `md:hidden` CSS class for mobile-only visibility — simpler than checking `useSidebar`, requires no client-side JS

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Added coverPhotos prop chain to DealKanban, DealList, DealsSearchWrapper**
- **Found during:** Task 2 (implementing deal card thumbnails)
- **Issue:** Plan specified cover photos only for DealCard but the architecture uses DealsSearchWrapper → DealKanban/DealList → DealCard. DealCard cannot fetch server data on its own; cover photo SAS URLs must be passed from the server page down through the client component chain.
- **Fix:** Added `coverPhotos?: Record<string, string>` prop to DealsSearchWrapper, DealKanban, and DealList — all defaulting to `{}`. Pass-through with no logic in intermediary components.
- **Files modified:** deal-kanban.tsx, deal-list.tsx, deals-search-wrapper.tsx
- **Committed in:** c775460 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing prop chain for server data)
**Impact on plan:** No scope creep — this was always required by the architecture. The plan assumed DealCard could receive the data but did not specify how it would flow through client components.

## Issues Encountered

None beyond the prop-chain deviation above.

## User Setup Required

None — all changes are pure Next.js/React. Azure Blob Storage migration (0006) applied in Phase 14 Plan 01 remains the prerequisite for photos to actually display.

## Next Phase Readiness

- Phase 14 complete: all PHOTO requirements (PHOTO-01 through PHOTO-09) fulfilled across Plans 01-03
- Photos tab on deal detail, Photo Inbox page, mobile FAB, sidebar navigation, deal card thumbnails, and property-to-deal carry-over all in place
- No further photo work planned

---

## Self-Check

### Files Created
- [x] `app/src/components/photo-fab.tsx` — FOUND
- [x] `app/src/components/photo-inbox.tsx` — FOUND
- [x] `app/src/app/(dashboard)/photos/inbox/page.tsx` — FOUND

### Commits Verified
- [x] 7a93571 — feat(14-03): Photo FAB, inbox page, and sidebar navigation
- [x] c775460 — feat(14-03): Deal card thumbnails and property-to-deal photo carry-over

## Self-Check: PASSED

---
*Phase: 14-mobile-photo-capture*
*Completed: 2026-04-05*
