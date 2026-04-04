---
created: 2026-04-04T04:40:00.000Z
title: Profit allocation tracker (Babylon system)
area: deals
files:
  - app/src/app/deals/[id]/page.tsx
---

## Problem

Brian's business model uses the "Richest Man in Babylon" profit allocation: every closed deal's profit should split 10% Nest Egg / 20% Debt Paydown / 20% Marketing / 50% Operations. There's no way to see this breakdown or track cumulative allocations across deals.

## Solution

- When a deal closes with a profit amount, auto-calculate the Babylon split
- Show allocation breakdown on the deal's Financials tab
- Dashboard widget showing cumulative allocations across all closed deals
- Track: Nest Egg balance, Debt paydown total, Marketing reinvestment, Operations
- Ties into weekly accountability numbers (cash on hand, nest egg balance, debt remaining)
