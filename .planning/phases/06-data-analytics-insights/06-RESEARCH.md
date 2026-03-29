# Phase 6: Data Analytics & Insights - Research

**Researched:** 2026-03-26
**Domain:** Data visualization, analytics queries, new DB tables, CSV export — all within Next.js 15 / Drizzle ORM / PostgreSQL stack
**Confidence:** HIGH (stack well-understood, recharts workaround documented, query patterns validated)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Analytics Dashboard
- New "Analytics" section in sidebar navigation
- Sub-sections or tabs for different analytics views
- All charts start empty and populate as data accumulates — that's expected

#### Pipeline Conversion Funnel (ANALYTICS-01)
- Show lead progression rates: New → Contacted → Follow-Up → Closed/Dead
- Average time at each stage
- Use existing leads.status field for tracking

#### Market Comparison (ANALYTICS-02)
- Which cities/counties produce most hot leads
- Highest conversion rates by area
- Fastest deal timelines by market
- Data already available from existing properties + leads tables

#### Outreach Activity Tracking (ANALYTICS-03)
- Track call attempts per lead: answered, voicemail, no-answer, wrong-number
- Contact rates by source (Tracerfy vs manual)
- Needs a new activity/call log table or extend lead_notes

#### Trend Charts (ANALYTICS-04)
- Distressed property volume over time per city/county
- Spot markets heating up or cooling down
- Use first_seen_at timestamps from leads table

#### Scraper Health Dashboard (ANALYTICS-05)
- Per-county success rates from scraper_health table
- Data freshness indicators
- Degrading source alerts
- Data already available in scraper_health table

#### Lead Source Attribution (ANALYTICS-06)
- Which distress signal types (NOD, tax lien, etc.) produce most conversions
- Track which leads became deals
- Needs deal-to-lead linking (propertyId FK already exists on deals)

#### Activity Log (ANALYTICS-07)
- Capture all user actions: calls, notes, status changes with timestamps
- Personal productivity review
- lead_notes and deal_notes already capture some of this

#### CSV Export (ANALYTICS-08)
- Export all analytics data to CSV for external analysis
- Export filtered property lists, deal pipeline, buyer list

### Claude's Discretion
- Chart library selection (recharts is common with Next.js)
- Layout of analytics page (tabs vs scrolling sections)
- Data aggregation approach (server-side SQL vs client-side)
- How to handle empty states (no data yet)

### Deferred Ideas (OUT OF SCOPE)
- Real-time push notifications for scraper failures
- Automated weekly email reports
- Goal setting / KPI targets
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ANALYTICS-01 | Pipeline conversion funnel: lead progression rates (New → Contacted → Follow-Up → Closed/Dead) with average time at each stage | SQL COUNT/AVG queries on leads.status + leads.updatedAt; existing leads table sufficient |
| ANALYTICS-02 | Market comparison: which cities/counties produce most hot leads, highest conversion rates, fastest deal timelines | SQL GROUP BY city/county on existing properties + leads tables; deals.closingDate for timelines |
| ANALYTICS-03 | Outreach activity tracking: call attempts, outcomes (answered/voicemail/no-answer/wrong-number), contact rates by source | Needs new `call_logs` table; source field links to ownerContacts.source |
| ANALYTICS-04 | Trend charts: distressed property volume over time per city/county | SQL date_trunc('week', first_seen_at) GROUP BY city from leads table |
| ANALYTICS-05 | Scraper health dashboard: per-county success rates, data freshness, degrading source alerts | scraper_health table already has all required columns |
| ANALYTICS-06 | Lead source attribution: which distress signal types produce most conversions | JOIN distress_signals → leads → deals via propertyId FK on deals |
| ANALYTICS-07 | Activity log: all user actions (calls, notes, status changes) with timestamps | lead_notes/deal_notes cover notes+status changes; call_logs table covers call actions |
| ANALYTICS-08 | CSV export of all analytics data | Route Handler (GET) returning text/csv with Content-Disposition attachment header |
</phase_requirements>

---

## Summary

