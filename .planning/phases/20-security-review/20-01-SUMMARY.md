---
phase: 20-security-review
plan: 01
subsystem: auth
tags: [security, next.js, csp, hsts, password-policy, middleware]

# Dependency graph
requires:
  - phase: 17-netlify-migration-design-system
    provides: netlify.toml and next.config.ts baseline on Netlify adapter
provides:
  - Live /api/migrate endpoint permanently removed
  - Security response headers on all HTTP responses via Next.js headers()
  - Server-side password policy enforcement (8 chars + uppercase + number)
  - Next.js 15.5.15 with patched high-severity DoS CVE
affects: [security, auth, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "next.config.ts async headers() for SSR-reliable security headers on Netlify"
    - "netlify.toml [[headers]] as belt-and-suspenders for static assets only"
    - "CSP deployed as Content-Security-Policy-Report-Only first — promote to enforcing after stability"

key-files:
  created: []
  modified:
    - app/src/middleware.ts
    - app/next.config.ts
    - app/netlify.toml
    - app/src/lib/password-reset-actions.ts
    - app/src/app/reset-password/page.tsx
    - app/package.json

key-decisions:
  - "api/migrate deleted entirely — not just gated — eliminates attack surface at source"
  - "Next.js headers() for SSR coverage over netlify.toml CSP — Netlify SSR adapter may not apply toml headers to SSR routes"
  - "CSP as Report-Only initially — prevents breakage during rollout, can promote to enforcing after verification"
  - "netlify.toml [[headers]] for non-CSP headers only — belt-and-suspenders for static assets"
  - "Password policy checks ordered: length → uppercase → number → confirm-match — fail-fast with most-common first"

patterns-established:
  - "Security headers: add to next.config.ts async headers() for full SSR coverage on Netlify"
  - "CSP rollout: Report-Only first, then promote to enforcing Content-Security-Policy"

requirements-completed: [SEC-01, SEC-02, SEC-03, SEC-04, SEC-05]

# Metrics
duration: 8min
completed: 2026-04-10
---

# Phase 20 Plan 01: Security Review Summary

**Live account-seeding endpoint deleted, Next.js 15.5.15 CVE patches applied, HSTS/CSP/XFO/XCTO headers added to all responses, password policy strengthened server-side**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-10T00:07:30Z
- **Completed:** 2026-04-10T00:15:22Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Deleted `app/src/app/api/migrate/route.ts` — live endpoint that seeded user accounts with hardcoded password using same API key as lead ingest; removed from middleware matcher exclusions
- Upgraded Next.js from 15.5.13 to 15.5.15 patching GHSA-q4gf-8mx6-v5v3 (high-severity DoS CVE); npm audit shows zero high/critical findings
- Added 7 security headers to all HTTP responses via `next.config.ts` async headers(): HSTS (2yr + preload), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control, Content-Security-Policy-Report-Only
- Added 5 non-CSP headers to `netlify.toml` [[headers]] for static asset belt-and-suspenders coverage
- Enforced password policy server-side in `resetPassword()`: 8 chars minimum + uppercase + number; UI hint added to reset-password page

## Task Commits

1. **Task 1: Remove migrate endpoint, upgrade Next.js, enforce password policy** - `6db4bf0` (fix)
2. **Task 2: Add security response headers to housefinder next.config.ts** - `09718c9` (feat)

## Files Created/Modified
- `app/src/app/api/migrate/route.ts` - DELETED (live user-seeding endpoint eliminated)
- `app/src/middleware.ts` - Removed api/migrate from public route exclusion list
- `app/src/lib/password-reset-actions.ts` - Added uppercase and number checks to resetPassword()
- `app/src/app/reset-password/page.tsx` - Added password policy hint below input
- `app/next.config.ts` - Added async headers() with 7 security headers including CSP-Report-Only
- `app/netlify.toml` - Added [[headers]] block with 5 non-CSP security headers
- `app/package.json` - Upgraded next to ^15.5.15
- `app/package-lock.json` - Lock file updated

## Decisions Made
- api/migrate deleted entirely (not just gated) — eliminates the attack surface at source; the endpoint had served its migration purpose
- next.config.ts async headers() chosen over netlify.toml for SSR coverage — Netlify's @netlify/plugin-nextjs Edge Runtime adapter may not reliably apply toml headers to server-rendered pages
- CSP deployed as Content-Security-Policy-Report-Only — allows monitoring for violations without breaking the app; promote to enforcing after stability period
- netlify.toml [[headers]] carries non-CSP headers only — belt-and-suspenders for static file delivery, avoids duplicate CSP complexity
- Password policy checks ordered length → uppercase → number → confirm-match — most common failures first for better UX

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- npm audit reports 4 moderate vulnerabilities in drizzle-kit (via @esbuild-kit/esm-loader). These are dev-only tooling dependencies unrelated to the Next.js CVE being patched. Fix requires drizzle-kit downgrade to a breaking version (0.18.1), which would break migrations. Deferred — dev-only, not present in production build.

## User Setup Required

None - no external service configuration required. All changes are code-level.

## Next Phase Readiness
- Critical/high security vulnerabilities eliminated: live exploit endpoint gone, CVE patched, headers on all responses
- Plans 20-02 (rate limiting) and 20-03 (API key rotation) can now proceed
- CSP is in Report-Only mode — after a deploy cycle, check Netlify logs for CSP violations before promoting to enforcing

---
*Phase: 20-security-review*
*Completed: 2026-04-10*
