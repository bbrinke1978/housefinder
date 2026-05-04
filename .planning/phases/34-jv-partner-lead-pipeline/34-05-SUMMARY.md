---
phase: 34-jv-partner-lead-pipeline
plan: 05
subsystem: notifications, payments, ui
tags: [resend, email, drizzle, postgres, react, audit, idempotency]

requires:
  - phase: 34-01
    provides: jv_lead_milestones table + createActiveFollowUpMilestone/createDealClosedMilestone helpers
  - phase: 34-02
    provides: submitJvLead with TODO(34-05) marker
  - phase: 34-03
    provides: acceptJvLead/rejectJvLead with TODO(34-05) markers
  - phase: 34-04
    provides: getJvLedgerForUser baseline for getJvPaymentRun
provides:
  - Five fire-and-forget Resend notifications (JV submitted/accepted/rejected/milestone-earned/payment-issued)
  - Race-safe markMilestonesPaid with WHERE paid_at IS NULL update guard
  - Owner-only /admin/jv-payments page with per-partner unpaid grouping + printable summary
  - Itemized payment-issued emails grouped per partner
affects: monthly payment-run workflow, future JV reporting/analytics

tech-stack:
  added: []
  patterns:
    - Plain-HTML email builder modules (no react-email render) — duplicated escapeHtml per file
    - Per-partner email grouping inside batch server actions
    - Owner-only payment gates reuse user.manage action

key-files:
  created:
    - app/src/components/email/jv-lead-submitted-email.tsx
    - app/src/components/email/jv-lead-accepted-email.tsx
    - app/src/components/email/jv-lead-rejected-email.tsx
    - app/src/components/email/jv-milestone-earned-email.tsx
    - app/src/components/email/jv-payment-issued-email.tsx
    - app/src/components/jv/jv-payment-run-table.tsx
    - app/src/app/(dashboard)/admin/jv-payments/page.tsx
  modified:
    - app/src/lib/email-actions.ts
    - app/src/lib/jv-actions.ts
    - app/src/lib/jv-milestones.ts
    - app/src/lib/jv-queries.ts

key-decisions:
  - "Plain-HTML email builders (template literals + escapeHtml) — matches Phase 28 contract-emails decision; project does not call react-email render() anywhere"
  - "createQualifiedMilestone is silent — partner already gets the accept-email; only active_follow_up + deal_closed fire notifyJvMilestoneEarned"
  - "markMilestonesPaid uses single WHERE paid_at IS NULL UPDATE; race-safety from the unique-row-once-only-with-NULL clause, no transaction needed"
  - "Owner gate uses 'user.manage' (same as /admin/users) instead of a new jv.payments action — payment-run is a user-management adjacent task, no narrower role required"
  - "Per-partner email grouping happens inside markMilestonesPaid after the UPDATE returning(), so payment-issued emails reflect what actually paid (not what was requested)"

patterns-established:
  - "Email helpers: getResend()-null-safe try/catch wrapper around resend.emails.send"
  - "Idempotent payment update: WHERE id IN (...) AND paid_at IS NULL with .returning() to know what actually paid"
  - "Print-friendly admin pages: Tailwind print:hidden utility + inline @media print rules"

requirements-completed:
  - JV-09
  - JV-10
  - JV-12
  - JV-15

duration: 6min (Tasks 1+2 only — Task 3 deferred)
completed: 2026-05-04
status: deployed-pending-verify
---

# Phase 34 Plan 05: JV Pipeline Closeout Summary

**Five Resend notifications + race-safe monthly payment-run page; deployed to production but human-verify checkpoint deferred per Brian's request.**

## Status

**Tasks 1+2 are deployed and committed. Task 3 (human-verify checkpoint) is deferred — Brian will run the 6-step end-to-end test on his own schedule.** Plan is parked at the checkpoint, not formally complete. Phase 34 ROADMAP entry is intentionally NOT marked complete.

## Performance

- **Duration:** ~6 min (Tasks 1+2)
- **Completed:** 2026-05-04 (code) — verification pending
- **Tasks:** 2/3 (Task 3 deferred)
- **Files modified:** 11

## Accomplishments

**Task 1 — Email helpers + milestone notification wiring:**

- 5 plain-HTML email builder modules with subjects:
  - `[JV Lead] New submission: {address}` → Brian
  - `[JV Lead] Your lead was accepted — $10 queued` → partner
  - `[JV Lead] Your lead was not accepted` → partner
  - `[JV Lead] Milestone earned: ${dollars} for {address}` → partner
  - `[JV Lead] Payment issued: ${dollars} via {method}` → partner
