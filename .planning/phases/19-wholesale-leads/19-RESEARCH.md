# Phase 19: Wholesale Leads - Research

**Researched:** 2026-04-09
**Domain:** Wholesale real estate deal intake, analysis, triage workflow, email parsing
**Confidence:** HIGH (project stack well-understood; domain formula research verified from multiple sources)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Deal intake
- **Two entry methods:** Email forwarding with smart parse AND manual form entry
- **Smart parse:** AI/regex extraction from forwarded emails — pre-fills address, asking price, ARV, sqft, beds, baths, lot size, year built, tax ID, wholesaler contact. User verifies and corrects before saving.
- **Manual form fields:** Address, asking price, ARV, repair estimate, sqft, beds, baths, lot size, year built, wholesaler name + phone + email, source channel (email/social/text), notes
- **Example email format (reference):** Structured deal blast with "ASKING $XXK", "ARV: $XXXK", property details section, contact info. See Austin Howard / Rockwood & Company format as baseline for parser.

#### Deal analysis
- **Formula:** Use existing MAO formula (ARV x 0.70 - Repairs - Fee) as baseline — see research section below for formula findings
- **Auto-run on entry:** Analysis calculates automatically when a deal is saved. Instant verdict displayed.
- **Editable + re-run:** User can edit any number (ARV, repairs, asking price) and re-run analysis
- **Verdict display:** Traffic light (green/yellow/red) PLUS a weighted score (1-10) with expandable breakdown showing individual factors
- **Profit estimate:** Big dollar amount showing estimated profit at a glance

#### Deal workflow
- **4 statuses:** New → Analyzing → Interested → Pass/Promoted
- **"Promote to Deal" button:** Creates a new Deal in the existing Deals pipeline with all numbers pre-filled. The Deal should be tagged/flagged to show it originated from the Wholesale side.
- **Simple timestamped notes:** Same pattern as property/deal notes — quick notes about conversations with the wholesaler
- **Wholesaler directory:** Track wholesaler name + contact info. Aggregate stats: deals sent, deals promoted, average spread. Know which wholesalers consistently send good deals.

#### List & filtering
- **Card grid layout:** Cards showing address, asking/ARV, traffic light verdict, profit estimate, wholesaler name. Designed for fast triage/scanning.
- **Filters:** Verdict (green/yellow/red), status (new/analyzing/interested/pass/promoted), wholesaler source
- **Navigation:** Own sidebar link at `/wholesale` — top-level page, separate from Deals

### Claude's Discretion
- Smart parse implementation approach (regex vs AI vs hybrid)
- Email forwarding endpoint design (Resend inbound webhook vs dedicated API route)
- Score factor weights and formula details
- Card layout and component structure
- Empty state design
- How to handle duplicate incoming deals (same property from different wholesalers)

### Deferred Ideas (OUT OF SCOPE)
- Automated comp lookup from external APIs (Zillow, Redfin) — could be its own phase
- Auto-reject rules (e.g., auto-pass anything with <$20K spread) — future optimization
- Rental analysis / BRRRR calculator alongside flip analysis — future phase
</user_constraints>

---

## Summary

Phase 19 adds a dedicated Wholesale Leads triage section to the No BS Workbench. The core flow is: receive deals from 3rd-party wholesalers (via email forward or manual entry), auto-score them with a traffic light + weighted score, triage quickly via card grid, and promote gems into the existing Deals pipeline.

The key research questions were: (1) Is the MAO formula correct? (2) How should the 1-10 score work? (3) What's the best email parsing approach given Resend's inbound feature? All three have clear answers based on research.

The project stack is extremely well-understood from prior phases. This phase adds 4 new DB tables, one top-level route (`/wholesale`), 6-8 new components, an API webhook route, and connects to the existing Deals pipeline via the `createDeal` server action.

**Primary recommendation:** Use Resend inbound webhook for email parsing (already have Resend configured), regex-based smart parse for structured wholesaler blasts (the Austin Howard format is very parseable), and a pure client-side weighted score that factors in equity spread %, profit dollars, and asking-vs-MAO gap.

---

## Formula Research: Is ARV × 0.70 − Repairs − Fee Correct?

**Verdict: YES, this is the industry-standard formula. Use it with confidence.**

### The Standard Formula (HIGH confidence)

**MAO = ARV × 0.70 − Repair Costs − Wholesale Fee**

