# Session State

## Project Reference

See: .planning/PROJECT.md

## Position

**Milestone:** v1.3 — Rose Park / SLC Enrichment
**Current phase:** 32-dismiss-archive
**Current plan:** 32-01 complete — Dismiss leads, archive deals, permanent delete, outreach form fix shipped
**Status:** Phase complete

## Progress

Phase 26: [####################] Plan 2/2 complete (checkpoint pending human verify)
Phase 28: [####################] Plan 5/5 complete
Phase 29: [####                ] Plan 1/1 complete
Phase 30: [####################] Plan 1/1 complete
Phase 30.1: [####################] Plan 1/1 complete
Phase 31: [####################] Plan 1/1 complete
Phase 32: [####################] Plan 1/1 complete

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

## Session Log

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
