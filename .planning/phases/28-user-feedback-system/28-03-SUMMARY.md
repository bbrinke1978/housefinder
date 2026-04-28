---
phase: 28-user-feedback-system
plan: "03"
subsystem: feedback-ui
tags: [feedback, ui, react, nextjs, shadcn, base-ui, nav]
dependency_graph:
  requires: [feedback-schema, feedback-backend]
  provides: [feedback-list-page, feedback-create-page, feedback-form, floating-report-button, feedback-nav-badge]
  affects:
    - app/src/app/(dashboard)/feedback/page.tsx (new)
    - app/src/app/(dashboard)/feedback/new/page.tsx (new)
    - app/src/components/feedback/feedback-list.tsx (new)
    - app/src/components/feedback/feedback-form.tsx (new)
    - app/src/components/feedback/feedback-type-badge.tsx (new)
    - app/src/components/feedback/feedback-status-badge.tsx (new)
    - app/src/components/feedback/feedback-priority-badge.tsx (new)
    - app/src/components/feedback/floating-report-button.tsx (new)
    - app/src/components/bottom-nav.tsx (modified)
    - app/src/components/app-sidebar.tsx (modified)
    - app/src/app/(dashboard)/layout.tsx (modified)
tech_stack:
  added:
    - react-markdown@9.1.0
    - remark-gfm@4.0.1
    - rehype-sanitize@6.0.0
  patterns:
    - base-ui Dialog.Root/Portal/Backdrop/Popup (same pattern as call-script-modal)
    - Server component async layout fetching badge count and passing as prop
    - Debounced search (400ms) updating URL params via router.replace
    - Paste-from-clipboard image capture via ClipboardEvent on textarea
    - Two-step form submit: createFeedbackItem then POST /api/feedback/[id]/attachments per image
key_files:
  created:
    - app/src/app/(dashboard)/feedback/page.tsx
    - app/src/app/(dashboard)/feedback/new/page.tsx
    - app/src/components/feedback/feedback-list.tsx
    - app/src/components/feedback/feedback-form.tsx
    - app/src/components/feedback/feedback-type-badge.tsx
    - app/src/components/feedback/feedback-status-badge.tsx
    - app/src/components/feedback/feedback-priority-badge.tsx
    - app/src/components/feedback/floating-report-button.tsx
  modified:
    - app/src/components/bottom-nav.tsx
    - app/src/components/app-sidebar.tsx
    - app/src/app/(dashboard)/layout.tsx
    - app/package.json
    - app/package-lock.json
decisions:
  - "FloatingReportButton uses @base-ui/react/dialog (not shadcn Dialog) — no Dialog component exists in ui/; base-ui is already in package.json and used by call-script-modal"
  - "Badge count fetched server-side in async DashboardLayout and passed as prop — avoids client fetch/hydration mismatch; count refreshes on each page navigation"
  - "AppSidebar icons refactored to a lookup Record<string,ElementType> to cleanly support the 10th nav item without a long per-item object"
  - "react-markdown deps installed here (Plan 03) per plan coordination note; usage is in Plan 04 detail view"
metrics:
  duration: "6min"
  completed: "2026-04-28"
  tasks_completed: 7
  files_changed: 11
---

# Phase 28 Plan 03: Feedback UI — List, Create Form, Floating Button, Nav Summary

Feedback list view, create form (modal + full-page), floating Report button on every authenticated page, and nav integration — all tsc-clean and production-ready.

## What Was Built

**Markdown dependencies (Task 1):**
- `react-markdown@9.1.0`, `remark-gfm@4.0.1`, `rehype-sanitize@6.0.0` installed. Not used in this plan but colocated here per coordination note (Plan 04 uses them for detail rendering).

**Three badge components (Task 2):**
- `FeedbackTypeBadge`: bug=red+Bug icon, feature=blue+Sparkles, idea=purple+Lightbulb, question=gray+HelpCircle
- `FeedbackStatusBadge`: new=blue, planned=cyan, in_progress=yellow, shipped=green, wontfix/duplicate=zinc
- `FeedbackPriorityBadge`: critical=red+animate-pulse, high=orange, medium=blue, low=zinc

