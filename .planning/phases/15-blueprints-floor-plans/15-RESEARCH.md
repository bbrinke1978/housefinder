# Phase 15: Blueprints & Floor Plans - Research

**Researched:** 2026-04-05
**Domain:** Floor plan upload/sketch/view/annotate — React canvas, PDF viewer, pin annotations, Azure Blob storage
**Confidence:** MEDIUM (sketch tool options verified; pan/zoom and annotation patterns HIGH; CAD-lite libraries are ecosystem landscape MEDIUM)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Two sources: upload existing files (PDF + images) AND sketch new floor plans in-app
- Sketch tool: CAD-lite preferred (walls, doors, windows, dimensions) — research must evaluate open-source/affordable options. Fallback to simple room rectangles if no viable CAD-lite option exists
- Supported upload formats: PDF and images (JPG/PNG) — no DWG/DXF
- Multiple floors per property: each floor plan has a floor label (Main, Upper, Basement, Garage) with floor selector in the UI
- Pan/zoom viewer for uploaded plans (pinch-to-zoom mobile, scroll zoom desktop)
- Pin-based annotations with text notes (drop colored pins on the floor plan)
- Pin categories mapped to work types with auto-assigned colors (plumbing, electrical, structural, cosmetic, etc.)
- Annotation categories link to the deal's 19 rehab budget categories — clicking a pin can navigate to that budget line item
- Dedicated Floor Plans tab on deal detail (new tab alongside Photos, Financials, etc.)
- Floor plans attachable to properties OR deals — same pattern as photos, carry over on Start Deal
- Versioned plans: label as "As-Is" or "Proposed" — compare layouts, track how rehab changes the plan
- Shareable time-limited public link for contractors (same token pattern as signing links) — view-only, no contractor annotations in v1
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

### Deferred Ideas (OUT OF SCOPE)
- Contractor annotations on shared floor plans — future enhancement (v1 is view-only)
- AutoCAD DWG/DXF file support — future if demand exists
- AI-based room detection from uploaded floor plan images — future enhancement
- 3D visualization of floor plans — out of scope
</user_constraints>

---

## Summary

Phase 15 is the most technically complex phase in the HouseFinder roadmap due to the dual nature of the problem: a floor plan *viewer* (for uploaded PDFs/images with pan/zoom and pin overlays) and a floor plan *sketcher* (for drawing rooms/walls in-app). These are distinct technical problems that can be solved with different libraries, and it is important not to conflate them.

**The critical research finding on CAD-lite sketch tools:** Every mature open-source CAD-like floor plan editor (react-planner, arcada, FloorspaceJS) is either abandoned, not designed for embedding as a component, or requires a full standalone app. There is no drop-in, maintained, npm-installable CAD-lite component for React 19 / Next.js 15. Commercial options (Smplrspace/Floorplan.js) are enterprise-priced with no public free tier. The honest recommendation is to use the **fallback: a simple room-rectangle sketch tool built on react-konva** — this is not a compromise, it is the right decision. React-konva 19.2.3 explicitly supports React 19 and is actively maintained. A room-rectangle sketch mode (draw a box, name it, set L x W) is straightforward to build, fully meets the rehab planning use case, and is far more reliable than embedding an abandoned CAD tool.

**For the viewer** (uploaded PDFs/images): Use `react-pdf` (wojtekmaj) + `react-zoom-pan-pinch` for PDF rendering and pan/zoom, with pin annotations stored as percentage-based coordinates overlaid as absolutely-positioned DOM elements on top of the viewer. This pattern avoids canvas coordinate hell and works cleanly with the existing photo/blob storage pattern.

**Primary recommendation:** Build a custom rectangle-room sketch tool with react-konva 19.2.3 for the sketch path; use react-pdf + react-zoom-pan-pinch for the upload-and-view path; store pin annotations as (x%, y%) coordinates in PostgreSQL; follow the existing Azure Blob + SAS URL + token-gated shareable link patterns already established in Phases 13-14.

---

## CAD-Lite Sketch Tool: Deep Evaluation

This is the most critical research area per user's request. Every option was evaluated.

