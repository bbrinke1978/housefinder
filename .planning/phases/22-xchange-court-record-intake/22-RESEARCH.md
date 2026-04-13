# Phase 22: xchange-court-record-intake - Research

**Researched:** 2026-04-12
**Domain:** Agent-assisted court record ingestion into existing distress signal pipeline
**Confidence:** HIGH for DB schema and signal insertion (code confirmed); HIGH for API pattern (existing /api/leads route confirmed); MEDIUM for XChange result format (no live XChange access to verify exact HTML structure)

---

## Summary

Phase 22 adds court record-sourced distress signals by wiring an agent-assisted XChange workflow into the existing `distress_signals` pipeline. The user (or Claude with browser tools) searches Utah Courts XChange, copies results, and POSTs structured JSON to a new `/api/court-intake` endpoint. The endpoint parses, matches to properties, and inserts signals. The existing `scoreAllProperties()` then runs unchanged and the existing UI surfaces the new signals automatically.

All three target signal types (`probate`, `lis_pendens`, `code_violation`) are already in the `signalTypeEnum`. The `upsertSignal()` function in `scraper/src/lib/upsert.ts` already handles deduplication via `onConflictDoNothing()` on the unique index `(property_id, signal_type, recorded_date)`. No changes to existing tables are needed — the only schema addition is a new `court_intake_runs` audit table.

The primary implementation risk is address matching: XChange party addresses are mailing addresses, not necessarily the subject property address. Three-tier matching (exact normalized address, street number + name, owner name) is required, with unmatched cases staged in `court_intake_runs.unmatched_cases` for manual review. Silently discarding unmatched records violates XCHG-04.

**Primary recommendation:** Build in this order: (1) `/api/court-intake` endpoint with Zod validation and auth, (2) `xchange-intake.ts` matching logic, (3) `court_intake_runs` schema + migration, (4) manual test session against XChange. No new npm packages needed.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| XCHG-01 | Agent-assisted browser workflow searches XChange by county and case type (probate, code violation) | XChange is browser-only ($40/month subscription). Claude uses browser tools to log in, search by case type code (LM, ES, CO, GM, GT, EV, IF, MO) and county, then POSTs structured results to `/api/court-intake`. No automation — the agent is the browser. |
| XCHG-02 | Court record text parsed into structured data (case type, parties, address, filing dates) | Regex-based parsing is the correct approach. Case type codes are explicit (`LM`, `ES`, etc.). XChange result rows surface: case number, case type, filing date, party names, party addresses. Native JS RegExp, no new library. |
| XCHG-03 | Parsed records matched to existing properties via parcel ID, normalized address, or owner name | Three-tier match: (1) normalized address + city ILIKE against `properties.address` + `properties.city`, (2) street number + street name match same city, (3) owner name match against `properties.owner_name`. The `normalizeAddress()` function in `scraper/src/lib/upsert.ts` provides the normalization pattern to replicate. |
| XCHG-04 | Unmatched records staged for manual review (not silently discarded) | `court_intake_runs.unmatched_cases` (text/JSON) stores the array of unmatched case summaries. The response from `/api/court-intake` returns `{ matched, unmatched, signalsCreated }` so the agent can see and report back on unmatched records. |
| XCHG-05 | Matched records create distress signals (probate, code_violation, lis_pendens types) | All three signal types already exist in `signalTypeEnum`. `upsertSignal()` in `scraper/src/lib/upsert.ts` already handles insert with `onConflictDoNothing()` deduplication. No changes to `upsert.ts` needed — call it directly from `xchange-intake.ts`. |
| XCHG-06 | Court intake runs logged with audit trail (date, county, case type, match stats) | New `court_intake_runs` table: `id`, `run_at`, `county`, `cases_processed`, `properties_matched`, `signals_created`, `new_hot_leads`, `unmatched_cases` (JSON text), `agent_notes`. One additive migration, no existing tables touched. |
</phase_requirements>

---

## Standard Stack

### Core (No New Additions)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `zod` | ^4.3.6 | Validate incoming `/api/court-intake` POST body | Already in `package.json`; import as `from "zod/v4"` (project-wide pattern) |
| `drizzle-orm` | ^0.45.1 | Signal inserts and `court_intake_runs` writes | Already in use |
| `pg` | ^8.20.0 | DB client (via Drizzle client wrapper) | Already in use |
| `date-fns` | ^4.1.0 | Parse XChange `MM/DD/YYYY` filing dates | Already in `package.json` |
| Native `RegExp` | Node 18+ | XChange text field extraction | No install needed |