**FeedbackForm client component (Task 3):**
- Controlled state for type/title/description/priority/propertyId/dealId
- Paste-from-clipboard handler on description textarea (max 5 images, 5MB each) per RESEARCH.md section 3
- File picker fallback with thumbnail grid and remove button
- Two-step submit: `createFeedbackItem()` returns `{id}`, then POST each image to `/api/feedback/[id]/attachments`
- Inline error display; redirects to `/feedback/[id]` or calls `onSuccess` in modal mode
- urlContext/browserContext shown as read-only page context info when provided

**Feedback list page + FeedbackList component (Task 4):**
- `/feedback` server component: auth-gated, reads status/type/priority/q/mine params, calls `listFeedbackItems`
- `FeedbackList` client component: search box (debounced 400ms via router.replace), status/type/priority selects, Mine toggle
- Card grid with type/status/priority badges, reporter name, relative time
- Empty state with link to `/feedback/new`

**New-item page (Task 5):**
- `/feedback/new` server component: auth-gated, reads optional `?propertyId` and `?dealId` search params
- Renders `FeedbackForm` with no `onSuccess` prop (redirects to detail on submit)
- Back link to `/feedback`

**FloatingReportButton + layout (Task 6):**
- Client component using `@base-ui/react/dialog` (matches existing `call-script-modal` pattern)
- Fixed `bottom-20 right-4` on mobile (above nav), `bottom-4` on desktop
- Hides itself on `/feedback/*` routes via `usePathname()`
- Pre-fills `urlContext` from `window.location.pathname + search`, `browserContext` from `navigator.userAgent`
- Dashboard layout wired: `<FloatingReportButton />` rendered once above `<MobileBottomNav />`

**Nav integration (Task 7):**
- `DashboardLayout` made async; fetches `countOpenFeedbackForUser(session.user.id)` server-side
- Badge count passed as prop to both `AppSidebar` and `MobileBottomNav`
- `MobileBottomNav`: Feedback (Bug icon) added as 6th item; badge dot shows count capped at "9+"
- `AppSidebar`: Feedback (Bug icon) added to main nav items; icon lookup map refactor

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No shadcn Dialog component in project**
- **Found during:** Task 6
- **Issue:** Plan referenced `shadcn Dialog` but `app/src/components/ui/` has no dialog.tsx — the project uses `@base-ui/react` (not radix/shadcn primitives) and already uses `Dialog` from `@base-ui/react/dialog` in `call-script-modal.tsx`.
- **Fix:** Used `@base-ui/react/dialog` (Dialog.Root, Dialog.Portal, Dialog.Backdrop, Dialog.Popup, Dialog.Close) — identical feature set, already in package.json, same animation data attributes pattern.
- **Files modified:** `app/src/components/feedback/floating-report-button.tsx`
- **Commit:** cb71ccc

## Self-Check: PASSED

Files created:
- app/src/components/feedback/feedback-type-badge.tsx — FOUND
- app/src/components/feedback/feedback-status-badge.tsx — FOUND
- app/src/components/feedback/feedback-priority-badge.tsx — FOUND
- app/src/components/feedback/feedback-form.tsx — FOUND
- app/src/components/feedback/feedback-list.tsx — FOUND
- app/src/components/feedback/floating-report-button.tsx — FOUND
- app/src/app/(dashboard)/feedback/page.tsx — FOUND
- app/src/app/(dashboard)/feedback/new/page.tsx — FOUND

TSC: PASS (npx tsc --noEmit clean throughout all 7 tasks)

Commits:
- b2e2875: chore(28-03): install react-markdown, remark-gfm, rehype-sanitize
- a6cb90e: feat(28-03): add feedback badge components (type, status, priority)
- e8ba77c: feat(28-03): add FeedbackForm client component
- b1951a5: feat(28-03): add feedback list page + FeedbackList client component
- 1adb2cf: feat(28-03): add /feedback/new full-page create form
- cb71ccc: feat(28-03): add FloatingReportButton and wire into dashboard layout
- 6f0cbde: feat(28-03): add Feedback nav item with badge to bottom nav + sidebar
