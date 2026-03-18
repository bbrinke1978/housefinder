# Phase 2: Core Application - Research

**Researched:** 2026-03-18
**Domain:** Next.js 15 App Router dashboard — auth, property list/detail, lead pipeline, Azure deployment
**Confidence:** HIGH (core stack verified against official docs and Context7-equivalent sources)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dashboard Layout**
- Summary stats bar at top: Total leads, Hot leads, New today, Needs follow-up
- Claude's discretion on card vs list vs hybrid layout — pick what's best for the use case
- Claude's discretion on hot lead prominence (separate section vs inline badge)
- Claude's discretion on info density per lead card/row

**Property Detail Page**
- Tabbed layout like BatchLeads with 4 tabs: Overview, Signals, Notes, Contact
- Overview tab: address, owner name, tax status, mortgage info, distress score, hot lead status
- Signals tab: chronological timeline showing when each signal was detected + active/resolved status
- Notes tab: timestamped notes from user + status change history
- Contact tab: owner phone/contact info, tap-to-call, skip trace flag (data from Phase 3, but tab structure built now)
- Claude's discretion on quick-action bar at bottom on mobile (Call, Add Note, Change Status)

**Lead Pipeline**
- Both filtered list AND kanban board views with a toggle switch — user wants to try both
- Kanban columns: New, Contacted, Follow-Up, Closed, Dead
- "Last contacted" date visible on leads for follow-up prioritization
- Voice-to-text notes via Web Speech API — microphone button next to notes input for hands-free dictation while driving
- Claude's discretion on whether status changes require a note (optional vs required)

**Auth + Navigation**
- Email + password authentication — standard login form, browser caches credentials
- Desktop: sidebar navigation with items: Dashboard, Pipeline, Settings
- Mobile: bottom tab navigation with same items — responsive layout shift
- Dark mode + light mode with toggle in settings
- Single-user app accessed via web browser (not app store)
- Session persists across browser refresh

### Claude's Discretion
- Card vs list vs hybrid dashboard layout
- Hot lead visual prominence approach
- Info density on lead cards/rows
- Quick-action bar implementation on mobile detail page
- Status change note requirement (optional vs required)
- Exact spacing, typography, and color palette (within dark/light mode constraint)
- Empty states for new users with no data
- Loading states and skeleton screens
- Error state handling

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can log in with email and password | Auth.js v5 Credentials provider pattern documented |
| AUTH-02 | User session persists across browser refresh | JWT strategy with 30-day maxAge confirmed |
| AUTH-03 | Unauthenticated users are redirected to login page | Auth.js middleware.ts route protection pattern documented |
| DASH-01 | User can view a list of all distressed properties | RSC data fetching pattern with Drizzle join query documented |
| DASH-02 | User can filter properties by city, county, distress type, and hot lead status | URL searchParams pattern for server-side filtering documented |
| DASH-03 | User can sort properties by distress score, date added, or city | Same searchParams pattern |
| DASH-04 | User can see a "new since last visit" badge on recently discovered properties | leads.lastViewedAt exists in schema; badge logic documented |
| DASH-05 | Dashboard is mobile-first responsive design with large tap targets | shadcn/ui sidebar + mobile bottom nav pattern documented |
| DASH-06 | User can configure which cities/counties are in their target scope | scraperConfig table exists; settings page pattern documented |
| PROP-01 | User can view property detail page with address, owner, tax, mortgage data | Tabbed detail page pattern with 4 tabs documented |
| PROP-02 | User can see all active distress signals with dates | Signals timeline component pattern documented |
| PROP-03 | User can see distress score and hot lead status | leads.distressScore and leads.isHot available in schema |
| PROP-04 | User can see owner contact info when available | Contact tab structure documented (data from Phase 3, tab shell built now) |
| LEAD-01 | User can set lead status (New, Contacted, Follow-Up, Closed, Dead) | Server Action + Drizzle update pattern documented |
| LEAD-02 | User can add timestamped notes to any lead | New lead_notes table required — schema addition documented |
| LEAD-03 | User can view full pipeline by status | Kanban + list toggle pattern documented with @hello-pangea/dnd |
| LEAD-04 | System flags leads with no contact info as "manual skip trace needed" | leads.isHot + LEAD-04 flag via property-level field documented |
</phase_requirements>

