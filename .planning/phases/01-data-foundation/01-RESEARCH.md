# Phase 1: Data Foundation - Research

**Researched:** 2026-03-17
**Domain:** Web scraping, PostgreSQL schema design, Azure Functions timer triggers, distress scoring engine
**Confidence:** MEDIUM (Azure Functions HIGH, Carbon County portal MEDIUM, recorder NOD scraping LOW)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Gentle rate limiting: 1-2 second delay between requests to county sites
- Historical signals preserved: when a distress signal resolves (e.g., tax paid), mark it as "resolved" but keep the record — history is valuable
- Daily scrape runs at 5-6 AM Mountain Time — data ready when user wakes up
- Tiered new-lead indicators: "New" badge on discovery, escalates to "Unreviewed" if not viewed within 48 hours — prevents stale new leads from getting buried
- Scoring rules must be configurable via settings — user wants to adjust weights and thresholds without code changes
- Score display: label + number + color coding (e.g., "Hot Lead 3" in red, "Distressed 1" in yellow)
- Mirror run4luv infrastructure pattern: App Service + PostgreSQL Flexible Server + GitHub Actions CI/CD
- Resource group: `rg-housefinder` in West US 3
- Production environment only (single user, no dev/prod split)
- Database: B1ms PostgreSQL Flexible Server (~$13/mo, always on)
- Scraper: Azure Functions with timer trigger (cron schedule, 5 AM MT daily)
- CI/CD from day one: GitHub Actions pipeline, push to main = auto deploy
- Start with Carbon County (Price, UT) only — prove the pipeline end-to-end before expanding
- Scraper health check: surface last successful run time, alert after 3 consecutive zero-result runs
- Utah is a trust deed state — NODs give ~90 day window before auction (informs urgency scoring)

### Claude's Discretion

- Scraper failure handling strategy (alert + pause vs retry + continue)
- County availability handling in the UI/data model
- Logging verbosity and observability approach
- Signal weighting algorithm and hot lead threshold formula
- Post-auction property lifecycle management
- Exact Azure Function plan/tier selection
- Database schema design details (table structure, indexes, constraints)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | System scrapes Carbon County (Price, UT) assessor records daily for property owner, address, tax status, and mortgage info | Carbon County property search uses wpDataTables WordPress plugin with AJAX at `/wp-admin/admin-ajax.php`; Playwright needed to render JS-dependent table |
| DATA-02 | System scrapes Carbon County recorder for NOD and lis pendens filings | Carbon County recorder has NO confirmed public online document search portal — this is HIGH RISK, see Open Questions |
| DATA-03 | System scrapes tax delinquency records for properties with unpaid taxes | Carbon County delinquent properties page is a JS-rendered wpDataTables table at `carbon.utah.gov/service/delinquent-properties/`; also annual PDF tax sale lists available |
| DATA-07 | System tracks first-seen date per property for new lead detection | `created_at` on properties table + `first_seen_at` dedicated column; tiered status logic in scoring engine |
| DATA-08 | System runs daily automated scraping on a scheduled basis | Azure Functions timer trigger with NCRONTAB `0 0 12 * * *` (5 AM MT = noon UTC); Dedicated plan = unbounded timeout |
| DATA-09 | System stores all scraped data in a persistent database with property as canonical entity | Azure PostgreSQL Flexible Server (B1ms); Drizzle ORM with `node-postgres`; parcel number as canonical deduplication key |
| SCORE-01 | System assigns distress signals per property (NOD, tax delinquent, lis pendens) | Individual rows in `distress_signals` table; signal_type enum; each signal has `recorded_date` and `status` (active/resolved) |
| SCORE-02 | System calculates distress score based on count of active signals per property | Pure function: COUNT active signals per property_id; stored as `distress_score` int on leads table; configurable weights in `scraper_config` table |
| SCORE-03 | System flags properties with 2+ distress signals as "hot leads" | Configurable threshold (default 2) stored in `scraper_config` table; `is_hot` boolean on leads updated on each scrape run |
| SCORE-04 | System distinguishes between signal types and displays each on property detail | Signal type stored as enum in `distress_signals`; recorded_date per signal enables timeline display |

</phase_requirements>

## Summary

Phase 1 builds the entire data backbone: the scraping pipeline for Carbon County records, the PostgreSQL schema with per-signal distress tracking, the configurable scoring engine, and the Azure Functions timer that runs it all daily. The project infrastructure has already shifted away from Netlify + Turso to Azure App Service + Azure PostgreSQL Flexible Server + Azure Functions, which removes the Netlify timeout constraint entirely — the Dedicated App Service plan supports unbounded function execution time, so a single scraper function can run as long as needed without the two-function split required on Netlify.

