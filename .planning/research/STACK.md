# Stack Research

**Domain:** Distressed property lead generation web app (Next.js, scraping, alerts, maps)
**Researched:** 2026-03-17
**Confidence:** MEDIUM-HIGH (core framework HIGH, scraping/SMS MEDIUM, Utah-specific data sources LOW)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 15.x (stable) | Full-stack React framework | Project constraint; also ideal — App Router supports server-side scraping logic, cron via Netlify Scheduled Functions, and API routes for SMS/email triggers all in one repo. Next.js 16 released Oct 2025 but introduces breaking changes (async params required, middleware renamed); stay on 15.x for stability. |
| TypeScript | 5.x | Type safety | Project constraint. Next.js 16 requires TypeScript 5+; 15.x supports it fully. Eliminates entire classes of runtime bugs in scraping/data-parsing code where field shapes vary by county. |
| Tailwind CSS | v4.x | Utility-first styling | Project constraint + now bundler-native in v4 (no `tailwind.config.js` needed). Faster dev, no PostCSS config friction. |
| shadcn/ui | latest (0.9.x) | Component library | Project constraint. Fully compatible with Next.js 15 + React 19 + Tailwind v4 as of late 2024. Install via `npx shadcn@latest init`. |
| React | 19.x | UI rendering | Ships with Next.js 15; required for shadcn/ui peer deps. |

### Database

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Turso (libSQL/SQLite) | latest SDK (`@libsql/client`) | Primary data store | Free tier is generous: 500M rows read/month, 10M writes, 5GB storage, 100 databases, no credit card. Single-file SQLite semantics with cloud HTTP access — perfect for a solo-user app hosted on Netlify. Zero-cost, zero-maintenance. No separate database server to provision. |
| Drizzle ORM | 0.45.x | Type-safe DB queries | ~7.4kb, zero dependencies, first-class SQLite/libSQL support. Code-first schema = schema lives in TypeScript, no extra build step. Significantly faster cold starts vs Prisma (< 500ms vs 1–3s), which matters for Netlify serverless functions that wake on each scrape trigger. |

### Scheduling / Background Tasks

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Netlify Scheduled Functions | built-in | Daily scrape cron | No third-party service needed. Define `schedule: "0 6 * * *"` in function config for daily 6am UTC run. Runs alongside the Next.js app in the same repo with zero extra infra. Free on all Netlify plans. |
| Netlify Background Functions | built-in | Long-running scrape tasks | Scheduled functions cap at 30 seconds — not enough for scraping 10+ county sites. Background functions run up to 15 minutes. Pattern: scheduled function fires → immediately invokes background function → scrape runs fully. |

### Scraping

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Playwright | 1.x (`@playwright/test`, `playwright`) | Headless browser scraping | Most county assessor and recorder sites (Carbon, Emery, Juab, Sanpete, Millard, etc.) serve search results as server-rendered HTML, some requiring form submissions or JS-rendered tables. Playwright handles both. Better anti-detection than Puppeteer; supports Chromium/Firefox/WebKit. Use headless Chromium for server deploys. |
| playwright-extra + puppeteer-extra-plugin-stealth | latest | Anti-bot evasion | Utah county sites are not aggressive, but some use basic bot detection. The stealth plugin patches `navigator.webdriver` and other fingerprinting signals. Adds < 50ms overhead. Worth including from the start. |
| Cheerio | 1.x | Static HTML parsing | For county pages that return plain HTML without JavaScript rendering. Significantly faster than spinning up Playwright for every request. Strategy: try Cheerio first; fall back to Playwright when JS is required. |

### Notifications / Alerts

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Resend | latest (`resend`) | Transactional email alerts | User already has a Resend account from the nychvac project. Free tier: 3,000 emails/month, 100/day. Official Next.js integration docs at resend.com/docs/send-with-nextjs. Pair with `@react-email/components` for templated hot-lead emails. |
| Twilio | latest (`twilio`) | SMS alerts for hot leads | De facto standard for SMS. Developer account: $15 free trial credit (enough for ~1,500 texts at $0.0079/msg). After that: ~$0.0079/msg + $1.15/month for a local number. Given the alert volume (handful of hot leads per day max), monthly cost is effectively < $5 total. No cheaper alternative with comparable reliability and docs quality. |

### Maps

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| react-leaflet | 5.x | Interactive property map | Free, open-source, no API key required. Uses OpenStreetMap tiles (also free). Handles pin clustering for multiple properties. **Critical note:** Leaflet requires DOM access, so the map component must be loaded with `next/dynamic` and `{ ssr: false }` — standard pattern, well-documented. |
| Leaflet | 1.9.x | Underlying map engine | Peer dependency of react-leaflet. |
| OpenStreetMap | N/A (tile CDN) | Map tile provider | Free, no API key, good rural Utah coverage. Alternative: MapTiler free tier (better styling) but adds API key complexity — defer unless OSM tiles look bad for the target geography. |

