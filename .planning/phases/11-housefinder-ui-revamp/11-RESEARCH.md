# Phase 11: HouseFinder UI Revamp - Research

**Researched:** 2026-03-26
**Domain:** UI/UX redesign — Next.js 15, Tailwind CSS v4, shadcn/ui, dark mode, mobile-first
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Design Direction**
- Fresh, new aesthetic — NOT matching No BS Homes colors
- Premium internal dashboard feel — like Linear, Notion, Stripe Dashboard
- Dark mode as primary (with light mode option) — modern admin dashboard vibe
- Clean, spacious, breathing room — declutter aggressively
- This is a private tool, not a public website

**Mobile-First Priority**
- Must work on Shawn's Android phone
- Responsive breakpoints: mobile (default) → tablet → desktop
- Touch-friendly tap targets (min 44px)
- Bottom navigation on mobile (already exists but needs improvement)
- Cards/tables that stack properly on small screens

**Dashboard (Highest Priority)**
- Declutter the stats bar — maybe collapsible or simplified
- Property cards need better mobile layout
- Filters should be collapsible/hidden on mobile (slide-out panel?)
- Search should be prominent
- Reduce visual noise — fewer borders, softer shadows

**Navigation Redesign**
- Sidebar on desktop, bottom nav on mobile
- Current nav: Dashboard, Map, Deals, Analytics, Pipeline, Settings
- Consider consolidating or reorganizing
- Settings shouldn't be a top-level nav item on mobile

**All Pages Need Work**
- Dashboard: declutter, better cards, responsive
- Deals: kanban needs mobile treatment (horizontal scroll or list fallback)
- Analytics: charts need mobile responsiveness
- Deal Detail: too many tabs — consider scrolling sections instead of tabs on mobile
- Map: already works but could look better
- Login: first impression, should look premium

**Typography & Colors**
- Fresh color palette — designer's choice but should feel modern/premium
- Quality fonts — distinctive, not generic
- Consistent spacing scale
- Dark mode primary

### Claude's Discretion
- Color palette selection (fresh, modern, premium dashboard feel)
- Font pairing
- Component library approach (enhance existing shadcn or custom)
- Animation/transition strategy
- Icon style
- Layout architecture decisions

### Deferred Ideas (OUT OF SCOPE)
- Customizable dashboard layouts (drag-and-drop widgets)
- User preferences for card density (compact/comfortable/spacious)
- Keyboard shortcuts beyond Cmd+K
- Custom themes/skins
</user_constraints>

---

## Summary

HouseFinder currently has a terracotta/desert amber aesthetic using Bebas Neue + Oswald + Nunito Sans fonts on a warm sand light theme. The dark mode exists (`#222222` backgrounds) but uses flat mid-grays without depth gradients. The overall impression is functional but not premium — it looks like a competent first-pass dashboard rather than a Linear/Notion-caliber tool. The design needs a refresh toward a darker, more sophisticated palette with genuine depth.

The technical infrastructure is sound: Tailwind CSS v4 with `@custom-variant dark (&:is(.dark *))`, next-themes 0.4.6 with `attribute="class"`, shadcn/ui components all wired up. The dark mode is already working correctly. The revamp is purely CSS/layout work — no infrastructure changes needed. This is a surface redesign, not a rebuild.

The biggest practical challenge is the filter bar (7 filter controls on mobile), the stats bar (5 cards that currently use 2-column grid on mobile), and the deal kanban (10 columns that cannot fit on phone screens). These three components have the highest leverage for improving the mobile experience and should be addressed first.

**Primary recommendation:** Adopt a slate/zinc dark neutral base with a blue-violet accent, replace the 3-font system with Inter variable font only, and move filters into a bottom drawer Sheet on mobile. Everything else is incremental polish.

---

## Standard Stack

### Core (Already Installed — No New Packages Needed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| next-themes | 0.4.6 | Dark/light mode toggle | Already configured with `attribute="class"` |
| tailwindcss | v4 | Styling | CSS-first config in globals.css, no tailwind.config.ts |
| shadcn/ui | 4.0.8 | Component library | Sheet, Drawer, Command not yet added |
| lucide-react | 0.577.0 | Icons | Already installed |
| tw-animate-css | 1.4.0 | CSS animations | Already installed |

