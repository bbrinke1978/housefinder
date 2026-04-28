# Phase 28: User Feedback System — Context

**Gathered:** 2026-04-27
**Status:** Ready for planning
**Source:** Conversation with Brian (2026-04-27 evening)

<domain>
## Phase Boundary

This phase delivers an internal, Jira-style bug + feature-request tracker built into No BS Workbench. It is for the existing 3-user team (Brian + team), not a public-facing customer-feedback portal.

**In scope:**
- CRUD for feedback items (create, list, view detail, edit status/priority/assignee, soft-delete)
- Image attachments (paste-from-clipboard + file picker) — primarily for bug screenshots
- Markdown description + threaded markdown comments
- Status workflow: new → planned → in_progress → shipped (or wontfix/duplicate)
- Activity timeline showing every status/priority/assignee change with actor + timestamp
- Email notifications: Brian on new-item creation, reporter on status-change-to-shipped
- Floating "Report" button on every authenticated page that pre-fills current URL + user agent
- Optional links to a property or deal so context-specific bugs carry through
- Free-text search + filter by status/type/priority/assignee
- Mobile-friendly (Brian uses the app on mobile per existing UI patterns)

**Out of scope (explicitly deferred):**
- Public-facing feedback portal (this is internal-team only)
- Email-to-issue parsing (e.g. forward an email to feedback@... — too much SMTP work for the value)
- Slack/Discord integration
- Voting / upvotes (only 3 users — not enough signal)
- Sprint planning, story points, sprint velocity charts
- Custom fields per type (a "bug" form vs "feature" form — over-engineered)
- Markdown WYSIWYG editor (use plain textarea + render on view; can upgrade later)
- Saved filter views / dashboards
- Issue dependencies / parent-child links (Brian can mention IDs in description if needed)
- @-mentions in comments (3-user team — easier to just talk)
- File attachments other than images (PDFs, logs — defer until we hit a real need)
- Drag-and-drop kanban board (use status filter for now; can add board view later)
- Auto-detect duplicates (hard problem; manual `duplicate` status is enough for 3 users)

</domain>

<decisions>
## Implementation Decisions (locked)

### Architecture
- **Single Next.js app, not a separate service.** Lives at `/feedback` inside the existing No BS Workbench app. Reuses auth, DB, blob storage, email infrastructure that already exists.
- **Postgres-only persistence** via existing Drizzle setup. No Redis, no separate datastore. The volume is tiny (3 users, maybe 10-20 items per week).
- **Same blob-storage pattern as photos/contracts/floor-plans.** New `feedback` container in the existing Azure Storage account. Private container, accessed via 1-hour SAS URLs. Reuses `app/src/lib/blob-storage.ts` helpers.
- **Existing Resend integration for email notifications.** No new external dependency.

### Schema
Four new tables:
- `feedback_items` — the main ticket. Columns: id, type, title, description, status, priority, reporter_id, assignee_id, property_id (nullable FK to properties), deal_id (nullable FK to deals), url_context, browser_context, created_at, updated_at, resolved_at, deleted_at (soft-delete).
- `feedback_comments` — threaded comments. Columns: id, item_id, author_id, body (markdown), created_at, deleted_at.
- `feedback_attachments` — image uploads. Columns: id, item_id, blob_name, mime_type, size_bytes, uploaded_by, uploaded_at, deleted_at.
- `feedback_activity` — audit log. Columns: id, item_id, actor_id, action (`created`, `status_changed`, `priority_changed`, `assigned`, `comment_added`, `attachment_added`, `attachment_removed`, `resolved`, `reopened`), old_value, new_value, created_at.

Soft-delete via `deleted_at` timestamp on items, comments, and attachments — preserves audit trail.