Phase 6 adds a comprehensive `/analytics` page to HouseFinder. The core technical work splits into three areas: (1) new SQL analytics queries aggregating existing data, (2) one new database table (`call_logs`) to support outreach tracking, and (3) a charting layer using recharts for visualization.

The project already contains all the data needed for ANALYTICS-01, 02, 04, 05, and 06. The `leads` table has `status`, `firstSeenAt`, `lastContactedAt`, and `updatedAt`. The `distress_signals` table has signal type. The `deals` table has `propertyId` FK for deal-to-lead linking. The `scraper_health` table is purpose-built for ANALYTICS-05. The one meaningful gap is ANALYTICS-03 (call outcome tracking) — `lead_notes` stores free-text notes and status changes but has no structured `outcome` field for call results. A minimal `call_logs` table is needed.

Recharts is the correct choice for this project: it works with React 19.1.0 (the current app version) with a one-line `npm overrides` workaround, it supports all required chart types (BarChart, LineChart, FunnelChart), and it integrates cleanly as a `"use client"` component in the existing Next.js 15 App Router pattern. For ANALYTICS-08, CSV download must be a Route Handler (`app/api/export/route.ts`), not a Server Action — Server Actions cannot return file/stream responses.

**Primary recommendation:** Use recharts 2.15.x with `npm overrides` for react-is@19.x. Build all analytics queries as server-side SQL aggregations. Route Handler for CSV export. Tabs layout for the analytics page (consistent with deals/pipeline tabs pattern).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^2.15.x | Bar, Line, Funnel, and Pie charts | Most popular React chart library; works in Next.js App Router with `"use client"`; supports all required chart types |
| react-is | 19.1.0 | React 19 peer dep fix for recharts | recharts internally uses react-is; must match React version to avoid blank charts |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 (already installed) | Format chart axis labels, compute time-at-stage | Already in project; use `format`, `formatDistanceStrict`, `differenceInDays` |
| Drizzle `sql` template | ^0.45.1 (already installed) | Raw SQL for date_trunc GROUP BY queries | Complex aggregations; use `db.execute<T>(sql`...`)` as existing pattern in queries.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | Chart.js / react-chartjs-2 | heavier bundle, similar React 19 issues |
| recharts | shadcn/ui Charts (built on recharts) | adds abstraction; not yet confirmed compatible with project's shadcn v4 setup; direct recharts gives more control |
| Route Handler for CSV | Server Action | Server Actions cannot return file streams; Route Handler is correct |
| SQL aggregation | Client-side aggregation | Server-side is faster on B1ms; avoids shipping raw data rows to browser |

**Installation:**
```bash
# In app/ directory
npm install recharts react-is@19.1.0
```

**package.json overrides block (required for React 19 compatibility):**
```json
{
  "overrides": {
    "react-is": "19.1.0"
  }
}
```

Note: The project uses npm (package-lock.json pattern), so use `"overrides"` at the top level of package.json, not `"pnpm.overrides"`.

---

## Architecture Patterns

### Recommended Project Structure
```
app/src/
├── app/(dashboard)/analytics/
│   └── page.tsx               # Server component: fetches all analytics data, renders tabs
├── app/api/export/
│   └── route.ts               # Route Handler: GET with ?type=leads|deals|buyers returns CSV
├── lib/analytics-queries.ts   # All analytics SQL queries (server-only)
├── lib/analytics-actions.ts   # Server Actions for call log CRUD
├── components/
│   ├── analytics-funnel.tsx   # "use client" — recharts FunnelChart/BarChart
│   ├── analytics-trends.tsx   # "use client" — recharts LineChart/AreaChart
│   ├── analytics-market.tsx   # "use client" — recharts BarChart grouped by city
│   ├── analytics-attribution.tsx # "use client" — recharts BarChart signal types
│   ├── analytics-scraper-health.tsx # "use client" or server — table with red/yellow/green
│   ├── analytics-activity-log.tsx  # "use client" or server — timeline list
│   └── call-log-form.tsx      # "use client" — form to log a call outcome
└── db/schema.ts               # + call_logs table migration
```

