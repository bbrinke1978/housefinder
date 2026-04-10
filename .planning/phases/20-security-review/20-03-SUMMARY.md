---
phase: 20-security-review
plan: 03
subsystem: security
tags: [owasp, security-audit, secrets-inventory, sql-injection, access-control, git-history-scan]

# Dependency graph
requires:
  - phase: 20-security-review
    plan: 01
    provides: migrate endpoint deleted, security headers added, password policy enforced
  - phase: 20-security-review
    plan: 02
    provides: nobshomes Next.js upgrade, nobshomes security headers
provides:
  - OWASP Top 10 audit report across both repos
  - Git history secret scan results
  - SECURITY-FINDINGS.md with severity-rated findings
  - SECRETS-INVENTORY.md with all 27 secrets and rotation procedures
  - Inline security comments on all sql.raw() usages
affects: [security, docs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sql.raw() security comments: SECURITY: comment explaining why each usage is safe at the call site"
    - "OWASP Top 10 audit table: checklist tracking per-item status with finding cross-references"

key-files:
  created:
    - .planning/phases/20-security-review/SECURITY-FINDINGS.md
    - .planning/phases/20-security-review/SECRETS-INVENTORY.md
  modified:
    - app/src/lib/analytics-queries.ts
    - app/src/lib/campaign-queries.ts

key-decisions:
  - "MED-03 (missing auth() on some server actions) documented as accepted risk — 3-user single-tenant system, middleware protects page routes, no multi-tenancy impact"
  - "HouseFinder2026! in git history: appears only in deletion diff of removed file — not an active credential; users should rotate via forgot-password flow"
  - "sql.raw() usages confirmed safe: analytics alias is a compile-time constant, campaign UUIDs are DB-sourced not user-input-sourced"
  - "MED-05 (Netlify firewall limitation) documented as accepted risk — full lockdown requires Enterprise tier; SSL + strong credentials provide compensating control"

patterns-established:
  - "SECURITY: inline comments on every sql.raw() usage explaining why each is safe"

requirements-completed:
  - SEC-08
  - SEC-09
  - SEC-10
  - SEC-11
  - SEC-12

# Metrics
duration: 12min
completed: 2026-04-10
---

# Phase 20 Plan 03: OWASP Audit and Security Documentation Summary

**Complete OWASP Top 10 audit across housefinder + nobshomes, git history secret scan on both repos, SECURITY-FINDINGS.md (381 lines, 1 critical/2 high fixed + 5 medium/4 low accepted), SECRETS-INVENTORY.md (184 lines, 27 secrets across 3 deployment targets with rotation procedures)**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-10T18:49:50Z
- **Completed:** 2026-04-10T19:01:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Completed full OWASP Top 10 checklist across both repos — all 24 checklist items checked and documented
- Traced both `sql.raw()` usages to confirm no user-controlled input reaches them; added inline `// SECURITY:` comments to `analytics-queries.ts` and `campaign-queries.ts`
- Verified auth() protection on all 3 public-facing API routes (`/api/export`, `/api/buyers/export`, `/api/contracts/[id]/pdf`)
- Confirmed `/sign/[token]` page only exposes contract address and signer name — no internal deal/property data leaks
- Confirmed `/floor-plans/[token]` enforces `shareExpiresAt < new Date()` expiry check in `getFloorPlanByShareToken()`
- Verified password reset tokens use `randomBytes(32).toString('hex')` (256-bit entropy), 1-hour expiry, and single-use marking (`usedAt` column)
- Confirmed `rejectUnauthorized: true` in `app/src/db/client.ts` — SSL enforced on all DB connections
- Confirmed all Azure Blob Storage containers use private access (no `publicAccessLevel` set in `createIfNotExists()` calls)
- Ran `npm audit` on both repos: 0 high/critical; 4 moderate dev-only (drizzle-kit esbuild CVE — accepted)
- Scanned git history on both repos for committed secrets — clean except for `HouseFinder2026!` in deletion diff (low risk, rotation action item)
- Delivered `SECURITY-FINDINGS.md` (381 lines): 1 critical, 2 high, 5 medium, 4 low findings with severity ratings and fix status
- Delivered `SECRETS-INVENTORY.md` (184 lines): 27 secrets across 3 deployment targets, rotation procedures for critical secrets, 5 action items

## Task Commits

1. **Task 1: OWASP audit, git history scan, SECURITY-FINDINGS.md** — `6e61d71` (docs)
2. **Task 2: Create SECRETS-INVENTORY.md** — `696486f` (docs)

## Files Created/Modified

- `.planning/phases/20-security-review/SECURITY-FINDINGS.md` — CREATED: Full audit report with OWASP checklist, git scan results, all findings categorized by severity
- `.planning/phases/20-security-review/SECRETS-INVENTORY.md` — CREATED: All 27 secrets across 3 deployment targets with rotation procedures and action items
- `app/src/lib/analytics-queries.ts` — MODIFIED: Added `// SECURITY: sql.raw(alias) is safe — alias is a compile-time TypeScript constant` comment
- `app/src/lib/campaign-queries.ts` — MODIFIED: Added `// SECURITY: sql.raw() wraps server-fetched UUIDs from DB, not user input` comment

## Decisions Made

- **MED-03 (missing auth() on some server actions) accepted as risk** — Files without auth(): `analytics-actions.ts`, `buyer-actions.ts`, `campaign-actions.ts`, non-signing `contract-actions.ts` functions. At 3-user single-tenant scale, the middleware protection on page routes provides sufficient defense. Adding auth() to remaining actions is recommended for future multi-user expansion.
- **HouseFinder2026! in git history documented as low risk** — The default seeded password appears only in the deletion diff of commit `6db4bf0`. It is not an active secret in source. Action item: all 3 users should rotate passwords via forgot-password flow.
- **sql.raw() usages confirmed safe and annotated** — Both usages verified to use compile-time constants or DB-sourced UUIDs, not user input. Inline security comments added as documentation.
- **Netlify firewall limitation documented as accepted risk** — Full PostgreSQL firewall lockdown to Netlify IPs requires Enterprise "Private Connectivity." Current compensating controls (SSL + rejectUnauthorized: true + strong credentials) adequate for current scale.

## Deviations from Plan

None — plan executed exactly as written. All OWASP checklist items completed. Both documents delivered meeting minimum line counts (381 vs 80 minimum for SECURITY-FINDINGS.md; 184 vs 30 minimum for SECRETS-INVENTORY.md).

## Issues Encountered

None.

## User Action Required

The following items require manual action from Brian:

1. **Password rotation (PRIORITY: HIGH)** — Brian, Shawn, and Admin should each use the forgot-password flow to set new passwords. The default seeded password `HouseFinder2026!` from the now-deleted `/api/migrate` endpoint is documented in git history.

2. **Mapbox token domain restriction (PRIORITY: HIGH)** — Log in to https://account.mapbox.com/ and restrict `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to domain `finder.no-bshomes.com`.

3. **Confirm nobshomes database and storage sharing (PRIORITY: MEDIUM)** — Determine whether nobshomes uses the same Azure PostgreSQL server and Storage account as housefinder. This affects rotation coordination. Update SECRETS-INVENTORY.md when confirmed.

4. **Promote CSP from Report-Only to enforcing (PRIORITY: MEDIUM)** — After a deploy cycle, check Netlify function logs for CSP violations. If none found, promote `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in both repos' `next.config.ts`.

## Next Phase Readiness

- Plan 20-04 can proceed — all audit deliverables complete
- Security documentation is complete for handoff
- Phase 20 security review is 75% complete (3 of 4 plans)

---

## Self-Check

**SECURITY-FINDINGS.md exists:** `test -f .planning/phases/20-security-review/SECURITY-FINDINGS.md` — FOUND
**SECRETS-INVENTORY.md exists:** `test -f .planning/phases/20-security-review/SECRETS-INVENTORY.md` — FOUND
**SECURITY-FINDINGS.md length:** 381 lines (minimum 80 required) — PASS
**SECRETS-INVENTORY.md length:** 184 lines (minimum 30 required) — PASS
**SECURITY-FINDINGS.md contains "Critical":** grep -c returns 23 — PASS
**SECRETS-INVENTORY.md contains "DATABASE_URL":** grep -c returns 15 — PASS
**Task 1 commit exists:** `6e61d71` — FOUND
**Task 2 commit exists:** `696486f` — FOUND

## Self-Check: PASSED

---

*Phase: 20-security-review*
*Completed: 2026-04-10*