The key discovery in this research is that Carbon County's recorder office does NOT appear to have a publicly accessible online document search portal for NODs and lis pendens. The county recorder page only references in-person access and e-recording submission (via Simplifile), with no link to a searchable index of recorded instruments. This is the single highest-risk unknown in Phase 1: the NOD scraping that drives the entire distress signal pipeline may not be automatable without either a paid third-party aggregator or GRAMA bulk data requests. The assessor property search and the delinquent properties list ARE accessible online — both use a WordPress wpDataTables plugin that loads data via AJAX to `/wp-admin/admin-ajax.php`, which requires Playwright rather than Cheerio since the table is JS-rendered.

The Azure-side stack is straightforward and well-documented. Azure Functions v4 Node.js programming model with TypeScript, NCRONTAB timer trigger at `0 0 12 * * *` (noon UTC = 5 AM MT), `WEBSITE_TIME_ZONE` set to `America/Denver` as a simpler alternative, Drizzle ORM with the `node-postgres` driver, and SSL required for Azure PostgreSQL Flexible Server connections. The GitHub Actions deployment workflow uses `azure/functions-action@v1` with a publish profile secret and a `npm run build` step to compile TypeScript before deployment.

**Primary recommendation:** Treat the NOD/recorder scraping as the first task to MANUALLY VERIFY before writing any code — inspect the Carbon County recorder portal directly and identify whether a searchable index exists. If it does not, evaluate Utah Legal and Third-Party data sources (NETR Online data store at `datastore.netronline.com/search/8309` offers document images) as a fallback before the planner commits to a code-based scraping approach.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@azure/functions` | 4.x | Azure Functions TypeScript SDK v4 model | Official Microsoft SDK; v4 is the current generally available model with TypeScript-first design |
| `drizzle-orm` | 0.45.x | Type-safe PostgreSQL ORM | ~7.4kb bundle, zero deps, code-first schema, excellent TypeScript inference; faster cold starts than Prisma |
| `pg` (node-postgres) | 8.x | PostgreSQL driver for Drizzle | Standard driver for Azure PostgreSQL Flexible Server; supports SSL required by Azure |
| `drizzle-kit` | 0.30.x | DB migrations and schema push | Companion to drizzle-orm; handles PostgreSQL migrations and schema introspection |
| `playwright` | 1.x | Headless browser scraping | Required for Carbon County's JS-rendered wpDataTables property and delinquency tables; Cheerio cannot render JavaScript |
| `cheerio` | 1.x | Static HTML parsing | Use for any county pages that return static HTML; 10-100x faster than Playwright |
| `zod` | 3.x | Runtime scraped data validation | County fields change without notice; Zod safe-parse prevents bad data silently corrupting the DB |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `p-limit` | 6.x | Concurrency limiting | Cap parallel county requests at 2 max; prevents rate-limit bans and server hammering |
| `date-fns` | 4.x | Date parsing and manipulation | Computing days-since-filing for urgency scoring; formatting recording dates from county HTML |
| `dotenv` | 16.x | Local env management for Azure Functions Core Tools | Only needed for local `local.settings.json` override; Azure Functions reads env vars natively |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `playwright` for Carbon County | `cheerio` alone | Carbon County property search and delinquent properties both use wpDataTables JavaScript rendering — Cheerio will return empty tables. Playwright is mandatory for these two sources. |
| `pg` (node-postgres) | `postgres.js` | Both work with Drizzle. `pg` is more widely documented for Azure PostgreSQL SSL configurations. Either is fine. |
| Azure Functions timer | GitHub Actions scheduled workflow | GitHub Actions cron is a valid alternative if the Azure Function approach proves complex; uses the same repo CI/CD already planned. 6-hour job limit. |
| NCRONTAB timezone in code | `WEBSITE_TIME_ZONE` app setting | Setting `WEBSITE_TIME_ZONE=America/Denver` in Azure app settings lets you use `0 0 5 * * *` (5am directly) instead of computing UTC equivalent; simpler and DST-aware. |

**Installation:**
```bash
# Azure Functions v4 Node.js project scaffold
npm install -g azure-functions-core-tools@4 --unsafe-perm true
func init scraper --worker-runtime node --language typescript --model V4

# From project root
npm install @azure/functions drizzle-orm pg
npm install -D drizzle-kit @types/pg tsx typescript

