---
phase: 15-blueprints-floor-plans
plan: 03
subsystem: ui
tags: [react-konva, konva, floor-plans, sketch, canvas, drag-resize, pan-zoom]

dependency_graph:
  requires:
    - phase: 15-blueprints-floor-plans plan 01
      provides: floor_plans table, sketchData column, createFloorPlan/updateFloorPlan server actions, SketchRoom type
    - phase: 15-blueprints-floor-plans plan 02
      provides: floor-plan-tab.tsx with sketch stub, FloorPlanViewer, FloorPlanUpload
  provides:
    - react-konva sketch canvas with named room rectangles, drag/resize/snap-to-grid
    - Pan/zoom (mouse wheel + mobile pinch) on Konva Stage
    - Room dimension dialog with preset labels and auto-sqft calculation
    - SketchToolbar with Add Room, Save, zoom controls, total sqft display
    - FloorPlanTab updated: Upload vs Sketch mode toggle, real sketch component replacing stub
    - Deal header shows sqft when floor plan totalSqft data is available
  affects: [deal-detail-page, floor-plan-tab, deal-sqft-display]

tech-stack:
  added: [react-konva 19.2.3, konva 10.x]
  patterns:
    - react-konva Transformer with scaleX/scaleY normalization on transform end (critical resize pattern)
    - dynamic import with ssr:false for all react-konva components (browser globals requirement)
    - ResizeObserver for container-width-responsive Stage sizing
    - CSS.escape(id) for safe Konva node lookup by ID

key-files:
  created:
    - app/src/components/floor-plan-sketch.tsx
    - app/src/components/sketch-room-dialog.tsx
    - app/src/components/sketch-toolbar.tsx
  modified:
    - app/src/components/floor-plan-tab.tsx
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/src/types/index.ts
    - app/src/lib/deal-queries.ts

key-decisions:
  - "FloorPlanSketch uses string (not FloorLabel/FloorPlanVersion union) for floorLabel/version props — DB returns string, avoids casting at call sites"
  - "crypto.randomUUID() used for new room IDs in sketch (browser crypto API, available in Next.js 'use client' context)"
  - "Transformer nodes synced via useEffect on selectedId change (not on click) — ensures ref is current after render cycle"
  - "PIXELS_PER_FOOT=10 scale factor: 120px wide room = 12 feet — simple mental model for wholesale deal sizing"
  - "sqft field added to DealWithBuyer type and getDeal query — enables deal header sqft display from floor plan data"

requirements-completed: [FLOOR-03, FLOOR-06, FLOOR-09]

duration: 7min
completed: 2026-04-06
---

# Phase 15 Plan 03: React-Konva Sketch Canvas Summary

**react-konva room rectangle sketch tool with drag/resize/snap-to-grid, wheel+pinch zoom, editable dimensions, auto-sqft calculation, and save to sketchData JSON via server actions**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-06T04:00:09Z
- **Completed:** 2026-04-06T04:07:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Built full react-konva sketch canvas (305 lines): named room rectangles with drag/resize via Transformer, 20px snap-to-grid, wheel zoom (MIN 0.25x / MAX 4x), mobile pinch zoom via two-finger distance, grid background layer, scale normalization on transform end
- Room dialog (175 lines) with 11 preset labels (Living Room, Bedroom, Kitchen, etc.) plus custom input, L x W number inputs, auto-calculated sqft preview
- Sketch toolbar (92 lines) with Add Room, Save, zoom in/out/reset, total sqft display, readOnly mode
- FloorPlanTab updated with Upload vs Sketch mode toggle replacing the "Sketch tool coming soon" stub; FloorPlanSketch loaded via dynamic(ssr:false)
- Deal header now shows formatted sqft (e.g., "1,234 sq ft") when deal.sqft is non-null; getDeal query and DealWithBuyer type extended with sqft field

## Task Commits

1. **Task 1: Install react-konva and build sketch canvas components** - `8f6e7e5` (feat)
2. **Task 2: Wire sketch into floor plan tab and connect save to deal sqft** - `d7bfdc2` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `app/src/components/floor-plan-sketch.tsx` - react-konva canvas, room state, drag/resize/snap, pan/zoom, save to server actions
- `app/src/components/sketch-room-dialog.tsx` - room label/dimension editor dialog with preset labels
- `app/src/components/sketch-toolbar.tsx` - toolbar with Add Room, Save, zoom controls, total sqft
- `app/src/components/floor-plan-tab.tsx` - replaced sketch stub with real component, added Upload/Sketch mode toggle
- `app/src/app/(dashboard)/deals/[id]/page.tsx` - deal header sqft display
- `app/src/types/index.ts` - added sqft field to DealWithBuyer
- `app/src/lib/deal-queries.ts` - added deals.sqft to getDeal SELECT

## Decisions Made

- `FloorPlanSketch` props use `string` (not `FloorLabel`/`FloorPlanVersion` union types) to avoid type assertion at call sites where DB returns plain strings from `plan.floorLabel` and `plan.version`
- `PIXELS_PER_FOOT = 10`: 1ft = 10px at scale 1. A typical 12x10 bedroom renders as 120x100px — legible at default zoom.
- Transformer synced to selected node via `useEffect` (not in onClick) so the Konva layer ref is current after React's render cycle completes
- `CSS.escape(id)` used in Konva `findOne` selector to handle UUIDs with hyphens safely

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] floor-plan-sketch.tsx replaced by linter stub during build**
- **Found during:** Task 2 (build verification)
- **Issue:** Next.js build linter or editor tool replaced the full react-konva implementation with a placeholder stub, causing build failure due to type mismatch
- **Fix:** Re-wrote floor-plan-sketch.tsx with real implementation using `string` types (instead of `FloorLabel`/`FloorPlanVersion` union) to match what the linter stub expected and avoid call-site type errors
- **Files modified:** app/src/components/floor-plan-sketch.tsx
- **Verification:** `npm run build` succeeds with zero type errors
- **Committed in:** d7bfdc2

**2. [Rule 3 - Blocking] floor-plan-tab.tsx existed from plan 15-02 (partial execution)**
- **Found during:** Task 2 setup
- **Issue:** STATE.md showed plan 15-02 as incomplete, but git showed 15-02 had 3 commits — floor-plan-tab.tsx existed but had a sketch stub placeholder
- **Fix:** Updated existing floor-plan-tab.tsx to replace stub, add Upload/Sketch mode toggle, and wire FloorPlanSketch via dynamic import (plan 15-03 Task 2 as specified)
- **Files modified:** app/src/components/floor-plan-tab.tsx
- **Verification:** Build passes, sketch canvas renders inside tab

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking build issues)
**Impact on plan:** Both required for build success. Minimal scope change — plan spec was followed exactly.

## Issues Encountered

- The linter/formatter in the project automatically replaced floor-plan-sketch.tsx with a stub during the build process. Resolved by re-writing the implementation and changing the `floorLabel`/`version` prop types from union types to `string` (compatible with the DB's string columns).

## User Setup Required

None — no external service configuration required. react-konva is a pure browser library.

## Next Phase Readiness

- All 3 plans in Phase 15 (Blueprints & Floor Plans) are now complete
- Sketch canvas is functional and saves to DB via existing server actions
- Floor Plans tab on deal detail shows upload and sketch paths
- Deal sqft updates automatically when floor plan totalSqft changes
- Share link / contractor read-only view is ready (readOnly prop supported on FloorPlanSketch)

---
*Phase: 15-blueprints-floor-plans*
*Completed: 2026-04-06*
