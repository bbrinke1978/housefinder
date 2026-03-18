---
phase: 02-core-application
plan: 04
subsystem: ui
tags: [kanban, dnd, speech-api, pipeline, leads, drag-drop, voice-to-text]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Next.js app scaffold, dashboard layout, auth, DB schema"
provides:
  - "Pipeline page at /pipeline with kanban and list views"
  - "Drag-and-drop lead status management via @hello-pangea/dnd"
  - "updateLeadStatus server action with auto-logged status changes"
  - "Voice-to-text note input via Web Speech API"
  - "getPipelineLeads query joining leads with properties"
  - "PipelineLead type for pipeline-specific context"
affects: [02-05, 03-contact-enrichment]

# Tech tracking
tech-stack:
  added: ["@hello-pangea/dnd (already installed)", "Web Speech API"]
  patterns: ["Optimistic UI updates with server action revert on error", "PipelineLead extending PropertyWithLead for query-specific fields"]

key-files:
  created:
    - app/src/app/(dashboard)/pipeline/page.tsx
    - app/src/components/lead-kanban.tsx
    - app/src/components/lead-list.tsx
    - app/src/components/lead-card.tsx
    - app/src/components/voice-note-input.tsx
    - app/src/types/speech-recognition.d.ts
  modified:
    - app/src/lib/queries.ts
    - app/src/lib/actions.ts
    - app/src/types/index.ts

key-decisions:
  - "PipelineLead type extends PropertyWithLead with propertyId -- pipeline query uses lead.id as primary id"
  - "Voice input gracefully degrades -- disabled button with tooltip in non-Chrome browsers"
  - "Status change auto-logged as note but optional user note on status change for quick pipeline management"

patterns-established:
  - "Optimistic UI: update local state immediately, revert on server action failure"
  - "Pipeline views share PipelineLead type and LeadCard component"
  - "SpeechRecognition types declared in speech-recognition.d.ts for TypeScript compat"

requirements-completed: [LEAD-01, LEAD-02, LEAD-03, LEAD-04]

# Metrics
duration: 6min
completed: 2026-03-18
---

# Phase 2 Plan 4: Lead Pipeline Summary

**Pipeline page with kanban drag-and-drop (5 status columns) and list view toggle, voice-to-text notes via Web Speech API, and skip trace flag on all leads**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-18T22:13:49Z
- **Completed:** 2026-03-18T22:19:30Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Pipeline page at /pipeline with kanban (default) and list view toggle via URL search params
- Kanban board with 5 draggable status columns (New, Contacted, Follow-Up, Closed, Dead) using @hello-pangea/dnd
- List view with status filter tabs, inline status dropdown, and note form with voice-to-text input
- Lead cards showing address, city, distress score, hot badge, skip trace needed flag, and last contacted
- updateLeadStatus server action with zod validation, auto-logged status changes, and optional user notes
- Voice-to-text input component using Web Speech API with browser support detection
- getPipelineLeads query appended to shared queries.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pipeline queries, updateLeadStatus action, and voice input component** - `4f7667c` (feat)
2. **Task 2: Build pipeline page with kanban board, list view toggle, and lead cards** - `9037d81` (feat)

**Plan metadata:** pending (docs: complete lead pipeline plan)

## Files Created/Modified
- `app/src/app/(dashboard)/pipeline/page.tsx` - Pipeline page with kanban/list toggle, empty state
- `app/src/components/lead-kanban.tsx` - Kanban board with DragDropContext, 5 Droppable columns, optimistic updates
- `app/src/components/lead-list.tsx` - List view with status filter tabs, inline note form with voice input
- `app/src/components/lead-card.tsx` - Shared lead card with address, score, hot badge, skip trace flag
- `app/src/components/voice-note-input.tsx` - Web Speech API voice-to-text with browser support detection
- `app/src/types/speech-recognition.d.ts` - TypeScript declarations for SpeechRecognition API
- `app/src/types/index.ts` - Added PipelineLead type extending PropertyWithLead
- `app/src/lib/queries.ts` - Added getPipelineLeads query
- `app/src/lib/actions.ts` - Added updateLeadStatus server action

## Decisions Made
- PipelineLead type extends PropertyWithLead with propertyId field -- pipeline query selects lead.id as the primary id and needs propertyId for linking to property detail page
- Voice input gracefully degrades in non-Chrome browsers with a disabled button and tooltip
- Status change notes are auto-logged but optional user notes keep quick pipeline management fast
- "Skip trace needed" badge shown on ALL leads in Phase 2 since contact lookup is Phase 3

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Parallel plan overwrote queries.ts and actions.ts**
- **Found during:** Task 2 (build verification)
- **Issue:** Parallel plans 02-02/02-03 wrote their own versions of queries.ts and actions.ts, overwriting the initial Task 1 commit
- **Fix:** Re-appended getPipelineLeads to queries.ts and updateLeadStatus to actions.ts preserving the parallel plans' functions
- **Files modified:** app/src/lib/queries.ts, app/src/lib/actions.ts
- **Verification:** Build passes with all functions present
- **Committed in:** 9037d81 (Task 2 commit)

**2. [Rule 3 - Blocking] SpeechRecognition types missing**
- **Found during:** Task 1 (TypeScript verification)
- **Issue:** Web Speech API types not included in TypeScript lib declarations
- **Fix:** Created speech-recognition.d.ts with SpeechRecognition, SpeechRecognitionEvent, and Window augmentation
- **Files modified:** app/src/types/speech-recognition.d.ts
- **Verification:** TypeScript compiles without SpeechRecognition errors
- **Committed in:** 4f7667c (Task 1 commit)

**3. [Rule 1 - Bug] PropertyWithLead missing propertyId for pipeline context**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** Pipeline query returns both lead.id and leads.propertyId, but PropertyWithLead type doesn't have propertyId
- **Fix:** Created PipelineLead type extending PropertyWithLead with propertyId field
- **Files modified:** app/src/types/index.ts, lead-card.tsx, lead-kanban.tsx, lead-list.tsx, queries.ts
- **Verification:** Build passes
- **Committed in:** 9037d81 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for compilation and correctness. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in dashboard-filters.tsx from parallel plan (Select `onValueChange` type mismatch) was auto-fixed by the parallel agent during execution
- Pre-existing missing module errors for signal-timeline, lead-notes, contact-tab (from Plan 02-03 in progress) -- out of scope, not addressed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Pipeline page fully functional with kanban and list views
- Status management and note-taking infrastructure in place
- Ready for Phase 3 contact enrichment to populate contact info and remove universal "skip trace needed" flag
- Voice-to-text ready for hands-free note entry while driving

## Self-Check: PASSED

- All 8 created files verified on disk
- Commit 4f7667c verified (Task 1)
- Commit 9037d81 verified (Task 2)
- Build passes successfully

---
*Phase: 02-core-application*
*Completed: 2026-03-18*
