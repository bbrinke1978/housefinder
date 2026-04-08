# Phase 16: Buyers List CRM - Research

**Researched:** 2026-04-05
**Domain:** CRM data layer (buyer interactions, timeline, matching, tags), Next.js 15 server/client patterns, CSV import/export, dashboard widget integration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Buyer Profiles & Data**
- Keep existing buyer fields as-is (name, phone, email, buy box, price range, funding type, target areas, rehab tolerance, notes) — no additional fields needed
- Active/Inactive status only (existing boolean) — no multi-step lifecycle
- Free-form tags per buyer (e.g., VIP, new, cash-only, fix-and-flip, buy-and-hold) — filterable on the list page
- Dedicated buyer detail page (click buyer to see full profile, deal history, communication timeline, matched deals)

**Buyer-Deal Matching**
- Auto-match + manual override — system auto-suggests matching buyers when viewing a deal, user picks which to blast
- Match criteria: price range (deal price within buyer's min/max) AND target area (deal city matches buyer's target_areas)
- Matching buyers shown on deal detail page + pre-selected in the deal blast flow. Unmatched buyers still available to add manually
- Track buyer-deal interactions: blasted (auto-logged when deal blast sent), interested (manually marked), closed (linked to deal outcome)

**Communication Tracking**
- Full CRM: track calls, emails, texts, meetings, deal blasts, and notes
- Unified chronological timeline on buyer detail page — icons/colors per type, filterable by type. Same pattern as deal activity timeline
- Follow-up reminders: set follow-up date per buyer. Overdue follow-ups show on main dashboard as a reminder widget. Click to jump to buyer
- Auto-log deal blasts: when a deal is blasted to a buyer via Resend email, it automatically appears in their communication history with the deal link

**Buyers List View & Management**
- Searchable table with filters — rows show name, phone, email, buy box summary, tags, status, last contact date
- Filters: search, tag, active/inactive status, target area, funding type
- CSV import: upload CSV, map columns to buyer fields, bulk add existing buyer list
- CSV export: download filtered or full buyer list as CSV
- Manual entry: add buyers one at a time through a form (alongside CSV import)
- Replace existing /deals/buyers with new top-level /buyers page in sidebar

### Claude's Discretion
- Communication type enum values and color coding
- Follow-up reminder widget design on dashboard
- CSV import column mapping UI
- Buyer detail page tab layout vs single-scroll
- Match score display (percentage, badge, or simple "matches" indicator)

### Deferred Ideas (OUT OF SCOPE)
- Automated buyer email sequences (drip campaigns for new buyers) — separate phase
- Buyer portal (buyers log in to see available deals) — separate phase
- SMS/text integration with actual sending — separate phase
- Buyer referral tracking — future enhancement
</user_constraints>

---

## Summary

Phase 16 converts the existing basic `/deals/buyers` page into a full CRM for cash buyers. The existing `buyers` table already has all required profile fields. The work is additive: new tables for buyer communication events, buyer-deal interactions, and buyer tags; new pages at `/buyers` (list) and `/buyers/[id]` (detail); a follow-up reminder widget on the dashboard; CSV import/export; and auto-logging of deal blasts into buyer communication history.

The codebase has a strong established pattern: server-side data fetching at the page level, Zod-validated server actions (`"use server"`), and React 19 `useActionState` for form feedback. The buyer CRM follows these same patterns exactly. The communication timeline is a direct parallel to `getLeadTimeline()` in `contact-event-queries.ts` — same merge/sort pattern, new entity type (buyer instead of lead). The only net-new complexity is CSV import column mapping UI and the dashboard reminder widget.

The next migration will be **0009** (existing migrations go 0000–0008). New tables needed: `buyer_communication_events`, `buyer_deal_interactions`, `buyer_tags`. No changes to the existing `buyers` table schema — tags stored in a separate junction-style table. The `/deals/buyers` route can be left in place as a redirect to `/buyers` to avoid breaking existing sidebar link state.

**Primary recommendation:** Build in 5 waves: (1) schema + DB layer, (2) `/buyers` list page with filters/search/CSV, (3) `/buyers/[id]` detail page with timeline, (4) deal detail integration (auto-match, blast tracking), (5) dashboard follow-up widget.

---

## Standard Stack

