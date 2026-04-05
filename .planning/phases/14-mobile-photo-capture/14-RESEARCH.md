# Phase 14: Mobile Photo Capture - Research

**Researched:** 2026-04-05
**Domain:** Mobile file capture, Azure Blob Storage, image gallery with lightbox, React multi-photo upload
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Capture Experience**
- Native camera + file picker (not in-browser viewfinder) — tap button, phone camera opens, take photo, auto-uploads
- Multi-photo batch upload — select/capture multiple photos, upload all at once with progress indicator
- Auto-compress before upload — resize to ~1600px wide, ~80% JPEG quality (~200-400KB each) to save mobile data
- Photos only — no video capture (future phase if needed)

**Photo Organization**
- Categorized by area with predefined tags: Exterior, Kitchen, Bathroom, Living, Bedroom, Garage, Roof, Foundation, Yard, Other
- Tag during upload — after selecting photos, pick the area category before upload starts
- Cover photo — first photo tagged "Exterior" auto-selected as cover. User can change it. Shows in deal cards and blasts
- Optional caption per photo — text field for notes like "water damage in corner", "foundation crack"

**Deal/Property Attachment Flow**
- Two paths: deal-first (navigate to deal detail, tap Add Photos) AND capture-first (floating action button, photos go to Photo Inbox)
- Photo Inbox — unassigned captures live in a reviewable inbox accessible from sidebar. Assign to deals at your desk later
- Photos attachable to properties OR deals — for driving-for-dollars, snap photos of a distressed property before a deal exists. Photos carry over when a deal is created from that property
- Floating action button (FAB) on mobile views — tap to open camera, photos go to inbox. Fast for field work

**Photo Usage Downstream**
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

### Deferred Ideas (OUT OF SCOPE)
- Video capture/walkthrough clips — separate phase
- AI-based photo tagging (auto-detect room type) — future enhancement
- Before/after comparison views for rehab tracking — could be part of a rehab documentation phase
</user_constraints>

---

## Summary

Phase 14 adds a mobile-first property photo capture system. The core pattern is already validated in this codebase: `receipt-upload.tsx` demonstrates client-side canvas resize + server action upload to Azure Blob Storage using `@azure/storage-blob`. Phase 14 extends this exact same pattern to support multi-photo batch uploads with category tagging and caption, organized by deal/property.

The project already has `@azure/storage-blob` installed and a working `blob-storage.ts` module with `uploadBlob`, `generateSasUrl`, `uploadContract`, and `generateContractSasUrl`. Phase 14 adds a new `photos` container, a `property_photos` database table, and a new `uploadPhoto` / `generatePhotoSasUrl` function pair. The DB schema follows the existing `receipts` table pattern but with `dealId` (nullable), `propertyId` (nullable), `category`, `caption`, and `isCover` columns.

For the gallery lightbox, `yet-another-react-lightbox` (v3.30.1 as of 2026-03-26) is the clear choice — it is actively maintained, React 19 compatible (peer dep >= 16.8), and used via dynamic import to keep the bundle small. The FAB sits above the existing `MobileBottomNav` at `bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px)` so it never overlaps the nav bar. The Photo Inbox route is `/photos/inbox` added to the sidebar navigation.

