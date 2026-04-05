---
phase: 13-contract-e-signature
plan: "03"
subsystem: contracts
tags: [contracts, e-signature, canvas, pdf, next-auth, middleware]
dependency_graph:
  requires:
    - app/src/lib/contract-queries.ts (getContractBySigningToken, getContractById)
    - app/src/lib/contract-actions.ts (submitSignature server action)
    - app/src/lib/contract-pdf.tsx (generateContractPdf)
  provides:
    - /sign/[token] public signing page (no auth required)
    - SignatureCanvas component with draw + type modes
    - /api/contracts/[id]/pdf GET endpoint
    - signing-page-client.tsx (client wrapper for submitSignature)
  affects:
    - app/src/middleware.ts (sign/* now excluded from auth)
tech-stack:
  added: []
  patterns:
    - "Pointer Events API (not mouse/touch events) for cross-device canvas drawing"
    - "touchAction: none on canvas — prevents iOS Safari scroll interference during drawing"
    - "Server component for token validation + client component for submission — split at the form boundary"
    - "new Uint8Array(buffer) wraps Node Buffer for Web Response BodyInit compatibility"
    - "middleware matcher excludes 'sign' segment — public routes outside (dashboard) group are protected by default unless excluded"

key-files:
  created:
    - app/src/components/signature-canvas.tsx
    - app/src/app/sign/[token]/page.tsx
    - app/src/app/sign/[token]/signing-page-client.tsx
    - app/src/app/api/contracts/[id]/pdf/route.ts
  modified:
    - app/src/middleware.ts

key-decisions:
  - "Pointer Events API (not separate mouse/touch handlers) — single handler covers mouse, touch, and stylus with setPointerCapture for clean drag behavior"
  - "touchAction: none on canvas element — prevents iOS Safari from intercepting touch events as scroll during drawing (research-identified pitfall)"
  - "Server component renders contract summary; SigningPageClient is the only client island — minimizes JS sent to external signers"
  - "new Uint8Array(buffer) wrapper required for Web Response constructor — Node Buffer not directly assignable to BodyInit in strict TypeScript"
  - "middleware exclusion: 'sign' added to matcher negative lookahead — /sign/* is physically outside (dashboard) route group so no layout auth, but middleware still runs globally"

patterns-established:
  - "Split server/client at form boundary: server component validates state and renders static content, client component owns submission and transition state"

requirements-completed: [CONTRACT-11, CONTRACT-12, CONTRACT-13]

duration: 2min
completed: 2026-04-05
---

# Phase 13 Plan 03: Public Signing Page & PDF Endpoint Summary

**Token-gated public signing page at /sign/[token] with draw/type signature canvas, contract summary card, and auth-gated PDF download endpoint — no HouseFinder account needed for external signers.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-05T14:17:02Z
- **Completed:** 2026-04-05T14:19:00Z
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- SignatureCanvas component with draw mode (Pointer Events, touchAction:none) and type mode (cursive font preview), responsive to container width
- Public /sign/[token] page: server validates token, renders contract summary (property, parties, key terms), offers PDF download link; shows clear error pages for invalid/expired/already-signed states
- SigningPageClient: useTransition wrapper calls submitSignature, shows confirmation on success
- /api/contracts/[id]/pdf GET: auth-gated, generates and streams PDF with inline content disposition
- middleware.ts updated to exclude /sign/* from NextAuth redirect

## Task Commits

1. **Task 1: Signature canvas component** - `6d82e60` (feat)
2. **Task 2: Public signing page + PDF API endpoint** - `cf1ad7f` (feat)

## Files Created/Modified
- `app/src/components/signature-canvas.tsx` — Draw/type signature canvas component (273 lines)
- `app/src/app/sign/[token]/page.tsx` — Public signing page server component (292 lines)
- `app/src/app/sign/[token]/signing-page-client.tsx` — Client submission wrapper with useTransition
- `app/src/app/api/contracts/[id]/pdf/route.ts` — Auth-gated PDF generation endpoint
- `app/src/middleware.ts` — Added `sign` to matcher exclusion list

## Decisions Made
- Pointer Events API chosen over separate mouse/touch handlers — single handler covers all input devices including stylus, setPointerCapture provides clean drag without losing events at canvas edge
- Server component renders contract summary, only the signature form is a client island — minimizes JS bundle sent to external signers on mobile
- `new Uint8Array(buffer)` wraps the Node.js Buffer returned by @react-pdf/renderer for Web Response BodyInit compatibility in strict TypeScript
- middleware exclusion via negative lookahead `(?!...sign...)` — /sign/* is outside (dashboard) route group but middleware runs globally so explicit exclusion is required

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Buffer to Uint8Array conversion in PDF route**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** `new Response(buffer)` where buffer is `Buffer<ArrayBufferLike>` fails TypeScript strict check — Buffer is not directly assignable to BodyInit
- **Fix:** Wrapped with `new Uint8Array(buffer)` which is a valid BodyInit
- **Files modified:** app/src/app/api/contracts/[id]/pdf/route.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** cf1ad7f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - type bug)
**Impact on plan:** Necessary for TypeScript correctness. No scope creep.

## Issues Encountered
- Pre-existing `DealContractTracker` TS error in deals/[id]/page.tsx (from plan 13-02 which isn't yet complete) — confirmed pre-existing, out of scope, not fixed here.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Public signing UX complete: external signers can open a link, view terms, draw or type signature, and submit
- PDF endpoint ready for authenticated download from the dashboard
- Plan 13-04 (contract UI in deal detail page) can now wire DealContractTracker to the fully built backend

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| signature-canvas.tsx exists (273 lines >= 80 min) | PASSED |
| sign/[token]/page.tsx exists (292 lines >= 80 min) | PASSED |
| signing-page-client.tsx exists | PASSED |
| api/contracts/[id]/pdf/route.ts exists (41 lines >= 20 min) | PASSED |
| middleware.ts updated with sign exclusion | PASSED |
| /sign/[token] is outside (dashboard) layout group | PASSED |
| commit 6d82e60 exists | PASSED |
| commit cf1ad7f exists | PASSED |
| TypeScript compiles clean | PASSED |

---
*Phase: 13-contract-e-signature*
*Completed: 2026-04-05*