### Shadcn Components to Add

| Component | Purpose | How to Install |
|-----------|---------|----------------|
| `Drawer` | Filter slide-up panel on mobile | `npx shadcn@latest add drawer` |
| `Command` | Cmd+K command palette (per CONTEXT specifics) | `npx shadcn@latest add command` |
| `Dialog` | Paired with Command for overlay | `npx shadcn@latest add dialog` |
| `Progress` | Score bar improvements | `npx shadcn@latest add progress` |
| `Scroll Area` | Kanban horizontal scroll container | `npx shadcn@latest add scroll-area` |

### Font Change (Claude's Discretion)

**Current:** Bebas Neue (display) + Oswald (heading) + Nunito Sans (body) loaded from Google Fonts via CSS `@import`

**Recommended:** Replace all three with **Inter** (variable weight, single font file via `next/font/google`). Inter is the standard for premium SaaS dashboards (Linear, Vercel, Stripe all use it). Load via Next.js font optimization:

```typescript
// app/layout.tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
```

Rationale: Bebas Neue is a display-only condensed font designed for posters, not data dashboards. Oswald adds a secondary heading font that creates inconsistency. A single variable-weight Inter simplifies the system and matches the Linear/Notion aesthetic exactly. The current fonts contribute to the "generic" feel the user wants to move away from.

