---
phase: 14-mobile-photo-capture
plan: 02
subsystem: ui-components
tags: [photo-upload, photo-gallery, deal-detail, lightbox, ios-camera, yarl]

# Dependency graph
requires:
  - phase: 14-mobile-photo-capture
    plan: 01
    provides: photo-actions.ts + photo-queries.ts + propertyPhotos schema

provides:
  - photo-upload.tsx: dual iOS-safe file inputs, per-file progress queue, category picker, 1600px resize
  - photo-gallery.tsx: grouped grid by category, YARL lightbox with Captions plugin, cover/delete/caption management
  - photo-tab.tsx: PhotoUpload + PhotoGallery composition wrapper for deal detail
  - Deal detail page: 5-tab layout (Overview, Analysis, Financials, Photos, Activity) with photo count badge
  - DealBlastGenerator: coverPhotoSasUrl prop, auto-populates photo URL field from cover photo

affects: [14-mobile-photo-capture plan 03, deal detail page at /deals/[id]]

# Tech tracking
tech-stack:
  added:
    - yet-another-react-lightbox v3.30.1
  patterns:
    - Dual file input for iOS Safari: capture="environment" (camera) + multiple (gallery picker) — per RESEARCH.md Pitfall 5
    - YARL Lightbox dynamically imported with ssr:false (uses browser DOM APIs); Captions plugin imported statically (plain function, not a React component)
    - resizeImage canvas pattern at 1600px max side (vs 1920px in receipt-upload.tsx) — CONTEXT.md decision for photo workflow
    - Per-file status queue pattern: pending/uploading/done/error badges with previewUrl cleanup on completion

key-files:
  created:
    - app/src/components/photo-upload.tsx
    - app/src/components/photo-gallery.tsx
    - app/src/components/photo-tab.tsx
  modified:
    - app/src/app/(dashboard)/deals/[id]/page.tsx
    - app/src/components/deal-blast-generator.tsx
    - app/package.json
    - app/package-lock.json

key-decisions:
  - "Captions imported statically (not via next/dynamic) — it is a plain Plugin function, not a React component, so dynamic() would fail type checks"
  - "YARL Lightbox itself imported with ssr:false (uses document/window at init time)"
  - "Captions cast as unknown as Plugin to satisfy TypeScript since dynamic import returns ComponentType, not Plugin"

# Metrics
duration: 4min
completed: 2026-04-05
---

# Phase 14 Plan 02: Photo Upload UI, Gallery Lightbox, and Photos Tab Summary

**PhotoUpload with dual iOS-safe inputs + per-file progress, PhotoGallery with YARL lightbox grouped by category, PhotoTab on deal detail page (5th tab), and cover photo SAS URL auto-wired into deal blast generator**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T22:21:15Z
- **Completed:** 2026-04-05T22:25:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `yet-another-react-lightbox` v3.30.1 installed
- `photo-upload.tsx`: dual file inputs (camera capture + gallery picker) for iOS Safari compatibility, per-file status queue (pending/uploading/done/error), category picker with 10 predefined categories, optional per-photo captions, 1600px canvas resize before upload, sequential upload calling `uploadPhoto` server action per file
- `photo-gallery.tsx`: photos grouped by category with section headers, responsive grid, YARL Lightbox with Captions plugin (title + description per slide), cover badge, hover overlay with set-cover/delete/caption-edit controls, empty state with camera icon
- `photo-tab.tsx`: simple composition wrapper rendering PhotoUpload + PhotoGallery
- Deal detail page: 5 tabs (Overview, Analysis, Financials, Photos, Activity), photo count badge on Photos tab, `getDealPhotos` + `getDealCoverPhoto` added to parallel Promise.all, `tabMap` updated to include `photos`
- `deal-blast-generator.tsx`: `coverPhotoSasUrl` prop added, `photoUrl` state initialized from cover photo SAS URL, placeholder text updated to indicate auto-population

## Task Commits

1. **Task 1: Install YARL and create photo upload + gallery components** - `f62cadb` (feat)
2. **Task 2: Photos tab on deal detail page with cover photo wired to blast generator** - `1e82713` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/src/components/photo-upload.tsx` — Created: dual-input photo capture, per-file queue, category picker, canvas resize, batch upload
- `app/src/components/photo-gallery.tsx` — Created: grouped grid, YARL lightbox, Captions plugin, cover/delete/caption controls
- `app/src/components/photo-tab.tsx` — Created: composition wrapper for deal detail page
- `app/src/app/(dashboard)/deals/[id]/page.tsx` — Added Photos tab, getDealPhotos/getDealCoverPhoto fetch, coverPhotoSasUrl to blast generator
- `app/src/components/deal-blast-generator.tsx` — Added coverPhotoSasUrl prop, auto-initializes photoUrl state
- `app/package.json` — Added yet-another-react-lightbox dependency
- `app/package-lock.json` — Lock file updated

## Decisions Made

- Captions plugin imported statically as a named import (not via `next/dynamic`) because it is a plain Plugin function `(props: PluginProps) => void` — `dynamic()` expects a React component loader and fails TypeScript type checks on plain functions
- YARL Lightbox itself uses `dynamic(() => import("yet-another-react-lightbox"), { ssr: false })` because it accesses browser APIs (document/window) at module initialization time
- `Captions as unknown as Plugin` cast used to satisfy TypeScript when passing the statically imported plugin function to the `plugins` prop which expects the `Plugin` function type

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed YARL Captions plugin dynamic import type mismatch**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** Plan specified `dynamic(() => import(...).then(m => m.Captions), { ssr: false })` but (a) the plugin has no named `Captions` export — it is the default export, and (b) `dynamic()` expects a React component loader (`Loader<ComponentProps>`) not a plain Plugin function
- **Fix:** Import Captions statically with `import Captions from "yet-another-react-lightbox/plugins/captions"` and cast as `unknown as Plugin` when passing to the `plugins` prop. YARL Lightbox itself still uses `dynamic(..., { ssr: false })`
- **Files modified:** app/src/components/photo-gallery.tsx
- **Verification:** `npx tsc --noEmit` reports 0 errors
- **Committed in:** f62cadb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug)
**Impact on plan:** Minor — the Captions plugin works identically at runtime; only the import mechanism differed from the plan spec.

## Issues Encountered

None beyond the auto-fixed TypeScript issue above.

## User Setup Required

None — yet-another-react-lightbox is a pure npm package requiring no external configuration.

## Next Phase Readiness

- UI layer complete: PhotoUpload + PhotoGallery + PhotoTab + deal page integration all in place
- Plan 03 (Photo Inbox — field photos without a deal) can reuse PhotoUpload (no dealId) and PhotoGallery with canManage=false
- Azure Blob migration (0006) still needs to be applied to production PostgreSQL before the Photos tab goes live

---
*Phase: 14-mobile-photo-capture*
*Completed: 2026-04-05*