### Type / Status / Priority enums
- **type**: `bug` | `feature` | `idea` | `question` (4 values; covers 95% of intent without over-categorizing)
- **status**: `new` | `planned` | `in_progress` | `shipped` | `wontfix` | `duplicate`
  - `new` is the default. Brian triages → `planned` or `wontfix`/`duplicate`. When work starts → `in_progress`. When deployed → `shipped`.
  - `shipped` is the only status that triggers a reporter-notification email.
- **priority**: `low` | `medium` | `high` | `critical` (4 levels; default `medium`)

### Authorization
- All authenticated users (currently 3) can: create items, comment, upload attachments, change priority/assignee on items they reported.
- **Only Brian** (or a future `admin` role on `users`) can: change status to `shipped`/`wontfix`/`duplicate`, delete any item, delete other users' comments/attachments. (No explicit admin role added in this phase — gate on `email === 'bbrinke1978@gmail.com'` for now; trivial to refactor when a third admin is added.)
- Soft-delete only. Hard-delete reserved for storage cleanup later.

### UI placement
- New item in main nav (desktop sidebar + mobile bottom-nav): "Feedback" with a small badge showing the count of open items assigned to the current user (or just open items if none assigned).
- **Floating "Report" button** in bottom-right corner of every authenticated page (z-index above content but below modals). Mobile-friendly thumb position. Opens a modal with the new-item form pre-filled with `urlContext` (`window.location.pathname + search`) and `browserContext` (`navigator.userAgent`). The button is rendered from the existing layout shell so all authenticated routes inherit it without per-page changes.

### Markdown handling
- Description and comment bodies stored as raw markdown (text column).
- Render via `react-markdown` + `remark-gfm` (GitHub-flavored: tables, strikethrough, task lists). These are already in the dependency graph if `react-markdown` is present; if not, add them — they're tiny.
- **No WYSIWYG.** Plain textarea with a small "supports markdown" hint underneath. Brian and team are technical enough; the simplicity is worth more than the polish.
- Sanitize via `rehype-sanitize` to prevent script injection in description rendering.

### Image upload UX
- Two paths in the create form and comment form:
  1. **Paste from clipboard** (primary use case for bug screenshots). Listen for `paste` events on the form's textarea; if `event.clipboardData` contains an image blob, capture it, show a thumbnail, and submit it on form submit.
  2. **File picker** as fallback for non-clipboard images. `<input type="file" accept="image/*" multiple>`.
- Upload happens AFTER the item/comment is created (server returns id, then attachment uploads attach by item_id). This keeps the upload optional and the create step fast.
- Max 5 images per item or comment, max 5MB per image. Reject larger files client-side with a clear error.
- Compress on upload via the `browser-image-compression` library (or skip and accept full-size — Azure Blob handles it; cost is negligible at this scale). Decision: **skip compression for v1**; revisit if storage cost becomes a concern.

### Email notifications
- **New item:** email Brian only (since he triages at night). Subject: `[Feedback] {type}: {title}`. Body: priority, reporter, type, title, first 500 chars of description, deep link.
- **Status → shipped:** email reporter. Subject: `[Feedback] Shipped: {title}`. Body: link, optional ship-note from the actor.
- **Comment added:** no email (over-emails the team; revisit if comments become noisy).
- All emails sent via existing `lib/email-actions.ts` Resend integration. Fire-and-forget (don't block the user's submission on the email send; log failures and move on).

### Search
- Postgres full-text search using `to_tsvector` on `title || description`. Add a GIN index on `to_tsvector('english', title || ' ' || description)` for fast LIKE-replacement.
- Comment search not in v1 (out of scope).

### Performance
- Tiny volume (likely < 1000 items in year 1). No pagination needed in v1; cap list at 200 items with a "load more" button if/when count exceeds.
- Activity timeline cap: show last 50 activity entries; "show more" button for older.

</decisions>

<specifics>
## Specific Patterns to Mirror

