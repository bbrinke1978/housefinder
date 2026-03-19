# Phase 5: Map View — Research

**Researched:** 2026-03-18
**Status:** Complete
**Confidence:** HIGH

## Phase Boundary

Build an interactive Mapbox GL JS map view showing all distressed properties as colored pins with clustering, filtering by distress type/city/hot lead status, mobile-friendly gestures, and tap-to-view property summary cards.

**Requirements:** MAP-01, MAP-02, MAP-03, MAP-04

## Stack & Library Decisions

### Mapbox GL JS (CONTEXT decision — locked)
- **Library:** `mapbox-gl` npm package (v3.x)
- **React wrapper:** `react-map-gl` v7 by Visgl — provides React components for Mapbox GL JS, handles lifecycle/state. Well-maintained, SSR-safe with dynamic import.
- **Geocoding:** `@mapbox/mapbox-gl-geocoder` for address search (CONTEXT specifies Mapbox geocoding)
- **Confidence:** HIGH — react-map-gl is the standard React integration for Mapbox GL JS

### SSR Considerations (MAP-04 critical)
- Mapbox GL JS requires `window` and WebGL — cannot render during SSR
- **Solution:** Use Next.js `dynamic()` with `{ ssr: false }` for the map component
- The map page should be a client component or wrap the map in a dynamically imported client component
- This prevents blank screen / crash during SSR (success criterion #4)
- **Confidence:** HIGH — standard Next.js pattern

### CSS Import
- Mapbox GL JS requires `mapbox-gl/dist/mapbox-gl.css` imported in the map component
- With Tailwind v4, this should be imported in the component file or via a `<link>` tag, not in globals.css
- **Confidence:** HIGH

## Architecture

### Data Flow
1. **Server component** (`/map/page.tsx`) fetches all properties with leads from the database (reuse `getProperties` pattern from queries.ts but return ALL properties without limit for map display, plus include lat/lng)
2. **GeoJSON conversion:** Transform property data to GeoJSON FeatureCollection on the server, pass as props to client map component
3. **Client map component** receives GeoJSON and renders with Mapbox GL JS
4. **Filters** are client-side — toggle feature visibility via Mapbox expressions (no server roundtrip)

### Geocoding Gap: No lat/lng in database
- The `properties` table has address, city, state, zip but **no latitude/longitude columns**
- **Solution:** Add `latitude` and `longitude` (numeric/double precision) columns to the properties table
- Batch geocode existing properties using Mapbox Geocoding API on deployment
- New properties get geocoded during scraper upsert (future enhancement, not Phase 5 — use batch for now)
- **Migration needed:** Add columns + create a one-time geocoding script
- **Confidence:** HIGH — this is a required prerequisite

### Pin Visualization (CONTEXT decisions — locked)
- **Color gradient:** green (low score) -> yellow -> orange -> red (high score) using Mapbox data-driven styling with `["interpolate", ["linear"], ["get", "distressScore"], 0, "#22c55e", 3, "#eab308", 5, "#f97316", 7, "#ef4444"]`
- **Hot lead pins:** Larger radius + flame/star icon via Mapbox symbol layer
- **Clustering:** Use Mapbox GL JS built-in clustering (`cluster: true` on GeoJSON source). Cluster circles colored by max score inside cluster using `clusterProperties` aggregation
- **County boundaries:** Dashed line overlay — can use a static GeoJSON of Utah county boundaries

### Filtering (MAP-02)
- **Client-side filtering** via Mapbox GL JS filter expressions
- Filter chips at top of map: County (reuse existing city list), Distress Type, Hot Leads toggle
- When filters change, update the map layer filter expression — pins appear/disappear instantly
- No server roundtrip needed since all data is loaded as GeoJSON
- **Confidence:** HIGH

### Property Summary Card (MAP-03)
- **Desktop:** Popup on pin click (Mapbox GL Popup)
- **Mobile:** Bottom sheet (CONTEXT decision — locked). Use a custom bottom sheet component (div fixed at bottom, touch-drag to dismiss)
- Card content: address, distress score badge, top distress signals, lead status, "View Details" link
- "View Details" navigates to `/properties/[id]` — existing page
- **Back button behavior:** Use `router.back()` — browser handles returning to map at same position since map state is client-side
- **Confidence:** HIGH

### Mobile Gestures (MAP-04)
- Mapbox GL JS handles pinch-to-zoom and pan natively on touch devices
- Ensure `touchZoomRotate` and `dragPan` are enabled (default)
- Test that the bottom sheet doesn't interfere with map touch events
- **Confidence:** HIGH — native Mapbox behavior

## Navigation Integration

- Add "Map" link to sidebar (`app-sidebar.tsx`) and bottom nav (`bottom-nav.tsx`)
- Use `MapPin` icon from lucide-react (already imported in property-card.tsx)
- Route: `/map` — new page under `(dashboard)` layout
- **Confidence:** HIGH

## Environment Configuration

- Mapbox requires an access token: `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Token must be public (client-side rendering) — use `NEXT_PUBLIC_` prefix
- Free tier: 50,000 map loads/month, 100,000 geocoding requests/month — sufficient for this use case
- **Confidence:** HIGH

## File Plan

### New Files
- `app/src/app/(dashboard)/map/page.tsx` — Server component, fetches properties, renders map wrapper
- `app/src/components/map/property-map.tsx` — Client component, Mapbox GL JS map with all interactive features
- `app/src/components/map/map-filters.tsx` — Filter chips floating above map
- `app/src/components/map/property-bottom-sheet.tsx` — Mobile bottom sheet for property summary
- `app/src/components/map/map-pin-popup.tsx` — Desktop popup for property summary
- `app/src/lib/map-utils.ts` — GeoJSON conversion, color interpolation helpers

### Modified Files
- `app/src/db/schema.ts` — Add latitude/longitude to properties table
- `app/src/lib/queries.ts` — Add getMapProperties() that returns all properties with lat/lng (no limit)
- `app/src/types/index.ts` — Add MapProperty type with lat/lng
- `app/src/components/app-sidebar.tsx` — Add Map nav item
- `app/src/components/bottom-nav.tsx` — Add Map nav item
- `app/package.json` — Add mapbox-gl, react-map-gl, @mapbox/mapbox-gl-geocoder dependencies
- `app/drizzle/` — New migration for lat/lng columns

### Migration & Seed
- Drizzle migration to add `latitude DOUBLE PRECISION` and `longitude DOUBLE PRECISION` to properties
- One-time geocoding script: read all properties without lat/lng, batch geocode via Mapbox, update DB

## Pitfalls & Mitigations

| Pitfall | Mitigation |
|---------|------------|
| SSR crash with Mapbox GL JS | `dynamic(() => import(...), { ssr: false })` |
| Missing lat/lng for existing properties | Migration + batch geocoding script |
| Mapbox token exposed in client bundle | Use `NEXT_PUBLIC_` prefix (intentional — map tokens are meant to be public, restrict by domain in Mapbox dashboard) |
| Large number of pins on initial load | Clustering enabled by default, reduces visual clutter |
| Bottom sheet blocking map touch events | Use `touch-action: none` on sheet handle, pass through events on map area |
| Filter state lost on navigation | Filters are URL search params (same pattern as dashboard) |
| Geocoding rate limits during batch | Add delay between batches (50 at a time with 1s delay) |

## Validation Approach

1. **TypeScript compilation:** `cd app && npx tsc --noEmit`
2. **Build check:** `cd app && npm run build`
3. **Visual verification:** Map renders, pins appear, filters work, bottom sheet shows on tap
4. **SSR safety:** No blank screen on initial server render
5. **Mobile:** Touch gestures work (pinch-to-zoom, pan, bottom sheet swipe)

---

## RESEARCH COMPLETE

*Phase: 05-map-view*
*Researched: 2026-03-18*