### Core (already in project — no new installs needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.1 | DB queries + schema | Already the ORM for this project |
| zod | 4.3.6 | Server action validation | Established pattern in all actions |
| next (server actions) | 15.5.13 | Mutations, `"use server"` | All mutations use this pattern |
| date-fns | 4.1.0 | Date formatting in timeline | Already imported in components |
| lucide-react | 0.577.0 | Icons for timeline types | Already used throughout |
| shadcn (base-ui) | 4.0.8 | Table, Dialog, Badge, Sheet | All UI built on this |

### New Installs: None Required
CSV parsing/generation can be done with plain JavaScript — no library needed at this scale. The buyer list will be small (dozens to hundreds) so a native FileReader + string split handles CSV import. CSV export uses the established `buildCsv` pattern from Phase 06 analytics export (JSON.stringify per cell).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain JS CSV parsing | papaparse | papaparse is more robust for edge cases (quoted fields, multiline values) but adds a dependency; plain JS adequate for known buyer CSV formats |
| Custom timeline component | reuse ActivityTimeline | ActivityTimeline is currently typed for `TimelineEntry` (lead-centric) — easier to create a new `BuyerTimeline` component with the same visual style but buyer-specific type |

---

## Architecture Patterns

### New File Structure
```
app/src/
├── app/(dashboard)/buyers/
│   ├── page.tsx                    # /buyers list page (replaces /deals/buyers)
│   └── [id]/
│       └── page.tsx                # /buyers/[id] detail page
├── lib/
│   ├── buyer-queries.ts            # All read queries for buyer CRM
│   └── buyer-actions.ts            # All server actions for buyer CRM
├── components/
│   ├── buyers-list-table.tsx       # Searchable/filterable table
│   ├── buyer-detail-header.tsx     # Name, contact, tags, follow-up date
│   ├── buyer-timeline.tsx          # Communication timeline (buyer-specific)
│   ├── buyer-deal-history.tsx      # Matched deals + interaction status
│   ├── buyer-csv-import.tsx        # Upload + column mapping UI
│   └── buyer-followup-widget.tsx   # Dashboard overdue reminders widget
```

### Pattern 1: Buyer Communication Events (mirrors contactEvents)
**What:** A new `buyer_communication_events` table stores all buyer touchpoints — calls, emails, texts, meetings, deal_blast, notes.
**When to use:** Every logged interaction with a buyer.

```typescript
// schema.ts additions
export const buyerCommEventTypeEnum = pgEnum("buyer_comm_event_type", [
  "called_buyer",
  "left_voicemail",
  "emailed_buyer",
  "sent_text",
  "met_in_person",
  "deal_blast",   // auto-logged when blast email sent
  "note",
]);

export const buyerCommunicationEvents = pgTable(
  "buyer_communication_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id").notNull().references(() => buyers.id),
    eventType: buyerCommEventTypeEnum("event_type").notNull(),
    notes: text("notes"),
    dealId: uuid("deal_id").references(() => deals.id),  // for deal_blast events
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_buyer_comm_events_buyer_id").on(table.buyerId),
    index("idx_buyer_comm_events_occurred_at").on(table.occurredAt),
  ]
);
```

### Pattern 2: Buyer-Deal Interactions (blasted → interested → closed funnel)
**What:** A junction table linking buyers to deals with interaction status.
**When to use:** When a deal is blasted to a buyer or status is manually updated.

```typescript
export const buyerDealInteractionStatusEnum = pgEnum("buyer_deal_interaction_status", [
  "blasted",
  "interested",
  "closed",
]);

export const buyerDealInteractions = pgTable(
  "buyer_deal_interactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id").notNull().references(() => buyers.id),
    dealId: uuid("deal_id").notNull().references(() => deals.id),
    status: buyerDealInteractionStatusEnum("status").notNull().default("blasted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_buyer_deal_interactions_buyer_id").on(table.buyerId),
    index("idx_buyer_deal_interactions_deal_id").on(table.dealId),
    uniqueIndex("uq_buyer_deal_interaction").on(table.buyerId, table.dealId),
  ]
);
```

### Pattern 3: Buyer Tags (free-form, filterable)
**What:** A separate tags table — not stored on the buyer row itself — to allow flexible many-to-many-style tag assignment.
**When to use:** Tags assigned per buyer, filterable on list page.

