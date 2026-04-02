import { chromium, type Browser, type Page } from "playwright";
import { execSync } from "child_process";

/**
 * Promise-based sleep for rate limiting between page requests.
 * Uses 1-2 second delays per user's locked decision.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a random delay between 1000-2000ms for natural rate limiting.
 */
export function rateLimitDelay(): number {
  return 1000 + Math.floor(Math.random() * 1000);
}

let depsInstalled = false;

/**
 * Installs Chromium system dependencies on Azure Linux App Service.
 * Only runs once per process lifetime (tracked by depsInstalled flag).
 * Safe to call on non-Linux or local environments — it no-ops.
 */
function installChromiumDeps(): void {
  if (depsInstalled || process.platform !== "linux") return;
  try {
    console.log("[launchBrowser] Installing Chromium system dependencies...");
    execSync(
      "apt-get update -qq && apt-get install -y --no-install-recommends " +
        "libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 " +
        "libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 " +
        "libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 libxshmfence1",
      { timeout: 60000, stdio: "pipe" }
    );
    depsInstalled = true;
    console.log("[launchBrowser] System dependencies installed.");
  } catch (err) {
    console.error("[launchBrowser] Failed to install deps:", err instanceof Error ? err.message : err);
  }
}

/**
 * Launches a Playwright Chromium browser in headless mode.
 * On first failure (missing system deps on Azure), automatically installs
 * them and retries once. This makes the scraper self-healing after deploys.
 */
export async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch (firstError) {
    console.warn("[launchBrowser] First launch failed, installing system deps and retrying...");
    installChromiumDeps();
    // Retry after installing deps — if this fails too, let it throw
    return await chromium.launch({ headless: true });
  }
}

/**
 * Creates a new page with the housefinder bot User-Agent header.
 */
export async function createPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    "User-Agent":
      "Mozilla/5.0 (compatible; housefinder-bot/1.0; +https://github.com/bbrinke1978/housefinder)",
  });
  return page;
}

/**
 * Extracts all <th> elements from a wpDataTable and returns a Map
 * mapping lowercase header text to column index.
 *
 * This is the CRITICAL defense against column reordering (Pitfall 2 from research).
 * Scrapers look up columns by name, not by hardcoded index.
 */
export async function parseHeaderMap(
  page: Page
): Promise<Map<string, number>> {
  const headers = await page.$$eval(
    ".wpDataTable thead th",
    (ths: Element[]) =>
      ths.map((th, i) => ({
        name: (th.textContent?.trim() ?? "").toLowerCase(),
        index: i,
      }))
  );

  const headerMap = new Map<string, number>();
  for (const h of headers) {
    if (h.name) {
      headerMap.set(h.name, h.index);
    }
  }

  return headerMap;
}

/**
 * Classifies an owner name string into an owner type category.
 * Returns 'llc' if name contains LLC/Inc/Corp, 'trust' if contains Trust,
 * 'estate' if contains Estate, else 'individual'.
 */
export function classifyOwnerType(
  name: string | undefined | null
): "individual" | "llc" | "trust" | "estate" | "unknown" {
  if (!name) return "unknown";

  const upper = name.toUpperCase();

  if (
    upper.includes("LLC") ||
    upper.includes("INC") ||
    upper.includes("CORP") ||
    upper.includes("COMPANY") ||
    upper.includes("L.L.C")
  ) {
    return "llc";
  }

  if (upper.includes("TRUST")) {
    return "trust";
  }

  if (upper.includes("ESTATE")) {
    return "estate";
  }

  return "individual";
}