**Primary recommendation:** Re-use the existing `resizeImage` + `uploadBlob` + server action pattern from `receipt-upload.tsx`. Add a `property_photos` table in schema, a `photos` blob container, and wire up `yet-another-react-lightbox` for the gallery view. Keep the FAB as a pure client component injected into the dashboard layout above MobileBottomNav.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@azure/storage-blob` | ^12.31.0 (already installed) | Upload photos to Azure Blob Storage, generate SAS URLs | Already used for receipts and contracts; same pattern applies |
| `yet-another-react-lightbox` | ^3.30.1 | Lightbox gallery with swipe, captions, thumbnails plugin | Actively maintained (March 2026 release), React 19 compatible, plugin-based, used widely in Next.js projects |
| Next.js `next/dynamic` | (built-in) | Lazy load lightbox to avoid SSR issues | Lightbox uses browser APIs; must be client-only |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.577.0 (already installed) | Camera, Upload, Trash icons for UI | Already in project |
| `yet-another-react-lightbox/plugins/captions` | (bundled with library) | Caption overlay on full-size view | Enables the optional caption per photo requirement |
| `yet-another-react-lightbox/plugins/thumbnails` | (bundled with library) | Thumbnail strip at bottom of lightbox | Nice-to-have for multi-photo navigation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `yet-another-react-lightbox` | Custom modal with next/image | yet-another-react-lightbox handles swipe gestures, keyboard nav, preloading, captions plugin for free; custom is 300+ lines for worse result |
| `yet-another-react-lightbox` | `react-photo-album` | react-photo-album is a grid only, not a lightbox; they are complementary — YARL is the clear choice for the lightbox requirement |
| Server action upload | SAS token + direct browser upload | Server action is simpler, already validated in codebase; SAS token approach adds complexity without benefit at this scale |

**Installation:**
```bash
npm install yet-another-react-lightbox
```

No other new packages needed — all other dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── db/
│   └── schema.ts             # Add propertyPhotos table
├── lib/
│   ├── blob-storage.ts       # Add uploadPhoto(), generatePhotoSasUrl(), deletePhoto()
│   ├── photo-actions.ts      # Server actions: uploadPhotos, setPhotoCover, deletePhoto, assignPhotosToDeal
│   └── photo-queries.ts      # getDealPhotos(), getPropertyPhotos(), getInboxPhotos()
├── components/
│   ├── photo-upload.tsx       # Multi-photo batch upload with category picker + progress
│   ├── photo-gallery.tsx      # Grid grouped by category + YARL lightbox
│   ├── photo-card.tsx         # Individual photo card with delete/cover/caption controls
│   ├── photo-tab.tsx          # Tab wrapper for deal detail (Photos tab)
│   ├── photo-fab.tsx          # Floating action button (camera icon, mobile-only)
│   └── photo-inbox.tsx        # Inbox UI: unassigned photos, assign-to-deal flow
└── app/(dashboard)/
    ├── layout.tsx             # Add <PhotoFab /> above <MobileBottomNav />
    └── photos/
        └── inbox/
            └── page.tsx       # Photo Inbox page
```

### Pattern 1: Multi-Photo Batch Upload with Per-File Progress

**What:** User selects N files via `<input type="file" multiple accept="image/*" capture="environment">`. After category selection, all files are resized client-side then uploaded sequentially (or in parallel with concurrency limit) as individual server action calls. Progress tracked per file with a `{id, name, status, progress}` array in state.

**When to use:** Batch selection flow on both deal detail Photos tab and FAB capture-first path.

**Key difference from receipt-upload.tsx:** Receipt upload is single-file. Photo upload is multiple files, but the same `resizeImage` + `uploadPhoto` server action pattern applies per file.

**Example:**
```typescript
// app/src/components/photo-upload.tsx
"use client";

type PhotoUploadState = {
  id: string;          // crypto.randomUUID() client-side
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  previewUrl: string;  // URL.createObjectURL(file)
};

async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const files = Array.from(e.target.files ?? []);
  const items: PhotoUploadState[] = files.map((f) => ({
    id: crypto.randomUUID(),
    file: f,
    status: "pending",
    previewUrl: URL.createObjectURL(f),
  }));
  setQueue(items);
  // User now picks category, then clicks "Upload X Photos"
}

async function handleUploadAll() {
  for (const item of queue) {
    setQueue((prev) =>
      prev.map((p) => p.id === item.id ? { ...p, status: "uploading" } : p)
    );
    try {
      const resized = await resizeImage(item.file); // same function from receipt-upload.tsx
      const fd = new FormData();
      fd.append("file", new File([resized], item.file.name, { type: "image/jpeg" }));
      fd.append("dealId", dealId ?? "");
      fd.append("propertyId", propertyId ?? "");
      fd.append("category", category);
      fd.append("caption", captions[item.id] ?? "");
      await uploadPhoto(fd); // server action
      setQueue((prev) =>
        prev.map((p) => p.id === item.id ? { ...p, status: "done" } : p)
      );
    } catch {
      setQueue((prev) =>
        prev.map((p) => p.id === item.id ? { ...p, status: "error" } : p)
      );
    }
  }
}
```

### Pattern 2: Azure Blob Storage Photo Container

**What:** Add a third container `photos` alongside existing `receipts` and `contracts`. Blob naming convention: `{dealId or propertyId}/{uuid}-{sanitized-filename}.jpg`.

