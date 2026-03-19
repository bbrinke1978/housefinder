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
 * Scrapes Carbon County assessor property search for property owner,
 * address, tax status, and mortgage info.
 *
 * Uses Playwright to render the wpDataTables JS-rendered table.
 * Columns are resolved by header text, not index (defense against reordering).
 * Rate-limited to 1-2 seconds between page requests.
 *
 * @returns Validated array of PropertyRecord objects
 */
export async function scrapeAssessor(): Promise<PropertyRecord[]> {
  const startTime = Date.now();
  const records: PropertyRecord[] = [];
  let totalFound = 0;
  let invalidCount = 0;

  const browser = await launchBrowser();

  try {
    const page = await createPage(browser);

    await page.goto(
      "https://www.carbon.utah.gov/service/property-search/",
      { waitUntil: "networkidle", timeout: 60000 }
    );

    // Wait for wpDataTable to render via server-side AJAX.
    // Carbon County's property-search table has hideBeforeLoad:true, so the
    // table starts with CSS display:none (wdt-no-display class). Using
    // state:'attached' waits for rows to exist in the DOM regardless of CSS
    // visibility — rows are attached after the AJAX response populates them.
    try {
      await page.waitForSelector(".wpDataTable tbody tr", {
        timeout: 30000,
        state: "attached",
      });
    } catch {
      console.log(
        "[assessor] No table rows found after 30s. Page title:",
        await page.title()
      );
      return [];
    }

    // Build dynamic column index mapping from header text
    const headerMap = await parseHeaderMap(page);
    console.log(
      "[assessor] Header map:",
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
                getCell("parcelnumber") ||
                getCell("parcel #") ||
                getCell("parcel no"),
              address:
                getCell("address") ||
                getCell("property address") ||
                getCell("propertyaddress") ||
                getCell("situs address") ||
                getCell("address 1") ||
                getCell("addr1") ||
                getCell("prop address"),
              city:
                getCell("city") ||
                getCell("propertycity") ||
                getCell("property city") ||
                getCell("prop city"),
              ownerName:
                getCell("owner") ||
                getCell("name") ||
                getCell("owner name") ||
                getCell("ownername") ||
                getCell("primary name") ||
                getCell("taxpayer") ||
                getCell("owner/taxpayer"),
              taxStatus:
                getCell("tax status") ||
                getCell("taxstatus") ||
                getCell("status") ||
                getCell("tax 2025") ||
                getCell("tax 2024"),
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
            "[assessor] Invalid record skipped:",
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
        await page.waitForSelector(".wpDataTable tbody tr", { timeout: 15000, state: "attached" });
      } else {
        hasNextPage = false;
      }
    }
  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[assessor] Complete: ${totalFound} total found, ${records.length} valid, ${invalidCount} invalid, ${elapsed}s elapsed`
  );

  return records;
}
