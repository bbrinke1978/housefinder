# Research: Phase 9 — Admin Budgeting & Cost Analysis

**Researched:** 2026-03-26
**Phase:** 09-admin-budgeting-cost-analysis
**Overall Confidence:** MEDIUM-HIGH (core patterns are well-established; OCR trade-offs verified from multiple sources)

---

## 1. How the Best Rehab Budget Trackers Work

### What the Category Leaders Do (FlipperForce, Rehab Valuator, House Flipping Spreadsheet)

The dominant real estate rehab budget tools share a consistent feature set:

**Core tracking model:**
- A "baseline budget" is locked in at deal analysis time (matches HouseFinder's `repair_estimate` field)
- Actual expenses are entered against that baseline — the gap is the variance
- Categories are the primary organizing unit (not vendors or dates)
- One receipt can span multiple categories (e.g., Home Depot run for plumbing AND framing)

**What investors actually care about (in priority order):**
1. Budget vs. actual variance per category — "am I over on plumbing?"
2. Projected final profit given current spending trajectory
3. Running total spent vs. total budget (one number, always visible)
4. Vendor totals for contractor 1099 reporting at year-end
5. Digital receipt vault — proof of expenses for lenders and partners

**FlipperForce's key differentiator:** AI Receipt Analyzer that extracts vendor, date, amount, and line items and categorizes automatically — then one-click confirmation syncs to the budget. This is the GOLD STANDARD user flow to replicate.

### Standard Rehab Budget Categories

The industry consensus (BiggerPockets, FortuneBuilders, real estate skills guides) uses these categories:

```
Demo / Site Prep
Foundation / Structural
Framing / Carpentry
Roofing
Exterior / Siding
Windows / Doors
Plumbing
Electrical
HVAC
Insulation
Drywall
Flooring
Paint / Drywall Finish
Kitchen (cabinets, counters, appliances)
Bathrooms
Interior Trim / Finishes
Landscaping / Curb Appeal
Permits / Inspections / Fees
Contingency (15-20% of total is industry standard)
Miscellaneous
```

The CONTEXT.md list is close but missing: Demo, Exterior/Siding, Windows/Doors, Insulation, Contingency. Add these — they come up on every real job site.

### Contingency Fund as a First-Class Category
Industry standard is 15-20% contingency on top of the line item budget. Track this as a separate category so it's visible whether Brian is eating into it. When contingency hits zero, that's a critical alert.

---

## 2. Receipt OCR: Technology Decision

### Options Evaluated

| Option | Cost | Accuracy | Receipt-Specific | Complexity |
|--------|------|----------|-----------------|------------|
| Tesseract.js | Free | ~70-85% on clean images, worse on phone photos | No — generic OCR | Medium (client-side WASM, 30MB+ download) |
| Azure Document Intelligence (prebuilt receipt model) | Free tier: 500 pages/month; $10/1,000 pages beyond | 95-99% on receipts | YES — extracts vendor, total, line items, date as structured JSON | Low (REST API call) |
| Google Cloud Vision | $1.50/1,000 pages | ~95% on clean docs | No — generic OCR | Medium (different cloud) |
| Azure Computer Vision (Read API) | Free tier: 5,000/month; $1.50/1,000 beyond | ~98% typed text | No — generic OCR, not receipt-aware | Low |

### Recommendation: Azure Document Intelligence — Free Tier Is Plenty

**Why Azure Document Intelligence wins:**

1. **Receipt-aware model**: Returns structured JSON with `MerchantName`, `TransactionDate`, `Total`, `Subtotal`, `Tax`, and line items — not raw text that Brian has to parse. This is the difference between "auto-fill the form" and "here's a wall of text."

2. **Free tier covers real usage**: 500 pages/month free. Brian is buying maybe 5-20 properties a year with receipts per project. Even a busy project with 50 receipts is 50 pages. He won't exceed the free tier for years.

3. **Already on Azure**: No new accounts, billing, or credentials. Use the same `rg-housefinder` resource group. Deploy via Azure Portal in 5 minutes.

4. **WASM bundle size avoided**: Tesseract.js ships a 30MB+ WASM binary. On a mobile connection at a job site, that's a painful first load. Azure Document Intelligence is a lightweight REST API call — the image is uploaded, the structured response comes back.

5. **Handles crumpled/tilted receipts**: Phone photos of receipts are never flat and well-lit. Azure's model handles real-world image quality far better than Tesseract.

**Tesseract.js is NOT recommended for this use case.** Accuracy degrades significantly on phone photos of paper receipts (uneven lighting, shadows, crinkled paper). The 30MB bundle hurts mobile UX. It would produce garbage output and frustrate Brian.

### Azure Document Intelligence Setup
- Service: `Azure AI Document Intelligence` (previously Form Recognizer)
- Model: `prebuilt-receipt`
- Endpoint: `https://{resource-name}.cognitiveservices.azure.com/`
- SDK: `@azure/ai-form-recognizer` (npm)
- Auth: API key stored in env var `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- Invocation: Server action (never client-side — keeps API key secret)

**Structured output from prebuilt-receipt model:**
```json
{
  "MerchantName": "Home Depot",
  "TransactionDate": "2025-11-12",
  "Total": 847.23,
  "Subtotal": 780.00,
  "TotalTax": 67.23,
  "Items": [
    { "Description": "2x4x8 Stud", "Quantity": 40, "UnitPrice": 5.98, "TotalPrice": 239.20 },
    { "Description": "Drywall 4x8", "Quantity": 12, "UnitPrice": 15.47, "TotalPrice": 185.64 }
  ]
}
```

This maps directly to the expense form — vendor pre-fills, amount pre-fills, date pre-fills. Brian just selects category and hits Save.

**Confidence:** HIGH (verified from Azure official pricing and docs pages)

---

## 3. Image Storage: Azure Blob Storage

### Options Evaluated

| Option | Cost | Complexity | Notes |
|--------|------|------------|-------|
| Azure Blob Storage | ~$0.02/GB/month + egress | Low — already in resource group | Best fit |
| Cloudinary | Free tier: 25GB, 25K transforms/month | Medium — separate account | Overkill, extra cost risk |
| Base64 in PostgreSQL DB | $0 extra, but bloats DB | None | Bad — kills query performance |

### Recommendation: Azure Blob Storage

Brian is already on Azure. The storage account is in `rg-housefinder`. Receipt images are typically 500KB–2MB JPEG. Even 1,000 receipts over years would be ~1-2GB — pennies per month.

**Upload pattern for Next.js server action:**
```
1. User selects/captures photo on mobile
2. FormData submitted to Next.js server action
3. Server action:
   a. Uploads image to Azure Blob Storage (private container)
   b. Stores blob URL in receipts table
   c. Optionally triggers Azure Document Intelligence OCR on the same blob URL
   d. Returns OCR results to pre-fill expense form
4. User confirms/corrects form fields
5. Server action saves expense + receipt record to DB
```

**Security pattern:** Private blob container + SAS token for display. Don't make the container public. Generate short-lived SAS URLs for rendering receipt images in the UI.

**Package needed:** `@azure/storage-blob` (not yet in package.json)

**Confidence:** HIGH (well-documented pattern from Microsoft Learn)

---

## 4. Mobile Camera Integration

### Recommendation: Native HTML `<input type="file" accept="image/*" capture="environment">`

No extra library needed. This is the right choice for this app.

**Why:**
- Zero bundle cost
- Works on all modern iOS and Android browsers
- `capture="environment"` opens rear camera directly (correct for receipt scanning)
- Integrates naturally with Next.js `<form>` and server actions
- Fallback to file picker on desktop

**Implementation:**
```html
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleReceiptCapture}
  className="hidden"
  ref={fileInputRef}