**Alternative if Brian wants character:** Geist Sans (Vercel's custom font, free, available via `next/font/google`) pairs with Inter Mono for code-like data displays.

**Installation:**
```bash
# No npm install needed — all via next/font/google
# Remove Google Fonts @import from globals.css
# Add to app/layout.tsx
```

---

## Architecture Patterns

### Recommended File Touch Order

The redesign should be executed in waves to minimize risk:

```
Wave 1 — Foundation (globals.css only, zero component risk)
  globals.css              ← New color palette + font variables

Wave 2 — Layout Shell (affects all pages, low risk)
  app/layout.tsx           ← Font loading
  app/(dashboard)/layout.tsx ← Main padding/spacing
  components/app-sidebar.tsx ← Desktop nav visual refresh
  components/bottom-nav.tsx  ← Mobile nav improvements

Wave 3 — Dashboard Page (highest priority)
  components/stats-bar.tsx   ← Simplified horizontal strip
  components/dashboard-filters.tsx ← Mobile drawer pattern
  components/property-card.tsx     ← Card visual refresh

Wave 4 — Inner Pages
  app/(dashboard)/deals/page.tsx     ← Kanban mobile fix
  components/deal-kanban.tsx         ← Horizontal scroll
  app/(dashboard)/analytics/page.tsx ← Chart container sizing
  app/login/page.tsx                 ← Login polish

Wave 5 — Detail Pages
  app/(dashboard)/properties/[id]/page.tsx  ← Property detail
  app/(dashboard)/deals/[id]/page.tsx       ← Deal detail tabs
```

### Pattern 1: New Color Palette (Dark Mode Primary)

**Recommended palette:** Slate-based neutrals + violet accent. This is the closest match to Linear's aesthetic.

```css
/* globals.css — replace existing color variables */

/* DARK theme (primary) */
.dark {
  --background: #0f0f11;        /* Near-black with slight blue */
  --foreground: #f4f4f5;        /* Zinc-100 */
  --card: #18181b;              /* Zinc-900 */
  --card-foreground: #f4f4f5;
  --popover: #27272a;           /* Zinc-800 */
  --popover-foreground: #f4f4f5;
  --primary: #7c3aed;           /* Violet-700 — accent */
  --primary-foreground: #ffffff;
  --secondary: #27272a;
  --secondary-foreground: #a1a1aa;
  --muted: #27272a;
  --muted-foreground: #71717a;  /* Zinc-500 */
  --border: #3f3f46;            /* Zinc-700 */
  --input: #27272a;
  --ring: #7c3aed;
  --sidebar: #09090b;           /* True black sidebar */
  --sidebar-foreground: #d4d4d8;
  --sidebar-primary: #7c3aed;
  --sidebar-accent: #18181b;
  --sidebar-border: #27272a;
}

/* LIGHT theme */
:root {
  --background: #fafafa;
  --foreground: #09090b;
  --card: #ffffff;
  --primary: #6d28d9;           /* Violet-700 lighter shade */
  --border: #e4e4e7;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;
  --sidebar: #09090b;           /* Keep sidebar dark in light mode too */
  --sidebar-foreground: #d4d4d8;
}
```

**Why violet accent over terracotta:** The terracotta/amber palette skews warm-lifestyle rather than precision-tool. Violet is the accent of Linear, Raycast, and other premium devtools. It reads as "intelligent" rather than "friendly." For a distressed property finder that surfaces financial opportunity, this tone is more appropriate.

**Alternative accent:** Electric blue (`#3b82f6` / blue-500) if violet feels too purple. Both work on dark backgrounds.

### Pattern 2: Mobile Filter Drawer

The current filter bar has 7 controls (`Search`, `City`, `Owner Type`, `Distress Type`, `Tier`, `Hot Only`, `Sort`). On mobile this creates a vertical stack that pushes content far down.

**Solution:** Persistent search bar + "Filters" button that opens a `Sheet` component from the bottom.

```tsx
// Mobile layout (< md breakpoint)
<div className="flex gap-2">
  <SearchInput className="flex-1" />       {/* Always visible */}
  <FilterDrawerButton activeCount={activeFilters} />  {/* Opens sheet */}
</div>

// Desktop layout (>= md breakpoint)
<div className="flex flex-wrap gap-2">
  {/* All filters inline as before */}
</div>
```

```tsx
// Filter button shows active filter count badge
<Button variant="outline" size="sm" onClick={() => setOpen(true)}>
  <SlidersHorizontal className="h-4 w-4 mr-2" />
  Filters
  {activeCount > 0 && (
    <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
      {activeCount}
    </span>
  )}
</Button>
```

```tsx
// Sheet from bottom on mobile — shadcn Sheet component
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
    <SheetHeader>
      <SheetTitle>Filters</SheetTitle>
    </SheetHeader>
    {/* All filter controls stacked vertically */}
    <div className="space-y-4 pt-4">
      <CitySelect />
      <OwnerTypeSelect />
      <DistressTypeSelect />
      <TierSelect />
      <HotLeadsToggle />
      <SortSelect />
    </div>
    <SheetFooter>
      <Button onClick={() => { clearFilters(); setOpen(false); }}>Clear All</Button>
      <Button onClick={() => setOpen(false)}>Apply</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

**Implementation note:** `sheet.tsx` is already installed in `app/src/components/ui/sheet.tsx`. No new package needed.

### Pattern 3: Stats Bar Simplification

Current: 5 large cards in a 2-col/5-col grid, each with a large icon circle + Bebas Neue number + label. This takes significant vertical space on mobile.

**Recommended:** Horizontal scrolling stat pills on mobile, compact inline row on desktop.

```tsx
// Single horizontal scroll row (mobile) or inline flex (desktop)
<div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
  {statCards.map(card => (
    <Link href={card.href} key={card.key}
      className="flex-shrink-0 flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-3 hover:bg-accent transition-colors">
      <card.icon className={`h-4 w-4 ${card.iconColor}`} />
      <span className="text-2xl font-bold tabular-nums">{stats[card.key]}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{card.label}</span>
    </Link>
  ))}
</div>
```

This reduces the stats section from ~180px tall on mobile to ~56px.

### Pattern 4: Kanban Mobile Treatment

The deal kanban has 10 columns with `@hello-pangea/dnd` drag-and-drop. DnD on mobile touch is functional but unwieldy with 10 columns.

**Solution:** The page already has a `view` searchParam with `kanban` and `list` toggles. The fix is:
1. Default to `list` view when `isMobile` (detect via `useSidebar().isMobile` — already available)
2. Make the kanban container horizontally scrollable with `overflow-x-auto` and `min-w-[280px]` per column
3. Add a clear "Switch to List view" CTA at the top of kanban on mobile

```tsx
// deals/page.tsx — default view based on screen
// Can't detect mobile server-side reliably; best approach:
// Default URL has no view param → client component reads window.innerWidth
// OR: always show both tabs, add class "hidden md:block" to kanban, "block md:hidden" to list-view hint

// In DealKanban — wrap the scrollable container:
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <div className="flex gap-3" style={{ minWidth: "max-content" }}>
    {/* Each column min-w-[260px] max-w-[300px] */}
  </div>
</div>
```

**Note:** `@hello-pangea/dnd` supports horizontal scroll containers — the `Droppable` component works inside overflow-x containers. Touch dragging works but is clunky with many columns. The list view is the better mobile experience.

### Pattern 5: Property Card Mobile Optimization

Current card is already reasonable but can be tightened for mobile. Key issue: the score section (circle + bar + lead status) takes 3 separate rows.

**Recommended change:** Collapse score display into a single compact row:
```tsx
// Single row: [score-badge] [bar fills remaining] [tier-badge]
<div className="flex items-center gap-2 mt-2">
  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${tier.scoreCircleClass}`}>
    {displayScore}
  </span>
  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
    <div className={`h-full rounded-full ${tier.barColor}`} style={{ width: `${pct}%` }} />
  </div>
  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${tier.badgeClass}`}>
    {hot && <Flame className="h-3 w-3" />}
    {tier.label}
  </span>
