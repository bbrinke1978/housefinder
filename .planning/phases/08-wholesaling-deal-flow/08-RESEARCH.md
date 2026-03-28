# Phase 8: Wholesaling Deal Flow - Research

**Researched:** 2026-03-26
**Domain:** Real estate wholesaling deal pipeline — Next.js 15, Drizzle ORM, PostgreSQL, shadcn, Tailwind CSS
**Confidence:** HIGH (all findings verified against the existing codebase, no external library guessing required)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Deal Pipeline**
- New "Deals" section in the app sidebar navigation
- Deal statuses: Lead → Qualified → Analyzed → Offered → Under Contract → Marketing → Assigned → Closing → Closed → Dead
- Each deal tracks: property address, seller name/phone, condition, timeline, motivation, asking price, ARV, repairs, MAO, offer price, buyer info, assignment fee, closing date
- Two preloaded deals: Sullivan Rd Ogden ($272k offer, $400k ARV, $45k rehab) and Delta 496 W 300 N ($205k offer, $330k ARV, $35k rehab)

**MAO Calculator**
- Formula: MAO = ARV × .70 − Repairs − Wholesale Fee
- Auto-calculates: profit, ROI, cash needed, deal score
- Inputs: ARV, rehab estimate, wholesale fee (default $15k)
- Show sensitivity analysis (what if ARV is 10% lower? Repairs 20% higher?)

**Seller Qualification (4 Pillars)**
- Condition: property repair needs
- Timeline: how soon they want to sell
- Price: what they're asking
- Motivation: why selling (inherited, financial distress, vacant, etc.)
- Hot seller indicators: needs repairs + wants quick sale + vacant/inherited/financial distress

**Buyer List Management**
- Separate buyer database: name, phone, email, buy box, price range, cash/hard money, target areas, rehab level tolerance
- Buyer intake form for adding new buyers
- Match buyers to deals by criteria

**Deal Blast System**
- When a deal is under contract, generate a "deal blast" with: address, price, ARV, repairs, pictures, assignment fee, closing date
- One-click share capability

**Contract Tracking**
- Track contract status: sent → signed → in escrow → title clear → closing scheduled
- Assignment agreement tracking
- Earnest money tracking ($100 refundable during inspection)
- Inspection period tracking (14 days default)

**Integration with Existing HouseFinder**
- "Start Deal" button on property detail page to promote a lead into the deal pipeline
- Pre-fill deal with existing property data (address, owner name, distress signals, contact info)
- Deal pipeline visible alongside existing dashboard/pipeline

### Claude's Discretion
- Database schema design for deals, buyers, contracts
- UI component architecture
- Mobile responsiveness approach
- Whether to use separate pages or tabs within existing structure

### Deferred Ideas (OUT OF SCOPE)
- Hard money calculator
- Partner split model
- Rehab budget template with line items
- CRM automation
- Virtual assistant integration
- Deal blast email/SMS automation (manual share first)
</user_constraints>

---

## Summary

Phase 8 adds a full wholesaling deal pipeline to HouseFinder. This is a pure application-layer feature — no new scraping, no external APIs, no new npm packages needed. The existing stack (Next.js 15, Drizzle ORM, PostgreSQL, shadcn, @hello-pangea/dnd, Tailwind CSS) already has every capability required. The work is entirely schema additions, new server actions, new queries, new pages, and new components following patterns already established in the codebase.

The existing pipeline page with `@hello-pangea/dnd` kanban provides the deal pipeline UI pattern. The tabbed property detail page provides the deal detail UI pattern. The `contact-tab.tsx` pattern provides the buyer management UI pattern. The actions.ts server action pattern (auth check → zod parse → DB operation → revalidatePath) is the standard for all mutations. The schema uses `pgEnum` for status values and UUID primary keys throughout.

