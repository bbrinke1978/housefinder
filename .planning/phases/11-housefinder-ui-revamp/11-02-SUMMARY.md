---
phase: 11-housefinder-ui-revamp
plan: "02"
subsystem: frontend
tags: [ui, dashboard, mobile, stats-bar, filters, property-card, sheet]
dependency_graph:
  requires: [11-01]
  provides: [compact-stats-bar, mobile-filter-drawer, refreshed-property-cards]
  affects: [dashboard-page, stats-bar, dashboard-filters, property-card]
tech_stack:
  added: []
  patterns:
    - Horizontal scroll stat pills replacing card grid
    - Mobile filter drawer using shadcn Sheet (base-ui) from bottom
    - Active filter count badge on mobile filter button
    - Compact single-row score display (circle | bar | tier badge)
    - scrollbar-hide utility class in globals.css
key_files:
  created: []
  modified:
    - app/src/components/stats-bar.tsx
    - app/src/app/(dashboard)/page.tsx
    - app/src/components/dashboard-filters.tsx
    - app/src/components/property-card.tsx
    - app/src/app/globals.css
decisions:
  - key: mobile-filter-trigger
    choice: Custom button element (not SheetTrigger) for filter drawer trigger
    rationale: SheetTrigger in base-ui doesn't wrap arbitrary children reliably; using controlled open state with a plain button avoids asChild/render prop complexity
  - key: stats-pills-hover
    choice: hover:bg-accent hover:border-primary/30 on stat pills
    rationale: Subtle violet border glow on hover communicates interactivity while maintaining the clean pill aesthetic
metrics:
  duration: 5min
  completed: 2026-03-26
  tasks_completed: 2
  files_modified: 5
---

# Phase 11 Plan 02: Dashboard Mobile-First Redesign Summary

**One-liner:** Compact horizontal stat pills, mobile filter Sheet drawer with badge count, and single-row property card score display — dashboard decluttered for 360px Android screens.

## What Was Built

### Task 1: Compact Stats Bar + Hero Banner Removal + Mobile Filter Drawer

**stats-bar.tsx** replaced the 5-card grid (2-col mobile, 5-col desktop) with a single horizontal scroll row of compact pills. Each pill is ~56px tall on mobile. Added `scrollbar-hide` utility to globals.css, `overscroll-x-contain` to prevent page scroll bleed, and negative margin trick (`-mx-4 px-4`) for edge-to-edge on mobile.

**page.tsx** removed the Unsplash hero banner entirely (saved 192px vertical space on mobile, eliminated external network request). Replaced with a compact two-line text header: bold "Dashboard" title + muted subtitle showing total properties and city count.

**dashboard-filters.tsx** now renders two completely separate layouts:
- Mobile (`md:hidden`): Search input always visible + icon button that opens a Sheet drawer from the bottom (80vh, rounded-t-2xl). Active filter count badge shows on the button when non-default filters are set.
- Desktop (`hidden md:flex`): All filters inline as before.
The filter logic (URL searchParams, router.push) is unchanged — only the visual container changed.

### Task 2: Property Card Redesign

**property-card.tsx** collapsing the score section from two separate rows to a single compact row:
`[score circle] [progress bar fills remaining] [tier badge]`

Lead status moved to a small label in the footer row alongside the hover CTA. Card padding tightened to `p-3` mobile / `p-4` desktop (was `card-elevated` which uses `p-6`). Hover state updated to `hover:border-primary/30` for a subtle violet glow. Owner type and tier badges updated to transparent colored variants (`bg-red-500/10 text-red-400 border border-red-500/20`). "New" badge updated from blue to `bg-primary/10 text-primary` (violet). `hot-pulse` pseudo-element preserved via `relative` Tailwind class on the card div.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical approach] Used controlled Sheet state instead of SheetTrigger render prop**
- **Found during:** Task 1 implementation
- **Issue:** The plan's example used `<SheetTrigger asChild>` but the RESEARCH doc explicitly warns against `asChild` with shadcn v4 base-ui components (decision `[02-01]`). SheetTrigger in the base-ui implementation doesn't support arbitrary child composition via `asChild`. The `render` prop pattern works for specific shadcn internal compositions but not for arbitrary external buttons in a filter bar.
- **Fix:** Used controlled state (`useState(false)` for `sheetOpen`) with a plain `<button>` element that calls `setSheetOpen(true)`. The Sheet component uses `open={sheetOpen} onOpenChange={setSheetOpen}`. This is functionally equivalent and avoids the composition pitfall.
- **Files modified:** `app/src/components/dashboard-filters.tsx`
- **Commit:** df86a6a

## Self-Check: PASSED

- app/src/components/stats-bar.tsx: FOUND
- app/src/components/dashboard-filters.tsx: FOUND
- app/src/components/property-card.tsx: FOUND
- app/src/app/(dashboard)/page.tsx: FOUND
- Commit df86a6a (Task 1): FOUND
- Commit 53f11c9 (Task 2): FOUND