---

## Summary

Phase 2 builds a complete Next.js 15 web application that sits on top of the Phase 1 Azure PostgreSQL database. The scraper already populates `properties`, `distress_signals`, and `leads` tables — the web app is purely a read/write consumer of that data. The web app needs to be created as a new Next.js project (at `app/` or the repository root alongside `scraper/`).

The key architectural decision is how to share the Drizzle schema. The cleanest approach for this project is to copy the schema file into the web app and connect to the same `DATABASE_URL` — a simple, pragmatic solution that avoids monorepo tooling overhead for a single-developer project. The schema is stable (Phase 1 is complete), and the web app will extend it with two additions: a `lead_notes` table and a `lastContactedAt` column on `leads`.

Auth is handled by Auth.js v5 (next-auth@beta) with the Credentials provider. For a single-user app, the authorize function validates credentials against `AUTH_EMAIL` and `AUTH_PASSWORD_HASH` environment variables — no user database table needed. Middleware protects all routes except `/login`.

**Primary recommendation:** Create `app/` as the Next.js project directory. Copy `scraper/src/db/schema.ts` into `app/src/db/schema.ts`, add `lead_notes` table and `lastContactedAt` to `leads`. Build UI with shadcn/ui Sidebar (desktop) + custom bottom tabs (mobile), next-themes for dark/light mode, @hello-pangea/dnd for kanban, and Web Speech API (no library needed) for voice notes. Deploy to Azure App Service with `output: "standalone"` via GitHub Actions.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (stay on 15, not 16) | App Router framework | Project constraint; Next.js 16 has breaking changes (proxy.ts replaces middleware.ts, params must be awaited) — stay on 15.x per existing project pattern |
| TypeScript | 5.x | Type safety | Project constraint |
| Tailwind CSS | v4.x | Styling | Project constraint; v4 is bundler-native, no config file needed |
| shadcn/ui | latest | UI components | Project constraint; verified compatible with Next.js 15 + React 19 + Tailwind v4 |
| React | 19.x | UI rendering | Ships with Next.js 15 |
| next-auth | beta (v5) | Authentication | Only version with first-class App Router support; JWT strategy, no DB adapter needed |
| Drizzle ORM | 0.45.x | Type-safe DB queries | Already used in scraper; copy pattern directly |
| pg (node-postgres) | 8.x | PostgreSQL driver | Already used in scraper; same connection pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-themes | latest | Dark/light mode | Required; wraps root layout in ThemeProvider |
| @hello-pangea/dnd | latest | Kanban drag-and-drop | Kanban pipeline view; simpler API than dnd-kit for list-based DnD |
| date-fns | 4.x | Date formatting | Already in scraper deps; format timestamps on notes/signals |
| zod | 3.x | Runtime validation | Already in scraper deps; validate Server Action inputs |
| bcryptjs | 2.x | Password hashing | Hash AUTH_PASSWORD for comparison in Credentials authorize |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @hello-pangea/dnd | dnd-kit | dnd-kit is more flexible but lower-level; @hello-pangea/dnd has simpler API for column-based kanban. For this use case (5 fixed columns, card movement), @hello-pangea/dnd wins on simplicity. |
| next-auth@beta | Better Auth | Better Auth is gaining traction in 2026 but requires more setup; next-auth@beta is proven on this stack |
| bcryptjs | argon2 | argon2 is more secure but harder to install on Azure (native binaries); bcryptjs is pure JS, zero install friction |

**Installation (web app directory):**
```bash
npx create-next-app@15 app --typescript --tailwind --eslint --app --src-dir
cd app
npx shadcn@latest init
npm install next-auth@beta
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
npm install next-themes @hello-pangea/dnd date-fns zod bcryptjs
npm install -D @types/bcryptjs @types/hello-pangea__dnd
```

---

## Architecture Patterns

### Project Structure

