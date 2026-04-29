# Google Services — Reference & Recovery

**Purpose:** Single source of truth for every Google product wired into No BS Homes / No BS Workbench. If access to Google Workspace is ever lost, this is the first place to look.

**Last updated:** 2026-04-29

---

## 1. Google Workspace

### Account

- **Domain:** `no-bshomes.com` (registered with GoDaddy; DNS is the authoritative source — see `dns-records.md` for the full record set if/when we capture it)
- **Workspace plan:** [TBD — fill in: Business Starter / Standard / Plus / Enterprise]
- **Admin email:** `brian@no-bshomes.com`
- **Recovery email on Workspace admin account:** [TBD — Brian sets this in Workspace admin → Account → Recovery]

### Mailboxes

| Email | Owner | Purpose |
|---|---|---|
| `brian@no-bshomes.com` | Brian | Owner / primary |
| `shawn@no-bshomes.com` | Shawn | Co-owner |
| `admin@no-bshomes.com` | Shared | Operational mailbox; previously locked out then restored 2026-04-28. Reset URL was issued. |
| `stacee@no-bshomes.com` | Stacee | Lead Manager (added 2026-04-29) |
| `chris@no-bshomes.com` | Chris | Sales (planned — pending Workspace creation) |

### DNS records (verification + email delivery)

To be filled in once we capture them from GoDaddy DNS:

- **MX records** — point to Google Workspace mail servers (`SMTP.GOOGLE.COM`, etc.)
- **SPF record** — `v=spf1 include:_spf.google.com ~all`
- **DKIM record** — generated in Workspace Admin → Apps → Gmail → Authenticate Email
- **DMARC record** — TXT at `_dmarc.no-bshomes.com`
- **Google site verification** — TXT record proving domain ownership

[TBD: copy actual values from GoDaddy DNS panel and paste here]

### Recovery if Workspace access is lost

1. Sign in to Workspace Admin (admin.google.com) using a backup admin account or recovery email
2. If primary admin is locked out: contact Google Workspace Support — they can verify ownership via DNS
3. DNS is owned by GoDaddy (separate provider); GoDaddy access is the deepest recovery path
4. If the entire `@no-bshomes.com` domain access is lost: GoDaddy DNS panel can re-route MX records to a new mail provider (with email history loss, but communication continuity)

---

## 2. Google Voice

### Number

- **Phone:** (435) 250-3678
- **Linked Google account:** [TBD — Brian, fill in: brian@no-bshomes.com or a personal Gmail]
- **Forwarding rules:** [TBD — calls forward to which number?]
- **Voicemail handling:** Transcribed by Google Voice → emailed to the linked Google account → Gmail labels apply (planned: Apps Script bridge to /api/leads, NOT BUILT yet)

### Setup steps that were done (memory-best-effort; verify if rebuilding)

1. **Created Google Voice number** at voice.google.com (free for personal Gmail; Workspace add-on tier for business numbers)
2. **Verified existing personal phone** (Brian's mobile) as the forwarding target
3. **Configured voicemail-to-email** under Voice settings → Voicemail → "Get voicemail via email"
4. **Wired the Google Voice number** to the public website (`finder.no-bshomes.com` and `no-bshomes.com`) and to deal-blast templates
5. **(NOT BUILT YET)** Apps Script that watches the linked Gmail inbox for Google Voice transcription emails, parses them, and POSTs to `/api/leads?source=voicemail`. Memory note `project_lead_capture_paths.md` flags this as the missing piece in the inbound pipeline.

### Recovery

- The Google Voice number is owned by whichever Google account claimed it. If that account is lost: contact Google Voice support with proof of ownership (linked phone verification, account history).
- **Risk:** if the linked Google account is a personal Gmail rather than the Workspace `brian@no-bshomes.com`, losing access to that personal account loses the number. Migration to Workspace is recommended.

---

## 3. Google Cloud Console — OAuth client (Phase 30.1, planned 2026-04-29)

The Google OAuth integration for "Sign in with Google" on `finder.no-bshomes.com` requires a Cloud Console project + OAuth 2.0 client. Setup steps are in the Phase 30.1 RESEARCH document — see `.planning/phases/30.1-google-oauth/30.1-RESEARCH.md`.

Once configured, document below:

- **Project name:** [TBD — likely "No BS Homes" or "no-bshomes"]
- **Project ID:** [TBD — auto-assigned]
- **OAuth client ID:** [TBD — copy from Cloud Console after creation]
- **OAuth client secret:** [TBD — store in Netlify + `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. NEVER commit to git.]
- **Authorized redirect URI:** `https://finder.no-bshomes.com/api/auth/callback/google`
- **Authorized JavaScript origins:** `https://finder.no-bshomes.com`
- **OAuth consent screen audience:** "Internal" (Workspace-only — restricts logins to `@no-bshomes.com`)

### Recovery

- Cloud Console OAuth client lives in the Google Cloud Project. If the project is deleted, the OAuth client and all sign-ins via it stop working.
- Secret rotation: in Cloud Console → APIs & Services → Credentials → click the OAuth client → "Reset secret". After rotation, update Netlify env and redeploy.

---

## 4. Other Google services in use

| Service | Status | Notes |
|---|---|---|
| **Gmail** | Active | Mailboxes for all `@no-bshomes.com` users |
| **Google Calendar** | Active | Workspace default; not currently wired to the app |
| **Google Drive** | Active | Workspace default; not currently wired to the app |
| **Google Analytics** | Active | `NEXT_PUBLIC_GA_ID` configured for the public marketing site (`no-bshomes.com`) |
| **Google Voice** | Active | (435) 250-3678 — see section 2 |
| **Google Cloud Console** | Pending | To be created for OAuth (Phase 30.1) |
| **Google Workspace Admin Console** | Active | admin.google.com — manages users, security, DNS verification |

---

## 5. Where these env vars live

| Variable | Used by | Set in |
|---|---|---|
| `GOOGLE_CLIENT_ID` | NextAuth google provider (Phase 30.1) | Netlify env (production), `app/.env.local` (local) |
| `GOOGLE_CLIENT_SECRET` | NextAuth google provider (Phase 30.1) | Netlify env (production), `app/.env.local` (local) — **NEVER commit** |
| `NEXT_PUBLIC_GA_ID` | Marketing site analytics | Netlify env on the marketing site (`nobshomes.netlify.app`) |
| `RESEND_API_KEY` | Transactional email (already in use) | Netlify env, `app/.env.local` |

---

## TODOs to capture (when Brian has a moment)

- [ ] Capture full GoDaddy DNS record list and paste into section 1 above
- [ ] Confirm which Google account owns the Voice number (435 250 3678) and whether to migrate it to Workspace `brian@no-bshomes.com`
- [ ] Set up Cloud Console OAuth client per Phase 30.1 RESEARCH steps
- [ ] (Future) Build the Apps Script voicemail-to-leads bridge per `project_lead_capture_paths.md`
