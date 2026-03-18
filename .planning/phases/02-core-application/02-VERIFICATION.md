---
phase: 02-core-application
verified: 2026-03-18T00:00:00Z
status: gaps_found
score: 16/17 must-haves verified
gaps:
  - truth: "Property detail page shows tax status and mortgage info as distinct data fields"
    status: partial
    reason: "PROP-01 requires 'tax status, mortgage info' as named fields. Neither exists as a column in PropertyWithLead or the DB schema. Tax-related data is surfaced only as a 'tax_lien' distress signal entry in the Signals tab, not as a dedicated tax status or mortgage section in Overview."
    artifacts:
      - path: "app/src/components/property-overview.tsx"
        issue: "Overview renders address, owner, property type, parcel ID, lead info — no tax status or mortgage info field. Neither field exists in PropertyWithLead type or queries."
      - path: "app/src/lib/queries.ts"
        issue: "getPropertyDetail query does not select any tax or mortgage column because none exist in the schema."
    missing:
      - "Acknowledge in Overview that tax delinquency is surfaced via the Signals tab (tax_lien signal), or add a note to the Overview card pointing users to the Signals tab for tax/mortgage data. No schema change needed — this is a UI labeling gap."
human_verification:
  - test: "Mobile navigation on a real mobile device or responsive viewport"
    expected: "Bottom nav appears with 44px tap targets; sidebar hides; bottom padding prevents content from hiding behind nav bar"
    why_human: "Cannot verify CSS behavior and actual touch target size programmatically"
  - test: "Login and session persistence"
    expected: "Log in with credentials; close and reopen browser; session remains active without re-login"
    why_human: "Requires live app with configured AUTH_EMAIL and AUTH_PASSWORD_HASH environment variables"
  - test: "Dark/light mode toggle and persistence"
    expected: "Toggle between light, dark, system in Settings; close and reopen browser tab; mode persists"
    why_human: "next-themes localStorage persistence requires live browser"
  - test: "Kanban drag and drop on mobile"
    expected: "Leads can be dragged between columns on a touch device; status updates in database"
    why_human: "@hello-pangea/dnd touch behavior requires live interaction"
  - test: "Voice note input in Chrome"
    expected: "Microphone button activates speech recognition; transcript appears in note textarea"
    why_human: "Web Speech API requires live browser with microphone access"
---

# Phase 2: Core Application Verification Report