- 5 `notifyJv*` functions in `email-actions.ts`, all fire-and-forget
- `notifyJvMilestoneEarned` wired into `createActiveFollowUpMilestone` + `createDealClosedMilestone` (NOT `createQualifiedMilestone`)
- All 3 `// TODO(34-05): notifyJv*` markers in `jv-actions.ts` replaced with real calls

**Task 2 — Payment-run page + race-safe markMilestonesPaid:**

- `getJvPaymentRun(asOf)` query: per-partner unpaid milestones earned ≤ asOf, grouped with `unpaidTotalCents`
- `markMilestonesPaid({ milestoneIds, paymentMethod, paidAt? })`:
  - Owner-gate via `user.manage` action
  - `WHERE id IN (...) AND paid_at IS NULL` — race-safe; concurrent calls only update each row once
  - Single audit log for the whole batch with `milestoneIds[]` + `totalCents`
  - Per-partner email grouping → `notifyJvPaymentIssued` per partner with line items
- `/admin/jv-payments` server page (owner-only) → `JvPaymentRunTable` client component
  - Partner cards with checkboxes (all checked by default), inline payment-method input pre-filled from `users.jv_payment_method`
  - Mark Paid button + native confirm dialog
  - Print summary button via `window.print()` + Tailwind `print:hidden` utility on chrome

## Task Commits

1. **Task 1: Email helpers + milestone notification wiring** — `fe02d0f`
2. **Task 2: Payment-run query + markMilestonesPaid + admin UI** — `eeb9bb6`

**Pushed to origin/master:** 2026-05-03 (commits `b28e72c..eeb9bb6`)

## Files Created/Modified

**Created (7):**
- `app/src/components/email/jv-lead-submitted-email.tsx` — Brian-bound new-submission notification
- `app/src/components/email/jv-lead-accepted-email.tsx` — partner accept email ($10 queued)
- `app/src/components/email/jv-lead-rejected-email.tsx` — partner reject email with reason
- `app/src/components/email/jv-milestone-earned-email.tsx` — $15/$500 milestone notifications
- `app/src/components/email/jv-payment-issued-email.tsx` — itemized payment receipt
- `app/src/components/jv/jv-payment-run-table.tsx` — client UI for the payment-run page
- `app/src/app/(dashboard)/admin/jv-payments/page.tsx` — owner-only payment-run page

**Modified (4):**
- `app/src/lib/email-actions.ts` — 5 new exported notify functions
- `app/src/lib/jv-actions.ts` — submitJvLead/acceptJvLead/rejectJvLead notification calls (TODO markers replaced) + new markMilestonesPaid action
- `app/src/lib/jv-milestones.ts` — notifyJvMilestoneEarned imported and wired into 2 of the 3 creators
- `app/src/lib/jv-queries.ts` — getJvPaymentRun query added

## Decisions Made

- **Plain-HTML email builders, not react-email** — Phase 28 set this convention; project does not call `render()` anywhere, so importing react-email/components would be dead-weight
- **Qualified milestone is silent** — partner is already notified via the accept-email; firing a second milestone-earned email on accept would be duplicative
- **markMilestonesPaid uses `user.manage` gate**, not a new `jv.payments` action — keeps the action surface small; payment-run is a privileged owner task and lives next to /admin/users
- **Per-partner email grouping inside the action** — emails reflect what actually paid (returned from the UPDATE), not what was requested; concurrent calls naturally produce per-partner emails covering only their own paid rows

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

**Task 3 deferred:** the human-verify checkpoint requires a real phone, real Resend emails to a real inbox, and manual workflow execution. Brian opted to defer testing and address other bugs first. The code is deployed but the end-to-end production smoke test has not been run.

## Verification State

| Check | Status |
|-------|--------|
| `tsc --noEmit` clean | ✓ |
| `next lint --dir src` clean | ✓ |
| `git status` clean post-commit | ✓ |
| All 3 TODO(34-05) markers replaced | ✓ |
| Pushed to production (Netlify deploy) | ✓ |
| Human-verify 6-step smoke test | ⏸ deferred |

## How to Resume

When Brian is ready to verify:

1. Run `/gsd:execute-phase 34` — discovers the missing 34-05-SUMMARY-final marker, picks up at the checkpoint
2. OR run the 6-step smoke test directly from the plan's `<how-to-verify>` block, then reply with `approved` or `issues: ...`
3. After approval: verifier runs against phase requirements, ROADMAP marked complete, audit log captured

## Next Phase Readiness

- All Phase 34 code is in production
- Pending only: human verification of end-to-end behavior
- No new schema, no rollbacks, no env-var changes required for resume

---
*Phase: 34-jv-partner-lead-pipeline*
*Plan: 05*
*Status: deployed-pending-verify*
*Date: 2026-05-04*