This formula is universally used in wholesale real estate and confirmed by multiple authoritative sources (RealEstateSkills, BiggerPockets, Chase, New Silver, REtipster). The existing `deal-mao-calculator.tsx` already implements it correctly.

### The 70% Factor Is a Sliding Scale (HIGH confidence)

The 70% factor is a starting point, not a fixed rule. Experienced investors adjust it:

| Market Condition | Discount Factor | Rationale |
|-----------------|----------------|-----------|
| Hot market (A-class, high competition) | 75-80% of ARV | Less risk, buyers will pay more |
| Standard market (B/C-class) | 70% of ARV | Industry standard |
| Slow/heavy rehab market (D-class) | 60-65% of ARV | Higher risk, buyer requires more margin |

**For the scoring system:** The app should use 70% as the baseline for MAO calculation. The score (1-10) should reward how far below MAO the asking price is, and flag when the asking price pushes toward the 75-80% range as "yellow/risky."

### What Experienced Investors Look At Beyond MAO (MEDIUM confidence)

Research from multiple wholesale investor sources identifies these additional quality factors:

1. **Equity spread dollar amount** — The raw profit (MAO − asking price). More dollars = more confidence.
2. **Equity spread percentage** — Spread ÷ ARV. A $20K spread on a $100K ARV deal is riskier than on a $300K ARV deal.
3. **End buyer profit room** — (ARV − asking price − repairs) ÷ (asking price + repairs). Ideally ≥15% ROI for end buyer.
4. **ARV confidence** — Is the ARV realistic? The biggest source of deal failures. (Manually entered; user-estimated.)
5. **Repair estimate reliability** — Underestimating repairs is the second biggest failure. Conservative estimates score better.
6. **Assignment fee headroom** — How much room remains for the wholesaler's fee after accounting for buyer needs.

### Recommended Weighted Score Formula (Claude's Discretion)

Score 1-10 weighted from these factors. Implement as pure TypeScript, no library needed:

```typescript
// Source: derived from research + existing DealMaoCalculator patterns
function computeWholesaleScore(
  arv: number,
  repairEstimate: number,
  askingPrice: number,
  wholesaleFee: number = 15000
): { score: number; verdict: "green" | "yellow" | "red"; breakdown: ScoreBreakdown }

// Factor 1: Spread vs MAO (40% weight)
// MAO = ARV * 0.70 - repairs - fee
// How far is asking below MAO?
// >=10% below MAO → 10 pts; at MAO → 7 pts; 5% above MAO → 4 pts; >10% above → 0 pts

// Factor 2: Equity spread % (30% weight)
// (MAO - askingPrice) / ARV
// >=15% → 10 pts; 10-15% → 7 pts; 5-10% → 4 pts; <5% → 0 pts

// Factor 3: End buyer profit room (30% weight)
// ARV - askingPrice - repairs (end buyer's gross profit)
// >=20% ROI on all-in cost → 10 pts; 15-20% → 7 pts; 10-15% → 4 pts; <10% → 0 pts

// Verdict mapping:
// 7-10: green (strong deal)
// 4-6:  yellow (marginal — worth a call)
// 0-3:  red (pass)
```

**Profit dollar display:** Show `MAO - askingPrice` as the "Your profit at MAO" estimate (the assignment fee potential). This is the big dollar number the user wants to see at a glance.

---

## Standard Stack

This phase uses the existing project stack — no new libraries required except potentially for email parsing.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15 | App router, server actions, API routes | Project standard |
| Drizzle ORM | current | Database schema + queries | Project standard |
| PostgreSQL | Azure B1ms | Persistence | Project standard |
| shadcn/ui | v4 | Cards, badges, buttons, dialogs | Project standard |
| @base-ui/react | current | Dialogs (NOT Radix/shadcn Dialog) | Phase 11 decision |
| Tailwind CSS | v4 | Styling with warm palette tokens | Project standard |
| Zod v4 | current | `z.object()` validation in server actions | Project standard |
| Resend | current | Email sending + inbound webhook | Project standard |
| Lucide React | current | Icons | Project standard |

### New/Additions
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | All parsing done with native JS regex | Email format is structured enough for regex |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex parsing | OpenAI API / AI SDK | AI handles messy unstructured emails but adds cost/latency; regex handles the known Austin Howard format perfectly |
| Resend inbound | Dedicated email service (Postmark, Mailgun) | Resend already configured; no new service needed |
| Resend inbound | Webhook API route only (no inbound) | User would need to copy-paste email text rather than forward; friction |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