The key architectural decision at Claude's discretion: deals live in a separate `/deals` section with their own pages, not embedded into existing property detail tabs. This keeps the wholesaling workflow cleanly separated from the lead-finding workflow while allowing a "Start Deal" entry point from property detail. The deals table links to properties via optional foreign key (nullable — a deal may not originate from a scraped property; it can be entered manually).

**Primary recommendation:** Build deals as a standalone section (`/deals`) with a kanban pipeline, individual deal detail pages with tabs, a buyer list at `/deals/buyers`, and a "Start Deal" button on property detail. Use the exact same patterns as pipeline/property detail. Schema first, then actions, then queries, then pages/components.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.13 | App framework, routing, server actions | Already in use |
| drizzle-orm | ^0.45.1 | Type-safe ORM, schema definition, migrations | Already in use |
| pg | ^8.20.0 | PostgreSQL driver | Already in use |
| zod | ^4.3.6 | Server action input validation | Already in use |
| @hello-pangea/dnd | ^18.0.1 | Drag-and-drop kanban for deal pipeline | Already in use (lead-kanban.tsx) |
| shadcn (v4) | ^4.0.8 | UI component library | Already in use |
| lucide-react | ^0.577.0 | Icons | Already in use |
| tailwindcss | ^4 | Styling | Already in use |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date formatting, deadline calculations | Closing date display, days-until-closing |
| next-auth | ^5.0.0-beta.30 | Auth session check in server actions | All server actions require auth() check |
| class-variance-authority | ^0.7.1 | Component variant styling | Status badge colors |

**Installation:** No new packages required. All dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure

```
app/src/
├── app/(dashboard)/
│   ├── deals/
│   │   ├── page.tsx               # Deal pipeline (kanban/list)
│   │   ├── [id]/
│   │   │   └── page.tsx           # Deal detail (tabbed)
│   │   └── buyers/
│   │       └── page.tsx           # Buyer list + intake form
├── components/
│   ├── deal-kanban.tsx             # Kanban view (mirrors lead-kanban.tsx)
│   ├── deal-list.tsx               # List view (mirrors lead-list.tsx)
│   ├── deal-card.tsx               # Card in kanban column
│   ├── deal-overview.tsx           # Overview tab in deal detail
│   ├── deal-mao-calculator.tsx     # MAO calculator tab (client component)
│   ├── deal-contract-tracker.tsx   # Contract tracking tab
│   ├── deal-blast-generator.tsx    # Deal blast generation + copy
│   ├── buyer-list.tsx              # Buyer list with match indicators
│   └── buyer-intake-form.tsx       # Add/edit buyer form
├── db/
│   └── schema.ts                   # Add deals, buyers, deal_notes tables
└── lib/
    ├── queries.ts                   # Add getDeals, getDeal, getBuyers, etc.
    └── actions.ts                   # Add deal/buyer server actions
```

### Pattern 1: Schema Design — Deals Table

