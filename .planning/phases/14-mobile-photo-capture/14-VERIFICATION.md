---
phase: 14-mobile-photo-capture
verified: 2026-04-05T22:50:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 14: Mobile Photo Capture Verification Report

**Phase Goal:** Capture property photos from mobile device, attach to deals/properties in HouseFinder, store in Azure Blob Storage, organize by category, surface in galleries/deal cards/buyer blasts. Includes Photo Inbox for unassigned captures and floating quick-capture button.
**Verified:** 2026-04-05T22:50:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | property_photos table exists in database with correct columns and indexes | VERIFIED | `schema.ts` lines 695–736: `photoCategory` pgEnum (10 values), `propertyPhotos` pgTable with 13 columns, 3 indexes. Migration `0006_powerful_devos.sql` confirms DDL. |
| 2  | Photos can be uploaded to Azure Blob Storage 'photos' container | VERIFIED | `blob-storage.ts`: `PHOTOS_CONTAINER = "photos"`, `uploadPhotoBlob` uses `createIfNotExists` + upload with `contentType "image/jpeg"`. |
| 3  | Photos can be queried by dealId, propertyId, or inbox status | VERIFIED | `photo-queries.ts`: `getDealPhotos`, `getPropertyPhotos`, `getInboxPhotos` each query by respective field; all return `PhotoWithSasUrl[]`. |
| 4  | Cover photo can be set/unset transactionally (one cover per deal) | VERIFIED | `photo-actions.ts` `setPhotoCover`: wraps in `db.transaction`, first clears `isCover=false` for all deal photos, then sets `isCover=true` for the target photo. |
| 5  | Photos can be deleted (both blob and DB row) | VERIFIED | `photo-actions.ts` `deletePhoto`: fetches row, calls `deletePhotoBlob(row.blobName)`, then deletes DB row. Auth-gated. |
| 6  | Photos can be assigned from inbox to a deal | VERIFIED | `photo-actions.ts` `assignPhotosToDeal`: uses `inArray(propertyPhotos.id, photoIds)` to scope update; sets `dealId`, clears `isInbox=false`. |
| 7  | User can select multiple photos or take a single photo and upload with category tag | VERIFIED | `photo-upload.tsx` (345 lines): dual hidden inputs — `capture="environment"` (single shot) + `multiple` gallery picker. Category picker with 10 predefined values. |
| 8  | User can see per-file upload progress (pending/uploading/done/error) | VERIFIED | `photo-upload.tsx`: `queue: PhotoUploadState[]` with status `"pending"|"uploading"|"done"|"error"` per file, rendered as status badges per queue item. |
| 9  | Deal detail page has a Photos tab showing all photos grouped by category | VERIFIED | `deals/[id]/page.tsx`: imports `PhotoTab`, fetches `getDealPhotos` + `getDealCoverPhoto` in parallel `Promise.all`, renders `<PhotoTab photos={photos} dealId={id} />` inside `TabsContent value="photos"`. |
| 10 | Clicking a photo opens a full-screen lightbox with swipe and caption overlay | VERIFIED | `photo-gallery.tsx` (241 lines): `Lightbox` dynamically imported with `ssr: false`; `Captions` plugin imported statically and cast as `Plugin`. Click sets `lightboxIndex` to open; slides array built with `src/title/description`. |
| 11 | User can set cover photo, delete photos, and edit captions from gallery | VERIFIED | `photo-gallery.tsx`: hover overlay renders Star (setPhotoCover), Trash (deletePhoto with confirm), caption inline edit (updatePhotoCaption). All server actions called directly. |
| 12 | Mobile FAB visible on all dashboard pages, tapping opens camera/gallery, photos go to inbox | VERIFIED | `photo-fab.tsx`: `md:hidden fixed z-40 right-4`, bottom positioned above MobileBottomNav. Hidden camera input `capture="environment"`, calls `uploadPhoto` with no dealId/propertyId. Injected in `layout.tsx` above `<MobileBottomNav />`. |
| 13 | Photo Inbox page at /photos/inbox shows all unassigned photos with assign-to-deal flow | VERIFIED | `photos/inbox/page.tsx` (32 lines): server component, fetches `getInboxPhotos()` + deals list, renders `<PhotoInbox photos={photos} deals={deals} />`. `photo-inbox.tsx` (190 lines): multi-select checkboxes, deal dropdown, Assign button calling `assignPhotosToDeal`. |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|---------|---------|--------|---------|
| `app/src/db/schema.ts` | propertyPhotos table, photoCategory pgEnum, PropertyPhotoRow type | VERIFIED | Contains `photoCategory` pgEnum, `propertyPhotos` pgTable, `PropertyPhotoRow` type export at lines 695–736 |
| `app/src/lib/blob-storage.ts` | uploadPhotoBlob(), generatePhotoSasUrl(), deletePhotoBlob() | VERIFIED | All three functions present with `PHOTOS_CONTAINER = "photos"` |
| `app/src/lib/photo-actions.ts` | 5 server actions: uploadPhoto, setPhotoCover, deletePhoto, assignPhotosToDeal, updatePhotoCaption | VERIFIED | "use server" at line 1; all 5 exports confirmed; each auth-gated with `auth()` check |
| `app/src/lib/photo-queries.ts` | getDealPhotos, getPropertyPhotos, getInboxPhotos, getDealCoverPhoto, getInboxCount, PhotoWithSasUrl | VERIFIED | All 6 exports confirmed; `withSasUrl` helper wraps every row |
| `app/src/components/photo-upload.tsx` | Dual iOS-safe inputs, per-file progress, category picker, 1600px resize | VERIFIED | 345 lines; dual inputs (camera + gallery), `resizeImage` at 1600px, queue pattern, category dropdown |
| `app/src/components/photo-gallery.tsx` | Grouped grid, YARL lightbox, cover/delete/caption controls | VERIFIED | 241 lines; YARL `dynamic(..., {ssr:false})`, Captions plugin, cover/delete/caption overlay confirmed |
| `app/src/components/photo-tab.tsx` | Composes PhotoUpload + PhotoGallery | VERIFIED | 19 lines; renders `<PhotoUpload dealId={dealId} />` and `<PhotoGallery photos={photos} dealId={dealId} canManage={true} />` |
| `app/src/app/(dashboard)/deals/[id]/page.tsx` | Photos tab, getDealCoverPhoto, coverPhotoSasUrl to blast | VERIFIED | `PhotoTab` imported, `getDealPhotos`+`getDealCoverPhoto` in Promise.all, `coverPhotoSasUrl={coverPhoto?.sasUrl ?? null}` prop passed to blast generator |
| `app/src/components/deal-blast-generator.tsx` | coverPhotoSasUrl prop, auto-populates photoUrl state | VERIFIED | Interface extended with `coverPhotoSasUrl?: string | null`; `useState(coverPhotoSasUrl ?? "")` initializes field |
| `app/src/components/photo-fab.tsx` | Mobile-only FAB, camera capture, uploadPhoto to inbox | VERIFIED | 125 lines; `md:hidden fixed z-40`; camera input; calls `uploadPhoto` with no dealId/propertyId |
| `app/src/components/photo-inbox.tsx` | Multi-select inbox grid, assign-to-deal flow | VERIFIED | 190 lines; checkbox per photo, deal selector dropdown, calls `assignPhotosToDeal` and `deletePhoto` |
| `app/src/app/(dashboard)/photos/inbox/page.tsx` | Photo Inbox route page | VERIFIED | 32 lines; server component; `getInboxPhotos()` + deals query; renders `<PhotoInbox>` |
| `app/src/app/(dashboard)/layout.tsx` | PhotoFab injected into layout | VERIFIED | `import { PhotoFab }` at line 7; `<PhotoFab />` rendered at line 34 |
| `app/src/components/app-sidebar.tsx` | Photos nav item | VERIFIED | `ImageIcon` imported from lucide-react; `{ label: "Photos", href: "/photos/inbox", icon: ImageIcon }` between Contracts and Buyers |
| `app/drizzle/0006_powerful_devos.sql` | Migration for property_photos table | VERIFIED | Contains `CREATE TYPE "photo_category"`, `CREATE TABLE "property_photos"` with all columns, 2 FKs, 3 indexes |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `photo-actions.ts` | `blob-storage.ts` | uploadPhoto calls uploadPhotoBlob | WIRED | `import { uploadPhotoBlob, generatePhotoSasUrl, deletePhotoBlob }` confirmed; `uploadPhotoBlob(buffer, blobName)` called in `uploadPhoto` action |
| `photo-actions.ts` | `schema.ts` | insert/update/delete on propertyPhotos | WIRED | `import { propertyPhotos }` from schema; Drizzle `db.insert(propertyPhotos)`, `db.update(propertyPhotos)`, `db.delete(propertyPhotos)` all present |
| `photo-queries.ts` | `schema.ts` | select from propertyPhotos | WIRED | `import { propertyPhotos }` confirmed; all 5 query functions select from `propertyPhotos` |
| `photo-upload.tsx` | `photo-actions.ts` | uploadPhoto server action per file | WIRED | `import { uploadPhoto } from "@/lib/photo-actions"`; called in sequential upload loop at line 162 |
| `photo-gallery.tsx` | `yet-another-react-lightbox` | dynamic import with ssr:false | WIRED | `const Lightbox = dynamic(() => import("yet-another-react-lightbox"), { ssr: false })` at line 16; `<Lightbox ...>` rendered in JSX |
| `deals/[id]/page.tsx` | `photo-tab.tsx` | PhotoTab rendered inside TabsContent | WIRED | `import { PhotoTab }` at line 19; `<PhotoTab photos={photos} dealId={id} />` inside `TabsContent value="photos"` |
| `deals/[id]/page.tsx` | `deal-blast-generator.tsx` | coverPhotoSasUrl prop from getDealCoverPhoto | WIRED | `coverPhotoSasUrl={coverPhoto?.sasUrl ?? null}` passed to `<DealBlastGenerator>` at line 171 |
| `photo-fab.tsx` | `photo-actions.ts` | uploadPhoto with no dealId/propertyId (inbox) | WIRED | `import { uploadPhoto }` at line 5; FormData created without dealId/propertyId; `await uploadPhoto(formData)` at line 79 |
| `photo-inbox.tsx` | `photo-actions.ts` | assignPhotosToDeal | WIRED | `import { assignPhotosToDeal, deletePhoto }` at line 7; `await assignPhotosToDeal(ids, dealId)` at line 51 |
| `deal-actions.ts` | `schema.ts` | UPDATE propertyPhotos SET dealId on Start Deal | WIRED | `import { propertyPhotos }` at line 4; `db.update(propertyPhotos).set({ dealId: inserted.id, isInbox: false }).where(and(eq(...), isNull(...)))` at lines 138–144 |
| `deals/page.tsx` | `schema.ts` + `deal-card.tsx` | Batch-fetch cover photos, pass as coverPhotos prop | WIRED | `inArray(propertyPhotos.dealId, dealIds)` + `eq(propertyPhotos.isCover, true)` query; `coverPhotos: Record<string,string>` passed through `DealsSearchWrapper` → `DealKanban`/`DealList` → `DealCard` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| PHOTO-01 | 14-01, 14-02 | Upload multiple photos with client-side compression (1600px max, JPEG 80%) and per-file progress | SATISFIED | `photo-upload.tsx`: `resizeImage` at 1600px max, JPEG 0.8; queue with per-file status badges |
| PHOTO-02 | 14-01, 14-02 | Photos organized by predefined categories; first Exterior photo auto-selected as cover | SATISFIED | `photoCategory` pgEnum in schema; category picker in upload UI; `uploadPhoto` action auto-sets `isCover=true` for first exterior photo |
| PHOTO-03 | 14-02 | Deal detail gallery grouped by category with full-screen lightbox (YARL) | SATISFIED | `photo-gallery.tsx`: groups by category with section headers; YARL lightbox with Captions plugin |
| PHOTO-04 | 14-03 | Photo Inbox at /photos/inbox for unassigned captures, accessible from sidebar | SATISFIED | `/photos/inbox` route exists; sidebar `Photos` nav item links there |
| PHOTO-05 | 14-03 | Mobile FAB opens camera for quick single-photo capture to inbox | SATISFIED | `photo-fab.tsx`: `md:hidden`, camera input `capture="environment"`, uploads to inbox |
| PHOTO-06 | 14-01, 14-03 | Photos attached to properties OR deals; carry over on Start Deal | SATISFIED | `propertyPhotos` schema has nullable FK for both; `createDeal` UPDATE carries property photos to new deal |
| PHOTO-07 | 14-03 | Deal cards show 48x48 cover photo thumbnail | SATISFIED | `deal-card.tsx`: `coverPhotoUrl` prop; `next/image` at 48x48 with `ImageOff` placeholder fallback |
| PHOTO-08 | 14-02 | Blast generator auto-populates cover photo SAS URL, field remains editable | SATISFIED | `deal-blast-generator.tsx`: `useState(coverPhotoSasUrl ?? "")` initializes field; input remains user-editable |
| PHOTO-09 | 14-01, 14-02 | Delete photos, set/change cover photo, edit captions from deal detail Photos tab | SATISFIED | `photo-gallery.tsx`: hover overlay with star (setPhotoCover), trash (deletePhoto), caption inline edit (updatePhotoCaption) |