```
app/src/
├── app/(dashboard)/
│   └── wholesale/
│       ├── page.tsx              # /wholesale list page (server component)
│       └── [id]/
│           └── page.tsx          # /wholesale/[id] detail page (server component)
├── app/api/
│   └── inbound/
│       └── route.ts              # POST /api/inbound — Resend webhook handler
├── components/
│   ├── wholesale-lead-card.tsx   # Card for grid (address, verdict badge, profit, wholesaler)
│   ├── wholesale-lead-grid.tsx   # Grid layout + filter bar
│   ├── wholesale-lead-form.tsx   # Manual entry form (client component)
│   ├── wholesale-parse-review.tsx # Parsed email review/correction form (client component)
│   ├── wholesale-analysis.tsx    # Traffic light + score + breakdown (client component)
│   ├── wholesale-notes.tsx       # Quick timestamped notes (mirrors deal-notes.tsx)
│   └── wholesaler-directory.tsx  # Wholesaler list with aggregate stats
└── lib/
    ├── wholesale-actions.ts      # Server actions: createWholesaleLead, updateWholesaleLead, promoteToDeal, etc.
    ├── wholesale-queries.ts      # DB queries: getWholesaleLeads, getWholesaleLead, getWholesalers
    ├── wholesale-parser.ts       # Email body → parsed fields (regex)
    └── wholesale-score.ts        # computeWholesaleScore() pure function
```

### Pattern 1: Resend Inbound Webhook → Parse Review Flow

**What:** Resend delivers `email.received` event to `/api/inbound`. Handler fetches full email body via Resend Retrieve API, runs regex parser, stores a `wholesale_leads` row with status `new` and `parsedDraft` JSON. User then visits the card, sees pre-filled form, corrects errors, and saves.

**Key Resend Inbound detail (HIGH confidence — verified from Resend docs):**
- Webhook delivers metadata only (from, to, subject, email_id) — NOT the body
- Must call `GET /v1/emails/{id}/content` (Retrieve Received Email) to get plain text + HTML body
- Setup: Add MX records for `inbound.yourdomain.com` OR use Resend-managed `*.resend.app` domain
- Event type to handle: `email.received`

```typescript
// /app/api/inbound/route.ts
// Source: Resend docs https://resend.com/docs/dashboard/receiving/introduction
export async function POST(req: Request) {
  const payload = await req.json();
  if (payload.type !== "email.received") return Response.json({ ok: true });

  const emailId = payload.data.email_id;
  
  // Fetch full email body from Resend API
  const resend = new Resend(process.env.RESEND_API_KEY);
  const email = await resend.emails.get(emailId); // returns {text, html, from, subject, ...}
  
  const bodyText = email.text ?? email.html ?? "";
  const parsed = parseWholesaleEmail(bodyText, email.from, email.subject);
  
  // Store as wholesale lead with status 'new', parsedDraft = parsed fields
  await db.insert(wholesaleLeads).values({
    status: "new",
    sourceChannel: "email",
    rawEmailText: bodyText,
    parsedDraft: JSON.stringify(parsed),
    // wholesaler auto-lookup or create from email.from
  });
  
  return Response.json({ ok: true });
}
```

**Note on Resend Retrieve Received Email:** The exact API method name needs verification at implementation time. As of November 2025 launch, the `email.received` feature is available. The body retrieval endpoint is documented at `/api-reference/emails/retrieve-received-email`.

### Pattern 2: Regex Smart Parser for Austin Howard Format

**What:** Parse structured wholesaler email blasts using regex. The example format has very clear patterns that regex handles reliably.