**No `npm install` needed for this phase.**

### Auth Pattern

The existing `/api/leads/route.ts` demonstrates the internal API key pattern used for agent-facing endpoints:

```typescript
// Validated pattern from app/src/app/api/leads/route.ts
const apiKey = request.headers.get("x-api-key");
const expectedKey = process.env.WEBSITE_LEAD_API_KEY;
if (!expectedKey || !apiKey || apiKey !== expectedKey) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

For `/api/court-intake`, use the same pattern with a new env var `COURT_INTAKE_API_KEY`. This key is stored in Netlify env vars and the agent includes it as `x-api-key` in the POST header.

### XChange Case Type Mapping

Confirmed from official Utah Courts documentation (`utcourts.gov/en/court-records-publications/records/xchange/case.html`):

```typescript
const CASE_TYPE_TO_SIGNAL: Record<string, "lis_pendens" | "probate" | "code_violation"> = {
  LM: "lis_pendens",   // Lien/Mortgage Foreclosure
  WG: "lis_pendens",   // Wrongful Lien
  EV: "lis_pendens",   // Eviction (post-foreclosure)
  ES: "probate",       // Estate / Personal Representative
  CO: "probate",       // Conservatorship
  GM: "probate",       // Guardian - Minor
  GT: "probate",       // Guardian - Adult
  OT: "probate",       // Other Probate
  TR: "probate",       // Trust
  IF: "code_violation",
  MO: "code_violation",
};
```

---

## Architecture Patterns

### Component Locations

```
app/src/app/api/court-intake/
  route.ts              ← POST endpoint (new)

app/src/lib/
  xchange-intake.ts     ← matching logic + signal insertion + audit log (new)

app/src/db/
  schema.ts             ← add courtIntakeRuns table (additive)

app/drizzle/
  0012_court_intake_runs.sql   ← migration (new, additive)
```

### Data Flow

```
Agent (Claude with browser tools)
  → logs into xchange.utcourts.gov
  → searches by case type + county + date range
  → extracts case records from search results
  → POSTs to POST /api/court-intake
      headers: { "x-api-key": COURT_INTAKE_API_KEY }
      body: CourtIntakePayload (see Zod schema below)
          ↓
  route.ts
    → validate x-api-key
    → Zod parse body
    → call processCourtIntake(cases, agentNotes)
          ↓
  xchange-intake.ts: processCourtIntake()
    → for each case:
        matchCaseToProperty(partyAddress, county) → propertyId | null
        if matched:
          upsertSignal(propertyId, { type, recordedDate, raw })   ← existing function
        else:
          push to unmatchedCases array
    → scoreAllProperties()   ← existing, call ONCE at end, not per case
    → db.insert(courtIntakeRuns).values({ stats, unmatchedCases })
    → return { matched, unmatched, signalsCreated, newHotLeads }
          ↓
  Response to agent: { matched: N, unmatched: M, signalsCreated: K }
```

### Zod Schema for POST Body

```typescript
// Source: modeled after existing /api/leads/route.ts Zod pattern
import { z } from "zod/v4";

const CourtCaseSchema = z.object({
  caseNumber: z.string().min(1).max(50),
  caseType: z.string().min(2).max(5),   // e.g. "LM", "ES"
  filingDate: z.string().optional(),     // "MM/DD/YYYY" or ISO
  partyName: z.string().optional(),      // defendant / respondent name
  partyAddress: z.string().optional(),   // mailing address of party
  county: z.string().min(1),             // "Carbon", "Emery", etc.
  rawText: z.string().optional(),        // full text from XChange for audit
});

