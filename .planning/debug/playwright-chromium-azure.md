---
status: awaiting_human_verify
trigger: "Playwright can't find/launch Chromium on Azure Functions Linux App Service (B1 plan). All 6 scrapers deployed and registered but produce zero data because the browser binary isn't installed."
created: 2026-03-19T00:00:00Z
updated: 2026-03-19T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED. The GitHub Actions deploy workflow was installing Chromium on the runner at ~/.cache/ms-playwright/ (default Linux path), which is OUTSIDE the ./scraper directory and therefore never included in the deployment zip. Setting PLAYWRIGHT_BROWSERS_PATH=0 redirects the install to node_modules/playwright-core/.local-browsers (inside ./scraper), which IS included in the zip.
test: Push changes to trigger the updated workflow; after deploy, call the installBrowsers diagnostic endpoint to verify binary is present
expecting: installBrowsers returns launchTest "OK - launched chromium X.X.X"
next_action: Await human verification after next deployment

## Symptoms

expected: Azure Functions scrapers run on timer triggers and scrape property data from county websites using Playwright
actual: Playwright throws "Executable doesn't exist" error - Chromium binary not found on the Linux container
errors: `browserType.launch: Executable doesn't exist at /home/site/wwwroot/.playwright-browsers/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell`
reproduction: Any scraper function invocation fails with this error
started: Since initial deployment. Never worked on Azure — worked locally on Windows.

## Eliminated

- hypothesis: PLAYWRIGHT_BROWSERS_PATH env var alone would cause Playwright to find pre-installed browsers
  evidence: Git Bash mangles the path (prepends C:/Program Files/Git/); even when corrected, binary is still not installed
  timestamp: 2026-03-19T00:00:00Z

- hypothesis: startup.sh custom startup script would install Chromium before functions start
  evidence: Azure Functions App Service did not execute the startup script
  timestamp: 2026-03-19T00:00:00Z

- hypothesis: Kudu command API could install Chromium
  evidence: Kudu container runs Node 14, too old for Playwright
  timestamp: 2026-03-19T00:00:00Z

- hypothesis: HTTP-triggered installBrowsers using execSync('npx playwright install chromium --with-deps') would work
  evidence: Timed out (504) after 4 minutes — installation takes longer than Azure's HTTP timeout
  timestamp: 2026-03-19T00:00:00Z

- hypothesis: Setting PLAYWRIGHT_BROWSERS_PATH via az functionapp config appsettings set would install the binary
  evidence: Setting the env var doesn't install the binary; it only tells Playwright where to look
  timestamp: 2026-03-19T00:00:00Z

## Evidence

- timestamp: 2026-03-19T00:00:00Z
  checked: scraper/src/lib/scraper-utils.ts
  found: launchBrowser() calls chromium.launch({ headless: true }) with no executablePath override — uses Playwright's bundled chromium discovery
  implication: Playwright looks in PLAYWRIGHT_BROWSERS_PATH for its own downloaded binary; if that directory is empty, it fails

- timestamp: 2026-03-19T00:00:00Z
  checked: scraper/src/functions/installBrowsers.ts
  found: Uses execSync (synchronous, blocking) with 5-minute timeout — HTTP trigger has 230-second default, install takes longer
  implication: Synchronous install blocks the HTTP response thread; 504 timeout is expected behavior

- timestamp: 2026-03-19T00:00:00Z
  checked: scraper/package.json
  found: Uses playwright@^1.50.0 (full playwright, not playwright-chromium). No Dockerfile. No .dockerignore.
  implication: Full playwright package includes browser installer CLI. A Dockerfile would be the cleanest fix but changes deployment model.

- timestamp: 2026-03-19T00:00:00Z
  checked: host.json
  found: Standard Azure Functions v4 config with extension bundle. No custom startup hooks.
  implication: No way to hook into startup via host.json for arbitrary shell commands

- timestamp: 2026-03-19T00:10:00Z
  checked: .github/workflows/deploy-scraper.yml
  found: Workflow already had `npx playwright install --with-deps chromium` step but WITHOUT PLAYWRIGHT_BROWSERS_PATH set. Default Linux path is ~/.cache/ms-playwright/ which is OUTSIDE ./scraper. The Azure/functions-action@v1 deploys the ./scraper directory — ~/.cache is never included.
  implication: THIS IS THE ROOT CAUSE. The binary was being installed on the runner but never shipped to Azure.

- timestamp: 2026-03-19T00:10:00Z
  checked: scraper-deploy.zip (existing deployment artifact)
  found: node_modules IS included in the zip (407 playwright-core files). But .local-browsers subdirectory is absent because PLAYWRIGHT_BROWSERS_PATH=0 was never set.
  implication: The delivery mechanism (zip with node_modules) is correct. Only the install location was wrong.

- timestamp: 2026-03-19T00:10:00Z
  checked: Playwright docs / PLAYWRIGHT_BROWSERS_PATH=0 behavior
  found: Setting PLAYWRIGHT_BROWSERS_PATH=0 installs browsers to node_modules/playwright-core/.local-browsers relative to cwd. Playwright at runtime automatically checks this location when PLAYWRIGHT_BROWSERS_PATH=0 is set.
  implication: This is the hermetic install mode — binary travels with the app package. Perfect for Azure deployment.

