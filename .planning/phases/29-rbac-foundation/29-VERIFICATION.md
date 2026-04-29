---
phase: 29-rbac-foundation
verified: 2026-04-26T00:00:00Z
status: gaps_found
score: 10/11 must-haves verified
re_verification: false
gaps:
  - truth: "ROADMAP.md shows Phase 29 as 1/1 Complete"
    status: failed
    reason: "Phase 29 entry in ROADMAP.md is still '- [ ]' (unchecked). All other completed phases use '[x]'. The completion date was not stamped and the checkbox was never toggled."
    artifacts:
      - path: ".planning/ROADMAP.md"
        issue: "Line 41: '- [ ] **Phase 29: RBAC Foundation + Audit Log**' — should be '- [x]' with '(completed 2026-04-26)' appended"
    missing:
      - "Change '- [ ]' to '- [x]' on the Phase 29 line"
      - "Append '(completed 2026-04-26)' to the Phase 29 description, matching the style of phases 25, 25.5, 28, etc."
human_verification:
  - test: "Log in as brian@no-bshomes.com"
    expected: "Session is created and session.user.roles === ['owner'] is readable from a server component (e.g. print in a console.log or surface in a debug panel)"
    why_human: "Cannot exercise the full NextAuth login flow programmatically. The authorize callback code is verified correct, but runtime JWT/session threading requires a live browser test."
  - test: "Attempt to log in with a non-@no-bshomes.com address (e.g. test@gmail.com)"
    expected: "Login is rejected; no session is created; no information leaks about whether the email exists"
    why_human: "Same — requires live browser + NextAuth runtime."
  - test: "Attempt to log in as a user with is_active=false or roles=[]"
    expected: "Login rejected at the authorize callback"
    why_human: "There are currently no inactive or role-less users in prod to test against; would require temporarily creating/modifying a test account."
  - test: "Trigger one mutating action (e.g. change a lead status) as Brian"
    expected: "A new row appears in audit_log with correct actor_user_id (Brian's UUID), action string (e.g. 'lead.status_changed'), entity_type='lead', entity_id=the lead's UUID, and non-null new_value JSON"
    why_human: "The logAudit call paths are code-verified but the round-trip DB write has not been observed live this session."
  - test: "Confirm auditLogArchive function is visible in Azure Function App console after next scraper deploy"
    expected: "'auditLogArchive' appears in the Functions list with status Enabled and schedule '0 0 3 * * *'"
    why_human: "The scraper Function App deploys via GitHub Actions on push; deploy has not been triggered this session. Cannot verify Azure-side registration without a deploy or portal access."
---

# Phase 29: RBAC Foundation + Audit Log — Verification Report

