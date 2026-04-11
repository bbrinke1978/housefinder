---
phase: 20-security-review
verified: 2026-04-10T20:00:00Z
status: gaps_found
score: 11/13 must-haves verified
re_verification: false
gaps:
  - truth: "All Azure Functions app settings for housefinder-scraper reference Key Vault secrets instead of plaintext values"
    status: failed
    reason: "Plan 20-04 deviation: only DATABASE_URL and TRACERFY_API_KEY were migrated to Key Vault (plus WEBSITE_LEAD_API_KEY pre-existing = 3 total). RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER were found absent from Functions app settings entirely — they were listed as 'Not currently configured.' The plan's truth requires ALL sensitive settings to reference Key Vault."
    artifacts:
      - path: ".planning/phases/20-security-review/SECRETS-INVENTORY.md"
        issue: "RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN listed as 'Not currently configured' rather than Key Vault-referenced"
    missing:
      - "Manually add RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER as Key Vault secrets and wire as @Microsoft.KeyVault references in Azure Functions app settings (requires reading current values from Azure portal)"
      - "Update SECRETS-INVENTORY.md Section 2 rows for those secrets to reflect their actual Key Vault location once done"
  - truth: "The old housefinder-app App Service is stopped and deleted, saving ~$13/mo"
    status: partial
    reason: "SUMMARY documents the App Service was deleted and verified via CLI, but this is an Azure operational action with no persistent code artifact. The deletion is documented in the SUMMARY (20-04) and accepted on that basis. Flagged partial because no code artifact can confirm it — human verification is the only path."
    artifacts: []
    missing:
      - "Confirm in Azure Portal that housefinder-app App Service no longer exists under rg-housefinder"
human_verification:
  - test: "Open Azure Portal, navigate to rg-housefinder resource group, confirm housefinder-app App Service is absent"
    expected: "Resource does not appear in the resource group listing"
    why_human: "Azure resource state cannot be verified from code; CLI was run during plan execution but result is not checkable post-hoc without Azure credentials"
  - test: "Promote CSP from Content-Security-Policy-Report-Only to Content-Security-Policy in both repos once Netlify deploy cycle completes"
    expected: "No CSP violation reports in Netlify function logs after a full deploy cycle"
    why_human: "Requires deployed environment and log inspection — cannot be verified statically"
  - test: "Verify password reset flow end-to-end: request reset for a real user, receive email, set a weak password, confirm rejection, set valid password, confirm login"
    expected: "Weak passwords rejected with correct error messages; valid password accepted"
    why_human: "Server action behavior requires live environment with working Resend email delivery"
---

# Phase 20: Security Review Verification Report

**Phase Goal:** Security review — remove /api/migrate, upgrade Next.js, add security headers, enforce password policy, OWASP audit, secrets inventory, Key Vault migration, App Service decommission
**Verified:** 2026-04-10
**Status:** gaps_found (1 hard gap in Key Vault migration completeness; 1 operational gap in App Service deletion; remainder fully verified)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | /api/migrate endpoint returns 404 — no longer accessible | VERIFIED | `app/src/app/api/migrate/route.ts` is deleted (directory absent); middleware matcher has no `api/migrate` exclusion |
| 2 | All HTTP responses include HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy headers | VERIFIED | `app/next.config.ts` async `headers()` sets 7 security headers on `/(.*)`; `app/netlify.toml` carries same non-CSP headers for static assets |
| 3 | Password reset enforces minimum 8 chars + uppercase + number server-side | VERIFIED | `app/src/lib/password-reset-actions.ts` lines 77-79 show three sequential checks with `/[A-Z]/` and `/[0-9]/` patterns |
| 4 | Next.js version is 15.5.15 with zero high-severity npm audit findings | VERIFIED | `app/package.json`: `"next": "^15.5.15"`; SUMMARY documents zero high/critical findings post-upgrade |
| 5 | api/migrate removed from middleware matcher public route exclusions | VERIFIED | `app/src/middleware.ts` matcher: `(?!api/auth\|login\|forgot-password\|reset-password\|sign\|floor-plans\|...)` — no `api/migrate` entry |
| 6 | nobshomes returns security headers on all responses | VERIFIED | `nobshomes/next.config.ts` has identical securityHeaders constant and `async headers()` wired to `/(.*)`; `nobshomes/netlify.toml` has belt-and-suspenders [[headers]] block |
| 7 | nobshomes Next.js is 15.5.15 with zero high-severity audit findings | VERIFIED | `nobshomes/package.json`: `"next": "^15.5.15"`; SUMMARY documents zero high/critical |
| 8 | OWASP Top 10 audit completed with all checklist items documented | VERIFIED | SECURITY-FINDINGS.md is 381 lines with explicit coverage of A01-A09 categories, all 24 checklist items per SUMMARY |
| 9 | Every sql.raw() usage traced — no user-controlled input reaches it | VERIFIED | Two usages found in analytics-queries.ts and campaign-queries.ts; both annotated with `// SECURITY:` comments; traces documented in SECURITY-FINDINGS.md MED-01/MED-02 |
| 10 | All public routes verified as properly token-gated | VERIFIED | SUMMARY confirms: /api/export, /api/buyers/export, /api/contracts/[id]/pdf all have `auth()` at top; /sign/[token] exposes only address+signer name; /floor-plans/[token] enforces shareExpiresAt expiry |
| 11 | Git history scanned for leaked secrets in both repos | VERIFIED | SECURITY-FINDINGS.md documents HouseFinder2026! found only in deletion diff of commit 6db4bf0 (low risk, documented as action item) |
| 12 | All Azure Functions app settings reference Key Vault instead of plaintext | FAILED | Only DATABASE_URL, TRACERFY_API_KEY (newly migrated) + WEBSITE_LEAD_API_KEY (pre-existing) = 3 in KV. RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER were absent from Functions settings entirely — documented as "Not currently configured" |
| 13 | Old housefinder-app App Service deleted, saving ~$13/mo | PARTIAL | Deletion executed via CLI during Plan 20-04 and documented in SUMMARY. Cannot be verified from code artifacts — requires human confirmation in Azure Portal |

