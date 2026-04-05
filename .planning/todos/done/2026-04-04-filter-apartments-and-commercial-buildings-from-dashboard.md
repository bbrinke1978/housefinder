---
created: 2026-04-04T04:35:00.000Z
title: Filter apartments and commercial buildings from dashboard
area: data
files:
  - app/src/lib/queries.ts
  - scraper/src/lib/upsert.ts
---

## Problem

Apartments and commercial buildings are still coming through from data scrapes and showing up on the dashboard. These are not relevant for wholesaling distressed residential properties — they're noise, similar to the vacant land (DATA-11) and PO Box issues that were already filtered.

## Solution

- Similar approach to the vacant land filter (DATA-11): filter by property type in queries.ts
- Check what propertyType values exist for apartments/commercial in the database
- Add WHERE clause to getDashboardStats() and getProperties() excluding apartment/commercial/multi-family types
- May also need to check improvement values or other assessor fields to catch edge cases
- Pattern: same as PO Box filter and vacant land filter already in place