The web app lives at `app/` in the repository root (alongside `scraper/`). The Drizzle schema is copied — not symlinked — from `scraper/src/db/schema.ts` into `app/src/db/schema.ts`. Both projects connect to the same `DATABASE_URL` environment variable.

```
app/                          # Next.js 15 web application
├── src/
│   ├── app/
│   │   ├── layout.tsx        # ThemeProvider + SidebarProvider root
│   │   ├── login/
│   │   │   └── page.tsx      # Login form (unauthenticated)
│   │   ├── (dashboard)/      # Route group — all protected routes
│   │   │   ├── layout.tsx    # Sidebar + mobile bottom nav shell
│   │   │   ├── page.tsx      # Dashboard (property list)
│   │   │   ├── properties/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx  # Property detail (tabbed)
│   │   │   ├── pipeline/
│   │   │   │   └── page.tsx  # Lead pipeline (kanban + list toggle)
│   │   │   └── settings/
│   │   │       └── page.tsx  # Dark/light toggle, target cities config
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts  # Auth.js handler
│   ├── auth.ts               # Auth.js v5 config (Credentials provider)
│   ├── middleware.ts          # Route protection for all routes except /login
│   ├── db/
│   │   ├── schema.ts         # Drizzle schema (copied from scraper + extensions)
│   │   └── client.ts         # Drizzle client (same pattern as scraper)
│   ├── components/
│   │   ├── ui/               # shadcn/ui generated components
│   │   ├── app-sidebar.tsx   # Desktop sidebar navigation
│   │   ├── bottom-nav.tsx    # Mobile bottom tab bar
│   │   ├── property-card.tsx # Dashboard property card
│   │   ├── property-table.tsx # Dashboard list view
│   │   ├── signal-timeline.tsx # Signals tab timeline
│   │   ├── lead-kanban.tsx   # Kanban board with @hello-pangea/dnd
│   │   ├── lead-notes.tsx    # Notes + voice input
│   │   └── theme-toggle.tsx  # Dark/light mode toggle
│   ├── lib/
│   │   ├── queries.ts        # Drizzle query functions
│   │   └── actions.ts        # Server Actions (lead status, notes)
│   └── types/
│       └── index.ts          # Shared TypeScript types
├── next.config.ts            # output: 'standalone'
├── drizzle.config.ts         # Points to src/db/schema.ts
└── package.json
```

### Pattern 1: RSC Data Fetching for Dashboard

The dashboard page is a React Server Component. It fetches data directly from PostgreSQL using Drizzle — no API route needed. Filtering uses URL `searchParams` so filters are bookmarkable and don't require client state.

**What:** Server-rendered list of properties with filter state in URL
**When to use:** Read-heavy pages where data doesn't need real-time updates

```typescript
// Source: https://nextjs.org/docs/app/getting-started/server-and-client-components
// app/src/app/(dashboard)/page.tsx
import { db } from "@/db/client"
import { properties, leads, distressSignals } from "@/db/schema"
import { eq, and, ilike, desc } from "drizzle-orm"

interface DashboardPageProps {
  searchParams: Promise<{
    city?: string
    distressType?: string
    hot?: string
    sort?: string
    status?: string
  }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // In Next.js 15, searchParams is a Promise — must await
  const params = await searchParams

  const results = await db
    .select({
      id: properties.id,
      address: properties.address,
      city: properties.city,
      ownerName: properties.ownerName,
      distressScore: leads.distressScore,
      isHot: leads.isHot,
      leadStatus: leads.status,
      newLeadStatus: leads.newLeadStatus,
      firstSeenAt: leads.firstSeenAt,
      lastViewedAt: leads.lastViewedAt,
    })
    .from(properties)
    .innerJoin(leads, eq(leads.propertyId, properties.id))
    .where(
      and(
        params.city ? ilike(properties.city, `%${params.city}%`) : undefined,
        params.hot === "true" ? eq(leads.isHot, true) : undefined,
        params.status ? eq(leads.status, params.status) : undefined,
      )
    )
    .orderBy(
      params.sort === "date" ? desc(leads.firstSeenAt) : desc(leads.distressScore)
    )
    .limit(100)

  return <PropertyList properties={results} params={params} />
}
```

