---
phase: 03-contact-and-alerts
verified: 2026-03-18T00:00:00Z
status: gaps_found
score: 7/8 must-haves verified
re_verification: false
gaps:
  - truth: "Owner phone numbers are surfaced automatically from free public sources (voter rolls / assessor)"
    status: failed
    reason: "CONTACT-02 requires the system to cross-reference voter registration rolls to find owner phone numbers. No voter roll scraper exists in scraper/src/sources/. The ownerContacts table and UI exist, but the automated data sourcing is absent. Contacts currently arrive only via manual user entry."
    artifacts:
      - path: "scraper/src/sources/"
        issue: "Only carbon-assessor.ts, carbon-delinquent.ts, carbon-recorder.ts exist. No voter roll scraper."
    missing:
      - "A scraper function that reads Utah voter registration data and inserts phone numbers into owner_contacts with source='voter_rolls' (or equivalent free source)"
      - "Wiring of that scraper into the upsert layer and dailyScrape pipeline"
      - "Alternatively: re-scope CONTACT-02 to 'manual skip trace only' and update REQUIREMENTS.md to reflect that voter roll lookup is deferred — the current UI already supports this path"
---

# Phase 3: Contact and Alerts Verification Report

**Phase Goal:** Hot leads trigger immediate alerts to the investor and owner contact information is surfaced from free public sources
**Verified:** 2026-03-18
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | `ownerContacts` and `alertHistory` tables exist in both schema files with matching definitions | VERIFIED | Both `scraper/src/db/schema.ts` and `app/src/db/schema.ts` define identical `ownerContacts` and `alertHistory` tables with matching columns, indexes, and unique constraints |
| 2 | Alert config keys are seeded in `scraper_config` (email/sms enabled, thresholds, recipients) | VERIFIED | `scraper/src/db/seed-config.ts` seeds 6 keys: `alerts.email.enabled`, `alerts.sms.enabled`, `alerts.email.threshold`, `alerts.sms.threshold`, `alerts.email.recipient`, `alerts.sms.recipient` with `onConflictDoNothing` |
| 3 | After scoring completes in `dailyScrape`, a single digest email is sent via Resend containing all hot leads not yet alerted today | VERIFIED | `dailyScrape.ts` calls `sendAlerts(context)` as Step 5 after `scoreAllProperties()`. `sendAlerts` queries leads not in `alert_history` for today and calls `sendDigestEmail` |
| 4 | SMS is sent via Twilio for each lead with score >= SMS threshold not yet alerted today | VERIFIED | `scraper/src/alerts/index.ts` iterates `smsLeads` per-lead with `sendSmsAlert()`, records each in `alert_history`, wraps each in try/catch |
| 5 | Alert deduplication prevents re-alerting on re-runs | VERIFIED | `alert_history` unique index on `(lead_id, channel, run_date)` with `onConflictDoNothing` on record insert; NOT EXISTS subquery in lead query |
| 6 | Contact tab shows owner info, phone numbers as tappable tel: links, manual entry, skip trace flag, and entity owner badge | VERIFIED | `app/src/components/contact-tab.tsx` implements all five sections with `<a href="tel:...">`, `saveOwnerPhone` call, orange skip trace banner with TruePeopleSearch/FastPeopleSearch links, and blue entity badge with Utah Business Registry link |
| 7 | Dashboard stats bar includes "Needs Skip Trace" count | VERIFIED | `stats-bar.tsx` has a 5th card with `key: 'needsSkipTrace'`; `queries.ts` `DashboardStats` includes `needsSkipTrace: number` backed by a NOT EXISTS subquery |
| 8 | Owner phone numbers are surfaced automatically from free public sources (voter rolls / assessor) | FAILED | No voter registration roll scraper exists. `scraper/src/sources/` contains only `carbon-assessor.ts`, `carbon-delinquent.ts`, `carbon-recorder.ts`. The assessor scraper pulls `ownerName` but no phone. `ownerContacts` is only populated via manual user entry through the UI. |

**Score:** 7/8 truths verified

---

### Required Artifacts