</div>
```

### Pattern 6: Dark Mode — Current Setup is Correct

The existing dark mode setup uses:
- `@custom-variant dark (&:is(.dark *))` in globals.css — correct for Tailwind v4
- `attribute="class"` on ThemeProvider — matches the variant
- `defaultTheme="system"` with `enableSystem`

**No changes needed to the dark mode mechanism.** The new palette just replaces the CSS variable values inside `:root` and `.dark` blocks.

**Key verified fact (HIGH confidence):** The shadcn/ui Tailwind v4 docs confirm this exact pattern — move `:root`/`.dark` outside `@layer base`, wrap values in `hsl()`, use `@theme inline` to map them. The current codebase already does this correctly.

### Pattern 7: Command Palette (Cmd+K)

The CONTEXT.md lists this as a "specific idea" — it's in scope per the decisions. shadcn `Command` + `Dialog` is the standard implementation.

```tsx
// components/command-menu.tsx — global Cmd+K handler
"use client";
import { useEffect, useState } from "react";
import { CommandDialog, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { useRouter } from "next/navigation";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Go to page, search leads..." />
      <CommandList>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => { router.push("/"); setOpen(false); }}>Dashboard</CommandItem>
          <CommandItem onSelect={() => { router.push("/map"); setOpen(false); }}>Map</CommandItem>
          {/* etc */}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

Add `<CommandMenu />` to the dashboard layout. On mobile, expose it via a search icon in the bottom nav or header.

### Anti-Patterns to Avoid

- **Changing Tailwind v4 config:** No `tailwind.config.ts` exists and none should be created. All configuration stays in `globals.css`. Do not add a `darkMode: 'class'` config — it's set via `@custom-variant`.
- **Replacing shadcn components with third-party:** The shadcn components are already customized. Don't swap `Button`, `Select`, `Input` for other libraries — just style them.
- **Global CSS rewrites that break specificity:** The `.dark .card-warm`, `.dark .card-photo` overrides must be preserved or migrated carefully. They provide dark mode overrides for custom utility classes.
- **Removing the `hot-pulse` pseudo-element:** It uses `z-index: -1` and `position: relative` — removing it requires auditing all PropertyCard usages.
- **Font loading via CSS `@import`:** The current `globals.css` uses `@import url('https://fonts.googleapis.com/...')` — Google Fonts CSS imports. In Next.js 15, fonts should be loaded via `next/font/google` in `layout.tsx` for performance. Mixing both will load fonts twice.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile filter panel | Custom modal/overlay | shadcn `Sheet` (already installed) | Focus trapping, scroll lock, accessible |
| Command palette search | Custom search overlay | shadcn `Command` + `Dialog` | Keyboard nav, fuzzy search, accessibility |
| Horizontal scroll kanban | Custom scroll container | Native `overflow-x-auto` + CSS | No library needed; @hello-pangea/dnd works inside |
| Skeleton loading states | Animated divs | shadcn `Skeleton` (already installed) | Matches design system, accessible |
| Theme persistence | localStorage + JS | next-themes (already installed) | Flash-of-unstyled-content prevention |
| Dark mode variant | Custom CSS class logic | Tailwind `@custom-variant dark` (already configured) | No changes needed |