- `app/src/lib/blob-storage.ts` already has `uploadPhotoBlob` + `generatePhotoSasUrl` for the `photos` container. Add identical helpers for `feedback` container (`uploadFeedbackBlob`, `generateFeedbackSasUrl`). Use `image/png` as default contentType (paste-from-clipboard is usually PNG).
- `app/src/lib/email-actions.ts` already wraps Resend with the right sender + signature defaults. Reuse for the two notification types.
- `app/src/lib/photo-actions.ts` shows the pattern for "create-then-attach" upload flow. Mirror this for feedback attachments.
- Existing `users` table is the FK source for reporter / assignee / author. Use `bcryptjs`-hashed auth, NextAuth session pattern (already integrated via `app/src/auth.ts`).
- `app/src/components/property-detail-tabs.tsx` (or similar) shows the pattern for tabbed detail views — reuse for description / comments / activity tabs on the item detail page if useful.
- Tailwind + shadcn/ui components throughout (Button, Card, Badge, Dialog, Select, Textarea, Input). No new design system pieces.

## Specific File Layout

```
app/src/
  app/(dashboard)/feedback/
    page.tsx                         # list view
    [id]/page.tsx                    # detail view
    new/page.tsx                     # create form (also opens as modal via floating button)
  components/feedback/
    feedback-list.tsx                # list table with filters
    feedback-detail.tsx              # detail page body
    feedback-form.tsx                # create form (used in modal + page)
    feedback-comment-thread.tsx      # comments list + add form
    feedback-attachments-gallery.tsx # image grid
    feedback-activity-timeline.tsx   # audit log
    feedback-status-controls.tsx     # status/priority/assignee selects
    floating-report-button.tsx       # bottom-right always-on button
  lib/
    feedback-actions.ts              # server actions: create/list/get/update/delete + comments + attachments
    feedback-queries.ts              # read queries (list with filters, detail with joins)
    blob-storage.ts                  # add uploadFeedbackBlob + generateFeedbackSasUrl
    email-actions.ts                 # add notifyNewFeedbackItem + notifyFeedbackShipped
  db/schema.ts                       # add feedbackItems, feedbackComments, feedbackAttachments, feedbackActivity
drizzle/
  0015_feedback_system.sql           # tables + indexes + enums
```

## Specific Drizzle Enum Names

To match the existing `signal_type` / `signal_status` / `owner_type` enum pattern in `app/src/db/schema.ts`:
- `feedback_type_enum`: `bug`, `feature`, `idea`, `question`
- `feedback_status_enum`: `new`, `planned`, `in_progress`, `shipped`, `wontfix`, `duplicate`
- `feedback_priority_enum`: `low`, `medium`, `high`, `critical`
- `feedback_activity_action_enum`: `created`, `status_changed`, `priority_changed`, `assigned`, `comment_added`, `attachment_added`, `attachment_removed`, `resolved`, `reopened`

</specifics>

<deferred>
## Explicitly Deferred to v2 / Future

These came up in discussion but are out of scope for Phase 28:

- **Email-to-issue intake** (forward an email to a Resend inbound address to create an item)
- **Slack / Discord webhook** for new items
- **Voting / upvotes** on feature requests
- **Sprint planning** / story points / velocity tracking
- **Custom fields per type** (a different form schema for bugs vs features)
- **Markdown WYSIWYG editor** (e.g. `@uiw/react-md-editor`)
- **Auto-detect duplicates** (NLP similarity scoring)
- **@-mentions** in comments
- **Saved filter views** ("My open bugs", "Critical features")
- **Drag-and-drop kanban board view** (separate from status filter)
- **Public read-only feedback page** (for marketing — "see what we're shipping")
- **Per-comment notifications**
- **File attachments beyond images** (PDFs, logs, .zip)
- **Image annotations** (draw arrows on screenshots)
- **Linked / parent-child issues**

</deferred>

---

*Phase: 28-user-feedback-system*
*Context gathered: 2026-04-27 evening, by direct user instruction*