| Artifact | Provides | Status | Details |
|----------|----------|--------|---------|
| `scraper/src/db/schema.ts` | `ownerContacts` and `alertHistory` table definitions | VERIFIED | Both tables present with all required columns and indexes |
| `app/src/db/schema.ts` | Matching `ownerContacts` and `alertHistory` definitions | VERIFIED | Identical to scraper schema; both files match exactly |
| `scraper/src/db/seed-config.ts` | Alert config seed keys | VERIFIED | All 6 alert keys seeded with `onConflictDoNothing` |
| `app/src/types/index.ts` | `OwnerContact` type export | VERIFIED | `OwnerContact` interface exported with all required fields |
| `scraper/src/alerts/email.tsx` | `HotLeadDigest` template + `sendDigestEmail` function | VERIFIED | Exports `AlertLead`, `HotLeadDigest`, `sendDigestEmail`; template includes address, owner, score badge, signals, days-since, View Lead button, footer |
| `scraper/src/alerts/sms.ts` | `sendSmsAlert` function | VERIFIED | Exports `sendSmsAlert`; `to:` always from `ALERT_PHONE_NUMBER` env var; graceful degradation when env missing |
| `scraper/src/alerts/index.ts` | `sendAlerts` orchestrator | VERIFIED | Reads config from `scraperConfig`, queries hot leads not alerted today, dispatches email and SMS, records history |
| `scraper/src/functions/dailyScrape.ts` | Step 5 alert integration after scoring | VERIFIED | `sendAlerts(context)` called after `scoreAllProperties()`, wrapped in non-fatal try/catch, results in Step 6 summary |
| `app/src/components/contact-tab.tsx` | Full contact tab UI | VERIFIED | 250 lines; skip trace flag, entity badge, owner card, phone cards with tel: links, manual entry form with `useTransition`, email card |
| `app/src/lib/actions.ts` | `saveOwnerPhone` and `updateAlertSettings` server actions | VERIFIED | Both present; `saveOwnerPhone` upserts on `(propertyId, source)` unique constraint; `updateAlertSettings` iterates 4 keys |
| `app/src/lib/queries.ts` | `getOwnerContacts` and `getDashboardStats` with `needsSkipTrace` | VERIFIED | `getOwnerContacts` orders by manual-first; `getDashboardStats` includes `needsSkipTrace` NOT EXISTS subquery |
| `app/src/components/stats-bar.tsx` | Fifth stat card: Needs Skip Trace | VERIFIED | `Search` icon, `text-orange-500`, `needsSkipTrace` key; grid updated to `grid-cols-5` |
| `app/src/components/settings-form.tsx` | Alert Settings section with toggles and thresholds | VERIFIED | Email and SMS toggles with native checkboxes; threshold number inputs conditionally shown when channel enabled; `updateAlertSettings` server action called |
| `scraper/src/sources/` (voter roll scraper) | Automated phone lookup from free public sources | MISSING | No file exists. Only assessor, delinquent, and recorder scrapers present. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scraper/src/db/schema.ts` | `app/src/db/schema.ts` | Identical table definitions | VERIFIED | `ownerContacts` and `alertHistory` match exactly across both files |
| `scraper/src/db/seed-config.ts` | `scraperConfig` table | `onConflictDoNothing` insert | VERIFIED | `scraperConfig` imported from schema; alert keys seeded in second batch |
| `scraper/src/alerts/index.ts` | `scraper/src/db/schema.ts` | `alertHistory` deduplication | VERIFIED | `alertHistory` imported; `recordAlert()` uses `onConflictDoNothing`; NOT EXISTS in lead query |
| `scraper/src/alerts/index.ts` | `scraper/src/alerts/email.tsx` | `sendDigestEmail` import | VERIFIED | `import { sendDigestEmail } from "./email.js"` at line 11 |
| `scraper/src/alerts/index.ts` | `scraper/src/alerts/sms.ts` | `sendSmsAlert` import | VERIFIED | `import { sendSmsAlert } from "./sms.js"` at line 12 |
| `scraper/src/functions/dailyScrape.ts` | `scraper/src/alerts/index.ts` | `sendAlerts` call in Step 5 | VERIFIED | `import { sendAlerts } from "../alerts/index.js"` at line 13; called at line 146 |
| `app/src/components/contact-tab.tsx` | `app/src/lib/actions.ts` | `saveOwnerPhone` server action call | VERIFIED | `import { saveOwnerPhone } from "@/lib/actions"` at line 22; called in `handleSavePhone()` |
| `app/src/components/contact-tab.tsx` | `app/src/lib/queries.ts` | `OwnerContact` type via props | VERIFIED | `import type { OwnerContact } from "@/types"` at line 23; `contacts: OwnerContact[]` prop consumed |
| `app/src/components/stats-bar.tsx` | `app/src/lib/queries.ts` | `DashboardStats.needsSkipTrace` | VERIFIED | `import type { DashboardStats } from "@/lib/queries"` at line 3; `stats['needsSkipTrace']` rendered |
| `app/src/app/(dashboard)/properties/[id]/page.tsx` | `app/src/components/contact-tab.tsx` | Passes `contacts` and `propertyId` props | VERIFIED | `getOwnerContacts(id)` fetched in `Promise.all`; `<ContactTab ownerName=... ownerType=... propertyId={id} contacts={contacts} />` at line 86 |
| `app/src/app/(dashboard)/settings/page.tsx` | `app/src/components/settings-form.tsx` | Passes `initialAlertSettings` | VERIFIED | `getAlertSettings()` fetched; `<SettingsForm initialCities={cities} initialAlertSettings={alertSettings} />` at line 20 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CONTACT-01 | 03-01 | System pulls owner name from county assessor for every property | VERIFIED | `carbon-assessor.ts` scrapes ownerName; stored on properties table; displayed on contact tab owner card |
| CONTACT-02 | 03-01 | System cross-references voter registration rolls to find owner phone numbers for free | FAILED | No voter roll scraper exists anywhere in `scraper/src/`. SUMMARY claims this complete but it is not implemented. The `ownerContacts` table schema is ready; the data pipeline is absent. |
| CONTACT-03 | 03-03 | System displays "manual skip trace needed" flag when free sources don't yield contact info | VERIFIED | `contact-tab.tsx` shows orange banner when no phone contacts exist and ownerType is individual/unknown/null; links to TruePeopleSearch and FastPeopleSearch |
| CONTACT-04 | 03-03 | User can tap-to-call owner phone number from mobile (tel: link) | VERIFIED | Phone numbers rendered as `<a href="tel:${contact.phone}">` in `contact-tab.tsx` line 159 |
| ALERT-01 | 03-02 | System sends email alert via Resend when new hot lead (2+ signals) detected | VERIFIED | `sendAlerts` queries `isHot=true AND distressScore >= emailThreshold` not yet alerted today; calls `sendDigestEmail` |
| ALERT-02 | 03-02 | System sends SMS alert for urgent hot leads (3+ signals or imminent auction timeline) | VERIFIED | `sendAlerts` sends SMS for `distressScore >= smsThreshold` (default 3); `sendSmsAlert` via Twilio |
| ALERT-03 | 03-02 | Email includes property address, distress signals, owner name, and link to detail page | VERIFIED | `HotLeadDigest` template renders address+city (line 81), owner name (line 84), score badge (line 87-98), signals list (line 100-104), View Lead button linking to `/properties/${propertyId}` (line 109) |
| ALERT-04 | 03-02 | SMS includes property address and link to detail page | VERIFIED | SMS body: `HOT LEAD: ${lead.address}, ${lead.city} (score: ${lead.distressScore}) - ${appUrl}/properties/${lead.propertyId}` in `sms.ts` line 24 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scraper/src/db/seed-config.ts` | 103-104 | `console.log` in production seeder | Info | Non-blocking; appears in Azure Function logs but does not affect behavior |

