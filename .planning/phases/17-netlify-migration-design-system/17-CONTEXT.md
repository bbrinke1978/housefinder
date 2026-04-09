# Phase 17: Netlify Migration & No BS Homes Design System - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate HouseFinder frontend from Azure App Service to Netlify, apply the No BS Homes brand design system across all pages, enable Azure PgBouncer for serverless connection pooling, and verify all features end-to-end on the new platform. Every page gets the new design — no half-styled app.

</domain>

<decisions>
## Implementation Decisions

### Brand Identity Translation
- Same font family as nobshomes: Playfair Display for headings, Source Sans 3 for body text
- Same color palette adapted for dashboard density: brand blue (#1e4d8c) + sand accent (#c4884f) + cream backgrounds (#fdfbf7)
- Adapted for dashboard use — tighter spacing, smaller cards, data-friendly layouts (not a marketing site clone)
- Light mode as default, dark mode available via toggle
- Subtle grain/noise texture overlay (0.015 opacity) on all background surfaces for warmth
- Sand gradient buttons for primary actions, blue for CTAs/links/navigation
- White cards with subtle warm shadows and rounded corners (rounded-2xl)

### Mobile-First Layout
- Dashboard shows compact stat row at top, then scrollable hot leads list sorted by score
- Property/deal cards at medium density: address + score + status + signals + owner name
- 44px minimum touch targets throughout
- Swipe actions on lead/deal cards (swipe left to change status, swipe right to call)
- Mobile navigation pattern: Claude's discretion — pick what works best for the app

### Page-by-Page Design Scope
- ALL pages restyled in one phase — no mixed old/new styling
- Login page: clean minimal — cream background, centered card, logo, no imagery
- Map page: switch from satellite to light/warm Mapbox style matching the cream/sand palette
- Data tables: Claude's discretion per page — pick card-style or traditional table based on data type

### Deployment & Infrastructure
- Netlify: git push auto-deploy from master (same pattern as nobshomes)
- Remove `output: standalone` from next.config.ts, use default Next.js output for Netlify
- Add netlify.toml with Node 20, build command, publish directory
- Azure PgBouncer: enable on Flexible Server via Azure Portal, update DATABASE_URL to use port 6432
- Serverless function timeout: 26s (Netlify max on free tier) for all functions
- Keep Azure App Service running as fallback for ~1 week after successful migration, then delete
- All environment variables migrated to Netlify dashboard
- GitHub Actions deploy-app.yml updated or replaced with Netlify auto-deploy

### Claude's Discretion
- Mobile navigation pattern (bottom tabs, hamburger, drawer — whatever works best)
- Data table styling per page (card-based vs traditional table)
- Loading skeletons and empty states
- Exact spacing and typography scale
- Dark mode color adaptations of the warm palette
- Error state styling

</decisions>

<specifics>
## Specific Ideas

- "I want it to look like nobshomes" — the No BS Homes marketing site at nobshomes.netlify.app is the design reference
- nobshomes uses Playfair Display (serif) for display headings + Source Sans 3 (sans-serif) for body
- nobshomes color palette: brand blues (#eef3fb to #060f1c, core #1e4d8c), sand tones (#fdf9f3 to #2e1f0f, core #c4884f), warm base (#fdfbf7), cream (#faf5ec)
- nobshomes has subtle noise grain overlay at 0.015 opacity for warmth
- nobshomes uses staggered fade-in animations, trust-glow card effects, rounded-2xl cards
- The nobshomes project is at C:\Users\brian.BRIANRIPPER\OneDrive\Documents\nobshomes — researcher should read its globals.css and tailwind config for exact values
- Brian already runs nobshomes on Netlify — same deployment pattern desired for HouseFinder
- Current HouseFinder uses @base-ui/react (not Radix) for UI primitives — keep this, just restyle

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-netlify-migration-design-system*
*Context gathered: 2026-04-08*
