---
phase: 11-housefinder-ui-revamp
plan: "01"
subsystem: frontend
tags: [ui, design, palette, typography, navigation, login]
dependency_graph:
  requires: []
  provides: [zinc-violet-palette, inter-font, dark-mode-foundation, nav-shell]
  affects: [all-pages, app-sidebar, bottom-nav, login-page, dashboard-layout]
tech_stack:
  added: []
  patterns:
    - Inter variable font via next/font/google (replaces Google Fonts CSS @import)
    - Zinc/violet semantic CSS variables in :root and .dark
    - card-elevated / card-surface replacing card-warm / card-photo
    - btn-primary replacing btn-brand
key_files:
  created: []
  modified:
    - app/src/app/globals.css
    - app/src/app/layout.tsx
    - app/src/app/(dashboard)/layout.tsx
    - app/src/components/app-sidebar.tsx
    - app/src/components/bottom-nav.tsx
    - app/src/app/login/page.tsx
    - app/src/components/property-card.tsx
    - app/src/components/stats-bar.tsx
    - app/src/app/(dashboard)/page.tsx
    - app/src/app/(dashboard)/pipeline/page.tsx
    - app/src/app/(dashboard)/settings/page.tsx
decisions:
  - "[11-01] Violet accent (#8b5cf6 dark / #7c3aed light) selected over terracotta — matches Linear/Raycast tool aesthetic"
  - "[11-01] Inter via next/font replaces Bebas Neue + Oswald + Nunito Sans — single variable font, premium SaaS standard"
  - "[11-01] defaultTheme set to dark — dark is primary per user decision, enableSystem preserves user override"
  - "[11-01] Login hero replaced with CSS gradient panel (violet/zinc) — eliminates Unsplash network request on mobile"
  - "[11-01] Sidebar kept dark (#09090b) in both light and dark mode — matches Linear pattern"
metrics:
  duration: "5min"
  completed: "2026-03-26"
  tasks_completed: 2
  files_modified: 11
---

# Phase 11 Plan 01: Design Foundation Summary

Zinc + violet palette, Inter font, dark-first redesign — complete palette swap from terracotta to premium SaaS aesthetic with zero build errors.

## What Was Built

Replaced the entire visual identity of HouseFinder. Every page now renders with the new zinc/violet premium dark aesthetic. The terracotta desert palette, Bebas Neue display font, and Oswald heading font are completely removed from the codebase.

### Task 1: Palette, Font, and Class Cleanup

**globals.css** — Full replacement:
- Removed Google Fonts `@import url(...)` (was loading Bebas Neue + Oswald + Nunito Sans)
- Removed `--color-brand-*`, `--color-warm-*`, `--color-dark-*` palette variables from `@theme inline`
- Removed `--font-display`, `--font-heading`, `--font-body` variables
- Replaced `--shadow-warm`, `--shadow-warm-lg`, `--shadow-photo` with `--shadow-subtle` and `--shadow-card`
- New `:root` (light): `#fafafa` background, `#09090b` foreground, `#7c3aed` primary (violet-700)
- New `.dark`: `#09090b` background, `#fafafa` foreground, `#8b5cf6` primary (violet-500)
- Dark sidebar: `#020203` (near-true black, like Linear)
- Renamed component classes: `btn-brand` → `btn-primary`, `card-warm` → `card-elevated`, `card-photo` → `card-surface`, `btn-outline-brand` → `btn-outline-primary`
- Removed all `.dark .card-warm`, `.dark .card-photo`, etc. dark overrides (new semantic tokens handle both modes)
- Updated `hot-pulse::before` gradient to red/violet

**layout.tsx** — Font loading:
- Replaced `Geist` import with `Inter` variable font (`--font-inter`, display swap)
- Updated body className to use `inter.variable`
- Changed `defaultTheme` from `"system"` to `"dark"`