**Phase Goal:** Establish the schema, auth gates, server-side permission helpers, and audit-log infrastructure for RBAC. After this phase ships, the database knows who can do what and every write is logged. Phase 30 then layers UI gates on top.
**Verified:** 2026-04-26
**Status:** gaps_found — 1 administrative gap (ROADMAP checkbox not toggled), 4 human verification items
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | users.roles text[] + is_active boolean exist in prod; brian/shawn/admin all have roles=['owner'] and is_active=true | VERIFIED | Migration runner output confirms ARRAY + boolean columns. Seed script output shows all 3 users with `[ 'owner' ]` / `true`. 0 leads with NULL lead_manager_id. |
| 2 | deals has acquisition/disposition/coordinator_user_id FKs; leads has lead_manager_id + created_by_user_id | VERIFIED | Migration runner verification block lists all 5 FK columns with correct uuid types. Drizzle schema.ts lines 141, 142, 318-320 confirmed. |
| 3 | audit_log + audit_log_archive tables exist with correct schema | VERIFIED | Migration runner lists both tables. schema.ts lines 1224-1271 define full structure with jsonb old/new_value, actor FK, 4 indexes. |
| 4 | Non-@no-bshomes.com login rejected at authorize callback | VERIFIED (code) | auth.ts line 20-21: `!email.toLowerCase().endsWith("@no-bshomes.com") → return null`. Returns same null shape as "user not found". Human test required for runtime confirmation. |
| 5 | is_active=false or roles=[] login rejected at authorize callback | VERIFIED (code) | auth.ts lines 39-42: `!user.isActive → return null`; `(user.roles ?? []).length === 0 → return null`. Human test required. |
| 6 | session.user.roles exposed as string[] from server components | VERIFIED (code) | auth.ts JWT callback (lines 62-65) sets `token.roles`; session callback (lines 68-73) propagates to `session.user.roles`. Human runtime test required. |
| 7 | userCan(roles, action) returns true iff any role grants the action; false for empty array | VERIFIED | permissions.ts line 91: guard `if (!roles \|\| roles.length === 0) return false`. ROLE_GRANTS matrix covers 7 roles × 25+ actions. Logic is correct. |
| 8 | Every mutating server action wraps DB writes with logAudit(...) | VERIFIED | grep counts: actions.ts=18, deal-actions.ts=20, wholesale-actions.ts=12, buyer-actions.ts=4, tracerfy-actions.ts=7, feedback-actions.ts=4. All 6 files import both `userCan` and `logAudit`. userCan gates precede writes; logAudit calls follow writes throughout. |
| 9 | feedback-admin.ts isAdmin() routes through userCan(roles, 'feedback.triage') | VERIFIED | feedback-admin.ts is 20 lines total. isAdmin() calls `userCan(roles, "feedback.triage")` directly. No hardcoded email comparison. |
| 10 | auditLogArchive Azure Function runs daily at 3am UTC with 30/60/drop retention | VERIFIED (code) | scraper/src/functions/auditLogArchive.ts: schedule `"0 0 3 * * *"`, archiveCutoff = 30-day, dropCutoff = 60-day, Step 1 inside transaction, Step 2 deletes from archive. grep count = 11 (archiveCutoff, dropCutoff, auditLogArchive refs). Deploy to Azure not yet confirmed — human step required. |
| 11 | ROADMAP.md shows Phase 29 as complete | FAILED | Line 41 reads `- [ ] **Phase 29**...` — checkbox was never toggled to `[x]`. No completion date stamped. This is the only gap. |

