---
phase: 12-email-call-campaigns
verified: 2026-04-02T00:00:00Z
status: human_needed
score: 22/22 must-haves verified
human_verification:
  - test: "Log a contact event from property detail Contact tab"
    expected: "Select event type (e.g. Called client), add optional notes, submit — event appears in activity timeline below"
    why_human: "Form interaction, optimistic state, and timeline re-render require live browser testing"
  - test: "Open call script modal from property detail page"
    expected: "Modal opens showing pre-filled talk track with owner name/address/city merged in; Copy button copies resolved text"
    why_human: "Merge field resolution and clipboard API require live browser testing"
  - test: "Enroll a lead with a contact email in a sequence from property detail"
    expected: "EnrollButton shows dropdown of sequences; after selecting, shows enrollment status badge; step 0 email fires immediately via Resend"
    why_human: "Requires Resend API key configured, live email send, and enrollment badge state update"
  - test: "Bulk-select leads from dashboard and enroll in a sequence"
    expected: "Checkboxes appear on hover on property cards; sticky BulkEnroll bar appears at bottom; progress counter increments; summary shows enrolled/skipped"
    why_human: "Client-side selection state, sticky bar appearance, and sequential send loop require live browser testing"
  - test: "Verify email indicator on dashboard cards distinguishes leads with/without contact email"
    expected: "Cards with a real (non-MAILING:) email show a mail icon indicator; leads without show none"
    why_human: "Visual indicator requires live rendering"
  - test: "Navigate to Campaigns via sidebar, bottom-nav, and Ctrl+K command palette"
    expected: "All three navigation paths reach /campaigns page with sequence list and enrollment table"
    why_human: "Navigation and keyboard shortcut require live browser testing"
  - test: "Create a new email sequence with 3+ steps from Campaigns page"
    expected: "Sequence editor opens pre-filled with Day 1/3/7/14/30 default template; sequence saved and visible in list with step count"
    why_human: "Form interaction and sequence CRUD require live browser testing"
  - test: "Save mail settings (from name, email, Resend API key) at /settings/mail"
    expected: "Form saves all 6 fields; page reloads with values pre-filled; Resend key shown as password field"
    why_human: "Form persistence and masked API key input require live browser testing"
  - test: "Verify touchpoint count badge on dashboard cards after logging a contact event"
    expected: "After logging an event, revisit dashboard — affected property card shows a count badge (e.g. '1')"
    why_human: "Requires sequential actions across pages to confirm server-side count enrichment"
  - test: "Verify deal detail Activity tab shows contact history for a deal with linked property"
    expected: "On a deal with a linked property that has contact events — Activity tab shows Contact History section with timeline entries"
    why_human: "Requires existing deal + contact event data; conditional rendering requires live data"
---

# Phase 12: Email & Call Campaigns Verification Report

