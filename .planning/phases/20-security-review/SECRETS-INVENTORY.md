# Secrets Inventory — No BS Homes Platform

**Created:** 2026-04-10
**Purpose:** Track all platform secrets, their storage locations, sensitivity, and rotation cadence for ongoing secrets management.
**Scope:** housefinder Workbench app, housefinder scraper, nobshomes marketing site

---

## Section 1: housefinder App (Netlify Environment Variables)

These secrets are stored in the Netlify dashboard under the housefinder site settings → Environment variables.

| Secret | Value Location | Sensitivity | Last Rotated | Rotation Cadence | Notes |
|--------|----------------|-------------|--------------|-----------------|-------|
| `DATABASE_URL` | Netlify env var | CRITICAL | Unknown | Annual | Full connection string including host, user, password, sslmode=require. Format: `postgresql://user:pass@host/db?sslmode=require` |
| `AUTH_SECRET` | Netlify env var | CRITICAL | Unknown | Annual | NextAuth JWT signing key. All active sessions invalidated on rotation. Must be cryptographically random, 32+ bytes. Generate with: `openssl rand -base64 32` |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | Netlify env var (public) | HIGH | Unknown | Annual | Exposed in browser. Should be domain-restricted to `finder.no-bshomes.com` in Mapbox console. If token is leaked, anyone can use it for Mapbox API calls at your expense. |
| `RESEND_API_KEY` | Netlify env var | HIGH | Unknown | Annual | Email sending (password reset, campaign emails). Rotation invalidates the key immediately. Create new key in Resend dashboard before revoking old. |
| `AZURE_STORAGE_CONNECTION_STRING` | Netlify env var | CRITICAL | Unknown | Annual | Full Azure Storage Account connection string including account name and key. Grants read/write access to receipts, photos, contracts, floor-plans containers. Format: `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...` |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | Netlify env var | HIGH | Unknown | Annual | Azure AI Document Intelligence (OCR) API key. Used for receipt scanning. Rotation in Azure portal under Document Intelligence → Keys. |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | Netlify env var | LOW | N/A | N/A | Public endpoint URL (e.g., `https://region.api.cognitive.microsoft.com/`). Not a secret — it is a public service URL. No rotation needed. |
| `WEBSITE_LEAD_API_KEY` | Netlify env var | HIGH | Unknown | Annual | Inbound webhook API key used by nobshomes to post leads to housefinder `/api/leads`. Must match the key configured in nobshomes `HOUSEFINDER_API_KEY`. Rotate both simultaneously. |
| `NEXT_PUBLIC_APP_URL` | Netlify env var (public) | LOW | N/A | N/A | Public app URL (e.g., `https://finder.no-bshomes.com`). Not a secret. No rotation needed. |

**Total housefinder app secrets: 9**

---

## Section 2: housefinder Scraper (Azure Functions App Settings)

These secrets are stored in the Azure portal under the housefinder Azure Functions app → Configuration → Application settings. They may reference Azure Key Vault via `@Microsoft.KeyVault(...)` references.

| Secret | Value Location | Sensitivity | Last Rotated | Rotation Cadence | Notes |
|--------|----------------|-------------|--------------|-----------------|-------|
| `DATABASE_URL` | Azure Functions app settings | CRITICAL | Unknown | Annual | Same PostgreSQL database as the housefinder app. Connection string must match exactly including sslmode. The scraper writes scraped properties and distress signals. |
| `RESEND_API_KEY` | Azure Functions app settings | HIGH | Unknown | Annual | Email alerts for scraper health monitoring. Can be the same key as the app or a separate one. |
| `TRACERFY_API_KEY` | Azure Functions app settings | HIGH | Unknown | Annual | Skip trace API. Charges per lookup. Rotation in Tracerfy dashboard. |
| `TWILIO_ACCOUNT_SID` | Azure Functions app settings | HIGH | Unknown | Annual | Twilio account identifier. Paired with TWILIO_AUTH_TOKEN. Both required for SMS alerts. |
| `TWILIO_AUTH_TOKEN` | Azure Functions app settings | CRITICAL | Unknown | Annual | Twilio authentication token. Grants full SMS sending access on the account. Rotate in Twilio console. |
| `TWILIO_PHONE_NUMBER` | Azure Functions app settings | LOW | N/A | N/A | Twilio phone number in E.164 format (e.g., `+18015551234`). Not a secret — it is a purchased phone number. |
| `ALERT_EMAIL` | Azure Functions app settings | LOW | N/A | N/A | Email address for scraper health alerts. Not a secret. Update if email address changes. |
| `ALERT_PHONE_NUMBER` | Azure Functions app settings | LOW | N/A | N/A | Phone number for SMS alerts. Not a secret. Update if phone number changes. |
| `APP_URL` | Azure Functions app settings | LOW | N/A | N/A | housefinder app URL for constructing alert links. Not a secret. |
| `WEBSITE_LEAD_API_KEY` | Azure Functions app settings | HIGH | Unknown | Annual | Same key as the housefinder app. Scraper may use this to post leads programmatically. If used, rotate in sync with the app's key. |

**Total scraper secrets: 10**

---

## Section 3: nobshomes (Netlify Environment Variables)

These secrets are stored in the Netlify dashboard under the nobshomes site settings → Environment variables.