**Score:** 11/13 truths verified (1 failed, 1 partial/human-needed)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/app/api/migrate/route.ts` | DELETED | VERIFIED | File absent; directory removed |
| `app/src/middleware.ts` | Auth middleware without api/migrate exclusion | VERIFIED | matcher: `(?!api/auth\|login\|forgot-password\|reset-password\|sign\|floor-plans\|...)` — no migrate entry |
| `app/next.config.ts` | Security headers on all responses | VERIFIED | `securityHeaders` array + `async headers()` returning `[{ source: "/(.*)", headers: securityHeaders }]` |
| `app/netlify.toml` | Belt-and-suspenders headers for static assets | VERIFIED | `[[headers]]` block with HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| `app/src/lib/password-reset-actions.ts` | Password policy enforcement | VERIFIED | Lines 77-79: length check + `/[A-Z]/` + `/[0-9]/` regex checks |
| `nobshomes/next.config.ts` | Security headers for marketing site | VERIFIED | Identical securityHeaders constant + async headers() with CSP tailored for Google Analytics/GTM |
| `.planning/phases/20-security-review/SECURITY-FINDINGS.md` | Complete security findings report | VERIFIED | 381 lines; 1 Critical, 2 High, 5 Medium, 4 Low findings; all with severity ratings and fix status |
| `.planning/phases/20-security-review/SECRETS-INVENTORY.md` | Complete secrets inventory | VERIFIED | 190 lines; 27 secrets across 3 deployment targets; rotation procedures for DATABASE_URL, AUTH_SECRET, AZURE_STORAGE_CONNECTION_STRING; updated in Plan 20-04 to reflect KV migration status |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/next.config.ts` | HTTP responses | `async headers()` function | WIRED | `async headers()` present, returns `[{ source: "/(.*)", headers: securityHeaders }]` — covers all routes |
| `app/src/middleware.ts` | auth enforcement | matcher regex | WIRED | Matcher excludes only intentional public routes; no api/migrate escape |
| `app/src/lib/password-reset-actions.ts` | password policy | three sequential `if` checks | WIRED | All three checks present; server-side enforcement confirmed |
| `nobshomes/next.config.ts` | HTTP responses | `async headers()` function | WIRED | Same pattern as housefinder; confirmed present |
| `SECURITY-FINDINGS.md` | code changes from Plans 01/02 | references to fixed issues | WIRED | Lines 42, 65, 84 explicitly reference "Fixed in Plan 20-01" and "Fixed in Plan 20-02" with commit hashes |
| `housefinder-kv` | housefinder-scraper app settings | Key Vault references | PARTIAL | DATABASE_URL and TRACERFY_API_KEY wired as `@Microsoft.KeyVault(SecretUri=...)` references. RESEND/TWILIO absent from Functions settings — not wired. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 20-01 | /api/migrate deleted and removed from middleware | SATISFIED | File deleted; middleware matcher clean |
| SEC-02 | 20-01 | Next.js 15.5.15 in housefinder, DoS CVE patched | SATISFIED | package.json: `"next": "^15.5.15"` |
| SEC-03 | 20-01 | Security headers via next.config.ts headers() on housefinder | SATISFIED | 7 headers in next.config.ts |
| SEC-04 | 20-01 | CSP deployed Report-Only on housefinder | SATISFIED | `Content-Security-Policy-Report-Only` in securityHeaders array |
| SEC-05 | 20-01 | Password reset enforces 8 chars + uppercase + number server-side | SATISFIED | Three checks in password-reset-actions.ts lines 77-79 |
| SEC-06 | 20-02 | Next.js 15.5.15 in nobshomes, CVEs patched | SATISFIED | nobshomes/package.json: `"next": "^15.5.15"` |
| SEC-07 | 20-02 | Security headers and CSP-Report-Only on nobshomes | SATISFIED | nobshomes/next.config.ts securityHeaders + async headers() |
| SEC-08 | 20-03 | OWASP Top 10 audit completed across both repos | SATISFIED | SECURITY-FINDINGS.md 381 lines, all categories documented |
| SEC-09 | 20-03 / 20-04 | All sql.raw() and db.execute() audited | SATISFIED | Both usages traced; SECURITY: comments added; documented in MED-01/MED-02 |
| SEC-10 | 20-03 / 20-04 | All public routes verified as properly token-gated | SATISFIED | /api/export, /api/buyers/export, /api/contracts/[id]/pdf, /sign/[token], /floor-plans/[token] all verified in SUMMARY |
| SEC-11 | 20-03 | Git history scanned for leaked secrets | SATISFIED | Both repos scanned; HouseFinder2026! in deletion diff documented; no active leaked secrets |
| SEC-12 | 20-03 | SECURITY-FINDINGS.md and SECRETS-INVENTORY.md delivered | SATISFIED | Both files exist at expected paths with required content |