```typescript
// /lib/wholesale-parser.ts
// Based on: "2067 Quincy Ave, Ogden / ASKING $169K / ARV: $325K / Sq Ft: 1,328 / Beds: 2 / Baths: 1 / Year Built: 1972 / Tax ID: 01-066-0005 / Contact Austin @ (801) 819-5517"
export function parseWholesaleEmail(text: string, fromEmail: string, subject: string): ParsedWholesaleDeal {
  // Address: first line or before "ASKING"
  const addressMatch = text.match(/^([^/\n]+?)(?:\s*\/\s*ASKING|\n)/i);

  // Asking price: "ASKING $XXX,XXX" or "ASKING $XXXK"  
  const askingMatch = text.match(/ASKING\s*\$?([\d,]+)K?/i);
  
  // ARV: "ARV:\s*$XXX,XXX" or "ARV: $XXXK"
  const arvMatch = text.match(/ARV[:\s]+\$?([\d,]+)K?/i);
  
  // Sq ft: "Sq Ft: 1,328" or "SqFt: 1328"
  const sqftMatch = text.match(/Sq\.?\s*Ft\.?[:\s]+([\d,]+)/i);
  
  // Beds/Baths
  const bedsMatch = text.match(/Beds?[:\s]+(\d+)/i);
  const bathsMatch = text.match(/Baths?[:\s]+(\d+(?:\.\d)?)/i);
  
  // Year built
  const yearMatch = text.match(/Year\s+Built[:\s]+(\d{4})/i);
  
  // Tax ID / Parcel
  const taxIdMatch = text.match(/Tax\s*ID[:\s]+([^\s\/\n]+)/i);
  
  // Contact: "Contact Austin @ (801) 819-5517" or "Austin Howard" + phone
  const contactMatch = text.match(/Contact\s+([^\n@(]+?)(?:\s*@\s*|\s+)([\(\d][^\n]+)/i);
  
  // Helper: parse "$169K" or "$169,000" → integer
  function parseDollars(s: string): number | null {
    if (!s) return null;
    const n = parseInt(s.replace(/,/g, ""), 10);
    return s.toUpperCase().includes("K") ? n * 1000 : n;
  }
  
  return {
    address: addressMatch?.[1]?.trim() ?? null,
    askingPrice: parseDollars(askingMatch?.[1] ?? ""),
    arv: parseDollars(arvMatch?.[1] ?? ""),
    sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) : null,
    beds: bedsMatch ? parseInt(bedsMatch[1], 10) : null,
    baths: bathsMatch ? parseFloat(bathsMatch[1]) : null,
    yearBuilt: yearMatch ? parseInt(yearMatch[1], 10) : null,
    taxId: taxIdMatch?.[1]?.trim() ?? null,
    wholesalerName: contactMatch?.[1]?.trim() ?? null,
    wholesalerPhone: contactMatch?.[2]?.trim() ?? null,
    wholesalerEmail: fromEmail ?? null,
    confidence: estimateParseConfidence(text),
  };
}
```

### Pattern 3: "Promote to Deal" Server Action

**What:** When user clicks "Promote to Deal", call `createDeal()` with pre-filled data and tag the resulting deal with `source: "wholesale"` and a FK back to the wholesale lead.

```typescript
// /lib/wholesale-actions.ts
export async function promoteToDeal(wholesaleLeadId: string): Promise<{ dealId: string }> {
  const lead = await getWholesaleLead(wholesaleLeadId);
  
  const fd = new FormData();
  fd.set("address", lead.address);
  fd.set("city", lead.city ?? "");
  fd.set("arv", String(lead.arv ?? ""));
  fd.set("askingPrice", String(lead.askingPrice ?? ""));
  fd.set("repairEstimate", String(lead.repairEstimate ?? ""));
  fd.set("wholesaleFee", "15000");
  // Note: createDeal will auto-compute MAO
  
  const { id: dealId } = await createDeal(fd);
  
  // Tag the deal as wholesale-sourced + backlink
  await db.update(deals).set({
    leadSource: "wholesale",  // OR add a new wholesaleLeadId FK column to deals
  }).where(eq(deals.id, dealId));
  
  // Update wholesale lead status to 'promoted'
  await db.update(wholesaleLeads)
    .set({ status: "promoted", promotedDealId: dealId })
    .where(eq(wholesaleLeads.id, wholesaleLeadId));
  
  return { dealId };
}
```

**Implementation note on deals table:** The `deals` table has `leadSource text` already. Set it to `"wholesale"` for promoted deals. Also need a nullable `wholesaleLeadId` FK on deals (or store `promotedDealId` on the wholesale lead — the latter is simpler and sufficient).

### Pattern 4: Pure Score Computation (Client-Side, No Library)

Mirrors the existing `deal-mao-calculator.tsx` pattern — pure client-side computation, no DB roundtrip.