const CourtIntakePayloadSchema = z.object({
  cases: z.array(CourtCaseSchema).min(1).max(500),
  agentNotes: z.string().optional(),    // free text from agent session
});
```

### `court_intake_runs` Table Definition

```typescript
// Add to app/src/db/schema.ts
export const courtIntakeRuns = pgTable("court_intake_runs", {
  id: serial("id").primaryKey(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  county: text("county"),                    // null = multi-county session
  casesProcessed: integer("cases_processed").notNull().default(0),
  propertiesMatched: integer("properties_matched").notNull().default(0),
  signalsCreated: integer("signals_created").notNull().default(0),
  newHotLeads: integer("new_hot_leads").notNull().default(0),
  unmatchedCases: text("unmatched_cases"),   // JSON array of unmatched case summaries
  agentNotes: text("agent_notes"),
});
```

Migration SQL (next number is 0012):

```sql
-- Migration 0012: Add court_intake_runs audit table for XChange court record intake
CREATE TABLE IF NOT EXISTS court_intake_runs (
  id SERIAL PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  county TEXT,
  cases_processed INTEGER NOT NULL DEFAULT 0,
  properties_matched INTEGER NOT NULL DEFAULT 0,
  signals_created INTEGER NOT NULL DEFAULT 0,
  new_hot_leads INTEGER NOT NULL DEFAULT 0,
  unmatched_cases TEXT,
  agent_notes TEXT
);
```

### Address Matching Logic

The `matchCaseToProperty()` function implements three tiers:

```typescript
// Tier 1: Normalized address + city (ILIKE)
// Normalize: lowercase, remove punctuation, collapse whitespace
function normalizeForMatch(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

// Query pattern (raw SQL via pg or Drizzle)
SELECT id FROM properties
WHERE lower(regexp_replace(address, '[^a-zA-Z0-9 ]', '', 'g'))
      ILIKE '%' || $1 || '%'
  AND city ILIKE $2
LIMIT 1

// Tier 2: Street number + primary street name, same city
// Extract: "123" from "123 Main St" → number="123", street="main"
// Match: WHERE address ILIKE '123%main%' AND city ILIKE 'Price'

// Tier 3: Owner name match (for review, not auto-signal)
// If partyName matches properties.owner_name (normalized), flag for manual review
// Do NOT auto-create signal on name-only match — too ambiguous
```

**Important constraint:** If no match across all three tiers, push the case to `unmatchedCases` array. Do not create a property stub. The architecture doc suggested creating stubs but the phase requirements (XCHG-04) only require staging for review — property creation from unmatched cases creates pollution risk with bad addresses.

### `upsertSignal()` Already Handles Everything

The existing function in `scraper/src/lib/upsert.ts` (lines 120-145) handles:
- Sentinel date `1970-01-01` when `recordedDate` is null
- `onConflictDoNothing()` for deduplication
- All required signal types including `probate`, `lis_pendens`, `code_violation`

Call it directly from `xchange-intake.ts`. No modifications to `upsert.ts` needed.

### `scoreAllProperties()` — Call Once at End

`scoreAllProperties()` (in `scraper/src/scoring/score.ts`, lines 195-260) queries ALL properties with active signals, computes scores, and upserts `leads` rows. It is not per-property.

**Pattern:** Batch all `upsertSignal()` calls, then call `scoreAllProperties()` once at the end of the session. This matches how every other scraper uses it (`dailyScrape.ts`, `emeryScrape.ts`, etc.). Do not call per-case.

### Anti-Patterns to Avoid

- **Calling `scoreAllProperties()` per case:** Wasteful — it re-queries all properties each time. One call at end of session.
- **Auto-creating property stubs for unmatched cases:** Creates junk data. Stage unmatched cases for review only.
- **Using `from "zod"` instead of `from "zod/v4"`:** The project consistently uses `from "zod/v4"` everywhere (confirmed across all lib files). Wrong import breaks type inference.
- **Owner-name-only auto-signal:** Tier 3 (owner name match) should flag for manual review, not auto-insert a signal. Owner names are not unique identifiers.
- **Storing `court_intake_runs` in the scraper DB client:** The scraper uses its own Drizzle client at `scraper/src/db/client.ts`. The `court_intake_runs` table is in the app — use the app's Drizzle client at `app/src/db/client.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signal deduplication | Custom duplicate check | `upsertSignal()` with `onConflictDoNothing()` | Already handles sentinel date edge case for null recordedDate |
| Property scoring after intake | Per-property scorer | `scoreAllProperties()` (call once) | Existing function re-scores everything; calling per-property would require duplicating scoring logic |
| Date normalization | Custom date parser | `date-fns` `parse()` with format `"MM/dd/yyyy"` | XChange uses `MM/DD/YYYY` format; date-fns already in package.json |
| Address normalization | New normalize function | Copy pattern from `normalizeAddress()` in `scraper/src/lib/upsert.ts` | That function handles Utah address quirks (grid streets, directionals) — same patterns apply |
| API key auth | Custom session or JWT | `x-api-key` header check against `process.env.COURT_INTAKE_API_KEY` | Exact same pattern as `/api/leads/route.ts` lines 34-43 |

---

## Common Pitfalls

### Pitfall 1: XChange Party Address Is Not the Property Address

**What goes wrong:** XChange shows the mailing address of the defendant (case party). A homeowner in foreclosure may have a different mailing address than the subject property — they may have already moved, or use a PO Box.

**Why it happens:** The court records record where to send legal notices, not the property subject to foreclosure. For probate cases especially, the estate representative may live out of state.

**How to avoid:** Implement all three match tiers. Expect 60-75% auto-match rate on first run — some manual review of unmatched cases will always be needed. Store `rawText` in `court_intake_runs.unmatched_cases` so the user can manually identify the property.

**Warning signs:** Match rate below 40% on first run — suggests address normalization logic needs tuning.

### Pitfall 2: `signalTypeEnum` Is a Postgres Enum — Adding Values Requires Migration

**What goes wrong:** If someone decides to add `"foreclosure"` as a distinct type from `"lis_pendens"`, attempting `db.insert(distressSignals).values({ signalType: "foreclosure" })` without a migration will throw a Postgres type violation error at runtime.

**Why it happens:** Drizzle enums map to `CREATE TYPE ... AS ENUM`. The TypeScript type allows the value, but Postgres rejects it.

**How to avoid:** The three existing types (`probate`, `lis_pendens`, `code_violation`) cover all XChange case types needed. Do not add `"foreclosure"` as a distinct type in this phase — use `lis_pendens` for `LM` cases. If distinction is needed later, it requires both a migration (`ALTER TYPE signal_type ADD VALUE 'foreclosure'`) AND updating the TypeScript enum in schema.ts.

### Pitfall 3: Drizzle Migration Numbering Conflict

**What goes wrong:** The migrations directory has two `0007_*.sql` files (`0007_lowly_vance_astro.sql` and `0007_nullable_lead_property_id.sql`). This suggests manual migrations are in use. If a new migration is named `0012_court_intake_runs.sql` but Drizzle's meta tracking doesn't include it, `drizzle-kit push` may behave unexpectedly.

**How to avoid:** Do not use `drizzle-kit push` (confirmed project pitfall from memory — shared DB with nobshomes). Write and run migration SQL manually using a targeted migration script. The existing project pattern is to write raw SQL migration files and execute them directly against the Azure PostgreSQL DB.

**Warning signs:** Any attempt to use `drizzle-kit push` on this project.

### Pitfall 4: `scoreAllProperties()` Does Not Send Alerts

**What goes wrong:** Developer expects `scoreAllProperties()` to trigger email/SMS alerts for new hot leads. It does not — it only upserts `leads` rows with `distress_score` and `is_hot`. Alert sending happens separately in the scraper pipeline.

**Why it happens:** The function name implies it does everything. Inspecting the code (lines 195-260 of `score.ts`) shows it returns `{ scored, hot }` counts only — no alert dispatch.

**How to avoid:** For Phase 22, `scoreAllProperties()` is sufficient — it will update lead scores. The existing daily scraper already handles alert sending for leads that become hot. XChange intake will update scores; if a lead becomes hot, the next daily scraper run's alert check will catch it. Do not attempt to trigger alerts from the court intake endpoint.

### Pitfall 5: Zod v4 Import Path

**What goes wrong:** Using `import { z } from "zod"` fails in this project because the package exports from `"zod/v4"`.

**How to avoid:** Always use `import { z } from "zod/v4"` — this is the consistent pattern across all 10+ existing lib files that use Zod.

---

## Code Examples

### `/api/court-intake` Route Structure

```typescript
// Source: modeled on app/src/app/api/leads/route.ts (confirmed working pattern)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { processCourtIntake } from "@/lib/xchange-intake";

export const dynamic = "force-dynamic";

// ... (Zod schemas as defined above)

export async function POST(request: NextRequest) {
  // Auth
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.COURT_INTAKE_API_KEY;
  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = CourtIntakePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  // Process
  const result = await processCourtIntake(parsed.data.cases, parsed.data.agentNotes);
  return NextResponse.json(result);
}
```

### `upsertSignal()` Call Pattern for Court Records

```typescript
// Source: scraper/src/lib/upsert.ts lines 120-145 (existing function)
// Use directly from xchange-intake.ts — no modification needed

await upsertSignal(propertyId, {
  type: "probate",                        // from CASE_TYPE_TO_SIGNAL map
  recordedDate: "2026-03-15",             // parse from XChange "Filing Date" field
  sourceUrl: `https://xchange.utcourts.gov/...`,
  raw: {
    caseNumber: "210900123",
    caseType: "ES",
    partyName: "Smith, John D",
    county: "Carbon",
    source: "xchange",
  },
});
```

### Date Parsing for XChange Format

```typescript
// XChange shows dates as "03/15/2026" (MM/DD/YYYY)
import { parse, isValid } from "date-fns";

