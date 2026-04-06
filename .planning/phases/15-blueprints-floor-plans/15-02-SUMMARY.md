---
phase: 15-blueprints-floor-plans
plan: 02
subsystem: floor-plans
tags: [floor-plans, pan-zoom, pdf-viewer, react-pdf, react-zoom-pan-pinch, pin-annotations, file-upload, deal-detail]
dependency_graph:
  requires:
    - phase: 15-01
      provides: "floor_plans table, floor_plan_pins table, FloorPlanWithPins type, createFloorPlan/createPin/deletePin server actions, getFloorPlansByDeal/getFloorPlanCount queries"
  provides:
    - "FloorPlanUpload component: PDF/image upload with client-side resize"
    - "FloorPlanViewer component: react-zoom-pan-pinch pan/zoom with react-pdf PDF rendering and pin overlay"
    - "FloorPlanPin component: colored circle markers with popover (category, note, delete, budget link)"
    - "FloorPlanPinForm component: modal for creating pins with category grid, note, budget category link"
    - "FloorPlanTab component: floor selector, version toggle, upload/sketch routing"
    - "FloorPlanSketch stub: placeholder for Plan 15-03"
    - "Deal detail page: 6th Floor Plans tab with count badge"
  affects: [deal-detail, floor-plan-sketch-15-03]

tech-stack:
  added: [react-zoom-pan-pinch, react-pdf, pdfjs-dist]
  patterns:
    - "dynamic(() => import, ssr:false) for pdfjs + react-zoom-pan-pinch components to avoid SSR errors"
    - "pdfjs.GlobalWorkerOptions.workerSrc via new URL(import.meta.url) for correct worker path bundling"
    - "Click handler on inner content div (not TransformWrapper) for correct pin coordinates when zoomed"
    - "Linter-enhanced tab now references FloorPlanSketch stub to anticipate 15-03"

key-files:
  created:
    - app/src/components/floor-plan-upload.tsx
    - app/src/components/floor-plan-viewer.tsx
    - app/src/components/floor-plan-pin.tsx
    - app/src/components/floor-plan-pin-form.tsx
    - app/src/components/floor-plan-tab.tsx
    - app/src/components/floor-plan-sketch.tsx
  modified:
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/package.json

key-decisions:
  - "react-pdf v10 used for PDF rendering (pdfjs-dist v5) — compatible with React 19 peerDeps"
  - "pdfjs worker configured via new URL(import.meta.url) — required for correct bundling in Next.js"
  - "Click handler on inner TransformComponent content div — ensures correct xPct/yPct at any zoom level"
  - "FloorPlanSketch stub created now (15-02) to satisfy linter's pre-emptive dynamic import — full implementation deferred to 15-03"
  - "deal.sqft shown in deal header — linter enhancement using existing sqft column populated by floor plan sum"

patterns-established:
  - "Floor plan viewer uses dynamic/ssr:false at tab level (not at import site) to prevent SSR breakage from pdfjs"
  - "Pin overlay: absolute-positioned divs at pin.xPct*100% + pin.yPct*100% with translate(-50%,-100%) anchor"

requirements-completed: [FLOOR-01, FLOOR-02, FLOOR-05, FLOOR-07]

duration: 6min
completed: 2026-04-06
---

# Phase 15 Plan 02: Upload Path, Pan/Zoom Viewer, Pin Annotations, and Floor Plans Tab Summary

**PDF/image floor plan upload with client-side resize, react-zoom-pan-pinch viewer with pdfjs PDF rendering, colored pin annotations linked to budget categories, and 6th Floor Plans tab on deal detail**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-06T04:00:07Z
- **Completed:** 2026-04-06T04:06:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Upload component handles PDF (10MB limit, as-is) and images (client-side resize to 1920px JPEG 0.8), floor label + version selectors
- Pan/zoom viewer using react-zoom-pan-pinch renders images and PDFs (via react-pdf + pdfjs-dist) with +/-/reset zoom controls and multi-page PDF navigation
- Pin annotation system: colored circle markers with category-specific colors (13 categories), hover popover showing category/note/delete/budget link; click-to-drop-pin form with category grid, note, and optional budget category link
- Floor Plans is the 6th tab on deal detail with count badge; floor selector, version toggle, and upload/sketch routing; deal.sqft displayed in header

