---
phase: 28-user-feedback-system
verified: 2026-04-26T00:00:00Z
status: passed
score: 7/7 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Submit a bug report via the floating Report button on a non-feedback page"
    expected: "Modal opens pre-filled with current URL and user agent; item appears in /feedback list after submit; Brian receives email with type/title/priority/reporter name and deep link"
    why_human: "Cannot verify sub-30-second UX, modal animation, and live Resend delivery programmatically"
  - test: "Paste a screenshot from clipboard into the description textarea"
    expected: "Thumbnail appears immediately below the textarea; after submit the image is visible in the detail page attachments gallery via SAS URL"
    why_human: "ClipboardEvent paste behavior and Azure Blob round-trip require a live browser and running deployment"
  - test: "As Brian, change an item status to 'shipped' when the reporter is someone else"
    expected: "Reporter receives email '[Feedback] Shipped: {title}' with deep link; Brian does NOT receive the shipped email"
    why_human: "Resend fire-and-forget path requires live credentials and a second user account to observe"
  - test: "Log in as a non-admin user and attempt to set status to 'shipped' via the status dropdown"
    expected: "The dropdown only shows new/planned/in_progress; shipped/wontfix/duplicate options are absent"
    why_human: "Admin gate rendering logic depends on session state only verifiable in a live browser"
  - test: "Verify SAS URL expiry detection in attachments gallery"
    expected: "An attachment whose sasGeneratedAt is > 50 minutes ago shows 'Refresh page' warning instead of broken image"
    why_human: "Time-based stale detection requires either waiting or mocking Date.now in a live test"
---

# Phase 28: User Feedback System — Verification Report

**Phase Goal:** A logged-in user of No BS Workbench can post a bug report or feature request from any page in <30 seconds — including paste-from-clipboard screenshots — and Brian can triage and resolve them as a queryable backlog with threaded comments, status workflow, and email notifications. Replaces the "I'll remember to mention it" workflow with a durable, searchable record so nothing falls through the cracks when Brian checks at night.