function parseXchangeDate(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = parse(raw, "MM/dd/yyyy", new Date());
  if (!isValid(d)) return undefined;
  return d.toISOString().split("T")[0]; // "2026-03-15"
}
```

### Address Matching Query

```typescript
// Tier 1: Normalized address ILIKE match
// Use the app's Drizzle db client (not the scraper's)
import { db } from "@/db/client";
import { properties } from "@/db/schema";
import { sql, ilike, and } from "drizzle-orm";

async function matchByAddress(address: string, city: string): Promise<string | null> {
  const normalized = address.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const rows = await db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        sql`lower(regexp_replace(${properties.address}, '[^a-zA-Z0-9 ]', '', 'g')) ILIKE ${"%" + normalized + "%"}`,
        ilike(properties.city, city)
      )
    )
    .limit(1);
  return rows[0]?.id ?? null;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual copy-paste into DB | Agent POSTs structured JSON to `/api/court-intake` | Phase 22 (new) | Structured intake with audit trail vs ad-hoc |
| Scraper-only distress signals | Agent-assisted + scraper hybrid | Phase 22 (new) | XChange records not accessible by automated scraping |
| Flat signal storage | Deduplication via unique index `(property_id, signal_type, recorded_date)` | v1.0 | Already handles re-ingestion safely |

