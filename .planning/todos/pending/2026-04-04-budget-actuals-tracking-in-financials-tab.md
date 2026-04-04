---
created: 2026-04-04T04:32:30.652Z
title: Budget actuals tracking in Financials tab
area: deals
files:
  - app/src/app/deals/[id]/page.tsx
  - app/src/lib/queries.ts
---

## Problem

The Financials tab under deals has the ability to set planned budget values per category (demo/site prep, roofing, etc.) but there's no way to input actual expenses. The "actual" column is non-functional.

Users need to:
1. Click on a budget category (demo/site prep, roofing, etc.) to expand it and input individual expense line items that roll up to the actual total
2. Have a running total for uncategorized expenses that don't fit neatly into a category
3. Track in-house labor estimates separately
4. Have a misc column for odds and ends

This ties into the future Phase 14 photo upload feature (receipt capture for expenses).

## Solution

- Make each budget category row expandable/clickable — opens an expense entry panel below it
- Each expense line item: description, amount, date, optional receipt (future photo upload)
- Expense line items sum to the "actual" value for that category
- Add an "In-House Labor" category/field for labor cost estimates
- Add a "Misc" category for uncategorized expenses
- Running total at the bottom showing planned vs actual across all categories
- New DB table `budget_expenses` (deal_id, category, description, amount, date, created_at)
- Keep it simple enough that Phase 14 photo capture can attach receipt images to expense rows later
