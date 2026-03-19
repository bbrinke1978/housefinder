# Plan 05-01 Summary: Data Layer for Map View

**Status:** Complete
**Duration:** ~3min
**Tasks:** 2/2

## What was built
- Added `latitude` (doublePrecision) and `longitude` (doublePrecision) nullable columns to properties table
- Generated Drizzle migration `0001_thick_puppet_master.sql`
- Created `MapProperty` type extending PropertyWithLead with coordinates and signalTypes
- Created `getMapProperties()` query returning all geocoded properties with aggregated active distress signals
- Created `getDistinctCounties()` query for map filter dropdown
- Created `map-utils.ts` with `toGeoJSON()`, `scoreToColor()`, and `signalLabel()` helpers
- Installed mapbox-gl, react-map-gl, @mapbox/mapbox-gl-geocoder, and type definitions

## Key files

### Created
- `app/src/lib/map-utils.ts` — GeoJSON conversion, color helpers, signal label mapping
- `app/drizzle/0001_thick_puppet_master.sql` — Migration adding lat/lng columns

### Modified
- `app/src/db/schema.ts` — Added latitude, longitude columns to properties table
- `app/src/types/index.ts` — Added MapProperty interface
- `app/src/lib/queries.ts` — Added getMapProperties(), getDistinctCounties()
- `app/package.json` — Added mapbox-gl, react-map-gl, geocoder dependencies

## Deviations
None

## Self-Check: PASSED
- [x] TypeScript compiles cleanly
- [x] All exports present
- [x] Migration generated
