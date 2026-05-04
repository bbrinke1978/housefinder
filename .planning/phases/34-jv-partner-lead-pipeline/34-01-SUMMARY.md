---
phase: 34-jv-partner-lead-pipeline
plan: 01
subsystem: database
tags: [postgres, drizzle, rbac, azure-blob, jv-partner]

requires:
  - phase: 32-dismiss-archive
    provides: migration 0018 (dismissed_parcels) — confirmed next migration slot is 0019
  - phase: 29-rbac-foundation
    provides: permissions.ts Role/Action/ROLE_GRANTS pattern + gates.ts pattern that this plan extends
  - phase: 28-feedback-system
    provides: blob-storage.ts upload/SAS pattern that jv-leads container copies verbatim

provides:
  - jv_leads + jv_lead_milestones tables in production Postgres (migration 0019 applied)
  - users.jv_payment_method nullable text column
  - jv_partner Role with exactly 2 actions (jv.submit_lead, jv.view_own_ledger)
  - jv.triage Action on owner only
  - gates.ts canSubmitJvLead / canViewJvLedger / canTriageJvLeads booleans
  - uploadJvLeadBlob + generateJvLeadSasUrl targeting "jv-leads" Azure container
  - createQualifiedMilestone / createActiveFollowUpMilestone / createDealClosedMilestone (idempotent, { created: boolean })
  - JV Partner option in /admin/users New User form

affects:
  - 34-02 (submit form imports jvLeads schema + jv.submit_lead gate)
  - 34-03 (triage queue imports jvLeads + canTriageJvLeads)
  - 34-04 (payment ledger imports jvLeadMilestones + canViewJvLedger)
  - 34-05 (milestone notifications call createQualifiedMilestone etc. and check { created })

tech-stack:
  added: []
  patterns:
    - "Blob container pattern: JV_LEADS_CONTAINER constant + upload/SAS pair copies feedback/floor-plans verbatim"
    - "Idempotent milestone pattern: onConflictDoNothing({ target: [jvLeadId, milestoneType] }) + { created: boolean } return"
    - "ROLE_GRANTS.jv_partner is minimal (2 actions only) — no lead/deal/buyer access"

key-files:
  created:
    - app/drizzle/0019_jv_partner.sql
    - app/src/lib/jv-milestones.ts
  modified:
    - app/src/db/schema.ts
    - app/src/lib/permissions.ts
    - app/src/lib/gates.ts
    - app/src/lib/blob-storage.ts
    - app/src/components/admin/new-user-form.tsx

key-decisions:
  - "jv_partner ROLE_GRANTS is exactly [jv.submit_lead, jv.view_own_ledger] — no other grants; research confirmed no lead/deal/buyer access"
  - "jv.triage is owner-only (per 34-CONTEXT.md decision) — not granted to acquisition_manager or lead_manager"
  - "jv_leads.status left as open text (no check constraint) — allows future statuses like 'duplicate' without ALTER TABLE"
  - "No pgEnum for lead/deal leadSource — both are plain text columns per schema research"
  - "onConflictDoNothing({ target: [...] }) returns { created: boolean } so Plan 05 notifier only fires once per milestone"
  - "jv_lead_milestones uses Drizzle uniqueIndex() not uniqueConstraint() — enables onConflictDoNothing target API"
  - "Migration applied via node pg client (not drizzle-kit push) — project has no db:push npm script; IF NOT EXISTS makes it re-runnable"

patterns-established:
  - "Milestone creator pattern: insert + onConflictDoNothing + logAudit only if created — used by all 3 functions in jv-milestones.ts"

requirements-completed: [JV-01, JV-02, JV-15]

duration: 25min
completed: 2026-05-03
---

# Phase 34 Plan 01: JV Partner Foundation Summary

**DB tables (jv_leads + jv_lead_milestones) applied to prod Postgres, jv_partner RBAC role with 2 narrow actions, Azure jv-leads blob container helpers, and 3 idempotent milestone creators returning { created: boolean }**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-03T00:00:00Z
- **Completed:** 2026-05-03T00:25:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Migration 0019 created and applied to production Postgres — jv_leads (14 columns, 4 indexes), jv_lead_milestones (8 columns + uq_jv_lead_milestone unique constraint, 2 indexes), users.jv_payment_method column
- jv_partner RBAC role added with exactly 2 grants (jv.submit_lead, jv.view_own_ledger); owner gains all 3 jv.* actions including jv.triage
- Blob helpers uploadJvLeadBlob + generateJvLeadSasUrl added targeting new "jv-leads" container using createIfNotExists pattern
- jv-milestones.ts exports three idempotent milestone creators at $10 / $15 / $500 each returning { created: boolean } for Plan 05 notification gating

