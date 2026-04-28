---
phase: 28-user-feedback-system
plan: "02"
subsystem: backend-api
tags: [feedback, server-actions, blob-storage, api-routes, drizzle, auth]
dependency_graph:
  requires: [feedback-schema]
  provides: [feedback-actions, feedback-queries, feedback-blob-helpers, feedback-attachment-api]
  affects:
    - app/src/lib/blob-storage.ts
    - app/src/lib/feedback-actions.ts (new)
    - app/src/lib/feedback-queries.ts (new)
    - app/src/app/api/feedback/[id]/attachments/route.ts (new)
    - app/src/app/api/feedback/[id]/attachments/[attachmentId]/route.ts (new)
tech_stack:
  added: []
  patterns:
    - drizzle transaction with .transaction(async tx => ...)
    - parallel Promise.all for detail page reads
    - Azure Blob private container + 1-hour SAS URLs
    - NextAuth session guard on every server action
    - isAdmin(session) helper gating terminal status transitions
    - sql`` template tag for Postgres FTS to_tsquery + CASE ORDER BY
key_files:
  created:
    - app/src/lib/feedback-actions.ts
    - app/src/lib/feedback-queries.ts
    - app/src/app/api/feedback/[id]/attachments/route.ts
    - app/src/app/api/feedback/[id]/attachments/[attachmentId]/route.ts
  modified:
    - app/src/lib/blob-storage.ts
decisions:
  - "updateFeedbackItem uses Record<string,unknown> + `as any` for dynamic patch set — avoids over-engineering a typed partial update for a low-volume admin tool"
  - "deleteFeedbackItem activity action uses 'resolved' enum value (not 'deleted') since enum from Plan 01 has no 'deleted' value; newValue='deleted' string captures intent"
  - "FTS search in listFeedbackItems splits whitespace into AND terms via to_tsquery — consistent with how GitHub/Linear default search works"
metrics:
  duration: "~4min"
  completed: "2026-04-28"
  tasks_completed: 4
  files_changed: 5
---

# Phase 28 Plan 02: Feedback Backend Layer Summary

Server actions, read queries, blob helpers, and multipart upload API routes for the feedback system — all production-ready, auth-gated, and tsc-clean.

## What Was Built

**blob-storage.ts extended** with three new feedback helpers:
- `uploadFeedbackBlob(buffer, blobName, contentType)` — uploads to the `feedback` container, calls `createIfNotExists()` for idempotent first-run
- `generateFeedbackSasUrl(blobName)` — 1-hour read SAS URL, mirrors `generatePhotoSasUrl` exactly
- `deleteFeedbackBlob(blobName)` — idempotent `deleteIfExists`, for soft-delete cleanup

**feedback-queries.ts** (new file):
- `listFeedbackItems(filters)` — filters by status/type/priority/assigneeId/reporterId/search, FTS via `to_tsquery`, excludes soft-deleted unless `includeDeleted:true`, sorts open-first then priority desc then created_at desc, caps at 200 rows
- `getFeedbackItemDetail(id)` — parallel `Promise.all` for item + comments + attachments + activity; generates SAS URLs server-side for attachments; excludes deleted children; returns null if item missing or deleted
- `countOpenFeedbackForUser(userId)` — count of open items assigned to a user, for nav-bar badge

**feedback-actions.ts** (new file, `"use server"`):
- `createFeedbackItem(input)` — auth-gated, validates title length + type + priority enums, wraps INSERT in transaction with activity audit `action='created'`
- `updateFeedbackItem(id, patch)` — auth-gated, locks title/description to reporter-or-admin after 5 minutes, inserts activity row per changed field
- `updateFeedbackStatus(id, newStatus, shipNote?)` — admin gate for shipped/wontfix/duplicate; sets `resolvedAt`; stores ship note as JSON in activity `new_value`
- `createFeedbackComment(itemId, body)` — auth-gated, verifies parent item exists, inserts comment + activity `action='comment_added'`
- `deleteFeedbackComment(commentId)` — author-or-admin gate, soft-delete, activity `action='attachment_removed'` (nearest enum value)
- `deleteFeedbackItem(id)` — admin-only, cascade soft-delete of child comments + attachments in same transaction, activity audit
- `isAdmin(session)` — pure helper exported for API route reuse; gates on `bbrinke1978@gmail.com`

**API Routes** (new files):
- `POST /api/feedback/[id]/attachments` — multipart form upload, image-only validation, 5MB limit, uploads via `uploadFeedbackBlob`, inserts `feedback_attachments` + `feedback_activity` in transaction, returns `{ id, sasUrl }`
- `DELETE /api/feedback/[id]/attachments/[attachmentId]` — uploader-or-admin gate, soft-deletes attachment, inserts `feedback_activity action='attachment_removed'`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] updateFeedbackItem dynamic patch type**
- **Found during:** Task 3
- **Issue:** Building a `Record<string,unknown>` for dynamic field patching caused a Drizzle type mismatch on `.set()`. Initial attempt used a complex conditional type cast that evaluated to `never`.
- **Fix:** Replaced with `as any` cast (with eslint-disable comment). The runtime behavior is identical; Drizzle accepts a plain object. Documented with comment.
- **Files modified:** `app/src/lib/feedback-actions.ts`
- **Commit:** 9cad396

**2. [Rule 2 - Missing] Transaction wrapping for attachment API route**
- **Found during:** Task 4
- **Issue:** Plan showed `db.insert()` + `db.insert()` separately; without a transaction, a failed activity insert would leave an orphaned attachment row.
- **Fix:** Wrapped both inserts in `db.transaction(async tx => ...)` in the POST route.
- **Files modified:** `app/src/app/api/feedback/[id]/attachments/route.ts`
- **Commit:** 9cad396

## Self-Check: PASSED

Files created:
- app/src/lib/feedback-actions.ts — FOUND
- app/src/lib/feedback-queries.ts — FOUND
- app/src/app/api/feedback/[id]/attachments/route.ts — FOUND
- app/src/app/api/feedback/[id]/attachments/[attachmentId]/route.ts — FOUND

blob-storage.ts extended:
- FEEDBACK_CONTAINER + uploadFeedbackBlob + generateFeedbackSasUrl + deleteFeedbackBlob — FOUND (11 references)

TSC: PASS (npx tsc --noEmit clean throughout)

Commits:
- 4a9ad59: feat(28-02): add feedback blob-storage helpers
- 85d2196: feat(28-02): create feedback-queries.ts with list + detail readers
- 80640cf: feat(28-02): create feedback-actions.ts server actions
- 9cad396: feat(28-02): create attachment upload API routes