### Option A: react-planner (cvdlab)
- **GitHub:** https://github.com/cvdlab/react-planner — 1.4k stars, last commit December 2022
- **npm version:** 2.0.6, published 6 years ago
- **Features:** 2D floor plan with 3D mode, embeddable React component, Redux-based
- **React compatibility:** React 16 era — NOT compatible with React 19 without significant patching
- **Verdict: REJECTED.** Abandoned. React 16 peer dep. Cannot be used with this project's React 19 + Next.js 15.

### Option B: arcada (mehanix)
- **GitHub:** https://github.com/mehanix/arcada — Apache 2.0
- **Features:** Walls, furniture, doors, windows, dimensions, multi-floor, print. Full-featured.
- **Stack:** React + Pixi.js + Zustand + Mantine + Express.js backend (MongoDB)
- **Problem:** Standalone app, NOT a component library. Has its own server. Cannot be embedded.
- **Last meaningful commit:** February 2022
- **Verdict: REJECTED.** Not embeddable. Requires own backend. Unmaintained.

### Option C: Smplrspace / floorplan.js
- **Website:** https://www.smplrspace.com
- **Nature:** Full-stack platform SaaS for 2D/3D floor plans. Started as open-source floorplan.js experiment.
- **Pricing:** Enterprise-only, no public pricing, no free tier found. "Contact sales."
- **Verdict: REJECTED.** Enterprise SaaS, no free tier, not self-hosted.

### Option D: FloorspaceJS (NREL)
- **Website:** https://nrel.github.io/floorspace.js
- **Purpose:** Building energy modeling geometry editor (not real estate floor planning)
- **Problem:** Specialized for energy analysis, polygon/space drawing only. No rooms/labels/dimensions in the real estate sense.
- **Verdict: REJECTED.** Wrong domain. UI focused on geometry, not room planning.

### Option E: Syncfusion Diagram Component
- **Nature:** Commercial React diagram library with floor planner showcase
- **Cost:** Community license free for low revenue, paid tiers otherwise
- **Problem:** Heavyweight commercial component. Licensing complexity for a single-user app.
- **Verdict: NOT RECOMMENDED.** Unnecessary complexity and licensing overhead.

### Option F: react-konva (RECOMMENDED — Custom Build)
- **npm:** react-konva 19.2.3, konva 9.x
- **React 19:** Confirmed — peerDependencies specify `"react": "^19.2.0"`
- **Actively maintained:** Last published ~1 month ago (March 2026)
- **Weekly downloads:** Very high — industry standard for React canvas
- **Features available:** Stage, Layer, Rect, Text, Line, Circle, Arrow, Transformer, Group
- **Key capabilities for floor plan sketch:**
  - Draggable, resizable rooms via `Transformer` component (handles + boundary constraints)
  - Snap-to-grid via `dragBoundFunc`
  - Pan/zoom of entire Stage via wheel events + stage draggable
  - Multi-touch pinch zoom via Stage with `onTouchMove`
  - Three coordinate spaces clearly documented (screen → stage → world)
  - `Line` with `closed=true` for walls; dashed lines via `dash` prop for "remove wall" visualization
  - Text labels on rooms with computed sq ft
- **What you build:** A room-rectangle sketch mode where users draw/resize named rooms, set L x W, and the tool auto-calculates sq ft. Walls drawn as connected `Line` shapes if desired, or simply room outlines via `Rect`.
- **Implementation complexity:** ~2-3 days for a solid MVP sketch tool covering the requirements
- **Verdict: USE THIS.** The fallback IS the right answer.

### Summary: CAD-Lite vs Rectangle Rooms

The "fallback" to simple room rectangles is not a downgrade for this use case:
- Brian's use case is rehab budgeting, not architectural drawing
- Rectangle rooms + dimensions + labels cover 95% of real-world wholesale deal floor plan needs
- A CAD-lite wall-drawing tool would add weeks of development for marginal gain
- react-konva Transformer gives resize handles that feel professional and responsive