### Authentication

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Auth.js (NextAuth) | v5 beta (`next-auth@beta`) | Session-based auth | Project is single-user (the investor). Auth.js v5 with Credentials provider is the minimum viable auth for Next.js 15 App Router. No OAuth needed. Simple username/password stored as env vars. Do not use v4 — v5 is the current beta and the only version with App Router first-class support. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-email/components` | latest | Email template components | Use with Resend to build structured hot-lead email alerts with property details, distress score, and tap-to-call link. |
| `date-fns` | 4.x | Date manipulation | Parsing scrape timestamps, computing days-since-filing for distress scoring, formatting dates for the UI. Lighter than `dayjs` for this use case. |
| `zod` | 3.x | Runtime schema validation | Validate scraped property data before inserting to DB — counties change field names, return partial data, or serve unexpected formats. Zod parse + safe error handling prevents bad data from corrupting the lead list. |
| `p-limit` | 6.x | Concurrency limiting | Prevent hammering county servers with parallel requests. Use `p-limit(2)` to scrape 2 counties at a time max. Also reduces ban risk. |
| `node-html-parser` | 6.x | Fast HTML parsing fallback | Lighter alternative to Cheerio for very simple HTML; use when only extracting 1-2 fields from a known page structure. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `drizzle-kit` | DB migrations and schema push | Use `drizzle-kit push` for local dev against Turso. Zero-config migration for small schema. |
| ESLint + `eslint-config-next` | Linting | Ships with `create-next-app`; keep defaults. Note: Next.js 16 removed `next lint` — on 15.x it still works fine. |
| Prettier | Code formatting | Standard shadcn/ui project setup includes this. |
| `dotenv` | Local env management | Not needed explicitly — Next.js reads `.env.local` natively. But document all required vars in `.env.example`. |

---

## Installation

```bash
# Core framework (start from scratch)
npx create-next-app@latest housefinder --typescript --tailwind --eslint --app

# shadcn/ui
npx shadcn@latest init

# Database
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit

# Scraping
npm install playwright playwright-extra puppeteer-extra-plugin-stealth cheerio
npx playwright install chromium

# Notifications
npm install resend @react-email/components twilio

# Maps
npm install leaflet react-leaflet
npm install -D @types/leaflet

# Auth
npm install next-auth@beta

# Utilities
npm install zod date-fns p-limit node-html-parser
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Turso (libSQL/SQLite) | Supabase (PostgreSQL) | If you need multi-user concurrent writes, real-time subscriptions, or PostGIS spatial queries. For a single-user read-heavy app, Turso's zero-cost SQLite is strictly better. |
| Turso (libSQL/SQLite) | Local SQLite file | For pure local dev only. Doesn't survive Netlify serverless restarts — filesystem is ephemeral on Netlify. Turso gives you SQLite semantics with a persistent cloud backend. |
| Drizzle ORM | Prisma | If your team prefers schema-first workflow and doesn't care about cold start latency. For serverless functions, Drizzle's ~7kb bundle vs Prisma's engine binary is decisive. |
| Netlify Scheduled + Background Functions | External cron (Inngest, Trigger.dev) | If Netlify's 15-minute background function limit isn't enough (it will be), or if you need retry/queue semantics. For 10 county scrapes once a day, Netlify native is sufficient and free. |
| react-leaflet + OSM | Mapbox GL JS / react-map-gl | If you need vector tiles, 3D terrain, or custom map styles. Mapbox has a free tier but adds API key complexity and usage limits. OSM is unlimited and free. |
| Twilio | Plivo, Vonage, Bird | Plivo and Vonage are cheaper per message at scale (> 10K/month). At < 100 texts/month (hot lead alerts only), the $1-2/month difference is irrelevant. Twilio's documentation and reliability are unmatched for developer experience. |
| Playwright | Puppeteer | If you only need Chrome. Playwright's multi-browser support, better auto-waiting, and stealth plugin ecosystem make it strictly superior for scraping in 2025/2026. |
| Auth.js v5 Credentials | Custom JWT auth | If Auth.js v5 beta stability is a concern. For a single-user tool, even a hardcoded env-var password check on an API route would work, but Auth.js provides session management, CSRF protection, and middleware support for free. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `node-cron` in Next.js API routes | Serverless functions are stateless — `node-cron` only runs for the lifetime of one request invocation, then the process dies. You will never get recurring cron behavior. | Netlify Scheduled Functions |
| Puppeteer (standalone) | Playwright is a strict superset: broader browser support, better async handling, same API surface. Puppeteer has no advantages over Playwright for this project. | Playwright |
| `axios` for HTTP requests | `fetch` is native in Node 18+ and Next.js 15. Zero reason to add a dependency. | Native `fetch` |
| Mapbox (paid tier) | Free tier limits are 50,000 map loads/month — fine initially, but API key management adds friction. OSM via react-leaflet is unlimited and free. | react-leaflet + OpenStreetMap |
| Prisma | Binary engine adds 20-80MB to bundle and 1-3s cold starts on serverless. Netlify background functions paying this tax on every scrape run is wasteful. | Drizzle ORM |
| Next.js 16 (currently) | Released Oct 2025 with meaningful breaking changes: `params`/`searchParams` must be awaited, `middleware.ts` deprecated in favor of `proxy.ts`, `next lint` command removed. The nychvac reference project uses 15.x; stay consistent until 16.x has broader ecosystem adoption. | Next.js 15.x (latest stable) |
| Any paid property data API (BatchLeads, PropStream, etc.) | Project constraint: $0 operating cost. All data must come from public county/state records. | Direct county assessor/recorder scraping |