All 12 requirements satisfied at the requirement level. The Key Vault gap (Plan 20-04 deviation) does not block any requirement as defined — SEC-09 and SEC-10 target audit/verification completeness, not full KV migration completion. The Key Vault gap is a plan-goal gap, not a requirements gap.

---

## Anti-Patterns Found

No TODO, FIXME, PLACEHOLDER, stub returns, or empty handler patterns found in any of the 8 modified files checked (middleware.ts, next.config.ts, netlify.toml, password-reset-actions.ts, reset-password/page.tsx, analytics-queries.ts, campaign-queries.ts, nobshomes/next.config.ts).

---

## Human Verification Required

### 1. Azure App Service Deletion Confirmation

**Test:** Open Azure Portal, navigate to resource group `rg-housefinder`, look for `housefinder-app` App Service
**Expected:** Resource does not appear in the resource group listing; ~$13/mo in compute spend eliminated
**Why human:** Azure resource state is not a code artifact. CLI deletion was executed and documented in SUMMARY 20-04 with commit `80b8f2c`, but cannot be confirmed from the local filesystem post-hoc.

### 2. Security Headers Live in Production

**Test:** Run `curl -I https://finder.no-bshomes.com` and `curl -I https://no-bshomes.com` after next Netlify deploy
**Expected:** Both sites return `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` headers
**Why human:** Headers are configured in code but only deliverable after a Netlify deploy; cannot verify against live site statically.

### 3. CSP Violation Monitoring Before Promotion to Enforcing

**Test:** After deploying both sites, check Netlify function logs for CSP violation reports over a 24-48 hour period
**Expected:** Zero violations, or only violations from known third-party sources that can be allowlisted
**Why human:** CSP-Report-Only violations only appear in live runtime logs; cannot be assessed statically.

### 4. Password Policy End-to-End

**Test:** Use the forgot-password flow for a real user; attempt `test`, `Test`, `Test1234`, `testtest` as passwords; verify all weak ones are rejected with correct server errors; set a valid `Test1234!` password and confirm login
**Expected:** All weak passwords rejected; valid password accepted and user can log in
**Why human:** Requires live deployment with Resend email delivery and working DB connection.

---

## Gaps Summary

**Hard gap (Plan 20-04 deviation):** The plan's truth "All Azure Functions app settings for housefinder-scraper reference Key Vault secrets instead of plaintext values" is not met. The SUMMARY documents a deliberate scope reduction: the agent could only read and migrate secrets whose values were directly accessible via `az functionapp config appsettings list` CLI. RESEND_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER were found absent from the Functions app settings entirely (not as plaintext values, but simply unconfigured). WEBSITE_LEAD_API_KEY was pre-existing in Key Vault. The inventory accurately documents the actual state.

The remaining work is a Brian-manual task: retrieve the four secret values from wherever they are stored (Azure portal, password manager), add them as Key Vault secrets in housefinder-kv, and wire them as @Microsoft.KeyVault references in the Functions app settings.

**Operational gap (App Service deletion):** Execution was confirmed in SUMMARY 20-04 but requires Azure Portal confirmation as no code artifact persists.

**All other must-haves are fully verified** — the critical security vulnerabilities (live exploit endpoint, DoS CVE, missing headers, weak password policy) are all remediated with code evidence. The audit documentation (SECURITY-FINDINGS.md 381 lines, SECRETS-INVENTORY.md 190 lines) is substantive and wired. All 12 requirements are satisfied.

---

_Verified: 2026-04-10_
_Verifier: Claude (gsd-verifier)_