**Decision: Use react-konva for the sketch path. Build room rectangles with labels, dimensions input, snap-to-grid, and pan/zoom.**

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-konva | 19.2.3 | Floor plan sketch canvas (React 19 compatible) | Industry standard React canvas lib, actively maintained |
| konva | 9.x | Core canvas engine underlying react-konva | Peer dep of react-konva |
| react-pdf (wojtekmaj) | 10.4.1 | Render uploaded PDF floor plans to canvas | React wrapper around pdfjs-dist, widely used, Next.js App Router compatible |
| react-zoom-pan-pinch | 3.7.0 | Pan/zoom/pinch for uploaded plan viewer | Drop-in wrapper, mobile pinch-to-zoom, scroll zoom desktop, 3.7.0 Jan 2025 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdfjs-dist | bundled with react-pdf | PDF parsing engine | Peer dep of react-pdf; worker must be configured |
| lucide-react | already installed | Pin icons, floor selector icons, toolbar icons | Already in project |
| @azure/storage-blob | already installed | Upload floor plan files to blob storage | Already used for photos (Phase 14) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-konva custom sketch | react-planner | react-planner is abandoned, React 16 only — not viable |
| react-konva custom sketch | arcada | arcada is standalone app, not embeddable — not viable |
| react-pdf + react-zoom-pan-pinch | pdfjs-dist directly | Lower-level, more work, no benefit |
| react-zoom-pan-pinch | react-svg-pan-zoom | react-svg-pan-zoom is for SVG only, not images/PDFs |
| Percentage-coord pins | Canvas-based pins | DOM pins survive layout changes, easier to style, accessible |

**Installation:**
```bash
npm install react-konva konva react-pdf react-zoom-pan-pinch
```