**Score: 10/11 truths verified** (1 administrative gap, 4 human-required runtime confirmations)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/drizzle/0016_rbac_foundation.sql` | DDL for all schema additions | VERIFIED | File exists, 52 lines, matches research spec verbatim. All IF NOT EXISTS guards present. |
| `app/scripts/migrate-0016-rbac.ts` | Idempotent migration runner | VERIFIED | File exists. Live run confirms all 15 statements OK; verification block queries information_schema. |
| `app/scripts/seed-rbac-day1.ts` | Day-1 user role + lead backfill | VERIFIED | File exists. Live run shows 3 users with owner/active; 0 NULL lead_manager_id rows. |
| `app/src/lib/permissions.ts` | userCan, sessionCan, canEditLead exports | VERIFIED | All 3 functions exported (lines 90, 98, 109). ROLE_GRANTS matrix present. No "use server" directive (correct — pure sync TS). |
| `app/src/lib/audit-log.ts` | logAudit() helper | VERIFIED | Single export `logAudit` (line 9). try/catch wraps DB insert. Headers read for IP/UA. |
| `app/src/lib/feedback-admin.ts` | isAdmin() refactored to userCan | VERIFIED | Entire file is 20 lines; no hardcoded email; delegates to permissions.ts. |
| `app/src/auth.ts` | NextAuth gates (domain + active + roles + JWT/session callbacks) | VERIFIED (code) | All 4 gate conditions present. JWT and session callbacks thread roles + userId. |
| `app/src/db/schema.ts` | Drizzle types for all new columns + tables | VERIFIED | roles, isActive, acquisitionUserId, dispositionUserId, coordinatorUserId, leadManagerId, createdByUserId, auditLog, auditLogArchive all present. |
| `scraper/src/db/schema.ts` | Drizzle types mirrored for archive Function | VERIFIED | roles, isActive, auditLog, auditLogArchive present (lines 374-375, 381-420). |
| `scraper/src/functions/auditLogArchive.ts` | Azure Function timer trigger | VERIFIED (code) | File exists, 53 lines, schedule `0 0 3 * * *`, correct two-step logic, .js import extensions for node16 module resolution. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| All mutating server actions | audit-log.ts logAudit() | import + call after DB write | WIRED | All 6 action files import logAudit and call it. grep counts all >= 4. |
| auth.ts authorize callback | users.is_active + users.roles | DB select, reject if !isActive or roles.length=0 | WIRED (code) | Lines 39-42 in auth.ts confirmed. |
| feedback-admin.ts isAdmin() | permissions.ts userCan() | import + direct call | WIRED | feedback-admin.ts line 2 imports userCan; line 19 calls it. |
| session.user.roles (Phase 30 UI) | permissions.ts sessionCan() | sessionCan() available for import | VERIFIED | sessionCan() exported from permissions.ts; Phase 30 will consume it. |
| auditLogArchive.ts | scraper/src/db/schema.ts auditLog/auditLogArchive | import with .js extensions | WIRED | Lines 21-22 use `../db/schema.js` (correct node16 pattern). |

---

### TypeScript Compilation

| Project | Status | Details |
|---------|--------|---------|
| `app/` — `npx tsc --noEmit` | CLEAN | No output (exit 0) |
| `scraper/` — `npx tsc --noEmit` | CLEAN | No output (exit 0) |

---

### Anti-Patterns Found

No blocker anti-patterns detected in the modified files. The `(tx: any)` annotation in auditLogArchive.ts is a documented intentional workaround for the Drizzle node16 generic constraint (noted in SUMMARY decisions). No TODO/FIXME/placeholder comments found in any of the 10 key files. No stub return values (`return null`, `return {}`, etc.) found in mutating paths.

---

### Gaps Summary

**1 administrative gap — ROADMAP.md Phase 29 checkbox not toggled**

The phase is functionally complete: all schema migrations applied to prod, all three owner users seeded, all leads backfilled, helpers substantive and wired, NextAuth gates implemented, all 6 action files wrapped with userCan + logAudit, and both TypeScript targets compile clean. The only gap is that `.planning/ROADMAP.md` line 41 still reads `- [ ]` instead of `- [x] ... (completed 2026-04-26)`. This is a 30-second fix.

**Fix required:**

Change line 41 in `.planning/ROADMAP.md` from:
```
- [ ] **Phase 29: RBAC Foundation + Audit Log** *(added 2026-04-28)* - ...
```
To:
```
- [x] **Phase 29: RBAC Foundation + Audit Log** *(added 2026-04-28)* - ... (completed 2026-04-26)
```

---

### Human Verification Required

#### 1. Login flow — roles in session

**Test:** Log in as brian@no-bshomes.com from a logged-out state. In any server component (e.g. add a temporary log line in a layout), print `session.user.roles`.
**Expected:** `['owner']` is printed; login completes; redirect to dashboard.
**Why human:** Cannot exercise the full NextAuth JWT round-trip programmatically.

#### 2. Domain restriction gate

**Test:** Visit /login, attempt to log in with test@gmail.com (any password).
**Expected:** Login fails; error shown; no session created.
**Why human:** Requires live browser + NextAuth runtime.

#### 3. Audit log write round-trip

**Test:** As Brian, change a lead's status. Then query `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 1`.
**Expected:** Row with actor_user_id = Brian's UUID (03c846f6-...), action = 'lead.status_changed', entity_type = 'lead', entity_id = the lead's UUID, non-null new_value JSON.
**Why human:** Code paths are verified correct, but the live DB round-trip has not been observed this session.

#### 4. Azure Function deployment

**Test:** After the next scraper GitHub Actions push, open the Azure Function App console and navigate to Functions list.
**Expected:** 'auditLogArchive' appears with status Enabled. First run log entry shows "archived 0, dropped 0" (no rows old enough yet on day 1).
**Why human:** Azure Function App registration only happens after deploy; portal access required.

---

_Verified: 2026-04-26_
_Verifier: Claude (gsd-verifier)_