### Pattern 1: Server Component Fetches, Client Component Renders Charts

**What:** Analytics page is a Server Component that fetches aggregated data via SQL, then passes serialized arrays to `"use client"` chart components as props.
**When to use:** All analytics views in this phase.

```typescript
// app/(dashboard)/analytics/page.tsx (Server Component)
export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "pipeline" } = await searchParams;

  // Fetch only what the active tab needs (reduce DB load)
  const [funnelData, marketData] = await Promise.all([
    getPipelineFunnelData(),
    getMarketComparisonData(),
  ]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-bold mb-4">Analytics</h1>
      {/* Tab buttons as Links (same pattern as deals page) */}
      <AnalyticsFunnel data={funnelData} />
    </div>
  );
}
```

```typescript
// components/analytics-funnel.tsx (Client Component)
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function AnalyticsFunnel({ data }: { data: FunnelStage[] }) {
  if (data.every(d => d.count === 0)) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No pipeline data yet. Start tracking leads to see conversion rates.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="stage" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="var(--brand-500)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 2: Analytics SQL Queries (Drizzle raw SQL for aggregations)

**What:** Complex GROUP BY / date_trunc queries use `db.execute<T>(sql`...`)` — consistent with existing `getBigOperatorNames()` pattern in queries.ts.
**When to use:** All aggregation queries in analytics-queries.ts.

```typescript
// lib/analytics-queries.ts
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export interface FunnelStage {
  stage: string;
  count: number;
  avgDaysAtStage: number | null;
}

export async function getPipelineFunnelData(): Promise<FunnelStage[]> {
  const rows = await db.execute<{ status: string; count: string; avg_days: string | null }>(sql`
    SELECT
      status,
      COUNT(*)::int AS count,
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric(10,1) AS avg_days
    FROM leads
    GROUP BY status
    ORDER BY
      CASE status
        WHEN 'new' THEN 1
        WHEN 'contacted' THEN 2
        WHEN 'follow_up' THEN 3
        WHEN 'closed' THEN 4
        WHEN 'dead' THEN 5
        ELSE 6
      END
  `);
  return (rows.rows ?? []).map(r => ({
    stage: r.status,
    count: Number(r.count),
    avgDaysAtStage: r.avg_days ? Number(r.avg_days) : null,
  }));
}

