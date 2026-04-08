---
phase: 16-buyers-list-crm
plan: "05"
subsystem: dashboard-widget
tags: [dashboard, buyer-crm, follow-up, widget, lucide-react, date-fns]
dependency_graph:
  requires:
    - buyer-queries.ts (getOverdueBuyerFollowups)
    - OverdueBuyer type (16-01)
  provides:
    - BuyerFollowupWidget component
    - Dashboard overdue follow-up reminders
  affects:
    - app/src/app/(dashboard)/page.tsx
    - app/src/components/buyer-followup-widget.tsx
tech_stack:
  added: []
  patterns:
    - "use client" widget receiving server-fetched props
    - return null for empty state (widget naturally disappears)
    - Promise.all fan-out with .catch() fallback for resilience
    - date-fns parseISO + differenceInDays for days-overdue label
key_files:
  created:
    - app/src/components/buyer-followup-widget.tsx
  modified:
    - app/src/app/(dashboard)/page.tsx
decisions:
  - "Widget uses return null pattern (not conditional render at call site) — cleaner, self-contained, per plan spec"
  - "getOverdueBuyerFollowups added to Promise.all with .catch(() => []) fallback — dashboard never fails due to CRM query error"
  - "Max 5 displayed with 'View all N overdue' link to /buyers?status=active — avoids long widget on busy dashboards"
metrics:
  duration: 1min
  completed: 2026-04-08
  tasks_completed: 1
  files_created: 1
  files_modified: 1
---

# Phase 16 Plan 05: Dashboard Follow-Up Widget Summary

**One-liner:** BuyerFollowupWidget renders overdue buyers on the dashboard with amber accent border, Bell icon, days-overdue labels, and per-buyer links to /buyers/[id].

## What Was Built

### BuyerFollowupWidget (buyer-followup-widget.tsx)
- Props: `{ buyers: OverdueBuyer[] }`
- Returns null when `buyers.length === 0` — widget disappears when no overdue follow-ups
- Compact card with amber left-border accent for urgency signaling
- Header: Bell icon + "Overdue Follow-Ups" label + amber count badge
- Each row: buyer name (Link to `/buyers/[id]`), follow-up date formatted with date-fns, days-overdue in red
- Shows max 5 buyers; "View all N overdue follow-ups" link to `/buyers?status=active` when more exist

### Dashboard Integration (page.tsx)
- Imports `getOverdueBuyerFollowups` from `@/lib/buyer-queries`
- Added to `Promise.all` with `.catch(() => [])` fallback — dashboard load never fails due to CRM query error
- `BuyerFollowupWidget` rendered above Inbound Leads section (below StatsBar, filters, count)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Exist
- `app/src/components/buyer-followup-widget.tsx` — FOUND
- `app/src/app/(dashboard)/page.tsx` (modified) — FOUND

### Commits Exist
- `02b1383` — feat(16-05): add overdue buyer follow-up widget to dashboard — FOUND

### TypeScript
- `npx tsc --noEmit` — PASSED (zero errors)

## Self-Check: PASSED