No stub implementations, empty handlers, or placeholder returns found in any critical file.

---

### Human Verification Required

#### 1. Email Digest Delivery

**Test:** Trigger `dailyScrape` manually (or set a property to `isHot=true`, `distressScore >= 2` in the DB) and observe that a single digest email arrives in the configured `ALERT_EMAIL` inbox from `HouseFinder <onboarding@resend.dev>`
**Expected:** One email containing property address, owner name, distress score badge, signal list, and a "View Lead" link to the detail page; no duplicate email on a second run the same day
**Why human:** Requires live Resend API key, network, and real SMTP delivery to verify

#### 2. SMS Alert Delivery

**Test:** Ensure a property has `distressScore >= 3` and `isHot=true`, trigger pipeline, observe SMS on `ALERT_PHONE_NUMBER`
**Expected:** SMS body format: `HOT LEAD: 123 Main St, Price (score: 3) - https://...`; TCPA compliant — only investor's own number receives SMS
**Why human:** Requires live Twilio credentials and phone verification

#### 3. Tap-to-Call on Mobile

**Test:** Open property detail on a mobile device, navigate to Contact tab, tap a phone number
**Expected:** Native phone dialer opens with number pre-filled
**Why human:** Requires physical mobile device; cannot verify `tel:` link behavior programmatically

#### 4. Manual Phone Entry UX

**Test:** On Contact tab, enter a phone number in the input field and click "Add"; observe the number appears in the phone cards with a "Manual" badge and the skip trace warning disappears
**Expected:** `saveOwnerPhone` upserts to DB, `revalidatePath` causes server re-render, new phone card shown with `tel:` link
**Why human:** Requires live browser interaction to confirm optimistic UI and cache revalidation

---

### Gaps Summary

One gap blocks full goal achievement:

**CONTACT-02 — Voter Roll Phone Lookup Not Implemented**

The ROADMAP success criterion states "Owner phone numbers sourced from free public records (county assessor, voter rolls) appear as tappable tel: links." The county assessor scraper populates `ownerName` only; no phone numbers come from any automated source. `scraper/src/sources/` has three scrapers (assessor, delinquent, recorder) — none touch voter registration data, TruePeopleSearch, or any other phone source.

The Plan 01 SUMMARY lists CONTACT-02 as completed, but what was actually completed is the schema foundation (the `ownerContacts` table) — not the data sourcing. The table is correctly defined and the UI is fully built to display and accept entries, but it will always be empty unless the user manually enters a phone number.

**Impact:** The phase goal says "owner contact information is surfaced from free public sources" — automated sourcing is missing. Manual entry works and the skip trace workflow with links to TruePeopleSearch/FastPeopleSearch is solid, but that is the fallback path, not the primary automated path.

**Resolution options (choose one):**
1. Implement a voter roll or TruePeopleSearch scraper in `scraper/src/sources/` that populates `ownerContacts` automatically
2. Accept that CONTACT-02's intent is met by surfacing the manual workflow (the skip trace flag + external search links) — update `REQUIREMENTS.md` to reflect this interpretation and mark the requirement complete with that scope

---

_Verified: 2026-03-18_
_Verifier: Claude (gsd-verifier)_