```typescript
// /lib/wholesale-score.ts
export interface WholesaleScoreBreakdown {
  maoSpreadPts: number;    // 0-10, weight 40%
  equityPctPts: number;    // 0-10, weight 30%
  endBuyerRoiPts: number;  // 0-10, weight 30%
  total: number;           // 1-10 weighted
  verdict: "green" | "yellow" | "red";
  mao: number;
  spreadDollars: number;   // MAO - askingPrice (the profit estimate shown big)
  endBuyerProfit: number;
  endBuyerRoi: number;     // percentage
}

export function computeWholesaleScore(
  arv: number,
  repairEstimate: number,
  askingPrice: number,
  wholesaleFee: number = 15000
): WholesaleScoreBreakdown {
  const mao = Math.round(arv * 0.70 - repairEstimate - wholesaleFee);
  const spreadDollars = mao - askingPrice;
  const spreadPct = arv > 0 ? spreadDollars / arv : 0;
  
  const endBuyerAllIn = askingPrice + repairEstimate; // what end buyer pays + rehab
  const endBuyerProfit = arv - endBuyerAllIn;
  const endBuyerRoi = endBuyerAllIn > 0
    ? Math.round((endBuyerProfit / endBuyerAllIn) * 100) : 0;
  
  // Factor 1: Spread vs MAO (40%)
  const spreadRatio = mao > 0 ? spreadDollars / mao : 0;
  const maoSpreadPts =
    spreadRatio >= 0.15 ? 10 :
    spreadRatio >= 0.05 ? 7 :
    spreadRatio >= 0    ? 5 :
    spreadRatio >= -0.05 ? 2 : 0;
  
  // Factor 2: Equity % of ARV (30%)
  const equityPctPts =
    spreadPct >= 0.15 ? 10 :
    spreadPct >= 0.10 ? 7 :
    spreadPct >= 0.05 ? 4 : 0;
  
  // Factor 3: End buyer ROI (30%)
  const endBuyerRoiPts =
    endBuyerRoi >= 20 ? 10 :
    endBuyerRoi >= 15 ? 7 :
    endBuyerRoi >= 10 ? 4 : 0;
  
  const total = Math.round(
    maoSpreadPts * 0.4 + equityPctPts * 0.3 + endBuyerRoiPts * 0.3
  );
  
  const verdict: "green" | "yellow" | "red" =
    total >= 7 ? "green" : total >= 4 ? "yellow" : "red";
  
  return {
    maoSpreadPts, equityPctPts, endBuyerRoiPts,
    total, verdict, mao, spreadDollars, endBuyerProfit, endBuyerRoi
  };
}
```

### Pattern 5: Duplicate Detection (Claude's Discretion)

**Recommendation:** Soft-duplicate detection via address normalization. On save, query for existing wholesale leads with same normalized address. If found, surface a banner: "A deal for this address already exists (from [Wholesaler Name] on [Date]). View it or save as separate entry."

Do NOT auto-merge or auto-reject — user decides. This is the same property potentially from multiple wholesalers at different asking prices, which is valuable data.

```typescript
// Normalize: lowercase, remove apt/unit, strip punctuation, trim
function normalizeAddress(addr: string): string {
  return addr.toLowerCase()
    .replace(/\b(apt|unit|#)\s*\w+/gi, "")
    .replace(/[.,#]/g, "")
    .trim();
}
```

Store `addressNormalized text` column on `wholesale_leads` for fast lookup.

### Anti-Patterns to Avoid

- **Blocking deal creation on parse failure:** Parse errors should surface as empty fields for the user to fill in, not errors. The review form always allows manual correction.
- **Requiring perfect email format:** Different wholesalers use different formats. The parser should return `null` for unparseable fields and let user fill them in.
- **Over-engineering the webhook:** Resend webhook needs to respond `200 OK` within seconds. Do the DB insert synchronously but keep it minimal; skip heavy processing (score computation can happen client-side on demand, not at webhook time).
- **Using pgEnum for wholesale_lead status:** Use `text` type like the Deals table — consistent with project pattern from Phase 08.
- **Tight coupling to Deals schema changes:** `promoteToDeal` should call the existing `createDeal` server action, not duplicate deal creation logic.

---

## Database Schema

### New Tables Required

