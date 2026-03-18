import { chromium, type Browser, type Page } from "playwright";

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

/**
 * Launches a Playwright Chromium browser in headless mode
 * with a descriptive User-Agent identifying the bot.
 */
export async function launchBrowser(): Promise<Browser> {
  const browser = await chromium.launch({ headless: true });
  return browser;
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