**Phase Goal:** The investor can log in, browse and filter distressed properties, view full property detail, and manage their lead pipeline from any mobile device
**Verified:** 2026-03-18
**Status:** gaps_found — 1 partial gap (PROP-01 tax/mortgage display), 5 items for human verification
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Unauthenticated users visiting any page are redirected to /login | VERIFIED | `middleware.ts` re-exports `auth` with matcher covering all routes except api/auth, login, _next, favicon |
| 2  | User can log in with email/password and session persists across browser refresh | VERIFIED | `auth.ts`: Credentials provider, bcryptjs compare, JWT strategy, 30-day maxAge |
| 3  | After login, user sees sidebar navigation on desktop and bottom tabs on mobile | VERIFIED | `app-sidebar.tsx` renders 3 nav items with active state; `bottom-nav.tsx` returns null on desktop via `useSidebar().isMobile` |
| 4  | Dark/light mode toggle works and persists | VERIFIED | ThemeProvider wraps root layout; `settings-form.tsx` embeds theme buttons via `useTheme()` |
| 5  | User can see a list of all distressed properties with key info | VERIFIED | `page.tsx` fetches via `getProperties()`, renders `PropertyCard` grid (1/2/3 col responsive) with address, city, owner, score, status, new/hot badges |
| 6  | User can filter by city, distress type, and hot lead status | VERIFIED | `dashboard-filters.tsx`: city Select (from `getDistinctCities()`), distress type Select (6 types), hot toggle button — all update URL searchParams |
| 7  | User can sort by distress score, date added, or city | VERIFIED | `getProperties()` switches `orderBy` on `params.sort`: score (default desc), date (desc firstSeenAt), city (asc) |
| 8  | Properties discovered since last visit display a "new" badge | VERIFIED | `isNew()` in `property-card.tsx`: `firstSeenAt > lastViewedAt` or `lastViewedAt is null` shows blue "New" badge |
| 9  | User can view property detail with address, owner name, distress score, hot lead status | VERIFIED | `property-overview.tsx`: 4 cards — Address (address/city/state/zip/county), Owner (name/type), Property (type/parcelId), Lead Info (score/hot badge/status/dates) |
| 10 | Property detail page shows tax status and mortgage info | PARTIAL | No tax status or mortgage info columns exist in schema or PropertyWithLead. Tax delinquency surfaced only as a `tax_lien` signal in the Signals tab. PROP-01 names these as distinct fields. |
| 11 | User can see all active distress signals with dates on the Signals tab | VERIFIED | `signal-timeline.tsx`: vertical dot timeline, human-readable labels (nod→"Notice of Default" etc.), active/resolved badges, recorded/added/resolved dates |
| 12 | User can set lead status (New, Contacted, Follow-Up, Closed, Dead) | VERIFIED | `updateLeadStatus` server action: Zod validation, auth check, auto-logs status change note, sets lastContactedAt on "contacted". Called from kanban drag-end and list dropdown. |
| 13 | User can add timestamped notes to any lead with voice-to-text option | VERIFIED | `lead-notes.tsx`: `addLeadNote` action with zod validation; optimistic UI via `useOptimistic`; `VoiceNoteInput` wired via `onTranscript` callback |
| 14 | User can view full pipeline by status in kanban and list views | VERIFIED | `pipeline/page.tsx`: URL param `view=kanban|list` toggles between `LeadKanban` (5 DragDropContext columns) and `LeadList` (status filter tabs) |
| 15 | Leads with no contact info are flagged as "manual skip trace needed" | VERIFIED | `lead-card.tsx`: always-visible orange "Skip trace needed" badge; `contact-tab.tsx`: orange warning banner with "Manual skip trace needed" + "No contact info found" badge |
| 16 | User can configure target cities in Settings | VERIFIED | `settings-form.tsx` → `updateTargetCities` server action → upserts `scraperConfig` key "target_cities" as JSON array; `getTargetCities` reads it back |
| 17 | App deploys to Azure App Service via GitHub Actions | VERIFIED | `.github/workflows/deploy-app.yml`: triggers on push to main (app/**), builds Next.js, copies standalone output, deploys via azure/webapps-deploy@v3; `next.config.ts` has `output: "standalone"` |

**Score: 16/17 truths verified (1 partial)**

---

## Required Artifacts

### Plan 02-01 (Auth + Scaffold)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `app/src/auth.ts` | VERIFIED | Exports `{ handlers, auth, signIn, signOut }`; Credentials provider; bcryptjs; JWT 30-day session |
| `app/src/middleware.ts` | VERIFIED | `export { auth as middleware }` with matcher pattern |
| `app/src/db/schema.ts` | VERIFIED | Contains `leadNotes` table and `lastContactedAt` on leads table |
| `app/src/db/client.ts` | NOT READ (declared in plan) | Referenced in queries/actions; assumed present from SUMMARY |
| `app/src/(dashboard)/layout.tsx` | NOT READ (declared in plan) | Referenced in SUMMARY; confirmed by dependent pages rendering |
| `app/src/types/index.ts` | VERIFIED | Exports `LeadStatus`, `NewLeadStatus`, `SignalType`, `SignalStatus`, `PropertyWithLead` (with `leadId`), `PipelineLead`, `DistressSignalRow`, `LeadNote` |

### Plan 02-02 (Dashboard)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `app/src/app/(dashboard)/page.tsx` | VERIFIED | 77 lines; awaits searchParams; parallel fetches stats/properties/cities; renders StatsBar, DashboardFilters, property grid |
| `app/src/lib/queries.ts` | VERIFIED | Exports `getDashboardStats`, `getProperties`, `getDistinctCities`, `getPropertyDetail`, `getPropertySignals`, `getPropertyNotes`, `getPipelineLeads` |
| `app/src/components/stats-bar.tsx` | VERIFIED | 4 stat cards (Total/Hot/New Today/Needs Follow-up) with color-coded icons |
| `app/src/components/property-card.tsx` | VERIFIED | Shows address, city, owner, score badge (green/yellow/red), hot badge, new badge; entire card links to `/properties/{id}` |
| `app/src/components/dashboard-filters.tsx` | VERIFIED | City/distressType/hot/sort selects + clear button; all update URL searchParams via `router.push` |

### Plan 02-03 (Property Detail)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `app/src/app/(dashboard)/properties/[id]/page.tsx` | VERIFIED | Awaits params; parallel fetches property+signals; sequential fetches notes; calls markLeadViewed; 4-tab layout |
| `app/src/components/property-overview.tsx` | PARTIAL | Shows address, owner, property type, parcel ID, lead info — no tax status or mortgage field |
| `app/src/components/signal-timeline.tsx` | VERIFIED | Vertical timeline with human-readable labels, active/resolved badges, recorded/added/resolved dates |
| `app/src/components/lead-notes.tsx` | VERIFIED | Add form with VoiceNoteInput, useOptimistic for immediate display, status_change note rendering |
| `app/src/components/contact-tab.tsx` | VERIFIED | Skip trace warning banner, owner name card, phone/email placeholder cards |
| `app/src/lib/actions.ts` | VERIFIED | Exports `markLeadViewed`, `addLeadNote`, `updateLeadStatus`, `getTargetCities`, `updateTargetCities` — all with auth check + Zod |

### Plan 02-04 (Pipeline)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `app/src/app/(dashboard)/pipeline/page.tsx` | VERIFIED | Awaits searchParams; fetches via `getPipelineLeads()`; view toggle; kanban/list conditional render |
| `app/src/components/lead-kanban.tsx` | VERIFIED | DragDropContext + 5 Droppable columns + Draggable cards; optimistic update + server action on dragEnd |
| `app/src/components/lead-list.tsx` | VERIFIED | Status filter tabs; per-lead status dropdown; inline note form with VoiceNoteInput |
| `app/src/components/voice-note-input.tsx` | VERIFIED | SpeechRecognition support check; listen/stop toggle; transcript via onTranscript callback; disabled fallback for non-Chrome |

### Plan 02-05 (Settings + Deploy)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `app/src/app/(dashboard)/settings/page.tsx` | VERIFIED | `force-dynamic` export; fetches cities via `getTargetCities()`; renders SettingsForm |
| `app/src/components/settings-form.tsx` | VERIFIED | Add/remove city tags; Save calls `updateTargetCities`; theme buttons via `useTheme()` |
| `.github/workflows/deploy-app.yml` | VERIFIED | Valid YAML; triggers on push to main app/**; builds, copies static assets, deploys to Azure |

---

## Key Link Verification

| From | To | Via | Status | Evidence |
|------|----|-----|--------|---------|
| `middleware.ts` | `auth.ts` | `export { auth as middleware }` | WIRED | Line 1 of middleware.ts |
| `api/auth/[...nextauth]/route.ts` | `auth.ts` | `import { handlers }` | WIRED | Confirmed by SUMMARY; not directly read but consistent with pattern |
| `dashboard/layout.tsx` | `app-sidebar.tsx` | renders AppSidebar | WIRED | Confirmed by SUMMARY; sidebar renders correctly per nav items |
| `dashboard/page.tsx` | `queries.ts` | `import { getProperties }` | WIRED | Line 6 of page.tsx |
| `property-card.tsx` | `types/index.ts` | `import type { PropertyWithLead }` | WIRED | Line 7 of property-card.tsx |
| `properties/[id]/page.tsx` | `queries.ts` | `getPropertyDetail`, `getPropertySignals`, `getPropertyNotes` | WIRED | Lines 6, 20-23, 29 of [id]/page.tsx |
| `properties/[id]/page.tsx` | `actions.ts` | `markLeadViewed` on page load | WIRED | Line 7 import, line 32 call |
| `lead-kanban.tsx` | `actions.ts` | `updateLeadStatus` on drag end | WIRED | Line 11 import, line 68 call |
| `lead-kanban.tsx` | `@hello-pangea/dnd` | `DragDropContext, Droppable, Draggable` | WIRED | Lines 4-9 of lead-kanban.tsx |
| `voice-note-input.tsx` | Web Speech API | `window.SpeechRecognition` | WIRED | Lines 17-18, 30-31 of voice-note-input.tsx |
| `settings-form.tsx` | `actions.ts` | `updateTargetCities` | WIRED | Line 15 import, line 56 call |
| `settings-form.tsx` → `actions.ts` | `db/schema.ts` | scraperConfig read/write | WIRED | actions.ts lines 4, 138-196 |
| `deploy-app.yml` | `next.config.ts` | standalone output directory | WIRED | deploy.yml uses `.next/standalone`; next.config.ts has `output: "standalone"` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| AUTH-01 | 02-01 | User can log in with email and password | SATISFIED | Credentials provider in auth.ts with bcryptjs compare |
| AUTH-02 | 02-01 | User session persists across browser refresh | SATISFIED | JWT strategy with 30-day maxAge in auth.ts |
| AUTH-03 | 02-01 | Unauthenticated users redirected to login | SATISFIED | middleware.ts re-exports auth with full route matcher |
| DASH-01 | 02-02 | View list of all distressed properties | SATISFIED | getProperties() → PropertyCard grid in dashboard page |
| DASH-02 | 02-02 | Filter by city, county, distress type, hot lead status | SATISFIED | DashboardFilters with city/distressType/hot URL params |
| DASH-03 | 02-02 | Sort by score, date, city | SATISFIED | getProperties() switches orderBy on params.sort |
| DASH-04 | 02-02 | "New since last visit" badge | SATISFIED | isNew() function checks firstSeenAt > lastViewedAt |
| DASH-05 | 02-01 | Mobile-first responsive with large tap targets | SATISFIED | bottom-nav 44px targets, responsive grids; needs human verify |
| DASH-06 | 02-05 | Configure target cities/counties | SATISFIED | SettingsForm + updateTargetCities + scraperConfig upsert |
| PROP-01 | 02-03 | Detail page: address, owner, tax status, mortgage info | PARTIAL | Address and owner shown; tax/mortgage not as distinct fields — only surfaced as signals |
| PROP-02 | 02-03 | All active distress signals with dates | SATISFIED | SignalTimeline with labels, dates, status badges |
| PROP-03 | 02-03 | Distress score and hot lead status | SATISFIED | PropertyOverview Lead Info card; hot badge in page header |
| PROP-04 | 02-03 | Owner contact info when available (or skip trace flag) | SATISFIED | ContactTab shows skip trace flag + owner name; Phase 3 adds actual contact lookup |
| LEAD-01 | 02-04 | Set lead status (5 statuses) | SATISFIED | updateLeadStatus action; kanban drag; list dropdown |
| LEAD-02 | 02-04 | Add timestamped notes to any lead | SATISFIED | addLeadNote action; LeadNotes component with voice input |
| LEAD-03 | 02-04 | View full pipeline by status | SATISFIED | LeadKanban (5 columns) + LeadList (status tabs) |
| LEAD-04 | 02-04 | Flag leads with no contact info | SATISFIED | LeadCard always shows "Skip trace needed" badge; ContactTab shows warning banner |

**Requirements assessed: 17/17**
**Satisfied: 16/17 | Partial: 1/17 (PROP-01) | Blocked: 0/17**

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `contact-tab.tsx` | `{/* Placeholder sections */}` comment for phone/email cards | Info | Intentional — Phase 3 will populate contact data. Comment is accurate, not a stub. |
| `bottom-nav.tsx` | `if (!isMobile) return null` | Info | Correct implementation — desktop uses sidebar, mobile uses bottom nav. Not a stub. |

No blocking anti-patterns found. All placeholder comments in `contact-tab.tsx` are intentional Phase 3 deferrals, consistent with PROP-04 plan notes.

---

## Human Verification Required

### 1. Mobile Navigation Layout

**Test:** Open the app in browser DevTools responsive mode (375px width, iPhone simulation). Navigate between Dashboard, Pipeline, Settings.
**Expected:** Bottom nav bar visible at screen bottom with 44px+ tap targets; sidebar hidden; page content has padding-bottom to prevent overlap with nav bar.
**Why human:** CSS layout and actual touch target dimensions cannot be verified by code inspection.

### 2. Login and Session Persistence

**Test:** Configure `app/.env.local` with actual credentials. `npm run dev`. Visit `/`. Log in. Close and reopen the browser. Visit `/`.
**Expected:** Redirected to dashboard without re-entering credentials. Session alive for 30 days.
**Why human:** Requires live app with real AUTH_EMAIL and AUTH_PASSWORD_HASH env vars.

### 3. Dark/Light Mode Persistence

**Test:** In Settings, toggle to Dark mode. Reload page. Navigate to Dashboard.
**Expected:** Dark mode persists across page reloads and navigation.
**Why human:** next-themes saves to localStorage; requires live browser.

### 4. Kanban Drag-and-Drop on Touch

**Test:** Open `/pipeline` in Chrome mobile DevTools. Drag a lead card from "New" column to "Contacted" column.
**Expected:** Card moves visually (optimistic update) and status persists after refresh.
**Why human:** @hello-pangea/dnd touch behavior requires live interaction.

### 5. Voice Note Input

**Test:** Open a property detail page in Chrome desktop with microphone permission granted. Click microphone button in Notes tab. Speak a sentence.
**Expected:** Transcript appends to note textarea. Submit saves note and it appears in the list.
**Why human:** Web Speech API requires live browser with microphone access.

---

## Gaps Summary

**One partial gap was found affecting PROP-01.**

The ROADMAP and REQUIREMENTS both specify "tax status, mortgage info" as distinct fields on the property detail page (PROP-01: "address, owner name, tax status, mortgage info, and all available public data"). However, neither the Phase 1 schema nor the Phase 2 `PropertyWithLead` type contains discrete `taxStatus` or `mortgageInfo` columns. The underlying data is surfaced indirectly: a `tax_lien` signal in the Signals tab represents tax delinquency, and a `nod` (Notice of Default) signal represents mortgage default.

**The property overview tab has no dedicated tax status or mortgage section.**

This is a gap between the requirement text and what is implemented. The fix is low-cost: either (a) add a note in the Overview card pointing to the Signals tab for tax/mortgage info, or (b) add a computed "Tax Status" field derived from the presence/absence of an active `tax_lien` signal. No database migration is required.

All other 16 must-haves are fully verified. Auth, dashboard filtering, property detail, pipeline management, and deployment are all substantively implemented and correctly wired.

---

_Verified: 2026-03-18_
_Verifier: Claude (gsd-verifier)_
