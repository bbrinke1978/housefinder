# Architecture Research

**Domain:** Distressed property lead generation (Next.js, serverless, public records scraping)
**Researched:** 2026-03-17
**Confidence:** MEDIUM — Netlify function limits verified via official docs; scraping patterns verified via multiple sources; database schema is derived from first principles plus comparable systems

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEDULED SCRAPING LAYER                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Netlify Scheduled Function (cron: daily at 6am)          │   │
│  │  Triggers → Netlify Background Function (15 min limit)    │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP POST (invoke)
┌─────────────────────────▼───────────────────────────────────────┐
│                    DATA PIPELINE LAYER                           │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐    │
│  │  Scraper      │  │  Parser /      │  │  Scorer          │    │
│  │  (fetch HTML  │  │  Normalizer    │  │  (signal count   │    │
│  │   + cheerio)  │──▶  (extract      │──▶   → score int)   │    │
│  │               │  │   structured   │  │                  │    │
│  └───────────────┘  │   records)     │  └────────┬─────────┘    │
│                     └───────────────┘            │              │
└──────────────────────────────────────────────────┼──────────────┘
                                                   │ upsert
┌──────────────────────────────────────────────────▼──────────────┐
│                    DATABASE LAYER (Neon Postgres)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  properties  │  │  owners      │  │  distress_signals    │  │
│  │              │◀─▶              │  │                      │  │
│  │              │  │              │  │  (one row per signal  │  │
│  └──────────────┘  └──────────────┘  │   type per property) │  │
│                                      └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  leads       │  │  lead_notes  │                            │
│  │  (status +   │  │              │                            │
│  │   score)     │  │              │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                          │ read
┌─────────────────────────▼───────────────────────────────────────┐
│                    APPLICATION LAYER (Next.js)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐  │
│  │  Dashboard │  │  Map View  │  │  Lead      │  │  Alerts  │  │
│  │  (list,    │  │  (react-   │  │  Detail    │  │  config  │  │
│  │   filter)  │  │   leaflet) │  │  + notes   │  │          │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          │ on new hot lead
┌─────────────────────────▼───────────────────────────────────────┐
│                    ALERT LAYER                                    │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │  Resend (email)      │  │  SMS provider (Twilio free tier  │ │
│  │  React Email         │  │  or Telnyx)                      │ │
│  │  templates           │  │                                  │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Scheduled trigger | Fire the daily pipeline at a fixed time | Netlify Scheduled Function with cron expression |
| Background scraper | Fetch + parse county pages for all 10 towns | Netlify Background Function (up to 15 min) using cheerio over raw HTTP |
| Parser / normalizer | Extract structured fields from raw HTML | cheerio selectors → typed objects |
| Scorer | Compute distress score from signal count | Pure function: count signals → integer score, flag score >= 2 as hot |
| Neon Postgres | Durable storage for all entities | Netlify DB (powered by Neon, free tier: 0.5 GB/project) |
| Next.js API routes | CRUD for leads, notes, alerts config | Route Handlers in /app/api/ |
| Dashboard UI | Browse, filter, status-update leads | React Server Components + client filter state |
| Map view | Pin properties geographically | react-leaflet loaded via next/dynamic (ssr: false) |
| Alert dispatcher | Email hot leads via Resend; SMS via provider | Called from background function after score computed |

## Recommended Project Structure

```
housefinder/
├── app/
│   ├── api/
│   │   ├── leads/           # GET list, PATCH status
│   │   ├── leads/[id]/      # GET detail, PATCH
│   │   ├── leads/[id]/notes/# POST note
│   │   └── scrape/trigger/  # POST — manual trigger (dev only)
│   ├── dashboard/
│   │   ├── page.tsx         # Lead list + filters
│   │   └── [id]/page.tsx    # Lead detail
│   ├── map/
│   │   └── page.tsx         # Map view
│   └── layout.tsx
├── components/
│   ├── map/                 # MapView.tsx (client-only, dynamic import)
│   ├── leads/               # LeadCard, StatusBadge, ScoreBadge
│   └── ui/                  # shadcn components
├── lib/
│   ├── db/
│   │   ├── schema.ts        # Drizzle table definitions
│   │   └── client.ts        # Neon connection singleton
│   ├── scraper/
│   │   ├── index.ts         # Orchestrator (loops towns)
│   │   ├── sources/
│   │   │   ├── carbon-county.ts   # Per-county scraper
│   │   │   └── utah-county.ts
│   │   └── parser.ts        # HTML → PropertyRecord
│   ├── scoring/
│   │   └── score.ts         # scoreProperty(signals[]) → number
│   └── alerts/
│       ├── email.ts         # Resend integration
│       └── sms.ts           # SMS provider integration
├── netlify/
│   └── functions/
│       ├── scrape-daily.ts  # Scheduled function (cron trigger)
│       └── scrape-run.ts    # Background function (does the work)
└── drizzle.config.ts
```