# Scraping
npm install playwright cheerio zod

# Utilities
npm install p-limit date-fns

# Install Playwright browser (Chromium only)
npx playwright install chromium
```

## Architecture Patterns

### Recommended Project Structure

```
housefinder/
├── app/                          # Next.js frontend (Phase 2+)
├── scraper/                      # Azure Functions app (standalone)
│   ├── src/
│   │   ├── functions/
│   │   │   └── dailyScrape.ts    # Timer trigger function
│   │   ├── sources/
│   │   │   ├── carbon-assessor.ts    # Property owner/address data
│   │   │   ├── carbon-delinquent.ts  # Tax delinquency data
│   │   │   └── carbon-recorder.ts    # NOD/lis pendens (if accessible)
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle table definitions
│   │   │   ├── client.ts         # PostgreSQL connection singleton
│   │   │   └── migrations/       # drizzle-kit output
│   │   ├── scoring/
│   │   │   └── score.ts          # Pure scoring function
│   │   └── lib/
│   │       ├── logger.ts         # Structured logging wrapper
│   │       └── health.ts         # Scraper health tracking
│   ├── host.json
│   ├── local.settings.json       # .gitignored; dev env vars
│   ├── package.json
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── deploy-scraper.yml    # Azure Functions deploy workflow
└── drizzle.config.ts
```

### Pattern 1: Azure Functions v4 Timer Trigger (TypeScript)

**What:** A timer trigger function that runs on a cron schedule. The Dedicated App Service plan gives it unbounded execution time — no background function workaround needed unlike Netlify.

**When to use:** The single scraper function for Phase 1. One function handles all Carbon County sources sequentially.

**Example:**
```typescript
// Source: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
import { app, InvocationContext, Timer } from '@azure/functions';

export async function dailyScrape(myTimer: Timer, context: InvocationContext): Promise<void> {
  context.log('Daily scrape started', { scheduleStatus: myTimer.scheduleStatus });

  try {
    const assessorRecords = await scrapeAssessor(context);
    const delinquentRecords = await scrapeDelinquent(context);
    // NOD source: depends on what manual inspection reveals
    await upsertToDatabase(assessorRecords, delinquentRecords, context);
    await updateScrapeHealth({ success: true, county: 'carbon', context });
  } catch (err) {
    await updateScrapeHealth({ success: false, county: 'carbon', context });
    context.error('Daily scrape failed', err);
  }
}

app.timer('dailyScrape', {
  // NCRONTAB format: {second} {minute} {hour} {day} {month} {day-of-week}
  // With WEBSITE_TIME_ZONE=America/Denver, this fires at 5:00 AM Mountain
  schedule: '0 0 5 * * *',
  handler: dailyScrape,
});
```

**host.json for Dedicated plan (unbounded timeout):**
```json
{
  "version": "2.0",
  "functionTimeout": "-1",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true
      }
    }
  }
}
```

### Pattern 2: Playwright Scraper for wpDataTables

**What:** Carbon County property search and delinquent properties both use the WordPress wpDataTables plugin with AJAX loading. Cheerio sees empty tables. Playwright must wait for the AJAX response and table render.

**When to use:** Both `carbon.utah.gov/service/property-search/` and `carbon.utah.gov/service/delinquent-properties/` — confirmed JS-rendered.

**Example:**
```typescript
// Source: Verified via direct page inspection 2026-03-17
import { chromium } from 'playwright';

async function scrapeDelinquentProperties(): Promise<DelinquentRecord[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (compatible; housefinder-bot/1.0; +https://github.com/bbrinke1978/housefinder)',
  });

  await page.goto('https://www.carbon.utah.gov/service/delinquent-properties/', {
    waitUntil: 'networkidle',
  });

  // Wait for wpDataTable to finish AJAX load
  await page.waitForSelector('.wpDataTable tbody tr', { timeout: 15000 });

  const records = await page.evaluate(() => {
    const rows = document.querySelectorAll('.wpDataTable tbody tr');
    return Array.from(rows).map((row) => {
      const cells = row.querySelectorAll('td');
      return {
        parcelId: cells[0]?.textContent?.trim() ?? '',
        ownerName: cells[2]?.textContent?.trim() ?? '',  // Name column (index TBD — verify)
        year: cells[1]?.textContent?.trim() ?? '',
        principal: cells[4]?.textContent?.trim() ?? '',
        // NOTE: Verify column indices against live page before finalizing
      };
    });
  });

  await browser.close();

  return records.filter((r) => r.parcelId !== '');
}
```

**Important:** The column indices (0, 1, 2, 4) above are based on the field descriptions discovered during research but must be verified against the live page. The table has columns: Parcel, Year, Name, Name2, Add1, Add2, City, State, Zip, Status, PropertyAddress, PropertyCity, PropertyZip, ChangeDateTime, District, TaxInfo, EntryNumber, SubDivision, Acres, Protected, ZipDPoint, ReviewDateTime, STR, Mortgage, Due.

### Pattern 3: Drizzle ORM + Azure PostgreSQL Flexible Server

**What:** Connect Drizzle to Azure PostgreSQL with SSL required. Use a connection pool for the scraper function which runs infrequently but may have long-running queries.

**When to use:** All database writes from the scraper function.

**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new (verified 2026-03-17)
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Azure PostgreSQL Flexible Server requires SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: true }, // Azure uses a trusted CA cert
  max: 3, // Small pool — scraper runs sequentially, not concurrently
});

export const db = drizzle({ client: pool });
```

