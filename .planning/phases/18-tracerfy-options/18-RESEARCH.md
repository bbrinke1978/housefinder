# Phase 18: Tracerfy Options - Research

**Researched:** 2026-04-09
**Domain:** Skip tracing API integration — frontend triggers, settings page, cost controls, contact card enrichment
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Trigger points
- **Contact card button:** "Skip Trace" button on property detail Contact tab — runs Tracerfy for a single property
- **Bulk from dashboard:** Multi-select checkboxes on dashboard property list, "Skip Trace Selected" action — no batch size limit, confirmation dialog shows count + estimated cost
- **Auto on deal creation:** When promoting a lead to a deal with no contact info, show a dialog: "No contact info — run skip trace? (~$0.02)" with Yes/No. User stays in control.

#### Settings & API config
- **Dedicated settings page:** New "Skip Tracing" section under Settings (like Mail Settings page)
- **API key storage:** Env var in Netlify (TRACERFY_API_KEY) — NOT in database. Settings page shows connection status (green/red) and balance but never exposes the key
- **Mini-dashboard on settings page:**
  - Connection status indicator (configured/not configured, valid/invalid)
  - Live credit balance from Tracerfy /analytics/ endpoint
  - Run history table: date, count, found rate, credits used
  - Monthly spend tracking with visual indicator

#### Results display
- **Auto-populate contact card:** Phone numbers and emails automatically appear on the contact card with a "tracerfy" source badge. Tap-to-call ready immediately.
- **Multiple results:** All returned numbers/emails visible on contact card. Primary phone at top with call button. Others listed below with type labels (mobile, landline).
- **Dashboard badge:** Small icon on property cards showing trace status: traced with results, traced no results, or not traced
- **No results handling:** "No skip trace results" badge on contact card with option to manually enter info. Property marked so it won't be re-queried.

#### Cost controls
- **Always confirm with cost:** Every trace (single or bulk) shows confirmation dialog: "Skip trace X properties? Est. cost: $X.XX. Current balance: $X.XX. Proceed?"
- **Low balance warning:** Yellow banner on Settings page and in confirmation dialog when balance drops below configurable threshold (default $2.00)
- **Monthly soft cap:** $50/month default. Warning notification when exceeded, not a hard block. Shown on settings mini-dashboard.

### Claude's Discretion
- Settings page layout and component structure
- Exact badge/icon design for trace status
- How to handle Tracerfy API errors/timeouts in the UI
- Loading states during trace execution (spinner, progress, etc.)

### Deferred Ideas (OUT OF SCOPE)
- Phase 20: Security Review — audit all code and Azure infrastructure for security issues, review API key storage, env var handling, Key Vault integration
- Moving API keys from env vars to Azure Key Vault (Phase 20 scope)
</user_constraints>

---

## Summary

Phase 18 surfaces the existing Tracerfy skip tracing integration into the No BS Workbench frontend. The scraper-side code in `scraper/src/sources/tracerfy-enrichment.ts` already handles batch submission, async polling, and result storage to `owner_contacts`. This phase replicates that logic as a Next.js server action callable from three trigger points: the Contact tab button, a bulk dashboard action, and an optional prompt on deal creation.

The critical architectural choice is that the Tracerfy API is async-by-nature — you POST a batch and then poll `/queues/` until complete. In the frontend context with no background jobs, the server action must handle this poll-wait inline during the request. For single-property traces this is acceptable (typically 5-30 seconds). For bulk traces of dozens of properties, the same pattern works because Netlify functions support up to 26 seconds per request by default, but large batches may hit that limit — the solution is to kick off the job and let the user wait with a loading state, or process in small sub-batches.

**CRITICAL BUG FOUND:** The existing scraper `storeResults()` function expects lowercase underscore field names (`email_1`, `mobile_1`, `landline_1`) but the actual Tracerfy API returns capitalized dash-separated names (`Email-1`, `Mobile-1`, `Landline-1`). The real CSV evidence confirms this. Any frontend port of this code MUST fix this field name mismatch or all phone/email extraction will silently yield zero results.