| Secret | Value Location | Sensitivity | Last Rotated | Rotation Cadence | Notes |
|--------|----------------|-------------|--------------|-----------------|-------|
| `DATABASE_URL` | Netlify env var | CRITICAL | Unknown | Annual | nobshomes PostgreSQL connection. **Confirm:** Is this the same Azure PostgreSQL server as housefinder, or a separate instance? Update this row when confirmed. |
| `AUTH_SECRET` | Netlify env var | CRITICAL | Unknown | Annual | nobshomes admin portal JWT signing key. Independent from housefinder AUTH_SECRET. Rotate separately. |
| `AZURE_STORAGE_ACCOUNT_KEY` | Netlify env var | CRITICAL | Unknown | Annual | Azure Storage account key for gallery image uploads. **Confirm:** Same Azure Storage account as housefinder or separate? If same account, rotating either key affects both sites. |
| `AZURE_STORAGE_ACCOUNT_NAME` | Netlify env var | LOW | N/A | N/A | Storage account name. Not secret. |
| `AZURE_STORAGE_CONTAINER_NAME` | Netlify env var | LOW | N/A | N/A | Container name for gallery images. Not secret. |
| `HOUSEFINDER_API_KEY` | Netlify env var | HIGH | Unknown | Annual | API key nobshomes uses when posting leads to housefinder `/api/leads`. Must match housefinder's `WEBSITE_LEAD_API_KEY`. Rotate both simultaneously. |
| `HOUSEFINDER_API_URL` | Netlify env var | LOW | N/A | N/A | housefinder app URL for lead posting. Not a secret. |
| `NEXT_PUBLIC_GA_ID` | Netlify env var (public) | LOW | N/A | N/A | Google Analytics measurement ID (e.g., `G-XXXXXXXXXX`). Public value — visible in browser. No rotation needed. |

**Total nobshomes secrets: 8**

---

## Grand Total

| Target | Total Secrets | Critical | High | Low |
|--------|---------------|---------|------|-----|
| housefinder app | 9 | 3 | 4 | 2 |
| housefinder scraper | 10 | 2 | 4 | 4 |
| nobshomes | 8 | 3 | 2 | 3 |
| **TOTAL** | **27** | **8** | **10** | **9** |

---

## Rotation Procedures

### Rotating DATABASE_URL (All Targets)

This is the highest-impact rotation because it requires coordinated updates across up to 3 targets.

```
1. Generate a new strong password (30+ chars, mixed case + digits + symbols):
   openssl rand -base64 32

2. In Azure Portal → housefinder-db PostgreSQL server → Users:
   a. Create a NEW user with the new password (or update existing user password)
   b. Grant the same permissions as the current DB user
   c. Test connection with the new credentials

3. Update environment variables SIMULTANEOUSLY:
   a. Netlify (housefinder app): Update DATABASE_URL
   b. Azure Functions (scraper): Update DATABASE_URL app setting
   c. Netlify (nobshomes): Update DATABASE_URL (if same server)

4. Trigger a redeploy for each Netlify site to pick up the new env var

5. Test each site: housefinder dashboard loads, nobshomes gallery loads

6. Once confirmed working, revoke/delete the old DB user or change its password

7. Update "Last Rotated" in this document
```

### Rotating AUTH_SECRET (housefinder or nobshomes)

```
WARNING: All active sessions will be immediately invalidated. All logged-in users will be logged out.

1. Generate a new random secret:
   openssl rand -base64 32

2. Update the AUTH_SECRET environment variable in Netlify (housefinder and/or nobshomes separately)

3. Trigger a redeploy

4. Notify all users they will need to log in again

5. Verify login flow works with the new secret

6. Update "Last Rotated" in this document
```

### Rotating AZURE_STORAGE_CONNECTION_STRING / AZURE_STORAGE_ACCOUNT_KEY

```
1. In Azure Portal → Storage Account → Access Keys:
   a. There are two keys (key1 and key2) — Azure supports zero-downtime rotation
   b. If currently using key1: regenerate key2, update env vars to use key2, redeploy
   c. Then regenerate key1 (it is no longer in use)

2. Update environment variables:
   a. housefinder app: Update AZURE_STORAGE_CONNECTION_STRING
   b. nobshomes: Update AZURE_STORAGE_ACCOUNT_KEY (if same account)

3. Trigger redeployment for each site

4. Test: upload a receipt photo, upload a gallery image, view a signed contract PDF

5. Update "Last Rotated" in this document
```

---

## Action Items

The following items require manual investigation or action:

1. **Mapbox token — restrict to domain (PRIORITY: HIGH)**
   - Log in to Mapbox dashboard at https://account.mapbox.com/
   - Find the `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` token
   - Add URL restriction: `finder.no-bshomes.com`
   - This prevents the token from being usable on any other domain even if leaked

2. **Confirm nobshomes PostgreSQL server (PRIORITY: MEDIUM)**
   - Check whether nobshomes uses the same Azure PostgreSQL server as housefinder
   - If same server: rotating DATABASE_URL must be coordinated across both sites simultaneously
   - If separate: rotation can be done independently
   - Update the DATABASE_URL row in Section 3 with the confirmed answer

3. **Confirm nobshomes Azure Storage account (PRIORITY: MEDIUM)**
   - Check whether nobshomes uses the same Azure Storage account as housefinder
   - If same account: rotating the account key affects both sites — must update both env vars
   - If separate: rotation is independent
   - Update the AZURE_STORAGE_ACCOUNT_KEY row in Section 3 with the confirmed answer

4. **All 3 users should change passwords (PRIORITY: HIGH)**
   - The default seeded password `HouseFinder2026!` is documented in git history (deletion diff)
   - Brian, Shawn, and Admin should each use the forgot-password flow at the housefinder app
   - Verify each user's email address is correctly configured before initiating the flow

5. **Record "Last Rotated" dates (PRIORITY: MEDIUM)**
   - Fill in the "Last Rotated" column for all CRITICAL and HIGH secrets
   - Set calendar reminders for annual rotation cadence secrets

---

*Inventory created: 2026-04-10*
*Phase: 20-security-review*
*Plan: 20-03*
