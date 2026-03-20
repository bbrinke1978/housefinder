import {
  launchBrowser,
  createPage,
  parseHeaderMap,
  delay,
  rateLimitDelay,
} from "../lib/scraper-utils.js";

/**
 * A single row from the Emery County 5-year back tax table.
 * Each row represents a parcel with per-year delinquent amounts.
 */
export interface EmeryBackTaxRecord {
  parcelId: string;
  ownerName?: string;
  /** Amounts keyed by year string e.g. "2025", "2024", ... */
  yearAmounts: Record<string, string>;
  /** Total tax across all years */
  totalTax?: string;
  /** Other years amount (pre-2021) */
  otherYears?: string;
}

/**
 * Scrapes Emery County 5-year back tax table from wpDataTables-rendered page.
 *
 * URL: https://emery.utah.gov/home/offices/treasurer/5-year-back-tax-info/
 *
 * Table ID: 127
 * Columns: PARCEL NUMBER, NAME, 2025, 2024, 2023, 2022, 2021, OTHER YEARS, TOTAL TAX
 *
 * This table uses serverSide=false with tableType=xls so all data is loaded
 * into the DOM upfront. We paginate through to collect all rows.
 *
 * @returns Array of EmeryBackTaxRecord objects
 */
export async function scrapeEmery5YearBackTax(): Promise<EmeryBackTaxRecord[]> {
  const startTime = Date.now();
  const records: EmeryBackTaxRecord[] = [];
  let totalFound = 0;
  const tag = "[emery-5year-backtax]";

  const browser = await launchBrowser();

  try {
    const page = await createPage(browser);

    await page.goto(
      "https://emery.utah.gov/home/offices/treasurer/5-year-back-tax-info/",
      { waitUntil: "networkidle", timeout: 60000 }
    );

    // Wait for wpDataTable to render (hideBeforeLoad: true so use state:'attached')
    try {
      await page.waitForSelector(".wpDataTable tbody tr", {
        timeout: 30000,
        state: "attached",
      });
    } catch {
      console.log(
        `${tag} No table rows found after 30s. Page title:`,
        await page.title()
      );
      return [];
    }

    // Set page length to 100 to minimize pagination
    const lengthSelect = await page.$(".dataTables_length select");
    if (lengthSelect) {
      await lengthSelect.selectOption("100");
      await delay(1500);
    }

    // Build dynamic column index mapping from header text
    const headerMap = await parseHeaderMap(page);
    console.log(`${tag} Header map:`, JSON.stringify(Object.fromEntries(headerMap)));

    // Determine which year columns are present
    const yearColumns: string[] = [];
    for (const key of headerMap.keys()) {
      if (/^\d{4}$/.test(key)) {
        yearColumns.push(key);
      }
    }
    console.log(`${tag} Year columns found:`, yearColumns);

    // Extract records from all pages
    let hasNextPage = true;
    let pageNum = 0;

    while (hasNextPage) {
      pageNum++;
      // Capture yearColumns in closure for use inside $$eval
      const colMapObj = Object.fromEntries(headerMap) as Record<string, number>;
      const yearsForEval = yearColumns.slice();

      const pageRecords = await page.$$eval(
        ".wpDataTable tbody tr",
        (rows: Element[], evalData: { colMap: Record<string, number>; years: string[] }) => {
          const { colMap, years } = evalData;
          return Array.from(rows).map((row) => {
            const cells = row.querySelectorAll("td");
            const getCell = (name: string): string => {
              const idx = colMap[name];
              if (idx === undefined) return "";
              return cells[idx]?.textContent?.trim() ?? "";
            };

            const parcelId =
              getCell("parcel number") ||
              getCell("parcel") ||
              getCell("parcelnumber");

            const ownerName =
              getCell("name") ||
              getCell("owner name") ||
              getCell("owner");

            const yearAmounts: Record<string, string> = {};
            for (const year of years) {
              const val = getCell(year);
              if (val && val !== "-" && val !== "0.00" && val !== "0") {
                yearAmounts[year] = val.replace(/[$,]/g, "").trim();
              }
            }

            const totalTax =
              getCell("total tax") ||
              getCell("total") ||
              getCell("totaltax");

            const otherYears =
              getCell("other years") ||
              getCell("otheryears") ||
              getCell("prior years");

            return {
              parcelId,
              ownerName: ownerName || undefined,
              yearAmounts,
              totalTax: totalTax || undefined,
              otherYears: otherYears || undefined,
            };
          });
        },
        { colMap: colMapObj, years: yearsForEval }
      );

      for (const raw of pageRecords) {
        if (!raw.parcelId) continue;
        totalFound++;
        records.push({
          parcelId: raw.parcelId,
          ownerName: raw.ownerName,
          yearAmounts: raw.yearAmounts,
          totalTax: raw.totalTax,
          otherYears: raw.otherYears,
        });
      }

      // Check for next page button and navigate
      const nextButton = await page.$(
        ".paginate_button.next:not(.disabled)"
      );
      if (nextButton) {
        await nextButton.click();
        await delay(rateLimitDelay());
        await page.waitForSelector(".wpDataTable tbody tr", {
          timeout: 15000,
          state: "attached",
        });
      } else {
        hasNextPage = false;
      }
    }
  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[emery-5year-backtax] Complete: ${totalFound} records scraped, ${records.length} valid, ${elapsed}s elapsed`
  );

  return records;
}
