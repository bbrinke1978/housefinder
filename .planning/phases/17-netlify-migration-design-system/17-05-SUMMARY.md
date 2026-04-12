---
phase: 17-netlify-migration-design-system
plan: 05
status: partial
started: 2026-04-09
completed: 2026-04-10
---

# Plan 17-05 Summary: Environment Migration & E2E Verification

## What Was Done

### Netlify Build Fixes
- Fixed lightningcss native binary error by switching build command to `rm -rf node_modules package-lock.json && npm install && npm run build` — Windows-generated lockfile doesn't resolve Linux native binaries
- Added `@netlify/plugin-nextjs` to netlify.toml and package.json — required for Next.js SSR, API routes, and server actions on Netlify
- React 19.2.5 upgrade (from prior session) resolved peer dependency conflicts

### Environment Variables
- All 13 env vars set on Netlify via CLI (netlify env:set)
- Values migrated from Azure App Service + Key Vault + user-provided Resend key
- NEXTAUTH_URL and NEXT_PUBLIC_APP_URL set to https://no-bshousefinder.netlify.app

### Database Migrations
- Migrations 0007 (nullable lead property_id), 0008 (floor_plans tables — already existed), and 0009 (buyer CRM tables) applied via temporary API endpoint
- Buyer CRM tables (buyer_tags, buyer_communication_events, buyer_deal_interactions) created successfully

### Verification Status
- [x] App loads on Netlify URL with login page visible
- [x] Login succeeds with existing credentials
- [x] Dashboard loads with properties from PostgreSQL
- [x] Buyers page loads after migration fix
- [x] All other tabs reported working by user
- [ ] Full E2E checklist not yet completed (photos, map, dark mode, mobile swipe, etc.)

## What Remains
- Complete full verification checklist (photos from Azure Blob, map pins, dark mode toggle, mobile swipe actions, command palette)
- Decommission Azure App Service after ~1 week of parallel running

## Key Decisions
- Build command uses `rm -rf node_modules package-lock.json` on every deploy because Windows lockfile is incompatible with Linux native binaries — acceptable tradeoff for correct builds
- Netlify CLI installed globally on work machine and linked to site
