import {
  launchBrowser,
  createPage,
  parseHeaderMap,
  delay,
  rateLimitDelay,
} from "../lib/scraper-utils.js";
import {
  propertyRecordSchema,
  type PropertyRecord,
} from "../lib/validation.js";

/**
 * Scrapes Emery County tax roll from wpDataTables-rendered page.
 *
 * Clone of Carbon County assessor pattern with Emery-specific URL and
 * column name variants (e.g., "Primary Name" for owner, "Tax 2025" for status).
 *
 * Columns are resolved by header text, not index (defense against reordering).
 * Rate-limited to 1-2 seconds between page requests.
 *
 * @returns Validated array of PropertyRecord objects
 */
export async function scrapeEmeryTaxRoll(): Promise<PropertyRecord[]> {
  const startTime = Date.now();
  const records: PropertyRecord[] = [];
  let totalFound = 0;
  let invalidCount = 0;

  const browser = await launchBrowser();

  try {
    const page = await createPage(browser);

    await page.goto(
      "https://emery.utah.gov/home/offices/treasurer/tax-roll/",
      { waitUntil: "networkidle", timeout: 60000 }
    );

    // Wait for wpDataTable to render -- may require a search action first
    try {
      await page.waitForSelector(".wpDataTable tbody tr", { timeout: 30000 });
    } catch {
      // Table may be empty initially -- try triggering a browse-all search
      const searchInput = await page.$(".wpDataTable input[type='search'], .dataTables_filter input");
      if (searchInput) {
        await searchInput.fill("*");
        await searchInput.press("Enter");
        await delay(2000);
        try {
          await page.waitForSelector(".wpDataTable tbody tr", { timeout: 15000 });
        } catch {
          console.log(
            "[emery-tax-roll] No table rows found after search. Page title:",
            await page.title()
          );
          return [];
        }
      } else {
        console.log(
          "[emery-tax-roll] No table rows and no search input found. Page title:",
          await page.title()
        );
        return [];
      }
    }

    // Build dynamic column index mapping from header text
    const headerMap = await parseHeaderMap(page);
    console.log(
      "[emery-tax-roll] Header map:",
      JSON.stringify(Object.fromEntries(headerMap))
    );

    // Extract records from all pages
    let hasNextPage = true;

    while (hasNextPage) {
      const pageRecords = await page.$$eval(
        ".wpDataTable tbody tr",
        (rows: Element[], colMap: Record<string, number>) => {
          return Array.from(rows).map((row) => {
            const cells = row.querySelectorAll("td");
            const getCell = (name: string): string => {
              const idx = colMap[name];
              if (idx === undefined) return "";
              return cells[idx]?.textContent?.trim() ?? "";
            };

            return {
              parcelId:
                getCell("parcel") ||
                getCell("parcel id") ||
                getCell("parcel number") ||
                getCell("parcelnumber"),
              address:
                getCell("address") ||
                getCell("property address") ||
                getCell("propertyaddress") ||
                getCell("situs address"),
              city:
                getCell("city") ||
                getCell("propertycity") ||
                getCell("property city"),
              ownerName:
                getCell("owner") ||
                getCell("name") ||
                getCell("owner name") ||
                getCell("ownername") ||
                getCell("primary name"),
              taxStatus:
                getCell("tax status") ||
                getCell("taxstatus") ||
                getCell("status") ||
                getCell("tax 2025") ||
                getCell("tax 2024") ||
                getCell("taxroll"),
              mortgageInfo:
                getCell("mortgage") ||
                getCell("mortgageinfo") ||
                getCell("mortgage info"),
            };
          });
        },
        Object.fromEntries(headerMap) as Record<string, number>
      );

      totalFound += pageRecords.length;

      // Validate each record with Zod
      for (const raw of pageRecords) {
        const result = propertyRecordSchema.safeParse(raw);
        if (result.success) {
          records.push(result.data);
        } else {
          invalidCount++;
          console.log(
            "[emery-tax-roll] Invalid record skipped:",
            JSON.stringify(raw),
            result.error.issues.map((i) => i.message).join(", ")
          );
        }
      }

      // Check for next page button and navigate
      const nextButton = await page.$(
        ".paginate_button.next:not(.disabled)"
      );
      if (nextButton) {
        await nextButton.click();
        await delay(rateLimitDelay());
        await page.waitForSelector(".wpDataTable tbody tr", { timeout: 15000 });
      } else {
        hasNextPage = false;
      }
    }
  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[emery-tax-roll] Complete: ${totalFound} total found, ${records.length} valid, ${invalidCount} invalid, ${elapsed}s elapsed`
  );

  return records;
}