**Critical Next.js 15 gotcha:** `searchParams` and `params` in page components are now Promises and must be awaited. This changed from Next.js 14 and is a common breaking point.

### Pattern 2: Auth.js v5 Credentials (Single-User, No DB)

For a single-user app, store credentials as env vars. No user table needed. JWT strategy persists session across browser refresh.

```typescript
// Source: https://authjs.dev/getting-started/authentication/credentials
// app/src/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcryptjs from "bcryptjs"
import { z } from "zod"

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        if (email !== process.env.AUTH_EMAIL) return null

        const isValid = await bcryptjs.compare(
          password,
          process.env.AUTH_PASSWORD_HASH!
        )
        if (!isValid) return null

        return { id: "1", email, name: "Investor" }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
})
```

```typescript
// app/src/middleware.ts
export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
}
```

```
# .env.local (Azure App Settings in production)
AUTH_SECRET=<openssl rand -base64 32>
AUTH_EMAIL=investor@example.com
AUTH_PASSWORD_HASH=<bcryptjs.hashSync("yourpassword", 10)>
DATABASE_URL=postgresql://...
```

### Pattern 3: Desktop Sidebar + Mobile Bottom Nav

shadcn/ui Sidebar handles desktop. For mobile bottom nav, use `useSidebar().isMobile` from shadcn's hook to conditionally render a custom bottom tab bar instead of the sidebar drawer.

```typescript
// Source: https://ui.shadcn.com/docs/components/radix/sidebar
// app/src/components/app-sidebar.tsx
"use client"
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu,
         SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"

// app/src/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <MobileBottomNav />  {/* Only renders on mobile via isMobile check */}
        {children}
      </main>
    </SidebarProvider>
  )
}
```

```typescript
// app/src/components/bottom-nav.tsx
"use client"
import { useSidebar } from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function MobileBottomNav() {
  const { isMobile } = useSidebar()
  const pathname = usePathname()

  if (!isMobile) return null  // Desktop: sidebar handles nav

  const items = [
    { href: "/", label: "Dashboard", icon: HomeIcon },
    { href: "/pipeline", label: "Pipeline", icon: KanbanIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex h-16 items-center justify-around">
        {items.map((item) => (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center gap-1 p-2 text-xs
              ${pathname === item.href ? "text-primary" : "text-muted-foreground"}`}>
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