export async function getPropertyTrendData(): Promise<TrendPoint[]> {
  // date_trunc to weekly buckets; use leads.first_seen_at
  const rows = await db.execute<{ week: string; city: string; count: string }>(sql`
    SELECT
      date_trunc('week', first_seen_at)::date::text AS week,
      p.city,
      COUNT(*)::int AS count
    FROM leads l
    JOIN properties p ON p.id = l.property_id
    WHERE l.first_seen_at IS NOT NULL
      AND l.first_seen_at > NOW() - INTERVAL '6 months'
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);
  return rows.rows ?? [];
}
```

### Pattern 3: New call_logs Table

**What:** Minimal table for ANALYTICS-03. Linked to leads via leadId. Structured outcome enum. Source string matches ownerContacts.source values.
**When to use:** Created in Wave 1 of Phase 6, migrated via drizzle-kit.

```typescript
// Addition to db/schema.ts
export const callOutcomeEnum = pgEnum("call_outcome", [
  "answered",
  "voicemail",
  "no_answer",
  "wrong_number",
]);

export const callLogs = pgTable(
  "call_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id")
      .notNull()
      .references(() => leads.id),
    outcome: callOutcomeEnum("outcome").notNull(),
    source: text("source"), // "manual" | "tracerfy" etc — matches ownerContacts.source
    durationSeconds: integer("duration_seconds"),
    notes: text("notes"),
    calledAt: timestamp("called_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_call_logs_lead_id").on(table.leadId),
    index("idx_call_logs_called_at").on(table.calledAt),
  ]
);
```

### Pattern 4: CSV Route Handler

**What:** GET `/api/export?type=leads` returns a CSV file as a download. No Server Action — Server Actions cannot return file streams.
**When to use:** ANALYTICS-08.

```typescript
// app/api/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPropertiesForExport } from "@/lib/analytics-queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") ?? "leads";

  let csv = "";
  let filename = "export.csv";

  if (type === "leads") {
    const rows = await getPropertiesForExport();
    csv = buildCsv(rows);
    filename = `leads-${new Date().toISOString().slice(0,10)}.csv`;
  }
  // ... other types

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function buildCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map(r =>
      headers.map(h => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ];
  return lines.join("\n");
}
```

### Pattern 5: Sidebar + Bottom Nav Addition

**What:** Add "Analytics" nav item to both `app-sidebar.tsx` and `bottom-nav.tsx`. Use `BarChart2` or `TrendingUp` from lucide-react (already installed).
**When to use:** First task of Phase 6.

```typescript
// In app-sidebar.tsx navItems array — add after Deals:
{ label: "Analytics", href: "/analytics", icon: BarChart2 },
```

Both `app-sidebar.tsx` and `bottom-nav.tsx` maintain identical `navItems` arrays and must both be updated.

### Pattern 6: Activity Log (Unified View)

**What:** ANALYTICS-07 does not need a new table. The `lead_notes` table already captures `noteType: "user" | "status_change"` with `previousStatus`/`newStatus`. The new `call_logs` table adds call actions. The activity log is a unified query that UNIONs both.
**When to use:** Activity Log tab in analytics page.

```typescript
// lib/analytics-queries.ts
export async function getRecentActivityLog(limit = 50): Promise<ActivityEntry[]> {
  const rows = await db.execute<ActivityEntry>(sql`
    SELECT
      'note' AS type,
      ln.created_at,
      ln.note_text AS description,
      ln.note_type AS sub_type,
      p.address,
      p.city,
      l.id AS lead_id
    FROM lead_notes ln
    JOIN leads l ON l.id = ln.lead_id
    JOIN properties p ON p.id = l.property_id
    UNION ALL
    SELECT
      'call' AS type,
      cl.called_at AS created_at,
      cl.outcome AS description,
      cl.source AS sub_type,
      p.address,
      p.city,
      cl.lead_id
    FROM call_logs cl
    JOIN leads l ON l.id = cl.lead_id
    JOIN properties p ON p.id = l.property_id
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);
  return rows.rows ?? [];
}
```

### Pattern 7: Scraper Health Status Colors

**What:** Red/yellow/green indicators based on `consecutiveZeroResults` and time since `lastSuccessAt`. No new table needed — `scraper_health` has everything.
**Logic:**
- Green: `consecutiveZeroResults === 0` AND `lastSuccessAt` within 36 hours
- Yellow: `consecutiveZeroResults >= 1` OR `lastSuccessAt` between 36-72 hours ago
- Red: `consecutiveZeroResults >= 3` OR `lastSuccessAt` older than 72 hours OR `lastRunAt` is null

### Anti-Patterns to Avoid

- **Fetching raw rows to client for client-side aggregation:** Always aggregate in SQL. The B1ms database is on the same Azure network as the App Service — this is fast. Shipping hundreds of property rows to the browser to count them in JavaScript wastes bandwidth and slows mobile.
- **Using Server Action for CSV download:** Server Actions return JavaScript values, not HTTP Response objects. Use a Route Handler for file downloads.
- **Forgetting `dynamic = "force-dynamic"` on the analytics page:** Analytics data changes constantly; build-time static rendering would show stale counts. Add `export const dynamic = "force-dynamic"` to the analytics page.tsx.
- **Mounting recharts without `"use client"`:** All recharts components require a browser DOM. The chart wrapper components must have `"use client"` at the top.
- **Skipping the react-is override:** Without `"overrides": { "react-is": "19.1.0" }` in package.json, recharts renders as a blank container with React 19.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar/line charts | SVG rendering, D3 scales | recharts | recharts handles axis scale, tooltip, responsive resize, animation — all complex |
| CSV row serialization | Custom string escaping | Simple `JSON.stringify` per cell (handles commas, quotes, newlines) | Standard approach for basic CSV; no library needed for this volume |
| Time-based bucketing | JavaScript date math on raw rows | PostgreSQL `date_trunc` in SQL | More accurate, runs at DB layer, no time zone bugs |
| Status ordering in funnel | Array sorting logic | CASE expression in SQL ORDER BY | SQL sort is cleaner and more maintainable |

**Key insight:** The database already holds all the data needed; the work is writing the right aggregation queries. Resist the urge to fetch raw data and compute analytics in JavaScript.

---

## Common Pitfalls

### Pitfall 1: Recharts Blank Charts with React 19
**What goes wrong:** `ResponsiveContainer` renders with zero dimensions; charts appear as empty white boxes.
**Why it happens:** recharts depends on `react-is` for element type checking; React 19 ships a different `react-is` than what recharts expects.
**How to avoid:** Add to `app/package.json`:
```json
"overrides": {
  "react-is": "19.1.0"
}
```
Then run `npm install react-is@19.1.0` and re-install.
**Warning signs:** Charts compile without errors but render invisible or zero-height.

### Pitfall 2: Server Action CSV Attempt
**What goes wrong:** Developer writes a Server Action that tries to `return new Response(csvData, { headers: ... })` — Next.js throws an error or the file download never triggers.
**Why it happens:** Server Actions serialize their return value as JSON. They cannot return HTTP Response objects.
**How to avoid:** CSV export must be a Route Handler at `app/api/export/route.ts` with a GET handler.
**Warning signs:** "Cannot serialize a Response object" error at runtime.

### Pitfall 3: Analytics Page Returns Stale Build-Time Data
**What goes wrong:** Scraper health, pipeline counts, and trend data show old numbers because Next.js statically rendered the analytics page at build time.
**Why it happens:** Next.js 15 App Router aggressively caches server components by default.
**How to avoid:** Add `export const dynamic = "force-dynamic"` to `app/(dashboard)/analytics/page.tsx`.
**Warning signs:** Numbers don't update after scraper runs; redeploying fixes it temporarily.

### Pitfall 4: Empty Charts with No Guidance
**What goes wrong:** A freshly installed app shows eight empty charts with no axis labels and no explanation. User thinks something is broken.
**Why it happens:** Data accumulates over time; charts will be empty initially by design.
**How to avoid:** Every chart component checks if all data values are zero. If so, render an empty state card: `"Start tracking calls to see your outreach stats"` or similar. See Pattern 1 example above.
**Warning signs:** Charts render with axes but no bars/lines visible.

### Pitfall 5: Forgetting to Update Both Nav Files
**What goes wrong:** Analytics link appears in the desktop sidebar but not in the mobile bottom nav (or vice versa).
**Why it happens:** The project maintains two separate navigation arrays: `app-sidebar.tsx` and `bottom-nav.tsx`. They are not shared.
**How to avoid:** Any nav change must update both files. The mobile bottom nav only shows 5 items — adding Analytics means deciding which item to drop or expanding the design.
**Warning signs:** Analytics accessible on desktop but invisible on mobile.

### Pitfall 6: call_logs Migration Not Applied on Azure
**What goes wrong:** App deploys but call log creation throws a "relation call_logs does not exist" error.
**Why it happens:** The project deploys schema migrations via `drizzle-kit migrate` as a deployment step, not automatically. If the migration isn't included in the deployment workflow, the table won't exist.
**How to avoid:** Verify the GitHub Actions workflow includes `drizzle-kit migrate` after each deploy. The existing workflow already does this — just ensure the new migration file is committed.

### Pitfall 7: UNION ALL in Activity Log Breaks on Missing Columns
**What goes wrong:** Activity log UNION query returns a DB error because `lead_notes` and `call_logs` have different columns.
**Why it happens:** SQL UNION ALL requires both SELECT lists to have the same number of columns with compatible types. Aliases must be used to normalize the shape.
**How to avoid:** Always use explicit column aliases in both SELECT arms of the UNION (as shown in Pattern 6). Test the SQL in a DB client before wiring it to the UI.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Recharts BarChart (client component)
```typescript
// "use client" required — recharts needs browser DOM
"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { label: string; value: number }[];
  emptyMessage?: string;
}