**Primary recommendation:** Port the Tracerfy logic to a `tracerfy-actions.ts` server action file in the app. Use the scraperConfig key-value table to store run history and monthly spend tracking. The API key stays as env var `TRACERFY_API_KEY` only.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js server actions | 15.5.13 | Trigger Tracerfy calls from UI | "use server" pattern established throughout app |
| drizzle-orm | 0.45.1 | DB reads/writes for owner_contacts and scraperConfig | Project's only ORM |
| zod | 4.3.6 | Input validation on server actions | Project standard — z/v4 import style |
| @base-ui/react | 1.3.0 | Dialog for confirmation modals | Project standard — NOT Radix, see pitfall |
| lucide-react | 0.577.0 | Icons (Search, Loader2, CheckCircle, AlertTriangle) | Project standard |
| shadcn Badge, Button, Card | installed | UI primitives | Project standard |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| useTransition (React 19) | 19.2.5 | Non-blocking server action calls from client | All server action calls in this project use this pattern |
| framer-motion | 12.38.0 | Loading shimmer or progress animation if desired | Available but use sparingly — spinner is sufficient |

### No new dependencies needed
All required libraries are already installed. No `npm install` step required.

---

## Architecture Patterns

### Recommended File Structure
```
app/src/
├── lib/
│   └── tracerfy-actions.ts        # "use server" — all Tracerfy server actions
├── app/(dashboard)/
│   └── settings/
│       └── skip-tracing/
│           └── page.tsx            # Settings page (like mail/page.tsx)
├── components/
│   ├── skip-trace-button.tsx       # Single-property trigger on ContactTab
│   ├── skip-trace-confirm-dialog.tsx  # Shared confirmation dialog (single + bulk)
│   ├── skip-trace-settings-form.tsx   # Settings page mini-dashboard form
│   └── bulk-skip-trace.tsx         # Bulk action bar (parallel to BulkEnroll)
```

### Pattern 1: Server Action for Tracerfy API Calls
**What:** All Tracerfy HTTP calls live in `tracerfy-actions.ts` as "use server" functions. The frontend calls these via useTransition.
**When to use:** Any time Tracerfy API is invoked.

The action pattern follows the established project convention:
```typescript
// lib/tracerfy-actions.ts
"use server";

import { db } from "@/db/client";
import { ownerContacts, scraperConfig } from "@/db/schema";
import { auth } from "@/auth";
import { z } from "zod/v4";

const BASE_URL = "https://tracerfy.com/v1/api";

/**
 * Single-property skip trace. Submits one-item batch, polls to completion.
 * Returns { found: boolean, phoneCount: number, emailCount: number } or { error: string }
 */
export async function runSkipTrace(propertyId: string): Promise<
  { success: true; found: boolean; phoneCount: number; emailCount: number } |
  { error: string }
> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const apiKey = process.env.TRACERFY_API_KEY;
  if (!apiKey) return { error: "TRACERFY_API_KEY not configured" };

  // ... fetch property, submit batch, poll, store results
  // revalidatePath("/properties/[id]") to refresh contact card
}

/**
 * Bulk skip trace. Accepts array of propertyIds (from leadIds via lookup).
 * Submits one batch, polls, stores all results.
 */
export async function runBulkSkipTrace(propertyIds: string[]): Promise<
  { success: true; found: number; notFound: number; creditsUsed: number } |
  { error: string }
> { ... }

/**
 * Get Tracerfy account balance and status.
 * Used by settings page and confirmation dialogs.
 */
export async function getTracerfyStatus(): Promise<
  { configured: boolean; balance: number | null; error?: string }
> {
  const apiKey = process.env.TRACERFY_API_KEY;
  if (!apiKey) return { configured: false, balance: null };
  try {
    const data = await fetch(`${BASE_URL}/analytics/`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
    }).then(r => r.json());
    return { configured: true, balance: data.balance ?? null };
  } catch {
    return { configured: true, balance: null, error: "Could not reach Tracerfy" };
  }
}

/**
 * Get run history from scraperConfig (stored as JSON blobs).
 */
export async function getTracerfyRunHistory(): Promise<TracerfyRunEntry[]> { ... }
```

### Pattern 2: Confirmation Dialog (base-ui)
**What:** A shared confirmation dialog used for both single-trace and bulk-trace, showing estimated cost and current balance.
**Critical:** Use `@base-ui/react` Dialog, NOT Radix/shadcn Dialog. The project uses `@base-ui/react` exclusively.

```typescript
// components/skip-trace-confirm-dialog.tsx
"use client";
import * as Dialog from "@base-ui/react/dialog";

interface SkipTraceConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyCount: number;
  estimatedCost: number;    // in dollars
  currentBalance: number | null;
  lowBalanceThreshold?: number; // default 2.00
  onConfirm: () => void;
  isPending: boolean;
}

// Note: Dialog.Close does NOT support asChild on @base-ui/react
// Use Dialog.Close directly with className, not wrapped around Button
```