```typescript
export const buyerTags = pgTable(
  "buyer_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerId: uuid("buyer_id").notNull().references(() => buyers.id),
    tag: text("tag").notNull(),  // free-form e.g. "VIP", "fix-and-flip"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_buyer_tags_buyer_id").on(table.buyerId),
    uniqueIndex("uq_buyer_tag").on(table.buyerId, table.tag),
  ]
);
```

**Alternative considered:** Storing tags as a JSON array on the `buyers` table (e.g., `tags: text("tags")` storing `["VIP","cash-only"]`). Rejected because: filtering by tag would require a `LIKE '%VIP%'` query which is fragile, and the separate table approach matches the project's existing pattern of avoiding JSONB for queryable data.

### Pattern 4: Follow-Up Date on Buyers Table
**What:** Add `followUpDate` (nullable `date` column) and `lastContactedAt` (nullable `timestamp`) to the existing `buyers` table via migration.
**When to use:** User sets a follow-up reminder on a buyer. Dashboard widget queries `WHERE follow_up_date <= now() AND is_active = true`.

```typescript
// Migration 0009 adds to buyers table:
followUpDate: date("follow_up_date"),           // nullable
lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),  // nullable
```

### Pattern 5: CSV Export (established project pattern)
**What:** Server-side CSV generation using `buildCsv` pattern from Phase 06.
**When to use:** Download filtered or full buyer list.

```typescript
// Source: Phase 06 analytics export pattern (app/src/app/api/export/route.ts)
function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
  }
  return lines.join("\n");
}
```

### Pattern 6: CSV Import — Client-Side Parse + Server Action Batch Insert
**What:** FileReader reads the uploaded CSV client-side, shows a column-mapping UI, user confirms, then calls a server action with the mapped rows as JSON.
**When to use:** Bulk import existing buyer list.

Key insight from project pattern: server actions accept `FormData` — for batch CSV import, serialize the mapped rows as a JSON string in a hidden `<input>` field, or use a `useTransition` + direct function call (not FormData) since arrays don't serialize well as FormData.

```typescript
// buyer-actions.ts
export async function importBuyers(
  rows: Array<{name: string; phone?: string; email?: string; ...}>
): Promise<{ imported: number; errors: string[] }> {
  // Called directly (not via FormData) because of array input
  // Batch insert with onConflictDoNothing on email to avoid duplicates
}
```

### Pattern 7: Auto-Log Deal Blast
**What:** When `DealBlastGenerator` sends an email to a buyer via Resend, the server action also inserts a `buyer_communication_events` row with `eventType: "deal_blast"` and `dealId` linked.
**When to use:** Every time a deal blast email is sent to a specific buyer.

The current `DealBlastGenerator` is copy-to-clipboard only (no email sending). The CONTEXT.md says "when a deal is blasted to a buyer via Resend email, it automatically appears in their communication history." This means Phase 16 needs to add email-blast functionality to `DealBlastGenerator` (or a new `DealBlastEmailSender` component) that calls a server action integrating with Resend + auto-logs.

### Pattern 8: Enhanced getMatchingBuyers (area matching)
**What:** The existing `getMatchingBuyers` only checks price range. Phase 16 extends it to also check city against `target_areas`.
**When to use:** Computing matches on deal detail page.

```typescript
// Current: price range only
// New: price range AND city in target_areas
// target_areas is stored as plain text (e.g., "Price, Helper, Wellington")
// Match: buyer.targetAreas is null OR buyer.targetAreas contains deal.city (case-insensitive ILIKE)
// Drizzle: use sql`lower(${buyers.targetAreas}) like lower(${'%' + city + '%'})`
```

### Anti-Patterns to Avoid
- **Storing tags on buyers.tags as JSON string:** Fragile LIKE queries, hard to enumerate distinct tags for filter dropdown. Use `buyer_tags` table.
- **Timeline fetched as N+1:** Fetch all communication events for a buyer in one query, not one per event type. Mirror `getLeadTimeline()` parallel fetch pattern.
- **Blocking deal creation on CSV import error:** CSV import should be best-effort with per-row error reporting, never rolling back successfully imported rows.
- **Reusing `ActivityTimeline` component for buyer timeline:** The existing component is typed for `TimelineEntry` which is lead-centric. Create `BuyerTimeline` component with same visual style, different type. Avoids coupling.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV serialization | Custom CSV writer | `buildCsv` from Phase 06 pattern | Already handles comma/quote/newline edge cases via JSON.stringify per cell |
| Date formatting in timeline | Custom date formatter | `date-fns format()` | Already in project, handles all edge cases |
| Searchable table filter | Custom search engine | Client-side `Array.filter()` on server-fetched data | Data set small (dozens to hundreds); no need for server-side search pagination |
| Tag autocomplete | Custom combobox | Plain `<datalist>` or Base UI Combobox | Tags are free-form; `<datalist>` shows existing tags as suggestions |
| Overdue reminder count | Polling or websocket | Single server query on dashboard page load | No real-time needed; page refresh is sufficient |

