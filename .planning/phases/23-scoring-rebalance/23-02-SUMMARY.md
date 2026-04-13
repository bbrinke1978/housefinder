---
phase: 23-scoring-rebalance
plan: 02
subsystem: scoring
tags: [scoring, threshold, signals, config]
requires:
  - phase: 23-01
    provides: deduplicateSignals() and dry-run CLI
provides:
  - Signal weights configured for probate (3), code_violation (2), lis_pendens (2)
  - Threshold kept at 4 per user decision
affects: []
tech-stack:
  added: []
  patterns: []
key-files:
  created:
    - app/scripts/set-signal-weights.ts
  modified: []
key-decisions:
  - "Keep threshold at 4 — let XChange signals differentiate properties above tax-lien baseline rather than filtering down"
  - "Probate weight=3 (highest new signal), code_violation=2, lis_pendens=2"
patterns-established: []
requirements-completed: [SCORE2-01, SCORE2-02, SCORE2-03]
duration: 5min
completed: 2026-04-13
---

# Phase 23-02: Threshold Review and Signal Weight Configuration

**Dry-run showed 1,105 hot leads (35.4%) at threshold=4; user chose to keep threshold at 4 and let XChange signals differentiate**

## Performance
- **Duration:** 5 min
- **Tasks:** 3 (1 auto + 1 checkpoint + 1 config)

## Accomplishments
- Dry-run executed against production: baseline 1,105 hot leads at threshold=4
- User reviewed threshold guidance (5→387, 6→356, 7→246) and chose to keep at 4
- Signal weights configured: probate=3, code_violation=2, lis_pendens=2
- When XChange signals arrive, properties with court records will score higher than tax-lien-only properties

## Decisions Made
- Threshold stays at 4 — new signal types will push properties with court records above the baseline, creating natural differentiation without filtering out existing hot leads

---
*Phase: 23-scoring-rebalance*
*Completed: 2026-04-13*
