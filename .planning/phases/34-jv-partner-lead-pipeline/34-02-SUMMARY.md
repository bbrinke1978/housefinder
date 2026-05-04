---
phase: 34-jv-partner-lead-pipeline
plan: 02
subsystem: ui
tags: [react, nextjs, azure-blob, rbac, mobile, jv-partner, server-actions]

requires:
  - phase: 34-jv-partner-lead-pipeline (plan 01)
    provides: jvLeads schema, jv_partner RBAC role with jv.submit_lead + jv.view_own_ledger, uploadJvLeadBlob + generateJvLeadSasUrl, canSubmitJvLead gate

provides:
  - submitJvLead() server action (jv-actions.ts) — auth + role gate + zod validation + address normalization + audit log + TODO(34-05) marker
  - POST /api/jv-leads/[id]/photo route — multipart upload to jv-leads container with row-level ownership enforcement
  - JvSubmitForm client component — photo-first mobile layout, camera/gallery pickers, resizeImage (1600px/0.8), two-step submit
  - /jv-submit server page — gated on sessionCan(jv.submit_lead), notFound() guard
  - isJvPartner boolean in DashboardLayout — passed to both bottom-nav and app-sidebar
  - Role-conditional bottom nav (2 items for jv_partner vs 6 for full users)
  - Role-conditional app-sidebar (2 items for jv_partner vs full workbench nav)
  - Middleware redirect: path=/ → /jv-ledger for jv_partner-only users

affects:
  - 34-03 (triage queue — Brian sees submitted jv_leads via /jv-leads)
  - 34-04 (payment ledger — /jv-ledger page that middleware now redirects to)
  - 34-05 (email notifications — grep finds TODO(34-05) marker in jv-actions.ts to wire notifyNewJvLeadSubmission)

tech-stack:
  added: []
  patterns:
    - "Two-step client submit: server action returns { id }, client then POSTs photo to /api/jv-leads/{id}/photo"
    - "resizeImage copied verbatim from photo-upload.tsx (project duplicate-not-shared convention)"
    - "isJvPartner = roles.includes('jv_partner') && !roles.includes('owner') — computed in layout, passed down as prop"
    - "notFound() gate on server pages for role-restricted routes (matches /admin/users Phase 30 pattern)"

key-files:
  created:
    - app/src/lib/jv-actions.ts
    - app/src/app/api/jv-leads/[id]/photo/route.ts
    - app/src/components/jv/jv-submit-form.tsx
    - app/src/app/(dashboard)/jv-submit/page.tsx
  modified:
    - app/src/components/bottom-nav.tsx
    - app/src/components/app-sidebar.tsx
    - app/src/app/(dashboard)/layout.tsx
    - app/src/middleware.ts

key-decisions:
  - "Two-step submit: server action creates jv_leads row first (returns id), then client POSTs photo to /api/jv-leads/{id}/photo — keeps server actions free of multipart/formData complexity"
  - "Photo block rendered BEFORE address field — mobile UX: user sees house, snaps photo, then types address"
  - "resizeImage duplicated (not factored into shared util) — project convention per photo-upload.tsx and feedback-form.tsx"
  - "TODO(34-05): notifyNewJvLeadSubmission(...) comment left at insertion point — Plan 05 executor greps this marker"
  - "Sticky submit button: fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] on mobile, static md:static — floats above bottom nav"
  - "isJvPartner computed in layout (single source) and passed as prop to both nav components — avoids duplicate session reads"

patterns-established:
  - "JV nav swap pattern: jvBottomNavItems / jvBaseNavItems arrays at module top, swap via isJvPartner prop in render"

requirements-completed: [JV-03, JV-04, JV-13, JV-14, JV-15]

duration: 3min
completed: 2026-05-03
---

# Phase 34 Plan 02: JV Partner Client Surface Summary

**Mobile-first lead submission form (photo-first → address → notes → two-step server-action + blob upload) with role-conditional nav (2 items for jv_partner) and middleware redirect from / to /jv-ledger**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-03T00:00:00Z
- **Completed:** 2026-05-03T00:03:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- `submitJvLead()` server action: auth + jv.submit_lead role gate + zod validation (5-500 char address, 2000 char notes) + address normalization + audit log entry + `// TODO(34-05): notifyNewJvLeadSubmission(...)` marker for Plan 05 to wire email
- `POST /api/jv-leads/[id]/photo` API route: multipart upload → jv-leads Azure container, row-level ownership (submitterUserId match), 10MB limit, returns `{ sasUrl, blobName }`
- `JvSubmitForm` client component: photo block first, camera/gallery pickers, `resizeImage()` (1600px/JPEG 0.8), two-step submit, sticky mobile button above bottom nav, error banner
- `/jv-submit` server page gated on `sessionCan(session, "jv.submit_lead")` with `notFound()` guard
- `isJvPartner` boolean derived in `DashboardLayout` and passed to both `AppSidebar` and `MobileBottomNav` — jv_partner-only users see exactly 2 nav items
- Middleware redirects `path === "/"` → `/jv-ledger` for jv_partner users without owner role