---

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── components/
│   ├── floor-plan-tab.tsx          # Floor Plans tab on deal detail (client wrapper)
│   ├── floor-plan-viewer.tsx       # Uploaded PDF/image viewer with pan/zoom + pins
│   ├── floor-plan-sketch.tsx       # react-konva sketch canvas for room drawing
│   ├── floor-plan-card.tsx         # Floor selector card (Main/Upper/Basement/Garage)
│   ├── floor-plan-pin.tsx          # Single annotation pin component (DOM overlay)
│   ├── floor-plan-pin-form.tsx     # Drop-pin dialog (category, note, link to budget)
│   └── floor-plan-share-view.tsx   # Public view-only page for contractor link
├── lib/
│   ├── floor-plan-actions.ts       # Server actions: create/update/delete floor plans, pins
│   ├── floor-plan-queries.ts       # DB queries for floor plans, pins, rooms
│   └── floor-plan-share.ts         # Token generation/validation (reuse contract pattern)
├── app/
│   ├── floor-plans/[token]/        # Public contractor view (/floor-plans/[token])
│   └── (app)/deals/[id]/           # Deal detail — add Floor Plans tab here
└── db/schema.ts                    # Add: floorPlans, floorPlanRooms, floorPlanPins tables
```

### Pattern 1: Dual-Mode Floor Plan (Upload vs Sketch)

The floor plan record has a `sourceType` field: `"upload"` or `"sketch"`.

- **Upload mode:** blobUrl stored, viewer renders PDF or image with react-zoom-pan-pinch overlay
- **Sketch mode:** rooms stored as JSON data (positions, dimensions, labels) rendered by react-konva

Both modes share the same annotation pin system — pins are stored by (xPct, yPct) percentage coordinates relative to the plan's natural dimensions.

```typescript
// Source: Pattern derived from Phase 13 contract token pattern + Phase 14 photo blob pattern
// floor_plans table
{
  id: uuid,
  dealId: uuid | null,
  propertyId: uuid | null,
  floorLabel: 'main' | 'upper' | 'basement' | 'garage' | 'other',
  version: 'as-is' | 'proposed',
  sourceType: 'upload' | 'sketch',
  blobName: text | null,   // for upload
  blobUrl: text | null,    // for upload (SAS URL, regenerated on read)
  mimeType: text | null,   // 'application/pdf' | 'image/jpeg' | 'image/png'
  sketchData: jsonb | null,  // for sketch: { rooms: Room[], naturalWidth, naturalHeight }
  totalSqft: integer | null,
  sortOrder: integer,
  shareToken: text | null,  // for contractor link (same pattern as signing tokens)
  shareExpiresAt: timestamp | null,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### Pattern 2: Pin Annotation with Percentage Coordinates

Store pin positions as percentage of natural plan width/height. This makes pins resolution-independent and works correctly after zoom/pan because the overlay div scales with the image.

```typescript
// floor_plan_pins table
{
  id: uuid,
  floorPlanId: uuid,
  xPct: doublePrecision,    // 0.0 to 1.0 — fraction of plan width
  yPct: doublePrecision,    // 0.0 to 1.0 — fraction of plan height
  category: text,           // 'plumbing' | 'electrical' | 'structural' | 'cosmetic' | ...
  note: text | null,
  budgetCategoryId: uuid | null,  // FK to budget_categories for navigation
  createdAt: timestamp,
}
```

**Rendering pins on viewer:**
```tsx
// Source: CSS absolute positioning pattern
// Pins are DOM elements (not canvas) overlaid on the image/PDF
<div className="relative" ref={containerRef}>
  <img src={blobUrl} ... />
  {pins.map(pin => (
    <PinMarker
      key={pin.id}
      style={{
        position: 'absolute',
        left: `${pin.xPct * 100}%`,
        top: `${pin.yPct * 100}%`,
        transform: 'translate(-50%, -100%)',
      }}
      category={pin.category}
      note={pin.note}
    />
  ))}
</div>
```

**Converting click event to percentage coordinates:**
```tsx
// Source: Standard DOM event pattern
function handlePlanClick(e: React.MouseEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  const xPct = (e.clientX - rect.left) / rect.width;
  const yPct = (e.clientY - rect.top) / rect.height;
  // xPct and yPct are 0.0–1.0 regardless of zoom/pan state
}
```

**Note:** When using react-zoom-pan-pinch, the click handler must be on the inner content div (inside TransformComponent), not on the TransformWrapper, to get coordinates relative to the actual plan content.

### Pattern 3: react-konva Sketch Canvas

```tsx
// Source: react-konva docs + alikaraki.me patterns
// State architecture: separate document, interaction, and viewport states
type SketchState = {
  rooms: Room[];           // Document state — persisted
  selectedId: string | null;  // Interaction state — ephemeral
  stagePos: { x: number; y: number };  // Viewport state — session
  stageScale: number;
};

// Transformer for selected room
<Transformer
  ref={transformerRef}
  boundBoxFunc={(oldBox, newBox) => {
    // Enforce minimum room size (40px min)
    if (newBox.width < 40 || newBox.height < 40) return oldBox;
    return newBox;
  }}
/>

// Room rectangle with label
<Group key={room.id} draggable>
  <Rect
    x={room.x} y={room.y}
    width={room.width} height={room.height}
    fill="rgba(139,92,246,0.1)"
    stroke="#7c3aed"
    strokeWidth={2}
    onClick={() => setSelectedId(room.id)}
  />
  <Text
    x={room.x + 8} y={room.y + 8}
    text={`${room.label}\n${room.lengthFt}' x ${room.widthFt}'\n${room.sqft} sq ft`}
    fontSize={12}
    fill="#e2e8f0"
  />
</Group>
```

### Pattern 4: PDF Viewer with Worker Configuration

react-pdf in Next.js App Router requires `'use client'` and worker configuration via dynamic import to avoid SSR issues:

```tsx
// Source: https://github.com/wojtekmaj/react-pdf
'use client';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker must be configured once at module level
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
```

**Next.js 15 important note:** The component file containing `pdfjs` must be a client component (`'use client'`). Do NOT attempt to import this in a Server Component. Wrap with `dynamic({ ssr: false })` at the page level if needed.

### Pattern 5: Shareable Contractor Link (Reuse Phase 13 Pattern)

Floor plan share links follow the exact same pattern as contract signing tokens (Phase 13):

```typescript
// Same token generation pattern as contract signing
const shareToken = randomBytes(32).toString('hex');
const shareExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

// Public route (no auth required): /floor-plans/[token]
// Validate token on page load, show view-only floor plan with pins
// Same middleware exclusion pattern as /sign/[token]
```

### Pattern 6: Blob Storage Structure (Mirror Phase 14)

```
floor-plans/{dealId}/{planId}-{floorLabel}.pdf      # uploaded PDF
floor-plans/{dealId}/{planId}-{floorLabel}.jpg      # uploaded image
floor-plans/properties/{propertyId}/{planId}.jpg    # property-level plan
```

SAS URL generation: Same `generateSasUrl()` pattern as photos — generate read-only SAS on DB read, never store permanent URLs.

### Anti-Patterns to Avoid

- **Canvas pins:** Don't put pin markers inside the Konva/PDF canvas. Use DOM overlay divs — they're easier to style, accessible, and survive zoom/pan correctly.
- **Storing pixel coordinates for pins:** Always use percentage (0.0–1.0) — pixel coords break when the viewer resizes.
- **Embedding arcada or react-planner:** Both are abandoned projects incompatible with React 19.
- **SSR for react-pdf or react-konva:** Both require browser APIs. Always `'use client'` + `dynamic({ ssr: false })` for the component that imports pdfjs worker.
- **Updating React state on every drag move in Konva:** Only sync to React state `onDragEnd` / `onTransformEnd`. Update Konva nodes directly during drag.
- **Importing konva's Node class directly in Next.js:** Konva uses browser globals. Guard with `typeof window !== 'undefined'` check if needed.
- **Using next/image for blob SAS URLs:** next/image requires domain whitelisting. Use plain `<img>` for dynamically-generated Azure SAS URLs (same pattern as Phase 14).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas pan/zoom with pinch support | Custom gesture handler | react-zoom-pan-pinch 3.7.0 | Touch event normalization, velocity, limits, boundary handling |
| PDF rendering | Direct pdfjs-dist integration | react-pdf (wojtekmaj) | Worker config, canvas scaling, page navigation, React integration |
| Canvas drag/resize handles | Custom hit detection | react-konva Transformer | Resize handles, rotation, boundary enforcement, touch support |
| Snap to grid during drag | Manual coordinate math | react-konva `dragBoundFunc` | Konva handles loop without React re-renders |
| Contractor link tokens | Custom crypto scheme | Reuse Phase 13 pattern | `randomBytes(32).toString('hex')` + expiry already tested |
| Blob upload flow | New upload logic | Reuse Phase 14 `uploadPhotoBlob` pattern | Already handles buffer → blob name → SAS URL lifecycle |

**Key insight:** The photo system (Phase 14) and contract signing system (Phase 13) already solved 60% of the infrastructure problems for this phase — blob upload, SAS URLs, token-gated public routes, deal/property dual attachment.

---

## Database Schema

### New Tables Required

```typescript
// floor_plans — one record per floor/version combination
export const floorPlans = pgTable('floor_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealId: uuid('deal_id').references(() => deals.id),
  propertyId: uuid('property_id').references(() => properties.id),
  floorLabel: text('floor_label').notNull().default('main'), // main|upper|basement|garage|other
  version: text('version').notNull().default('as-is'),       // as-is|proposed
  sourceType: text('source_type').notNull(),                  // upload|sketch
  blobName: text('blob_name'),
  blobUrl: text('blob_url'),
  mimeType: text('mime_type'),
  sketchData: text('sketch_data'),  // JSON string — rooms array
  naturalWidth: integer('natural_width'),   // px — for coordinate normalization
  naturalHeight: integer('natural_height'), // px — for coordinate normalization
  totalSqft: integer('total_sqft'),
  shareToken: text('share_token').unique(),
  shareExpiresAt: timestamp('share_expires_at', { withTimezone: true }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// floor_plan_pins — annotation pins on floor plans
export const floorPlanPins = pgTable('floor_plan_pins', {
  id: uuid('id').defaultRandom().primaryKey(),
  floorPlanId: uuid('floor_plan_id').notNull().references(() => floorPlans.id, { onDelete: 'cascade' }),
  xPct: doublePrecision('x_pct').notNull(),   // 0.0 to 1.0
  yPct: doublePrecision('y_pct').notNull(),   // 0.0 to 1.0
  category: text('category').notNull(),        // plumbing|electrical|structural|cosmetic|etc
  note: text('note'),
  budgetCategoryId: uuid('budget_category_id'), // optional FK to budget_categories
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Note:** `sketchData` stores rooms as JSON text column (not JSONB) for consistency with other text config storage in this project. Rooms are a flat array of `{ id, label, x, y, width, height, lengthFt, widthFt, sqft, wallStyle }`.

---

## Common Pitfalls

### Pitfall 1: react-pdf pdfjs Worker Not Loading in Next.js
**What goes wrong:** PDF renders blank or throws "Setting up fake worker" warning. Build fails with "Cannot use import statement."
**Why it happens:** pdfjs worker must be loaded as a separate script. Next.js bundler doesn't handle it automatically.
**How to avoid:**
```tsx
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
```
This line must be in a `'use client'` file. The `.min.mjs` path must match the installed pdfjs-dist version.
**Warning signs:** Blank white box where PDF should render; console warning about fake worker.

### Pitfall 2: react-konva SSR Crash in Next.js App Router
**What goes wrong:** Build or runtime error: "window is not defined" or "document is not defined"
**Why it happens:** Konva accesses browser globals at module evaluation time.
**How to avoid:** The floor plan sketch component must be:
1. Marked `'use client'`
2. Imported in the tab via `dynamic(() => import('./floor-plan-sketch'), { ssr: false })`
**Warning signs:** Error during `next build` or hydration failure on first render.

### Pitfall 3: Pin Coordinates Breaking on Resize
**What goes wrong:** Pins appear in wrong positions when the browser window or panel is resized.
**Why it happens:** Pixel-based coordinates stored; rendered container changes size.
**How to avoid:** Store pins as percentage (0.0–1.0) of the plan's natural dimensions. The overlay div with `position: relative` + pin with `position: absolute; left: X%; top: Y%` always renders correctly at any size.
**Warning signs:** Pins visually jump when sidebar opens/closes or window resizes.

### Pitfall 4: react-konva Transformer Scale vs Size Mismatch
**What goes wrong:** Room dimensions read as large numbers; sq ft calculation is wrong after resize.
**Why it happens:** Konva Transformer updates `scaleX`/`scaleY`, not `width`/`height` directly. If you read `node.width()` without accounting for scale, you get the original width.
**How to avoid:** In `onTransformEnd`, read `node.width() * node.scaleX()` and reset scale to 1:
```tsx
const node = shapeRef.current;
const newWidth = node.width() * node.scaleX();
const newHeight = node.height() * node.scaleY();
node.scaleX(1);
node.scaleY(1);
node.width(newWidth);
node.height(newHeight);
```
**Warning signs:** Sq ft values that grow exponentially on repeated resize.

### Pitfall 5: react-zoom-pan-pinch Annotation Click Coordinates
**What goes wrong:** Clicking to drop a pin places it at wrong location when zoomed/panned.
**Why it happens:** Click event coordinates are viewport-relative; the content is transformed.
**How to avoid:** Attach the click handler to the inner content element (inside `TransformComponent`), not to `TransformWrapper`. The inner element's bounding rect accounts for the current transform. Then use `getBoundingClientRect()` to convert to percentage coords.
**Warning signs:** Pins appear offset from where user clicked, especially when zoomed in.

### Pitfall 6: Azure SAS URLs Expiring Mid-Session
**What goes wrong:** Floor plan image/PDF becomes 403 mid-session as SAS URL expires.
**Why it happens:** Short-lived SAS tokens generated at page load expire during editing.
**How to avoid:** Generate SAS tokens with 4-hour expiry (same pattern as photos in Phase 14). For the sketch viewer which has no blob URL, this is a non-issue.
**Warning signs:** 403 errors on blob URLs several minutes after page load.

### Pitfall 7: Large PDF Rendering Performance
**What goes wrong:** A multi-page architectural PDF causes jank and slow initial render.
**Why it happens:** react-pdf renders all visible pages to canvas simultaneously.
**How to avoid:** Render only page 1 by default; add "Page X of Y" navigation for multi-page PDFs. For floor plan purposes, typically only the first page is relevant. Add `loading` prop for skeleton state.
**Warning signs:** 5+ second load for PDFs over 5MB.

---

## Code Examples

### Verified Pattern: Konva Stage with Pan/Zoom

```tsx
// Source: https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html
// Zooming stage relative to pointer position (standard pattern)
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const SCALE_STEP = 1.1;

function handleWheel(e: KonvaEventObject<WheelEvent>) {
  e.evt.preventDefault();
  const stage = e.target.getStage();
  if (!stage) return;
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  const direction = e.evt.deltaY < 0 ? 1 : -1;
  const newScale = direction > 0
    ? Math.min(oldScale * SCALE_STEP, MAX_SCALE)
    : Math.max(oldScale / SCALE_STEP, MIN_SCALE);

  stage.scale({ x: newScale, y: newScale });
  stage.position({
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  });
}
```

### Verified Pattern: react-pdf Basic Viewer

```tsx
// Source: https://github.com/wojtekmaj/react-pdf
'use client';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  return (
    <Document
      file={url}
      onLoadSuccess={({ numPages }) => setNumPages(numPages)}
    >
      <Page pageNumber={1} width={600} renderTextLayer={false} />
    </Document>
  );
}
```

### Verified Pattern: Konva Room Rect with Transformer

```tsx
// Source: https://konvajs.org/docs/react/Transformer.html
import { Rect, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

function RoomRect({ room, isSelected, onSelect, onChange }) {
  const shapeRef = useRef(null);
  const trRef = useRef(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={room.x} y={room.y}
        width={room.width} height={room.height}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => onChange({ ...room, x: e.target.x(), y: e.target.y() })}
        onTransformEnd={() => {
          const node = shapeRef.current;
          onChange({
            ...room,
            x: node.x(), y: node.y(),
            width: Math.max(40, node.width() * node.scaleX()),
            height: Math.max(40, node.height() * node.scaleY()),
          });
          node.scaleX(1);
          node.scaleY(1);
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 40 || newBox.height < 40) return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}
```

### Verified Pattern: Pin Drop on Uploaded Plan

```tsx
// Source: DOM coordinate pattern
'use client';
function UploadedPlanViewer({ plan, pins, onDropPin, readOnly }) {
  const containerRef = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (readOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;
    onDropPin({ xPct, yPct }); // open PinForm dialog with these coords
  }

  return (
    <div ref={containerRef} className="relative select-none" onClick={handleClick}>
      <img
        src={plan.blobUrl}
        className="w-full h-auto block"
        draggable={false}
      />
      {pins.map(pin => (
        <div
          key={pin.id}
          className="absolute cursor-pointer"
          style={{
            left: `${pin.xPct * 100}%`,
            top: `${pin.yPct * 100}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <PinMarker category={pin.category} note={pin.note} />
        </div>
      ))}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pdfjs-dist directly | react-pdf (wojtekmaj) 10.x | 2022+ | Simpler React integration, worker auto-config |
| React 18 react-konva | react-konva 19.x | 2025 | React 19 peer dep required — use 19.2.3 |
| Fabric.js for canvas | react-konva for React apps | Ongoing | react-konva has better React integration; Fabric.js 6.x works but imperative |
| Absolute pixel pin coords | Percentage-based pin coords | Best practice | Resolution-independent, survives resize |

**Deprecated/outdated:**
- react-planner: React 16 era, abandoned Dec 2022 — do not use
- arcada: Standalone app only, last commit 2022 — do not use
- react-konva 18.x: React 19 incompatible — must use 19.2.3

---

## Open Questions

1. **react-zoom-pan-pinch React 19 compatibility**
   - What we know: v3.7.0 published January 2025; widely used
   - What's unclear: Peer dependency on React 19 not explicitly confirmed in sources reviewed
   - Recommendation: Test `npm install react-zoom-pan-pinch` in the project — if peer dep conflict, alternative is to use the Konva Stage's built-in pan/zoom for the upload viewer as well (wrap image in a Konva Image node)

2. **Sketch data → sq ft auto-population to deal metrics**
   - What we know: Deal table has fields; server action pattern established
   - What's unclear: Which specific deal fields hold sq ft (buildingSqft is on the properties table)
   - Recommendation: On plan save, server action reads all rooms' sqft totals, sums them, and calls `updateDeal({ sqft: totalSqft })` — check current deal schema for the right column name

3. **Pin click navigation to budget line item**
   - What we know: budget_categories table has IDs; deal detail has a Financials tab
   - What's unclear: Whether the budget tab is tab-index-navigable via URL hash or query param
   - Recommendation: Store `budgetCategoryId` on pin; clicking pin opens a dialog with "View in Budget" button that uses `router.push(`/deals/${dealId}?tab=financials&category=${budgetCategoryId}`)` — implement tab-query-param support in the existing tab system

4. **Wall visualization (remove=red dashed, add=green) on proposed plans**
   - What we know: react-konva Line supports `dash` prop and `stroke` color
   - What's unclear: How complex the UX for marking walls as "remove" vs "add" would be in v1
   - Recommendation: Simplify for v1 — only sketch rooms, not individual walls. Wall visualization can be handled by simply having two room-layout views (as-is vs proposed) with different room arrangements. The "remove wall / add wall" CAD-style markup is a v2 enhancement.

5. **File size limits and compression**
   - What we know: Phase 14 photo upload uses client-side canvas resize to 1920px max, JPEG 0.8
   - What's unclear: Appropriate limit for floor plan files (PDFs can be large)
   - Recommendation: Images → same Phase 14 pattern (1920px max, JPEG 0.8, ~400KB). PDFs → accept as-is up to 10MB (floor plan PDFs are typically 0.5–5MB); warn if over 10MB; do not attempt PDF compression client-side.

---

## Existing Project Patterns to Reuse

These Phase 13/14 patterns apply directly to Phase 15 with minimal modification:

| Pattern | Source Phase | Reuse in Phase 15 |
|---------|-------------|-------------------|
| Blob upload: buffer → blob name → SAS URL | Phase 14 `blob-storage.ts` | Floor plan file upload |
| `deals/{dealId}/...` blob path prefix | Phase 14 | `floor-plans/{dealId}/{planId}.*` |
| Property-or-deal dual attachment | Phase 14 `propertyPhotos` schema | `floorPlans.dealId` nullable, `propertyId` nullable |
| Carry-over on Start Deal | Phase 14 `createDeal` photo migration | Copy floor plan records on Start Deal |
| Token-gated public route (`/sign/[token]`) | Phase 13 contract signing | `/floor-plans/[token]` contractor view |
| `randomBytes(32).toString('hex')` + expiry | Phase 13 `signers` table | `floorPlans.shareToken` + `shareExpiresAt` |
| Deal detail tabs (5 tabs from Phase 14) | Phase 14 | Add 6th tab: Floor Plans |
| Azure Document Intelligence exclusion | Phase 9 | No OCR needed for floor plans |

---

## Sources

### Primary (HIGH confidence)
- https://github.com/konvajs/react-konva — verified React 19 peerDeps (19.2.3), active maintenance
- https://github.com/wojtekmaj/react-pdf — verified v10.4.1, Next.js App Router compatible
- https://konvajs.org/docs/react/Transformer.html — Transformer resize/drag pattern
- https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html — stage zoom pattern
- https://www.alikaraki.me/blog/canvas-editors-konva — Konva architecture patterns

### Secondary (MEDIUM confidence)
- https://github.com/BetterTyped/react-zoom-pan-pinch — v3.7.0 January 2025, React 19 compat TBD
- https://github.com/mehanix/arcada — evaluated and rejected (standalone app, unmaintained)
- https://github.com/cvdlab/react-planner — evaluated and rejected (React 16, abandoned)
- https://www.smplrspace.com/pricing — enterprise-only, no free tier (confirmed)

### Tertiary (LOW confidence)
- WebSearch results on floor plan JSON schemas — inform sketchData structure but not authoritative

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-konva React 19 support confirmed; react-pdf v10 confirmed
- Architecture: HIGH — reuses proven Phase 13/14 patterns (blob, token, tabs)
- CAD-lite evaluation: HIGH — all major options researched; fallback recommendation well-supported
- Pitfalls: HIGH — most from official Konva docs + verified Next.js patterns
- react-zoom-pan-pinch React 19: LOW — needs verification at install time

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days — react-konva and react-pdf are stable libraries)
