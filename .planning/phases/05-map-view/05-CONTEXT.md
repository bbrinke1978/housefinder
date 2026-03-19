# Phase 5: Map View - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive geographic map for browsing all distressed properties across target Utah counties. Users can view properties as scored pins, filter by distress type/city/hot lead status, tap pins for summary info, and navigate to detail pages. Creating/editing properties and analytics are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Map provider & style
- Mapbox GL JS as the mapping library
- Satellite hybrid as the default map style (satellite imagery + road/label overlay)
- Map theme matches the app's dark/light mode (dark satellite in dark mode, standard in light)
- Default view fits all properties on initial load (auto-zoom to show full extent)

### Pin design & clustering
- Heat gradient color coding: green -> yellow -> orange -> red based on distress score
- Hot lead pins are larger with a flame/star icon (accessibility beyond color alone)
- Nearby pins cluster when zoomed out — cluster circle shows count, colored by hottest pin inside
- Subtle dashed county boundary lines with labels as overlay

### Property card interaction
- Compact summary card: address, distress score badge, top distress signals (e.g. "NOD, Tax Lien"), lead status, "View Details" link
- Bottom sheet on mobile (slides up from bottom, swipe down to dismiss)
- Dismiss-and-tap navigation between pins (no swipe-between)
- "View Details" navigates to existing property detail page; back button returns to map at same position/zoom

### Filter & search UX
- Floating toolbar at top of map with filter chips (County, Distress Type, Hot Leads)
- Filters update pins instantly (real-time as chips are toggled)
- Address search bar with Mapbox geocoding to fly to a location
- Filtered-out pins disappear completely (hidden, not grayed out)

### Claude's Discretion
- Exact pin icon design and sizing
- Loading states and skeleton patterns for map
- Cluster expand animation behavior
- Search bar placement relative to filter toolbar
- Error states (geocoding failures, map load failures)
- Map control button placement (zoom +/-, compass)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. All decisions above follow modern mobile map conventions (Google Maps-style bottom sheet, Mapbox standard patterns).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-map-view*
*Context gathered: 2026-03-18*