**Phase Goal:** Build email outreach sequences and call logging into HouseFinder so the investor can contact distressed property owners directly from the platform. Includes: multi-step email sequences sent via Resend, call outcome logging with activity timeline, campaign management page, mail settings configuration, and talk track/call scripts.
**Verified:** 2026-04-02T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Email sequence tables exist for storing drip campaign definitions | VERIFIED | `emailSequences`, `emailSteps`, `campaignEnrollments`, `emailSendLog` in `app/src/db/schema.ts` lines 497-591; migration `0004_goofy_la_nuit.sql` exists |
| 2 | Contact events table exists for logging all outreach types | VERIFIED | `contactEvents` table with `contactEventTypeEnum` in `app/src/db/schema.ts` line 475; all 6 event types present |
| 3 | Mail settings can be stored via scraperConfig key-value pattern | VERIFIED | `saveMailSettings` in `mail-settings-actions.ts` uses `onConflictDoUpdate` on scraperConfig; `MAIL_SETTINGS_KEYS` constants in `types/index.ts` |
| 4 | TypeScript types are exported for all new tables | VERIFIED | `ContactEventRow`, `EmailSequenceRow`, `EmailStepRow`, `CampaignEnrollmentRow`, `EmailSendLogRow` via `InferSelectModel` at bottom of `schema.ts` |
| 5 | User can log a contact event (6 types) from any property detail page | VERIFIED | `ContactEventForm` wired to `logContactEvent` server action; rendered in `contact-tab.tsx` line 377; 6 types via `CONTACT_EVENT_LABELS` |
| 6 | Activity timeline shows all contact events and notes chronologically on property detail | VERIFIED | `getLeadTimeline` called in `properties/[id]/page.tsx` line 36; `ActivityTimeline` rendered in `contact-tab.tsx` line 395; 147 lines, substantive |
| 7 | Touchpoint count badge appears on property cards in the dashboard | VERIFIED | `TouchpointBadge` imported and rendered in `property-card.tsx` line 337; count enriched in `getProperties` via `inArray+groupBy` |
| 8 | User can view a call script with lead details pre-filled before calling | VERIFIED | `CallScriptModal` (234 lines) with 5 script tabs, merge field resolution, clipboard copy; wired in `contact-tab.tsx` line 257 |
| 9 | User can create and edit email sequences with named steps and day delays | VERIFIED | `createSequence`/`updateSequence` server actions in `campaign-actions.ts`; `SequenceEditor` wired to both; Day 1/3/7/14/30 default template |
| 10 | Campaigns page shows all sequences with enrollment counts and send stats | VERIFIED | `getSequences` (returns stepCount/activeEnrollments/totalSent) called in `campaigns/page.tsx`; `SequenceList` + `CampaignTable` rendered |
| 11 | Mail Settings page stores from name, email, reply-to, Resend API key, phone, and signature | VERIFIED | `settings/mail/page.tsx` with 6-field `MailSettingsForm`; `saveMailSettings` server action with zod validation |
| 12 | Campaigns and Mail Settings are accessible from sidebar navigation | VERIFIED | Sidebar: `app-sidebar.tsx` line 25 (Campaigns); bottom-nav: `bottom-nav.tsx` line 12; command-menu: lines 24-25 |
| 13 | User can enroll a lead in a sequence from the property detail page | VERIFIED | `EnrollButton` (185 lines) wired to `enrollLeadInSequence`; rendered in `contact-tab.tsx` via `ContactTab` props `activeEnrollment`/`sequences` |
| 14 | User can bulk-select leads from the dashboard and enroll them in a sequence | VERIFIED | `DashboardPropertyGrid` client component wraps dashboard; `BulkEnroll` (174 lines) with sticky bar, progress, summary |
| 15 | Enrollment sends step 0 email immediately via Resend | VERIFIED | `enrollment-actions.ts` line 207: `resend.emails.send()`; uses `OutreachTemplate` react-email component; `X-Idempotency-Key` header set |
| 16 | Enrolling in a new sequence stops the previous active enrollment | VERIFIED | `enrollment-actions.ts`: DB transaction updates prior enrollment to `status='stopped', stopReason='re_enrolled'` before inserting new |
| 17 | Leads without a contact email cannot be enrolled — UI shows clear indicator | VERIFIED | `EnrollButton` has disabled state with tooltip "No contact email"; `hasEmail` enriched server-side in `getProperties` |
| 18 | Follow-up emails send automatically daily for enrollments where nextSendAt is past due | VERIFIED | `campaignDispatch` timer at `0 15 12 * * *` (5:15 AM MT) in `scraper/src/functions/campaignDispatch.ts`; registered in `scraper/src/index.ts` line 13 |
| 19 | Enrollments auto-stop when lead's deal status is closed or dead | VERIFIED | `campaign-dispatch.ts` lines 81-117: bulk auto-stop + per-enrollment race-condition check for `status IN ('closed', 'dead')`; `stopReason='deal_closed'` |
| 20 | Activity timeline appears on deal detail pages as well as property detail | VERIFIED | `deals/[id]/page.tsx` imports `getLeadTimeline` line 7 and `ActivityTimeline` line 17; rendered in Activity tab line 188 |
| 21 | Duplicate sends are prevented via emailSendLog idempotency check | VERIFIED | `campaign-dispatch.ts` lines 231-236: checks `emailSendLog` for existing `(enrollmentId, stepId)` before send; pre-log inserted before Resend call |
| 22 | Outreach emails use react-email templates with merge fields and auto-appended signature | VERIFIED | `outreach-template.tsx` (87 lines); `enrollLeadInSequence` resolves `{firstName}/{address}/{city}/{senderName}/{phone}` merge fields before send |