### Pattern 3: Bulk Skip Trace Action Bar (parallel to BulkEnroll)
**What:** Fixed bottom bar that appears when properties are selected, offering "Skip Trace Selected" alongside existing "Bulk Enroll".
**Where:** Modify `dashboard-property-grid.tsx` to pass `selectedIds` and `properties` to a new `BulkSkipTrace` component, displayed parallel to `BulkEnroll`.

The `DashboardPropertyGrid` already has the multi-select infrastructure (`selectedIds` Set, toggle function, clearSelection). Just add BulkSkipTrace alongside BulkEnroll in the bottom bar.

```typescript
// The grid already does this — extend it:
{selectedLeadIds.length > 0 && (
  <>
    <BulkEnroll ... />
    <BulkSkipTrace
      selectedPropertyIds={selectedPropertyIds}  // need property IDs not lead IDs
      onClear={clearSelection}
    />
  </>
)}
```

**Note:** The current `selectedIds` stores `leadId` values. The Tracerfy action needs `propertyId`. The `PropertyWithLead` type has both `id` (= propertyId) and `leadId`. The grid component has the full `properties` array, so building a leadId→propertyId map is trivial.

### Pattern 4: Settings Page (parallel to Mail Settings)
**What:** `/settings/skip-tracing/page.tsx` with force-dynamic, fetches status + run history server-side, passes to client form.
**Follows:** Exact same structure as `/settings/mail/page.tsx` — hero banner (brand blue gradient), max-w-2xl container, animate-fade-in-up.

```typescript
// app/(dashboard)/settings/skip-tracing/page.tsx
export const dynamic = "force-dynamic";

export default async function SkipTracingSettingsPage() {
  const [status, runHistory] = await Promise.all([
    getTracerfyStatus(),
    getTracerfyRunHistory(),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Hero banner — brand blue gradient, same as mail settings */}
      <SkipTracingSettingsForm status={status} runHistory={runHistory} />
    </div>
  );
}
```

### Pattern 5: Run History Storage in scraperConfig
**What:** Store Tracerfy run history as JSON in `scraperConfig` keys. This avoids a schema migration for Phase 18.
**Keys:**
- `tracerfy.runHistory` — JSON array of `{ date, count, found, notFound, creditsUsed }` (keep last 50 entries)
- `tracerfy.monthlySpend` — JSON `{ month: "2026-04", creditsUsed: number }`
- `tracerfy.lowBalanceThreshold` — string (default "2.00")
- `tracerfy.monthlyCap` — string (default "50.00")

This follows the existing `mail.fromName`, `mail.resendApiKey` pattern exactly.

### Pattern 6: Auto-trace on Deal Creation
**What:** The "Start Deal" flow goes through `/deals/new?propertyId=X`. The `NewDealForm` component submits to `createDeal` server action. The auto-trace prompt must happen before the form submits.
**Implementation:** In `NewDealForm`, when `prefill.propertyId` is set and the property has no contacts, show a one-time dialog: "No contact info found. Run skip trace before creating the deal? (~$0.02)". 
- Yes → call `runSkipTrace(propertyId)` via useTransition, then submit the form
- No → submit the form immediately

This is client-side logic in `NewDealForm.tsx`. No server action changes needed to `createDeal` itself.

### Anti-Patterns to Avoid
- **Using Radix Dialog or shadcn Dialog:** Project uses `@base-ui/react` exclusively. Always import `* as Dialog from "@base-ui/react/dialog"`.
- **Dialog.Close with asChild:** `@base-ui/react` Dialog.Close does NOT support asChild. Use it directly with className.
- **Storing TRACERFY_API_KEY in DB:** Explicitly locked out of scope. Key lives only in Netlify env var. Never read it from DB, never write it to DB.
- **Polling in a useEffect loop client-side:** The polling must happen server-side in the "use server" action. The client just calls the action and awaits the Promise — the server action does the full submit → poll → store cycle.
- **N+1 property queries for bulk:** Fetch all property data in one query before submitting the batch, not one query per property.
- **Forgetting revalidatePath:** After storing results, call `revalidatePath("/properties/[id]")` to refresh the contact card. For bulk, use `revalidatePath("/")` to refresh the dashboard badges.

---

## Critical Bug Fix Required

