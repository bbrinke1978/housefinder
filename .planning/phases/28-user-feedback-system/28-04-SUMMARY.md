---
phase: 28-user-feedback-system
plan: "04"
subsystem: feedback-detail-ui
tags: [feedback, ui, react, nextjs, markdown, lightbox, optimistic-ui, base-ui]
dependency_graph:
  requires: [feedback-schema, feedback-backend, feedback-list-ui]
  provides: [feedback-detail-page, feedback-markdown-renderer, feedback-attachments-gallery, feedback-comment-thread, feedback-activity-timeline, feedback-status-controls]
  affects:
    - app/src/app/(dashboard)/feedback/[id]/page.tsx (new)
    - app/src/components/feedback/feedback-detail.tsx (new)
    - app/src/components/feedback/feedback-markdown.tsx (new)
    - app/src/components/feedback/feedback-attachments-gallery.tsx (new)
    - app/src/components/feedback/feedback-comment-thread.tsx (new)
    - app/src/components/feedback/feedback-activity-timeline.tsx (new)
    - app/src/components/feedback/feedback-status-controls.tsx (new)
tech_stack:
  added: []
  patterns:
    - react-markdown + remark-gfm + rehype-sanitize for GFM rendering with XSS protection
    - Fixed-overlay lightbox (no Dialog needed) for image zoom
    - usePasteImageHandler extracted hook for clipboard-to-image capture in comments
    - useOptimistic + useTransition for instant feedback on status/priority/assignee changes
    - base-ui Dialog.Root for confirm modals (same pattern as call-script-modal)
    - Parallel Promise.all in server component for item detail + users list
key_files:
  created:
    - app/src/components/feedback/feedback-markdown.tsx
    - app/src/components/feedback/feedback-attachments-gallery.tsx
    - app/src/components/feedback/feedback-comment-thread.tsx
    - app/src/components/feedback/feedback-activity-timeline.tsx
    - app/src/components/feedback/feedback-status-controls.tsx
    - app/src/components/feedback/feedback-detail.tsx
    - app/src/app/(dashboard)/feedback/[id]/page.tsx
  modified: []
decisions:
  - "Lightbox implemented as fixed-position overlay div (not Dialog) — simpler for image-only use case; no accessibility concerns for a 3-user internal tool"
  - "GalleryAttachment uploadedByName set to null in page.tsx mapping (v1: attachment query doesn't join users table; add join in v2 if needed)"
  - "Comment attachments fetched per-comment via existing attachments array filter on commentId — query already returns commentId; no extra DB hit needed"
  - "useOptimistic on status/priority/assignee in FeedbackStatusControls — revert-on-error pattern gives instant feel without inconsistent state"
  - "DetailAttachment extends GalleryAttachment with itemId + commentId nullable fields for proper filtering in FeedbackDetail"
metrics:
  duration: "~6min"
  completed: "2026-04-28"
  tasks_completed: 6
  files_changed: 7
---

# Phase 28 Plan 04: Feedback Detail Page Summary

Full detail view: sanitized GFM description, image gallery with lightbox, threaded comments with paste-from-clipboard, activity timeline with per-action icons, and optimistic status/priority/assignee controls with admin-gated terminal status options.

## What Was Built

**FeedbackMarkdown (Task 1):**
- Wraps `react-markdown` with `remark-gfm` (tables, task lists, strikethrough) + `rehype-sanitize` (no XSS)
- Custom `a` renderer: `target="_blank" rel="noopener noreferrer"`
- Custom `img` renderer: `max-w-full rounded-md loading="lazy"`
- Wrapped in `.prose.prose-sm.dark:prose-invert` Tailwind typography container

**FeedbackAttachmentsGallery (Task 2):**
- 3-col responsive thumbnail grid
- Click thumbnail → fixed-position lightbox overlay with close button
- Hover overlay shows filename, size in KB, uploader name
- Admin or uploader: X button calls `DELETE /api/feedback/[id]/attachments/[attachmentId]`
- Stale SAS URL detection: if `sasGeneratedAt` > 50 min ago, shows "Refresh page" warning
- Empty state: "(No attachments.)"