**Score:** 22/22 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/src/db/schema.ts` | 5 campaign tables + enum + InferSelectModel exports | VERIFIED | All 5 tables present; `InferSelectModel` exports on lines 587-591 |
| `app/src/types/index.ts` | ContactEventType, MailSettings, CALL_SCRIPTS, MAIL_SETTINGS_KEYS | VERIFIED | All types and constants present; 395+ lines |
| `app/src/lib/contact-event-actions.ts` | logContactEvent server action | VERIFIED | 79 lines; zod validation; contactEvents insert; lastContactedAt update |
| `app/src/lib/contact-event-queries.ts` | getLeadTimeline, getLeadTouchpointCounts | VERIFIED | 131 lines; parallel fetch + merge + sort strategy |
| `app/src/components/contact-event-form.tsx` | 6-type event form with useActionState | VERIFIED | Imports + calls `logContactEvent`; 6 types via CONTACT_EVENT_LABELS |
| `app/src/components/activity-timeline.tsx` | Chronological timeline component | VERIFIED | 147 lines; icons per type; formatDistanceToNow; expand/collapse |
| `app/src/components/touchpoint-badge.tsx` | Count pill badge | VERIFIED | 23 lines; returns null at 0; phone icon + count pill |
| `app/src/components/call-script-modal.tsx` | Modal with 5 scripts + merge fields | VERIFIED | 234 lines; @base-ui/react dialog; 5 tabs; clipboard copy |
| `app/src/lib/campaign-actions.ts` | createSequence, updateSequence, deleteSequence | VERIFIED | All 3 exported; zod validation; transactions |
| `app/src/lib/campaign-queries.ts` | getSequences, getSequenceWithSteps, getActiveEnrollments | VERIFIED | All 3 present; plus getLeadActiveEnrollment added in plan 04 |
| `app/src/lib/mail-settings-actions.ts` | getMailSettings, saveMailSettings | VERIFIED | Both exported; onConflictDoUpdate on scraperConfig |
| `app/src/app/(dashboard)/campaigns/page.tsx` | Campaigns management page | VERIFIED | 47 lines; force-dynamic; SequenceList + CampaignTable wired |
| `app/src/app/(dashboard)/settings/mail/page.tsx` | Mail settings page | VERIFIED | 36 lines; 6-field form; pre-filled from getMailSettings() |
| `app/src/lib/enrollment-actions.ts` | enrollLeadInSequence, unenrollLead, bulkEnrollLeads | VERIFIED | 352 lines; full flow: validate → stop-prior → send → log; MAILING: filter |
| `app/src/components/email/outreach-template.tsx` | React-email outreach template | VERIFIED | 87 lines; Html/Body/Container/Text; plain personal look |
| `app/src/components/campaigns/enroll-button.tsx` | 3-state enroll/unenroll button | VERIFIED | 185 lines; 3 states wired correctly |
| `app/src/components/campaigns/bulk-enroll.tsx` | Bulk enrollment UI | VERIFIED | 174 lines; sticky bar; progress + summary display |
| `app/src/components/dashboard-property-grid.tsx` | Client grid wrapper with selection | VERIFIED | Exists; renders in `page.tsx` line 103 |
| `scraper/src/functions/campaignDispatch.ts` | Azure Functions timer trigger | VERIFIED | 51 lines; timer at `0 15 12 * * *`; calls dispatchCampaignEmails() |
| `scraper/src/alerts/campaign-dispatch.ts` | Core dispatch logic | VERIFIED | 452 lines; auto-stop → due query → idempotency → send → advance |
| `app/drizzle/0004_goofy_la_nuit.sql` | Migration SQL for 5 tables + enum | VERIFIED | File exists |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `contact-event-form.tsx` | `contact-event-actions.ts` | `logContactEvent` | WIRED | Import line 4; used in `useActionState` line 24 |
| `activity-timeline.tsx` | `contact-event-queries.ts` | `getLeadTimeline` (caller) | WIRED | `getLeadTimeline` called in `properties/[id]/page.tsx`; result passed as `timeline` prop to `ActivityTimeline` |
| `properties/[id]/page.tsx` | `activity-timeline.tsx` | `ActivityTimeline` rendered in Contact tab | WIRED | `contact-tab.tsx` imports + renders `ActivityTimeline` with `entries={timeline}` |
| `sequence-editor.tsx` | `campaign-actions.ts` | `createSequence\|updateSequence` | WIRED | Import line 4; called in `startTransition` at line 222-223 |
| `settings/mail/page.tsx` | `mail-settings-actions.ts` | `saveMailSettings` | WIRED | Import line 1; passed as `saveAction` prop to `MailSettingsForm` |
| `app-sidebar.tsx` | `/campaigns` | nav link | WIRED | Line 25: `{ label: "Campaigns", href: "/campaigns" }` |
| `enrollment-actions.ts` | `resend` | `resend.emails.send` | WIRED | Line 207: `await resend.emails.send({...})` with react template |
| `enroll-button.tsx` | `enrollment-actions.ts` | `enrollLeadInSequence` | WIRED | Import line 7; called at line 38 |
| `enrollment-actions.ts` | `app/src/db/schema.ts` | `campaignEnrollments` insert | WIRED | Line 8 import; used in DB transaction lines 130-154 |
| `campaignDispatch.ts` | `campaign-dispatch.ts` | `dispatchCampaignEmails` | WIRED | Import line 2; called line 29 |
| `campaign-dispatch.ts` | `resend` | `resend.emails.send` | WIRED | Line 306: `await resend.emails.send({...})` |
| `campaign-dispatch.ts` | `schema.ts (scraper)` | `campaignEnrollments` | WIRED | Import line 4; queried lines 85-114 for auto-stop |
| `scraper/src/index.ts` | `campaignDispatch.ts` | export registration | WIRED | Line 13: `export * from "./functions/campaignDispatch.js"` |
| `deals/[id]/page.tsx` | `activity-timeline.tsx` | `ActivityTimeline` | WIRED | Import line 17; rendered line 188 within Activity tab |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAMP-01 | 12-01 | Email sequence + enrollment tables in PostgreSQL | SATISFIED | 5 tables in schema.ts + migration generated |
| CAMP-02 | 12-01 | Contact events table with 6 event types | SATISFIED | `contactEvents` table + `contactEventTypeEnum` with all 6 values |
| CAMP-03 | 12-02 | Log contact events from property detail Contact tab | SATISFIED | `ContactEventForm` + `logContactEvent` wired in `contact-tab.tsx` |
| CAMP-04 | 12-02 | Activity timeline shows all events chronologically | SATISFIED | `getLeadTimeline` (parallel fetch + merge/sort) + `ActivityTimeline` component |
| CAMP-05 | 12-02 | Touchpoint count badge on dashboard cards; call script modal | SATISFIED | `TouchpointBadge` in `property-card.tsx`; `CallScriptModal` in `contact-tab.tsx` |
| CAMP-06 | 12-03 | Create/edit email sequences from Campaigns page | SATISFIED | `SequenceEditor` + `createSequence`/`updateSequence` server actions; `/campaigns` page |
| CAMP-07 | 12-03 | Mail Settings page with 6 fields | SATISFIED | `/settings/mail` page with all 6 fields persisted to scraperConfig |
| CAMP-08 | 12-04 | Enroll lead from property detail; step 0 sends immediately; one active enrollment | SATISFIED | `enrollLeadInSequence` stops prior + sends step 0 in transaction; `EnrollButton` on Contact tab |
| CAMP-09 | 12-04 | Bulk enrollment from dashboard; disabled state without email | SATISFIED | `BulkEnroll` + `DashboardPropertyGrid` with checkboxes; `hasEmail` indicator |
| CAMP-10 | 12-04 | React-email templates with merge fields + signature | SATISFIED | `OutreachTemplate` component; merge field resolution in `enrollLeadInSequence` |
| CAMP-11 | 12-05 | Daily Azure Functions timer dispatch with idempotency | SATISFIED | Timer at `0 15 12 * * *`; emailSendLog pre-log + skip-if-exists pattern |
| CAMP-12 | 12-05 | Auto-stop on deal close/dead; timeline on deal detail | SATISFIED | Auto-stop in `dispatchCampaignEmails`; `ActivityTimeline` on `deals/[id]/page.tsx` |

All 12 CAMP requirements satisfied. No orphaned requirements found.

### Anti-Patterns Found

No blockers or stubs found. Key files scanned:

| File | Pattern Checked | Result |
|------|----------------|--------|
| `enrollment-actions.ts` | TODO/FIXME/placeholder/return null | None found |
| `campaign-dispatch.ts` | TODO/FIXME/Not implemented | None found |
| `campaigns/page.tsx` | TODO/placeholder | None found |
| `settings/mail/page.tsx` | TODO/placeholder | None found |
| `contact-event-actions.ts` | placeholder | None found |

Notable implementation choice: `campaign-dispatch.ts` is 452 lines (substantially larger than the 60-line minimum specified in plan). The dispatch query in the scraper uses `nextStepNumber = currentStep + 2` arithmetic (documented in key-decisions) due to 0-based vs 1-indexed step numbering — this is intentional and documented, not a bug.

### Human Verification Required

#### 1. Contact Event Logging

**Test:** On any property detail page, open the Contact tab, select "Called client" from the event type dropdown, add notes, submit.
**Expected:** Green success feedback appears; event shows in activity timeline below with correct icon, label, and relative timestamp.
**Why human:** Server action roundtrip, form reset on success, and timeline live update require browser testing.

#### 2. Call Script Modal

**Test:** Click the phone/call button next to a phone number on the Contact tab.
**Expected:** Modal opens showing a talk track with the lead's name, address, and city merged into the script; tabs for 5 script types; Copy button copies resolved text to clipboard.
**Why human:** Merge field resolution and clipboard API require live browser testing.

#### 3. Email Enrollment (Single)

**Test:** On a property with a known contact email, go to Contact tab, find the "Email Sequence" card, select a sequence from the EnrollButton dropdown.
**Expected:** Loading state shown; enrollment status badge appears ("Step 1/N — Follow-up in X days"); Resend receives the send request and step-0 email is delivered.
**Why human:** Requires Resend API key configured, live email send verification.

#### 4. Bulk Enrollment from Dashboard

**Test:** Hover over property cards on the dashboard to reveal checkboxes, select 2-3 leads with contact emails, observe the sticky BulkEnroll bar.
**Expected:** Bar shows "{N} leads selected" with "Enroll in Sequence" button; after sequence selection, progress counter increments; final summary shows enrolled/skipped counts.
**Why human:** Client-side selection state, sticky positioning, and sequential send loop require live browser testing.

#### 5. Navigation Completeness

**Test:** Verify Campaigns is reachable from: (a) sidebar, (b) mobile bottom-nav (on narrow viewport), (c) Ctrl+K command palette.
**Expected:** All 3 paths navigate to `/campaigns`; Mail Settings accessible from sidebar gear icon and Ctrl+K.
**Why human:** Navigation and keyboard shortcuts require live browser testing.

#### 6. Mail Settings Persistence

**Test:** Visit `/settings/mail`, fill all 6 fields including Resend API key, save, then reload the page.
**Expected:** All 6 values are pre-filled on reload; API key field shows masked characters (password type).
**Why human:** Form persistence across page reload and masked input rendering require live browser testing.

#### 7. Touchpoint Badge on Dashboard

**Test:** After logging a contact event on a property, return to the dashboard.
**Expected:** The property card now shows a touchpoint count badge (e.g., a small "1" pill with phone icon).
**Why human:** Requires sequential actions and server-side count enrichment to be visible.

#### 8. Deal Detail Activity Tab (with existing contact history)

**Test:** Navigate to a deal that has a linked property with at least one logged contact event or sent email.
**Expected:** Deal detail Activity tab shows a "Contact History" section below DealNotes with the timeline entries.
**Why human:** Requires existing deal + contact event data in the database; conditional rendering only visible with live data.

#### 9. Automated Dispatch (requires Azure deployment + wait for timer)

**Test:** After deploying to Azure and configuring Resend API key, enroll a lead in a sequence and wait until the next morning (5:15 AM MT).
**Expected:** Follow-up email (step 2+) is sent automatically; enrollment `currentStep` advances; new emailSendLog entry exists.
**Why human:** Azure Functions timer requires deployed environment; cannot verify programmatically.

### Gaps Summary

No automated gaps detected. All 22 must-have truths verified. All 21 artifacts exist, are substantive, and are properly wired. All 12 CAMP requirements have direct implementation evidence.

The only outstanding items are the 9 human verification tests above, which cover:
- UI interactions that require a live browser (contact event form, modal, enrollment flows)
- External service integration (Resend email delivery)
- Azure Functions timer execution (requires deployed environment)
- Visual/UX elements (sticky bar, mobile nav, keyboard shortcuts)

These cannot be verified programmatically from the codebase alone.

---

_Verified: 2026-04-02T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
