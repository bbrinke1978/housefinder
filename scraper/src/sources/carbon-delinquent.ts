import {
  launchBrowser,
  createPage,
  parseHeaderMap,
  delay,
  rateLimitDelay,
} from "../lib/scraper-utils.js";
import {
  delinquentRecordSchema,
  type DelinquentRecord,
} from "../lib/validation.js";

/**
 * Scrapes Carbon County delinquent properties page for tax delinquency records.
 *
 * Uses Playwright to render the wpDataTables JS-rendered table.
 * Columns are resolved by header text, not index (defense against reordering).
 * Rate-limited to 1-2 seconds between page requests.
 *
 * Known columns from research: Parcel, Year, Name, Name2, Add1, Add2, City,
 * State, Zip, Status, PropertyAddress, PropertyCity, PropertyZip, ChangeDateTime,
 * District, TaxInfo, EntryNumber, SubDivision, Acres, Protected, ZipDPoint,
 * ReviewDateTime, STR, Mortgage, Due.
 *
 * @returns Validated array of DelinquentRecord objects
 */
export async function scrapeDelinquent(): Promise<DelinquentRecord[]> {
  const startTime = Date.now();
  const records: DelinquentRecord[] = [];
  let totalFound = 0;
  let invalidCount = 0;

  const browser = await launchBrowser();

  try {
    const page = await createPage(browser);

    await page.goto(
      "https://www.carbon.utah.gov/service/delinquent-properties/",
      { waitUntil: "networkidle", timeout: 60000 }
    );

    // Wait for wpDataTable to render
    try {
      await page.waitForSelector(".wpDataTable tbody tr", { timeout: 30000 });
    } catch {
      console.log(
        "[delinquent] No table rows found. Page title:",
        await page.title()
      );
      return [];
    }

    // Build dynamic column index mapping from header text
    const headerMap = await parseHeaderMap(page);
    console.log(
      "[delinquent] Header map:",
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
                getCell("parcelnumber"),
              ownerName:
                getCell("name") ||
                getCell("owner") ||
                getCell("owner name"),
              year:
                getCell("year"),
              amountDue:
                getCell("due") ||
                getCell("amount due") ||
                getCell("amountdue"),
              propertyAddress:
                getCell("propertyaddress") ||
                getCell("property address"),
              propertyCity:
                getCell("propertycity") ||
                getCell("property city"),
            };
          });
        },
        Object.fromEntries(headerMap) as Record<string, number>
      );

      totalFound += pageRecords.length;

      // Validate each record with Zod
      for (const raw of pageRecords) {
        const result = delinquentRecordSchema.safeParse(raw);
        if (result.success) {
          records.push(result.data);
        } else {
          invalidCount++;
          console.log(
            "[delinquent] Invalid record skipped:",
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
    `[delinquent] Complete: ${totalFound} total found, ${records.length} valid, ${invalidCount} invalid, ${elapsed}s elapsed`
  );

  return records;
}
