---
phase: 28-user-feedback-system
plan: "05"
subsystem: feedback-email-notifications
tags: [feedback, email, resend, notifications, fire-and-forget]
dependency_graph:
  requires: [feedback-schema, feedback-backend]
  provides: [feedback-email-notifications]
  affects:
    - app/src/lib/email-actions.ts (new)
    - app/src/components/email/feedback-new-item-email.tsx (new)
    - app/src/components/email/feedback-shipped-email.tsx (new)
    - app/src/lib/feedback-actions.ts (modified)
tech_stack:
  added: []
  patterns:
    - plain-HTML email builder functions (matches contract-emails.tsx pattern)
    - Resend instantiated from RESEND_API_KEY env var (matches password-reset-actions.ts)
    - fire-and-forget with .catch() on unawaited promise (prevents unhandled rejection)
    - escapeHtml helper for XSS prevention in dynamic email content
key_files:
  created:
    - app/src/lib/email-actions.ts
    - app/src/components/email/feedback-new-item-email.tsx
    - app/src/components/email/feedback-shipped-email.tsx
  modified:
    - app/src/lib/feedback-actions.ts
decisions:
  - "Used plain-HTML builder pattern (contract-emails.tsx style) instead of react-email render() — project does not use render() anywhere; outreach-template.tsx uses react prop directly"
  - "getResend() helper pattern: returns null + warns if RESEND_API_KEY missing — consistent with guard pattern in password-reset-actions.ts and contract-actions.ts"
  - "BRIAN_EMAIL from BRIAN_EMAIL env var with hardcoded fallback — matches CONTEXT.md spec"
  - "Self-notify guard logs console.log then returns without sending — no error, just skipped"
metrics:
  duration: "~2min"
  completed: "2026-04-26"
  tasks_completed: 4
  files_changed: 4
---

# Phase 28 Plan 05: Feedback Email Notifications Summary

Email notification layer for the feedback system — Brian gets pinged on new items, reporters get pinged when their item ships. Fire-and-forget pattern keeps the user's submit action fast even if Resend is slow.

## What Was Built

**feedback-new-item-email.tsx** (new file):
- `buildFeedbackNewItemHtml(props)` — returns `{ subject, html }` for the new-item alert
- Subject: `[Feedback] {typeLabel}: {title}`
- Body: type + priority chips, reporter name/email, first 500 chars of description in a callout block (with `…` if truncated), URL context as a clickable link if present, purple "View in No BS Workbench" button, fallback text link
- `escapeHtml()` helper prevents XSS in all dynamic user-controlled content

**feedback-shipped-email.tsx** (new file):
- `buildFeedbackShippedHtml(props)` — returns `{ subject, html }` for the shipped notification
- Subject: `[Feedback] Shipped: {title}`
- Body: green "Shipped" badge, `{actorName} marked your {type} as shipped.`, optional ship-note in a green left-border callout block, green "View in No BS Workbench" button
- Same `escapeHtml()` helper

**email-actions.ts** (new file):
- `notifyNewFeedbackItem(args)` — sends to `BRIAN_EMAIL`; builds deep link `${APP_BASE_URL}/feedback/{itemId}`; calls `buildFeedbackNewItemHtml`; swallows all errors with `console.error`
- `notifyFeedbackShipped(args)` — sends to `args.reporterEmail`; builds deep link; calls `buildFeedbackShippedHtml`; swallows all errors
- `getResend()` helper: returns `null` (with `console.warn`) if `RESEND_API_KEY` not set — safe in local dev
- `SENDER` constant: `"No BS Workbench <onboarding@resend.dev>"` — matches other transactional emails

**feedback-actions.ts** (modified):
- Added `users` import from schema; added `notifyNewFeedbackItem` + `notifyFeedbackShipped` imports
- `createFeedbackItem`: after `revalidatePath`, fetches reporter's `name`/`email` in one DB query, fires `notifyNewFeedbackItem().catch(...)` — unawaited, user's action returns immediately
- `updateFeedbackStatus`: after `revalidatePath`, branches on `newStatus === 'shipped'`; if `item.reporterId === session.user.id`, logs "self-notify skipped" and exits; otherwise fetches reporter + actor names and fires `notifyFeedbackShipped().catch(...)` — unawaited

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Pattern mismatch] Used plain-HTML builders instead of react-email render()**
- **Found during:** Task 1
- **Issue:** Plan referenced `render(<FeedbackNewItemEmail />)` from `@react-email/components`, but the project codebase has zero instances of `render()` being called. The `outreach-template.tsx` component is used as a `react:` prop, not as a server-rendered HTML string. The `contract-emails.tsx` and `password-reset-actions.ts` both use plain HTML string builders. Using `render()` would have been an inconsistency.
- **Fix:** Implemented both templates as plain HTML builder functions (`buildFeedbackNewItemHtml` / `buildFeedbackShippedHtml`) returning `{ subject, html }`, matching `contract-emails.tsx` exactly. The email-actions.ts uses `html:` property on `resend.emails.send()`.
- **Files modified:** `feedback-new-item-email.tsx`, `feedback-shipped-email.tsx`, `email-actions.ts`
- **Impact:** None on behavior. Both approaches produce identical output HTML.

## Self-Check: PASSED

Files created:
- app/src/lib/email-actions.ts — FOUND
- app/src/components/email/feedback-new-item-email.tsx — FOUND
- app/src/components/email/feedback-shipped-email.tsx — FOUND

feedback-actions.ts modified:
- notifyNewFeedbackItem wired — FOUND
- notifyFeedbackShipped wired — FOUND
- self-notify guard — FOUND

TSC: PASS (npx tsc --noEmit clean throughout all 4 tasks)

Commits:
- 859b937: feat(28-05): add FeedbackNewItemEmail + FeedbackShippedEmail plain-HTML templates
- b88a81b: feat(28-05): create email-actions.ts with notifyNewFeedbackItem + notifyFeedbackShipped
- 30ce90e: feat(28-05): wire notifyNewFeedbackItem into createFeedbackItem (fire-and-forget)
- fcf21e4: feat(28-05): wire notifyFeedbackShipped into updateFeedbackStatus (fire-and-forget)