### Pattern 4: Configurable Scoring Engine

**What:** Scoring weights and hot lead threshold stored in a `scraper_config` table, not hardcoded. A pure function reads the config and applies it to a property's active signals.

**When to use:** Every time a property is scored after a scrape run.

**Recommendation on weighting (Claude's discretion):** Use weighted scoring, not equal count. Real estate investment patterns suggest: NOD has a hard deadline (90-day auction window) making it the highest-urgency signal; tax lien is serious but can be redeemed; lis pendens indicates active litigation which may or may not resolve. Recommended weights: NOD = 3, tax_lien = 2, lis_pendens = 2. Hot lead threshold default = 4 (a property with NOD alone = 3, doesn't trigger; NOD + tax lien = 5, does trigger). This prevents single-NOD properties from flooding the hot lead queue.

**Example:**
```typescript
// Source: Architecture pattern derived from first principles
interface SignalConfig {
  signal_type: string;
  weight: number;
  freshness_days: number; // signal older than this is considered stale
}

interface ScoringConfig {
  signals: SignalConfig[];
  hot_lead_threshold: number;
}

function scoreProperty(
  signals: Array<{ signal_type: string; recorded_date: Date; status: string }>,
  config: ScoringConfig
): { score: number; is_hot: boolean } {
  const now = new Date();
  const activeSignals = signals.filter((s) => s.status === 'active');

  const score = activeSignals.reduce((total, signal) => {
    const signalConfig = config.signals.find((c) => c.signal_type === signal.signal_type);
    if (!signalConfig) return total;

    // Degrade score for stale signals
    const ageInDays = (now.getTime() - signal.recorded_date.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > signalConfig.freshness_days) return total;

    return total + signalConfig.weight;
  }, 0);

  return { score, is_hot: score >= config.hot_lead_threshold };
}
```

### Anti-Patterns to Avoid

- **Scraping recorder NOD data without manually verifying portal existence first:** Carbon County recorder has no confirmed online document search. Writing a scraper before manually inspecting the portal will produce dead code.
- **Using Cheerio on Carbon County property/delinquent tables:** Both confirmed JS-rendered via wpDataTables AJAX. Cheerio returns empty tables with no error — a silent failure that looks like "no new properties."
- **Hardcoding scoring weights:** User explicitly requires configurable weights. Any hardcoded threshold will require code changes to adjust.
- **Setting `runOnStartup: true` in production:** Azure Functions docs specifically warn against this on non-Consumption plans — it fires on every scale-out event causing unexpected runs.
- **Missing `ssl: true` on the PostgreSQL connection:** Azure PostgreSQL Flexible Server enforces SSL. A connection without SSL fails with a connection error that may be confusing without this context.
- **Storing `WEBSITE_TIME_ZONE` on Linux Consumption plan:** The docs note it causes SSL issues on Linux Consumption. Since this project uses a Dedicated App Service plan, it is safe to use.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JS-rendered table scraping | Custom XMLHttpRequest interceptor or direct AJAX replication | `playwright` with `waitForSelector` | wpDataTables AJAX parameters include nonces and session tokens; intercepting is fragile. Playwright waits for the final rendered DOM. |
| Database migrations | Manual SQL files | `drizzle-kit generate` + `drizzle-kit migrate` | Handles PostgreSQL-specific DDL, column renames, constraint additions without manual error-prone SQL |
| Cron scheduling | `node-cron` in a long-running process | Azure Functions timer trigger | Azure Functions timer uses storage lock to guarantee single execution even across scale-out; `node-cron` in a server process has no such guarantee |
| Connection pool management | Custom `pg.Client` lifecycle | `pg.Pool` with Drizzle | Pool handles reconnection on Azure PostgreSQL's idle connection timeouts (default 10 minutes) |
| Signal deduplication | Application-level "check before insert" | PostgreSQL `UNIQUE` constraint + `ON CONFLICT DO NOTHING` | Race conditions between scrape runs; DB-level constraint is atomic |