**Key insight:** Every hard problem in this phase has a solved shadcn/ui answer. The work is configuration and CSS, not new libraries.

---

## Common Pitfalls

### Pitfall 1: Font Double-Loading

**What goes wrong:** New `next/font/google` Inter in `layout.tsx` + existing `@import url('...')` in `globals.css` both load. Google Fonts gets fetched twice.
**Why it happens:** Developer adds Next.js font optimization without removing the CSS import.
**How to avoid:** When adding `inter` to `layout.tsx`, simultaneously delete the `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue...')` line from `globals.css`.
**Warning signs:** Network tab shows two requests to `fonts.googleapis.com`.

### Pitfall 2: Dark Mode Flash (FOUC)

**What goes wrong:** Page loads in light mode briefly before JS runs and applies dark class.
**Why it happens:** next-themes adds the class after hydration.
**How to avoid:** The current setup already has `suppressHydrationWarning` on `<html>`. `disableTransitionOnChange` is set. This is already correctly handled. Don't remove these.
**Warning signs:** Visible white flash when loading in dark mode preference.

### Pitfall 3: shadcn Component `render` Prop Pattern

**What goes wrong:** Using `asChild` on shadcn v4 components instead of `render` prop, breaking composition.
**Why it happens:** shadcn v4 changed from Radix `asChild` to a `render` prop pattern (documented in STATE.md decision `[02-01]`).
**How to avoid:** Follow the existing pattern in `app-sidebar.tsx` and `theme-toggle.tsx`: use `render={<Component />}` not `asChild`.
**Warning signs:** Console errors about invalid prop or unexpected rendering behavior.

### Pitfall 4: Tailwind v4 Purging Custom Color Names

**What goes wrong:** New palette variables defined in `:root` and `.dark` but the Tailwind theme map in `@theme inline` isn't updated, so `bg-primary`, `text-muted-foreground` etc. still point to old values.
**Why it happens:** The `@theme inline` block maps CSS vars to Tailwind utilities. If only the `:root`/`.dark` values are updated but `@theme inline` isn't kept in sync, colors break.
**How to avoid:** The current `@theme inline` block in globals.css uses `var(--background)` etc. This correctly delegates to the CSS variables — so only the variable *values* in `:root`/`.dark` need changing, not the `@theme inline` mappings.
**Warning signs:** `bg-background` shows wrong color; Safari devtools shows CSS var resolving to unexpected value.

### Pitfall 5: Stats Bar Overflow on Mobile

**What goes wrong:** Horizontal scrolling stat pills overscroll past viewport edge, showing white space.
**Why it happens:** Using `-mx-4 px-4` negative margin trick requires the parent to have `overflow-hidden` or the body not to have `overflow-x: hidden`.
**How to avoid:** Test on real Android device or Chrome DevTools mobile emulation. Use `overscroll-x-contain` on the scroll container.
**Warning signs:** Horizontal page scrolling appears on mobile.

### Pitfall 6: @hello-pangea/dnd Touch Events in Overflow-X Container

**What goes wrong:** Drag-and-drop stops working after wrapping kanban in `overflow-x-auto`.
**Why it happens:** `@hello-pangea/dnd` relies on pointer events; overflow containers can intercept scroll vs. drag intention.
**How to avoid:** The `DragDropContext` should be *outside* the scroll container — only the column layout div goes inside. Touch drag on mobile is inherently less reliable; default to list view on mobile to sidestep this.
**Warning signs:** Cards don't drag; touch starts a scroll instead.

### Pitfall 7: Removing `hot-pulse` Background Gradient

**What goes wrong:** Property cards lose the red hot-lead glow effect.
**Why it happens:** `hot-pulse::before` uses `z-index: -1` which requires the parent to have `position: relative`. If the card redesign removes `position: relative` from the container, the pseudo-element disappears behind parent.
**How to avoid:** Keep `position: relative` on the card wrapper when `hot` is true, or port the effect to a different approach (e.g., `ring-2 ring-red-500/40`).