/>
<Button onClick={() => fileInputRef.current?.click()}>
  Scan Receipt
</Button>
```

**react-camera-pro is NOT recommended.** It uses `getUserMedia()` which requires HTTPS and shows a live viewfinder — appropriate for video surveillance or document scanning apps, not receipt capture. The native file input gives a better mobile UX (uses the native camera app the user already knows) with no added complexity.

**One limitation:** iOS Safari and some Android browsers only allow single-file selection per input invocation. For multi-receipt capture (scanning an entire invoice stack), the user taps "Scan Receipt" multiple times. This is fine for this use case — each receipt becomes a separate expense record.

**Confidence:** HIGH (MDN documentation confirmed, industry standard pattern)

---

## 5. Budget Visualization

### What to Build with Recharts (already installed)

**Recharts is the right choice** — already in the project, already proven in Phase 6 analytics. No new dependencies needed.

#### Chart 1: Category Progress Bars (Most Important)
Not technically a "chart" — these are plain HTML/Tailwind progress bars, one per category. This is more readable and actionable than any chart for construction budget tracking.

```
Demo         [████████░░░░░░░░] $4,200 / $5,000  (84% — YELLOW)
Plumbing     [████████████████] $8,100 / $7,500  (108% — RED, OVER BUDGET)
Flooring     [█████░░░░░░░░░░░] $2,500 / $8,000  (31% — GREEN)
```

Color logic:
- 0-79%: green (bg-green-500)
- 80-99%: yellow (bg-yellow-500)
- 100%+: red (bg-red-500)

Use the shadcn `Progress` component with dynamic Tailwind class injection. shadcn's Progress supports color overrides via `[&>*]:bg-{color}-500` pattern.

#### Chart 2: Pie Chart — Spending by Category
Use Recharts `PieChart` with `Cell` components for color-coding. Shows where money is going at a glance. Use the same recharts pattern from Phase 6 analytics (already proven working with React 19 fix in place).

#### Chart 3: Grouped Bar Chart — Planned vs. Actual per Category
Use Recharts `BarChart` with two `Bar` components (planned in gray, actual in blue/red). The horizontal layout (layout="vertical") works better when category names are long — same pattern used in Phase 6 attribution chart.

#### Dashboard Header: Budget Health KPIs
Simple numbers at the top, not charts:
```
Total Budget: $85,000 | Spent: $52,300 | Remaining: $32,700 | % Used: 61.5%
```

#### Alert Indicators
- At 80%: Yellow banner "Approaching budget — $X remaining"
- At 100%+: Red banner "OVER BUDGET by $X — review expenses"

These alerts live on both the budget page AND the deal detail page (so Brian sees the warning even if he's just checking deal status).

**Confidence:** HIGH (Recharts patterns already proven in Phase 6, shadcn progress customization confirmed from community discussion)

---

## 6. Database Schema

### Design Principles
- Integer cents for all money (avoids Drizzle `numeric`→string inference bug, consistent with existing schema which uses `integer` for `repair_estimate`, `mao`, `arv`)
- Budget lives under a Deal (one-to-one: one deal has one budget)
- Categories are rows (flexible, user can add custom ones) not JSONB
- Receipts are separate from expenses — one receipt can create multiple expense entries (one receipt for mixed lumber + electrical supplies → two expense rows)
- Soft-delete receipts (preserve audit trail)

### Schema

```typescript
// Budget — one per deal
export const budgets = pgTable("budgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .notNull()
    .unique()  // one budget per deal
    .references(() => deals.id),
  totalPlannedCents: integer("total_planned_cents").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Budget Categories — one row per category per budget
export const budgetCategories = pgTable(
  "budget_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id),
    name: text("name").notNull(),        // e.g., "Plumbing", "Flooring"
    sortOrder: integer("sort_order").notNull().default(0),
    plannedCents: integer("planned_cents").notNull().default(0),
    // actualCents is computed from expenses, NOT stored here (no denormalization)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_budget_categories_budget_id").on(table.budgetId),
    uniqueIndex("uq_budget_category_name").on(table.budgetId, table.name),
  ]
);

