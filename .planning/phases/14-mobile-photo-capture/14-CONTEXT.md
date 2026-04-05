# Phase 14: Mobile Photo Capture - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Capture property photos from a mobile device and attach them to deals/properties in HouseFinder. Photos are stored in Azure Blob Storage, organized by category, and surfaced in deal detail galleries, deal card thumbnails, and buyer deal blasts. Includes a Photo Inbox for unassigned captures and a floating quick-capture button for field work.

</domain>

<decisions>
## Implementation Decisions

### Capture Experience
- Native camera + file picker (not in-browser viewfinder) — tap button, phone camera opens, take photo, auto-uploads
- Multi-photo batch upload — select/capture multiple photos, upload all at once with progress indicator
- Auto-compress before upload — resize to ~1600px wide, ~80% JPEG quality (~200-400KB each) to save mobile data
- Photos only — no video capture (future phase if needed)

### Photo Organization
- Categorized by area with predefined tags: Exterior, Kitchen, Bathroom, Living, Bedroom, Garage, Roof, Foundation, Yard, Other
- Tag during upload — after selecting photos, pick the area category before upload starts
- Cover photo — first photo tagged "Exterior" auto-selected as cover. User can change it. Shows in deal cards and blasts
- Optional caption per photo — text field for notes like "water damage in corner", "foundation crack"

### Deal/Property Attachment Flow
- Two paths: deal-first (navigate to deal detail, tap Add Photos) AND capture-first (floating action button, photos go to Photo Inbox)
- Photo Inbox — unassigned captures live in a reviewable inbox accessible from sidebar. Assign to deals at your desk later
- Photos attachable to properties OR deals — for driving-for-dollars, snap photos of a distressed property before a deal exists. Photos carry over when a deal is created from that property
- Floating action button (FAB) on mobile views — tap to open camera, photos go to inbox. Fast for field work

### Photo Usage Downstream
- Deal detail photo gallery — grid view grouped by category with lightbox (click for full-size, swipe navigation, caption overlay)
- Deal cards in list views — cover photo thumbnail on deal cards in deals list and dashboard
- Deal blasts to buyers — cover photo + up to 4 user-selected photos included in marketing emails
- Manual hard-delete — photos persist with the deal permanently. User can manually delete when cleaning up (e.g., dead deal)

### Claude's Discretion
- Lightbox library choice
- Upload progress UI pattern
- Photo grid responsive breakpoints
- Blob storage folder structure and naming convention
- Photo Inbox UI design
- FAB positioning and mobile viewport handling

</decisions>

<specifics>
## Specific Ideas

- Driving for dollars use case is important — Brian frequently photographs distressed properties before creating deals, so property-level photo attachment is essential
- Cover photo should auto-populate from the first Exterior photo to minimize manual setup
- Photo Inbox concept allows field capture without stopping to organize — review later at desk
- Deal blast photos limited to cover + 4 to keep buyer communications focused

</specifics>

<deferred>
## Deferred Ideas

- Video capture/walkthrough clips — separate phase
- AI-based photo tagging (auto-detect room type) — future enhancement
- Before/after comparison views for rehab tracking — could be part of a rehab documentation phase

</deferred>

---

*Phase: 14-mobile-photo-capture*
*Context gathered: 2026-04-05*
