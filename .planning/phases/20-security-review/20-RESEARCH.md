# Phase 20: Security Review - Research

**Researched:** 2026-04-09
**Domain:** Application security, secrets management, infrastructure hardening, OWASP Top 10
**Confidence:** HIGH (code inspected directly; infrastructure gaps from official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Secrets management**
- Hybrid approach: Azure Key Vault for Azure-side secrets (DB password, storage keys, Tracerfy key, Functions config). Netlify env vars for frontend secrets (AUTH_SECRET, RESEND_API_KEY, MAPBOX token) since Netlify lacks native Key Vault integration.
- Key Vault references: Azure Functions already supports this pattern (WEBSITE_LEAD_API_KEY uses it). Extend to all Functions secrets.
- Secrets inventory: Deliver a markdown document listing every secret, its location (Key Vault/Netlify/Azure Functions), last rotated date, and rotation cadence.
- Git history scan: Run a secrets scan on git history for both repos. If leaked secrets found, rotate immediately.

**Auth & access control**
- No roles for now: All 3 users (brian, shawn, admin) have equal access. Roles are a future phase if needed.
- Audit all public routes: Review every route excluded from auth middleware (sign, floor-plans, forgot-password, reset-password, api/migrate, api/leads). Verify token-gated pages can't leak deal/property data.
- Password policy: Minimum 8 chars, at least one uppercase + one number. Enforce on reset-password page.

**Infrastructure hardening**
- PostgreSQL firewall: Lock down to Netlify outbound IPs + Azure Functions only. Block all other access. Use temporary migration endpoints or `az` CLI for ad-hoc DB admin.
- Security headers: Add standard headers via netlify.toml — Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options. Zero performance impact.
- Blob Storage audit: Verify all containers are private. Confirm app generates time-limited SAS URLs for photo/receipt/PDF access. No public blob URLs.
- Both sites: Apply security headers to no-bshomes.com marketing site as well.

**Code audit scope**
- OWASP Top 10 scan: SQL injection, XSS, CSRF, SSRF, broken auth, security misconfiguration, sensitive data exposure across both repos.
- Findings report: Markdown report with severity ratings (critical/high/medium/low), description, location, and fix for each finding. Fix all critical and high issues in this phase.
- npm audit: Run on both repos. Fix critical and high dependency vulnerabilities. Document medium/low as accepted risk.
- Both repos: Audit housefinder (Workbench) AND nobshomes (marketing site) together.

### Claude's Discretion
- Exact CSP directives (script-src, style-src, etc.) based on what the app actually loads
- Which npm vulnerabilities to fix vs accept as low-risk
- Whether to add rate limiting to login/reset endpoints (research recommendation)
- How to structure the findings report

### Deferred Ideas (OUT OF SCOPE)
- Role-based access control (RBAC) — future phase if user base grows
- Automated rotation alerts via Resend — nice-to-have, not in scope
- Professional penetration test — this audit is prep work if they decide to do one
</user_constraints>

---

## Summary

This is a security audit and remediation phase covering both the No BS Workbench app (housefinder repo, Next.js 15 on Netlify + Azure Functions scraper) and the No BS Homes marketing site (nobshomes repo, Next.js 15 on Netlify). Direct code inspection has identified several concrete, actionable issues — notably a live migration endpoint that must be removed, a critical Next.js CVE requiring an upgrade, an SSL certificate rotation requirement, and missing security headers on both Netlify deployments.

The most time-sensitive issues are: (1) the `/api/migrate` route still exists in the deployed app and seeds user accounts behind the same API key used by the leads API — this must be removed immediately; (2) both apps run Next.js 15.5.13 which has a confirmed high-severity DoS vulnerability fixed in 15.5.15; (3) neither `netlify.toml` has any security headers configured. The Blob Storage and auth flow are in generally good shape — all containers use private access with server-generated SAS URLs.

The Netlify PostgreSQL firewall lock-down decision has a significant constraint discovered during research: Netlify does **not** provide static outbound IP addresses without their Enterprise "Private Connectivity" add-on. The DB firewall cannot be locked to Netlify outbound IPs without that paid feature. The workaround is to keep `Allow Azure services` enabled for Azure Functions connections and document the limitation — or use SSL enforcement + strong credentials as the compensating control.

**Primary recommendation:** Remove the `/api/migrate` route immediately, upgrade Next.js to 15.5.15, add security headers to both `netlify.toml` files, and document the Netlify static-IP limitation before attempting DB firewall rules.

---

## Critical Pre-Existing Issues (Discovered During Research)

These are not "things to research" — they are specific bugs/vulnerabilities found by reading the code directly.

### CRITICAL: `/api/migrate` route is still live in production

**File:** `app/src/app/api/migrate/route.ts`
**What it does:** A GET endpoint that:
1. Creates the `users` and `password_reset_tokens` tables in the production database
2. Seeds three user accounts (brian, shawn, admin) with a hardcoded password `HouseFinder2026!`
3. Is gated by `?key=WEBSITE_LEAD_API_KEY` — the same key used by the public leads ingest API

**Why dangerous:** The API key is transmitted in a URL query parameter (visible in server logs, Netlify access logs, browser history). Anyone who finds this URL can re-seed user accounts with the known default password, potentially overwriting changed passwords via the `onConflictDoNothing` pattern — though the conflict-do-nothing actually prevents re-seeding, so active password changes are safe. The bigger risk is the key being logged/leaked.

**The git confusion:** Commit `f6327d1` said "remove temporary migration endpoint" but only removed an *earlier* version of the file. Commit `dc88822` introduced a *new* `migrate/route.ts` for user seeding which was never removed.

**Middleware note:** The middleware matcher explicitly includes `api/migrate` in the public route exclusions: `"/((?!api/auth|api/migrate|login|...).*)"`. This confirms the route bypasses auth.

**Fix:** Delete `app/src/app/api/migrate/route.ts` and remove `api/migrate` from the middleware exclusion list.

### HIGH: Next.js 15.5.13 has a confirmed high-severity CVE

Both repos run `next@15.5.13`.

**CVEs identified by `npm audit`:**
- `GHSA-q4gf-8mx6-v5v3` — Next.js Denial of Service with Server Components (high)
- `GHSA-3x4c-7xq6-9pq8` — Unbounded next/image disk cache growth exhausts storage (moderate)

**Fix:** `npm install next@15.5.15` in both `app/` and `nobshomes/`. The audit confirms 15.5.15 fixes both.

### HIGH: `app/.env.local` contains live production credentials

The file `app/.env.local` was read during research and contains:
- Live `DATABASE_URL` with PostgreSQL credentials for `housefinder-db.postgres.database.azure.com`
- Live `AUTH_SECRET`
- Live `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`

The `.gitignore` correctly excludes `.env*` patterns, and git history shows no committed env files. However, the git history scan should verify this across all commits.

There is also `app/.env.migration` — this file's contents should be reviewed and it should be confirmed untracked.

### MEDIUM: `analytics-queries.ts` uses `sql.raw(alias)` with a column alias string

**File:** `app/src/lib/analytics-queries.ts`
**Pattern:** `sql\`lower(${sql.raw(alias)}.city) IN (...)\``

`sql.raw()` in Drizzle bypasses parameterization. The `alias` value here is a TypeScript constant passed from the calling function (not user input), so this is LOW exploitation risk. However, it should be verified in the OWASP audit that no user-controlled value ever reaches `sql.raw()`.

### MEDIUM: `nobshomes` generates 1-year read SAS tokens for gallery images

**File:** `nobshomes/src/app/api/admin/upload-url/route.ts`
The upload URL API generates a 1-year read SAS token stored in the database as the permanent URL. This is a deliberate tradeoff for a public marketing gallery (these images are meant to be viewable), but it means any URL that leaks remains valid for a year. The container public access should be confirmed private despite these long-lived SAS tokens.

---

## Standard Stack for Security Tooling

### Tools for This Phase

| Tool | Version | Purpose | Source |
|------|---------|---------|--------|
| gitleaks | latest binary | Scan git history for committed secrets | gitleaks.io (open source) |
| npm audit | built-in | Dependency vulnerability scan | npm CLI |
| Manual OWASP review | N/A | Code review checklist | OWASP Top 10 2021 |
| `az` CLI | latest | DB firewall rules, Key Vault setup | Azure official |
| Netlify `netlify.toml` headers | N/A | Security response headers | Netlify Docs |

### Installing Gitleaks (Windows)

Gitleaks is not available via npx. It must be downloaded as a binary.

```bash
# Option 1: Download binary from GitHub releases
# https://github.com/gitleaks/gitleaks/releases/latest
# Download gitleaks_X.Y.Z_windows_x64.zip, extract gitleaks.exe

# Option 2: Via Docker (if Docker Desktop installed)
docker run -v /c/Users/bbrinkerhoff.WMCCAT/OneDrive/documents/housefinder:/repo zricethezav/gitleaks:latest detect --source /repo --report-path /repo/gitleaks-report.json

# Option 3: Via Go (if Go is installed)
go install github.com/gitleaks/gitleaks/v8@latest
```

Then run:
```bash
gitleaks detect --source /c/Users/bbrinkerhoff.WMCCAT/OneDrive/documents/housefinder --log-opts="--all"
gitleaks detect --source /c/Users/bbrinkerhoff.WMCCAT/OneDrive/documents/nobshomes --log-opts="--all"
```

### npm audit Commands

```bash
# housefinder app
cd app/ && npm audit
npm audit --json > audit-results.json

# nobshomes
cd /c/Users/bbrinkerhoff.WMCCAT/OneDrive/documents/nobshomes && npm audit

# Fix known safe upgrades
cd app/ && npm install next@15.5.15
cd /c/Users/bbrinkerhoff.WMCCAT/OneDrive/documents/nobshomes && npm install next@15.5.15
```

---

## Architecture Patterns

### Secrets Inventory Structure

Deliver a `SECRETS-INVENTORY.md` document with this structure:

```markdown
# Secrets Inventory — No BS Homes Platform

| Secret | Value Location | Store | Last Rotated | Rotation Cadence | Notes |
|--------|----------------|-------|--------------|-----------------|-------|
| DATABASE_URL | Netlify env | Netlify | 2026-03-XX | Annual | Includes host, user, password |
| AUTH_SECRET | Netlify env | Netlify | 2026-XX-XX | Yearly | NextAuth JWT signing key |
| RESEND_API_KEY | Netlify env | Netlify | - | Yearly | Email sending |
| NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN | Netlify env | Netlify | - | Yearly | Public; restrict to domain |
| WEBSITE_LEAD_API_KEY | Azure Key Vault + Azure Functions app settings | Key Vault reference | - | Yearly | Used for leads ingest + migrate (remove migrate) |
| AZURE_STORAGE_CONNECTION_STRING | Netlify env | Netlify | - | Yearly | Full account key — high value |
| AZURE_DOCUMENT_INTELLIGENCE_KEY | Netlify env | Netlify | - | Yearly | OCR service |
| AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT | Netlify env | Netlify | - | N/A | Public endpoint URL |
| RESEND_API_KEY (scraper) | Azure Functions app settings | Key Vault reference | - | Yearly | Email dispatch |
| TRACERFY_API_KEY | Azure Functions app settings | Key Vault reference | - | Yearly | Skip trace |
| TWILIO_ACCOUNT_SID | Azure Functions app settings | Key Vault reference | - | Yearly | SMS |
| TWILIO_AUTH_TOKEN | Azure Functions app settings | Key Vault reference | - | Yearly | SMS |
| TWILIO_PHONE_NUMBER | Azure Functions app settings | Key Vault reference | - | N/A | Phone number |
| nobshomes DATABASE_URL | Netlify env | Netlify | - | Annual | Same or different PG server? |
| nobshomes AUTH_SECRET | Netlify env | Netlify | - | Yearly | Admin portal signing key |
| AZURE_STORAGE_ACCOUNT_KEY (nobshomes) | Netlify env | Netlify | - | Yearly | Gallery uploads |
| HOUSEFINDER_API_KEY (nobshomes) | Netlify env | Netlify | - | Yearly | Leads bridge API key |
```

### Security Headers for netlify.toml

**Important constraint for housefinder (Next.js SSR on Netlify):** The `@netlify/plugin-nextjs` plugin serves SSR responses through Netlify Edge Functions, not static files. Netlify `[[headers]]` in `netlify.toml` apply to the CDN layer but SSR pages served via the Next.js plugin may not pick them up on all response paths. The recommended approach for Next.js on Netlify is to set headers in `next.config.ts` using the `headers()` async function, which applies at the application layer.

For the nobshomes marketing site (also Next.js on Netlify), the same pattern applies.

**Pattern 1: Security headers via next.config.ts (RECOMMENDED for both Next.js sites)**

```typescript
// Source: https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers
// next.config.ts

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // ... existing config
};
```

**Pattern 2: netlify.toml headers (applies to static assets/CDN layer, use as belt-and-suspenders)**

```toml
# Add to netlify.toml AFTER existing [build] and [[plugins]] sections
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(self)"
```

**CSP for housefinder (Workbench) — requires careful scoping:**

The app loads from:
- `self` (all app code)
- `*.blob.core.windows.net` (SAS images, photos, floor plans, contracts)
- `api.mapbox.com`, `events.mapbox.com`, `*.mapbox.com` (Mapbox GL JS tiles and geocoding)
- `fonts.googleapis.com`, `fonts.gstatic.com` (Google Fonts via next/font)
- Inline SVG data URIs (grain overlay in globals.css)

The `dangerouslySetInnerHTML` pattern is NOT used in the Workbench app (no inline scripts). However, Next.js requires `'unsafe-inline'` in style-src for styled-jsx and inline styles. Use `unsafe-inline` for styles and `'self'` + `'nonce-{nonce}'` for scripts if strict CSP is desired.

**Recommended starting CSP for Workbench (report-only first):**

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://*.blob.core.windows.net; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.mapbox.com https://events.mapbox.com; worker-src blob:; frame-ancestors 'none';
```

**CSP for nobshomes (marketing site) — Google Analytics adds complexity:**

The nobshomes site uses `@next/third-parties/google` which injects Google Analytics scripts. The FAQ page uses `dangerouslySetInnerHTML` for structured data (JSON-LD). This requires `'unsafe-inline'` in script-src or nonce-based CSP.

Nobshomes loads from:
- `self`
- `*.blob.core.windows.net` (gallery images)
- `www.googletagmanager.com`, `www.google-analytics.com` (GA4)
- `fonts.googleapis.com`, `fonts.gstatic.com` (if using Google Fonts)

**Recommended starting CSP for nobshomes (report-only first):**

```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; img-src 'self' data: blob: https://*.blob.core.windows.net https://www.google-analytics.com; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; frame-ancestors 'none';
```

**Strategy:** Deploy `Content-Security-Policy-Report-Only` first. Review Netlify function logs for violations. Then promote to enforcing `Content-Security-Policy` after confirming no breakage.

### PostgreSQL Firewall — Critical Constraint

**Discovery:** Netlify does NOT provide static outbound IP addresses without their Enterprise "Private Connectivity" add-on. Standard Netlify Functions run from 80+ dynamic IP addresses that rotate without notice. Source: https://docs.netlify.com/manage/security/private-connectivity/

**Implication:** The CONTEXT.md decision to "lock PostgreSQL firewall to Netlify outbound IPs + Azure Functions only" is **not achievable** without Netlify Enterprise. Attempting it would break the app.

**Practical approaches (in order of preference):**

1. **SSL + strong password as compensating control (current state, good enough):** The DB already enforces SSL (`rejectUnauthorized: true` in `db/client.ts`, `sslmode=require` in `DATABASE_URL`). Strong 30-character random password. No public ports exposed that aren't already HTTPS-gated.

2. **Azure Functions firewall rule:** Azure Functions has known outbound IP ranges. Run `az functionapp show --resource-group rg-housefinder --name {function-app-name} --query outboundIpAddresses` to get the current IPs. These are stable for a given App Service plan instance.

3. **Document the limitation:** In the findings report, note that full firewall lockdown requires Netlify Private Connectivity (Enterprise) or migrating DB connections through an Azure API Management / VNet endpoint.

4. **Partial lockdown:** Add an Azure Firewall rule for Azure Functions outbound IPs. Leave Netlify connections unrestricted (they already require SSL + the DATABASE_URL string which is a secret). This is better than nothing.

### Password Policy Enforcement

**Current state:** `password-reset-actions.ts` only checks `password.length < 8`. No uppercase or number requirement enforced server-side.

**Requirement from CONTEXT.md:** Minimum 8 chars + at least one uppercase + one number.

**Fix:** Add server-side validation in `resetPassword()`:

```typescript
// In password-reset-actions.ts resetPassword()
if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };
if (!/[A-Z]/.test(password)) return { error: "Password must contain at least one uppercase letter" };
if (!/[0-9]/.test(password)) return { error: "Password must contain at least one number" };
```

Also update the client-side `reset-password/page.tsx` to surface this policy to users before they submit.

Note: There is no UI for admin-initiated password change (no `/settings/change-password` page). The only way to change a password currently is through the forgot-password email flow. If the 3 users need to change from the seeded password `HouseFinder2026!`, they must go through that flow.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git secret scanning | Custom regex over git log | gitleaks binary | Knows 160+ secret patterns, handles binary-safe git history traversal |
| Password hashing | Custom bcrypt calls | Already using bcryptjs correctly | bcrypt cost factor 10 is fine; don't change |
| JWT signing | Custom signing | NextAuth handles this | next-auth manages `AUTH_SECRET` rotation correctly |
| CSP nonce generation | Custom nonce in middleware | Next.js nonce support in middleware | Next.js has built-in nonce propagation — but note: nonces disable static optimization; avoid for this scale |
| Rate limiting | Custom in-memory counter | See note below | In-memory counters don't survive Netlify serverless restarts |

**Rate limiting note (Claude's Discretion item):** Netlify Functions are serverless — any in-memory rate limit counter resets per cold start. Options for rate limiting login/reset endpoints:
- **Upstash Redis** (free tier, works with Netlify serverless) — industry standard for serverless rate limiting
- **Not worth the complexity at 3-user scale** — the auth endpoint is not public-facing in a meaningful threat model way. Brian, Shawn, and Admin are the only users. The forgot-password endpoint already prevents email enumeration.
- **Recommendation:** Skip rate limiting for this phase. The 3-user closed system doesn't warrant the infrastructure complexity. Document as accepted risk.

---

## Common Pitfalls

### Pitfall 1: Netlify Headers Not Applied to Next.js SSR Routes

**What goes wrong:** Security headers added to `netlify.toml [[headers]]` appear to work in testing but don't show up on dynamically rendered pages served by the `@netlify/plugin-nextjs` Edge Runtime adapter.

**Why it happens:** The `@netlify/plugin-nextjs` serves SSR responses through an Edge Function layer that bypasses Netlify's static CDN header injection.

**How to avoid:** Set headers in `next.config.ts` using the `headers()` async function. Use `netlify.toml [[headers]]` only as a secondary belt-and-suspenders for static assets. Verify with browser DevTools → Network tab that the actual response headers include your security headers after deployment.

### Pitfall 2: CSP Blocks Mapbox GL JS or Google Analytics

**What goes wrong:** A working app breaks in production after CSP is added because Mapbox GL JS loads workers from blob: URLs and GA4 uses eval in some configurations.

**Why it happens:** Mapbox GL JS uses Web Workers instantiated from blob: data URIs. GA4's Google Tag Manager may use eval for dynamic tag execution.

**How to avoid:** Deploy `Content-Security-Policy-Report-Only` first. Check Netlify function logs for CSP violations. Add `worker-src blob:` for Mapbox. Test on staging before switching to enforcing mode.

**Warning signs:** Map renders blank or throws console errors about worker script; GA events stop recording.

### Pitfall 3: Hardcoded Default Password in Seeded Accounts

**What goes wrong:** After removing the `/api/migrate` route, the 3 users (brian, shawn, admin) still have the seeded password `HouseFinder2026!` if they haven't used the password reset flow.

**Why it happens:** The migration seeded all accounts with one known password, committed in the source code.

**How to avoid:** Before removing the route, confirm all 3 users have changed their passwords via the reset-password flow. Alternatively, force a password reset by expiring all active sessions (change `AUTH_SECRET`) after the route is removed.

### Pitfall 4: PostgreSQL SSL Certificate Rotation (Nov 2025 → Q1 2026)

**What goes wrong:** Azure PostgreSQL Flexible Server is rotating its intermediate CA certificates. Apps using `rejectUnauthorized: true` with outdated CA bundles could fail.

**Why it happens:** Azure started a TLS certificate rotation in November 2025 using new DigiCert intermediate CAs. Apps that have pinned or bundled the old certificate may fail validation.

**How to avoid:** Confirm the Node.js `pg` driver (v8.20.0) uses the system CA bundle or `node_tls_default_allow_self_signed_certificate`. The current `db/client.ts` uses `ssl: { rejectUnauthorized: true }` which relies on Node.js's built-in CA bundle. Node 20 (used in both apps) should have updated CA bundles. Verify during the audit that connections are healthy post-research.

**Warning signs:** DB connection errors with "certificate verify failed" or "SSL handshake failed" on Netlify deploys after November 2025.

### Pitfall 5: `sql.raw()` Usage in Analytics Queries

**What goes wrong:** `sql.raw(alias)` in `analytics-queries.ts` bypasses Drizzle's parameterization. If any user-controlled string ever reaches this code path, it is a SQL injection vector.

**Why it's currently safe:** The `alias` parameter is a TypeScript string constant (`p.city` or `pr.city`) from within the query file itself — never user input.

**How to avoid:** During the OWASP audit, trace every call site of the function containing `sql.raw(alias)` to confirm no user input reaches it. Add a comment marking the pattern and why it is safe.

### Pitfall 6: Netlify Forms CSRF

**What goes wrong:** The nobshomes contact form submits to Netlify Forms (`/__forms.html`). Netlify Forms does not use CSRF tokens.

**Current state:** Netlify Forms has built-in spam filtering (Akismet) and bot detection. The form uses `netlify` and `data-netlify="true"` attributes which are required for detection.

**Assessment:** Low risk — the form accepts contact inquiries, not financial or sensitive operations. Netlify spam filtering is the defense. No change needed.

---

## Code Examples

### Password Policy Validation (Server-Side)

```typescript
// In app/src/lib/password-reset-actions.ts
// Replace the existing single check:
if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };

