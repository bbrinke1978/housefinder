# Phase 17: Netlify Migration & No BS Homes Design System - Research

**Researched:** 2026-04-08
**Domain:** Netlify deployment, Next.js platform migration, Tailwind CSS v4 design system, mobile swipe gestures, Azure PgBouncer
**Confidence:** HIGH (Netlify, design system), MEDIUM (swipe gestures), HIGH with critical caveat (PgBouncer — blocked on Burstable tier)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Brand Identity Translation**
- Playfair Display for headings, Source Sans 3 for body text (same as nobshomes.netlify.app)
- Brand blue (#1e4d8c) + sand accent (#c4884f) + cream backgrounds (#fdfbf7)
- Adapted for dashboard density — tighter spacing, smaller cards, data-friendly layouts
- Light mode as default, dark mode via toggle
- Subtle grain/noise texture overlay (0.015 opacity) on all background surfaces
- Sand gradient buttons for primary actions, blue for CTAs/links/navigation
- White cards with subtle warm shadows and rounded corners (rounded-2xl)

**Mobile-First Layout**
- Dashboard: compact stat row at top, then scrollable hot leads list sorted by score
- Property/deal cards at medium density: address + score + status + signals + owner name
- 44px minimum touch targets throughout
- Swipe actions on lead/deal cards (swipe left to change status, swipe right to call)

**Page-by-Page Design Scope**
- ALL pages restyled in one phase — no mixed old/new styling
- Login page: cream background, centered card, logo, no imagery
- Map page: switch from satellite-streets-v12 to light/warm Mapbox style matching cream/sand palette
- Data tables: Claude's discretion per page

**Deployment & Infrastructure**
- Netlify: git push auto-deploy from master
- Remove `output: standalone` from next.config.ts, use default Next.js output for Netlify
- Add netlify.toml with Node 20, build command, publish directory
- Azure PgBouncer: enable on Flexible Server via Azure Portal, update DATABASE_URL to port 6432
- Serverless function timeout: 26s (Netlify max on free tier)
- Keep Azure App Service running as fallback for ~1 week after successful migration, then delete
- All environment variables migrated to Netlify dashboard
- GitHub Actions deploy-app.yml updated or replaced with Netlify auto-deploy

### Claude's Discretion
- Mobile navigation pattern (bottom tabs, hamburger, drawer)
- Data table styling per page (card-based vs traditional table)
- Loading skeletons and empty states
- Exact spacing and typography scale
- Dark mode color adaptations of the warm palette
- Error state styling

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

---

## Summary

This phase has two parallel workstreams: (1) migrating the HouseFinder Next.js 15 frontend from Azure App Service to Netlify, and (2) replacing the current zinc/violet design system with the No BS Homes warm brand palette. Both workstreams are well-understood with high confidence.

**Netlify deployment** is straightforward for Next.js 15. The OpenNext adapter installs automatically — no manual plugin configuration needed. The main change is removing `output: "standalone"` from next.config.ts (standalone is for Azure/Docker; Netlify uses OpenNext's own output format). The netlify.toml Brian uses for nobshomes is the exact pattern: `command = "npm run build"`, `publish = ".next"`, `NODE_VERSION = "20"`. Environment variables move from Azure App Service configuration to Netlify dashboard. GitHub Actions deploy-app.yml gets removed/disabled.

**CRITICAL BLOCKER — PgBouncer:** Azure PostgreSQL Flexible Server's built-in PgBouncer does NOT support the Burstable compute tier (B1ms). The HouseFinder database is on B1ms. PgBouncer requires General Purpose or Memory Optimized tier. Upgrading costs significantly more (~$50-100+/mo vs ~$13/mo). This decision needs resolving before planning: either skip PgBouncer, upgrade the tier, or use an alternative approach (pg connection pool settings, external PgBouncer on VM). Since Netlify serverless functions spin up fresh per request (cold starts), connection exhaustion is a real risk — but the app currently uses `max: 3` connections in the pool and serves a single user, so connection pressure is low in practice.

**Design system** is a direct port from nobshomes globals.css. All exact values are already confirmed from source. The current app uses `@base-ui/react` for UI primitives — keep these, just restyle using Tailwind CSS v4 tokens. The design system work is a globals.css + theme token replacement, not a component library swap.

**Primary recommendation:** Deploy Netlify without PgBouncer (the single-user low-connection app doesn't need it urgently); apply the design system with direct token mapping from nobshomes globals.css; swap Mapbox style to `mapbox://styles/mapbox/light-v11`; implement swipe gestures with framer-motion.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Netlify (platform) | current | Hosting, auto-deploy from master | Brian already uses for nobshomes; zero config for Next.js 15 |
| @netlify/plugin-nextjs (OpenNext) | auto-installed | Next.js → Netlify adapter | Automatically detected; no manual install needed |
| next-themes | 0.4.6 (already installed) | Light/dark mode toggle | Already in use via ThemeProvider in layout.tsx |
| framer-motion | ^11 | Swipe gesture animations on cards | Only gesture library with iOS-quality swipe-action pattern |
| Playfair Display + Source Sans 3 | Google Fonts | Brand typography | Exact fonts from nobshomes design |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mapbox-gl (already installed) | ^3.20.0 | Map tile style swap | Change to light-v11 style in PropertyMap component |
| tw-animate-css (already installed) | ^1.4.0 | Animation utilities | Already available; use for page load animations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| framer-motion swipe | react-swipeable | react-swipeable is gesture detection only; framer-motion adds the smooth animation + snap behavior for reveal actions |
| Google Fonts import | next/font/google | next/font/google is better for Next.js (no render blocking); both work; use next/font/google for Playfair Display + Source Sans 3 to stay consistent with how Inter is loaded |
| Netlify PgBouncer | Keep max:3 pool | B1ms doesn't support PgBouncer; current pool is adequate for single user |

**Installation:**
```bash
# framer-motion only — all other packages already in use
cd app && npm install framer-motion
```

---

## Architecture Patterns

### Recommended Project Structure Changes

```
app/
├── netlify.toml              ← ADD: Netlify build config
├── next.config.ts            ← MODIFY: remove output:"standalone"
├── src/
│   ├── app/
│   │   └── globals.css       ← REPLACE: warm brand tokens
│   ├── components/
│   │   ├── swipe-card.tsx    ← ADD: swipe gesture wrapper
│   │   └── map/
│   │       └── property-map.tsx  ← MODIFY: light map style
└── .github/workflows/
    └── deploy-app.yml        ← DISABLE or DELETE
```

### Pattern 1: netlify.toml (exact nobshomes pattern)

**What:** Minimal build config file in app/ directory root
**When to use:** Required for Netlify to detect Node version and build command

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
```

Note: The `[[plugins]]` block for `@netlify/plugin-nextjs` is NOT needed — Netlify auto-installs it for Next.js projects.

### Pattern 2: Remove standalone output

**What:** Delete `output: "standalone"` from next.config.ts
**When to use:** Standalone is for Azure/Docker deployment only. OpenNext requires default output.

```typescript
// Before (Azure)
const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["mapbox-gl"],
  serverExternalPackages: ["@react-pdf/renderer"],
};

// After (Netlify)
const nextConfig: NextConfig = {
  transpilePackages: ["mapbox-gl"],
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.blob.core.windows.net" },
    ],
  },
};
```

### Pattern 3: Font loading via next/font/google

**What:** Load Playfair Display + Source Sans 3 via next/font/google (same pattern as current Inter)
**When to use:** Consistent with existing font loading pattern; no external CSS import needed

```typescript
// Source: consistent with current layout.tsx pattern
import { Playfair_Display, Source_Sans_3 } from "next/font/google";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700", "800", "900"],
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "600", "700"],
});
```

### Pattern 4: Tailwind CSS v4 token replacement in globals.css

**What:** Replace current zinc/violet tokens with warm brand tokens
**When to use:** Single file change; all downstream components inherit via semantic tokens

The current app uses Tailwind CSS v4 with `@theme inline` and CSS custom properties. The nobshomes globals.css uses `@theme inline` in the same way. This is a direct merge:

```css
/* Exact values from nobshomes/src/app/globals.css — HIGH confidence, source-verified */
@theme inline {
  /* Brand blue scale */
  --color-brand-50: #eef3fb;
  --color-brand-500: #1e4d8c;   /* primary */
  --color-brand-900: #060f1c;

  /* Sand scale */
  --color-sand-50: #fdf9f3;
  --color-sand-500: #c4884f;    /* accent */
  --color-sand-900: #2e1f0f;

  /* Warm base */
  --color-warm: #fdfbf7;
  --color-cream: #faf5ec;

  /* Semantic tokens — map to shadcn CSS var pattern */
  --background: #fdfbf7;             /* light: warm base */
  --foreground: #1e293b;
  --card: #ffffff;
  --primary: #1e4d8c;                /* brand blue */
  --primary-foreground: #ffffff;
  --secondary: #c4884f;              /* sand accent */
  --muted: #f0dcc0;                  /* sand-200 */
  --muted-foreground: #78716c;

  /* Sidebar — light warm sidebar */
  --sidebar: #fdfbf7;
  --sidebar-foreground: #1e293b;
  --sidebar-primary: #1e4d8c;
  --sidebar-border: #e5c79a;         /* sand-300 */

  /* Fonts */
  --font-display: var(--font-playfair), Georgia, serif;
  --font-body: var(--font-source-sans), "Segoe UI", sans-serif;
  --font-sans: var(--font-source-sans), "Segoe UI", sans-serif;
}

