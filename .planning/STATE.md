# Session State

## Project Reference

See: .planning/PROJECT.md

## Position

**Milestone:** v1.4 — Team & Access
**Current phase:** 34-jv-partner-lead-pipeline
**Current plan:** Plan 5/5 — Tasks 1+2 deployed, Task 3 (human-verify checkpoint) deferred. See `.planning/phases/34-jv-partner-lead-pipeline/34-05-SUMMARY.md`
**Status:** parked-pending-human-verify (paused to address bugs; resume with smoke test then `/gsd:execute-phase 34`)

## Progress

Phase 26: [####################] Plan 3/3 complete (verified 2026-05-03)
Phase 27: [####################] Closed without implementation 2026-05-03 (RP-08 descoped)
Phase 28: [####################] Plan 5/5 complete
Phase 29: [####################] Plan 1/1 complete
Phase 30: [####################] Plan 1/1 complete
Phase 30.1: [####################] Plan 1/1 complete
Phase 31: [####################] Plan 1/1 complete
Phase 32: [####################] Plan 1/1 complete
Phase 33: [####################] Plan 1/1 complete
Phase 34: [##################  ] Plan 5/5 deployed — human-verify deferred

## Decisions

- 2026-04-27 (26-01): Use POST for ArcGIS batch queries — avoids GET URL length limits at 100 IDs/batch
- 2026-04-27 (26-01): Resolved allowlistPath as absolute path via fileURLToPath(import.meta.url) — portable across environments
- 2026-04-27 (26-01): dry-run uses SELECT probe with synthetic rowCount — no UPDATE SQL reachable when dryRun=true
- 2026-04-27 (26-02): Prefix-mismatch risk materialized — 26/30 Rose Park rows have 14-/21-/22-/33-/15- prefixes outside allowlist; defer allowlist expansion to v1.4
- 2026-04-27 (26-02): SC #1 MET — 8,254 UGRC records fetched, 4 matched, 4 enriched with assessor data
- 2026-04-26 (28-01): Dollar-quote-aware statement splitter required — naive ;\\n split breaks inside DO $$ blocks
- 2026-04-26 (28-01): check() helper from drizzle-orm/pg-core used for feedback_attachments CHECK constraint
- 2026-04-28 (28-02): updateFeedbackItem uses `as any` for dynamic Drizzle patch — avoids over-engineering typed partial update
- 2026-04-28 (28-02): deleteFeedbackItem activity uses 'resolved' enum value (no 'deleted' in enum); newValue='deleted' captures intent
- 2026-04-28 (28-02): FTS splits whitespace into AND terms via to_tsquery — consistent with GitHub/Linear search defaults
- 2026-04-28 (28-03): FloatingReportButton uses @base-ui/react/dialog — no shadcn Dialog in project; base-ui already used by call-script-modal
- 2026-04-28 (28-03): Badge count fetched server-side in async DashboardLayout and passed as prop to both nav components
- 2026-04-28 (28-03): react-markdown deps installed in 28-03 per coordination note; usage is in Plan 04 detail view
- 2026-04-28 (28-04): Lightbox as fixed-overlay div (not Dialog) — simpler for image-only use case in 3-user internal tool
- 2026-04-28 (28-04): GalleryAttachment uploadedByName null in v1 — attachment query doesn't join users table; v2 can add join
- 2026-04-28 (28-04): useOptimistic + useTransition in FeedbackStatusControls for instant feel with revert-on-error
- 2026-04-26 (28-05): Used plain-HTML builder pattern (contract-emails.tsx style) instead of react-email render() — project does not call render() anywhere
- 2026-04-26 (28-05): getResend() returns null with warn when RESEND_API_KEY missing — safe in local dev without env var
- 2026-04-26 (29-01): ROLE_GRANTS matrix in permissions.ts owns all permission definitions; server actions call userCan() directly
- 2026-04-26 (29-01): logAudit() wraps its DB write in try/catch — audit failure never blocks user action
- 2026-04-26 (29-01): Auth domain+active+roles gates all return null (not error) to avoid user existence leakage
- 2026-04-26 (29-01): feedback-admin.isAdmin() re-routed through userCan(roles, 'feedback.triage') — backward compat preserved
- 2026-04-26 (29-01): admin@no-bshomes.com kept active with owner role per Brian correction (password reset URL issued separately)
- 2026-04-28 (30-01): /admin/users URL-gated (notFound for non-owner); /admin/audit nav-hide only — read-only, small trusted team
- 2026-04-28 (30-01): Buttons hidden (not disabled) for role-gated actions; absent from DOM keeps UX clean
- 2026-04-28 (30-01): canReassignOwn covers disposition+coordinator only (not acquisition — management-level assignment)
- 2026-04-28 (30-01): Auto-fill inactive user fallthrough: transition succeeds, assignee stays null, deal.auto_assign_failed logged
- [Phase 30.1-01]: Login page is client component — used next-auth/react signIn('google') instead of server action wrapper
- [Phase 30.1-01]: .env.local.example unblocked via !.env.local.example negation in app/.gitignore
- [Phase 30.1-01]: auto-provision inserts users with roles=[] + password_hash=''; middleware redirects them to /pending-approval rather than blocking login outright (Option B per context)
- [Phase 31-01]: getActivityFeedForLead(leadId) added for inbound leads (propertyId=NULL) — separate from getActivityFeed(propertyId)
- [Phase 31-01]: Dashboard uses simple N+1 parallel Promise.all for activity card data — LATERAL join deferred unless perf degrades
- [Phase 31-01]: contact-tab.tsx accepts optional activityFeed prop for backward compat — falls back to legacy ActivityTimeline if not provided
- 2026-04-26 (32-01): Nullable upsertProperty return (null = suppressed) instead of throwing — 5 callers add simple continue
- 2026-04-26 (32-01): dismissed_parcels preserved on hard delete — scraper suppression survives lead deletion
- 2026-04-26 (32-01): Log-a-call writes to contact_events not callLogs — unified activity feed shows call history
- 2026-04-26 (32-01): Active deals combobox (not all leads) for call log — only in-progress deals need calling
- 2026-04-26 (32-01): DealArchiveBanner composite client component — cleaner than passing isOwner through 3 server+client layers
- [Phase 33]: getDashboardActivityCards() additive — existing getActivityFeed/getActivityFeedForLead untouched; pool revert atomic with N+1 fix
- [Phase 33]: ActivityCardData satisfies ActivityEntry shim (stub unused fields) avoids touching types/index.ts
- [Phase 34]: jv_partner ROLE_GRANTS is exactly [jv.submit_lead, jv.view_own_ledger] — no lead/deal/buyer access per 34-CONTEXT.md
- [Phase 34]: jv.triage is owner-only — not granted to acquisition_manager or lead_manager (Brian's explicit choice per 34-CONTEXT.md)
- [Phase 34]: jv_lead_milestones uniqueIndex (not uniqueConstraint) enables Drizzle onConflictDoNothing({ target: [...] }) API; milestone creators return { created: boolean } so Plan 05 notifier fires once only
- [Phase 34-02]: Two-step submit: server action creates jv_leads row first (returns id), client then POSTs photo to /api/jv-leads/{id}/photo — keeps server actions free of multipart complexity
- [Phase 34-02]: isJvPartner computed in DashboardLayout (single source), passed as prop to both nav components; owner-role users bypass jv_partner nav even if also assigned jv_partner
- [Phase 34-02]: TODO(34-05) marker at notifyNewJvLeadSubmission insertion point in jv-actions.ts; Plan 05 executor greps this marker
- [Phase 34-03]: Dedup uses JS-side Set match (not SQL ANY) — 165KB RAM for full properties.address load, trivial for 5-user tool
- [Phase 34-03]: acceptJvLead synthetic parcel_id 'jv-{jv_lead_id}' — UUID prefix makes it unambiguous vs real SLCO/county IDs
- [Phase 34-03]: TODO(34-05) markers added for notifyJvLeadAccepted + notifyJvLeadRejected in jv-actions.ts (now 3 total)
- [Phase 34-04]: Milestone hooks inserted AFTER logAudit in both files — idempotent hook never affects audit log correctness
- [Phase 34-04]: deal-actions hook fetches deal.propertyId in separate SELECT (not modifying 'existing' SELECT) — minimal disruption to critical path
- [Phase 34-04]: listJvPartners includes inactive users — owner must audit terminated partner ledgers (Section 7)
- [Phase 34-04]: getJvLedgerForUser uses inArray() for bulk milestone fetch — 2 round-trips total, not N+1

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 26    | 01   | 8min     | 2     | 1     |
| 26    | 02   | 18min    | 2     | 1     |
| 28    | 01   | 3min     | 3     | 3     |
| 28    | 02   | 4min     | 4     | 5     |
| 28    | 03   | 6min     | 7     | 11    |
| 28    | 04   | 6min     | 6     | 7     |
| 28    | 05   | 2min     | 4     | 4     |
| 29    | 01   | 45min    | 6     | 16    |
| 30    | 01   | 4h       | 5     | 25    |
| Phase 30.1 P01 | 7min | 6 tasks | 7 files |
| 31    | 01   | 11min    | 7     | 13    |
| 32    | 01   | ~3h      | 6     | 27    |
| Phase 33 P01 | 15min | 2 tasks | 4 files |
| Phase 34 P01 | 25min | 3 tasks | 7 files |
| Phase 34 P02 | 3min  | 3 tasks | 8 files |
| Phase 34 P03 | 4min  | 3 tasks | 5 files |
| Phase 34 P04 | 3min  | 3 tasks | 5 files |

## Roadmap Evolution

- 2026-05-03: Phase 33 (Activity Feed Batch Refactor) added under v1.4 milestone — eliminate dashboard N+1 that drove 2026-05-02 connection-storm outage.
- 2026-05-03: Roadmap docs gap closed — Phase 26 verified + closed (RP-06/RP-07 marked Complete, 26-03-PLAN signed off), Phase 27 closed without implementation (RP-08 descoped, SLC pin density never became a problem), Phases 29-32 detail sections back-filled into ROADMAP.md, v1.4 requirements (RBAC-01..10, AUTH-04..05, ACT-01..05, MGMT-01..05, PERF-01..02, OPS-07) added to REQUIREMENTS.md with full traceability.
- 2026-05-03: v1.3 milestone audit passed (21/21 reqs satisfied, RP-08 descoped) → v1.3 archived to `.planning/milestones/v1.3-*.md` (ROADMAP, REQUIREMENTS, MILESTONE-AUDIT, INTEGRATION-CHECK), ROADMAP.md collapsed v1.3 phases under a `<details>` block, PROJECT.md updated to mark v1.3 + v1.4 as Validated, git tagged `v1.3` (commit 5dcb100, tag local-only — not pushed).
- 2026-05-03: Phase 34 (JV Partner Lead Pipeline) added to end of v1.4 — implements the No-BS Homes JV Partner Lead Referral Agreement. Driver partners (1-2 people) modeled as internal `@no-bshomes.com` users with a NEW `jv_partner` role separate from `sales`. Mobile lead-submission form (address + front-photo + condition notes) → Brian's triage queue → existing property/lead pipeline → automatic per-partner payment ledger ($10 qualified / $15 active follow-up / $500 closed) → monthly payment-run report (1st-of-month batch). Account provisioning unchanged (manual via /admin/users). Phase context captured in `.planning/phases/34-jv-partner-lead-pipeline/34-CONTEXT.md`.

## Session Log

- 2026-05-03: Phase 33 created — Activity Feed Batch Refactor planned to follow LATERAL/CTE pattern; pool revert to `max:3, idle:10000` and `seed-config.ts` orphan commit folded into same phase
- 2026-04-27: STATE.md regenerated by /gsd:health --repair
- 2026-04-27: Plan 26-01 complete — fetchFromAllowlist() + --dry-run added to import-ugrc-assessor.mjs
- 2026-04-27: Plan 26-02 complete — 4 Rose Park rows enriched; prefix-mismatch confirmed; SC #1 MET; checkpoint awaiting human-verify
- 2026-04-26: Plan 28-01 complete — feedback_* tables + enums in prod Postgres; Drizzle schema updated; tsc clean
- 2026-04-28: Plan 28-02 complete — feedback server actions, queries, blob helpers, attachment API routes; tsc clean
- 2026-04-28: Plan 28-03 complete — feedback list/create UI, 3 badge components, FeedbackForm, FloatingReportButton, nav integration; tsc clean
- 2026-04-28: Plan 28-04 complete — feedback detail page, markdown renderer, gallery, comment thread, activity timeline, status controls; tsc clean
- 2026-04-26: Plan 28-05 complete — feedback email notifications (email-actions.ts, two email templates, wired into createFeedbackItem + updateFeedbackStatus); tsc clean; Phase 28 DONE
- 2026-04-26: Plan 29-01 complete — RBAC foundation (schema migration 0016 applied to prod, day-1 seed 3339 leads backfilled, permissions.ts + audit-log.ts, NextAuth domain+active+roles gates, ~30 server actions gated + audited, auditLogArchive cron); tsc clean both app + scraper
- 2026-04-28: Plan 30-01 complete — RBAC UI surfaces: Mine/All toggles, 17-gate gates.ts, hide-by-role buttons, DealTeamPanel + auto-fill, /admin/users console, /admin/audit log viewer; tsc clean; Phase 30 DONE
- 2026-04-26: Plan 30.1-01 complete — Google OAuth (next-auth/providers/google) + domain gate + auto-provision + /pending-approval middleware + /pending-approval page + Google button on /login + Pending badge in /admin/users; tsc clean; Phase 30.1 DONE
- 2026-05-01: Plan 31-01 complete — unified activity feed end-to-end: schema 0017, getActivityFeed (7 sources), logActivity server action, ActivityLogModal, ActivityFeed, ActivityCardIndicator, dashboard + 3 detail pages; tsc clean; Phase 31 DONE
- 2026-04-26: Plan 32-01 complete — dismiss leads (soft-delete + parcel suppression), archive deals, owner permanent-delete (address confirm modal), fixed Log-a-call (active deals combobox + contact_events); migration 0018 applied; tsc clean; Phase 32 DONE
- 2026-05-03: Plan 33-01 complete — batch dashboard activity feed (CTE+UNION ALL+ROW_NUMBER), revert pg pool max:3/idle:10000, commit orphaned seed-config.ts SLC neighborhoods; commit 0e76ce4; tsc clean; Phase 33 DONE
- 2026-05-03: Plan 34-01 complete — migration 0019 (jv_leads + jv_lead_milestones + users.jv_payment_method) applied to prod; jv_partner RBAC role + 3 jv.* actions; gates.ts 3 new booleans; blob-storage jv-leads container; jv-milestones.ts 3 idempotent creators; admin role picker; commits d5c6e37, 8e0c765, b939785; tsc clean
- 2026-05-03: Plan 34-02 complete — submitJvLead server action, photo upload API route (row-level ownership), JvSubmitForm (photo-first mobile layout, resizeImage, two-step submit), /jv-submit page, isJvPartner nav (2-item bottom nav + sidebar), middleware redirect / → /jv-ledger for jv_partner; commits 3693e93, 6a8811f, 61f7ac8; tsc clean
- 2026-05-04: Plan 34-03 complete — jv-queries.ts (getJvLeadsForTriage + getJvLeadById), acceptJvLead + rejectJvLead server actions (property upsert, synthetic parcel_id='jv-{uuid}', $10 milestone, idempotent), JvTriageTable client component (photo thumbs, dedup badges, inline reject reason), /jv-leads owner-gated page; commits 2d8a702, bbdc6f7, fe7569b; tsc clean
- 2026-05-04: Plan 34-04 complete — active_follow_up hook in logActivity (OUTBOUND_CONTACT_EVENT_TYPES set, try/catch, JV lead join via propertyId), deal_closed hook in updateDealStatus (separate propertyId fetch, previousStatus guard), jv-queries.ts extended (JvLedgerLead, listJvPartners, getJvLedgerForUser), JvLedgerTable client component (summary card + per-lead milestone cards), /jv-ledger server page (partner self-view + owner picker); commits 4619d7b, 3a97c9a, 620b0f3; tsc clean
