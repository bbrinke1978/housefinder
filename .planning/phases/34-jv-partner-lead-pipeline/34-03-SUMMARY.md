---
phase: 34-jv-partner-lead-pipeline
plan: 03
subsystem: ui
tags: [react, nextjs, drizzle, rbac, jv-partner, server-actions, triage]

requires:
  - phase: 34-jv-partner-lead-pipeline (plan 01)
    provides: jvLeads + jvLeadMilestones schema, createQualifiedMilestone, generateJvLeadSasUrl, canTriageJvLeads gate
  - phase: 34-jv-partner-lead-pipeline (plan 02)
    provides: submitJvLead in jv-actions.ts, TODO(34-05) marker pattern

provides:
  - getJvLeadsForTriage() — pending jv_leads rows with photo SAS URLs + dedup hints (3 round-trips)
  - getJvLeadById() — single row lookup for audit log snapshots
  - acceptJvLead() server action — property upsert (fuzzy match or synthetic parcel_id='jv-{uuid}'), lead row, $10 milestone, audit log
  - rejectJvLead() server action — rejected_* columns, audit log, no milestone
  - JvTriageTable client component — card per lead with photo thumb, dedup badge, Accept/Reject UI
  - /jv-leads server page — owner-gated (jv.triage), notFound() for non-owners

affects:
  - 34-04 (payment ledger — reads jvLeadMilestones rows created by acceptJvLead)
  - 34-05 (notifications — TODO(34-05) markers for notifyJvLeadAccepted + notifyJvLeadRejected in jv-actions.ts)

tech-stack:
  added: []
  patterns:
    - "normalizeForMatch duplicated 3 times (jv-queries.ts, jv-actions.ts x2) — project anti-shared-util convention"
    - "Dedup check: JS-side Set matching after loading all properties.address (~3,300 rows × 50 chars = 165KB RAM — trivial for 5-user tool)"
    - "Synthetic parcel_id: 'jv-{jv_lead_id}' (UUID) — unambiguous, never conflicts with real SLCO/county parcel IDs"
    - "Photo thumb links to SAS URL in new tab for full-res view without lightbox overhead"
    - "Inline reject reason input (useTransition) — no modal needed for internal tool"

key-files:
  created:
    - app/src/lib/jv-queries.ts
    - app/src/components/jv/jv-triage-table.tsx
    - app/src/app/(dashboard)/jv-leads/page.tsx
  modified:
    - app/src/lib/jv-actions.ts
    - app/src/components/jv/jv-submit-form.tsx

key-decisions:
  - "Dedup uses JS-side Set match rather than SQL ANY() array parameter — simpler, avoids Drizzle parameterization complexity, fast enough for <100 pending leads at a time"
  - "acceptJvLead does NOT require photoBlobName for idempotent re-calls (already-accepted path) but DOES require it for first acceptance — Section 3 of JV agreement mandates photo"
  - "jv-submit-form.tsx empty interface fixed (pre-existing lint Error from Plan 02) — included in Task 2 commit since it blocked lint clean check"
  - "Reject inline input requires min 3 chars before Confirm button enables — UX guard against accidental empty rejects"
  - "No pagination or search on /jv-leads — internal tool, Brian processes a small daily queue"

requirements-completed: [JV-05, JV-06, JV-15]

duration: 4min
completed: 2026-05-04
---

# Phase 34 Plan 03: JV Triage Workflow Summary

**Owner-gated /jv-leads triage page: pending submissions listed oldest-first with photo thumbs, dedup hints, one-tap Accept (upserts property + lead + $10 milestone) and Reject (requires typed reason)**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-04T02:05:31Z
- **Completed:** 2026-05-04T02:09:03Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `jv-queries.ts` (NEW): `getJvLeadsForTriage()` fetches pending rows in 3 round-trips (jv_leads+users JOIN, all properties.address for dedup, non-pending jv_leads for prior-submission dedup). `getJvLeadById()` for audit log snapshots.
- `jv-actions.ts` (EXTENDED): `acceptJvLead()` — auth gate (jv.triage), JS-side fuzzy address match against all properties, falls back to synthetic parcel `jv-{uuid}`, creates/finds lead row with `leadSource='jv_partner'`, marks jv_lead accepted, calls `createQualifiedMilestone()`, audit log, revalidates `/jv-leads` + `/jv-ledger` + `/properties/{id}`. `rejectJvLead()` — sets rejected_* columns, audit log, revalidates nav paths.
- `jv-triage-table.tsx` (NEW): client component rendering one `LeadCard` per submission. Photo thumb (links to SAS URL in new tab), address, condition notes, submitter name+email, relative timestamp. Dedup warning badge (yellow) when `matchesProperty || matchesPriorJvLead`. Accept/Reject buttons with `useTransition`. Reject opens inline input with 3-char minimum + Confirm/Cancel. Empty state with `MailX` icon.
- `/jv-leads/page.tsx` (NEW): server page, calls `sessionCan(session, "jv.triage")` — non-owners get `notFound()`.