/* Noise grain overlay — exact from nobshomes */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.015;
  background-image: url("data:image/svg+xml,..."); /* SVG noise — copy from nobshomes */
}
```

### Pattern 5: Swipe actions on lead/deal cards

**What:** iOS-style swipe left/right to reveal actions (status change left, call right)
**When to use:** Mobile property cards on dashboard, lead cards, deal cards

```typescript
// framer-motion swipe action pattern (source: motion.dev/tutorials/react-swipe-actions)
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

function SwipeCard({ onSwipeLeft, onSwipeRight, children }) {
  const x = useMotionValue(0);
  const SWIPE_THRESHOLD = 80;

  function handleDragEnd(_, info) {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      animate(x, -200, { onComplete: onSwipeLeft });
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      animate(x, 200, { onComplete: onSwipeRight });
    } else {
      animate(x, 0);
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Left action (revealed on right swipe) */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center px-4 bg-green-500">
        <Phone className="h-5 w-5 text-white" />
      </div>
      {/* Right action (revealed on left swipe) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center px-4 bg-muted">
        <ChevronRight className="h-5 w-5" />
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card"
      >
        {children}
      </motion.div>
    </div>
  );
}
```

### Pattern 6: Mapbox warm light style

**What:** Replace satellite-streets-v12 with light-v11 (light, warm-tinted street map)
**When to use:** Map page — matches cream/sand palette, avoids satellite darkness

```typescript
// In property-map.tsx — single line change
// Before:
mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
// After:
mapStyle="mapbox://styles/mapbox/light-v11"
```

Alternative: `mapbox://styles/mapbox/streets-v12` is also light. `light-v11` is the most minimal/clean.

### Anti-Patterns to Avoid

- **Keep output:standalone:** Must be removed for Netlify. OpenNext does NOT use it. Leaving it will cause the build to output a Docker-style standalone directory that Netlify can't serve.
- **Adding [[plugins]] block for @netlify/plugin-nextjs:** Netlify auto-installs it. Manual pinning can lock you to an old version. The nobshomes pattern (no plugin block) is correct.
- **Using @import url() for Google Fonts in globals.css:** Current nobshomes approach uses CSS `@import url(...)` in globals.css — this adds a network waterfall. For Next.js, use `next/font/google` instead to get automatic font optimization and preloading (same as current Inter setup).
- **Keeping NEXTAUTH_URL hardcoded to Azure URL:** Must update to Netlify deployment URL. The OpenNext plugin sets it automatically, but `NEXT_PUBLIC_APP_URL` used in contract-actions.ts needs manual update.
- **Swapping @base-ui/react components:** Brian decided to keep @base-ui/react. Do NOT replace with Radix or shadcn Dialog/Sheet. Just restyle with new tokens.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe gesture detection | Custom touch event handlers | framer-motion drag + useMotionValue | Touch events are complex (iOS momentum, pointer capture, passive events); framer-motion handles all of it |
| Font loading | Manual @import url() | next/font/google | Automatic font subsetting, no render blocking, consistent with existing Inter pattern |
| Theme persistence | localStorage cookie | next-themes (already installed) | Already handles SSR hydration mismatch, cookie persistence, system preference detection |
| CSS token mapping | Hardcoded hex values per component | CSS custom properties via @theme inline | Single source of truth; dark mode adaptation via .dark selector |

---

## Common Pitfalls

### Pitfall 1: PgBouncer Unavailable on B1ms Tier — CRITICAL

**What goes wrong:** User enables PgBouncer in Azure Portal, changes DATABASE_URL to port 6432 — connections fail silently or the parameter is hidden/grayed out.
**Why it happens:** Azure PgBouncer feature explicitly does NOT support Burstable compute tier (B1ms). The HouseFinder PostgreSQL server is on B1ms (~$13/mo). Upgrading to General Purpose starts at ~$50-100+/mo.
**How to avoid:** Skip PgBouncer for this phase. The app serves a single user with a `max: 3` connection pool. Connection exhaustion is not a real risk at this scale. If cold-start connection pressure becomes an issue after migration, consider: (a) increasing pool settings conservatively, (b) using a Neon serverless PostgreSQL as a future migration, not Azure PgBouncer.
**Warning signs:** If Brian opens "Server parameters" in Azure Portal and can't find `pgbouncer.enabled` or it's grayed out — that's the Burstable limitation.

### Pitfall 2: Azure Blob Storage Images Break After Migration

**What goes wrong:** Photos uploaded to Azure Blob Storage render correctly now (App Service + Azure are in same Azure network). After Netlify migration, the SAS URL generation still works, but `next/image` needs the remote pattern configured.
**Why it happens:** `next.config.ts` on Azure didn't include `images.remotePatterns` (wasn't needed). The nobshomes next.config.ts includes it.
**How to avoid:** Add `images.remotePatterns` for `*.blob.core.windows.net` to next.config.ts (already in nobshomes pattern above).

### Pitfall 3: AUTH_SECRET / NEXTAUTH_URL Missing on Netlify

**What goes wrong:** Login fails on production Netlify deployment with cryptic JWT errors.
**Why it happens:** NextAuth v5 (which this app uses as `next-auth@^5.0.0-beta.30`) requires `AUTH_SECRET`. The `NEXTAUTH_URL` is auto-detected by the Netlify OpenNext plugin using `URL` env var, but `AUTH_SECRET` must be manually set.
**How to avoid:** Set these environment variables in Netlify dashboard:
- `AUTH_SECRET` — run `openssl rand -base64 33` to generate
- `AUTH_EMAIL` — same value as on Azure
- `AUTH_PASSWORD_HASH` — same bcrypt hash as on Azure
- `NEXTAUTH_URL` — set explicitly to Netlify production URL (e.g., `https://housefinder.netlify.app`) even if auto-detected, to prevent issues
**Warning signs:** Login page loads but form submission redirects to `/login?error=` — always an auth config issue.

### Pitfall 4: GitHub Actions Still Deploys to Azure After Netlify Is Live

**What goes wrong:** A git push triggers both Netlify auto-deploy AND the old GitHub Actions deploy-app.yml. The Azure App Service gets a broken build (no standalone output). Confusing dual-deploy state.
**Why it happens:** GitHub Actions deploy-app.yml runs on push to master when `app/**` files change.
**How to avoid:** Disable or delete `.github/workflows/deploy-app.yml` as part of migration. The Netlify auto-deploy replaces it. The scraper `deploy-scraper.yml` stays — it's for Azure Functions, not affected.

### Pitfall 5: Design Token Scope — shadcn CSS vars vs. Tailwind vars

**What goes wrong:** New brand tokens don't apply to shadcn-generated components (sidebar, sheet, dialog etc.) because shadcn reads `--primary`, `--background` etc. from `:root`, not from `@theme inline`.
**Why it happens:** Tailwind CSS v4 `@theme inline` maps tokens for utility classes (e.g., `bg-primary`), but shadcn components use raw CSS custom properties from `:root`. Both must be updated.
**How to avoid:** Update BOTH `@theme inline` (for utility classes) AND `:root { ... }` (for shadcn component internals) in globals.css. Dark mode: update both `.dark { ... }` block AND @theme inline tokens for dark variant.

### Pitfall 6: Mobile Swipe Conflicts with Scroll

**What goes wrong:** Vertical scroll on the lead list stops working when swipe components are added — iOS Safari intercepts touch events.
**Why it happens:** `drag="x"` in framer-motion can conflict with vertical scroll if not properly constrained.
**How to avoid:** Use `dragDirectionLock` on the motion.div to lock to horizontal axis only after initial gesture direction is determined. Set `overscrollBehaviorX: "contain"` on the container.

### Pitfall 7: Mapbox Style Geocoder Contrast

**What goes wrong:** The property map's Mapbox geocoder search box has white text on white background in the light map style.
**Why it happens:** The geocoder widget's theme is fixed and inherits from the Mapbox CSS import.
**How to avoid:** Verify geocoder CSS still applies correctly in light mode. May need `mapbox-gl-geocoder` theme override via className or inline style.

---

## Code Examples

### Environment Variables for Netlify Dashboard

```
# Required — copy from Azure App Service environment
AUTH_SECRET=<generate: openssl rand -base64 33>
AUTH_EMAIL=<same as Azure>
AUTH_PASSWORD_HASH=<same bcrypt hash as Azure>
DATABASE_URL=<same as Azure, port 5432 — NOT 6432, skip PgBouncer>
NEXTAUTH_URL=https://<your-netlify-site-name>.netlify.app
NEXT_PUBLIC_APP_URL=https://<your-netlify-site-name>.netlify.app
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<same as Azure>
RESEND_API_KEY=<same as Azure>
AZURE_STORAGE_CONNECTION_STRING=<same as Azure — blob storage stays on Azure>
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=<same as Azure>
AZURE_DOCUMENT_INTELLIGENCE_KEY=<same as Azure>
WEBSITE_LEAD_API_KEY=<same as Azure>
```

### Netlify.toml (place in app/ directory)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
```

### Dark Mode Token Adaptation (warm palette)

```css
/* Dark mode: keep warmth but invert — navy base, sand accents */
.dark {
  --background: #0c1e38;      /* brand-800 — deep navy */
  --foreground: #fdfbf7;      /* warm white */
  --card: #122e54;            /* brand-700 — slightly lighter navy */
  --card-foreground: #f9efe0; /* sand-100 */
  --primary: #4a78c8;         /* brand-400 — lighter blue for dark bg */
  --primary-foreground: #ffffff;
  --secondary: #d4a574;       /* sand-400 — warm orange in dark */
  --muted: #183d70;           /* brand-600 */
  --muted-foreground: #e5c79a; /* sand-300 */
  --border: #183d70;           /* brand-600 */
  --sidebar: #060f1c;          /* brand-900 */
  --sidebar-foreground: #f9efe0;
  --sidebar-primary: #4a78c8;
  --sidebar-border: #122e54;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| netlify/next-on-netlify (manual) | OpenNext auto-adapter | 2023 | Zero config needed for Next.js 13.5+ |
| `output: "standalone"` for Azure | No output setting (default) for Netlify | N/A | Must remove for Netlify |
| Azure App Service deploy via GitHub Actions | Netlify auto-deploy on git push | This phase | Simplifies CI/CD significantly |

**Deprecated/outdated:**
- `netlify/next-on-netlify` GitHub repo: deprecated, replaced by `opennextjs/opennextjs-netlify`
- Manual `[[plugins]]` block in netlify.toml: not needed for new deployments; Netlify auto-installs

---

## Open Questions

1. **PgBouncer vs. Skip**
   - What we know: B1ms Burstable tier does not support Azure PgBouncer. The CONTEXT.md locked decision says "enable PgBouncer."
   - What's unclear: Brian may not realize this limitation exists. The app is single-user with max:3 pool — PgBouncer is not urgent.
   - Recommendation: **Surface this to Brian before planning.** Options: (a) skip PgBouncer for now — low risk for single-user app; (b) upgrade to General Purpose tier — significant cost increase; (c) use Neon serverless PostgreSQL as a future DB migration. Recommended action for this phase: skip PgBouncer, keep DATABASE_URL on port 5432. Note this as a future upgrade item.

2. **Netlify Site Name / Custom Domain**
   - What we know: Brian manages Azure resources himself. Netlify site name determines the initial deployment URL.
   - What's unclear: Whether Brian wants a custom domain on Netlify immediately or the .netlify.app subdomain temporarily.
   - Recommendation: Plan for .netlify.app initially; document how to add custom domain as a manual step Brian does after validation.

3. **NEXTAUTH_URL in contract emails**
   - What we know: contract-actions.ts uses `process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL` to build signing links in contract emails.
   - What's unclear: Whether Brian has active contract signers who need seamless continuity during the migration week.
   - Recommendation: Set both `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` in Netlify dashboard to the Netlify production URL. Migration to custom domain later requires updating both.

4. **Framer-motion bundle size**
   - What we know: framer-motion is ~50KB gzipped. This adds to bundle.
   - What's unclear: Whether swipe gestures are worth the bundle cost given the app is a private single-user tool.
   - Recommendation: Install framer-motion. For a single user on their own phone, 50KB is negligible. The UX benefit of real swipe actions is worth it.

---

## Sources

### Primary (HIGH confidence)
- Nobshomes globals.css read directly — exact color values, grain overlay SVG, font declarations
- Nobshomes netlify.toml read directly — exact deployment pattern confirmed
- HouseFinder app code read directly — current next.config.ts, auth.ts, db/client.ts, layout.tsx, deploy-app.yml
- Microsoft Docs (fetched 2026-04-08): PgBouncer limitations — "does not support Burstable server compute tier"
- Netlify official docs (fetched 2026-04-08): Zero-config Next.js deployment, OpenNext auto-adapter

### Secondary (MEDIUM confidence)
- motion.dev/tutorials/react-swipe-actions — framer-motion swipe pattern
- nextjs.org/docs — next/font/google API (font names: `Playfair_Display`, `Source_Sans_3`)
- authjs.dev/getting-started/deployment — AUTH_SECRET required on Netlify

### Tertiary (LOW confidence)
- Netlify function timeout (26s max) — from search results, multiple forum posts consistent but not fetched from official pricing page

---

## Metadata

**Confidence breakdown:**
- Netlify deployment: HIGH — nobshomes is identical stack already running successfully on Netlify
- Design system tokens: HIGH — read directly from nobshomes/src/app/globals.css
- PgBouncer limitation: HIGH — read from official Microsoft Docs, clearly stated
- Swipe gesture pattern: MEDIUM — framer-motion pattern is well-documented; project-specific integration needs testing
- Function timeouts: MEDIUM — multiple consistent sources but not fetched from official Netlify pricing page

**Research date:** 2026-04-08
**Valid until:** 2026-07-08 (Netlify/Next.js adapter is stable; 90-day validity)
