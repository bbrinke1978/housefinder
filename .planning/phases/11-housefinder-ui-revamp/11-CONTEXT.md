# Phase 11: HouseFinder UI Revamp - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Source:** User Q&A — Brian wants full redesign, mobile-first, fresh aesthetic

<domain>
## Phase Boundary

Complete visual and UX overhaul of the HouseFinder internal dashboard app. This is NOT a public-facing site — it's a private admin/research tool for Brian and Shawn. The redesign should feel like a premium SaaS dashboard (think Linear, Notion, or Stripe Dashboard quality).

All existing functionality stays — this is a skin/layout/UX redesign, not a feature rebuild.

Key issues to solve:
1. Not mobile friendly (doesn't work on Shawn's Android)
2. Looks generic/plain — needs distinctive, polished aesthetic
3. Too cluttered — too many filters, cards, data on screen
4. Hard to navigate — not intuitive flow between features

</domain>

<decisions>
## Implementation Decisions

### Design Direction
- Fresh, new aesthetic — NOT matching No BS Homes colors
- Premium internal dashboard feel — like Linear, Notion, Stripe Dashboard
- Dark mode as primary (with light mode option) — modern admin dashboard vibe
- Clean, spacious, breathing room — declutter aggressively
- This is a private tool, not a public website

### Mobile-First Priority
- Must work on Shawn's Android phone
- Responsive breakpoints: mobile (default) → tablet → desktop
- Touch-friendly tap targets (min 44px)
- Bottom navigation on mobile (already exists but needs improvement)
- Cards/tables that stack properly on small screens

### Dashboard (Highest Priority)
- Declutter the stats bar — maybe collapsible or simplified
- Property cards need better mobile layout
- Filters should be collapsible/hidden on mobile (slide-out panel?)
- Search should be prominent
- Reduce visual noise — fewer borders, softer shadows

### Navigation Redesign
- Sidebar on desktop, bottom nav on mobile
- Current nav: Dashboard, Map, Deals, Analytics, Pipeline, Settings
- Consider consolidating or reorganizing
- Settings shouldn't be a top-level nav item on mobile

### All Pages Need Work
- Dashboard: declutter, better cards, responsive
- Deals: kanban needs mobile treatment (horizontal scroll or list fallback)
- Analytics: charts need mobile responsiveness
- Deal Detail: too many tabs — consider scrolling sections instead of tabs on mobile
- Map: already works but could look better
- Login: first impression, should look premium

### Typography & Colors
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

</decisions>

<specifics>
## Specific Ideas

- Reference quality: Linear.app, Notion, Stripe Dashboard, Vercel Dashboard
- Dark backgrounds with vibrant accent colors
- Glassmorphism or subtle gradients for depth
- Micro-interactions on hover/click
- Skeleton loading states
- Better empty states
- Consider a command palette (Cmd+K) for power user navigation

</specifics>

<deferred>
## Deferred Ideas

- Customizable dashboard layouts (drag-and-drop widgets)
- User preferences for card density (compact/comfortable/spacious)
- Keyboard shortcuts beyond Cmd+K
- Custom themes/skins

</deferred>

---

*Phase: 11-housefinder-ui-revamp*
*Context gathered: 2026-03-29 from user Q&A*
