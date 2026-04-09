---
phase: 17-netlify-migration-design-system
plan: "04"
subsystem: mobile-ux
tags: [mobile, swipe-gestures, framer-motion, mapbox, design-system]
dependency_graph:
  requires: ["17-02"]
  provides: [swipe-card-component, light-map-style]
  affects: [property-card, property-map, dashboard]
tech_stack:
  added: [framer-motion]
  patterns: [drag-gesture-lock, mobile-conditional-render, useIsMobile-hook]
key_files:
  created:
    - app/src/components/swipe-card.tsx
  modified:
    - app/src/components/property-card.tsx
    - app/src/components/map/property-map.tsx
    - app/package.json
decisions:
  - "ownerPhone not on PropertyWithLead type — swipe-right navigates to /properties/[id]#contact instead of tel: direct dial"
  - "framer-motion installed with --legacy-peer-deps due to pre-existing react-konva/React 19.1 peer dep conflict"
  - "SwipeCard disabled prop pattern used for desktop — isMobile check in PropertyCard selects render path"
  - "light-v11 Mapbox style replaces satellite-streets-v12 — clean minimal street map matches cream/sand palette"
metrics:
  duration: "2 min"
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_modified: 4
---

# Phase 17 Plan 04: Mobile Swipe Actions and Map Style Summary

iOS-style swipe gesture wrapper (framer-motion) on property cards with left/right action zones, and Mapbox style swapped from satellite to light-v11 warm street map.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install framer-motion and create SwipeCard component | eeb2bc2 | swipe-card.tsx, property-card.tsx, package.json |
| 2 | Swap Mapbox style to light-v11 | 6ee1de5 | property-map.tsx |

## What Was Built

### SwipeCard Component (`app/src/components/swipe-card.tsx`)

Reusable `"use client"` gesture wrapper using framer-motion:

- `drag="x"` with `dragDirectionLock` — horizontal drag does not capture vertical scroll gestures
- `touch-action: pan-y` on the motion.div — vertical scroll passes through on iOS/Android
- `overscrollBehaviorX: contain` on outer container — prevents page swipe interference
- SWIPE_THRESHOLD = 80px before action fires
- Left swipe (negative x) reveals brand-500 Status action zone with ChevronRight icon
- Right swipe (positive x) reveals emerald-600 Call action zone with Phone icon
- After callback fires, card snaps back to x=0 after 300ms
- `dragConstraints={{ left: -150, right: 150 }}` and `dragElastic={0.3}` for natural feel
- `disabled` prop for server-rendered or desktop contexts

### PropertyCard Mobile Integration (`app/src/components/property-card.tsx`)

- Added `useIsMobile()` hook to detect mobile viewport
- On mobile: wraps card in `<SwipeCard>` with left/right handlers
- On desktop: renders card directly (no swipe wrapper)
- Swipe right → navigates to `/properties/[id]#contact` (contact tab)
- Swipe left → navigates to `/properties/[id]` (property detail, status change)

### Map Style Change (`app/src/components/map/property-map.tsx`)

- Single-line change: `satellite-streets-v12` → `light-v11`
- Light warm street map aligns with No BS Homes cream/sand design palette
- Custom search input (not Mapbox geocoder widget) — no geocoder CSS contrast issues
- No other satellite references found in map directory

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ownerPhone not available on PropertyWithLead type**
- **Found during:** Task 1 (swipe-right call action implementation)
- **Issue:** Plan specified `window.location.href = 'tel:' + phone` but `ownerPhone` field doesn't exist on `PropertyWithLead` interface
- **Fix:** Swipe right navigates to `/properties/[id]#contact` instead, where owner phones are displayed in the Contact tab
- **Files modified:** app/src/components/property-card.tsx

**2. [Rule 3 - Blocking] framer-motion npm peer dep conflict**
- **Found during:** Task 1 (npm install)
- **Issue:** react-konva@19.2.3 requires react@^19.2.0 but project uses react@19.1.0 — npm refused to resolve
- **Fix:** Used `--legacy-peer-deps` flag (pre-existing conflict, unrelated to framer-motion)
- **Files modified:** None (install flag only)

## Self-Check: PASSED

All created files verified on disk. All task commits confirmed in git log.
