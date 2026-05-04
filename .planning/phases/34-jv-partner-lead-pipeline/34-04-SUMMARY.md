---
phase: 34-jv-partner-lead-pipeline
plan: 04
subsystem: ui
tags: [react, nextjs, drizzle, rbac, jv-partner, server-actions, milestones, ledger]

requires:
  - phase: 34-jv-partner-lead-pipeline (plan 01)
    provides: jvLeadMilestones schema, createActiveFollowUpMilestone, createDealClosedMilestone, canViewJvLedger gate
  - phase: 34-jv-partner-lead-pipeline (plan 03)
    provides: jv-queries.ts (getJvLeadsForTriage, getJvLeadById), acceptJvLead sets propertyId on accepted jv_leads

provides:
  - logActivity fires createActiveFollowUpMilestone on first outbound contact_event for JV-linked property
  - updateDealStatus fires createDealClosedMilestone on status transition to 'closed' for JV-linked property
  - getJvLedgerForUser(userId) — 2 round-trips, milestone totals, calendar-month owed
  - listJvPartners() — owner-only, SQL @> array filter, includes deactivated users
  - JvLedgerTable client component — summary card + per-lead milestone cards
  - /jv-ledger server page — jv_partner self-view + owner partner-picker variant

affects:
  - 34-05 (notifications — milestone hooks emit { created: boolean }, Plan 05 gates emails on that)

tech-stack:
  added: []
  patterns:
    - "Milestone hook pattern: try/catch wrapper in server action; hook failure logs but never throws"
    - "Termination clause: milestone hooks never check users.isActive — deactivated partner leads keep earning"
    - "Calendar-month bounds: new Date(year, month, 1) / new Date(year, month+1, 1) for JavaScript Date math"
    - "listJvPartners uses sql`${users.roles} @> ARRAY['jv_partner']::text[]` — same pattern as any future role filter"

key-files:
  created:
    - app/src/components/jv/jv-ledger-table.tsx
    - app/src/app/(dashboard)/jv-ledger/page.tsx
  modified:
    - app/src/lib/activity-actions.ts
    - app/src/lib/deal-actions.ts
    - app/src/lib/jv-queries.ts

key-decisions:
  - "Milestone hook inserted AFTER logAudit in both files — idempotent hook never affects audit log correctness"
  - "Hook uses try/catch not promise chaining — failure is logged to console.error, contact/deal event completes normally"
  - "deal-actions hook fetches deal.propertyId in a separate SELECT (not modifying the existing 'existing' SELECT) — minimal disruption to verified critical path"
  - "previousStatus !== 'closed' guard in deal hook prevents re-querying jv_leads on repeated closed → closed saves"
  - "listJvPartners includes inactive users — owner must be able to audit terminated partner ledgers (Section 7)"
  - "getJvLedgerForUser uses inArray() for bulk milestone fetch (2 round-trips total, not N+1)"

requirements-completed: [JV-07, JV-08, JV-11, JV-15]

duration: 3min
completed: 2026-05-04
---

# Phase 34 Plan 04: Milestone Hooks + JV Ledger Summary

**Two milestone hooks wired into existing pipeline events ($15 on first outbound contact, $500 on deal close), both idempotent and failure-isolated, plus a per-partner ledger page visible to both jv_partner (own only) and owner (any partner)**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-04T02:12:43Z
- **Completed:** 2026-05-04T02:15:55Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `activity-actions.ts`: Added `OUTBOUND_CONTACT_EVENT_TYPES` set (5 event types, excludes `received_email`). After `contactEvents.insert` + `logAudit`, queries `jvLeads JOIN leads` by `propertyId` to find accepted jv_lead, fires `createActiveFollowUpMilestone` in a try/catch wrapper.
- `deal-actions.ts`: After `logAudit(deal.status_changed)`, if `status=closed && previousStatus!='closed'`, fetches `deal.propertyId`, finds accepted jv_lead for that property, fires `createDealClosedMilestone` in a try/catch wrapper.
- `jv-queries.ts`: Extended with `JvLedgerLead` interface, `listJvPartners()` (SQL `@>` array filter for jv_partner role, includes inactive users), and `getJvLedgerForUser()` (2 round-trips, calendar-month owed calculation).
- `jv-ledger-table.tsx` (NEW): Client component with summary card (current-month owed in large font, lifetime earned/paid), then per-lead cards with status pill, rejected reason, photo thumb, and 3-slot milestone checklist (earned date + paid/pending badge).
- `/jv-ledger/page.tsx` (NEW): Server page — jv_partner sees own ledger, owner sees all-partner picker (includes inactive with "(inactive)" label). `?submitted=1` flash banner for post-submit redirect.

