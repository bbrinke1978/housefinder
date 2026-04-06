# Phase 15: Blueprints & Floor Plans - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Upload, sketch, view, and annotate property floor plans within HouseFinder. Floor plans attach to deals or properties, support multiple floors and versions (as-is/proposed), include pin-based annotations linked to rehab budget categories, and provide room measurements that feed into deal metrics. Includes a shareable link for contractors (view-only) and a dedicated Floor Plans tab on deal detail.

</domain>

<decisions>
## Implementation Decisions

### Source & Capture
- Two sources: upload existing files (PDF + images) AND sketch new floor plans in-app
- Sketch tool: CAD-lite preferred (walls, doors, windows, dimensions) — research must evaluate open-source/affordable options. Fallback to simple room rectangles if no viable CAD-lite option exists
- Supported upload formats: PDF and images (JPG/PNG) — no DWG/DXF
- Multiple floors per property: each floor plan has a floor label (Main, Upper, Basement, Garage) with floor selector in the UI

### Viewing & Annotation
- Pan/zoom viewer for uploaded plans (pinch-to-zoom mobile, scroll zoom desktop)
- Pin-based annotations with text notes (drop colored pins on the floor plan)
- Pin categories mapped to work types with auto-assigned colors (plumbing, electrical, structural, cosmetic, etc.)
- Annotation categories link to the deal's 19 rehab budget categories — clicking a pin can navigate to that budget line item
- Creates a spatial view of the rehab budget on the floor plan

### Deal Integration
- Dedicated Floor Plans tab on deal detail (new tab alongside Photos, Financials, etc.)
- Floor plans attachable to properties OR deals — same pattern as photos, carry over on Start Deal
- Versioned plans: label as "As-Is" or "Proposed" — compare layouts, track how rehab changes the plan
- Shareable time-limited public link for contractors (same token pattern as signing links) — view-only, no contractor annotations in v1

### Rehab Planning Use
- Sketched floor plans store room dimensions (L x W) — auto-calculate square footage per room and total
- Total square footage feeds into deal metrics: auto-populate deal sq ft field, calculate price/sqft and rehab cost/sqft
- Proposed version supports wall change visualization (mark walls as "remove" = dashed/red, "add" = green) if the sketch tool supports it
- Contractors view annotations in read-only mode via shared link

### Claude's Discretion
- Sketch tool library selection (research-dependent — CAD-lite vs simple rectangles)
- Pan/zoom viewer library choice
- Pin color palette for work categories
- Floor plan file size limits and compression
- Blob storage structure for floor plan files
- Shareable link expiration duration

</decisions>

<specifics>
## Specific Ideas

- Brian wants thorough research on CAD-lite sketch tools — this is the most uncertain area. Evaluate open-source options, cost, embeddability in Next.js, mobile support. If too expensive or complex, fall back to simple room rectangles
- Pin annotations linking to rehab budget categories creates a spatial rehab planning experience — pins on the floor plan = budget line items. This is the key differentiator
- Wall change visualization (remove=red dashed, add=green) on proposed versions gives a visual rehab scope
- Square footage auto-calculation feeding deal metrics closes the loop between floor plans and financial analysis
- Shareable contractor links follow the same pattern as contract signing links (token-gated, time-limited, public route outside auth)

</specifics>

<deferred>
## Deferred Ideas

- Contractor annotations on shared floor plans — future enhancement (v1 is view-only)
- AutoCAD DWG/DXF file support — future if demand exists
- AI-based room detection from uploaded floor plan images — future enhancement
- 3D visualization of floor plans — out of scope

</deferred>

---

*Phase: 15-blueprints-floor-plans*
*Context gathered: 2026-04-05*