**Old class cleanup across codebase:**
- `property-card.tsx`: `card-warm` → `card-elevated`, `brand-500` → `violet-500`/`primary`, `dark-*` → semantic tokens, `badge-tag` inlined for New badge, `warm-200` → `muted`, `font-heading` inline style removed
- `stats-bar.tsx`: `card-warm` → `card-elevated`, `font-display` style removed, `dark-*` → semantic tokens, `brand-500` → `orange-500` (appropriate for hot leads icon)
- `(dashboard)/page.tsx`: `dark-950` overlay → `zinc-950`, `brand-500` icon → `violet-600`, `card-warm` → `card-elevated`, `warm-200`/`dark-*` → semantic tokens, `font-heading` style removed
- `pipeline/page.tsx`: same hero pattern, `btn-brand` → `btn-primary`, empty state uses semantic tokens
- `settings/page.tsx`: same hero pattern with violet icon

### Task 2: Navigation Shell and Login Page

**app-sidebar.tsx:**
- Logo icon: `bg-brand-500` → `bg-primary` (violet)
- Brand name: Bebas Neue `style={{ fontFamily }}` → `font-bold tracking-wide` Inter
- Brand name casing: `HOUSEFINDER` → `HouseFinder` (more refined)
- Added `border-r border-sidebar-border` to Sidebar component

**bottom-nav.tsx:**
- `border-warm-200/60 dark:border-dark-700/60` → `border-border`
- `bg-white/90 dark:bg-dark-950/90` → `bg-background/90`
- Active: `text-brand-500` → `text-primary`
- Inactive: `text-dark-400 hover:text-dark-600 dark:hover:text-dark-200` → `text-muted-foreground hover:text-foreground`
- Added active indicator dot: `<span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />`

**dashboard/layout.tsx:**
- `bg-warm-50 dark:bg-dark-950` → `bg-background`

**login/page.tsx — Full premium redesign:**
- Left panel: replaced external Unsplash photo with CSS gradient (`from-violet-950/40 via-zinc-950 to-zinc-900`) + subtle grid pattern overlay
- Hero text: `text-5xl font-bold` Inter, violet-400 accent color
- Right panel: `bg-[#09090b]` full-page dark background
- Login card: `rounded-2xl border border-zinc-800 bg-zinc-900` with 4px violet gradient accent bar at top
- Form inputs: `bg-zinc-800 border-zinc-700 text-white` with violet focus ring
- Submit button: `bg-primary hover:bg-primary/90` (violet)
- No more Unsplash network request on any device

## Verification

- `grep -rn "brand-500|warm-50|warm-200|dark-950|dark-700" app/src/` — zero matches
- `grep -n "Inter" app/src/app/layout.tsx` — confirmed line 2 and 7
- `grep -n "8b5cf6|7c3aed" app/src/app/globals.css` — confirmed violet primary in both modes
- `npx next build` — succeeded with zero errors, all 14 routes compiled

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Completeness] Updated additional files outside plan's explicit list**
- **Found during:** Task 1 — grep showed old class names in page.tsx/pipeline/settings/property-card/stats-bar
- **Issue:** Plan said to update `files_modified` list but the plan explicitly instructs: "grep the entire codebase... and update every file that uses old class names"
- **Fix:** Updated all 5 additional files (property-card.tsx, stats-bar.tsx, dashboard/page.tsx, pipeline/page.tsx, settings/page.tsx) as directed
- **Files modified:** Listed above in Task 1 section
- **Commits:** 60ec613, 03f792e

**2. [Rule 1 - Quality] Login hero replaced with CSS gradient instead of keeping Unsplash photo**
- **Found during:** Task 2 — plan said "Replace the entire page design with a premium dark aesthetic"
- **Issue:** The research explicitly called out the Unsplash hero as a problem (loads 1200px image on mobile unnecessarily)
- **Fix:** CSS gradient hero (violet/zinc + subtle grid overlay) — no network request, no external dependency, looks more premium
- **Files modified:** `app/src/app/login/page.tsx`

## Self-Check: PASSED

All files exist. Both task commits verified (60ec613, 03f792e). Violet primary confirmed in globals.css. Inter font confirmed in layout.tsx.