All 9 PHOTO requirements satisfied. No orphaned requirements detected.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `photo-queries.ts` | 68 | `return null` | Info | Intentional — `getDealCoverPhoto` returns `null` when no cover exists; correct behavior |
| `photo-upload.tsx` | 305 | `placeholder=` | Info | HTML input placeholder attribute — not a stub pattern, normal UI |
| `photo-gallery.tsx` | 196 | `placeholder=` | Info | HTML input placeholder attribute — not a stub pattern, normal UI |

No blockers or warnings found. All three flagged lines are benign HTML attributes or correct null returns.

---

### Human Verification Required

The following behaviors require human testing on an actual mobile device or browser:

#### 1. iOS Safari Dual-Input Camera Behavior

**Test:** Open HouseFinder on iPhone Safari, navigate to a deal's Photos tab. Tap "Take Photo" button. Then tap "Add from Library" button.
**Expected:** "Take Photo" should open the camera directly. "Add from Library" should open the photo library with multi-select. Neither should cross-interfere with the other.
**Why human:** The `capture="environment"` attribute behavior and iOS multi-select interaction cannot be verified programmatically.

#### 2. Mobile FAB Positioning

**Test:** Open HouseFinder on a mobile device with safe-area insets (e.g., iPhone with notch). Scroll through the dashboard. Verify the FAB does not overlap the `MobileBottomNav` and respects safe-area insets.
**Expected:** FAB floats above the bottom nav with `env(safe-area-inset-bottom)` spacing applied correctly.
**Why human:** CSS `env()` safe-area behavior requires a real device with notch to verify.

