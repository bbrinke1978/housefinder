---
phase: 17-netlify-migration-design-system
plan: 02
subsystem: ui
tags: [design-system, fonts, css-tokens, tailwind, next-font, warm-palette, brand]

# Dependency graph
requires:
  - phase: 17-01
    provides: Netlify config and next.config.ts changes (output mode)
provides:
  - Playfair Display + Source Sans 3 via next/font/google with CSS variables
  - Warm brand palette CSS tokens (brand blue, sand accent, cream) in globals.css
  - Noise grain overlay on all background surfaces
  - Light mode as default theme
  - Dark mode warm navy palette replacing zinc/violet
  - Brand color utilities (--color-brand-*, --color-sand-*)
affects:
  - 17-03 (component restyling — inherits tokens from this plan)
  - 17-04 (page restyling — inherits tokens)
  - All downstream pages (inherit via CSS cascade)

# Tech tracking
tech-stack:
  added: [Playfair_Display (next/font/google), Source_Sans_3 (next/font/google)]
  patterns:
    - CSS custom properties as design tokens (--primary, --background, --border etc.)
    - Brand scale utilities in @theme inline for direct Tailwind class use
    - Noise grain via inline SVG data URI on body::before

key-files:
  created: []
  modified:
    - app/src/app/layout.tsx
    - app/src/app/globals.css

key-decisions:
  - "Playfair_Display weights 400/600/700/800/900 loaded; Source_Sans_3 weights 300/400/600/700 — covers all display and body use cases"
  - "ThemeProvider defaultTheme changed from dark to light — warm cream palette reads poorly in forced dark mode"
  - "--font-display CSS var name matches @theme inline key name — Tailwind v4 handles same-name correctly"
  - "Grain overlay uses inline SVG data URI (not external image) — no network request, works on Netlify with strict CSP"
  - "hot-pulse gradient updated from violet to sand (#c4884f) — removes last violet reference from component classes"
  - "card-elevated and card-surface use rounded-2xl — matches nobshomes card style per CONTEXT.md"

patterns-established:
  - "Brand tokens: all component colors reference --primary, --border, etc. — no hardcoded hex in semantic classes"
  - "Sand gradient for primary actions, brand blue for CTAs/navigation/links"

requirements-completed: [DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04, DESIGN-05]

# Metrics
duration: 2min
completed: 2026-04-09
---

# Phase 17 Plan 02: Design System Foundation Summary

**Playfair Display + Source Sans 3 loaded via next/font/google; warm brand palette (blue #1e4d8c + sand #c4884f + cream #fdfbf7) replaces zinc/violet across all CSS tokens with noise grain overlay and light mode default**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-09T03:15:16Z
- **Completed:** 2026-04-09T03:17:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced Inter/Geist_Mono with Playfair Display (display headings) and Source Sans 3 (body text) using CSS variables --font-display and --font-body
- Replaced entire zinc/violet CSS token set with No BS Homes warm palette — brand blue, sand accent, cream backgrounds in light and warm navy in dark mode
- Added noise grain overlay matching nobshomes (SVG data URI, 0.015 opacity, fixed position, pointer-events none)
- Changed ThemeProvider from dark to light default
- Updated component classes: sand gradient on btn-primary, brand blue on btn-dark, rounded-2xl on cards
- Added brand color utilities in @theme inline for direct Tailwind class use

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace fonts in layout.tsx** - `f222972` (feat)
2. **Task 2: Replace globals.css with warm brand tokens** - `83b8525` (feat)

## Files Created/Modified
- `app/src/app/layout.tsx` - Playfair Display + Source Sans 3 fonts, --font-display/--font-body variables, defaultTheme="light"
- `app/src/app/globals.css` - Complete rewrite: warm palette tokens, grain overlay, updated component classes, brand utilities

## Decisions Made
- ThemeProvider defaultTheme changed from dark to light — warm cream palette reads poorly as a forced dark theme default
- Grain overlay uses inline SVG data URI instead of external PNG — zero network request, works on Netlify, no CSP issues
- card-elevated and card-surface upgraded from rounded-xl to rounded-2xl per CONTEXT.md design spec
- hot-pulse gradient updated from violet to sand to eliminate all remaining violet color references

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - build passed cleanly on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Design system foundation complete — all downstream components inherit warm brand tokens via CSS cascade
- Phase 17-03 (component restyling) can proceed immediately — all CSS custom properties in place
- Light mode now default; dark mode toggle switches to warm navy palette
- Next.js build verified passing with new fonts and CSS

---
*Phase: 17-netlify-migration-design-system*
*Completed: 2026-04-09*
