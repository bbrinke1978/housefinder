# Phase 20: Security Review - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Comprehensive security audit of both the No BS Workbench (finder.no-bshomes.com / housefinder repo) and the No BS Homes marketing site (no-bshomes.com / nobshomes repo). Covers secrets management, auth hardening, infrastructure configuration, and application code. Produces a findings report with severity ratings and fixes all critical/high issues.

</domain>

<decisions>
## Implementation Decisions

### Secrets management
- **Hybrid approach:** Azure Key Vault for Azure-side secrets (DB password, storage keys, Tracerfy key, Functions config). Netlify env vars for frontend secrets (AUTH_SECRET, RESEND_API_KEY, MAPBOX token) since Netlify lacks native Key Vault integration.
- **Key Vault references:** Azure Functions already supports this pattern (WEBSITE_LEAD_API_KEY uses it). Extend to all Functions secrets.
- **Secrets inventory:** Deliver a markdown document listing every secret, its location (Key Vault/Netlify/Azure Functions), last rotated date, and rotation cadence.
- **Git history scan:** Run a secrets scan on git history for both repos. If leaked secrets found, rotate immediately.

### Auth & access control
- **No roles for now:** All 3 users (brian, shawn, admin) have equal access. Roles are a future phase if needed.
- **Audit all public routes:** Review every route excluded from auth middleware (sign, floor-plans, forgot-password, reset-password, api/migrate, api/leads). Verify token-gated pages can't leak deal/property data.
- **Password policy:** Minimum 8 chars, at least one uppercase + one number. Enforce on reset-password page.

### Infrastructure hardening
- **PostgreSQL firewall:** Lock down to Netlify outbound IPs + Azure Functions only. Block all other access. Use temporary migration endpoints or `az` CLI for ad-hoc DB admin.
- **Security headers:** Add standard headers via netlify.toml — Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options. Zero performance impact.
- **Blob Storage audit:** Verify all containers are private. Confirm app generates time-limited SAS URLs for photo/receipt/PDF access. No public blob URLs.
- **Both sites:** Apply security headers to no-bshomes.com marketing site as well.

### Code audit scope
- **OWASP Top 10 scan:** SQL injection, XSS, CSRF, SSRF, broken auth, security misconfiguration, sensitive data exposure across both repos.
- **Findings report:** Markdown report with severity ratings (critical/high/medium/low), description, location, and fix for each finding. Fix all critical and high issues in this phase.
- **npm audit:** Run on both repos. Fix critical and high dependency vulnerabilities. Document medium/low as accepted risk.
- **Both repos:** Audit housefinder (Workbench) AND nobshomes (marketing site) together.

### Claude's Discretion
- Exact CSP directives (script-src, style-src, etc.) based on what the app actually loads
- Which npm vulnerabilities to fix vs accept as low-risk
- How to structure the findings report
- Whether to add rate limiting to login/reset endpoints (research recommendation)

</decisions>

<specifics>
## Specific Ideas

- The nobshomes.com site is a simple Next.js marketing site with Netlify Forms — simpler audit but still needs headers, form security, and config review
- User travels frequently — DB firewall rules must not block the app itself (Netlify → PostgreSQL), only direct DB access
- Temporary migration endpoints have been used multiple times — audit pattern should verify they're always removed after use
- The recent auth migration (env vars → DB users) should be specifically reviewed for the password reset token flow security

</specifics>

<deferred>
## Deferred Ideas

- Role-based access control (RBAC) — future phase if user base grows
- Rate limiting on login/reset endpoints — research during this phase, implement if warranted
- Automated rotation alerts via Resend — nice-to-have, not in scope
- Professional penetration test — this audit is prep work if they decide to do one

</deferred>

---

*Phase: 20-security-review*
*Context gathered: 2026-04-10*
