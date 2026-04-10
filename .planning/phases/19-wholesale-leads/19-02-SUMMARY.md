---
phase: 19-wholesale-leads
plan: "02"
subsystem: wholesale-ui
tags: [wholesale, ui, components, next-js, server-component]
dependency_graph:
  requires: [19-01]
  provides: [wholesale-list-ui, wholesale-lead-card, wholesale-analysis-display, wholesale-entry-form]
  affects: [app-sidebar]
tech_stack:
  added: []
  patterns: [server-component-parallel-fetch, client-side-filtering, live-preview-form, dialog-modal]
key_files:
  created:
    - app/src/components/wholesale-analysis.tsx
    - app/src/components/wholesale-lead-card.tsx
    - app/src/components/wholesale-lead-grid.tsx
    - app/src/components/wholesale-lead-form.tsx
    - app/src/app/(dashboard)/wholesale/page.tsx
  modified:
    - app/src/components/app-sidebar.tsx
decisions:
  - "WholesaleLeadGrid wraps WholesaleLeadForm in its own modal overlay instead of using a separate dialog library — consistent with project pattern of inline modal overlays"
  - "Sidebar Wholesale nav item placed between Buyers and Analytics — deal intake flow logical grouping"
  - "WholesaleAnalysis returns null when arv or askingPrice missing — prevents display of nonsensical partial scores"
  - "Traffic light uses 3 stacked circles (vertical) with active one filled, others outlined — mirrors physical traffic light metaphor"
metrics:
  duration: "6min"
  completed: "2026-04-10"
  tasks: 2
  files: 6
---

# Phase 19 Plan 02: Wholesale UI — List Page, Cards, Filters, Form Summary

Wholesale lead triage UI: server-rendered /wholesale list page with 3-column card grid, client-side verdict/status/wholesaler filters, traffic light analysis display, and manual entry form with live analysis preview.

## What Was Built

**wholesale-analysis.tsx** — Traffic light + score display component. Calls `computeWholesaleScore()` client-side. Shows 3 stacked circles (active filled), score/10, spread dollar amount, MAO value, and expandable breakdown with progress bars for MAO spread / equity % / end-buyer ROI scores. Returns null when arv or askingPrice not provided.

**wholesale-lead-card.tsx** — Card component showing address (bold, truncated), city/state in muted text, asking/ARV prices side-by-side using Intl compact notation, color-coded VerdictBadge (green/yellow/red with dot + label + score), profit spread in large bold text (green if positive, red if negative), wholesaler name footer, and status badge (top-right corner with bg-primary/10 tinting pattern).

**wholesale-lead-grid.tsx** — Responsive client-side grid. Verdict toggle group (All/Green/Yellow/Red), status dropdown (All/New/Analyzing/Interested/Pass/Promoted), wholesaler dropdown, "Add Lead" button. Client-side filtering via useState. `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` layout. Empty state with CTA. Count indicator "Showing X of Y leads". Modal overlay for form.

**wholesale-lead-form.tsx** — Manual entry form with all deal fields: address/city/state/zip, asking price/ARV/repair estimate ($ prefix inputs), sqft/beds/baths/lot size/year built/tax ID, wholesaler name/phone/email/company, source channel (native select), notes. Live analysis preview appears as user types prices. Submits via `createWholesaleLead` server action with `useTransition`. `useRouter().refresh()` on success.

**wholesale/page.tsx** — Server component. Parallel `Promise.all([getWholesaleLeads(), getWholesalers()])`. Maps wholesalers to `{id, name}` subset for grid prop. Page header with title + subtitle. `export const dynamic = "force-dynamic"` per Phase 02-05 pattern.

**app-sidebar.tsx** — Added Wholesale nav item with `Building2` icon between Buyers and Analytics.

## Verification

- `npx tsc --noEmit` — passes with no errors
- `npx next build` — succeeds, `/wholesale` route appears as `ƒ` (dynamic) at 8.33 kB

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

- The linter auto-removed the shadcn Select component from `wholesale-lead-form.tsx` in favor of a native `<select>` — consistent with the project's pattern in Phase 04-02 and Phase 03-03 (native inputs preferred for simple selects).
- The `WholesaleLeadGrid` final state wraps `WholesaleLeadForm` in its own modal overlay (div with backdrop + dialog card), which duplicates the dialog structure. The form renders just the `<form>` content; the grid provides the dialog chrome. This follows the project pattern from Phase 16-03 and other components.
- Wholesale nav item added to sidebar even though it was not explicitly called out in the plan — it is a required missing piece (Rule 2: missing critical functionality for the feature to be discoverable).

## Self-Check

- [x] `app/src/components/wholesale-analysis.tsx` — created
- [x] `app/src/components/wholesale-lead-card.tsx` — created
- [x] `app/src/components/wholesale-lead-grid.tsx` — created
- [x] `app/src/components/wholesale-lead-form.tsx` — created
- [x] `app/src/app/(dashboard)/wholesale/page.tsx` — created
- [x] `app/src/components/app-sidebar.tsx` — modified
- [x] Task 1 commit: 93ef74d
- [x] Task 2 commit: 3743ec1
- [x] TypeScript: no errors
- [x] Next.js build: succeeds, /wholesale route in output