### Structure Rationale

- **netlify/functions/:** Netlify requires functions here. Two-function split is mandatory: scheduled functions have a 30-second limit; the actual scraping work needs up to 15 minutes so it lives in a background function that gets POSTed to by the scheduled trigger.
- **lib/scraper/sources/:** One file per county source. County record sites differ significantly (different HTML structures, URLs, pagination). Isolation prevents one county's scraper breakage from killing the whole run.
- **lib/scoring/:** Pure function with no I/O — easy to unit test and tune without touching the database.
- **components/map/:** Leaflet requires browser APIs (`window`). Keeping map components isolated makes the dynamic import boundary clean and obvious.

## Architectural Patterns

### Pattern 1: Two-Function Scraping Split (Trigger + Worker)

**What:** A Scheduled Function fires on cron, immediately POSTs to a Background Function, then returns. The Background Function does the real work.

**When to use:** Any long-running task on Netlify. Scheduled functions are capped at 30 seconds — far too short for scraping 10 county sites with HTTP delays. Background functions run up to 15 minutes.

**Trade-offs:** Adds one layer of indirection. The Background Function cannot return data to the caller (202 fires and client disconnects). Logs are the only visibility into background function results, so structured logging is mandatory.

**Example:**
```typescript
// netlify/functions/scrape-daily.ts
import { schedule } from '@netlify/functions'

export const handler = schedule('0 6 * * *', async () => {
  await fetch(`${process.env.URL}/.netlify/functions/scrape-run`, {
    method: 'POST',
    headers: { 'x-internal-token': process.env.INTERNAL_TOKEN! },
  })
  return { statusCode: 200 }
})

// netlify/functions/scrape-run.ts
// This is the background function — runs up to 15 minutes
export const handler = async (event: HandlerEvent) => {
  // Verify internal token to prevent public invocation
  // Loop counties, scrape, parse, score, upsert, alert
  return { statusCode: 202 }
}
```

### Pattern 2: HTML Scraping with cheerio (Not Headless Browser)

**What:** Fetch county pages with native `fetch`, parse HTML with cheerio. No Chromium.

**When to use:** When target pages render their data in plain HTML (county recorder sites typically do — they are not JavaScript-heavy SPAs). Use headless browser (playwright-core + @sparticuz/chromium) only if a county site requires JS execution.

**Trade-offs:** cheerio is 10-100x faster than Playwright and has no binary size issues. If a county switches to a JS-rendered interface, cheerio breaks silently — add response validation to detect this. Playwright on serverless works but requires @sparticuz/chromium (compressed binary) and careful size management since the full Chromium binary exceeds Netlify's 50 MB function size limit.

**Example:**
```typescript
import * as cheerio from 'cheerio'

async function scrapeCountyRecorder(url: string): Promise<RawRecord[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; housefinder-bot/1.0)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  const html = await res.text()
  const $ = cheerio.load(html)
  // Validate we got the expected structure before parsing
  if ($('.recording-table').length === 0) {
    throw new Error(`Unexpected page structure at ${url} — site may have changed`)
  }
  return $('.recording-row').map((_, el) => ({
    parcelId: $(el).find('.parcel-id').text().trim(),
    // ...
  })).get()
}
```

### Pattern 3: Map Component Dynamic Import (SSR Disabled)

**What:** Wrap all Leaflet/react-leaflet components in a single client component file. Import that file with `next/dynamic` and `ssr: false` at the page level.

**When to use:** Always, for any Leaflet usage in Next.js. Leaflet directly references `window` and `document` during module evaluation — SSR will fail without this pattern.