### Tracerfy Field Name Mismatch
**What goes wrong:** The existing `storeResults()` in `tracerfy-enrichment.ts` reads fields `email_1`, `mobile_1`, `landline_1` (snake_case) but the actual Tracerfy API returns `Email-1`, `Mobile-1`, `Landline-1` (PascalCase-dash).

**Evidence:** `app/tracerfy-results.csv` confirms real field names:
```
primary_phone, Email-1, Email-2, Email-3, Email-4, Email-5,
Mobile-1, Mobile-2, Mobile-3, Mobile-4, Mobile-5,
Landline-1, Landline-2, Landline-3
```

**Fix:** When writing the frontend `tracerfy-actions.ts`, use the correct field names:
```typescript
// WRONG (from scraper — silently extracts nothing):
for (const field of ["email_1", "email_2", "mobile_1", "landline_1"]) { ... }

// CORRECT (matches actual API response):
for (const field of ["Email-1", "Email-2", "Email-3", "Email-4", "Email-5"]) { ... }
for (const field of ["Mobile-1", "Mobile-2", "Mobile-3", "Mobile-4", "Mobile-5"]) { ... }
for (const field of ["Landline-1", "Landline-2", "Landline-3"]) { ... }
// primary_phone is correct (lowercase)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirmation dialog | Custom modal with useState/portal | `@base-ui/react/dialog` | Already installed, handles focus trap, keyboard, accessibility |
| Balance polling on settings page | Client-side interval | Server action called on load | Simpler, no WebSocket needed, acceptable staleness |
| Run history persistence | New DB table | `scraperConfig` key-value (JSON) | Avoids schema migration; 50-entry history is small |
| Monthly spend tracking | New DB table | `scraperConfig` key-value | Same reason; simple JSON blob is sufficient |

**Key insight:** Every pattern needed here already exists in the codebase. BulkEnroll shows bulk action bars. MailSettings shows the settings page structure. ContactTab shows how to display source-badged contacts. No new infrastructure required.

---

## Common Pitfalls

### Pitfall 1: Netlify Function Timeout on Large Batches
**What goes wrong:** Netlify functions have a 10-second default timeout (26 seconds max with background functions). The Tracerfy poll loop in the scraper uses `POLL_INTERVAL_MS = 5000` and `MAX_POLL_ATTEMPTS = 120` (10 minutes). A bulk job of 100 properties could easily take 30-60 seconds.
**Why it happens:** Netlify serverless functions time out after 10s by default.
**How to avoid:** For bulk traces, keep the same pattern — the Netlify Next.js plugin upgrades background-capable routes to 26s max. Since 20+ properties could exceed that, consider processing in sub-batches of 10 with separate server action calls, or accept the risk that very large batches will time out. For 5-20 properties (typical use case), 26 seconds is enough.
**Warning signs:** User sees "Error: Gateway Timeout" or fetch hangs on large selections.

### Pitfall 2: Using Wrong Dialog Component
**What goes wrong:** Importing Dialog from shadcn or Radix instead of `@base-ui/react`.
**Why it happens:** shadcn is installed, auto-complete suggests it.
**How to avoid:** Always use `import * as Dialog from "@base-ui/react/dialog"`. Check `@base-ui/react` v1.3.0 API — it differs from Radix in that `Dialog.Close` does not accept `asChild`.
**Warning signs:** TypeScript error on `asChild` prop, or dialog doesn't close on button click.

### Pitfall 3: Lead ID vs Property ID Confusion in Bulk Select
**What goes wrong:** The dashboard grid's `selectedIds` Set stores `leadId` values (from `property.leadId`). Tracerfy needs `propertyId` (from `property.id`). Passing leadIds to the Tracerfy action will cause DB query failures.
**How to avoid:** In `DashboardPropertyGrid`, maintain a parallel `selectedPropertyIds` derived from the `properties` array, or pass a leadId→propertyId map to `BulkSkipTrace`.
**Warning signs:** `getPropertyDetail(leadId)` returns null for all properties.

### Pitfall 4: Address Matching Failure in storeResults
**What goes wrong:** The scraper's `storeResults()` matches results back to property by `address+city` string. If Tracerfy normalizes the address (e.g., "E MAIN ST" → "East Main Street"), the match fails and all results are logged as errors.
**How to avoid:** Pass the `property_id` as a custom field in the submitted JSON (the scraper already does this via `property_id` key) and match by that field instead of by address. Check if the queue results echo back the submitted `property_id` field.
**Warning signs:** High error counts in TracerfyStats despite successful API calls.

### Pitfall 5: Race Condition on Concurrent Traces
**What goes wrong:** User clicks "Skip Trace" twice before first completes. Two jobs submit for the same property. Both store results, creating duplicate `owner_contacts` rows.
**How to avoid:** The `onConflictDoUpdate` pattern in the DB insert handles this at the data layer — second write just updates the same row. Disable the button during `isPending` to prevent double-submit at the UI layer.

### Pitfall 6: Balance Not Refreshed Before Bulk Confirm
**What goes wrong:** Settings page shows stale balance. User confirms bulk trace with $0.50 balance thinking they have $5.00.
**How to avoid:** Fetch live balance via `getTracerfyStatus()` server action at the moment the confirmation dialog opens, not from cached page data. Pass balance as a prop that is fetched fresh when dialog triggers.

---

## Code Examples

### Tracerfy API Submit Pattern (corrected field names)
```typescript
// Source: verified against app/tracerfy-results.csv + scraper/src/sources/tracerfy-enrichment.ts