**Key insight:** The DB-level UNIQUE constraint on `(property_id, signal_type, recorded_date)` is the correct deduplication mechanism — not application-level existence checks. On re-runs, `INSERT ... ON CONFLICT DO NOTHING` for signals that already exist is both simpler and safer.

## Common Pitfalls

### Pitfall 1: Carbon County Recorder Has No Online Document Search Portal

**What goes wrong:** The NOD and lis pendens scraper is planned but the Carbon County recorder's website has no confirmed public online document search index. The recorder page mentions "access select records online" but provides no URL. Deeds.com confirms e-recording is "coming soon" (not available). No grantor/grantee index URL was found in research.

**Why it happens:** Assumption that county government websites are uniform. Carbon County is a small rural county (pop ~20k); its digital infrastructure is minimal compared to larger Utah counties.

**How to avoid:** Manually inspect the recorder's office website and call the office (435-636-3265 / recorders@carbon.utah.gov) before writing any code. NETR Online provides a document image store at `datastore.netronline.com/search/8309` for Carbon County — this may be the only online path to recorded NOD data.

**Warning signs:** No scraper code exists for the recorder source and no one has manually verified the portal before planning begins.

### Pitfall 2: wpDataTables Columns Shift Without Warning

**What goes wrong:** The delinquent properties table has 25+ columns. The scraper extracts columns by index (0, 2, 4...). When the county IT team adds or removes a column, every subsequent parse is silently offset — owner names end up in address fields.

**Why it happens:** Index-based parsing assumes stable column order. County websites are updated without version control or notification.

**How to avoid:** Parse by column header text, not by index. Use Playwright to find the `<th>` elements and build a dynamic column-to-index map before parsing rows:
```typescript
const headers = await page.$$eval('thead th', (ths) => ths.map((th, i) => ({ name: th.textContent?.trim() ?? '', index: i })));
const parcelIndex = headers.find((h) => h.name === 'Parcel')?.index ?? 0;
```

**Warning signs:** Parcel IDs that look like dates, or owner names that look like parcel numbers.

### Pitfall 3: Azure PostgreSQL Flexible Server Idle Connection Timeout

**What goes wrong:** The scraper runs at 5 AM, finishes in ~10 minutes, then the Azure Function sits idle for 24 hours. The PostgreSQL Flexible Server closes idle connections after its `tcp_keepalives_idle` setting (default varies; B1ms tier typically 10 minutes). The next day's scrape opens connections from the pool, which are already closed server-side, and gets a "connection terminated unexpectedly" error.

**Why it happens:** Connection pooling assumes connections stay open. Azure PostgreSQL's B1ms tier has conservative connection limits and idle timeouts.

**How to avoid:** Configure `pg.Pool` with `idleTimeoutMillis` set lower than the server's idle timeout, and `connectionTimeoutMillis` to handle reconnects:
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: true },
  max: 3,
  idleTimeoutMillis: 300000,    // 5 minutes — release idle connections before server kills them
  connectionTimeoutMillis: 5000, // 5s timeout for new connection attempts
});
```

**Warning signs:** First-run of the day produces "Connection terminated unexpectedly" errors; subsequent retries in the same run succeed.

### Pitfall 4: Scraper Returns Zero Results With No Error

**What goes wrong:** Carbon County updates their WordPress site. The wpDataTable plugin is upgraded, the CSS class changes from `.wpDataTable` to `.dataTable`, Playwright's `waitForSelector` times out. The error is caught, logged, and the scraper reports "0 new properties" — which looks like a slow day, not a broken scraper.

**Why it happens:** Selectors break silently. Zero-result scrape runs are indistinguishable from "slow news days" without monitoring.

**How to avoid:** Track consecutive zero-result runs per scraper source in the database. After 3 consecutive zero-result runs from a source that normally has data, fire a system health alert (logged as ERROR, not just INFO). The health check is part of Phase 1, not a future enhancement:
```typescript
async function updateScrapeHealth(params: { county: string; resultCount: number; success: boolean }): Promise<void> {
  // Upsert to scraper_health table: last_run_at, last_success_at, consecutive_zero_results
  // If consecutive_zero_results >= 3, log at ERROR level
}
```

**Warning signs:** `consecutive_zero_results` field in `scraper_health` table reaching 2 is the first warning.

### Pitfall 5: NOD Urgency Not Factored Into Lead Status

**What goes wrong:** Utah's non-judicial trust deed foreclosure process gives ~90 days from NOD recording to auction. An NOD filed 85 days ago is nearly at auction — the lead is cold. An NOD filed 5 days ago is hot regardless of other signals. If scoring only counts signals without factoring in NOD age, a 5-year-old unresolved NOD (unlikely but possible) could score the same as a fresh one.

**Why it happens:** Score-by-count approach ignores temporal dimension of NOD urgency.

**How to avoid:** The `freshness_days` field in the scoring config (see Pattern 4 above) handles this. Set NOD `freshness_days` to 75 (active window before auction) so that NODs older than 75 days are excluded from the weighted score. Store `recorded_date` per signal — this is a DATA-01 requirement.

**Warning signs:** NODs with `recorded_date` > 75 days ago still contributing to `is_hot = true` flags.

## Code Examples

Verified patterns from official sources:

### Azure Functions v4 Timer Trigger (TypeScript)

```typescript
// Source: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
import { app, InvocationContext, Timer } from '@azure/functions';