**Trade-offs:** The map is not server-rendered (no SEO loss since it's a private dashboard). First paint shows a loading state until the JS bundle loads. Acceptable for a dashboard app.

**Example:**
```typescript
// components/map/MapView.tsx  ← 'use client' at top
// All react-leaflet imports live here

// app/map/page.tsx
import dynamic from 'next/dynamic'
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <div className="h-full animate-pulse bg-muted" />,
})
```

### Pattern 4: Distress Signal Scoring via Signal Table

**What:** Store each distress signal as an individual row in a `distress_signals` table (not as boolean columns on the property). Compute the score by counting rows per property_id.

**When to use:** When the signal set may expand (adding code violations, probate, utility shutoffs later). Adding a new signal type requires no schema migration — just a new signal_type value.

**Trade-offs:** Slightly more complex queries than boolean columns. Count query is fast with an index on `property_id`. Avoids wide-table migrations as signal types grow.

**Example:**
```typescript
// Signal types: 'nod' | 'tax_lien' | 'lis_pendens' | 'probate' |
//               'code_violation' | 'utility_shutoff' | 'vacant'

// Score = count of distinct signals
const score = await db
  .select({ count: count() })
  .from(distressSignals)
  .where(eq(distressSignals.propertyId, id))

const isHot = score[0].count >= 2
```

## Data Flow

### Daily Scrape Flow

```
Netlify Cron (6am daily)
    ↓ (30s window)
Scheduled Function: POST to Background Function
    ↓ (202 immediately)
Background Function starts (up to 15 min)
    ↓
For each of ~10 county sources:
    fetch(countyUrl) → HTML
    cheerio.parse(HTML) → RawRecord[]
    normalize(RawRecord[]) → PropertyRecord
    upsert into properties table (on conflict update)
    upsert distress_signals (insert new, skip duplicates)
    compute score (count signals)
    if score >= 2 AND new_this_run:
        dispatch alert (Resend email + SMS)
    update leads.score + leads.distress_score
    ↓
Done — log summary counts
```

### User Request Flow

```
Mobile browser (user on phone)
    ↓
Next.js page (RSC) → fetch leads from Neon via Drizzle
    ↓
Server renders lead list HTML
    ↓
Client hydrates — filter/sort in client state (no additional fetches for simple filters)
    ↓
User taps lead → detail page (RSC)
    ↓
User updates status → PATCH /api/leads/[id] → Drizzle update
    ↓
User adds note → POST /api/leads/[id]/notes → insert note row
```

### Alert Dispatch Flow

```
Background function detects new hot lead (score >= 2)
    ↓
Resend.emails.send({ to, subject, react: <HotLeadEmail />, ... })
    ↓
SMS provider API call (phone number from owner contact record)
    ↓
Log: alert_sent = true on leads row (prevent duplicate alerts on re-run)
```

## Database Schema Design

### Core Tables

```sql
-- Canonical property record (one per parcel)
properties (
  id              uuid PRIMARY KEY,
  parcel_id       text UNIQUE NOT NULL,   -- county assessor parcel number
  address         text NOT NULL,
  city            text NOT NULL,
  state           text DEFAULT 'UT',
  zip             text,
  latitude        numeric(9,6),           -- for map pins
  longitude       numeric(9,6),
  county          text NOT NULL,
  property_type   text,                   -- residential, commercial, land
  bedrooms        int,
  bathrooms       numeric(3,1),
  sqft            int,
  year_built      int,
  estimated_value numeric(12,2),
  last_sale_date  date,
  last_sale_price numeric(12,2),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)

-- Property owners (one-to-many: one property may have multiple owners)
owners (
  id              uuid PRIMARY KEY,
  property_id     uuid REFERENCES properties(id),
  full_name       text,
  mailing_address text,
  phone           text,          -- from public voter rolls, assessor
  email           text,          -- rarely available from public sources
  source          text,          -- 'assessor' | 'voter_roll' | 'manual'
  created_at      timestamptz DEFAULT now()
)

-- Individual distress signals (one row per signal per property)
distress_signals (
  id              uuid PRIMARY KEY,
  property_id     uuid REFERENCES properties(id),
  signal_type     text NOT NULL,  -- 'nod' | 'tax_lien' | 'lis_pendens' |
                                  --  'probate' | 'code_violation' | 'vacant'
  recorded_date   date,
  source_url      text,
  raw_data        jsonb,          -- preserve original scraped data
  created_at      timestamptz DEFAULT now(),
  UNIQUE (property_id, signal_type, recorded_date)  -- deduplicate on re-run
)

-- Lead management (wraps a property with CRM fields)
leads (
  id              uuid PRIMARY KEY,
  property_id     uuid REFERENCES properties(id) UNIQUE,
  status          text DEFAULT 'new',  -- new | contacted | follow_up |
                                       --  closed | dead
  distress_score  int DEFAULT 0,       -- count of distress_signals rows
  is_hot          boolean DEFAULT false, -- score >= 2
  alert_sent      boolean DEFAULT false, -- prevent duplicate alerts
  assigned_to     text,                -- for future multi-user
  follow_up_date  date,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)

-- Notes per lead (CRM mini-journal)
lead_notes (
  id              uuid PRIMARY KEY,
  lead_id         uuid REFERENCES leads(id),
  body            text NOT NULL,
  created_at      timestamptz DEFAULT now()
)
```

### Key Indexes

```sql
CREATE INDEX ON distress_signals(property_id);
CREATE INDEX ON leads(is_hot, status);   -- dashboard hot lead filter
CREATE INDEX ON leads(follow_up_date);   -- follow-up queue
CREATE INDEX ON properties(city);        -- filter by target town
CREATE INDEX ON properties(latitude, longitude);  -- geo bounding box queries
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| County recorder sites | HTTP fetch + cheerio parse | Each county has unique HTML structure; isolate per source file |
| Neon Postgres (via Netlify DB) | Drizzle ORM + @neondatabase/serverless | Serverless driver required — avoids WebSocket issues in edge/serverless |
| Resend | Server-side API call, React Email templates | Verified working pattern for Next.js + Netlify |
| SMS provider | HTTP POST to provider API | Twilio free trial or Telnyx; abstract behind lib/alerts/sms.ts |
| react-leaflet | Client-only dynamic import | Must use `next/dynamic` with `ssr: false` — this is non-negotiable |
| OpenStreetMap tiles | Leaflet TileLayer pointing to tile.openstreetmap.org | Free, no API key; acceptable for low-traffic dashboard |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Scheduled fn → Background fn | HTTP POST with internal token | Token validates that only the scheduled fn can trigger scraping |
| Background fn → Database | Drizzle ORM over @neondatabase/serverless | Background functions run in Netlify's Node environment, not edge |
| Next.js API routes → Database | Drizzle ORM, server-side only | Never expose raw DB connection to client |
| Scraper → Alert dispatcher | Direct function call within background fn | No queue needed at this scale |
| Dashboard → API routes | fetch() from RSC or client component | Prefer RSC data fetching for initial load; client fetch for mutations |

## Suggested Build Order

Dependencies between components drive this order:

1. **Database schema + Drizzle setup** — everything else reads/writes to it. Get migrations working against Netlify DB (Neon) before writing any app code.

2. **Scraper: one county, one signal type** — prove the scraping pattern works end-to-end (fetch → parse → upsert) before building the pipeline scaffolding. Carbon County recorder (Price, UT) first.

3. **Netlify function scaffold (scheduled + background split)** — wire the two-function pattern. Invoke manually via POST during development; confirm background function can reach the database.

4. **Scoring engine** — pure function, write tests. Plug into the background function after upsert.

5. **Alert dispatcher (Resend email)** — fire when score >= 2. User already has Resend account. SMS can come later.

6. **Lead list dashboard (Next.js RSC)** — read from DB, no interactivity first. Proves the full pipeline visually.

7. **Lead detail + status + notes** — add the CRM layer. Status updates and notes.

8. **Map view** — react-leaflet with dynamic import. Comes late because it needs real lat/long data from the database (geocoding properties may need an extra step).

9. **Remaining county scrapers** — replicate the per-county scraper pattern for all 10 target towns. Each is mostly copy-paste with selector adjustments.

10. **SMS alerts** — add after email is confirmed working.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 user, 10 towns, ~500 properties | Current design is correct — monolith is fine. Neon free tier (0.5 GB) is ample. |
| 1-5 users, 50 towns, ~5,000 properties | No changes needed. Add DB index on city + is_hot composite if query degrades. |
| 10+ users, statewide, 50k+ properties | Background function time limit becomes a concern — split scraping into per-county background functions triggered in parallel. Consider moving to a dedicated scheduler (Railway, Render cron) if Netlify 15-min limit is hit. |

### Scaling Priorities

1. **First bottleneck:** Background function execution time. Scraping 10 sites sequentially is safe; 50+ sites may approach the 15-minute limit. Mitigation: parallelize county fetches with `Promise.allSettled()` (respect rate limits) or fan out to per-county background functions.

2. **Second bottleneck:** Neon free tier storage (0.5 GB). At 10 towns this is fine. At statewide scale (~500k properties), upgrade to Neon's paid tier ($19/month) or use a standalone Neon project directly.

## Anti-Patterns

### Anti-Pattern 1: Scraping Inside a Scheduled Function

**What people do:** Put all scraping logic directly in the scheduled function, expecting it to run to completion.

**Why it's wrong:** Netlify scheduled functions have a hard 30-second execution limit. Fetching and parsing 10 county sites with network I/O will exceed this by an order of magnitude. The function silently terminates mid-run.

**Do this instead:** Scheduled function POSTs to a background function. Background function does the actual work (15-minute limit). This is the only viable pattern on Netlify.

### Anti-Pattern 2: Importing Leaflet at the Module Level in Next.js

**What people do:** `import { MapContainer } from 'react-leaflet'` at the top of a Next.js page.

**Why it's wrong:** Leaflet accesses `window` during module evaluation. Next.js evaluates page modules server-side. The build crashes with `ReferenceError: window is not defined`. This issue persisted into Next.js 15 (confirmed January 2025).

**Do this instead:** Isolate all Leaflet imports in a dedicated `'use client'` component. Import that component at the page level using `next/dynamic` with `{ ssr: false }`.

### Anti-Pattern 3: Storing Distress Signals as Boolean Columns

**What people do:** Add `has_nod`, `has_tax_lien`, `has_lis_pendens` columns directly to the properties table.

**Why it's wrong:** Adding a new signal type requires a schema migration and deployment. The score computation is a sum of booleans that can't preserve signal metadata (recorded date, source URL). De-duplication logic on re-runs becomes complex.

**Do this instead:** One row per signal in a `distress_signals` table with a `signal_type` enum. Score = COUNT(*) per property_id. New signal types need no migration.

### Anti-Pattern 4: Storing Raw HTML or Full Page Content in the Database

**What people do:** Store the full scraped HTML per property to "preserve the original."

**Why it's wrong:** County pages may be 100KB+ each. At 500 properties × 10 signals = 50MB of HTML — blowing past Neon's 0.5 GB free tier quickly.

**Do this instead:** Store only the structured extracted data plus a `raw_data jsonb` column on `distress_signals` with the minimal fields extracted from the page. Store the source URL for traceability.

## Sources

- Netlify Scheduled Functions official docs: https://docs.netlify.com/build/functions/scheduled-functions/ (MEDIUM confidence — 30-second limit confirmed)
- Netlify Background Functions official docs: https://docs.netlify.com/build/functions/background-functions/ (MEDIUM confidence — 15-minute limit confirmed, free tier confirmed)
- Netlify DB (Neon) announcement: https://www.netlify.com/blog/netlify-db-database-for-ai-native-development/ (MEDIUM confidence)
- Neon free tier limits: https://neon.com/pricing (MEDIUM confidence — 0.5 GB storage, 100 CU-hours/month)
- react-leaflet Next.js SSR issue (persists in Next.js 15): https://github.com/PaulLeCam/react-leaflet/issues/1152 (MEDIUM confidence — multiple sources corroborate)
- Playwright Netlify binary size issue: https://answers.netlify.com/t/playwright-in-functions-failed-to-launch-chromium-because-executable-doesnt-exist/34053 (MEDIUM confidence — community-confirmed)
- Cheerio vs Playwright for scraping: https://proxyway.com/guides/cheerio-vs-puppeteer-for-web-scraping (LOW confidence — single source; use cheerio first, verify county sites don't require JS)
- Resend + Next.js: https://resend.com/docs/send-with-nextjs (HIGH confidence — official docs)

---
*Architecture research for: distressed property lead generation (HouseFinder)*
*Researched: 2026-03-17*