**What:** New `deals` table with optional `propertyId` FK (nullable — manual deals don't need a scraped property), status as `text` (not pgEnum — 10 statuses is too many to enumerate; use a const array for validation instead), all financial fields as `integer` (cents avoided — dollars are fine at this scale).

**When to use:** Follow existing schema conventions: UUID PKs, `withTimezone: true` timestamps, Drizzle `pgTable`.

**Example:**
```typescript
// Source: existing schema.ts patterns in this codebase
import { pgTable, uuid, text, integer, boolean, timestamp, date, index } from "drizzle-orm/pg-core";

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Optional link to scraped property — null for manually entered deals
    propertyId: uuid("property_id").references(() => properties.id),
    // Address stored directly (may differ from property.address after research)
    address: text("address").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull().default("UT"),

    // Seller info
    sellerName: text("seller_name"),
    sellerPhone: text("seller_phone"),
    condition: text("condition"),          // "light", "medium", "heavy", "tear_down"
    timeline: text("timeline"),            // "asap", "1_month", "3_months", "flexible"
    motivation: text("motivation"),        // "inherited", "financial_distress", "vacant", "divorce", "other"
    askingPrice: integer("asking_price"),  // dollars

    // Financials
    arv: integer("arv"),
    repairEstimate: integer("repair_estimate"),
    wholesaleFee: integer("wholesale_fee").default(15000),
    mao: integer("mao"),                   // computed: arv * 0.70 - repairs - fee
    offerPrice: integer("offer_price"),

    // Deal status
    status: text("status").notNull().default("lead"),
    // Values: lead | qualified | analyzed | offered | under_contract | marketing | assigned | closing | closed | dead

    // Buyer assignment
    assignedBuyerId: uuid("assigned_buyer_id").references(() => buyers.id),
    assignmentFee: integer("assignment_fee"),
    closingDate: date("closing_date"),

    // Contract tracking
    contractStatus: text("contract_status"),
    // Values: null | sent | signed | in_escrow | title_clear | closing_scheduled
    earnestMoney: integer("earnest_money").default(100),
    inspectionDeadline: date("inspection_deadline"),
    earnestMoneyRefundable: boolean("earnest_money_refundable").default(true),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_deals_status").on(table.status),
    index("idx_deals_property_id").on(table.propertyId),
  ]
);

export const buyers = pgTable(
  "buyers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    buyBox: text("buy_box"),              // free text description of criteria
    minPrice: integer("min_price"),
    maxPrice: integer("max_price"),
    fundingType: text("funding_type"),    // "cash" | "hard_money" | "both"
    targetAreas: text("target_areas"),   // comma-separated cities or free text
    rehabTolerance: text("rehab_tolerance"), // "light" | "medium" | "heavy" | "any"
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export const dealNotes = pgTable(
  "deal_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id").notNull().references(() => deals.id),
    noteText: text("note_text").notNull(),
    noteType: text("note_type").notNull().default("user"), // "user" | "status_change"
    previousStatus: text("previous_status"),
    newStatus: text("new_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_deal_notes_deal_id").on(table.dealId)]
);
```

### Pattern 2: Drizzle Migration

**What:** All schema changes go through `drizzle-kit generate` + migration applied on deployment. The project does NOT run migrations locally (per STATE.md decision [02-01]).

**When to use:** After schema.ts additions are complete, run `drizzle-kit generate` to produce the migration SQL, then apply via deploy pipeline.

**Example:**
```bash
# Generate migration (run from app/ directory)
npx drizzle-kit generate

# Migration applied to Azure PostgreSQL on deploy (existing CI/CD handles this)
npx drizzle-kit migrate
```

### Pattern 3: Server Actions for Deal Mutations

**What:** All deal mutations follow the exact `actions.ts` pattern: `"use server"`, auth check, zod parse, DB operation, `revalidatePath`.

**When to use:** Every write operation from the UI.

**Example:**
```typescript
// Source: existing actions.ts pattern in this codebase
"use server";

import { db } from "@/db/client";
import { deals, dealNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const VALID_DEAL_STATUSES = [
  "lead", "qualified", "analyzed", "offered", "under_contract",
  "marketing", "assigned", "closing", "closed", "dead"
] as const;
export type DealStatus = typeof VALID_DEAL_STATUSES[number];

const updateDealStatusSchema = z.object({
  dealId: z.uuid(),
  status: z.enum(VALID_DEAL_STATUSES),
  note: z.string().optional(),
});

export async function updateDealStatus(
  dealId: string,
  status: string,
  note?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = updateDealStatusSchema.parse({ dealId, status, note });

  const [existing] = await db
    .select({ status: deals.status })
    .from(deals)
    .where(eq(deals.id, parsed.dealId))
    .limit(1);

  if (!existing) throw new Error("Deal not found");

  await db.update(deals)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(deals.id, parsed.dealId));

  if (existing.status !== parsed.status) {
    await db.insert(dealNotes).values({
      dealId: parsed.dealId,
      noteText: `Status changed from ${existing.status} to ${parsed.status}`,
      noteType: "status_change",
      previousStatus: existing.status,
      newStatus: parsed.status,
    });
  }

  if (parsed.note?.trim()) {
    await db.insert(dealNotes).values({
      dealId: parsed.dealId,
      noteText: parsed.note.trim(),
      noteType: "user",
    });
  }

  revalidatePath("/deals");
}
```

### Pattern 4: Deal Pipeline Kanban (mirrors lead-kanban.tsx exactly)

**What:** `deal-kanban.tsx` uses `@hello-pangea/dnd` with `DragDropContext`, `Droppable`, `Draggable`. Status columns defined as a const array. Optimistic update on drag. Calls `updateDealStatus` server action after drop.

**When to use:** The `/deals` page default view.

**Key difference from lead-kanban:** 10 status columns instead of 5. On mobile, horizontal scroll will be needed — the kanban container needs `overflow-x-auto` since 10 columns won't fit on a phone screen without scrolling.

**Example:**
```typescript
// Source: lead-kanban.tsx pattern — adapt for deal statuses
const DEAL_STATUS_COLUMNS: { key: DealStatus; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "bg-slate-50 dark:bg-slate-900/50" },
  { key: "qualified", label: "Qualified", color: "bg-blue-50 dark:bg-blue-900/20" },
  { key: "analyzed", label: "Analyzed", color: "bg-indigo-50 dark:bg-indigo-900/20" },
  { key: "offered", label: "Offered", color: "bg-yellow-50 dark:bg-yellow-900/20" },
  { key: "under_contract", label: "Under Contract", color: "bg-orange-50 dark:bg-orange-900/20" },
  { key: "marketing", label: "Marketing", color: "bg-purple-50 dark:bg-purple-900/20" },
  { key: "assigned", label: "Assigned", color: "bg-teal-50 dark:bg-teal-900/20" },
  { key: "closing", label: "Closing", color: "bg-emerald-50 dark:bg-emerald-900/20" },
  { key: "closed", label: "Closed", color: "bg-green-50 dark:bg-green-900/20" },
  { key: "dead", label: "Dead", color: "bg-gray-50 dark:bg-gray-900/50" },
];
```

### Pattern 5: MAO Calculator (pure client-side computation)

**What:** The MAO formula is pure math — no server round-trip needed. Calculate reactively in the component using `useState` and derived values. Store final values in DB via server action when user saves.

**Formula:**
```
MAO = (ARV × 0.70) - Repairs - WholesaleFee
Profit = MAO - OfferPrice   [if offer < MAO, profit = MAO - OfferPrice; actually: AssignmentFee = OfferPrice - seller_price or clarify with Brian]
```

**Sensitivity analysis (derived inline):**
```typescript
// Source: direct formula derivation — no library needed
const mao = Math.round(arv * 0.70 - repairs - wholesaleFee);
const arvDown10 = Math.round(arv * 0.90 * 0.70 - repairs - wholesaleFee);
const repairsUp20 = Math.round(arv * 0.70 - repairs * 1.20 - wholesaleFee);
const profit = mao - offerPrice;   // what's left after seller gets offerPrice
const roi = arv > 0 ? Math.round((profit / arv) * 100) : 0;
```

**Note on profit/ROI semantics for wholesaling:** In wholesale:
- Seller gets `offerPrice`
- Wholesaler assigns contract to end buyer for `offerPrice + assignmentFee`
- End buyer pays `offerPrice + assignmentFee` and does the rehab
- Wholesaler's profit = `assignmentFee`
- ROI for end buyer = `(ARV - (offerPrice + assignmentFee + repairs)) / (offerPrice + assignmentFee + repairs)`

The CONTEXT.md shows profit ~$43k for Sullivan (ARV $400k, offer $272k, rehab $45k) — that's `MAO ($235k) - but offer is $272k... hmm`. Actually the profit shown is likely `ARV - offer - rehab - holding costs - fees = $400k - $272k - $45k - ~$40k = ~$43k` — this is the **end buyer's profit**. The **assignment fee** (wholesaler's cut) is separate. The calculator should show both: what the end buyer nets AND what the wholesaler's assignment fee is.

### Pattern 6: "Start Deal" Integration from Property Detail

**What:** A button on the property detail page's Overview tab that navigates to a new deal creation form pre-filled with property data. Uses URL search params to pass the propertyId.

**When to use:** User finds a hot lead and wants to move it into the wholesaling pipeline.

**Example:**
```typescript
// In property-overview.tsx (or a new button component)
<Link
  href={`/deals/new?propertyId=${property.id}`}
  className="btn-brand inline-flex items-center gap-2"
>
  <Briefcase className="h-4 w-4" />
  Start Deal
</Link>

// In /deals/new/page.tsx — server component reads propertyId, pre-fills form
export default async function NewDealPage({ searchParams }) {
  const { propertyId } = await searchParams;
  let prefill = null;
  if (propertyId) {
    prefill = await getPropertyDetail(propertyId);
  }
  return <NewDealForm prefill={prefill} />;
}
```

### Pattern 7: Deal Blast Generation (client-side copy)

**What:** A client component that renders the deal blast as formatted text and offers a "Copy to Clipboard" button. The `navigator.clipboard.writeText()` API is sufficient — no library needed. No email/SMS sending (deferred).

**Example:**
```typescript
// Source: Web API — no library needed
async function handleCopy() {
  const blastText = generateBlastText(deal);
  await navigator.clipboard.writeText(blastText);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}

function generateBlastText(deal: Deal): string {
  return `
🏠 DEAL AVAILABLE — Cash Buyers Only

Address: ${deal.address}, ${deal.city}, UT
Asking: $${deal.offerPrice?.toLocaleString()}
ARV: $${deal.arv?.toLocaleString()}
Repairs: $${deal.repairEstimate?.toLocaleString()}
Assignment Fee: $${deal.assignmentFee?.toLocaleString()}
Closing: ${deal.closingDate ?? 'TBD'}

Contact to access property.
  `.trim();
}
```

### Anti-Patterns to Avoid

- **Don't use pgEnum for deal status:** 10 statuses is unwieldy in Postgres enum. Use `text` + zod enum validation in server actions. Existing schema uses `text` for `leads.status` for the same reason.
- **Don't add DB round-trips for MAO calculation:** It's pure arithmetic. Compute in the client component, only write to DB on save.
- **Don't create a separate layout for /deals:** Reuse the existing `(dashboard)/layout.tsx` — just add "Deals" to the sidebar nav items.
- **Don't use a separate `deal_status` enum table:** The status is controlled via zod enum in TypeScript — simpler, consistent with existing patterns.
- **Don't make `propertyId` required on deals:** Manual deals (not from scraped properties) must be possible. FK must be nullable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Kanban drag-and-drop | Custom HTML5 drag | `@hello-pangea/dnd` (already installed) | Already used in lead-kanban.tsx, tested patterns |
| Form validation | Custom validation | `zod/v4` (already installed) | Consistent with existing actions.ts |
| Date display/formatting | Custom date util | `date-fns` (already installed) | Already in codebase |
| Copy to clipboard | Custom textarea hack | `navigator.clipboard.writeText()` | Native browser API, no library needed |
| Status badge colors | Runtime color map | Tailwind static class map + CVA | Purging-safe, consistent with existing patterns |
| DB schema type safety | Manual type casting | Drizzle's inferred types | Eliminates as unknown as X casts |

**Key insight:** Every capability needed for Phase 8 is already installed. The risk is adding unnecessary dependencies rather than missing ones.

---

## Common Pitfalls

### Pitfall 1: Drizzle Relations vs. Direct Queries

**What goes wrong:** Defining Drizzle `relations()` for deals→buyers→properties and then not using them, or using them inconsistently with direct `.select()` calls.
**Why it happens:** The existing codebase uses ONLY direct `.select().from().innerJoin()` queries — no Drizzle relations API at all.
**How to avoid:** Do NOT use `drizzle-orm/pg-core` `relations()`. Follow the existing query pattern: explicit joins in `queries.ts`. This is consistent with all existing queries.
**Warning signs:** Any `import { relations }` in schema.ts is a deviation from the established pattern.

### Pitfall 2: Forgetting `revalidatePath` After Mutations

**What goes wrong:** Server action updates DB but UI doesn't refresh.
**Why it happens:** Next.js 15 caches server component data aggressively. Without `revalidatePath`, the page shows stale data.
**How to avoid:** Every server action that writes to deals/buyers must call `revalidatePath("/deals")` and `revalidatePath(`/deals/${dealId}`)` where applicable.
**Warning signs:** UI not updating after status change or form submission.

### Pitfall 3: shadcn v4 `render` Prop Pattern

**What goes wrong:** Using `asChild` on shadcn components (which was v3 API).
**Why it happens:** shadcn v4 changed from `asChild` to `render` prop for composition. Per STATE.md decision [02-01].
**How to avoid:** Use `render={<Link href="..." />}` not `asChild`. See existing `app-sidebar.tsx` for the correct pattern.
**Warning signs:** TypeScript error "Property 'asChild' does not exist" or runtime warnings.

### Pitfall 4: 10-Column Kanban on Mobile

**What goes wrong:** The deal kanban with 10 columns overflows on mobile screens, breaking layout.
**Why it happens:** @hello-pangea/dnd requires the scroll container to be the kanban wrapper, not the page.
**How to avoid:** Wrap the kanban columns in a `div` with `overflow-x-auto` and set minimum column width (e.g., `min-w-[180px]`). On mobile, users scroll horizontally through columns.
**Warning signs:** Columns collapse or overflow outside viewport on iPhone-sized screens.

### Pitfall 5: Nullable FK Cascade on Property Delete

**What goes wrong:** Deleting a property cascades to the deal if the FK has `onDelete: "cascade"`.
**Why it happens:** Deals should survive even if the source property is deleted (or never existed).
**How to avoid:** Do NOT add `onDelete: "cascade"` or `onDelete: "restrict"` on `deals.propertyId`. Default behavior (no action) is correct — the deal persists with a dangling nullable FK. Handle nulls in queries.
**Warning signs:** Deals disappearing when properties are cleaned up.

### Pitfall 6: Preloaded Deals Migration

**What goes wrong:** Trying to INSERT preloaded deals without knowing the property UUIDs in advance.
**Why it happens:** Sullivan Rd and Delta deals reference real properties that may or may not exist in the scraped database yet.
**How to avoid:** Preload deals as standalone deals (propertyId = null) via a seed script or manual INSERT. The "Start Deal" integration can link them to a scraped property later if found. Include seed data as a standalone SQL migration or a `seed-deals.ts` script run once.
**Warning signs:** Foreign key violation on INSERT if property UUID doesn't exist.

### Pitfall 7: MAO Profit Semantics

**What goes wrong:** Displaying "profit" to mean the wholesaler's profit when the calculator actually computes the end-buyer's profit.
**Why it happens:** The formula `ARV × 0.70 - repairs - fee` computes what the end buyer should pay MAX (MAO). The wholesaler's profit is the assignment fee, not the spread.
**How to avoid:** Label clearly:
- "MAO" = what you (wholesaler) pay seller MAX to make the deal work for end buyer
- "Assignment Fee" = your profit as wholesaler
- "End Buyer Profit" = what the buyer nets after buying at your price + doing rehab
**Warning signs:** ROI numbers that don't match Brian's mental model from CONTEXT.md (Sullivan showing ~12% ROI on $400k ARV).

---

## Code Examples

### Query: Get All Deals with Optional Buyer Join

```typescript
// Source: existing queries.ts join patterns in this codebase
export async function getDeals(): Promise<DealWithBuyer[]> {
  const rows = await db
    .select({
      id: deals.id,
      propertyId: deals.propertyId,
      address: deals.address,
      city: deals.city,
      sellerName: deals.sellerName,
      status: deals.status,
      arv: deals.arv,
      offerPrice: deals.offerPrice,
      mao: deals.mao,
      repairEstimate: deals.repairEstimate,
      assignmentFee: deals.assignmentFee,
      closingDate: deals.closingDate,
      buyerName: buyers.name,
      buyerId: buyers.id,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .leftJoin(buyers, eq(deals.assignedBuyerId, buyers.id))
    .orderBy(desc(deals.updatedAt));

  return rows as DealWithBuyer[];
}
```

### Query: Buyer Match for a Deal

```typescript
// Simple price-range match — no complex scoring needed
export async function getMatchingBuyers(dealPrice: number): Promise<Buyer[]> {
  const rows = await db
    .select()
    .from(buyers)
    .where(
      and(
        eq(buyers.isActive, true),
        sql`(${buyers.maxPrice} IS NULL OR ${buyers.maxPrice} >= ${dealPrice})`,
        sql`(${buyers.minPrice} IS NULL OR ${buyers.minPrice} <= ${dealPrice})`
      )
    )
    .orderBy(asc(buyers.name));
  return rows;
}
```

### Action: Create Deal from Property (Start Deal)

```typescript
// Source: actions.ts createDeal pattern
const createDealSchema = z.object({
  propertyId: z.uuid().optional(),
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(100),
  sellerName: z.string().optional(),
  sellerPhone: z.string().optional(),
  arv: z.number().int().min(0).optional(),
  repairEstimate: z.number().int().min(0).optional(),
});

export async function createDeal(input: unknown): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = createDealSchema.parse(input);

  const [deal] = await db.insert(deals).values({
    ...parsed,
    status: "lead",
    wholesaleFee: 15000, // default
  }).returning({ id: deals.id });

  revalidatePath("/deals");
  return { id: deal.id };
}
```

### Navigation: Add Deals to Sidebar

```typescript
// Source: app-sidebar.tsx navItems array — add one entry
import { Briefcase } from "lucide-react"; // or another relevant icon

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Map", href: "/map", icon: MapPin },
  { label: "Pipeline", href: "/pipeline", icon: KanbanSquare },
  { label: "Deals", href: "/deals", icon: Briefcase },  // ADD THIS
  { label: "Settings", href: "/settings", icon: Settings },
];
// Also update bottom-nav.tsx — but note: mobile nav currently has 4 items fitting well.
// With 5 items, bottom nav becomes slightly cramped on small phones. Consider omitting
// Settings from mobile bottom nav and keeping Deals, or accept 5-item layout.
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| pgEnum for status fields | text + zod enum validation | Existing pattern in leads.status — follow it |
| asChild composition (shadcn v3) | render prop (shadcn v4) | Critical: don't use asChild anywhere |
| Drizzle relations() API | Direct joins in queries | Existing pattern — don't deviate |
| next/dynamic for client components | Standard "use client" | Map uses dynamic for SSR avoidance; deal components don't need it |

**Deprecated/outdated in this codebase:**
- `asChild`: replaced by `render` prop in shadcn v4 (see STATE.md [02-01])
- `@types/pdf-parse`: removed (see STATE.md [Phase 04-01])
- `zod` v3 import paths: this codebase uses `zod/v4` (note the import in actions.ts: `import { z } from "zod/v4"`)

---

## Schema Design Decision: Two New Tables vs. Three

**Option A: `deals` + `buyers` + `deal_notes` (recommended)**
- `deals` — core deal record with all financial fields inline
- `buyers` — separate buyer database (reusable across many deals)
- `deal_notes` — mirrors `lead_notes` pattern, tracks status changes + user notes

**Option B: `deals` + `buyers` + `deal_notes` + `contracts` (NOT recommended)**
- Separate `contracts` table for contract tracking
- Over-engineering: contract fields fit cleanly in the `deals` table itself (`contractStatus`, `earnestMoney`, `inspectionDeadline`, `earnestMoneyRefundable`)
- No value in normalizing until contract data becomes complex (deferred rehab templates, partner splits are all out of scope)

**Verdict:** Option A. Contract tracking fields live directly in `deals`. This matches the existing codebase's preference for wide tables over joins (e.g., `leads` table has all lead-related fields inline).

---

## Open Questions

1. **Mobile bottom nav with 5 items**
   - What we know: Current bottom nav has 4 items (Dashboard, Map, Pipeline, Settings) — fits cleanly
   - What's unclear: Whether Brian wants Settings or Pipeline bumped off mobile nav to make room for Deals
   - Recommendation: Keep all 5 in bottom nav and reduce padding/font slightly. If cramped, remove Settings (least-used) from bottom nav and keep it sidebar-only on mobile.

2. **Preloaded Deal Values — End Buyer vs. Wholesaler ROI**
   - What we know: Sullivan ROI shown as ~12%, Delta ~20% in CONTEXT.md
   - What's unclear: Whether these are Brian's (wholesaler) ROI or end buyer ROI
   - Calculation check: Sullivan — ARV $400k, offer $272k, rehab $45k. End buyer pays $272k + assignment fee + does $45k rehab. If assignment fee $15k, end buyer all-in $332k, nets $68k from $400k ARV = 20.5% ROI. If ROI 12% matches the Delta deal better... Delta: ARV $330k, offer $205k, rehab $35k. All-in $255k, nets $75k = 29% — that's higher not 20%.
   - The 12% and 20% figures likely represent the **wholesaler's ROI on capital deployed** (earnest money + time) which is not the standard formula.
   - Recommendation: Show both "End Buyer Profit" and "Your Assignment Fee" clearly labeled. Let Brian verify the displayed numbers match his mental model and adjust labels accordingly.

3. **Deal Blast "Pictures" Field**
   - What we know: CONTEXT.md says deal blast includes "pictures"
   - What's unclear: Whether to build image upload or just a URL field
   - Recommendation: Use a plain text field for "photo URL or Google Drive link" — no S3/Azure Blob upload for MVP. Image hosting is deferred complexity.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `app/src/db/schema.ts` — schema patterns, UUID PKs, pgEnum usage
- Existing codebase: `app/src/lib/actions.ts` — server action patterns, zod validation, revalidatePath
- Existing codebase: `app/src/lib/queries.ts` — query patterns, join style, no relations API
- Existing codebase: `app/src/components/lead-kanban.tsx` — @hello-pangea/dnd patterns
- Existing codebase: `app/src/components/contact-tab.tsx` — card + form component pattern
- Existing codebase: `app/src/app/(dashboard)/properties/[id]/page.tsx` — tabbed detail pattern
- Existing codebase: `app/src/components/app-sidebar.tsx` + `bottom-nav.tsx` — navigation patterns
- Existing codebase: `app/package.json` — exact dependency versions

### Secondary (MEDIUM confidence)
- STATE.md decisions log — confirmed shadcn v4 render prop, zod/v4 import, no Drizzle relations
- CONTEXT.md — locked decisions, deferred items, preloaded deal data

### Tertiary (LOW confidence — needs validation at implementation)
- MAO profit/ROI semantics: interpretation of CONTEXT.md numbers (Brian should verify labels match expectations)
- Mobile bottom nav with 5 items: untested — visual check needed after implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in package.json, versions confirmed
- Architecture: HIGH — follows established codebase patterns exactly; no new patterns invented
- Schema design: HIGH — follows existing pgTable conventions; decisions well-reasoned
- MAO calculator: HIGH — pure arithmetic, well-defined formula
- Pitfalls: HIGH — most identified from direct codebase analysis (shadcn v4, revalidatePath, drizzle patterns)
- Profit/ROI semantics: LOW — needs Brian validation at implementation time

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable — all findings from codebase, not external sources)
