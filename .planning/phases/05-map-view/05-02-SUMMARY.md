# Plan 05-02 Summary: Interactive Map UI

**Status:** Complete
**Duration:** ~5min
**Tasks:** 2/2

## What was built
- Map page at `/map` route under dashboard layout (server component)
- `MapWrapper` client component with `dynamic({ ssr: false })` for SSR safety
- `PropertyMap` — full Mapbox GL JS map with satellite-streets style
- Score-colored pins via data-driven styling (green->yellow->orange->red gradient)
- Hot lead pins: larger (radius 12) with gold stroke for visual distinction
- Clustering with count labels colored by hottest pin's score
- `MapFilters` — floating filter chips for county, distress type, hot leads toggle
- Client-side filtering updates pins instantly via GeoJSON feature filtering
- `PropertyBottomSheet` — mobile bottom sheet with swipe-to-dismiss
- `PropertyCardContent` — shared card with score badge, signal tags, "View Details" link
- Desktop `Popup` on pin click with same card content
- Map auto-fits bounds to all properties on initial load
- Map link added to sidebar and mobile bottom nav (MapPin icon)
- Updated next.config.ts with transpilePackages for mapbox-gl

## Key files

### Created
- `app/src/app/(dashboard)/map/page.tsx` — Server page fetching map data
- `app/src/components/map/map-wrapper.tsx` — Client wrapper with dynamic import
- `app/src/components/map/property-map.tsx` — Mapbox GL JS map component
- `app/src/components/map/map-filters.tsx` — Floating filter chips
- `app/src/components/map/property-bottom-sheet.tsx` — Bottom sheet + card content

### Modified
- `app/src/components/app-sidebar.tsx` — Added Map nav item
- `app/src/components/bottom-nav.tsx` — Added Map nav item
- `app/next.config.ts` — Added transpilePackages

## Deviations
- Used `react-map-gl/mapbox` import path instead of `react-map-gl` (v8 requires subpath export)
- Created MapWrapper client component to work around Next.js 15 restriction on `dynamic({ ssr: false })` in server components

## Self-Check: PASSED
- [x] TypeScript compiles cleanly
- [x] Next.js build succeeds
- [x] Map route present in build output
- [x] SSR-safe (no window/WebGL references in server components)