async function submitBatch(props: TracerfyInput[], apiKey: string): Promise<number> {
  const jsonData = props.map((p) => {
    const { first_name, last_name } = parseOwnerName(p.ownerName);
    return {
      property_id: p.id,   // echo-back key for matching
      first_name,
      last_name,
      address: p.address || "",
      city: p.city || "",
      state: "UT",
      zip: p.zip || "",
    };
  });

  const response = await fetch(`${BASE_URL}/trace/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      json_data: JSON.stringify(jsonData),
      address_column: "address",
      city_column: "city",
      state_column: "state",
      zip_column: "zip",
      first_name_column: "first_name",
      last_name_column: "last_name",
      trace_type: "normal",
    }),
  });
  const data = await response.json() as { queue_id: number; rows_uploaded: number };
  return data.queue_id;
}
```

### Correct Field Extraction (fixing the scraper bug)
```typescript
// Source: verified against app/tracerfy-results.csv

function extractPhonesAndEmails(row: Record<string, string>) {
  // primary_phone is lowercase (correct)
  const phones: string[] = [];
  if (row["primary_phone"]?.trim()) phones.push(row["primary_phone"].trim());

  // Mobile/Landline use PascalCase-dash (FIXED from scraper's snake_case)
  for (const field of ["Mobile-1", "Mobile-2", "Mobile-3", "Mobile-4", "Mobile-5"]) {
    if (row[field]?.trim()) phones.push(row[field].trim());
  }
  for (const field of ["Landline-1", "Landline-2", "Landline-3"]) {
    if (row[field]?.trim()) phones.push(row[field].trim());
  }

  // Email uses PascalCase-dash (FIXED)
  const emails: string[] = [];
  for (const field of ["Email-1", "Email-2", "Email-3", "Email-4", "Email-5"]) {
    if (row[field]?.trim()) emails.push(row[field].trim());
  }

  return { phones, emails };
}
```

### Polling Pattern (adapted for server action)
```typescript
// Source: scraper/src/sources/tracerfy-enrichment.ts (adapted)

async function pollUntilComplete(
  queueId: number,
  apiKey: string,
  maxWaitMs = 25000   // Stay under Netlify 26s limit
): Promise<{ download_url: string; credits_deducted: number }> {
  const pollInterval = 3000;
  const maxAttempts = Math.floor(maxWaitMs / pollInterval);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, pollInterval));
    const queues = await fetch(`${BASE_URL}/queues/`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" }
    }).then(r => r.json()) as Array<{ id: number; pending: boolean; download_url: string | null; credits_deducted: number }>;

    const queue = queues.find(q => q.id === queueId);
    if (!queue) throw new Error(`Queue ${queueId} not found`);
    if (!queue.pending && queue.download_url) {
      return { download_url: queue.download_url, credits_deducted: queue.credits_deducted };
    }
  }
  throw new Error(`Tracerfy queue ${queueId} timed out after ${maxWaitMs / 1000}s`);
}
```

### scraperConfig Key Constants Pattern
```typescript
// Source: app/src/types/index.ts (MAIL_SETTINGS_KEYS pattern)

export const TRACERFY_CONFIG_KEYS = {
  RUN_HISTORY: "tracerfy.runHistory",        // JSON array
  MONTHLY_SPEND: "tracerfy.monthlySpend",    // JSON { month, creditsUsed }
  LOW_BALANCE_THRESHOLD: "tracerfy.lowBalanceThreshold",  // "2.00"
  MONTHLY_CAP: "tracerfy.monthlyCap",        // "50.00"
} as const;

export interface TracerfyRunEntry {
  date: string;       // ISO date string
  count: number;
  found: number;
  notFound: number;
  creditsUsed: number;
}
```

### Dashboard Badge Pattern (for trace status)
```typescript
// Extension of property-card.tsx — add to PropertyWithLead type and PropertyCard

// In types/index.ts — add to PropertyWithLead:
traceStatus?: "traced_found" | "traced_not_found" | null;

// In queries.ts — add to getProperties():
// Add a CASE subquery on owner_contacts.source = 'tracerfy'

// In property-card.tsx — small icon next to touchpoint badge:
{property.traceStatus === "traced_found" && (
  <span title="Skip traced — results found" className="text-green-600">
    <Search className="h-3 w-3" />
  </span>
)}
{property.traceStatus === "traced_not_found" && (
  <span title="Skip traced — no results" className="text-muted-foreground">
    <SearchX className="h-3 w-3" />
  </span>
)}
```

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|-----------------|-------|
| Scraper-triggered Tracerfy (server-only, score >= 7 filter) | User-triggered from UI (any property, any time) | Phase 18 moves control to the user |
| Results stored only from scraper pipeline | Results stored from both scraper and UI triggers | `onConflictDoUpdate` handles both safely |
| No spend tracking | scraperConfig stores run history + monthly spend | Simple key-value, no schema migration |

---

## Open Questions

1. **Netlify timeout for large bulk batches**
   - What we know: Netlify standard functions have 10s timeout, Netlify background functions have 15 minutes
   - What's unclear: Does `@netlify/plugin-nextjs` route Next.js server actions through background functions automatically, or does it need explicit opt-in?
   - Recommendation: Test with 10 properties. If timeout occurs, split bulk into sub-batches of 5 in the server action loop.

2. **Does Tracerfy echo back `property_id` in queue results?**
   - What we know: The scraper submits `property_id` as a field in the JSON payload. The CSV results show address/city/state but it's unclear if custom fields echo back.
   - What's unclear: If `property_id` does NOT echo back, we must match by address (the scraper's current approach, which has edge cases).
   - Recommendation: On first real test trace, inspect the raw queue results JSON to confirm field echoing. The scraper's address-matching fallback is acceptable if needed.

3. **Real-time balance in confirmation dialog**
   - What we know: `getTracerfyStatus()` makes a live API call each time.
   - What's unclear: Whether there's noticeable latency (500ms-2s) that would make the dialog feel slow to open.
   - Recommendation: Pre-fetch balance when user makes first selection on dashboard (on first checkbox click), cache in component state. Show stale-if-error indicator.

---

## Sources

### Primary (HIGH confidence)
- `scraper/src/sources/tracerfy-enrichment.ts` — complete Tracerfy API client logic, field names, polling pattern, DB storage
- `app/tracerfy-results.csv` — actual API response columns: confirms `Email-1`, `Mobile-1`, `Landline-1` capitalization
- `app/src/components/campaigns/bulk-enroll.tsx` — bulk action bar pattern to replicate
- `app/src/lib/mail-settings-actions.ts` — settings page server action pattern
- `app/src/components/contact-tab.tsx` — contact card structure to extend with Skip Trace button
- `app/src/components/dashboard-property-grid.tsx` — existing multi-select infrastructure
- `app/src/db/schema.ts` — ownerContacts schema (source, phone, email, onConflict target)
- `app/src/app/(dashboard)/settings/mail/page.tsx` — settings page layout pattern
- `app/package.json` — confirms all needed libraries already installed

### Secondary (MEDIUM confidence)
- Netlify function timeout limits — 10s default, 26s max per Netlify docs (as of training knowledge; verify at https://docs.netlify.com/functions/get-started/)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in package.json; no new installs needed
- Architecture: HIGH — all patterns have direct analogues in existing codebase; extrapolation is minimal
- Tracerfy API behavior: HIGH for core (verified against actual CSV + working scraper code); MEDIUM for edge cases (timeout behavior, property_id echoing)
- Pitfalls: HIGH — field name mismatch confirmed by CSV evidence; others inferred from codebase patterns

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable domain; Tracerfy API unlikely to change)