## Task Commits

1. **Task 1: Floor plan upload, viewer, pin** - `b3dc316` (feat)
2. **Task 2: Floor Plans tab + deal detail** - `b384ea8` (feat)
3. **Task 2 (linter enhancements)** - `2063fa4` (feat)

## Files Created/Modified

- `app/src/components/floor-plan-upload.tsx` — File picker for PDF/image, floor label + version selectors, client-side resize, FormData submission
- `app/src/components/floor-plan-viewer.tsx` — TransformWrapper pan/zoom, react-pdf Document/Page for PDFs, img for images, pin overlay, click-to-pin
- `app/src/components/floor-plan-pin.tsx` — Colored pin marker with popover (category, note, budget link, delete)
- `app/src/components/floor-plan-pin-form.tsx` — Modal with 13-category grid with color dots, note textarea, budget category dropdown
- `app/src/components/floor-plan-tab.tsx` — Floor selector cards, version toggle, viewer/upload/sketch routing, empty state, total sqft
- `app/src/components/floor-plan-sketch.tsx` — Stub placeholder (full implementation in Plan 15-03)
- `app/src/app/(dashboard)/deals/[id]/page.tsx` — Added 6th tab with count badge, getFloorPlansByDeal + getFloorPlanCount in parallel fetch, budgetCats for pin form
- `app/package.json` — Added react-zoom-pan-pinch, react-pdf, pdfjs-dist

## Decisions Made

- **react-pdf v10 + pdfjs-dist v5**: Both compatible with React 19 peerDeps — installed without conflicts
- **pdfjs worker via new URL(import.meta.url)**: Required for correct Next.js bundling; CDN worker not used (per research notes about unreliability on Azure)
- **Click handler on inner TransformComponent content div**: Ensures correct xPct/yPct calculation at any zoom/pan state — attaching to TransformWrapper would give wrong coordinates
- **FloorPlanSketch stub (Rule 3 - Blocking)**: Linter pre-emptively added a dynamic import for FloorPlanSketch which doesn't exist yet; created stub to avoid runtime module resolution error. Full sketch implementation deferred to Plan 15-03.
- **deal.sqft in header**: Linter added enhancement to show sqft in deal header — kept since the `sqft` column exists and is populated by floor plan sum. Good UX.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created FloorPlanSketch stub to satisfy linter's pre-emptive dynamic import**
- **Found during:** Task 2 commit (post-commit linter modification)
- **Issue:** The linter enhanced floor-plan-tab.tsx to include `dynamic(() => import('./floor-plan-sketch'))`. Without the file, this would cause a runtime module-not-found error when users click "Sketch" mode.
- **Fix:** Created `floor-plan-sketch.tsx` stub with correct `FloorPlanSketchProps` interface (including `initialRooms?: SketchRoom[]` and `string` types for floorLabel/version to match linter's usage). Shows "Sketch Tool Coming Soon" placeholder.
- **Files modified:** app/src/components/floor-plan-sketch.tsx
- **Verification:** `npx tsc --noEmit` passes, `npm run build` succeeds
- **Committed in:** 2063fa4

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Stub is a minimal correctness fix. No scope creep — sketch implementation remains in Plan 15-03.

## Issues Encountered

None — both packages (react-zoom-pan-pinch, react-pdf) installed without peer dependency conflicts with React 19.

## User Setup Required

None — no external service configuration required. The Azure Blob Storage `floor-plans` container is auto-created by existing `uploadFloorPlanBlob` logic (Plan 15-01).

## Next Phase Readiness

- Upload and view workflow complete — users can upload PDF/image floor plans and view with pan/zoom
- Pin annotation system complete — users can drop categorized pins linked to budget categories
- **Plan 15-03**: Implement FloorPlanSketch (interactive room drawing tool using react-konva) — stub component already in place

---
*Phase: 15-blueprints-floor-plans*
*Completed: 2026-04-06*