## Task Commits

1. **Task 1: jv-queries.ts** — `2d8a702` (feat)
2. **Task 2: acceptJvLead + rejectJvLead** — `bbdc6f7` (feat)
3. **Task 3: jv-triage-table.tsx + /jv-leads page** — `fe7569b` (feat)

## Files Created/Modified

- `app/src/lib/jv-queries.ts` — NEW: getJvLeadsForTriage (3 round-trips, dedup hints, SAS URLs) + getJvLeadById
- `app/src/lib/jv-actions.ts` — EXTENDED: acceptJvLead + rejectJvLead + normalizeForMatchInline; TODO(34-05) markers added
- `app/src/components/jv/jv-triage-table.tsx` — NEW: JvTriageTable + LeadCard (Accept/Reject with inline reject reason)
- `app/src/app/(dashboard)/jv-leads/page.tsx` — NEW: owner-gated server page
- `app/src/components/jv/jv-submit-form.tsx` — FIXED: empty interface → type alias (pre-existing lint Error from Plan 02)

## Synthetic Parcel ID Pattern

When no fuzzy address match is found in the existing `properties` table, `acceptJvLead` inserts a new property row with:
```
parcelId = `jv-${jvLeadId}`   // e.g. 'jv-a1b2c3d4-...'
county   = 'Unknown'           // Brian edits in property detail later
state    = 'UT'
```
This pattern is unambiguous — real SLCO parcel IDs are numeric strings (`12-34-567-890`), rural county IDs use county-prefixed formats. The `jv-` prefix is visually and syntactically distinct.

## Fuzzy Match Logic

Address matching uses the same normalization applied at submission time:
```
.toLowerCase()
  .replace(/\s+/g, ' ').trim()
  .replace(/\bstreet\b/g, 'st')
  .replace(/\bavenue\b/g, 'ave')
  .replace(/\bdrive\b/g, 'dr')
  .replace(/\bboulevard\b/g, 'blvd')
```
Normalized value stored in `jv_leads.address_normalized` at submit time; compared JS-side against normalized `properties.address` values loaded into a Set. For the internal tool's scale (~3,300 properties), this avoids complex SQL and is reliably fast.

## TODO(34-05) Markers

Two new markers added inside `jv-actions.ts`:
```typescript
// TODO(34-05): notifyJvLeadAccepted({ jvLeadId, partnerEmail: lead.submitterUserId, address: lead.address, amountCents: 1000 })
// TODO(34-05): notifyJvLeadRejected({ jvLeadId, partnerEmail: lead.submitterUserId, address: lead.address, reason })
```
Plan 05 executor should grep `TODO(34-05)` in `app/src/lib/jv-actions.ts` to find all 3 insertion points.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing lint Error in jv-submit-form.tsx**
- **Found during:** Task 2 verification (lint check)
- **Issue:** `interface JvSubmitFormProps {}` (empty interface) triggers `@typescript-eslint/no-explicit-any`-class Error (`An empty interface declaration allows any non-nullish value`) — lint was already returning Error from Plan 02 ship
- **Fix:** Changed to `type JvSubmitFormProps = Record<string, never>;` — semantically equivalent, no functionality change
- **Files modified:** `app/src/components/jv/jv-submit-form.tsx`
- **Commit:** `bbdc6f7` (included in Task 2 commit)

## Decisions Made

- JS-side dedup Set matching instead of SQL `ANY(array)` — avoids Drizzle parameterization complexity; 165KB RAM for full properties table is trivial at this scale
- Photo required for first acceptance (not idempotent re-call path) — enforces Section 3 of JV agreement
- No modal for reject reason — inline input is sufficient for an internal admin tool
- No pagination/search on triage page — Brian processes a small daily queue, oldest-first order is all that's needed

## Issues Encountered

None beyond the pre-existing lint Error in jv-submit-form.tsx (fixed via Rule 1 auto-fix).

## User Setup Required

None — all changes are code-only. The `/jv-leads` route is active on deploy.

## Next Phase Readiness

- Plan 04 (payment ledger): reads `jvLeadMilestones` rows created by `acceptJvLead()` — all rows have `milestoneType='qualified'` and `amountCents=1000`
- Plan 05 (notifications): grep `TODO(34-05)` in `app/src/lib/jv-actions.ts` — finds 3 markers (submit, accept, reject)

---
*Phase: 34-jv-partner-lead-pipeline*
*Completed: 2026-05-04*

## Self-Check: PASSED

- `app/src/lib/jv-queries.ts` — FOUND
- `app/src/lib/jv-actions.ts` — FOUND (extended)
- `app/src/components/jv/jv-triage-table.tsx` — FOUND
- `app/src/app/(dashboard)/jv-leads/page.tsx` — FOUND
- Commits 2d8a702, bbdc6f7, fe7569b — confirmed in git log
- No orphaned src/ edits in working tree (git status verified)