- timestamp: 2026-03-19T00:00:00Z
  checked: startup.sh
  found: Script exists but Azure Functions App Service ignores it unless WEBSITE_STARTUP_FILE is set AND the runtime supports it
  implication: Azure Functions on dedicated App Service plan DOES support WEBSITE_STARTUP_FILE for custom startup commands

## Analysis of Remaining Approaches

### Option A: Async installBrowsers (returns immediately, runs install in background)
- Return 200 immediately, let install continue via setImmediate/detached process
- PROBLEM: Azure Functions may terminate the process as soon as the HTTP response is sent
- PROBLEM: Still requires someone to trigger it manually; install takes ~5 min, subsequent scraper calls could fire before complete
- RISK: Race condition between install and first timer trigger
- VERDICT: Fragile, not reliable

### Option B: Custom Docker container
- Most reliable: Chromium is baked into the image
- PROBLEM: Changes deployment model significantly (need Azure Container Registry or Docker Hub)
- PROBLEM: No local dev env to build Linux Docker images from Windows
- PROBLEM: Brian is on Windows — `docker build` for a Linux image requires Docker Desktop + WSL2
- VERDICT: Most reliable long-term, but high setup cost and requires Docker Desktop

### Option C: SSH via az webapp create-remote-connection
- Could manually install once
- PROBLEM: Not persistent across container restarts/scaling
- VERDICT: Temporary at best, not a fix

### Option D: Pre-download Linux Chromium binary and include in deployment zip
- Include the binary in the repo/zip
- PROBLEM: Binary is ~200MB+. Cross-platform: can't download Linux binary from Windows easily.
- PROBLEM: Would need to be the exact version Playwright expects
- VERDICT: Not practical without Linux build environment

### Option E: playwright channel: 'chrome' to use system Chrome
- Use { channel: 'chrome' } in chromium.launch() to use system-installed Chrome
- PROBLEM: Azure Functions Linux containers don't have Chrome/Chromium pre-installed
- VERDICT: Same problem as before unless we first install system chrome via apt

### Option F: Fix WEBSITE_STARTUP_FILE to actually run startup.sh
- Azure App Service (dedicated plans like B1) DOES support WEBSITE_STARTUP_FILE
- Set WEBSITE_STARTUP_FILE=/home/site/wwwroot/startup.sh via az functionapp config appsettings set
- The startup script runs BEFORE the Azure Functions host starts
- startup.sh already exists and has the correct install command
- PROBLEM: npx playwright install --with-deps needs apt for system deps (libnss, libatk, etc.) — needs sudo
- Playwright on Linux needs both the chromium binary AND system library deps
- With --with-deps it tries to apt-get install those libs
- On Azure App Service the container HAS sudo/root access for startup scripts
- VERDICT: VERY PROMISING — this was tried but may not have had WEBSITE_STARTUP_FILE set correctly

### Option G: Use playwright-chromium package (smaller, chromium-only) with postinstall
- Switch from `playwright` to `playwright-chromium`
- Add a postinstall script that runs `playwright install chromium`
- The postinstall runs during `npm install` which happens during deployment (Oryx build)
- Azure's Oryx build system runs npm install for Node.js apps
- VERDICT: HIGHLY PROMISING — postinstall hooks run during the build/deploy phase, not at runtime

### Option H: Use @playwright/browser-chromium package
- `@playwright/browser-chromium` is a package that, when installed, downloads chromium for the current platform
- During `npm install` on the Azure Linux build container, it would download the Linux binary
- The binary would be included in node_modules and persist
- VERDICT: HIGHLY PROMISING — same as option G conceptually

## Resolution

root_cause: The GitHub Actions deploy workflow was running `npx playwright install --with-deps chromium` WITHOUT setting PLAYWRIGHT_BROWSERS_PATH, so it installed to the default Linux path `~/.cache/ms-playwright/` on the GitHub Actions runner. This path is outside the `./scraper` package directory, so the Chromium binary was NEVER included in the deployment zip sent to Azure. Azure received the Playwright JS library but not the browser binary.

fix: Two changes:
1. `.github/workflows/deploy-scraper.yml` — Added `PLAYWRIGHT_BROWSERS_PATH: "0"` env to the "Install Playwright Chromium" step. With value `0`, playwright installs the binary to `node_modules/playwright-core/.local-browsers/` (relative to cwd), which IS inside `./scraper` and IS included in the deployment zip.
2. Azure Function App `PLAYWRIGHT_BROWSERS_PATH=0` app setting — Set via `az functionapp config appsettings set`. This tells the Playwright runtime on Azure to look in `node_modules/playwright-core/.local-browsers/` for the browser binary, matching where CI installed it.
3. `scraper/src/functions/installBrowsers.ts` — Replaced the failing synchronous install with a diagnostic endpoint that reports browser presence and tests actual launch. Useful for verifying the fix post-deploy.

verification: Pending — requires a push to trigger the updated GitHub Actions workflow
files_changed:
  - .github/workflows/deploy-scraper.yml
  - scraper/src/functions/installBrowsers.ts