export function SimpleBarChart({ data, emptyMessage = "No data yet" }: Props) {
  const hasData = data.some(d => d.value > 0);
  if (!hasData) {
    return (
      <p className="text-center text-sm text-muted-foreground py-12">{emptyMessage}</p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Market Comparison Query
```typescript
// lib/analytics-queries.ts — Source: existing db.execute pattern from queries.ts
export interface MarketStat {
  city: string;
  totalLeads: number;
  hotLeads: number;
  conversionRate: number;
}

export async function getMarketComparisonData(): Promise<MarketStat[]> {
  const rows = await db.execute<{
    city: string;
    total: string;
    hot: string;
    converted: string;
  }>(sql`
    SELECT
      p.city,
      COUNT(DISTINCT l.id)::int AS total,
      COUNT(DISTINCT l.id) FILTER (WHERE l.is_hot = true)::int AS hot,
      COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'closed')::int AS converted
    FROM leads l
    JOIN properties p ON p.id = l.property_id
    WHERE l.distress_score > 0
    GROUP BY p.city
    ORDER BY hot DESC, total DESC
    LIMIT 20
  `);
  return (rows.rows ?? []).map(r => ({
    city: r.city,
    totalLeads: Number(r.total),
    hotLeads: Number(r.hot),
    conversionRate: Number(r.total) > 0
      ? Math.round((Number(r.converted) / Number(r.total)) * 100)
      : 0,
  }));
}
```

### Lead Source Attribution Query
```typescript
// Joins distress_signals → leads → deals via propertyId
export interface AttributionStat {
  signalType: string;
  totalLeads: number;
  convertedToDeals: number;
}

export async function getLeadSourceAttribution(): Promise<AttributionStat[]> {
  const rows = await db.execute<{
    signal_type: string;
    total: string;
    deals: string;
  }>(sql`
    SELECT
      ds.signal_type,
      COUNT(DISTINCT l.id)::int AS total,
      COUNT(DISTINCT d.id)::int AS deals
    FROM distress_signals ds
    JOIN leads l ON l.property_id = ds.property_id
    LEFT JOIN deals d ON d.property_id = ds.property_id
    WHERE ds.status = 'active'
    GROUP BY ds.signal_type
    ORDER BY deals DESC, total DESC
  `);
  return rows.rows ?? [];
}
```

### Scraper Health Status Logic
```typescript
// lib/analytics-queries.ts
import { scraperHealth } from "@/db/schema";
import { db } from "@/db/client";

export type HealthStatus = "green" | "yellow" | "red";

export interface ScraperHealthRow {
  county: string;
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastResultCount: number;
  consecutiveZeroResults: number;
  status: HealthStatus;
  freshnessHours: number | null;
}

export async function getScraperHealthData(): Promise<ScraperHealthRow[]> {
  const rows = await db.select().from(scraperHealth).orderBy(scraperHealth.county);
  const now = Date.now();

  return rows.map(r => {
    const freshnessMs = r.lastSuccessAt ? now - r.lastSuccessAt.getTime() : null;
    const freshnessHours = freshnessMs ? Math.round(freshnessMs / 3_600_000) : null;

    let status: HealthStatus = "green";
    if (r.consecutiveZeroResults >= 3 || freshnessHours === null || freshnessHours > 72) {
      status = "red";
    } else if (r.consecutiveZeroResults >= 1 || freshnessHours > 36) {
      status = "yellow";
    }

    return {
      county: r.county,
      lastRunAt: r.lastRunAt,
      lastSuccessAt: r.lastSuccessAt,
      lastResultCount: r.lastResultCount ?? 0,
      consecutiveZeroResults: r.consecutiveZeroResults,
      status,
      freshnessHours,
    };
  });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server Actions for file downloads | Route Handlers for CSV/binary responses | Next.js 13+ | Server Actions only return serializable values; Route Handlers are the correct API |
| Client-side chart data computation | Server-side SQL aggregation | Always the right approach for small DBs | Fewer bytes over the wire; no stale data |
| `<ResponsiveContainer>` without react-is fix | Add `"overrides": { "react-is": "19.1.0" }` | recharts 2.x + React 19 | Required to prevent blank charts |

**Deprecated/outdated:**
- Using Pages Router API routes for CSV export: Project uses App Router, use Route Handlers instead.
- Loading all property rows to browser and computing `Array.filter().length` for stats: The existing `getDashboardStats()` pattern with `count(*) filter (where ...)` is the correct approach; replicate it for analytics queries.

---

## Open Questions

1. **Bottom nav item count on mobile**
   - What we know: The mobile bottom nav currently shows 5 items (Dashboard, Map, Pipeline, Deals, Settings).
   - What's unclear: Adding Analytics would make 6 items — too many for comfortable mobile nav. Should Analytics replace Settings in the bottom nav (Settings is accessible from sidebar), or should the bottom nav get a "more" overflow?
   - Recommendation: Drop Settings from the bottom nav on mobile (it's accessible via the sidebar). Add Analytics in its place. Settings is rarely used on mobile compared to Analytics.

2. **call_logs table vs extending lead_notes**
   - What we know: lead_notes has `noteType` and free-text `noteText`. It could store calls as noteType="call" with outcome in noteText.
   - What's unclear: Extending lead_notes avoids a migration but makes analytics queries harder (parsing outcome from text vs querying a typed enum column).
   - Recommendation: New `call_logs` table. The structured `callOutcomeEnum` column makes aggregation queries clean and avoids text parsing. The migration cost is low (one table, simple schema).

3. **Trend chart date range**
   - What we know: `leads.first_seen_at` goes back to project start (Phase 1, ~March 2026). There may only be weeks of data.
   - What's unclear: Weekly buckets will look sparse initially. Monthly buckets might be too coarse.
   - Recommendation: Use weekly buckets but default the trend chart to "last 6 months" with a range picker. Show a helpful empty state if fewer than 2 data points exist.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase: `app/src/db/schema.ts`, `app/src/lib/queries.ts`, `app/src/lib/actions.ts` — confirmed table structure, query patterns, Server Action patterns
- Existing codebase: `app/src/components/app-sidebar.tsx`, `app/src/components/bottom-nav.tsx` — confirmed nav architecture
- Existing codebase: `app/src/app/(dashboard)/deals/page.tsx` — confirmed `force-dynamic`, tabs-as-Links pattern

### Secondary (MEDIUM confidence)
- [bstefanski.com: How to Fix Recharts Displaying an Empty Chart with React 19](https://www.bstefanski.com/blog/recharts-empty-chart-react-19) — recharts 2.15.1, react-is@19.0.0 override confirmed
- [recharts/recharts GitHub Issue #4558: Support React 19](https://github.com/recharts/recharts/issues/4558) — confirms the react-is issue is real and the override is the documented workaround
- [Next.js Discussions: Send file as response #15453](https://github.com/vercel/next.js/discussions/15453) — confirms Route Handlers for file download, not Server Actions

### Tertiary (LOW confidence)
- WebSearch results confirming `date_trunc` + Drizzle `db.execute()` SQL pattern — consistent with existing codebase patterns; LOW because not verified against specific Drizzle 0.45 docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts is confirmed working with React 19 with documented workaround; date-fns already installed; CSV via Route Handler is documented Next.js pattern
- Architecture: HIGH — all patterns are direct extensions of existing codebase patterns (db.execute, force-dynamic, "use client" chart wrappers, Link-based tabs)
- Pitfalls: HIGH — recharts/React 19 blank chart issue is well-documented; CSV/Server Action limitation is documented Next.js behavior; nav duplication is directly observed in codebase

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (recharts compatibility is the most volatile area; recheck if upgrading recharts past 2.15.x)