```typescript
// wholesale_leads table
export const wholesaleLeads = pgTable(
  "wholesale_leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    // Core deal fields (pre-filled by parser or user)
    address: text("address").notNull(),
    addressNormalized: text("address_normalized"),  // for duplicate detection
    city: text("city"),
    state: text("state").default("UT"),
    zip: text("zip"),
    askingPrice: integer("asking_price"),
    arv: integer("arv"),
    repairEstimate: integer("repair_estimate"),
    sqft: integer("sqft"),
    beds: integer("beds"),
    baths: text("baths"),  // "1.5" etc
    lotSize: text("lot_size"),
    yearBuilt: integer("year_built"),
    taxId: text("tax_id"),
    
    // Analysis (stored for display, re-computed client-side)
    mao: integer("mao"),
    dealScore: integer("deal_score"),                       // 1-10
    verdict: text("verdict"),                               // "green" | "yellow" | "red"
    scoreBreakdown: text("score_breakdown"),                // JSON
    
    // Status: "new" | "analyzing" | "interested" | "pass" | "promoted"
    status: text("status").notNull().default("new"),
    
    // Wholesaler FK
    wholesalerId: uuid("wholesaler_id").references(() => wholesalers.id),
    
    // Source tracking
    sourceChannel: text("source_channel"),  // "email" | "social" | "text"
    rawEmailText: text("raw_email_text"),    // full email body for re-parse
    parsedDraft: text("parsed_draft"),       // JSON: parser output before user save
    
    // Promote to Deal link
    promotedDealId: uuid("promoted_deal_id").references(() => deals.id),
    
    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_wholesale_leads_status").on(table.status),
    index("idx_wholesale_leads_wholesaler").on(table.wholesalerId),
    index("idx_wholesale_leads_verdict").on(table.verdict),
    index("idx_wholesale_leads_address_norm").on(table.addressNormalized),
  ]
);

// wholesalers table (the directory)
export const wholesalers = pgTable(
  "wholesalers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    company: text("company"),
    sourceChannel: text("source_channel"),  // preferred channel
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_wholesalers_email").on(table.email),
  ]
);

// wholesale_lead_notes table
export const wholesaleLeadNotes = pgTable(
  "wholesale_lead_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    wholesaleLeadId: uuid("wholesale_lead_id")
      .notNull()
      .references(() => wholesaleLeads.id),
    noteText: text("note_text").notNull(),
    noteType: text("note_type").notNull().default("user"),  // "user" | "status_change"
    previousStatus: text("previous_status"),
    newStatus: text("new_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_wholesale_lead_notes_lead").on(table.wholesaleLeadId)]
);
```

**Note on forward references:** `wholesalers` referenced by `wholesaleLeads` — declare `wholesalers` table BEFORE `wholesaleLeads` in schema.ts. Pattern matches existing schema ordering.

**Migration number:** Current migrations go up to 0008 (from Phase 15-01 decision). Next migration is **0009**.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email receiving | Custom SMTP server | Resend inbound webhook | Already have Resend; no new service |
| Phone number formatting | Custom regex | Native `.replace(/\D/g,'')` + display format | Phone numbers simple enough |
| Address normalization | Full geocoding | Simple lowercasing + token removal | Only need fuzzy duplicate detection, not geocoding |
| Score display | Custom chart | CSS-based traffic light + Badge component | shadcn Badge + green/yellow/red classes already used throughout |
| MAO formula | Reinvent | Copy `deal-mao-calculator.tsx` logic into `wholesale-score.ts` | MAO calc already exists and is correct |
| Notes | Custom pattern | Mirror `deal-notes.tsx` exactly | Same UX, same DB pattern |

**Key insight:** This phase is mostly a new DB domain with familiar UI patterns. Resist the urge to build something elaborate — the existing DealCard, DealNotes, and MaoCalculator patterns cover 80% of what's needed.

---

## Common Pitfalls

### Pitfall 1: Resend Inbound Webhook — Body Not in Webhook Payload

**What goes wrong:** Developer reads webhook payload expecting email body text. It's not there. Webhook only has metadata.

**Why it happens:** Resend sends metadata first for speed; full body requires a second API call.

**How to avoid:** In the webhook handler, after receiving `email.received`, call `resend.emails.get(emailId)` to fetch the full email including `text` and `html` fields.

**Warning signs:** Parser always returns null fields; `rawEmailText` stored as empty string.

**Verification:** Test by logging the full `payload.data` object before implementing body fetch.

### Pitfall 2: Regex Parser Fragility on Non-Standard Formats

**What goes wrong:** Parser works perfectly on the Austin Howard format but returns all nulls for other wholesalers.

**Why it happens:** Different wholesalers use different formats (some use line breaks vs slashes, different capitalization, different field names).

**How to avoid:** Design the review form to always show — even when all fields parse successfully. The user should confirm/correct before saving. Never auto-save parsed results without review.