---

## Stack Patterns by Variant

**For county sites that render HTML server-side (most Utah county assessors):**
- Use Cheerio to parse static HTML
- Fast, no browser overhead
- Works for: carbon.utah.gov property search, basic assessor lookups

**For county sites requiring JavaScript rendering or form interactions:**
- Use Playwright with stealth plugin
- Required for: sites using React/Angular frontends, AJAX-based search results
- Add `await page.waitForLoadState('networkidle')` after form submissions

**For the Netlify scrape pipeline:**
- Scheduled function (`@daily`) triggers
- Immediately calls background function via internal fetch
- Background function runs the actual scrape (up to 15 min)
- Background function writes results to Turso
- Background function calls Resend + Twilio for hot leads

**For the map component (SSR incompatibility):**
```typescript
// In your page component:
import dynamic from 'next/dynamic'
const PropertyMap = dynamic(() => import('@/components/PropertyMap'), { ssr: false })
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@15.x | react@19.x, react-dom@19.x | React 19 is the default with Next.js 15 |
| next-auth@beta (v5) | next@14+, next@15 | v5 requires Next.js 14 minimum; works on 15 |
| react-leaflet@5.x | react@18+, react@19 | Compatible with React 19 |
| drizzle-orm@0.45.x | @libsql/client (any recent) | Both actively maintained; use latest of each |
| shadcn/ui (latest) | next@15, react@19, tailwind@v4 | Full compatibility confirmed late 2024 |
| playwright@1.x | Node.js 18+ | Use Node 20 (required by Next.js 16 if you upgrade later) |

---

## Utah-Specific Data Source Notes

**Confidence: LOW — requires hands-on verification for each county**

The following counties cover the target geography around Price, UT. Each has a different portal — some are scrapeable, some are hostile:

| County | Portal | Scrape Difficulty | Notes |
|--------|--------|------------------|-------|
| Carbon (Price) | carbon.utah.gov/service/property-search/ | Medium | Has a property search UI; structure needs manual inspection |
| Emery | emery.utah.gov/home/offices/recorder/ | High | Minimal online presence; may require GRAMA request for bulk data |
| Sanpete | sanpete.com | Unknown | Verify via NETR Online directory |
| Juab | juabcounty.gov/recorder/ | Unknown | Small county; likely limited online records |
| Millard | millardcounty.utah.gov | Unknown | Verify via NETR Online directory |
| Sevier | sevierut.gov | Unknown | Verify manually |

**Key finding:** The Utah Public Records Online Directory at publicrecords.netronline.com/state/UT aggregates links to all county online portals. Start there to inventory which counties have searchable online systems before writing scrapers.

**GRAMA (Utah's FOIA) as backup:** For counties without online portals, Utah's Government Records Access and Management Act (GRAMA) allows bulk public record requests. This is a manual fallback, not an automated solution, but worth knowing.

---

## Sources

- Next.js 16 release blog (nextjs.org/blog/next-16, October 2025) — confirmed 15.x vs 16.x choice
- Netlify Scheduled Functions docs (docs.netlify.com/build/functions/scheduled-functions/) — confirmed 30s limit, background function workaround
- Turso pricing page (turso.tech/pricing, verified March 2026) — confirmed free tier: 500M reads, 10M writes, 5GB, 100 DBs
- shadcn/ui React 19 docs (ui.shadcn.com/docs/react-19) — confirmed Next.js 15 + React 19 compatibility
- Drizzle ORM npm (0.45.x latest) — confirmed SQLite/libSQL support, ~7.4kb bundle
- Twilio SMS pricing (twilio.com/en-us/sms/pricing/us) — confirmed ~$0.0079/msg
- react-leaflet docs (react-leaflet.js.org) — confirmed SSR limitation, dynamic import pattern
- WebSearch: Playwright vs Cheerio 2026 comparison (proxyway.com) — MEDIUM confidence
- WebSearch: Drizzle vs Prisma serverless cold starts (bytebase.com, makerkit.dev) — MEDIUM confidence
- WebSearch: Utah county property portals (publicrecords.netronline.com, carbon.utah.gov) — LOW confidence for scrapeability

---

*Stack research for: HouseFinder — distressed property lead generation, rural Utah*
*Researched: 2026-03-17*
