---
phase: 17-netlify-migration-design-system
plan: 01
subsystem: infra
tags: [netlify, nextjs, github-actions, azure-blob, deployment]

requires:
  - phase: 02-core-application
    provides: next.config.ts standalone output that is now removed

provides:
  - netlify.toml with npm run build, .next publish, Node 20
  - next.config.ts without standalone, with Azure Blob remotePatterns
  - deploy-app.yml disabled (renamed to .disabled) for Netlify-only deploys

affects:
  - 17-netlify-migration-design-system (all subsequent plans depend on this config)

tech-stack:
  added: [netlify]
  patterns: [netlify auto-deploy via git push, OpenNext default output mode]

key-files:
  created:
    - app/netlify.toml
    - .github/workflows/deploy-app.yml.disabled
  modified:
    - app/next.config.ts

key-decisions:
  - "netlify.toml has no [[plugins]] block — Netlify auto-installs @netlify/plugin-nextjs for Next.js"
  - "output: standalone removed from next.config.ts — OpenNext/Netlify requires default output mode"
  - "deploy-app.yml renamed to .disabled not deleted — kept as Azure App Service fallback reference during 1-week transition"
  - "images.remotePatterns added for *.blob.core.windows.net — prevents photo breakage after migration"

patterns-established:
  - "Netlify deployment: netlify.toml in app/ subdirectory with publish = .next"

requirements-completed: [NETLIFY-01, NETLIFY-02, NETLIFY-03, DESIGN-11]

duration: 4min
completed: 2026-04-08
---

# Phase 17 Plan 01: Netlify Deployment Config Summary

**netlify.toml added, standalone output removed, Azure Blob image patterns configured, and GitHub Actions Azure deploy disabled for Netlify migration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-09T03:15:08Z
- **Completed:** 2026-04-09T03:19:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created app/netlify.toml with correct build command (npm run build), .next publish dir, and Node 20 environment
- Removed output: standalone from next.config.ts — OpenNext/Netlify requires default Next.js output mode, not standalone/Docker mode
- Added images.remotePatterns for *.blob.core.windows.net so property photos (stored in Azure Blob Storage) continue to load after migration
- Disabled deploy-app.yml by renaming to .disabled — prevents dual-deploy (Netlify auto-deploy + old GitHub Actions Azure deploy)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add netlify.toml and update next.config.ts** - `a7cfc43` (feat)
2. **Task 2: Disable GitHub Actions deploy-app.yml** - `8bf25c0` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/netlify.toml` - Netlify build config: npm run build, .next publish dir, Node 20
- `app/next.config.ts` - Removed standalone output, added Azure Blob remotePatterns; kept transpilePackages and serverExternalPackages
- `.github/workflows/deploy-app.yml.disabled` - Renamed from deploy-app.yml with disable comment at top
- `.github/workflows/deploy-app.yml` - Deleted (renamed to .disabled)

## Decisions Made
- No [[plugins]] block in netlify.toml — Netlify auto-detects Next.js and installs @netlify/plugin-nextjs
- output: standalone removed because OpenNext (Netlify's Next.js adapter) requires standard Next.js output, not the Docker/Azure standalone mode
- deploy-app.yml kept as .disabled (not deleted) for Azure App Service fallback reference during the ~1 week migration transition period
- deploy-scraper.yml left completely untouched — scraper stays on Azure Functions

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required by this plan.

Next step: Connect Netlify site to the GitHub repo (manual step in Netlify dashboard), then deploy.

## Next Phase Readiness
- App is ready for Netlify deployment: netlify.toml configured, standalone removed, blob storage images configured, old deploy workflow disabled
- User needs to connect Netlify site to GitHub repo and set environment variables in Netlify dashboard

---
*Phase: 17-netlify-migration-design-system*
*Completed: 2026-04-08*
