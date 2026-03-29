---
phase: 06-data-analytics-insights
plan: 03
subsystem: ui
tags: [recharts, date-fns, server-actions, zod, react, analytics]

requires:
  - phase: 06-01
    provides: analytics-queries.ts with ScraperHealthRow/OutreachStat types, call_logs schema, /analytics page shell

provides:
  - ScraperHealthTable component with red/yellow/green status dots, ALERT badge, freshness coloring
  - AnalyticsOutreach horizontal bar chart with contact rate stat
  - CallLogForm client component with lead dropdown, outcome radio buttons, success/error feedback
  - logCall server action inserting into call_logs with zod validation
  - getLeadsForCallLog() query for outreach tab form dropdown
  - Health tab and Outreach tab wired into /analytics page with real components

affects: [06-04, 07-frontend-design-polish]

tech-stack:
  added: []
  patterns:
    - useActionState with FormData for server action form submission and feedback
    - Per-outcome color mapping for recharts Cell fill
    - formatDistanceToNow from date-fns for relative timestamps in client components

key-files:
  created:
    - app/src/components/analytics-scraper-health.tsx
    - app/src/components/analytics-outreach.tsx
    - app/src/components/call-log-form.tsx
    - app/src/lib/analytics-actions.ts
  modified:
    - app/src/lib/analytics-queries.ts
    - app/src/app/(dashboard)/analytics/page.tsx

key-decisions:
  - "useActionState<LogCallResult | null, FormData> for call log form — consistent with React 19 form action pattern"
  - "durationMinutes input converted to seconds in server action — friendlier UX than asking for raw seconds"
  - "logCall returns union type {success:true}|{error:string} instead of throwing — allows graceful client feedback"

requirements-completed: [ANALYTICS-03, ANALYTICS-05]

duration: 4min
completed: 2026-03-29
---

# Phase 6 Plan 03: Scraper Health Dashboard + Outreach Tracking Summary

**Scraper health table with red/yellow/green dots and ALERT badges, outreach bar chart with contact rate, and call log form with server action wired into the /analytics health and outreach tabs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T20:22:26Z
- **Completed:** 2026-03-29T20:26:26Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- ScraperHealthTable renders county rows with colored status dots (emerald/amber/red), relative timestamps via date-fns, freshness hours with color thresholds (red >72h, amber >36h), and "ALERT" badge for counties with 3+ consecutive zero results
- AnalyticsOutreach renders a horizontal recharts BarChart with per-outcome color coding (answered=emerald, voicemail=amber, no_answer=slate, wrong_number=red) and a bold contact rate percentage above the chart
- CallLogForm with lead dropdown, outcome radio buttons, source/duration/notes fields, and useActionState for success/error feedback after form submission
- logCall server action validates with zod (uuid, enum, integer bounds), inserts into call_logs, and calls revalidatePath("/analytics")
- getLeadsForCallLog() query added to analytics-queries.ts, fetched in parallel with outreach stats on the outreach tab

## Task Commits

1. **Task 1: Create scraper health table and outreach stats chart** - `dc871b0` (feat)
2. **Task 2: Create call log form, server action, and wire health + outreach into analytics page** - `07ea67e` (feat)

**Plan metadata:** (included in final docs commit)

## Files Created/Modified

- `app/src/components/analytics-scraper-health.tsx` - ScraperHealthTable with color dots, freshness, ALERT indicator
- `app/src/components/analytics-outreach.tsx` - AnalyticsOutreach bar chart with contact rate stat
- `app/src/components/call-log-form.tsx` - CallLogForm with useActionState and form reset on success
- `app/src/lib/analytics-actions.ts` - logCall server action with zod validation and revalidatePath
- `app/src/lib/analytics-queries.ts` - Added getLeadsForCallLog() for outreach tab form dropdown
- `app/src/app/(dashboard)/analytics/page.tsx` - Health tab uses ScraperHealthTable; outreach tab uses AnalyticsOutreach + CallLogForm with parallel data fetch

## Decisions Made

- Used `useActionState<LogCallResult | null, FormData>` for the call log form — consistent with React 19 form action pattern used in other forms in the codebase
- Duration input accepts minutes (float) and converts to seconds in the server action — friendlier UX than asking for raw seconds
- `logCall` returns a union type `{success:true}|{error:string}` rather than throwing — enables graceful client-side success/error feedback without try/catch in the component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Tooltip formatter type error in analytics-outreach.tsx**
- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** `formatter={(value: number) => ...}` was type-incompatible with recharts Formatter type which allows `ValueType | undefined`
- **Fix:** Removed explicit `number` type annotation, let TypeScript infer from context
- **Files modified:** app/src/components/analytics-outreach.tsx
- **Verification:** `npx tsc --noEmit` exit code 0
- **Committed in:** dc871b0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 type error bug)
**Impact on plan:** Minor type fix required for clean TypeScript compilation. No scope change.

## Issues Encountered

- Windows `.next` build cache had a symlink issue (`EINVAL: invalid argument, readlink`) on first build attempt — cleared cache and rebuilt successfully. Pre-existing Windows path issue, not caused by this plan's changes.

## Next Phase Readiness

- Health tab fully functional with ScraperHealthTable once scrapers populate the scraper_health table
- Outreach tab shows call outcome breakdown and allows logging calls immediately
- Plan 04 (Activity Log + Export) already completed (commit 65701be) — all 4 analytics plans complete

---
*Phase: 06-data-analytics-insights*
*Completed: 2026-03-29*