## Task Commits

1. **Task 1: submitJvLead server action + photo upload API route** - `3693e93` (feat)
2. **Task 2: Mobile-first jv-submit-form.tsx + page wrapper** - `6a8811f` (feat)
3. **Task 3: Role-conditional bottom nav + sidebar + middleware redirect** - `61f7ac8` (feat)

## Files Created/Modified

- `app/src/lib/jv-actions.ts` — NEW: submitJvLead() server action with normalizeAddress helper and TODO(34-05) marker
- `app/src/app/api/jv-leads/[id]/photo/route.ts` — NEW: POST multipart handler, row-level ownership, uploadJvLeadBlob, update photoBlobName
- `app/src/components/jv/jv-submit-form.tsx` — NEW: mobile-first client form with resizeImage, two-step submit, sticky button
- `app/src/app/(dashboard)/jv-submit/page.tsx` — NEW: server page with sessionCan gate and notFound() guard
- `app/src/components/bottom-nav.tsx` — Added jvBottomNavItems (Submit + Ledger), isJvPartner prop, nav swap
- `app/src/components/app-sidebar.tsx` — Added jvBaseNavItems (Submit Lead + My Ledger), isJvPartner prop, nav swap
- `app/src/app/(dashboard)/layout.tsx` — Added isJvPartner derivation, passed to both nav components
- `app/src/middleware.ts` — Added jv_partner redirect block (path=/ → /jv-ledger)

## Two-Step Submit Flow

```
Client: handleSubmit()
  Step 1 → submitJvLead({ address, conditionNotes })         [Server Action]
              ↳ auth() + userCan(roles, "jv.submit_lead")
              ↳ db.insert(jvLeads).returning({ id })
              ↳ logAudit("jv_lead.submitted")
              ↳ revalidatePath("/jv-leads") + revalidatePath("/jv-ledger")
              ↳ returns { id: string }
  Step 2 → POST /api/jv-leads/${id}/photo  (FormData: file=blob)
              ↳ auth() + userCan(roles, "jv.submit_lead")
              ↳ verify jvLeads row belongs to session.user.id
              ↳ uploadJvLeadBlob(buffer, `${jvLeadId}/${uuid}.jpg`, file.type)
              ↳ db.update(jvLeads).set({ photoBlobName, updatedAt })
              ↳ returns { sasUrl, blobName }
  On success → router.push("/jv-ledger?submitted=1")
```

## isJvPartner Derivation

```typescript
// app/src/app/(dashboard)/layout.tsx
const roles = ((session?.user as { roles?: string[] } | undefined)?.roles ?? []);
const isJvPartner = roles.includes("jv_partner") && !roles.includes("owner");
// Passed as prop to: <AppSidebar isJvPartner={isJvPartner} />
//                   <MobileBottomNav isJvPartner={isJvPartner} />
```

Owner users who also have `jv_partner` (unlikely but possible) see the full nav, not the restricted 2-item nav.

## TODO(34-05) Marker Location

```typescript
// app/src/lib/jv-actions.ts — line ~49, inside submitJvLead():
// TODO(34-05): notifyNewJvLeadSubmission(row.id)
```

Plan 05 executor should grep for `TODO(34-05)` in `jv-actions.ts` and replace this comment with the actual call once `notifyNewJvLeadSubmission()` is built.

## Decisions Made

- Two-step submit (server action → photo POST) keeps server actions clean of multipart/FormData complexity; matches feedback pattern from Plan 28
- Photo block placed BEFORE address input — mobile-first: user sees the property, snaps photo immediately, then types address
- `resizeImage` copied verbatim (not shared util) per project convention (photo-upload.tsx has its own copy, feedback-form.tsx has its own copy)
- Sticky submit button uses `fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-4 right-4` on mobile — floats above the 56px bottom nav bar + safe area inset
- `notFound()` gate on `/jv-submit` — prevents URL-leaked access for users without jv.submit_lead (matches /admin/users Phase 30 pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. tsc and next lint both clean with zero new warnings introduced across all 3 tasks.

## User Setup Required

None — all changes are code-only. No new env vars, no Azure container creation (jv-leads container auto-creates on first upload via createIfNotExists pattern from Plan 01).

## Next Phase Readiness

- Plan 03 (triage queue): Brian can now see submitted jv_leads in /jv-leads once Plan 03 ships the page
- Plan 04 (payment ledger): /jv-ledger page is what middleware redirects to; currently 404s until Plan 04 ships the page — acceptable per 34-02-PLAN.md risk note
- Plan 05 (notifications): grep `TODO(34-05)` in `app/src/lib/jv-actions.ts` to find the notifyNewJvLeadSubmission insertion point

---
*Phase: 34-jv-partner-lead-pipeline*
*Completed: 2026-05-03*

## Self-Check: PASSED

- All 8 modified files confirmed present on disk
- Commits 3693e93, 6a8811f, 61f7ac8 confirmed in git log
- No orphaned src/ edits in working tree
