---
phase: 19-wholesale-leads
plan: "03"
subsystem: wholesale-leads-intake-and-detail
tags: [webhook, email-parsing, review-form, detail-page, notes, status-management]
dependency_graph:
  requires:
    - 19-01 (wholesale DB schema, scoring engine, actions, queries)
    - 19-02 (wholesale list page, card grid, analysis component)
  provides:
    - POST /api/inbound Resend webhook handler
    - WholesaleParseReview form component
    - /wholesale/[id] detail page
    - WholesaleNotes component
    - WholesaleDetailHeader component with status dropdown
  affects:
    - app/src/lib/wholesale-actions.ts
    - app/src/lib/wholesale-queries.ts
    - app/src/types/index.ts
tech_stack:
  added: []
  patterns:
    - public webhook endpoint with skipAuth bypass for server-side call
    - pre-filled review form from parsedDraft JSON with live analysis preview
    - two-view detail page (parse review for new email leads, full detail for others)
    - useOptimistic for immediate note display (mirrors deal-notes.tsx)
    - native HTML select for sourceChannel (no library needed)
key_files:
  created:
    - app/src/app/api/inbound/route.ts
    - app/src/components/wholesale-parse-review.tsx
    - app/src/components/wholesale-detail-header.tsx
    - app/src/components/wholesale-notes.tsx
    - app/src/app/(dashboard)/wholesale/[id]/page.tsx
  modified:
    - app/src/lib/wholesale-actions.ts
    - app/src/lib/wholesale-queries.ts
    - app/src/types/index.ts
decisions:
  - "[19-03]: skipAuth param on createWholesaleLeadFromEmail — webhook is server-side with no user session, public endpoint doesn't have auth context"
  - "[19-03]: parsedDraft added to WholesaleLeadWithWholesaler type — required for parse review form to access email-extracted fields"
  - "[19-03]: Two-view detail page: parse review mode for status=new+parsedDraft, full detail otherwise — clean separation without route duplication"
  - "[19-03]: Promote to Deal button renders disabled with tooltip for interested/analyzing statuses — signals next step without broken functionality"
metrics:
  duration: 8min
  completed: "2026-04-10T22:32:47Z"
  tasks_completed: 2
  files_created: 5
  files_modified: 3
---

# Phase 19 Plan 03: Wholesale Leads — Intake and Detail Summary

**One-liner:** Resend inbound email webhook with auto-parsing into draft leads, email review form with confidence indicator, and /wholesale/[id] detail page with status dropdown, analysis display, and timestamped notes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Resend inbound webhook and parse review component | 0811e36 | api/inbound/route.ts, wholesale-parse-review.tsx, wholesale-actions.ts |
| 2 | Wholesale lead detail page with status, analysis, and notes | 1849448 | wholesale/[id]/page.tsx, wholesale-notes.tsx, wholesale-detail-header.tsx, wholesale-queries.ts |

## What Was Built

### Inbound Webhook (Task 1)

`POST /api/inbound` handles Resend `email.received` events:
- Validates `payload.type === "email.received"` — returns 200 immediately for other events
- Fetches full email from `GET https://api.resend.com/emails/{emailId}` with RESEND_API_KEY
- Extracts plain text body; falls back to HTML-stripped body if text is empty
- Calls `createWholesaleLeadFromEmail(bodyText, fromEmail, subject, skipAuth=true)` 
- Entire handler wrapped in try/catch — always returns 200 to prevent Resend retry storms
- No auth check — webhook URL is the secret

### Parse Review Component (Task 1)

`WholesaleParseReview` renders for leads with status "new" and parsedDraft set:
- Confidence badge: counts non-null extracted fields out of 12 tracked fields, colored green/yellow/red
- Duplicate address warning: shows wholesaler name and date if same normalizedAddress exists
- Pre-filled form with all 17 fields from parsedDraft (arv, asking, beds, baths, sqft, yearBuilt, taxId, wholesaler info)
- Live WholesaleAnalysis preview updates as user edits ARV/asking/repairs
- Collapsible raw email text section for reference
- "Save & Analyze" sets status to "analyzing" on submit via `updateWholesaleLead`

### Detail Header (Task 2)

`WholesaleDetailHeader` shows address, status badge, status dropdown (5 options), wholesaler card with tel/mailto links, and Promote to Deal button (disabled/stub for Plan 04).

### Notes Component (Task 2)

`WholesaleNotes` mirrors `deal-notes.tsx` exactly:
- useOptimistic for immediate display before server confirms
- Status change notes styled with ArrowUpDown icon and badge pair
- User notes displayed as plain text with timestamp
- Submits via `addWholesaleNote` server action

### Detail Page (Task 2)

`/wholesale/[id]/page.tsx` uses two-column layout:
- **Parse review mode** (status=new AND parsedDraft exists): shows WholesaleParseReview left + notes right
- **Full detail mode** (all other statuses): shows WholesaleDetailHeader + property details grid + WholesaleAnalysis left, notes + wholesaler card right
- `checkDuplicateAddress` runs only when in parse review mode

## Verification

- `npx tsc --noEmit`: PASS (zero errors)
- `npx next build`: PASS
- `/wholesale/[id]` route in build output: CONFIRMED
- `/api/inbound` route in build output: CONFIRMED

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] createWholesaleLeadFromEmail required auth session**
- **Found during:** Task 1 implementation
- **Issue:** The server action calls `auth()` and throws if no session — but the inbound webhook is a public route with no user session
- **Fix:** Added `skipAuth = false` parameter to `createWholesaleLeadFromEmail`; webhook passes `skipAuth=true`
- **Files modified:** app/src/lib/wholesale-actions.ts
- **Commit:** 0811e36

**2. [Rule 3 - Blocking] parsedDraft missing from WholesaleLeadWithWholesaler type**
- **Found during:** Task 1 — WholesaleParseReview needed parsedDraft to render review form
- **Issue:** Type and queries from Plan 01 didn't include parsedDraft field
- **Fix:** Added `parsedDraft: string | null` to type definition; updated all three query functions to select `wholesaleLeads.parsedDraft`
- **Files modified:** app/src/types/index.ts, app/src/lib/wholesale-queries.ts
- **Commit:** e2c10e1

**3. [Rule 3 - Blocking] Plan 02 wholesale-lead-form.tsx had malformed JSX**
- **Found during:** Task 1 — tsc showed unclosed JSX tags in existing wholesale-lead-form.tsx
- **Issue:** The form had a modal backdrop wrapper mixed with unclosed divs from a previous partial edit
- **Fix:** Rewrote file with clean JSX structure; form renders as content (grid manages modal overlay)
- **Files modified:** app/src/components/wholesale-lead-form.tsx
- **Commit:** e2c10e1

## Self-Check: PASSED

- [x] `app/src/app/api/inbound/route.ts` exists
- [x] `app/src/components/wholesale-parse-review.tsx` exists (90+ lines)
- [x] `app/src/app/(dashboard)/wholesale/[id]/page.tsx` exists (40+ lines)
- [x] `app/src/components/wholesale-notes.tsx` exists (30+ lines)
- [x] `app/src/components/wholesale-detail-header.tsx` exists
- [x] Commit 0811e36: feat(19-03): Resend inbound webhook and parsed email review component
- [x] Commit 1849448: feat(19-03): wholesale lead detail page with status management, analysis, and notes
- [x] `/api/inbound` in build output
- [x] `/wholesale/[id]` in build output