// With:
if (!password || password.length < 8) {
  return { error: "Password must be at least 8 characters" };
}
if (!/[A-Z]/.test(password)) {
  return { error: "Password must contain at least one uppercase letter" };
}
if (!/[0-9]/.test(password)) {
  return { error: "Password must contain at least one number" };
}
```

### Security Headers in next.config.ts (Workbench)

```typescript
// Source: https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers
// app/next.config.ts

import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  transpilePackages: ["mapbox-gl"],
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      { protocol: "https" as const, hostname: "*.blob.core.windows.net" },
    ],
  },
};

export default nextConfig;
```

### Azure Functions Outbound IP Discovery

```bash
# Get current outbound IPs for the Azure Functions app
az functionapp show \
  --resource-group rg-housefinder \
  --name {scraper-function-app-name} \
  --query "outboundIpAddresses" \
  --output tsv

# Add firewall rules for each IP
az postgres flexible-server firewall-rule create \
  --resource-group rg-housefinder \
  --name housefinder-db \
  --rule-name "AzureFunctions-1" \
  --start-ip-address {IP} \
  --end-ip-address {IP}
```

### Removing api/migrate from Middleware Matcher

```typescript
// app/src/middleware.ts — BEFORE
matcher: ["/((?!api/auth|api/migrate|login|forgot-password|reset-password|sign|floor-plans|_next/static|_next/image|favicon.ico).*)"]

