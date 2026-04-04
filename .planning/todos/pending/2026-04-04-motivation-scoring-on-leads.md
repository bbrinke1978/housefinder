---
created: 2026-04-04T04:40:00.000Z
title: Add motivation scoring to leads
area: deals
files:
  - app/src/app/deals/[id]/page.tsx
  - app/src/lib/queries.ts
---

## Problem

From Brian's sales training system: leads need a motivation score (1-10 scale) that maps to Hot (7-10), Warm (4-6), Cold (1-3). Currently the distress score is algorithmic, but there's no manual "how motivated is this seller?" field that comes from actual conversation.

## Solution

- Add `motivation_score` (1-10 integer) field to deals table
- Editable on deal detail page — set after talking to seller
- Display as Hot/Warm/Cold badge alongside the existing distress score
- Filterable on dashboard: show only Hot leads, etc.
- From sales KPIs: 1-3 Low, 4-6 Medium, 7-10 High