// Receipt Images — one row per uploaded photo
export const receipts = pgTable("receipts", {
  id: uuid("id").defaultRandom().primaryKey(),
  budgetId: uuid("budget_id")
    .notNull()
    .references(() => budgets.id),
  blobUrl: text("blob_url").notNull(),   // Azure Blob Storage URL (private)
  blobName: text("blob_name").notNull(), // Used to generate SAS URL on demand
  ocrRawJson: text("ocr_raw_json"),      // Full Document Intelligence response, nullable
  vendor: text("vendor"),               // Extracted or manually entered
  receiptDate: date("receipt_date"),
  totalCents: integer("total_cents"),   // Receipt total (may differ from sum of expenses if split)
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Expenses — actual spending entries
export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => budgetCategories.id),
    receiptId: uuid("receipt_id")
      .references(() => receipts.id), // nullable — manual expenses have no receipt
    vendor: text("vendor"),
    description: text("description"),
    amountCents: integer("amount_cents").notNull(),
    expenseDate: date("expense_date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_expenses_budget_id").on(table.budgetId),
    index("idx_expenses_category_id").on(table.categoryId),
    index("idx_expenses_receipt_id").on(table.receiptId),
  ]
);
```

### Why `actualCents` is NOT stored on `budgetCategories`

If you store a running total on the category row, you have to update it every time an expense is inserted/deleted/edited — and you risk getting it out of sync. Instead, compute it with a simple aggregate:

```sql
SELECT category_id, SUM(amount_cents) as actual_cents
FROM expenses
WHERE budget_id = $1
GROUP BY category_id
```

This is fast with the index. At Brian's scale (maybe 100 expenses per project), this is instantaneous.

### Default Category Seeding

When a budget is created from a deal, seed these 20 categories with `plannedCents = 0` (user fills in amounts, or they're auto-distributed from `repair_estimate`):

```
Demo / Site Prep
Foundation / Structural
Framing / Carpentry
Roofing
Exterior / Siding
Windows / Doors
Plumbing
Electrical
HVAC
Insulation
Drywall
Paint / Finish Work
Flooring
Kitchen
Bathrooms
Interior Trim
Landscaping
Permits / Fees
Contingency
Miscellaneous
```

User can add custom categories or delete unused ones.

**Confidence:** HIGH (standard relational design, consistent with existing schema patterns)

---

## 7. UI Architecture: Where Budget Lives

### Recommendation: Tab on Deal Detail Page

The budget should be a new "Budget" tab on the existing deal detail page — not a separate `/deals/[id]/budget` route. This matches how the existing deal tabs work (Overview, MAO, Contract, Notes, Buyers) and keeps all deal context together.

**Tab structure for deal detail (after Phase 9):**
```
Overview | MAO Calc | Contract | Notes | Buyers | Budget (NEW)
```

The Budget tab has two sub-views:
1. **Dashboard view** — KPI header + category progress bars + pie chart (default)
2. **Expenses view** — sortable table of all expenses with receipt thumbnails

The "Scan Receipt" button is prominent on mobile in the Budget tab.

### Mobile-First Layout Priority

On mobile, the budget tab should show:
1. Budget health KPIs (one line: total / spent / remaining)
2. Category progress bars (most important — Brian checks these at the job site)
3. "Add Expense" and "Scan Receipt" buttons as large tap targets
4. Expense list below (scrollable)

Charts (pie, grouped bar) are secondary — they're informational, not actionable. Position them below the progress bars on mobile, or in a "Charts" collapsible section.

---

## 8. Key Implementation Decisions to Make at Planning Time

These are open questions the planner must decide:

### Decision 1: OCR Trigger Timing
**Option A:** Upload photo → immediately call Document Intelligence → return pre-filled form (same request)
**Option B:** Upload photo → save receipt record → user manually taps "Scan" button → fill form

Recommendation: **Option A.** One-step flow is better UX. Azure Document Intelligence is fast (~2-4 seconds). Show a loading state during scan.

### Decision 2: Budget Creation Flow
**Option A:** User taps "Create Budget" → blank budget with default categories at $0
**Option B:** User taps "Create Budget" → auto-distribute `repair_estimate` across categories as a starting allocation

Recommendation: **Option A first.** Auto-distribution requires a percentage allocation scheme that Brian would need to configure. Start simple — blank budget, user fills in planned amounts per category. Total is independently entered (not forced to equal `repair_estimate`, but displayed alongside it as a reference).

### Decision 3: Category Editing
Allow rename, reorder (drag-and-drop), and delete (only if no expenses attached). Hide categories with $0 planned AND $0 actual from the dashboard view to reduce clutter.

### Decision 4: CSV Export
Export columns: Category, Planned, Actual, Variance, Variance %. Secondary export: all individual expenses with receipt link. These can reuse the CSV utility from Phase 6.

---

## 9. New Dependencies Required

| Package | Purpose | Size Impact |
|---------|---------|-------------|
| `@azure/storage-blob` | Upload receipt images to Azure Blob | ~200KB |
| `@azure/ai-form-recognizer` | Azure Document Intelligence OCR | ~500KB |

No camera library needed (native input). No new chart library needed (recharts already installed). No PDF library needed (receipts are images, not PDFs).

---

## 10. Pitfalls & Risks

### Pitfall 1: Azure Document Intelligence Not Deployed
Brian needs to create a Document Intelligence resource in Azure Portal before this works. It's not automatically provisioned with the resource group. Steps: Azure Portal → Create Resource → "Document Intelligence" → F0 (free tier) → same resource group.

**Prevention:** Include Azure resource provisioning in Phase 9 Plan 1.

### Pitfall 2: Blob Storage CORS for SAS Display
Receipt images are in a private blob container. To display them in the browser, you either:
- Generate a SAS URL server-side and send it to the client (correct)
- Or accidentally make the container public (wrong — no access control)

Private container + server-generated SAS URL (1-hour expiry) is the right pattern. SAS URL is generated at render time, not stored in the DB (stale SAS URLs won't work after expiry).

**Prevention:** Store only `blobName` in DB. Generate SAS URL in server component at render time.

### Pitfall 3: Next.js Server Action File Size Limits
Azure App Service has no 4.5MB limit (that's Vercel). But the App Service B1 has 1.75GB RAM — large image uploads through the Node.js server will work fine. Still, compress images client-side before upload to keep blob costs down and OCR faster.

**Prevention:** Client-side canvas resize to max 1920px before sending (reduces 8MP phone photo from ~5MB to ~400KB with no OCR quality loss).

### Pitfall 4: Drizzle `numeric` Type Returns String
The existing schema uses `integer` for all money fields (`repair_estimate`, `mao`, `arv`). Follow the same pattern — use `integer` for cents. Do NOT use Drizzle's `numeric()` column type — it returns a TypeScript `string` due to a known Drizzle ORM limitation, requiring extra parsing everywhere.

**Prevention:** All money fields as `integer` (cents). Display layer divides by 100.

### Pitfall 5: OCR Fails on Poor Quality Photos
Azure Document Intelligence handles tilted/crumpled receipts well, but very dark or blurry photos will return null or partial results. The UI must gracefully handle this — show the form with empty fields and let Brian fill in manually. Never block expense creation on OCR failure.

**Prevention:** OCR result is always optional. Form is always editable before save.

### Pitfall 6: Budget Tab on Mobile Performance
The deal detail page will have 6 tabs. On mobile, tab switching should be snappy. The Budget tab should fetch data lazily (only when tab is active) — same pattern used in Phase 6 analytics tabs. Don't pre-fetch all 6 tabs on page load.

**Prevention:** Per-tab data fetching, same pattern as analytics page.

---

## 11. Phase Structure Recommendation

Based on this research, Phase 9 should be 4 plans:

**Plan 09-01:** Schema + Azure resource provisioning
- Drizzle schema (budgets, budget_categories, receipts, expenses tables)
- Azure Document Intelligence resource creation in portal
- Azure Blob container for receipts
- Navigation: add Budget tab to deal detail page shell

**Plan 09-02:** Budget creation + category management
- "Create Budget" flow from deal detail
- Default category seeding
- Category planned amounts editor
- Budget health KPI header (static, computed from DB)

**Plan 09-03:** Expense entry + receipt scanning
- Manual expense form (vendor, amount, date, category, notes)
- Receipt upload via native file input
- Azure Document Intelligence OCR server action
- Pre-fill expense form from OCR results
- Receipt image display (SAS URL generation)

**Plan 09-04:** Visualizations + export
- Category progress bars (green/yellow/red)
- Pie chart: spending by category (recharts)
- Grouped bar chart: planned vs. actual (recharts)
- Budget alert banners (80% warning, over-budget critical)
- CSV export (budget summary + expenses detail)
- Deal detail page: budget summary widget (mini KPI shown on Overview tab)

---

## Sources

- [Azure Document Intelligence Pricing](https://azure.microsoft.com/en-us/pricing/details/document-intelligence/) — Free tier: 500 pages/month; $10/1,000 pages beyond (MEDIUM confidence — page timed out, pricing from search result summary)
- [FlipperForce Project Budgeter Features](https://flipperforce.com/software-features/project-budgeter) — Competitive feature analysis (HIGH confidence — fetched directly)
- [Tesseract.js GitHub](https://github.com/naptha/tesseract.js/) — Client-side OCR limitations (HIGH confidence)
- [Azure Blob Storage + Next.js Upload Guide (Microsoft Learn)](https://learn.microsoft.com/en-us/azure/developer/javascript/tutorial/browser-file-upload-azure-storage-blob) — SAS token upload pattern (HIGH confidence)
- [MDN: HTML capture attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/capture) — Native camera input (HIGH confidence)
- [shadcn Progress component color customization](https://github.com/shadcn-ui/ui/discussions/1454) — Dynamic Tailwind color classes (HIGH confidence)
- [Drizzle ORM + PostgreSQL money storage](https://wanago.io/2024/11/04/api-nestjs-drizzle-orm-postgresql-money/) — Integer cents pattern (HIGH confidence)
- [Estimating Rehab Costs — Real Estate Skills](https://www.realestateskills.com/blog/estimating-rehab-costs) — Standard category list (HIGH confidence)
- [OCR Comparison: Tesseract vs Azure vs Google](https://federico-ricciuti.medium.com/how-to-compare-ocr-tools-tesseract-ocr-vs-amazon-textract-vs-azure-ocr-vs-google-ocr-ba3043b507c1) — Accuracy comparison (MEDIUM confidence — 2023 article, fundamentals still hold)