**FeedbackCommentThread (Task 3):**
- `CommentCard`: avatar initials, author name, relative timestamp, markdown body, delete button for author-or-admin
- `CommentForm`: textarea with `usePasteImageHandler` hook (extracted), file picker, image thumbnail preview grid, two-step submit (createFeedbackComment → POST attachments per image with commentId)
- Optimistic local comment append on post (server revalidates on next navigation)
- Empty state: "No comments yet. Be the first to add context."

**FeedbackActivityTimeline (Task 4):**
- Vertical timeline with left border + icon per action (Plus/Pencil/Tag/Flag/User/MessageSquare/Paperclip)
- `describeAction()` produces human-readable one-liners including shipNote extraction from JSON `new_value`
- Shows first 50 entries; "Show more" reveals 50 at a time
- Empty state: "No activity yet."

**FeedbackStatusControls (Task 5):**
- Three base-ui Select dropdowns: Status, Priority, Assignee
- Status options admin-gated: non-admins see 3 options (new/planned/in_progress); admins see all 6
- `useOptimistic` + `useTransition` for instant UI update, reverts on server error
- Confirm dialog (base-ui Dialog) for terminal statuses (shipped/wontfix/duplicate) with optional ship note for "shipped"
- Error banner renders below controls on failure

**Detail page + FeedbackDetail wrapper (Task 6):**
- `/feedback/[id]/page.tsx` server component: auth-gated, parallel fetch of `getFeedbackItemDetail(id)` + `users list`, `notFound()` if item missing/deleted
- `FeedbackDetail` client component: two-column desktop layout (main content | 280px sidebar), single-column mobile
- Header: type/status/priority badges, title, metadata row (reporter, assignee, created/updated), linked property/deal clickable badges
- Sidebar: FeedbackStatusControls + Details metadata card
- Main column: description (FeedbackMarkdown), attachments (FeedbackAttachmentsGallery), comments (FeedbackCommentThread), activity (FeedbackActivityTimeline)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] base-ui Select `onValueChange` types `string | null` not `string`**
- **Found during:** Task 5
- **Issue:** FeedbackStatusControls handlers typed as `(value: string) => void` but base-ui Select passes `string | null`; TSC error on 3 handlers.
- **Fix:** Updated all 3 handlers to accept `string | null` with null guards (`if (!value) return` or `!value || value === 'unassigned'` for assignee).
- **Files modified:** `app/src/components/feedback/feedback-status-controls.tsx`
- **Commit:** 9d2e8a4

**2. [Rule 2 - Missing] GalleryAttachment missing itemId/commentId for filtering**
- **Found during:** Task 6
- **Issue:** `feedback-detail.tsx` needed to filter `data.attachments` by `itemId` and `commentId` but `GalleryAttachment` type (defined in the gallery component) only had gallery-display fields.
- **Fix:** Added `DetailAttachment extends GalleryAttachment { itemId: string | null; commentId: string | null }` interface in `feedback-detail.tsx`. Updated page.tsx to map `FeedbackAttachment[]` to `DetailAttachment[]` shape (with `uploadedByName: null` since no user join exists).
- **Files modified:** `app/src/components/feedback/feedback-detail.tsx`, `app/src/app/(dashboard)/feedback/[id]/page.tsx`
- **Commit:** 8db59b9

## Self-Check: PASSED

Files created:
- app/src/components/feedback/feedback-markdown.tsx — FOUND
- app/src/components/feedback/feedback-attachments-gallery.tsx — FOUND
- app/src/components/feedback/feedback-comment-thread.tsx — FOUND
- app/src/components/feedback/feedback-activity-timeline.tsx — FOUND
- app/src/components/feedback/feedback-status-controls.tsx — FOUND
- app/src/components/feedback/feedback-detail.tsx — FOUND
- app/src/app/(dashboard)/feedback/[id]/page.tsx — FOUND

TSC: PASS (npx tsc --noEmit clean throughout all 6 tasks)

Commits:
- 85a0eb2: feat(28-04): add FeedbackMarkdown sanitized GFM renderer component
- a9702ae: feat(28-04): add FeedbackAttachmentsGallery with lightbox and delete support
- 7a74440: feat(28-04): add FeedbackCommentThread with paste-image upload and delete support
- 6154095: feat(28-04): add FeedbackActivityTimeline with icon-per-action and show-more pagination
- 9d2e8a4: feat(28-04): add FeedbackStatusControls with admin gate, optimistic UI, confirm dialog
- 8db59b9: feat(28-04): add feedback detail page + FeedbackDetail client wrapper