**Key insight:** The buyer CRM data set is small (dozens of buyers, not thousands). Client-side filtering and simple server queries are appropriate. No pagination, virtualization, or search indexing needed.

---

## Common Pitfalls

### Pitfall 1: target_areas Text Matching
**What goes wrong:** `target_areas` is stored as a free-text string like "Price, Helper, Wellington". Matching `deal.city` against it using SQL LIKE can fail on case differences or partial word matches (e.g., "Price" matching "Price City").
**Why it happens:** No normalization when buyers are created.
**How to avoid:** Use case-insensitive LIKE with `%city%` pattern. Document that city values should be canonical (same casing as used in `deals.city`). Optionally show a "matched" badge on the list page so the user can validate.
**Warning signs:** Matching shows zero results even when a buyer lists a city.

### Pitfall 2: buyerDealInteractions Upsert vs Insert
**What goes wrong:** If a deal is blasted to the same buyer twice, inserting a second `buyer_deal_interactions` row violates the unique constraint.
**Why it happens:** No guard against duplicate blasts.
**How to avoid:** Use `onConflictDoNothing()` on `(buyerId, dealId)` — the first blast creates the row, subsequent blasts don't change the status (it may already be "interested"). The communication event still logs every blast.
**Warning signs:** Server error on second blast to same buyer.

### Pitfall 3: Migration Number Collision
**What goes wrong:** Phase 16 migration numbered 0008 when 0008 already exists (floor_plans.sql).
**Why it happens:** Counting migrations from zero — actually go 0000–0008 (9 migrations exist).
**How to avoid:** Next migration is **0009**. Always check `app/drizzle/meta/_journal.json` before creating new migration.
**Warning signs:** drizzle-kit errors on apply.

### Pitfall 4: /deals/buyers Route Breaking
**What goes wrong:** Old sidebar link href="/deals/buyers" stops working after moving to /buyers. Both sidebar and bottom-nav reference it.
**Why it happens:** Moving the page without updating all references.
**How to avoid:** 
1. Create new page at `app/src/app/(dashboard)/buyers/[id]/page.tsx` and `buyers/page.tsx`
2. Update sidebar `href="/deals/buyers"` → `href="/buyers"` 
3. Update bottom-nav active detection
4. Add redirect from `/deals/buyers` → `/buyers` (optional, but safe)
5. Update `CommandMenu` if it references buyers
**Warning signs:** 404 on clicking Buyers in sidebar.

### Pitfall 5: CSV Import Arrays in FormData
**What goes wrong:** Trying to pass an array of buyer rows through `FormData` — arrays don't serialize cleanly to FormData.
**Why it happens:** All other server actions in the project use FormData.
**How to avoid:** The importBuyers server action should accept a plain typed array (called directly via `useTransition`, not via form submit). Pattern: `startTransition(() => importBuyers(mappedRows))`. This is consistent with how Phase 15 used direct server action calls for non-FormData scenarios.
**Warning signs:** FormData.get("rows") returns only the last element.

### Pitfall 6: Dashboard Widget Re-fetch Cost
**What goes wrong:** Adding a `getBuyersWithOverdueFollowups()` query to the dashboard page adds latency to every dashboard load.
**Why it happens:** Dashboard already runs 5 parallel queries.
**How to avoid:** Query is fast (single `WHERE follow_up_date <= now()` with index on `follow_up_date`). Add index on `buyers.follow_up_date` in the migration. Use `Promise.all` with the existing dashboard queries — adds ~1ms at DB scale.
**Warning signs:** Dashboard load time increases noticeably.

---

## Code Examples