**Deprecated/outdated:**
- Attempting to automate XChange via Playwright/Puppeteer: violates Utah Courts ToS, generates unexpected per-search charges

---

## Open Questions

1. **XChange search result HTML structure**
   - What we know: XChange is a CORIS-backed portal. Results contain case number, case type, filing date, party names, addresses per the help docs.
   - What's unclear: Exact column layout, whether results are paginated HTML tables or a different format, whether the agent can copy as plain text or must parse HTML.
   - Recommendation: On the first agent XChange session, capture a sample of 5-10 raw case records and document the actual format. The regex patterns in STACK.md are good starting hypotheses but should be validated against live output before hardening.

2. **`court_intake_runs` in app DB vs scraper DB**
   - What we know: The `court_intake_runs` table is being added to `app/src/db/schema.ts` and written from the `/api/court-intake` endpoint (app layer).
   - What's unclear: Nothing — this is the right home. The scraper DB client is at `scraper/src/db/client.ts` and should not be imported from Next.js routes.
   - Recommendation: Confirmed: `court_intake_runs` lives in app schema, app DB client. No ambiguity.

3. **Match rate target and fallback behavior**
   - What we know: Three-tier matching is planned. First real run will reveal actual match rate.
   - What's unclear: Whether 70%+ is achievable on first run without tuning.
   - Recommendation: Log every match attempt (tier used, matched Y/N) in `raw_data` or agent notes. Use first session results to tune normalization before considering it production-ready.

---

## Sources

### Primary (HIGH confidence)

- `app/src/db/schema.ts` — confirmed `signalTypeEnum` values, `distressSignals` table structure including `uq_distress_signal_dedup` unique index
- `scraper/src/lib/upsert.ts` — confirmed `upsertSignal()` signature and deduplication behavior (`onConflictDoNothing`)
- `scraper/src/scoring/score.ts` lines 195-260 — confirmed `scoreAllProperties()` returns `{ scored, hot }` only, no alert dispatch
- `app/src/app/api/leads/route.ts` — confirmed `x-api-key` / `process.env.*` auth pattern for internal API endpoints
- `app/drizzle/` directory listing — confirmed next migration number is `0012`
- Utah Courts XChange subscription page (`utcourts.gov/en/court-records-publications/records/xchange/subscribe.html`) — $40/month, browser-only, no API
- Utah Courts case type codes (`utcourts.gov/en/court-records-publications/records/xchange/case.html`) — LM, ES, CO, GM, GT, EV, IF, MO codes confirmed

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — XChange regex patterns and case type mapping (research-derived, not yet validated against live XChange output)
- `.planning/research/ARCHITECTURE.md` — three-tier address matching strategy and `court_intake_runs` schema design

### Tertiary (LOW confidence)

- XChange result HTML format — not verified against live system; regex patterns are hypotheses until first real session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json; import patterns confirmed from existing code
- Architecture: HIGH for signal insertion path; MEDIUM for address matching (untested against live XChange data)
- Pitfalls: HIGH for schema/migration pitfalls (confirmed from codebase); MEDIUM for match rate expectations (no live data yet)

**Research date:** 2026-04-12
**Valid until:** 2026-07-12 (stable — XChange subscription pricing and case type codes change rarely; Utah Courts case type list last updated Feb 2022)