**Warning signs:** Users report wrong addresses or prices being saved.

### Pitfall 3: Resend Inbound Domain MX Setup Required Before Testing

**What goes wrong:** Webhook route is built but no emails arrive because MX records aren't configured.

**Why it happens:** Resend inbound requires either custom domain MX setup or using a Resend-managed subdomain (`*.resend.app`).

**How to avoid:** Use Resend's managed domain first (`anything@[id].resend.app`) to test before configuring custom domain. The managed domain is available immediately.

**Warning signs:** Webhook endpoint never receives events.

### Pitfall 4: K-notation Parsing for Dollar Amounts

**What goes wrong:** "$169K" gets parsed as 169, not 169000. "$325,000" gets parsed as 325 due to comma.

**Why it happens:** `parseInt("169K")` = 169. `parseInt("325,000")` = 325.

**How to avoid:** `parseDollars` helper must handle both formats:
```typescript
function parseDollars(raw: string): number | null {
  if (!raw) return null;
  const stripped = raw.replace(/[$,\s]/g, "");
  const n = parseInt(stripped, 10);
  if (isNaN(n)) return null;
  return /K$/i.test(stripped) ? n * 1000 : n;
}
```

**Warning signs:** ARV shows as $325 instead of $325,000.

### Pitfall 5: Migration Numbering

**What goes wrong:** Migration named `0004` conflicts with existing migration `0004_snapshot.json`.

**Why it happens:** Developer doesn't check current migration count.

**How to avoid:** Current highest migration is 0008 (Phase 15-01 decision in STATE.md). Use `0009` for this phase's migration.

### Pitfall 6: Schema Ordering — wholesalers Before wholesaleLeads

**What goes wrong:** TypeScript error at schema import: `wholesalers` referenced before definition.

**Why it happens:** `wholesaleLeads.wholesalerId` references `wholesalers.id`. If `wholesaleLeads` is declared first, it fails.

**How to avoid:** Declare `wholesalers` table first in schema.ts, then `wholesaleLeads`.

### Pitfall 7: Bottom Nav Has Only 5 Slots

**What goes wrong:** Adding Wholesale to bottom nav displaces Buyers or Map.

**Why it happens:** Mobile bottom nav is constrained to 5 items (Dashboard, Deals, Buyers, Analytics, Map).

**How to avoid:** Add Wholesale to desktop sidebar only (not bottom nav). Sidebar currently has 8 items with room for more. This matches the pattern from Phase 16-02 where Campaigns was moved to sidebar-only.

---

## Code Examples

### Wholesaler Auto-Create/Lookup on Email Receive

```typescript
// Source: mirrors existing onConflictDoUpdate patterns in project
async function upsertWholesaler(email: string | null, name: string | null) {
  if (!email) return null;
  const [row] = await db
    .insert(wholesalers)
    .values({ name: name ?? email, email })
    .onConflictDoUpdate({
      target: wholesalers.email,
      set: { updatedAt: new Date() },
    })
    .returning({ id: wholesalers.id });
  return row.id;
}
```

### Traffic Light Badge Component

```typescript
// Source: mirrors existing badge patterns in project (badge-tinting pattern from Phase 17-03)
function VerdictBadge({ verdict }: { verdict: "green" | "yellow" | "red" }) {
  const config = {
    green:  { label: "Strong Deal", className: "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400" },
    yellow: { label: "Marginal",    className: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400" },
    red:    { label: "Pass",        className: "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-400" },
  };
  const c = config[verdict];
  return (
    <Badge variant="outline" className={c.className}>
      {verdict === "green" ? "●" : verdict === "yellow" ? "●" : "●"} {c.label}
    </Badge>
  );
}
```

### Promote to Deal — deals Table leadSource Field

The existing `deals` table already has a `leadSource` text column (see schema.ts line 287 equivalent — checked in deal-actions.ts). When promoting:

```typescript
// Set after createDeal returns dealId:
await db.update(deals)
  .set({ leadSource: "wholesale" })
  .where(eq(deals.id, dealId));
```

The Deals list and DealCard don't currently surface `leadSource` as a badge, but this is stored data the user can reference later. Optionally add a "Wholesale" badge to DealCard at the same time (small addition to existing component).

### Wholesaler Directory Aggregate Query