### getBuyerTimeline (parallel fetch + merge, mirrors getLeadTimeline)
```typescript
// Source: pattern from app/src/lib/contact-event-queries.ts getLeadTimeline()
export async function getBuyerTimeline(buyerId: string): Promise<BuyerTimelineEntry[]> {
  const [events, interactions] = await Promise.all([
    db.select().from(buyerCommunicationEvents)
      .where(eq(buyerCommunicationEvents.buyerId, buyerId))
      .orderBy(desc(buyerCommunicationEvents.occurredAt)),
    db.select({
      id: buyerDealInteractions.id,
      dealId: buyerDealInteractions.dealId,
      status: buyerDealInteractions.status,
      address: deals.address,
      city: deals.city,
      updatedAt: buyerDealInteractions.updatedAt,
    })
      .from(buyerDealInteractions)
      .innerJoin(deals, eq(buyerDealInteractions.dealId, deals.id))
      .where(eq(buyerDealInteractions.buyerId, buyerId))
      .orderBy(desc(buyerDealInteractions.updatedAt)),
  ]);
  // merge, sort, return
}
```

### getMatchingBuyers (enhanced with area matching)
```typescript
// Extended from app/src/lib/deal-queries.ts getMatchingBuyers()
export async function getMatchingBuyersForDeal(
  dealPrice: number,
  dealCity: string
): Promise<BuyerWithMatchInfo[]> {
  const rows = await db.select().from(buyers)
    .where(
      and(
        eq(buyers.isActive, true),
        or(isNull(buyers.maxPrice), gte(buyers.maxPrice, dealPrice)),
        or(isNull(buyers.minPrice), lte(buyers.minPrice, dealPrice))
      )
    )
    .orderBy(buyers.name);

  return rows.map(r => ({
    ...r,
    matchesArea: !r.targetAreas ||
      r.targetAreas.toLowerCase().includes(dealCity.toLowerCase()),
    isFullMatch: /* price match */ true && (
      !r.targetAreas || r.targetAreas.toLowerCase().includes(dealCity.toLowerCase())
    ),
  }));
}
```

### CSV Export (established pattern from Phase 06)
```typescript
// Source: Phase 06 pattern in app/src/app/api/export/route.ts
// Buyer CSV export as <a href download> anchor
export async function GET() {
  const buyers = await getAllBuyersForExport();
  const csv = buildCsv(buyers.map(b => ({
    Name: b.name, Phone: b.phone ?? "", Email: b.email ?? "",
    "Min Price": b.minPrice ?? "", "Max Price": b.maxPrice ?? "",
    "Funding Type": b.fundingType ?? "", "Target Areas": b.targetAreas ?? "",
    "Rehab Tolerance": b.rehabTolerance ?? "", Tags: b.tags.join("; "),
    Status: b.isActive ? "Active" : "Inactive",
    "Last Contacted": b.lastContactedAt ? format(b.lastContactedAt, "yyyy-MM-dd") : "",
    "Follow-Up Date": b.followUpDate ?? "",
    Notes: b.notes ?? "",
  })));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="buyers-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
```

### Follow-Up Widget Query
```typescript
// Fast indexed query for dashboard widget
export async function getOverdueBuyerFollowups(): Promise<OverdueBuyer[]> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  return db.select({
    id: buyers.id,
    name: buyers.name,
    followUpDate: buyers.followUpDate,
  })
    .from(buyers)
    .where(
      and(
        eq(buyers.isActive, true),
        lte(buyers.followUpDate, today)  // follow_up_date <= today
      )
    )
    .orderBy(buyers.followUpDate)
    .limit(10); // cap widget at 10 items
}
```

---

## Database Schema Changes

### Migration 0009 — Buyers CRM Extension

New columns on `buyers` table:
- `follow_up_date date` — nullable
- `last_contacted_at timestamp with time zone` — nullable

New tables:
- `buyer_communication_events` — buyer timeline events (see Pattern 1)
- `buyer_deal_interactions` — buyer-deal funnel tracking (see Pattern 2)
- `buyer_tags` — free-form tags per buyer (see Pattern 3)

New indexes:
- `idx_buyers_follow_up_date` on `buyers.follow_up_date` — supports dashboard widget query
- `idx_buyer_tags_tag` on `buyer_tags.tag` — supports distinct tag list for filter dropdown

New enums:
- `buyer_comm_event_type` pgEnum
- `buyer_deal_interaction_status` pgEnum