## Task Commits

1. **Task 1: Migration 0019 + Drizzle schema** - `d5c6e37` (feat)
2. **Task 2: jv_partner role + actions + admin role picker** - `8e0c765` (feat)
3. **Task 3: Blob storage helpers + idempotent milestone library** - `b939785` (feat)

## Files Created/Modified
- `app/drizzle/0019_jv_partner.sql` - DDL for jv_leads, jv_lead_milestones, ALTER users; applied to production
- `app/src/db/schema.ts` - Added jvLeads + jvLeadMilestones pgTable defs, jvPaymentMethod on users, JvLeadRow + JvLeadMilestoneRow types
- `app/src/lib/permissions.ts` - Role union +jv_partner, Action union +3 jv.* actions, ROLE_GRANTS.jv_partner + owner extensions
- `app/src/lib/gates.ts` - Gates interface + function body: canSubmitJvLead, canViewJvLedger, canTriageJvLeads
- `app/src/lib/blob-storage.ts` - JV_LEADS_CONTAINER constant + uploadJvLeadBlob + generateJvLeadSasUrl
- `app/src/lib/jv-milestones.ts` - NEW: createQualifiedMilestone / createActiveFollowUpMilestone / createDealClosedMilestone
- `app/src/components/admin/new-user-form.tsx` - ROLE_OPTIONS gains { value: "jv_partner", label: "JV Partner" }

## Decisions Made
- `jv_partner` ROLE_GRANTS is exactly `["jv.submit_lead", "jv.view_own_ledger"]` — no lead/deal/buyer access per 34-CONTEXT.md
- `jv.triage` is owner-only; not granted to acquisition_manager or lead_manager (Brian's explicit choice)
- `jv_leads.status` left as open text — allows future statuses ('duplicate', 'expired') without ALTER TABLE
- Migration applied via `node pg` client query (no `db:push` npm script exists in this project)
- `uniqueIndex("uq_jv_lead_milestone")` used (not `uniqueConstraint`) to enable Drizzle's `onConflictDoNothing({ target: [...] })` API
- `{ created: boolean }` return type on all milestone creators so Plan 05 email notifier fires once per milestone, not on idempotent re-calls

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Migration applied cleanly on first run (IF NOT EXISTS guards all statements). tsc and next lint both clean with zero new warnings introduced.

## Production Verification

```
jv_leads columns: id, submitter_user_id, address, address_normalized, condition_notes,
  photo_blob_name, status, property_id, accepted_at, accepted_by_user_id, rejected_at,
  rejected_by_user_id, rejected_reason, created_at, updated_at

jv_lead_milestones columns: id, jv_lead_id, milestone_type, amount_cents, earned_at,
  paid_at, paid_by_user_id, payment_method
  UNIQUE CONSTRAINT: uq_jv_lead_milestone (jv_lead_id, milestone_type)

users.jv_payment_method: EXISTS
```

## User Setup Required

None - all DB changes were applied directly to production Postgres. The "jv-leads" Azure Blob container will be auto-created on first `uploadJvLeadBlob()` call (createIfNotExists pattern).

## Next Phase Readiness

All 6 plans in Phase 34 can now proceed:
- Plan 02 (submit form) can import `jvLeads`, `JvLeadRow`, `canSubmitJvLead`
- Plan 03 (triage queue) can import `jvLeads`, `canTriageJvLeads`, `createQualifiedMilestone`
- Plan 04 (payment ledger) can import `jvLeadMilestones`, `JvLeadMilestoneRow`, `canViewJvLedger`
- Plan 05 (notifications) can import all 3 milestone creators and gate on `{ created: boolean }`
- Plan 06 (payment report) can import `jvLeadMilestones` + `users.jvPaymentMethod`

---
*Phase: 34-jv-partner-lead-pipeline*
*Completed: 2026-05-03*