// AFTER (remove api/migrate)
matcher: ["/((?!api/auth|login|forgot-password|reset-password|sign|floor-plans|_next/static|_next/image|favicon.ico).*)"]
```

---

## OWASP Top 10 Audit Checklist

Use this as the audit scope for the OWASP review task:

### A01: Broken Access Control
- [ ] `/api/migrate` route — **FAIL: still live, must remove**
- [ ] `/api/export` route — confirm `auth()` check at top (verified: yes, has auth)
- [ ] `/api/buyers/export` route — confirm `auth()` check (verified: yes, has auth)
- [ ] `/api/contracts/[id]/pdf` — confirm auth (verified: yes, has auth)
- [ ] `/api/leads` route — confirm API key is not guessable and not the same value as any user-facing key
- [ ] `/sign/[token]` — confirm token-gated, no property/deal data leaked beyond contract party info
- [ ] `/floor-plans/[token]` — confirm token-gated, 7-day expiry enforced
- [ ] All server actions in `lib/` — confirm `auth()` called at top of every mutating action (partial audit done; `actions.ts` verified, others need check)

### A02: Cryptographic Failures
- [ ] Confirm `AUTH_SECRET` is random and ≥32 bytes (current value confirmed as base64, appears strong)
- [ ] Confirm `password_reset_tokens.token` is `randomBytes(32).toString('hex')` (verified: yes)
- [ ] Confirm no plaintext passwords stored anywhere
- [ ] Confirm Azure Storage connection strings are not in source code
- [ ] Confirm `rejectUnauthorized: true` on PostgreSQL SSL connection (verified: yes)

### A03: Injection
- [ ] Audit all `db.execute(sql\`...\`)` calls — confirm no user input reaches them
- [ ] Audit `sql.raw(alias)` in `analytics-queries.ts` — confirm no user input reaches it
- [ ] Confirm all Drizzle ORM queries use parameterized values (default behavior)
- [ ] Check nobshomes admin blog API for injection in slug generation

### A05: Security Misconfiguration
- [ ] Remove `/api/migrate` route
- [ ] Add security headers to both `next.config.ts` files
- [ ] Confirm no Azure Blob containers have public access level set

### A06: Vulnerable Components
- [ ] Upgrade `next` to 15.5.15 in both repos (fixes 2 CVEs)
- [ ] `drizzle-kit` esbuild moderate CVE — dev-only dependency, accept as low risk
- [ ] Document all medium/low npm audit findings as accepted risk

### A07: Identification and Authentication Failures
- [ ] Enforce password policy (uppercase + number) server-side
- [ ] Confirm password reset tokens have 1-hour expiry and single-use marking (verified: yes)
- [ ] Confirm JWT session maxAge is 30 days (verified: yes)
- [ ] Review if concurrent sessions are possible (NextAuth JWT allows multiple sessions — acceptable for 3-user tool)

### A09: Security Logging and Monitoring Failures
- [ ] Confirm DB connection errors are logged
- [ ] Confirm auth failures are logged (NextAuth logs by default)
- [ ] Document that there is no centralized security alerting (acceptable for this scale)

---

## Secrets Inventory: Complete List

**housefinder app (Netlify env vars):**
| Secret | Current Location | Sensitivity |
|--------|-----------------|-------------|
| `DATABASE_URL` | Netlify env | CRITICAL — full DB access |
| `AUTH_SECRET` | Netlify env | HIGH — JWT signing |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Netlify env + public | MEDIUM — restrict to domain |
| `RESEND_API_KEY` | Netlify env | MEDIUM — email sending |
| `AZURE_STORAGE_CONNECTION_STRING` | Netlify env | HIGH — includes account key |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | Netlify env | MEDIUM — OCR service |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | Netlify env | LOW — public endpoint |
| `WEBSITE_LEAD_API_KEY` | Netlify env + Azure Key Vault | MEDIUM — API ingest key |
| `NEXT_PUBLIC_APP_URL` | Netlify env + public | LOW — public base URL |

**housefinder scraper (Azure Functions app settings):**
| Secret | Current Location | Sensitivity |
|--------|-----------------|-------------|
| `DATABASE_URL` | Azure Functions app settings | CRITICAL |
| `RESEND_API_KEY` | Azure Functions app settings | MEDIUM |
| `TRACERFY_API_KEY` | Azure Functions app settings | MEDIUM |
| `TWILIO_ACCOUNT_SID` | Azure Functions app settings | MEDIUM |
| `TWILIO_AUTH_TOKEN` | Azure Functions app settings | HIGH |
| `TWILIO_PHONE_NUMBER` | Azure Functions app settings | LOW |
| `ALERT_EMAIL` | Azure Functions app settings | LOW |
| `ALERT_PHONE_NUMBER` | Azure Functions app settings | LOW |
| `APP_URL` | Azure Functions app settings | LOW |
| `WEBSITE_LEAD_API_KEY` | Azure Key Vault reference | MEDIUM |

**nobshomes (Netlify env vars):**
| Secret | Current Location | Sensitivity |
|--------|-----------------|-------------|
| `DATABASE_URL` | Netlify env | CRITICAL |
| `AUTH_SECRET` | Netlify env | HIGH |
| `AZURE_STORAGE_ACCOUNT_KEY` | Netlify env | HIGH |
| `AZURE_STORAGE_ACCOUNT_NAME` | Netlify env | LOW |
| `AZURE_STORAGE_CONTAINER_NAME` | Netlify env | LOW |
| `HOUSEFINDER_API_KEY` | Netlify env | MEDIUM |
| `HOUSEFINDER_API_URL` | Netlify env | LOW |
| `NEXT_PUBLIC_GA_ID` | Netlify env + public | LOW |

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Security headers via `netlify.toml` only | `next.config.ts` `headers()` + netlify.toml belt-and-suspenders | Ensures SSR pages get headers |
| Static DB firewall allowlist for Netlify | SSL enforcement + secrets as compensating control | Netlify doesn't support static outbound IPs without Enterprise |
| `rejectUnauthorized: false` for SSL shortcuts | `rejectUnauthorized: true` (already correct) | Prevents MITM on DB connections |
| Azure App Service secrets (old) | Key Vault references for Functions, Netlify env vars for app | Correct hybrid approach |

**CSP evolution:** The old approach of netlify.toml-only headers doesn't work with Next.js SSR on Netlify. The current approach is `next.config.ts` headers().

---

## Open Questions

1. **Has the default seeded password `HouseFinder2026!` been changed by all 3 users?**
   - What we know: The `/api/migrate` route seeds this password. The `onConflictDoNothing` means re-running wouldn't change an existing password.
   - What's unclear: Whether brian, shawn, and admin have all performed a password reset.
   - Recommendation: Force a password reset for all users before removing the route. Communicate out-of-band.

2. **What is the actual Azure Functions app name for the scraper?**
   - What we know: Resource group is `rg-housefinder`.
   - What's unclear: The Functions app name needed for `az functionapp show`.
   - Recommendation: Check Azure Portal or use `az functionapp list --resource-group rg-housefinder`.

3. **Does `nobshomes` share the same Azure Storage account as housefinder, or separate accounts?**
   - What we know: nobshomes uses `AZURE_STORAGE_ACCOUNT_KEY` separately; housefinder uses `AZURE_STORAGE_CONNECTION_STRING`.
   - What's unclear: Whether these point to the same storage account.
   - Recommendation: Verify in Azure Portal. If same account, the nobshomes gallery container should be audited alongside housefinder containers.

4. **Is the nobshomes `DATABASE_URL` the same PostgreSQL server as housefinder?**
   - What we know: Both are deployed on Azure PostgreSQL. The nobshomes has its own `drizzle.config.ts` and schema.
   - What's unclear: Whether they share a server (different DBs) or separate servers.
   - Recommendation: Confirm in `.env.local` or Azure Portal. Firewall rules need to cover both apps if same server.

5. **Mapbox token domain restriction status**
   - What we know: The `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is a public token (in env but prefixed NEXT_PUBLIC_, so bundled into client JS).
   - What's unclear: Whether the Mapbox token has URL restrictions configured in the Mapbox account console.
   - Recommendation: Log into Mapbox console and restrict the token to `finder.no-bshomes.com`. The token is visible in client-side JavaScript regardless.

---

## Findings Report Structure (Claude's Discretion)

Deliver as `.planning/phases/20-security-review/SECURITY-FINDINGS.md` alongside code changes:

```markdown
# Security Findings Report — No BS Homes Platform
**Audit Date:** 2026-04-XX
**Auditor:** Phase 20 Security Review
**Scope:** housefinder + nobshomes repos

## Critical Findings (Must Fix Immediately)

### CRIT-01: Live Migration Endpoint with Account Seeding
...

## High Findings (Fixed in This Phase)

### HIGH-01: Next.js 15.5.13 DoS Vulnerability (CVE)
...

### HIGH-02: Missing Security Headers

## Medium Findings (Accepted Risk / Documented)

### MED-01: Netlify Firewall Limitation
...

## Low Findings (Accepted Risk)

### LOW-01: drizzle-kit esbuild CVE (dev-only)
...

## Closed / Not Applicable

### N/A-01: SQL Injection via Drizzle ORM
...

## Secrets Inventory
[link to SECRETS-INVENTORY.md]
```

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `app/src/app/api/migrate/route.ts` — confirmed live endpoint
- Direct code inspection of `app/src/middleware.ts` — confirmed public route exclusions
- Direct code inspection of `app/src/lib/blob-storage.ts` — confirmed all containers private + SAS URLs
- Direct code inspection of `app/src/auth.ts` — confirmed bcrypt + JWT session
- Direct code inspection of `app/src/lib/password-reset-actions.ts` — confirmed token security, incomplete password policy
- `npm audit` output — confirmed Next.js 15.5.13 has high-severity CVE, fix is 15.5.15
- Direct code inspection of `app/src/db/client.ts` — confirmed SSL with rejectUnauthorized: true
- [Next.js headers() docs](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers) — confirmed method for security headers
- [Netlify Private Connectivity docs](https://docs.netlify.com/manage/security/private-connectivity/) — confirmed Enterprise-only static outbound IPs

### Secondary (MEDIUM confidence)
- [Netlify support forum](https://answers.netlify.com/t/will-my-netlify-project-have-a-static-ip/91397) — multiple sources confirming Netlify has dynamic outbound IPs
- [Azure Key Vault references for Functions](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references) — official docs on @Microsoft.KeyVault() syntax
- [Azure PostgreSQL SSL rotation notice](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/how-to-connect-tls-ssl) — certificate rotation Nov 2025 - Q1 2026
- [gitleaks GitHub](https://github.com/gitleaks/gitleaks) — confirmed binary-only installation, supports git history scanning

### Tertiary (LOW confidence)
- Gitleaks for Windows via npx — not available; binary download required (not verified hands-on)

---

## Metadata

**Confidence breakdown:**
- Pre-existing issues identified: HIGH — direct code inspection
- Security headers approach: HIGH — official Next.js docs
- Netlify static IP limitation: HIGH — official Netlify docs + community confirmation
- CSP directives: MEDIUM — requires testing in report-only mode first
- Azure Key Vault extension pattern: MEDIUM — official docs, but Azure Functions Node.js v4 has known local dev issues per GitHub issues

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days — Next.js CVE status may change; verify latest version before executing)