**Verified:** 2026-04-26
**Status:** passed (automated checks) / human_verification pending for live UX
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Any logged-in user can navigate to /feedback, click New, fill a form (type/title/description), paste an image, and submit — item appears immediately in list | VERIFIED | `/feedback/page.tsx`, `/feedback/new/page.tsx`, `FeedbackForm` (378 lines), two-step submit in `FeedbackForm` calls `createFeedbackItem` then POSTs to `/api/feedback/[id]/attachments`; `listFeedbackItems` in server component renders immediately |
| 2  | List view filters by status/type/priority/assignee/free-text; defaults open-first by priority then newest | VERIFIED | `feedback-queries.ts:listFeedbackItems()` — all filter branches confirmed in 311-line file; FTS via `to_tsquery`; `FeedbackList` (201 lines) has debounced search + status/type/priority selects |
| 3  | Detail view shows markdown-rendered description, attachments gallery, comments thread, status/priority/assignee controls, activity timeline | VERIFIED | `FeedbackDetail` (319 lines) imports and renders all six sub-components: `FeedbackMarkdown`, `FeedbackAttachmentsGallery`, `FeedbackCommentThread`, `FeedbackStatusControls`, `FeedbackActivityTimeline`; all wired at lines 10-12, 253, 264, 276 |
| 4  | Image attachments survive page reload via 1-hour SAS URLs from Azure Blob `feedback` container | VERIFIED | `blob-storage.ts` exports `uploadFeedbackBlob`, `generateFeedbackSasUrl`, `deleteFeedbackBlob` for `feedback` container; `getFeedbackItemDetail()` generates SAS URLs server-side; stale SAS detection (>50 min) in gallery |
| 5  | Brian gets email on new item creation; reporter gets email when status → shipped; both contain deep link | VERIFIED | `email-actions.ts` (119 lines) exports `notifyNewFeedbackItem` + `notifyFeedbackShipped`; both wired fire-and-forget in `feedback-actions.ts` at lines where `createFeedbackItem` and `updateFeedbackStatus` call `.catch()`; self-notify guard confirmed |
| 6  | Floating Report button on every authenticated page auto-captures current URL + user agent | VERIFIED | `floating-report-button.tsx` (78 lines) rendered in `(dashboard)/layout.tsx` (import line + `<FloatingReportButton />`); hides on `/feedback/*` via `usePathname()`; `urlContext` from `window.location.pathname + search`, `browserContext` from `navigator.userAgent` |
| 7  | Items optionally link to property_id / deal_id shown as clickable badges in detail | VERIFIED | `feedbackItems` Drizzle table has `propertyId`/`dealId` nullable UUID FK columns; `FeedbackDetail` renders clickable badges at lines 197-213 when `data.propertyId` or `data.dealId` present |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/drizzle/0015_feedback_system.sql` | DB migration: 4 tables + 4 enums | VERIFIED | File exists; 16 statements including GIN FTS index and CHECK constraint |
| `app/scripts/migrate-0015-feedback-system.ts` | Migration runner with verification block | VERIFIED | 4 tables verified via `information_schema.tables`; dollar-quote-aware splitter |
| `app/src/db/schema.ts` | feedbackItems, feedbackComments, feedbackAttachments, feedbackActivity + 4 enums + 4 InferSelectModel types | VERIFIED | All 8 exports confirmed via grep; `check` and `sql` imports added |
| `app/src/lib/feedback-actions.ts` | 7 exported server actions + isAdmin helper | VERIFIED | 500 lines; all 7 exports confirmed: `isAdmin`, `createFeedbackItem`, `updateFeedbackItem`, `updateFeedbackStatus`, `createFeedbackComment`, `deleteFeedbackComment`, `deleteFeedbackItem` |
| `app/src/lib/feedback-queries.ts` | listFeedbackItems, getFeedbackItemDetail, countOpenFeedbackForUser | VERIFIED | 311 lines; all three exports present with FTS search, parallel Promise.all, SAS URL generation |
| `app/src/lib/blob-storage.ts` | uploadFeedbackBlob, generateFeedbackSasUrl, deleteFeedbackBlob | VERIFIED | All three helpers confirmed with correct `feedback` container constant |
| `app/src/lib/email-actions.ts` | notifyNewFeedbackItem, notifyFeedbackShipped | VERIFIED | 119 lines; both exports confirmed with getResend() guard pattern and .catch() fire-and-forget |
| `app/src/app/api/feedback/[id]/attachments/route.ts` | Multipart upload POST + DELETE routes | VERIFIED | File exists; POST wraps DB inserts in transaction; DELETE has uploader-or-admin gate |
| `app/src/app/(dashboard)/feedback/page.tsx` | List view page | VERIFIED | File exists |
| `app/src/app/(dashboard)/feedback/new/page.tsx` | Create form page | VERIFIED | File exists |
| `app/src/app/(dashboard)/feedback/[id]/page.tsx` | Detail view page | VERIFIED | File exists; `notFound()` on missing/deleted item |
| `app/src/components/feedback/feedback-form.tsx` | Create form with clipboard paste | VERIFIED | 378 lines; paste handler on textarea, file picker, two-step submit |
| `app/src/components/feedback/feedback-list.tsx` | Filterable list component | VERIFIED | 201 lines; debounced search, status/type/priority selects, Mine toggle |
| `app/src/components/feedback/feedback-detail.tsx` | Detail wrapper | VERIFIED | 319 lines; two-column layout, all sub-components wired |
| `app/src/components/feedback/feedback-comment-thread.tsx` | Threaded comments with paste | VERIFIED | 438 lines; `createFeedbackComment` called at line 263; paste handler via `usePasteImageHandler` |
| `app/src/components/feedback/feedback-status-controls.tsx` | Admin-gated status/priority/assignee controls | VERIFIED | 327 lines; `updateFeedbackStatus` called line 122; `updateFeedbackItem` called lines 145, 160; admin gate on terminal statuses |
| `app/src/components/feedback/feedback-activity-timeline.tsx` | Audit timeline | VERIFIED | File exists; wired in `FeedbackDetail` line 264 |
| `app/src/components/feedback/feedback-markdown.tsx` | Sanitized GFM renderer | VERIFIED | `remarkGfm` + `rehypeSanitize` both imported and applied to `ReactMarkdown` |
| `app/src/components/feedback/feedback-attachments-gallery.tsx` | Image gallery with lightbox | VERIFIED | File exists; SAS URL stale detection; delete via API route |
| `app/src/components/feedback/floating-report-button.tsx` | Floating button | VERIFIED | 78 lines; `@base-ui/react/dialog` pattern; hides on `/feedback/*` |
| `app/src/components/feedback/feedback-type-badge.tsx` | Type badge | VERIFIED | File exists |
| `app/src/components/feedback/feedback-status-badge.tsx` | Status badge | VERIFIED | File exists |
| `app/src/components/feedback/feedback-priority-badge.tsx` | Priority badge | VERIFIED | File exists |
| `app/src/components/email/feedback-new-item-email.tsx` | New-item email template | VERIFIED | `FeedbackNewItemEmailProps` interface + `buildFeedbackNewItemHtml()` export confirmed; `escapeHtml` present |
| `app/src/components/email/feedback-shipped-email.tsx` | Shipped email template | VERIFIED | `FeedbackShippedEmailProps` interface + `buildFeedbackShippedHtml()` export confirmed |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `floating-report-button.tsx` | `(dashboard)/layout.tsx` | import + `<FloatingReportButton />` | WIRED | Confirmed at both import and usage lines in layout.tsx |
| `FeedbackForm` | `createFeedbackItem` server action | import + call in submit handler | WIRED | Form imports and calls action; redirects to `/feedback/[id]` on success |
| `FeedbackForm` | `POST /api/feedback/[id]/attachments` | `fetch()` per pending image after item creation | WIRED | Two-step submit pattern confirmed in feedback-form.tsx |
| `FeedbackStatusControls` | `updateFeedbackStatus` | import + call in status change handler | WIRED | Lines 15, 122 in feedback-status-controls.tsx |
| `FeedbackStatusControls` | `updateFeedbackItem` | import + call for priority/assignee | WIRED | Lines 16, 145, 160 in feedback-status-controls.tsx |
| `FeedbackCommentThread` | `createFeedbackComment` | import + call in comment submit | WIRED | Lines 6, 263 in feedback-comment-thread.tsx |
| `createFeedbackItem` | `notifyNewFeedbackItem` | import + unawaited call with `.catch()` | WIRED | Lines confirmed in feedback-actions.ts; fire-and-forget pattern |
| `updateFeedbackStatus` | `notifyFeedbackShipped` | import + unawaited call with `.catch()` + self-notify guard | WIRED | Conditional on `newStatus === 'shipped'` and reporter != actor |
| `email-actions.ts` | `feedback-new-item-email.tsx` | import `buildFeedbackNewItemHtml` | WIRED | Confirmed via grep |
| `email-actions.ts` | `feedback-shipped-email.tsx` | import `buildFeedbackShippedHtml` | WIRED | Confirmed via grep |
| `feedback-queries.ts` | `generateFeedbackSasUrl` from blob-storage | import + call for each attachment in detail query | WIRED | `getFeedbackItemDetail()` generates SAS URLs server-side |
| `app-sidebar.tsx` | `/feedback` nav | "Feedback" item with Bug icon in nav items array | WIRED | Line 29: `{ label: "Feedback", href: "/feedback" }` + icon lookup |
| `bottom-nav.tsx` | `/feedback` nav | 6th item with badge dot | WIRED | Line 15: `{ label: "Feedback", href: "/feedback", icon: Bug }` + badge at lines 37, 57 |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| **FB-01** | Create feedback item (type/title/description, status='new', reporter_id set) | SATISFIED | `createFeedbackItem` validates type/title (max 200) + priority enums; inserts with `status: "new"` and `reporterId: session.user.id`; `FeedbackForm` client with all required fields |
| **FB-02** | List with filters (status/type/priority/assignee/FTS search); sort open-first, priority desc, newest | SATISFIED | `listFeedbackItems()` implements all 5 filter dimensions + FTS via `to_tsquery`; ORDER BY: `CASE WHEN status IN (shipped/wontfix/duplicate) THEN 1 ELSE 0 END`, then priority desc, then created_at desc; `FeedbackList` UI component wired to URL params |
| **FB-03** | Detail page: title, type, priority, status, reporter, assignee, timestamps, markdown description, attachments, comments, activity timeline | SATISFIED | `FeedbackDetail` renders all required fields; `FeedbackMarkdown` for description; `FeedbackAttachmentsGallery`, `FeedbackCommentThread`, `FeedbackActivityTimeline` all wired; server fetches via `getFeedbackItemDetail` with parallel reads |
| **FB-04** | Image attachments: file picker + paste-from-clipboard; Azure Blob `feedback` container; 1-hour SAS URLs | SATISFIED | `FeedbackForm` has clipboard paste handler + file picker; `uploadFeedbackBlob`/`generateFeedbackSasUrl` helpers confirmed; `POST /api/feedback/[id]/attachments` route handles multipart upload to Blob |
| **FB-05** | Markdown-formatted comments; timestamped; linked to author; chronological order | SATISFIED (code complete; REQUIREMENTS.md stale) | `FeedbackCommentThread` (438 lines): `CommentCard` shows avatar/author/timestamp/markdown body; `CommentForm` calls `createFeedbackComment`; comments sorted chronologically by `getFeedbackItemDetail` query; REQUIREMENTS.md has `[ ]` but code ships full implementation — this is a documentation lag, not a code gap |
| **FB-06** | Floating Report button on every authenticated page; pre-fills current URL + user agent | SATISFIED | `FloatingReportButton` in dashboard `layout.tsx`; `urlContext` from `window.location.pathname + search`; `browserContext` from `navigator.userAgent`; hides on `/feedback/*` |
| **FB-07** | Status/priority/assignee changes from detail; all changes in activity timeline with actor + timestamp | SATISFIED (code complete; REQUIREMENTS.md stale) | `FeedbackStatusControls` (327 lines) wires all three controls; `updateFeedbackStatus` records `action='status_changed'`; `updateFeedbackItem` records `action='priority_changed'`/`action='assigned'` with old/new values; REQUIREMENTS.md has `[ ]` but code fully implements — same documentation lag as FB-05 |
| **FB-08** | Brian notified on new item; reporter notified on shipped; both emails have deep link | SATISFIED | `notifyNewFeedbackItem` sends to `BRIAN_EMAIL`; `notifyFeedbackShipped` sends to reporter; deep links as `${APP_BASE_URL}/feedback/{id}`; self-notify guard for when Brian ships his own item; fire-and-forget with `.catch()` |
| **FB-09** | Optional property_id / deal_id FK links; detail view shows clickable badges | SATISFIED | `feedbackItems` table has `propertyId`/`dealId` nullable FK columns; `FeedbackForm` accepts `propertyId`/`dealId` props; `FeedbackDetail` renders clickable `/properties/{id}` and `/deals/{id}` badges when set |
| **FB-10** | All CRUD auth-gated; only Brian can set shipped/wontfix/duplicate or delete any item; author-or-admin can delete own comments/attachments | SATISFIED | Every server action has `const session = await auth(); if (!session?.user?.id) throw Error("Unauthorized")`; `ADMIN_ONLY_STATUSES = ["shipped","wontfix","duplicate"]` gated by `isAdmin(session)` at line 267; `deleteFeedbackComment` has `comment.authorId !== userId && !isAdmin(session)` check; `deleteFeedbackItem` is admin-only |

**Notes on FB-05 and FB-07 REQUIREMENTS.md state:** Both are marked `[ ]` (unchecked) in `.planning/REQUIREMENTS.md` but the code is fully implemented, committed, and verified in this report. This is a REQUIREMENTS.md documentation lag — the implementation shipped in Plan 04 (8db59b9) but the requirements file was not updated to check these off. No code change needed; REQUIREMENTS.md should be updated to mark both as `[x]`.

---

### ROADMAP Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|---------|
| 1 | Any logged-in user can navigate to /feedback, click New, choose type, enter title+description, paste image, submit — item appears in list | VERIFIED | Full form + create action + list page all wired |
| 2 | List view supports filtering by status/type/priority/assignee/search; defaults open-first by priority then newest | VERIFIED | `listFeedbackItems` implements all filters; ORDER confirmed |
| 3 | Detail view shows markdown description, attachments, comments, status/priority/assignee controls, activity timeline | VERIFIED | All 6 sub-components wired in `FeedbackDetail` |
| 4 | Image attachments survive page reload via 1-hour SAS URLs from Azure Blob `feedback` container | VERIFIED | SAS URL generation in `getFeedbackItemDetail`; stale detection in gallery |
| 5 | Brian gets email on new item; reporter gets email on shipped; both have deep link | VERIFIED | `email-actions.ts` + wiring in `feedback-actions.ts` confirmed |
| 6 | Floating Report button on every authenticated page auto-captures URL + user agent | VERIFIED | Layout.tsx wiring + `floating-report-button.tsx` implementation |
| 7 | Items optionally link to property_id / deal_id as clickable badges | VERIFIED | FK columns in schema + badge rendering in `FeedbackDetail` |

**Score: 7/7 success criteria verified**

---

### ROADMAP Plan Checklist Discrepancy

The ROADMAP.md plan list for Phase 28 shows `28-05-PLAN.md` as `[ ]` (unchecked), but:
- The progress table correctly shows `5/5 | Complete | 2026-04-28`
- All four Plan 05 commits exist and verified (859b937, b88a81b, 30ce90e, fcf21e4)
- `28-05-SUMMARY.md` records `completed: 2026-04-26` and `tasks_completed: 4`

This is a cosmetic ROADMAP housekeeping gap — the plan checkbox was not toggled after the summary was written. Does not affect functionality.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `feedback-status-controls.tsx` | 303-304 | `placeholder=` attribute text (UI input placeholder) | Info | Normal UI element, not a code stub |
| `feedback-comment-thread.tsx` | 320-321 | `placeholder=` attribute text (UI input placeholder) | Info | Normal UI element, not a code stub |
| `feedback-queries.ts` | 252 | `return null` (correct soft-delete guard) | Info | Expected behavior, not a stub |
| `email-actions.ts` | 25 | `return null` (missing RESEND_API_KEY guard) | Info | Intentional safe fallback, not a stub |

No blockers. No functional stubs. No TODO/FIXME/HACK/PLACEHOLDER code comments.

---

### TypeScript Compilation

`npx tsc --noEmit` completed with **zero errors** (empty output = clean). Confirmed across all 5 plans during execution and verified again in this verification run.

---

### Human Verification Required

#### 1. End-to-end create flow via floating button

**Test:** From any non-feedback dashboard page, click the floating bug icon in the bottom-right. Fill in a bug report title and paste a screenshot from clipboard.
**Expected:** Modal opens with current URL pre-filled. After submit, item appears in /feedback list. Brian's email (bbrinke1978@gmail.com) receives `[Feedback] bug: {title}` within ~5 seconds.
**Why human:** Sub-30-second UX timer, modal animation, and live Resend delivery cannot be verified programmatically.

#### 2. Paste-from-clipboard image capture

**Test:** Open the new feedback form or a comment form, paste a screenshot using Ctrl+V / Cmd+V while the description textarea is focused.
**Expected:** Thumbnail appears immediately below the textarea. After item submit, the attachment is visible in the detail page gallery and loads correctly via SAS URL.
**Why human:** ClipboardEvent paste behavior varies by browser and requires a live browser environment. Azure Blob round-trip requires live credentials.

#### 3. Admin gate on terminal status transitions

**Test:** Log in as a non-admin user. Open any feedback item detail page. Check the Status dropdown.
**Expected:** Options show only `new`, `planned`, `in_progress`. Options `shipped`, `wontfix`, `duplicate` are not visible or are disabled.
**Why human:** Admin gate rendering depends on session.user.email === 'bbrinke1978@gmail.com' which requires a live multi-user test.

#### 4. Shipped email notification (not self-notify)

**Test:** As Brian, create a feedback item as a different user (or use existing), then set status to `shipped`.
**Expected:** Reporter receives email `[Feedback] Shipped: {title}` with deep link. Brian does NOT receive a shipped notification for his own items.
**Why human:** Requires two user sessions and live Resend delivery.

#### 5. SAS URL stale detection

**Test:** View the attachments gallery on an item whose attachment was uploaded more than 50 minutes ago (or temporarily change the threshold to 1 minute for testing).
**Expected:** Gallery shows a "Refresh page to reload images" warning instead of the attachment thumbnail.
**Why human:** Time-based expiry logic requires either waiting or mocking Date.now in a live session.

---

## Gaps Summary

No gaps. All 10 requirements (FB-01 through FB-10) are implemented in the codebase. All 7 ROADMAP success criteria are met. All 25 required artifacts exist, are substantive (non-stub), and are correctly wired. TypeScript compiles clean.

**Documentation lags to clean up (not blocking):**
1. `REQUIREMENTS.md` — FB-05 and FB-07 should be marked `[x]` (code ships full implementation, REQUIREMENTS.md not updated after Plan 04)
2. `ROADMAP.md` — `28-05-PLAN.md` plan checkbox should be toggled to `[x]` (plan ran and completed; progress table already shows 5/5)

---

_Verified: 2026-04-26_
_Verifier: Claude (gsd-verifier)_