export async function dailyScrape(myTimer: Timer, context: InvocationContext): Promise<void> {
  context.log('Timer function started.', {
    isPastDue: myTimer.isPastDue,
    scheduleStatus: myTimer.scheduleStatus,
  });
}

app.timer('dailyScrape', {
  // NCRONTAB: {second} {minute} {hour} {day} {month} {day-of-week}
  // Set WEBSITE_TIME_ZONE=America/Denver in Azure App Settings for DST awareness
  schedule: '0 0 5 * * *',
  runOnStartup: false, // NEVER true in production
  handler: dailyScrape,
});
```

### Drizzle ORM Schema for Properties + Distress Signals

```typescript
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new + project-specific design
import { boolean, date, index, integer, pgEnum, pgTable, serial, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const signalTypeEnum = pgEnum('signal_type', ['nod', 'tax_lien', 'lis_pendens', 'probate', 'code_violation', 'vacant']);
export const signalStatusEnum = pgEnum('signal_status', ['active', 'resolved']);
export const ownerTypeEnum = pgEnum('owner_type', ['individual', 'llc', 'trust', 'estate', 'unknown']);

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  parcelId: text('parcel_id').notNull().unique(), // Canonical deduplication key
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull().default('UT'),
  zip: text('zip'),
  county: text('county').notNull(),
  ownerName: text('owner_name'),
  ownerType: ownerTypeEnum('owner_type').default('unknown'),
  propertyType: text('property_type'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('properties_city_idx').on(t.city),
  index('properties_county_idx').on(t.county),
]);

export const distressSignals = pgTable('distress_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id),
  signalType: signalTypeEnum('signal_type').notNull(),
  status: signalStatusEnum('status').notNull().default('active'),
  recordedDate: date('recorded_date'),
  sourceUrl: text('source_url'),
  rawData: text('raw_data'), // JSON string — preserve original scraped data
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => [
  index('distress_signals_property_idx').on(t.propertyId),
  index('distress_signals_type_idx').on(t.signalType),
  // Deduplication: same signal type for same property on same recorded date
  unique('distress_signals_dedup_key').on(t.propertyId, t.signalType, t.recordedDate),
]);

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').notNull().references(() => properties.id).unique(),
  status: text('status').notNull().default('new'), // new | contacted | follow_up | closed | dead
  newLeadStatus: text('new_lead_status').notNull().default('new'), // new | unreviewed (escalates after 48h)
  distressScore: integer('distress_score').notNull().default(0),
  isHot: boolean('is_hot').notNull().default(false),
  alertSent: boolean('alert_sent').notNull().default(false),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow(),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('leads_is_hot_idx').on(t.isHot, t.status),
  index('leads_new_status_idx').on(t.newLeadStatus),
]);