---

## Navigation Changes

### Sidebar (`app-sidebar.tsx`)
- Change `{ label: "Buyers", href: "/deals/buyers", icon: Users }` → `href: "/buyers"`
- Active detection: `pathname.startsWith("/buyers")`

### Bottom Nav (`bottom-nav.tsx`)
- Currently has 5 items; Buyers is not in mobile nav (intentional — "Buyers accessible from desktop sidebar")
- Decision point: Phase 16 makes Buyers a first-class page. Add to bottom nav? Per context, this is **Claude's Discretion**. Recommendation: replace "Campaigns" in bottom nav with "Buyers" (Campaigns accessible from desktop sidebar; buyers is the new primary CRM).

### CommandMenu (`command-menu.tsx`)
- Update buyers href from `/deals/buyers` to `/buyers`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `buyers` as secondary tab under `/deals/buyers` | Top-level `/buyers` page | Phase 16 | Buyers become a first-class CRM entity |
| No buyer communication tracking | `buyer_communication_events` table | Phase 16 | Full timeline per buyer |
| Price-only match | Price + target area match | Phase 16 | More accurate blast targeting |
| No buyer-deal tracking | `buyer_deal_interactions` table | Phase 16 | Funnel visibility: blasted → interested → closed |
| No follow-up reminders | `follow_up_date` column + dashboard widget | Phase 16 | Buyers don't fall through the cracks |

---

## Open Questions

1. **Deal Blast Email Integration**
   - What we know: Current `DealBlastGenerator` is copy-to-clipboard only. The CONTEXT.md says blasts should auto-log to buyer history "when a deal is blasted to a buyer via Resend email."
   - What's unclear: Phase 16 scope — does it add email sending to the blast generator, or only log blasts when email is manually triggered elsewhere? The existing blast flow is manual copy-paste.
   - Recommendation: Add an optional "Email Blast" button to `DealBlastGenerator` that sends via Resend to selected buyers AND auto-logs. This is a meaningful feature addition. If scope is too large, the auto-logging can be triggered manually ("Mark as Blasted" button on the buyer card within the deal detail) rather than requiring Resend integration.

2. **Bottom Nav: Replace Campaigns with Buyers?**
   - What we know: Mobile bottom nav has 5 slots: Dashboard, Deals, Campaigns, Analytics, Map. Buyers is not in mobile nav.
   - What's unclear: Whether Buyers should displace Campaigns in mobile nav now that it's a full CRM.
   - Recommendation: Yes — swap Campaigns for Buyers in bottom nav. Buyers are used during active deals (dispositions calls). Campaigns is less time-critical on mobile.

3. **Target Areas Matching Normalization**
   - What we know: `target_areas` is free text (e.g., "Price, Helper, Wellington"). `deals.city` is also free text.
   - What's unclear: Whether city casing is consistent enough for LIKE matching to work.
   - Recommendation: Use case-insensitive ILIKE. Show a "match" vs "near match" indicator. Document that users should use consistent city names. This is sufficient for the small data scale.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read — `app/src/db/schema.ts` — existing buyers table schema, all enum/table patterns
- Direct codebase read — `app/src/lib/contact-event-queries.ts` — getLeadTimeline() parallel fetch pattern
- Direct codebase read — `app/src/lib/deal-queries.ts` — getMatchingBuyers() price-match logic
- Direct codebase read — `app/src/components/buyer-list.tsx`, `buyer-intake-form.tsx` — existing buyers UI
- Direct codebase read — `app/src/app/(dashboard)/layout.tsx`, `app-sidebar.tsx`, `bottom-nav.tsx` — navigation
- Direct codebase read — `app/drizzle/` — confirmed next migration number is 0009
- Direct codebase read — `app/package.json` — confirmed no new dependencies needed

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — established patterns from Phases 08–15 (migration numbering, action patterns, drizzle patterns)
- `.planning/phases/16-buyers-list-crm/16-CONTEXT.md` — locked decisions, scope boundaries

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new installs
- Architecture: HIGH — all patterns are direct analogues of existing code in the project
- Pitfalls: HIGH — based on direct codebase inspection (migration numbers, route locations, existing type constraints)
- CSV import/export: HIGH — pattern established in Phase 06, no new complexity

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable codebase — no fast-moving dependencies)
