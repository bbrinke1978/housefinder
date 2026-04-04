---
phase: 12-email-call-campaigns
plan: 03
subsystem: frontend
tags: [campaigns, email-sequences, mail-settings, navigation, next-js, react, drizzle]

# Dependency graph
requires:
  - phase: 12-email-call-campaigns
    plan: 01
    provides: emailSequences/emailSteps/campaignEnrollments/emailSendLog tables + MailSettings/EmailSequenceSummary types

provides:
  - createSequence/updateSequence/deleteSequence server actions with zod validation + transactions
  - fetchSequenceForEdit server action (prevents pg bundling in client components)
  - getSequences/getSequenceWithSteps/getActiveEnrollments query functions
  - getMailSettings/saveMailSettings server actions using MAIL_SETTINGS_KEYS
  - /campaigns page with SequenceList + CampaignTable
  - /settings/mail page with MailSettingsForm (all 6 fields)
  - Campaigns in sidebar navItems + Mail Settings in SidebarFooter
  - Campaigns in mobile bottom-nav (replaced Buyers)
  - Campaigns + Mail Settings in command palette

affects:
  - 12-04 (email sending can use these sequences and mail settings)
  - navigation (all users see Campaigns in sidebar + bottom-nav + Ctrl+K palette)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useTransition for server action calls from client components (not useActionState — actions don't follow prevState signature)
    - fetchSequenceForEdit as "use server" action to avoid pg being bundled into client components
    - force-dynamic on both new pages (consistent with Phase 02-05 settings page decision)
    - onConflictDoUpdate on scraperConfig.key for mail settings upsert (consistent with alert settings pattern)

key-files:
  created:
    - app/src/lib/campaign-actions.ts
    - app/src/lib/campaign-queries.ts
    - app/src/lib/mail-settings-actions.ts
    - app/src/components/campaigns/sequence-editor.tsx
    - app/src/components/campaigns/sequence-list.tsx
    - app/src/components/campaigns/campaign-table.tsx
    - app/src/components/mail-settings-form.tsx
    - app/src/app/(dashboard)/campaigns/page.tsx
    - app/src/app/(dashboard)/settings/mail/page.tsx
  modified:
    - app/src/components/app-sidebar.tsx
    - app/src/components/bottom-nav.tsx
    - app/src/components/command-menu.tsx

key-decisions:
  - "fetchSequenceForEdit as server action (not direct query import) — prevents pg/net/tls bundling into client component bundle (Rule 1 auto-fix)"
  - "useTransition instead of useActionState — campaign actions use (formData) signature, not (prevState, formData); useActionState would require signature change across all actions"
  - "bottom-nav replaces Buyers with Campaigns — 5 items fits mobile; Buyers still accessible from desktop sidebar (consistent with plan guidance)"
  - "5 default steps prefilled in SequenceEditor matching Day 1/3/7/14/30 cadence from CONTEXT.md"
  - "Buyer Intake template as second pre-built option — per CONTEXT.md specifics (Brian's buyer qualification email)"

requirements-completed: [CAMP-06, CAMP-07]

# Metrics
duration: 7min
completed: 2026-04-02
---

# Phase 12 Plan 03: Campaigns UI, Mail Settings, and Navigation Summary

**Campaigns page with sequence CRUD, mail settings configuration page, and navigation integration across sidebar, bottom-nav, and command palette**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-02T00:00:00Z
- **Completed:** 2026-04-02T00:07:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Created 3 server-side lib files: campaign-actions.ts (createSequence/updateSequence/deleteSequence/fetchSequenceForEdit), campaign-queries.ts (getSequences with stats, getSequenceWithSteps, getActiveEnrollments), mail-settings-actions.ts (getMailSettings/saveMailSettings with MAIL_SETTINGS_KEYS)
- Built SequenceEditor with 5-step Day 1/3/7/14/30 default template and Buyer Intake pre-built template; handles create and edit modes via server actions
- Built SequenceList with card grid showing stepCount/activeEnrollments/totalSent stats; inline edit opens SequenceEditor
- Built CampaignTable with enrollment rows: Owner, Address, City, Step progress (N/total), Status badge, Next Send date
- /campaigns page: server component with force-dynamic, violet hero banner, SequenceList + CampaignTable sections
- /settings/mail page: server component with 6-field form (From Name, From Email, Reply-To, Resend API Key, Phone, Signature)
- Updated app-sidebar.tsx: Campaigns added to navItems, Mail Settings added to SidebarFooter
- Updated bottom-nav.tsx: Campaigns replaces Buyers on mobile (5 items)
- Updated command-menu.tsx: Campaigns and Mail Settings entries added
- Build succeeds cleanly (npm run build passes)

## Task Commits

1. **Task 1: Campaign server actions, queries, and mail settings** - `722e1de` (feat)
2. **Task 2: Campaigns page, mail settings page, and navigation updates** - `7525c0f` (feat)

## Files Created/Modified

**Created:**
- `app/src/lib/campaign-actions.ts` — createSequence/updateSequence/deleteSequence/fetchSequenceForEdit
- `app/src/lib/campaign-queries.ts` — getSequences/getSequenceWithSteps/getActiveEnrollments
- `app/src/lib/mail-settings-actions.ts` — getMailSettings/saveMailSettings
- `app/src/components/campaigns/sequence-editor.tsx` — create/edit form with step management
- `app/src/components/campaigns/sequence-list.tsx` — card grid + inline edit
- `app/src/components/campaigns/campaign-table.tsx` — active enrollment table
- `app/src/components/mail-settings-form.tsx` — 6-field mail settings form
- `app/src/app/(dashboard)/campaigns/page.tsx` — campaigns page
- `app/src/app/(dashboard)/settings/mail/page.tsx` — mail settings page

**Modified:**
- `app/src/components/app-sidebar.tsx` — Campaigns + Mail Settings nav items
- `app/src/components/bottom-nav.tsx` — Campaigns replaces Buyers
- `app/src/components/command-menu.tsx` — Campaigns + Mail Settings entries

## Decisions Made

- `fetchSequenceForEdit` exposed as a "use server" action rather than importing `getSequenceWithSteps` directly in the client — prevents pg/net/tls from being bundled into the browser bundle (auto-fixed Rule 1 bug)
- `useTransition` used for server action calls instead of `useActionState` — these actions use `(formData: FormData)` signature, not the `(prevState, payload)` signature required by `useActionState`
- Mobile bottom-nav replaces Buyers with Campaigns; Buyers remains accessible from desktop sidebar (as recommended in plan guidance)
- SequenceEditor defaults to 5 steps matching Brian's Day 1/3/7/14/30 cadence, with Buyer Intake as a second pre-built template per CONTEXT.md

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Client component importing DB query caused pg/net/tls bundle error**
- **Found during:** Task 2, npm run build
- **Issue:** `sequence-list.tsx` imported `getSequenceWithSteps` from `campaign-queries.ts` which imports `pg` — causes webpack "Module not found: Can't resolve 'net'" error in browser bundle
- **Fix:** Added `fetchSequenceForEdit` as a "use server" server action in `campaign-actions.ts`; updated `sequence-list.tsx` to import from there instead
- **Files modified:** `app/src/lib/campaign-actions.ts`, `app/src/components/campaigns/sequence-list.tsx`
- **Commit:** 7525c0f

**2. [Rule 1 - Bug] useActionState incompatible with (formData) action signature**
- **Found during:** Task 2, npm run build TypeScript check
- **Issue:** `createSequence` and `updateSequence` use `(formData: FormData)` signature; `useActionState<State, FormData>` requires `(prevState: State, payload: FormData)` — TypeScript error
- **Fix:** Switched to `useTransition` + direct async calls inside `startTransition`
- **Files modified:** `app/src/components/campaigns/sequence-editor.tsx`, `app/src/components/mail-settings-form.tsx`
- **Commit:** 7525c0f (fixed in same commit)

---

**Total deviations:** 2 auto-fixed (build errors caught and resolved before commit)
**Impact on plan:** No scope change — same functionality delivered; server action pattern is cleaner than client-side pg bundling

## Issues Encountered

None after auto-fixes — build passes cleanly with all pages rendering.

## User Setup Required

None for this plan. Mail Settings page is live at /settings/mail. Resend API key can be configured there once Brian has one.

## Next Phase Readiness

- /campaigns page ready for sequence enrollment (plan 12-04 or future)
- Mail settings stored in scraperConfig — email sending service (plan 12-02) can call getMailSettings() to get the configured Resend API key
- All 6 mail setting fields persisted and editable
- Campaigns navigation accessible from all entry points (sidebar, mobile, Ctrl+K)

## Self-Check: PASSED

- app/src/lib/campaign-actions.ts: FOUND
- app/src/lib/campaign-queries.ts: FOUND
- app/src/lib/mail-settings-actions.ts: FOUND
- app/src/components/campaigns/sequence-editor.tsx: FOUND
- app/src/components/campaigns/sequence-list.tsx: FOUND
- app/src/components/campaigns/campaign-table.tsx: FOUND
- app/src/components/mail-settings-form.tsx: FOUND
- app/src/app/(dashboard)/campaigns/page.tsx: FOUND
- app/src/app/(dashboard)/settings/mail/page.tsx: FOUND
- commit 722e1de: FOUND
- commit 7525c0f: FOUND

---
*Phase: 12-email-call-campaigns*
*Completed: 2026-04-02*
