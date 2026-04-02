import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Diagnostic endpoint: reports Playwright Chromium installation status.
 *
 * Chromium is now installed during CI deployment (GitHub Actions) with
 * PLAYWRIGHT_BROWSERS_PATH=0, which places the binary into:
 *   node_modules/playwright-core/.local-browsers/
 *
 * This endpoint verifies that binary is present and reports its location.
 * It no longer attempts runtime installation (that approach timed out at 504).
 */
async function installBrowsers(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("Checking Playwright Chromium installation...");

  const wwwroot = "/home/site/wwwroot";
  const localBrowsersPath = join(wwwroot, "node_modules/playwright-core/.local-browsers");
  const legacyBrowsersPath = join(wwwroot, ".playwright-browsers");

  const report: Record<string, unknown> = {
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? "(not set)",
    localBrowsersExists: existsSync(localBrowsersPath),
    legacyBrowsersExists: existsSync(legacyBrowsersPath),
    localBrowsersContents: existsSync(localBrowsersPath)
      ? readdirSync(localBrowsersPath)
      : [],
  };

  // Try to find the actual chrome-headless-shell binary
  try {
    const findOutput = execSync(
      "find /home/site/wwwroot/node_modules/playwright-core/.local-browsers -name 'chrome-headless-shell' -o -name 'chrome' 2>/dev/null | head -5",
      { encoding: "utf8", timeout: 10000 }
    );
    report.binaryPaths = findOutput.trim().split("\n").filter(Boolean);
  } catch {
    report.binaryPaths = [];
    report.binarySearchError = "find command failed";
  }

  // Try to launch a browser using launchBrowser() which auto-installs deps on failure
  let launchTest: string;
  try {
    const { launchBrowser } = await import("../lib/scraper-utils.js");
    const browser = await launchBrowser();
    const version = browser.version();
    await browser.close();
    launchTest = `OK - launched chromium ${version}`;
  } catch (err) {
    launchTest = `FAILED - ${err instanceof Error ? err.message : String(err)}`;
  }
  report.launchTest = launchTest;

  context.log("Chromium diagnostic:", report);

  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report, null, 2),
  };
}

app.http("installBrowsers", {
  methods: ["GET", "POST"],
  authLevel: "admin",
  handler: installBrowsers,
});