**Why scoped by entity ID:** Matches the existing `receipts` pattern (`{budgetId}/{uuid}-{filename}`) and makes bulk-listing per deal straightforward via blob prefix filtering.

**Folder structure in `blob-storage.ts`:**
```typescript
const PHOTOS_CONTAINER = "photos";

export async function uploadPhoto(
  buffer: Buffer,
  blobName: string  // e.g. "deals/{dealId}/{uuid}-exterior.jpg"
): Promise<string> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(PHOTOS_CONTAINER);
  await containerClient.createIfNotExists();
  const blobClient = containerClient.getBlockBlobClient(blobName);
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: "image/jpeg" },
  });
  return blobClient.url;
}

export function generatePhotoSasUrl(blobName: string): string {
  // Same pattern as generateSasUrl() / generateContractSasUrl()
  // 1-hour read-only SAS
}
```

**Blob naming for inbox photos (no deal/property yet):**
`inbox/{uuid}-{filename}.jpg` — reassigned to `deals/{dealId}/...` blob path by creating a new blob and deleting the old one when assigned, OR keep original blob name and just update the DB row (simpler — blob name doesn't need to match entity).

**Recommendation:** Keep original blob name on assignment. Only the DB row changes. Blob name stays `inbox/{uuid}-{filename}.jpg` forever. Simpler.

### Pattern 3: Database Schema

**What:** New `property_photos` table in `schema.ts`. Polymorphic: links to `deals` OR `properties` (both nullable). `isInbox: boolean` when neither deal nor property is assigned yet.

```typescript
// In schema.ts — following existing table conventions exactly

export const photoCategory = pgEnum("photo_category", [
  "exterior",
  "kitchen",
  "bathroom",
  "living",
  "bedroom",
  "garage",
  "roof",
  "foundation",
  "yard",
  "other",
]);

export const propertyPhotos = pgTable(
  "property_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Polymorphic attachment — both nullable
    dealId: uuid("deal_id").references(() => deals.id),
    propertyId: uuid("property_id").references(() => properties.id),
    isInbox: boolean("is_inbox").notNull().default(false),
    blobName: text("blob_name").notNull(),
    blobUrl: text("blob_url").notNull(),      // internal URL (not SAS)
    category: photoCategory("category").notNull().default("other"),
    caption: text("caption"),
    isCover: boolean("is_cover").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    fileSizeBytes: integer("file_size_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_property_photos_deal_id").on(table.dealId),
    index("idx_property_photos_property_id").on(table.propertyId),
    index("idx_property_photos_is_inbox").on(table.isInbox),
    // Only one cover photo per deal
    uniqueIndex("uq_property_photos_deal_cover").on(table.dealId, table.isCover)
      // Note: partial unique index not supported in drizzle uniqueIndex — use application-level cover enforcement
  ]
);

export type PropertyPhotoRow = InferSelectModel<typeof propertyPhotos>;
```

**Cover photo uniqueness:** Drizzle does not support partial unique indexes (WHERE isCover = true). Enforce cover uniqueness in the server action: when setting a photo as cover, use a transaction to first unset all other covers for that deal, then set the new one.

### Pattern 4: YARL Lightbox Integration

**What:** `yet-another-react-lightbox` loaded via `next/dynamic` to avoid SSR failures (lightbox uses browser-only APIs). Captions plugin for caption overlay. Open state controlled by photo index.

```typescript
// app/src/components/photo-gallery.tsx
"use client";

import dynamic from "next/dynamic";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";

const Lightbox = dynamic(() => import("yet-another-react-lightbox"), {
  ssr: false,
});
const Captions = dynamic(
  () => import("yet-another-react-lightbox/plugins/captions").then((m) => m.Captions),
  { ssr: false }
);

// slides built from SAS URLs generated server-side and passed as prop:
const slides = photos.map((p) => ({
  src: p.sasUrl,           // 1-hour SAS URL generated server-side
  title: p.category,       // shown by Captions plugin
  description: p.caption ?? undefined,
}));

<Lightbox
  open={lightboxIndex >= 0}
  close={() => setLightboxIndex(-1)}
  index={lightboxIndex}
  slides={slides}
  plugins={[Captions]}
/>
```

**SAS URL generation:** SAS URLs expire in 1 hour. Generate them server-side at page load time. For the Photos tab in deal detail, generate all photo SAS URLs at render time in the server component (or via a server action called once when the tab loads).

### Pattern 5: Floating Action Button (FAB)

**What:** Camera icon button fixed above the MobileBottomNav. Visible only on mobile (hidden on md+). Taps open a `<input type="file" multiple accept="image/*" capture="environment">` and route photos to Photo Inbox.

**Positioning:** Must clear the existing `MobileBottomNav` which is `calc(56px + env(safe-area-inset-bottom, 0px))` tall. FAB sits at `bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px)`.

```tsx
// app/src/components/photo-fab.tsx
"use client";

import { useRef } from "react";
import { Camera } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function PhotoFab() {
  const { isMobile } = useSidebar();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isMobile) return null;

  return (
    <>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="fixed z-40 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        style={{
          bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 16px)",
        }}
        aria-label="Capture photo"
      >
        <Camera className="h-6 w-6" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleCapture}
        className="hidden"
      />
    </>
  );
}
```

**FAB in layout.tsx:** Insert `<PhotoFab />` just before `<MobileBottomNav />` in the dashboard layout. It lives outside any page component so it renders on all dashboard pages.

### Pattern 6: Photo-to-Property Carry-Over

**What:** When "Start Deal" is clicked from a property detail page, the new deal is created pre-filled with property data (DEAL-07). Phase 14 extends `createDealFromProperty` to also update `propertyPhotos` rows: any photos with `propertyId = X` and `dealId = null` get `dealId = newDeal.id` added.

**Implementation:** In the existing `createDealFromProperty` server action (in `deal-actions.ts`), after `INSERT INTO deals`, run:
```sql
UPDATE property_photos SET deal_id = $newDealId WHERE property_id = $propertyId AND deal_id IS NULL
```

This is a simple one-liner Drizzle update, non-blocking, runs in the same transaction.

### Pattern 7: Deal Blast Photo Integration

**What:** The existing `DealBlastGenerator` has a manual "Photo URL" text field. Phase 14 replaces this with auto-populated cover photo SAS URL. The component receives `coverPhotoUrl: string | null` as a prop (generated server-side from the deal's cover photo blob name), and pre-fills the photo URL field.

**No breaking change:** If `coverPhotoUrl` is null (no photos yet), the field remains blank. The user can still paste a manual URL.

### Anti-Patterns to Avoid

- **Single upload for all files in one server action call:** Next.js server actions have a default body size limit (4MB). Multiple photos must be uploaded one-at-a-time, not batched in a single FormData call. Use sequential or bounded-parallel individual calls.
- **Storing SAS URLs in the database:** SAS URLs expire after 1 hour. Store only `blobName` and `blobUrl` (internal) in the DB. Generate SAS URLs on-demand at render time, exactly as `generateSasUrl` does for receipts.
- **Client-side blob upload with SAS token:** This project uses server actions for all uploads (receipts, contracts). Keep that pattern for consistency and to avoid exposing storage credentials.
- **Partial unique index for isCover:** Drizzle does not support `WHERE` clauses on `uniqueIndex`. Enforce cover uniqueness in application code, not the DB constraint.
- **Lightbox without `ssr: false`:** YARL uses `document` and `window` — always wrap in `dynamic(() => import(...), { ssr: false })`.
- **Not revoking object URLs:** Each `URL.createObjectURL` must be paired with `URL.revokeObjectURL` on cleanup. The existing `receipt-upload.tsx` demonstrates this correctly — follow that pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Full-screen photo viewer with swipe/keyboard/caption | Custom modal with manual gesture handling | `yet-another-react-lightbox` v3.30.1 + Captions plugin | Touch gesture handling for swipe left/right is complex; YARL handles keyboard, mouse, touchpad, touchscreen, RTL, accessibility — ~400 lines you'd write poorly |
| Client-side image resize | Custom resize logic | Copy `resizeImage()` from `receipt-upload.tsx` | Already validated in codebase, handles aspect ratio, max-side calculation, canvas toBlob |
| Upload progress tracking | XMLHttpRequest with onprogress | Per-file status state (`pending/uploading/done/error`) in React array | XHR progress fires frequently; for 200-400KB files the upload is fast enough that simple status badges (spinner → checkmark → error) are sufficient without byte-level progress bars |

**Key insight:** This phase is a composition of patterns already proven in this codebase. The only new library is yet-another-react-lightbox. Everything else reuses existing `blob-storage.ts`, `resizeImage`, and server action patterns.

---

## Common Pitfalls

### Pitfall 1: Next.js Server Action Body Size Limit
**What goes wrong:** Uploading multiple photos in a single FormData POST hits the default ~4MB Next.js body limit, causing silent failures on larger batches.
**Why it happens:** Next.js server actions default to `bodySizeLimit: '1mb'` in some configurations (though the default is larger with App Router, very large images before client-side resize can still trip limits).
**How to avoid:** Client-side `resizeImage()` brings each photo to ~200-400KB before upload. Upload one photo at a time in a loop, not all photos in one call.
**Warning signs:** Upload hangs or returns 413 error for photos > ~1MB.

### Pitfall 2: Partial Unique Index for Cover Photo
**What goes wrong:** Attempting to enforce "only one cover per deal" via DB unique constraint fails because Drizzle does not support partial `WHERE` clauses in `uniqueIndex`.
**Why it happens:** Standard SQL allows `CREATE UNIQUE INDEX ... WHERE is_cover = true` but Drizzle's `uniqueIndex` does not expose this.
**How to avoid:** Enforce in server action: wrap cover change in a transaction — `UPDATE property_photos SET is_cover = false WHERE deal_id = X` followed by `UPDATE property_photos SET is_cover = true WHERE id = Y`.
**Warning signs:** Multiple `isCover = true` rows per deal in DB.

### Pitfall 3: SAS URL Expiration in Cached Pages
**What goes wrong:** Server-rendered page with SAS URLs for photos is cached; SAS URLs expire after 1 hour; users see broken images.
**Why it happens:** Next.js caches server components by default. If the page is cached at build time or in ISR, the 1-hour SAS URLs embedded in the HTML will be stale.
**How to avoid:** The deal detail page already uses `export const dynamic = 'force-dynamic'`. Ensure the Photos tab data is fetched within the dynamic page. SAS URLs generated on each request will be fresh.
**Warning signs:** Broken images 1+ hour after page load with a fresh request still showing cached HTML.

### Pitfall 4: FAB Overlapping Bottom Nav or Safe Area
**What goes wrong:** FAB sits behind the bottom nav, or is clipped by device safe-area notch on iPhone.
**Why it happens:** Fixed positioning without accounting for `env(safe-area-inset-bottom)`.
**How to avoid:** Use `bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px)` as shown in Pattern 5. The existing `MobileBottomNav` already uses `env(safe-area-inset-bottom)` — match it.
**Warning signs:** FAB partially hidden behind nav bar on iPhone with home indicator.

### Pitfall 5: `capture="environment"` Behavior on iOS Safari
**What goes wrong:** On iOS Safari, `<input type="file" multiple capture="environment">` ignores the `multiple` attribute when `capture` is present — it forces the camera open for one photo at a time.
**Why it happens:** iOS Safari behavior: when `capture` is set, it opens the native camera for a single shot; `multiple` is ignored.
**How to avoid:** Provide TWO inputs or a mode toggle: (a) `capture="environment"` without `multiple` for "Take Photo" (single shot, add to queue, repeat), and (b) `accept="image/*"` with `multiple` without `capture` for "Choose from Library" (multi-select from gallery). This is how iOS photo apps work. The receipt-upload.tsx uses `capture="environment"` for single shots — the photo upload UX must explicitly handle iOS.
**Warning signs:** On iPhone, tapping upload button opens camera instead of gallery picker; selecting multiple files from gallery is impossible.

### Pitfall 6: Object URL Memory Leak
**What goes wrong:** `URL.createObjectURL` accumulates in memory for preview thumbnails, causing memory issues on low-end Android phones during a long session with many photos.
**Why it happens:** Object URLs are not garbage-collected until `URL.revokeObjectURL` is called.
**How to avoid:** Follow the pattern in `receipt-upload.tsx` — call `URL.revokeObjectURL(url)` in cleanup (when upload completes, on cancel, or in `useEffect` cleanup). For queue-based multi-upload, revoke each URL as soon as the `<img>` preview is no longer needed (after upload success or on queue clear).
**Warning signs:** Memory usage grows with each batch of photos; browser tab becomes sluggish.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Lightbox with Captions Plugin
```typescript
// Source: yet-another-react-lightbox.com/documentation + existing project dynamic() pattern
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";

const Lightbox = dynamic(() => import("yet-another-react-lightbox"), { ssr: false });
const Captions = dynamic(
  () => import("yet-another-react-lightbox/plugins/captions").then((m) => m.Captions),
  { ssr: false }
);

interface PhotoSlide {
  src: string;       // SAS URL
  title?: string;    // category label
  description?: string; // caption
}

export function PhotoGallery({ photos }: { photos: PhotoSlide[] }) {
  const [index, setIndex] = useState(-1);

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo, i) => (
          <button key={i} onClick={() => setIndex(i)} className="aspect-square overflow-hidden rounded-md">
            <img src={photo.src} alt={photo.title} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={index >= 0}
        close={() => setIndex(-1)}
        index={index}
        slides={photos}
        plugins={[Captions]}
      />
    </>
  );
}
```

### iOS-Safe Dual Input for Mobile Capture
```typescript
// Source: iOS Safari behavior research + existing receipt-upload.tsx pattern
// Provide both camera capture (one at a time) AND gallery multi-select
<>
  {/* Take Photo — opens camera directly, single shot */}
  <button onClick={() => cameraInputRef.current?.click()}>
    <Camera className="h-4 w-4" /> Take Photo
  </button>
  <input
    ref={cameraInputRef}
    type="file"
    accept="image/*"
    capture="environment"
    onChange={handleCapture}
    className="hidden"
  />

  {/* Choose from Library — multi-select from gallery */}
  <button onClick={() => galleryInputRef.current?.click()}>
    <Images className="h-4 w-4" /> Add from Library
  </button>
  <input
    ref={galleryInputRef}
    type="file"
    accept="image/*"
    multiple
    onChange={handleCapture}
    className="hidden"
  />
</>
```

### Photo Server Action (upload single photo)
```typescript
// Source: existing receipt-actions.ts pattern
"use server";

import { db } from "@/db/client";
import { propertyPhotos } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { uploadPhoto as uploadPhotoToBlob } from "@/lib/blob-storage";

export async function uploadPhoto(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const file = formData.get("file") as File;
  const dealId = formData.get("dealId") as string | null;
  const propertyId = formData.get("propertyId") as string | null;
  const category = (formData.get("category") as string) ?? "other";
  const caption = formData.get("caption") as string | null;
  const isInbox = !dealId && !propertyId;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const prefix = dealId ? `deals/${dealId}` : propertyId ? `properties/${propertyId}` : "inbox";
  const blobName = `${prefix}/${crypto.randomUUID()}-${file.name}`;

  const blobUrl = await uploadPhotoToBlob(buffer, blobName);

  await db.insert(propertyPhotos).values({
    dealId: dealId || null,
    propertyId: propertyId || null,
    isInbox,
    blobName,
    blobUrl,
    category: category as PhotoCategory,
    caption: caption || null,
    isCover: false,
    fileSizeBytes: buffer.length,
  });

  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (isInbox) revalidatePath(`/photos/inbox`);
}
```

### Cover Photo Selection (transaction-safe)
```typescript
// Source: existing schema.ts drizzle pattern
export async function setPhotoCover(photoId: string, dealId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  await db.transaction(async (tx) => {
    // Unset all covers for this deal
    await tx
      .update(propertyPhotos)
      .set({ isCover: false })
      .where(eq(propertyPhotos.dealId, dealId));

    // Set new cover
    await tx
      .update(propertyPhotos)
      .set({ isCover: true })
      .where(eq(propertyPhotos.id, photoId));
  });

  revalidatePath(`/deals/${dealId}`);
}
```

### Deal Blast Generator — Cover Photo Auto-Populate
```typescript
// Existing DealBlastGenerator receives coverPhotoSasUrl prop
// In deal detail page.tsx (server component):
const coverPhoto = await getDealCoverPhoto(id);  // returns blobName or null
const coverPhotoSasUrl = coverPhoto ? generatePhotoSasUrl(coverPhoto.blobName) : null;

// Pass to DealBlastGenerator:
<DealBlastGenerator deal={deal} coverPhotoSasUrl={coverPhotoSasUrl} />

// In DealBlastGenerator, pre-populate the photoUrl state:
const [photoUrl, setPhotoUrl] = useState(coverPhotoSasUrl ?? "");
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual Photo URL field in deal blast | Auto-populated from uploaded cover photo | Phase 14 | No more copying Imgur/Drive links manually |
| Receipt upload pattern (single file, no category) | Multi-photo batch with category tagging | Phase 14 | Same underlying code, extended for batch + metadata |
| `capture="environment"` blocks multi-select on iOS | Dual input: camera button + gallery button | Phase 14 | Required for iOS Safari compatibility |

**Deprecated/outdated:**
- Deal Blast "Photo URL" manual text input: replaced by auto-populated cover photo SAS URL from uploaded photos (field kept editable in case user wants to override).

---

## Open Questions

1. **Photo Inbox sidebar entry placement**
   - What we know: Sidebar has entries for Dashboard, Properties, Deals, Pipeline, Buyers, Campaigns, Contracts, Analytics, Map, Settings
   - What's unclear: Where Photo Inbox should appear; does it need an unread count badge (like contractCount badge on deal detail)?
   - Recommendation: Claude's discretion — place "Photos" between "Deals" and "Campaigns" in sidebar; show inbox count badge if > 0 unassigned photos. Mobile bottom nav already has 5 items (at limit) so Photo Inbox is sidebar/desktop only; the FAB handles mobile capture.

2. **Photo carry-over transaction scope with "Start Deal"**
   - What we know: `createDealFromProperty` in `deal-actions.ts` creates the deal row; the photo carry-over is an `UPDATE property_photos SET deal_id = ?`
   - What's unclear: Whether the carry-over should be in the same DB transaction as deal creation or a separate best-effort operation
   - Recommendation: Include in the same transaction for atomicity. If photos fail to attach, the deal creation should still succeed (use separate non-transactional update for safety, log errors).

3. **Azure Blob Storage `photos` container: public vs. private**
   - What we know: `receipts` and `contracts` containers are private (SAS URL required for browser display); the existing `generateSasUrl` generates 1-hour SAS URLs
   - What's unclear: Whether 1-hour SAS URL expiry is acceptable for photos displayed in the deal detail gallery (page is `force-dynamic`, so SAS is fresh on each visit; but if page is open for > 1 hour the images break)
   - Recommendation: Use same pattern as receipts (1-hour SAS, private container). Add a server action `refreshPhotoSasUrls(photoIds[])` callable from the client if needed for long-lived gallery sessions. For initial implementation, 1-hour is sufficient.

4. **Deal blast "cover + up to 4 selected" email format**
   - What we know: Current deal blast is plain-text copy-paste to clipboard (DEAL-05); the blast includes a "Photos: {url}" line
   - What's unclear: Whether Phase 14 blast changes to include multiple photo URLs in the text, or opens a photo picker modal for selecting up to 4 photos to include
   - Recommendation: For the text blast, include cover photo SAS URL in the existing "Photos:" line. The "up to 4 selected for email blasts to buyers" described in CONTEXT.md may be better suited for the email-formatted blast (future Resend-based blast, not the current plain-text copy). Implement cover photo auto-populate in Phase 14; full multi-photo email blast can be a sub-task.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `receipt-upload.tsx`, `blob-storage.ts`, `receipt-actions.ts`, `schema.ts` — direct code inspection; patterns validated in production
- `yet-another-react-lightbox` GitHub releases — v3.30.1 confirmed as latest (2026-03-26)
- Existing `bottom-nav.tsx` and `layout.tsx` — `env(safe-area-inset-bottom)` pattern confirmed in codebase

### Secondary (MEDIUM confidence)
- [yet-another-react-lightbox.com/documentation](https://yet-another-react-lightbox.com/documentation) — Captions plugin, Thumbnails plugin, basic usage pattern verified
- [Azure Storage Blob upload docs](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-upload-javascript) — server-side upload via SDK is the established pattern

### Tertiary (LOW confidence)
- iOS Safari `capture + multiple` limitation — reported behavior from web search; should be validated on device during implementation. Multiple credible sources report this issue consistently.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@azure/storage-blob` already installed and working; YARL version confirmed from GitHub; all other libraries are already in project
- Architecture: HIGH — patterns are direct extensions of existing validated code (`receipt-upload.tsx`, `blob-storage.ts`, `schema.ts`)
- Pitfalls: MEDIUM-HIGH — iOS `capture+multiple` limitation is widely reported but should be validated; all other pitfalls are confirmed from codebase patterns
- iOS behavior: MEDIUM — confirmed from multiple sources but deserves device testing

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable domain; YARL is actively maintained but API is stable)