---

## Code Examples

### Tailwind v4 Dark Mode Variant (Current — Verified Working)

```css
/* Source: app/src/app/globals.css (existing, confirmed correct) */
@custom-variant dark (&:is(.dark *));
```

This is the correct Tailwind v4 syntax. The `@custom-variant` directive replaces the `darkMode: 'class'` config option from v3.

### next-themes ThemeProvider (Current — Verified Working)

```tsx
// Source: app/src/app/layout.tsx (existing)
<ThemeProvider
  attribute="class"          // Matches @custom-variant dark (&:is(.dark *))
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
```

### shadcn Sheet for Filter Drawer

```tsx
// Source: https://ui.shadcn.com/docs/components/radix/drawer
// sheet.tsx is already installed at app/src/components/ui/sheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function FilterDrawer({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filter Leads</SheetTitle>
        </SheetHeader>
        <div className="pt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
```

### Next.js Font Loading (Replacing CSS @import)

```tsx
// Source: https://nextjs.org/docs/app/building-your-application/optimizing/fonts
// app/src/app/layout.tsx — replace existing pattern
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// In RootLayout:
<body className={`${inter.variable} ${geistMono.variable} antialiased`}>
```

```css
/* globals.css — @theme inline block update */
@theme inline {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  /* Remove --font-display and --font-heading — Inter covers all weights */
}
```

### Horizontal Kanban Scroll Container

```tsx
// Wraps the existing DragDropContext without modifying DnD internals
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-4">
  <div className="flex gap-3" style={{ minWidth: "max-content" }}>
    {/* existing column code — add min-w-[260px] to each column */}
  </div>
</div>
```

---

## Current Component Inventory — What Needs Most Work

| Component | File | Issue | Priority |
|-----------|------|-------|----------|
| DashboardFilters | `components/dashboard-filters.tsx` | 7 controls vertical stack on mobile | HIGH |
| StatsBar | `components/stats-bar.tsx` | 5 large cards, grid takes 2 cols on mobile | HIGH |
| PropertyCard | `components/property-card.tsx` | Score section takes 3 rows, warm-card styling | HIGH |
| AppSidebar | `components/app-sidebar.tsx` | Mostly fine, needs color update | MEDIUM |
| MobileBottomNav | `components/bottom-nav.tsx` | Functional but plain, needs visual polish | MEDIUM |
| DealKanban | `components/deal-kanban.tsx` | No overflow-x container, touch DnD issues | MEDIUM |
| LoginPage | `app/login/page.tsx` | Decent structure, needs palette update only | MEDIUM |
| DashboardPage | `app/(dashboard)/page.tsx` | Hero banner URL-loaded image (bad for perf/control) | MEDIUM |
| AnalyticsPage | `app/(dashboard)/analytics/page.tsx` | Charts need `ResponsiveContainer` verification | LOW |
| globals.css | `app/src/app/globals.css` | Warm sand palette needs full replacement | HIGH |

**Biggest bang for buck:** `globals.css` palette change instantly updates ALL pages. Do this in Wave 1.

### Hero Banner Issue