## Task Commits

1. **Task 1: active_follow_up hook in logActivity** — `4619d7b` (feat)
2. **Task 2: deal_closed hook in updateDealStatus** — `3a97c9a` (feat)
3. **Task 3: ledger queries + component + page** — `620b0f3` (feat)

## Files Created/Modified

- `app/src/lib/activity-actions.ts` — MODIFIED: OUTBOUND_CONTACT_EVENT_TYPES set, imports jvLeads/leadsTable/and/createActiveFollowUpMilestone, JV milestone hook in contact_events branch
- `app/src/lib/deal-actions.ts` — MODIFIED: imports jvLeads/createDealClosedMilestone, JV milestone hook after deal.status_changed audit log
- `app/src/lib/jv-queries.ts` — MODIFIED: JvLedgerLead interface, listJvPartners(), getJvLedgerForUser(); imports jvLeadMilestones, desc, inArray, sql
- `app/src/components/jv/jv-ledger-table.tsx` — NEW: JvLedgerTable + LeadCard client component
- `app/src/app/(dashboard)/jv-ledger/page.tsx` — NEW: server page, jv_partner self-view + owner partner-picker

## OUTBOUND_CONTACT_EVENT_TYPES Set

The following 5 values are the full set of outbound events that trigger the $15 milestone. All 5 map to existing values in the `contact_event_type` pgEnum:

```typescript
const OUTBOUND_CONTACT_EVENT_TYPES = new Set([
  "called_client",
  "left_voicemail",
  "emailed_client",
  "sent_text",
  "met_in_person",
]);
```

`received_email` is excluded — it is INBOUND (owner emails us) and does not satisfy the JV agreement's "Brian makes contact" condition.

## Milestone Hook Insertion Points

**active_follow_up hook (activity-actions.ts):**
- File: `app/src/lib/activity-actions.ts`
- Location: Inside the `else` branch (contact_events path), after `await logAudit({...contactEventId})`, before `revalidatePath("/")` — roughly lines 156-181 in post-edit file
- Guard: `if (OUTBOUND_CONTACT_EVENT_TYPES.has(eventType))`

**deal_closed hook (deal-actions.ts):**
- File: `app/src/lib/deal-actions.ts`
- Location: After `await logAudit({...deal.status_changed})`, before `// --- Auto-fill assignees ---` block — roughly lines 387-413 in post-edit file
- Guard: `if (parsed.status === "closed" && previousStatus !== "closed")`

## End-to-End Smoke Test

Deployment pending. The full end-to-end test (jv_partner submits → Brian accepts → Brian logs outbound call → Brian closes deal → partner sees $525 on /jv-ledger) can be performed after Plan 04 deploys. All prior Plans (01-03) are live, so the DB and acceptance workflow are ready.

## Deviations from Plan

None — plan executed exactly as written. All 5 files match the plan's `files_modified` list.

## Issues Encountered

None. tsc and next lint both clean (zero new warnings or errors introduced).

## User Setup Required

None — all changes are code-only. Deploy via Netlify on merge to master.

## Next Phase Readiness

- Plan 05 (notifications): grep `TODO(34-05)` in `jv-actions.ts` for insertion points; check `result.created === true` from milestone creators to gate email sends (avoids re-sending on idempotent re-calls)
- Plan 06 (payment report): reads `jvLeadMilestones` where `paidAt IS NULL` — same query base as `currentMonthOwedCents`

## Self-Check: PASSED

- `app/src/lib/activity-actions.ts` — FOUND
- `app/src/lib/deal-actions.ts` — FOUND
- `app/src/lib/jv-queries.ts` — FOUND
- `app/src/components/jv/jv-ledger-table.tsx` — FOUND
- `app/src/app/(dashboard)/jv-ledger/page.tsx` — FOUND
- Commits 4619d7b, 3a97c9a, 620b0f3 — confirmed in git log
- No orphaned src/ edits in working tree (git status verified)