#### 3. YARL Lightbox Swipe Navigation

**Test:** Open a deal with multiple photos. Click a photo to open the lightbox. Swipe or use keyboard arrows to navigate between photos.
**Expected:** Swipe navigation works smoothly; captions display correctly in overlay.
**Why human:** Touch gesture behavior and YARL lightbox rendering require a real browser session.

#### 4. Azure Blob Storage "photos" Container

**Test:** Upload a photo from the deal detail Photos tab. Verify the photo appears in the gallery with a valid SAS URL that loads the image.
**Expected:** Photo uploads to Azure Blob Storage `photos` container, SAS URL generated and renders `<img>` correctly.
**Why human:** Azure resources are currently shut down (2026-03-20). Container auto-creation and SAS URL generation require live Azure resources.

#### 5. Database Migration Applied to Production

**Test:** Verify migration `0006_powerful_devos.sql` has been applied to the Azure PostgreSQL instance before testing any photo upload or display functionality.
**Expected:** `property_photos` table and `photo_category` enum exist in the production database.
**Why human:** Cannot verify remote database state programmatically from this environment.

---

### Gaps Summary

No gaps found. All phase must-haves are verified.

The complete photo capture feature is implemented across all three plans:
- **Plan 01 (Data Layer):** `propertyPhotos` schema with migration, blob storage photo functions, 5 server actions (all auth-gated), 5 query functions with SAS URL generation.
- **Plan 02 (Deal UI):** `PhotoUpload` with dual iOS-safe inputs and per-file progress, `PhotoGallery` with YARL lightbox and category grouping, `PhotoTab` on deal detail page (5-tab layout), cover photo auto-wired to blast generator.
- **Plan 03 (Inbox/Everywhere):** Mobile FAB injected into dashboard layout, `PhotoInbox` page at `/photos/inbox` with assign-to-deal flow, sidebar navigation entry, `createDeal` photo carry-over (best-effort), deal card 48x48 cover thumbnails.

All 6 commits verified: `5e7dbd6`, `15bc8de`, `f62cadb`, `1e82713`, `7a93571`, `c775460`.

One production prerequisite remains (not a code gap): migration `0006_powerful_devos.sql` must be applied to Azure PostgreSQL and Azure resources must be running before the Photos feature goes live.

---

_Verified: 2026-04-05T22:50:00Z_
_Verifier: Claude (gsd-verifier)_