The dashboard page has a hero banner with a hardcoded Unsplash URL:
```tsx
backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=75')`
```

On mobile this loads a 1200px image unnecessarily. For the redesign, consider replacing with a CSS gradient hero that doesn't require a network request. The current hero also takes 192px (h-48) on mobile which pushes all content down.

**Recommendation:** Replace hero with a compact page header (48px) using CSS gradient background. Saves mobile bandwidth and reduces the vertical stack.

---

## State of the Art

| Old Pattern | Current Pattern | Impact for This Phase |
|-------------|-----------------|----------------------|
| `tailwind.config.ts` dark mode | `@custom-variant` in CSS | Already using current pattern |
| `darkMode: 'class'` in config | `@custom-variant dark (&:is(.dark *))` | No change needed |
| `asChild` Radix prop | `render` prop on shadcn v4 | Must use `render` not `asChild` |
| Multiple Google Font families | Single variable font via `next/font` | Migrate to Inter only |
| HSL color values in vars | OKLCH in Tailwind v4 shadcn defaults | Project uses HSL hex — acceptable, no migration needed |
| `@layer base` for CSS vars | Variables outside `@layer base` | Current globals.css is correctly structured |

---

## Open Questions

1. **Hero Banner Replacement**
   - What we know: Current hero uses external Unsplash URL, 192px tall on mobile
   - What's unclear: Brian may want to keep photo hero or prefer gradient
   - Recommendation: Default to CSS gradient in the plan; flag as easy swap-back if desired

2. **Accent Color Preference**
   - What we know: Brian wants "fresh, modern, premium dashboard" but didn't specify hue
   - What's unclear: Violet vs blue vs teal preference
   - Recommendation: Propose violet (Linear palette) as default; the plan should note it's a 1-line change to swap to blue

3. **Dashboard Page Stats — Clickable?**
   - What we know: Current stats ARE clickable Links (they apply filter params)
   - What's unclear: Whether the horizontal-scroll pill pattern preserves discoverability of this
   - Recommendation: Keep as Links, add subtle hover state to indicate interactivity

4. **Command Palette Scope**
   - What we know: CONTEXT.md lists Cmd+K as a "specific idea" in scope
   - What's unclear: Whether it should navigate only, or also search leads
   - Recommendation: Navigation-only in Phase 11; lead search is a heavier lift

---

## Proposed New Color Palette (Claude's Discretion)

This is the recommended design decision for the planner to implement:

### Dark Mode (Primary)

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#09090b` | Page background (Zinc-950) |
| `--card` | `#18181b` | Card backgrounds (Zinc-900) |
| `--popover` | `#27272a` | Dropdowns, popovers (Zinc-800) |
| `--border` | `#3f3f46` | Dividers, card edges (Zinc-700) |
| `--muted` | `#27272a` | Subtle backgrounds |
| `--muted-foreground` | `#71717a` | Secondary text (Zinc-500) |
| `--foreground` | `#fafafa` | Primary text (Zinc-50) |
| `--primary` | `#8b5cf6` | CTA accent (Violet-500) |
| `--ring` | `#8b5cf6` | Focus rings |
| `--sidebar` | `#020203` | Extra-dark sidebar |
| `--destructive` | `#ef4444` | Errors, delete actions |

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#fafafa` | Page background |
| `--card` | `#ffffff` | Card backgrounds |
| `--border` | `#e4e4e7` | Dividers (Zinc-200) |
| `--primary` | `#7c3aed` | Violet-700 (darker for light mode contrast) |
| `--sidebar` | `#18181b` | Dark sidebar even in light mode (like Linear) |

### Score/Tier Colors (Keep Existing)

The red/orange/amber/emerald tier color system for property scores is semantic and should be preserved. Only the neutral base palette changes.

---

## Sources

### Primary (HIGH confidence)
- Tailwind CSS v4 official docs (https://tailwindcss.com/docs/dark-mode) — `@custom-variant` syntax verified
- shadcn/ui Tailwind v4 docs (https://ui.shadcn.com/docs/tailwind-v4) — CSS variable structure confirmed
- shadcn/ui Drawer docs (https://ui.shadcn.com/docs/components/radix/drawer) — Sheet/Drawer pattern verified
- shadcn/ui Command docs (https://ui.shadcn.com/docs/components/radix/command) — Cmd+K implementation pattern
- Project source code (globals.css, layout.tsx, all component files) — existing architecture verified

### Secondary (MEDIUM confidence)
- next-themes 0.4.6 with `attribute="class"` — verified working in current codebase
- @hello-pangea/dnd v18 overflow-x container behavior — documented to work; touch-drag caveat noted
- Inter font dominance in SaaS dashboard design — multiple credible sources confirm

### Tertiary (LOW confidence)
- Violet as "best" accent color for this use case — design opinion, not technical fact; verify with Brian
- `#09090b` as ideal dark background — subjective; Linear uses this exact value but not universally agreed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, confirmed versions
- Architecture patterns: HIGH — code examples verified against actual project files
- Color palette: MEDIUM — technically sound, aesthetically subjective
- Pitfalls: HIGH — directly identified from codebase analysis

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable libraries; Tailwind v4/shadcn/next-themes won't change meaningfully in 30 days)