**Note:** shadcn/ui does not have a first-class BottomNavigation component (GitHub issue #8847 confirms it's requested but not shipped). Build it as a custom component using shadcn primitives.

### Pattern 4: Dark/Light Mode with next-themes

```typescript
// Source: https://ui.shadcn.com/docs/dark-mode/next
// app/src/app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

`suppressHydrationWarning` on `<html>` is required — without it, Next.js will throw a hydration mismatch because the server renders without theme class and the client adds it.

### Pattern 5: Kanban Board with @hello-pangea/dnd

The kanban board is a client component. Status updates go through a Server Action. Optimistic UI updates the local state immediately, then the Server Action writes to the DB.

```typescript
// "use client"
// Source: https://github.com/hello-pangea/dnd
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"

const COLUMNS: LeadStatus[] = ["new", "contacted", "follow_up", "closed", "dead"]

export function LeadKanban({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads)

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const newStatus = result.destination.droppableId as LeadStatus
    const leadId = result.draggableId

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))

    // Server Action
    await updateLeadStatus(leadId, newStatus)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(colStatus => (
          <Droppable droppableId={colStatus} key={colStatus}>
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps}
                className={`w-64 flex-shrink-0 rounded-lg p-3
                  ${snapshot.isDraggingOver ? "bg-muted/50" : "bg-muted/20"}`}>
                <h3 className="font-semibold mb-3">{COLUMN_LABELS[colStatus]}</h3>
                {leads.filter(l => l.status === colStatus).map((lead, index) => (
                  <Draggable key={lead.id} draggableId={lead.id} index={index}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.draggableProps}
                        {...provided.dragHandleProps}>
                        <LeadCard lead={lead} />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
}
```

### Pattern 6: Voice-to-Text Notes (Web Speech API)

No library needed. The Web Speech API is built into Chrome/Chromium browsers. Use with graceful degradation for unsupported browsers.

```typescript
// "use client"
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
export function VoiceNoteInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isListening, setIsListening] = useState(false)

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input not supported in this browser. Use Chrome.")
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onTranscript(transcript)
    }
    recognition.onend = () => setIsListening(false)

    setIsListening(true)
    recognition.start()
  }

  return (
    <button onClick={startListening} type="button"
      className={`p-2 rounded-full ${isListening ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}
      title={isListening ? "Listening..." : "Voice note"}>
      <MicrophoneIcon className="h-5 w-5" />
    </button>
  )
}
```

**Browser support:** Chrome (desktop + Android): full support. Safari iOS: limited (does not auto-stop). Firefox: not supported. Since the user is primarily on mobile for field use, test on Android Chrome specifically.

### Pattern 7: Azure App Service Deployment (Standalone)

```typescript
// app/next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
}

export default nextConfig
```

```yaml
# .github/workflows/deploy-app.yml
name: Deploy Web App to Azure

on:
  push:
    branches: [main]
    paths: ["app/**"]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20.x"
          cache: "npm"
          cache-dependency-path: app/package-lock.json

      - name: Install and build
        working-directory: app
        run: |
          npm ci
          npm run build

      - name: Assemble standalone package
        working-directory: app
        run: |
          cp -r .next/static .next/standalone/.next/static
          cp -r public .next/standalone/public

      - name: Deploy to Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: app/.next/standalone
```

Azure App Service startup command (set in Azure Portal > Configuration > General Settings):
```
node server.js
```

### Schema Extensions Required

The Phase 1 schema needs two additions before the web app can be built. These are new Drizzle migrations on the existing Azure PostgreSQL database:

```typescript
// Additions to app/src/db/schema.ts (also run drizzle-kit migrate on the DB)

// 1. Add lastContactedAt to leads table
export const leads = pgTable("leads", {
  // ... existing columns ...
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),  // NEW
})

// 2. New lead_notes table
export const leadStatusEnum = pgEnum("lead_status", [
  "new", "contacted", "follow_up", "closed", "dead"
])

export const leadNotes = pgTable(
  "lead_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    leadId: uuid("lead_id").notNull().references(() => leads.id),
    noteText: text("note_text").notNull(),
    noteType: text("note_type").notNull().default("user"),  // "user" | "status_change"
    previousStatus: text("previous_status"),  // for status_change notes
    newStatus: text("new_status"),            // for status_change notes
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_lead_notes_lead_id").on(table.leadId),
  ]
)
```

**Note:** The existing `leads.status` column is `text` type with default `"new"`. The web app can use this as-is without a schema change for the status values. A pgEnum for lead status would be cleaner but requires a migration. Recommendation: use text with Zod validation in Server Actions to enforce valid values.

### Anti-Patterns to Avoid

- **Using `useEffect` for initial data fetching:** In Next.js 15 App Router, fetch data in async Server Components directly. `useEffect` data fetching is a Pages Router pattern.
- **Putting Drizzle client in a client component:** The `db` object uses Node.js APIs (pg pool). It must only be imported in Server Components, Server Actions, or Route Handlers. Never in `"use client"` files.
- **Calling `auth()` in every Server Component:** Call `auth()` once in layout, pass session to children via props or use the `auth()` call in individual pages. Calling it repeatedly adds latency.
- **Forgetting `await searchParams` in Next.js 15:** In Next.js 15, `searchParams` and `params` in page/layout components are Promises. Accessing them synchronously will throw or return undefined.
- **No `suppressHydrationWarning` on `<html>`:** Required when using next-themes. Without it, theme class hydration mismatches cause console errors in development.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management + CSRF | Custom JWT cookie auth | Auth.js v5 | CSRF tokens, cookie security, session rotation, secure httpOnly cookies — all handled |
| Drag-and-drop accessibility | Custom drag handlers | @hello-pangea/dnd | Keyboard navigation, screen reader announcements, touch support |
| Theme persistence across reload | localStorage + useEffect | next-themes | Handles SSR hydration mismatch, OS preference detection, persistence |
| Password comparison timing attacks | `===` string compare | bcryptjs.compare | Constant-time comparison prevents timing attacks |
| Data table sorting/filtering | Custom sort state | URL searchParams (RSC pattern) | Bookmarkable, shareable, no hydration needed |

**Key insight:** The most dangerous hand-roll in this phase is auth. For a single-user tool, it's tempting to do `if (password === process.env.PASSWORD)` — this is vulnerable to timing attacks and has no CSRF protection. Use Auth.js v5 even though it feels like overkill.

---

## Common Pitfalls

### Pitfall 1: searchParams is a Promise in Next.js 15
**What goes wrong:** `searchParams.city` returns undefined; filters silently stop working.
**Why it happens:** Next.js 15 made `searchParams` and `params` async Promises. Code written for Next.js 14 doesn't await them.
**How to avoid:** Always `const params = await searchParams` before accessing properties.
**Warning signs:** Filters and URL params seem to do nothing on first load.

### Pitfall 2: Drizzle Client Imported in Client Component
**What goes wrong:** Build error: "Module not found: Can't resolve 'pg'" or "fs not found" in browser bundle.
**Why it happens:** `pg` uses Node.js built-ins (`net`, `tls`, `fs`). When Drizzle client is imported anywhere reachable from a `"use client"` component, Next.js tries to bundle it for the browser.
**How to avoid:** Keep all DB imports inside Server Components, Server Actions (`"use server"`), or Route Handlers. Use Server Actions to pass data mutations from client components.
**Warning signs:** Build errors mentioning Node.js core modules in the browser bundle.

### Pitfall 3: Auth.js v5 Beta API Changes
**What goes wrong:** Code from blog posts using Auth.js v5 beta doesn't work because the API changed between beta versions.
**Why it happens:** next-auth@beta (v5) has been in beta since 2023 and had multiple breaking API changes.
**How to avoid:** Check the installed version with `npm list next-auth`. The current stable beta as of March 2026 follows the `NextAuth({ providers: [...] })` pattern documented at authjs.dev. Do NOT follow tutorials using `export default NextAuth(...)` (that's v4 syntax).
**Warning signs:** `handlers`, `auth`, `signIn`, `signOut` are not exported from your auth.ts.

### Pitfall 4: Standalone Output Missing Static Assets
**What goes wrong:** Deployed app has broken images or missing CSS.
**Why it happens:** `next build` with `output: "standalone"` creates `.next/standalone/` but does NOT copy `.next/static/` or `public/` into it. These must be copied manually in the CI workflow.
**How to avoid:** Always include these steps in GitHub Actions:
```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```
**Warning signs:** App deploys but CSS is missing or images return 404.

### Pitfall 5: @hello-pangea/dnd and React 19 Strict Mode
**What goes wrong:** Drag-and-drop doesn't work in development mode; works fine in production.
**Why it happens:** React 19 Strict Mode double-invokes effects, which can interfere with DnD event listeners.
**How to avoid:** Test in production build (`next build && next start`) to verify DnD works. In development, disable React Strict Mode temporarily if DnD is broken. Note: @hello-pangea/dnd is a maintained fork of react-beautiful-dnd with React 18/19 compatibility fixes.
**Warning signs:** Dragging works on first attempt but breaks on subsequent drags in dev mode.

### Pitfall 6: Web Speech API Requires HTTPS
**What goes wrong:** Microphone button does nothing, or browser blocks mic access.
**Why it happens:** The Web Speech API requires a secure context (HTTPS) or localhost. HTTP deployments silently fail.
**How to avoid:** Azure App Service uses HTTPS by default — this is not a problem in production. In local development, use `next dev` on localhost (counts as secure context).
**Warning signs:** `window.SpeechRecognition` exists but permission is denied.

### Pitfall 7: leads.status vs newLeadStatus Confusion
**What goes wrong:** Dashboard "new" badge doesn't appear, or pipeline filter shows wrong results.
**Why it happens:** The Phase 1 schema has two status fields on `leads`: `status` (user-controlled: new/contacted/follow_up/closed/dead) and `newLeadStatus` (system-controlled: new/unreviewed). These are separate concerns. `status` drives the pipeline; `newLeadStatus` drives the "new since last visit" badge.
**How to avoid:** Understand the field distinction before building filters. The "new" badge uses `newLeadStatus === "new"` AND `lastViewedAt IS NULL` (or `firstSeenAt > lastViewedAt`). The pipeline filter uses `status`.
**Warning signs:** All leads show as "new" forever, or the badge logic is using the wrong field.

---

## Code Examples

### Dashboard Stats Bar Query
```typescript
// Source: Drizzle ORM docs + schema analysis
// app/src/lib/queries.ts
export async function getDashboardStats() {
  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      hot: sql<number>`count(*) filter (where ${leads.isHot})::int`,
      newToday: sql<number>`count(*) filter (where ${leads.firstSeenAt} > now() - interval '24 hours')::int`,
      needsFollowUp: sql<number>`count(*) filter (where ${leads.status} = 'follow_up')::int`,
    })
    .from(leads)

  return totals
}
```

### Server Action for Lead Status Update
```typescript
// Source: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
// app/src/lib/actions.ts
"use server"
import { auth } from "@/auth"
import { db } from "@/db/client"
import { leads, leadNotes } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const updateStatusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["new", "contacted", "follow_up", "closed", "dead"]),
  note: z.string().optional(),
})

export async function updateLeadStatus(leadId: string, status: string, note?: string) {
  const session = await auth()
  if (!session) throw new Error("Unauthorized")

  const { leadId: lid, status: newStatus, note: noteText } = updateStatusSchema.parse({ leadId, status, note })

  const existingLead = await db.select({ status: leads.status })
    .from(leads).where(eq(leads.id, lid)).limit(1)
  const previousStatus = existingLead[0]?.status

  await db.update(leads)
    .set({
      status: newStatus,
      lastContactedAt: newStatus === "contacted" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, lid))

  // Auto-log status change as a note
  await db.insert(leadNotes).values({
    leadId: lid,
    noteText: noteText ?? `Status changed from ${previousStatus} to ${newStatus}`,
    noteType: "status_change",
    previousStatus,
    newStatus,
  })

  revalidatePath("/pipeline")
  revalidatePath(`/properties/${lid}`)
}
```

### "New Since Last Visit" Badge Logic
```typescript
// app/src/lib/queries.ts
// Marks a lead as viewed, clears the "new" badge
export async function markLeadViewed(propertyId: string) {
  "use server"  // Can also be a standalone Server Action
  await db.update(leads)
    .set({ lastViewedAt: new Date() })
    .where(eq(leads.propertyId, propertyId))
}

// Badge condition: property was seen by scraper after user last viewed it
const isNewForUser = (lead: Lead) => {
  if (!lead.lastViewedAt) return true  // Never viewed
  return lead.firstSeenAt > lead.lastViewedAt
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 (pages router) | Auth.js v5 (app router) | 2023-2024 | v4 patterns don't work in App Router; must use v5 |
| `getServerSideProps` for data fetching | Async Server Components | Next.js 13+ | Simpler, no serialization, direct DB access |
| `searchParams` as synchronous prop | `searchParams` as Promise (must await) | Next.js 15 | Breaking change from Next.js 14 |
| middleware.ts | proxy.ts (Next.js 16 only) | Next.js 16 | Stay on 15.x — middleware.ts still correct |
| `tailwind.config.js` | Inline CSS with Tailwind v4 | Tailwind v4 | No config file needed; CSS-based configuration |
| react-beautiful-dnd | @hello-pangea/dnd | 2023 | react-beautiful-dnd is unmaintained; @hello-pangea/dnd is the maintained fork |

**Deprecated/outdated:**
- `export default NextAuth(config)`: v4 pattern. v5 uses named exports `export const { handlers, auth, signIn, signOut } = NextAuth(config)`
- `getServerSideProps` for auth checks: Use `auth()` in Server Components directly
- `next/router` (Pages Router): Use `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) in App Router

---

## Open Questions

1. **Web app directory: `app/` vs root**
   - What we know: Root currently has `scraper/` and `get-shit-done/`. Next.js requires being at the package root.
   - What's unclear: Whether to create `app/` subdirectory (cleaner separation) or scaffold at repo root.
   - Recommendation: Use `app/` subdirectory. Keeps scraper and web app cleanly separated. Both will have their own `package.json`, `node_modules`, and `tsconfig.json`. This avoids Node.js module resolution conflicts between the Azure Functions scraper (ESM, `.js` imports required) and the Next.js app (its own module system).

2. **Schema migration on live database**
   - What we know: Phase 1 schema is deployed to Azure PostgreSQL. Adding `lastContactedAt` to `leads` and a new `lead_notes` table requires running `drizzle-kit migrate` against the live DB.
   - What's unclear: Whether there is existing data in `leads` that could be affected.
   - Recommendation: `lastContactedAt` is nullable — safe to add with no default. `lead_notes` is a new table — safe to add. Run `drizzle-kit generate` and `drizzle-kit migrate` in the web app's `drizzle.config.ts` during Wave 0 setup.

3. **DASH-06: Target city configuration UI**
   - What we know: `scraperConfig` table stores a `target_cities` key (or similar). The web app needs a settings page to read/write this.
   - What's unclear: Exact key name and value format in `scraperConfig` for city targeting.
   - Recommendation: Check `scraperConfig` rows in the live DB during Wave 0. Build a simple textarea or tag-input UI that serializes to JSON and updates the config row via a Server Action.

4. **lead_notes vs leads.status for timeline on Notes tab**
   - What we know: Context says Notes tab shows "timestamped notes from user + status change history."
   - Recommendation: Store both user notes and status changes in `lead_notes` with `noteType` field (`"user"` vs `"status_change"`). Query all rows for a lead and render them in chronological order on the Notes tab.

---

## Sources

### Primary (HIGH confidence)
- https://nextjs.org/docs/app/guides/self-hosting — standalone output, environment variables, streaming config (verified March 2026, Next.js docs v16.2.0)
- https://nextjs.org/docs/app/getting-started/deploying — Node.js server deployment options
- https://authjs.dev/getting-started/authentication/credentials — Auth.js v5 credentials provider configuration
- https://authjs.dev/reference/nextjs — Auth.js v5 middleware and session patterns
- https://ui.shadcn.com/docs/components/radix/sidebar — Sidebar component API, isMobile hook
- https://ui.shadcn.com/docs/dark-mode/next — next-themes setup with ThemeProvider
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API — Web Speech API browser support
- scraper/src/db/schema.ts — Phase 1 schema (read directly from codebase)
- scraper/src/db/client.ts — Drizzle + pg connection pattern (read directly from codebase)

### Secondary (MEDIUM confidence)
- https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui — @dnd-kit + shadcn kanban reference
- https://marmelab.com/blog/2026/01/15/building-a-kanban-board-with-shadcn.html — @hello-pangea/dnd + shadcn kanban (January 2026)
- https://github.com/hello-pangea/dnd — @hello-pangea/dnd library (active fork of react-beautiful-dnd)
- https://www.bswanson.dev/blog/deploy-nextjs-standalone-azure-app-service/ — GitHub Actions workflow for standalone Azure deployment
- https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react — dnd-kit vs @hello-pangea/dnd comparison 2026

### Tertiary (LOW confidence — validate before implementation)
- Web Speech API iOS Safari support — MDN lists "limited" support; test on actual device before committing
- dnd-kit React 19 Strict Mode compatibility — multiple GitHub issues report DnD problems in dev mode; needs testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified against official docs; versions match existing scraper deps
- Architecture: HIGH — patterns verified against Next.js 15 official docs (March 2026 versions)
- Pitfalls: HIGH — searchParams Promise and standalone build issues verified against official docs; others MEDIUM (observed patterns in community)
- Azure deployment: MEDIUM — standalone + GitHub Actions pattern confirmed from multiple sources; Azure-specific startup command confirmed

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (30 days — next-auth@beta may update; check version before implementation)