```typescript
// Source: mirrors existing analytics query patterns (two-query + post-merge pattern)
async function getWholesalerStats(wholesalerId: string) {
  const [stats] = await db
    .select({
      totalSent: count(wholesaleLeads.id),
      totalPromoted: count(
        sql`CASE WHEN ${wholesaleLeads.status} = 'promoted' THEN 1 END`
      ),
      avgSpread: avg(
        sql`${wholesaleLeads.mao} - ${wholesaleLeads.askingPrice}`
      ),
    })
    .from(wholesaleLeads)
    .where(eq(wholesaleLeads.wholesalerId, wholesalerId));
  return stats;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual copy-paste email text into form | Resend inbound webhook → auto-parse | Resend launched inbound Nov 2025 | Frictionless: forward email → review form appears |
| Fixed 70% rule | Sliding 65-80% based on market/class | Industry evolution ongoing | Score adjusts via verdict thresholds, not formula change |
| Score only MAO vs offer | Multi-factor score (spread, equity %, end buyer ROI) | This phase | More nuanced triage signal |

---

## Open Questions

1. **Resend inbound — exact API method for retrieving email body**
   - What we know: Must call Retrieve Received Email endpoint with `emailId`
   - What's unclear: Whether `resend.emails.get(id)` returns `text` and `html` fields or whether it's a different method/endpoint
   - Recommendation: Test with `curl` against Resend API before implementing webhook handler. Check `resend` npm package typedefs for `emails.retrieve` vs `emails.get` method name.

2. **Resend inbound — does it require a paid plan?**
   - What we know: Feature launched November 2025; project already on Resend
   - What's unclear: Whether inbound emails are included on the free tier
   - Recommendation: Check Resend pricing page before configuring. Fallback: implement manual "paste email text" entry as an alternative (low friction, same parse flow).

3. **deals table — should `wholesaleLeadId` be a FK on deals or `promotedDealId` on wholesale_leads?**
   - What we know: We need to navigate from a deal back to its wholesale source, and from a wholesale lead to its promoted deal
   - Recommendation: Store `promotedDealId uuid references deals(id)` on `wholesale_leads` (forward link). This keeps the deals table unchanged. The wholesale lead detail page can show the linked deal. If later we need "show source on deal detail", add `wholesaleLeadId` to deals at that point.

4. **Mobile bottom nav — Wholesale not included**
   - Recommendation confirmed: Add to sidebar only. Bottom nav stays at 5 items.

---

## Navigation Changes Required

1. **AppSidebar** (`app-sidebar.tsx`) — Add `{ label: "Wholesale", href: "/wholesale", icon: Store }` (or `Package`, `Inbox`, `Tag` from Lucide) to `navItems` array
2. **CommandMenu** (`command-menu.tsx`) — Add Wholesale to `navigationItems`
3. **MobileBottomNav** (`bottom-nav.tsx`) — Do NOT add (5-slot constraint)

---

## Sources

### Primary (HIGH confidence)
- Resend Inbound Docs: https://resend.com/docs/dashboard/receiving/introduction — webhook structure, domain setup, body retrieval
- Resend Inbound Blog: https://resend.com/blog/inbound-emails — feature overview, launch Nov 2025
- Project schema.ts — existing deals table structure, migration count, FK patterns
- Project deal-mao-calculator.tsx — existing MAO formula implementation
- Project deal-actions.ts — createDeal server action signature and MAO computation

### Secondary (MEDIUM confidence)
- RealEstateSkills MAO Guide: https://www.realestateskills.com/blog/mao-formula — formula variations, market adjustments
- RealEstateSkills Wholesale Guide: https://www.realestateskills.com/blog/wholesale-formula — 70% rule context
- DealRun.ai Wholesale Margins: https://dealrun.ai/blog/wholesaling-profit-margins — assignment fee ranges
- BiggerPockets MAO discussion: https://www.biggerpockets.com/forums/12/topics/102485-mao-vs-70-rule — community validation

### Tertiary (LOW confidence)
- Resend Retrieve Received Email API method name — verify at implementation time from npm package typedefs
- Resend free tier inbound email availability — check pricing page before configuring

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing project technologies, no new libraries
- MAO formula: HIGH — industry standard, confirmed from 5+ sources, already in project
- Weighted score formula: MEDIUM — derived from research, weights are Claude's discretion, user can adjust
- Resend inbound setup: MEDIUM — feature exists and is documented; exact API method name needs verification at implementation
- Architecture patterns: HIGH — mirrors well-established project patterns

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days — Resend API stable; formula research not time-sensitive)