export const scraperHealth = pgTable('scraper_health', {
  id: serial('id').primaryKey(),
  county: text('county').notNull().unique(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastResultCount: integer('last_result_count').default(0),
  consecutiveZeroResults: integer('consecutive_zero_results').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const scraperConfig = pgTable('scraper_config', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(), // e.g. 'nod_weight', 'hot_lead_threshold'
  value: text('value').notNull(),     // JSON-serialized number or object
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

### PostgreSQL Upsert Pattern (Drizzle)

```typescript
// Source: Drizzle ORM docs - conflict resolution
import { eq } from 'drizzle-orm';

async function upsertProperty(record: PropertyRecord): Promise<string> {
  // Insert or update on parcel_id conflict
  const [property] = await db
    .insert(properties)
    .values({
      parcelId: record.parcelId,
      address: record.address,
      city: record.city,
      county: 'carbon',
      ownerName: record.ownerName,
      ownerType: classifyOwnerType(record.ownerName),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: properties.parcelId,
      set: {
        address: record.address,
        ownerName: record.ownerName,
        ownerType: classifyOwnerType(record.ownerName),
        updatedAt: new Date(),
      },
    })
    .returning({ id: properties.id });

  return property.id;
}

async function upsertSignal(propertyId: string, signal: SignalRecord): Promise<void> {
  // Idempotent — insert only if this exact signal doesn't exist yet
  await db
    .insert(distressSignals)
    .values({
      propertyId,
      signalType: signal.type,
      recordedDate: signal.recordedDate,
      status: 'active',
      sourceUrl: signal.sourceUrl,
      rawData: JSON.stringify(signal.raw),
    })
    .onConflictDoNothing(); // UNIQUE (property_id, signal_type, recorded_date)
}
```

### GitHub Actions Workflow for Azure Functions (Node.js/TypeScript, Linux)

```yaml
# Source: https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-github-actions
name: Deploy Scraper to Azure Functions

on:
  push:
    branches: [main]
    paths:
      - 'scraper/**'

env:
  AZURE_FUNCTIONAPP_NAME: 'func-housefinder-scraper'
  AZURE_FUNCTIONAPP_PACKAGE_PATH: './scraper'
  NODE_VERSION: '20.x'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: '${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}/package-lock.json'

      - name: Install and Build
        run: |
          pushd '${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}'
          npm ci
          npm run build --if-present
          popd

      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: ${{ env.AZURE_FUNCTIONAPP_NAME }}
          package: ${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Netlify Scheduled + Background Functions (two-function split) | Azure Functions Dedicated plan timer trigger (single function, unbounded timeout) | Project infrastructure shift (2026-03-17) | Eliminates two-function workaround; single timer function can run scraping indefinitely |
| Turso (libSQL/SQLite) | Azure PostgreSQL Flexible Server | Project infrastructure shift (2026-03-17) | Use `drizzle-orm/node-postgres` + `pg` driver instead of `@libsql/client`; SSL required; JSONB available instead of text JSON |
| Netlify Background Function (15-min limit) | Azure Functions Dedicated App Service plan (unbounded) | Project infrastructure shift | No background function pattern needed; no per-county function split required for Phase 1 |
| Azure Functions v3 Node.js model | Azure Functions v4 Node.js model (GA) | ~2024 | v4 uses code-first function registration (`app.timer(...)`) instead of `function.json` files; TypeScript-native |
| Consumption plan (Windows, legacy) | Flex Consumption or Dedicated plan | 2025 (Consumption plan marked legacy) | Consumption plan: 5-min default / 10-min max timeout. Dedicated plan: 30-min default / unbounded. For this project, Dedicated (same App Service as the web app) is correct. |

**Deprecated/outdated:**
- `function.json` binding files: Replaced by code-first `app.timer()`/`app.http()` registration in v4 model. Do not create `function.json` files for new v4 functions.
- Azure Functions v3 Node.js programming model: v4 is GA and is what the official docs now show for TypeScript examples.
- Turso/libSQL references in existing project research: Superseded by Azure PostgreSQL Flexible Server. Use `drizzle-orm/node-postgres` not `drizzle-orm/libsql`.

## Open Questions

1. **Does Carbon County recorder have ANY online document search portal for NODs?**
   - What we know: The recorder's website mentions "access select records online" but provides no URL. E-recording is "coming soon." NETR Online shows Carbon County but links to a paid document image datastore.
   - What's unclear: Whether a free searchable index of recorded instruments (NOD, lis pendens, deeds by instrument type) exists anywhere online for Carbon County.
   - Recommendation: MANUALLY INSPECT before planning the NOD scraper task. Call (435) 636-3265 or email recorders@carbon.utah.gov. Ask specifically whether a grantor/grantee index or instrument-type search is publicly accessible online. Also evaluate: (a) NETR Online datastore at `datastore.netronline.com/search/8309` — may have document images behind a low-cost subscription; (b) Third-party aggregators like HomeInfoMax or PropertyChecker who may have already normalized this data.

2. **What are the exact wpDataTables column indices for Carbon County's delinquent properties table?**
   - What we know: The table has 25+ columns including Parcel, Year, Name, Name2, Add1, PropertyAddress, Due, etc. The exact rendered column order may differ from the schema-level order.
   - What's unclear: Whether all 25+ columns are visible in the rendered table or whether some are hidden by the plugin.
   - Recommendation: During Wave 0 (or the first scraper task), take a Playwright screenshot of the table and log all `<th>` texts to establish the exact column map before writing the parser.

3. **Azure Function plan configuration — Consumption plan vs Dedicated plan for the Functions resource?**
   - What we know: The project uses Azure App Service (Dedicated) for the Next.js frontend. Azure Functions can run on a Dedicated plan (same App Service) or as a separate Consumption/Flex plan. The Dedicated plan gives unbounded timeout and Always On behavior. The B1ms Flexible Server is already provisioned.
   - What's unclear: Whether the Azure Functions app should be on the SAME App Service plan as the Next.js app (to save cost) or a separate resource. Sharing a plan means the scraper and the web app share the same B1 compute.
   - Recommendation: Use a SEPARATE Azure Functions Consumption plan or Flex Consumption plan (not the same App Service as the web app), or deploy the scraper as a separate resource. The B1 App Service running Next.js doesn't need the scraper competing for its CPU during the 5 AM run. Cost implication: Flex Consumption plan has a generous free tier and unbounded timeout. This is worth evaluating before provisioning.

4. **Scoring configuration defaults — what initial values to seed in `scraper_config`?**
   - What we know: Claude's discretion was given on weighting. Research recommendation: NOD weight = 3, tax_lien weight = 2, lis_pendens weight = 2, hot lead threshold = 4. NOD freshness window = 75 days (to exclude near-auction properties that are no longer actionable). This is a starting point.
   - What's unclear: Whether these weights match the user's investment intuition. The user can adjust via settings after Phase 2 UI is built.
   - Recommendation: Seed `scraper_config` with these defaults during the database migration Wave 0 task. Document them with comments in the migration file.

## Sources

### Primary (HIGH confidence)
- Azure Functions Timer Trigger official docs: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer — NCRONTAB format, v4 TypeScript examples, timezone config
- Azure Functions Scale and Hosting official docs: https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale — Dedicated plan = unbounded timeout (verified March 2026)
- Azure Functions GitHub Actions official docs: https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-github-actions — workflow YAML templates for Node.js Linux
- Drizzle ORM PostgreSQL official docs: https://orm.drizzle.team/docs/get-started/postgresql-new — connection setup, SSL config, schema patterns
- Carbon County property search direct inspection: https://www.carbon.utah.gov/service/property-search/ — wpDataTables plugin confirmed, AJAX endpoint confirmed
- Carbon County delinquent properties direct inspection: https://www.carbon.utah.gov/service/delinquent-properties/ — JS-rendered table confirmed, 25+ column structure documented
- Carbon County delinquent tax sales: https://www.carbon.utah.gov/service/delinquent-tax-sales/ — annual PDF tax sale lists confirmed available

### Secondary (MEDIUM confidence)
- NETR Online Carbon County portal: https://publicrecords.netronline.com/state/UT/county/carbon — confirmed GIS map, assessor, recorder links; document image datastore at `datastore.netronline.com/search/8309`
- Deeds.com Carbon County: https://www.deeds.com/recorder/utah/carbon/ — confirmed e-recording not yet available; no online document search portal described

### Tertiary (LOW confidence — needs validation)
- Carbon County recorder online document search availability: No URL found during research. Manual verification required before building NOD scraper. Status: UNCONFIRMED.
- wpDataTables exact column ordering in rendered table: Research identified field names from page source but did not execute JavaScript to confirm rendered column indices. Requires Playwright screenshot during development.

## Metadata

**Confidence breakdown:**
- Standard stack (Azure Functions, Drizzle, pg): HIGH — official Microsoft docs verified, Drizzle docs verified
- Carbon County assessor/delinquent scraping approach: MEDIUM — page structure confirmed via direct inspection; Playwright requirement confirmed; column indices need runtime verification
- Carbon County recorder NOD scraping: LOW — no online portal found; approach is UNRESOLVED pending manual investigation
- PostgreSQL schema design: MEDIUM — derived from first principles plus comparable systems; no project-specific prior art to validate against
- GitHub Actions workflow: HIGH — official Microsoft template verified

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (30 days for stable Azure/Drizzle docs; Carbon County portal structure may change at any time)
