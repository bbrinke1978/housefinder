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

            const propertyType =
              getCell("property type") ||
              getCell("propertytype") ||
              getCell("prop type") ||
              getCell("use") ||
              getCell("use code") ||
              getCell("usecode") ||
              getCell("class") ||
              getCell("property class") ||
              getCell("land use") ||
              getCell("landuse") ||
              getCell("type");

            return {
              parcelId:
                getCell("parcel") ||
                getCell("parcel id") ||
                getCell("parcel number") ||
                getCell("parcelnumber") ||
                getCell("parcel #") ||
                getCell("parcel no"),
              // Situs address — ONLY pull from property/situs-prefixed
              // columns. Do NOT fall back to a generic "Address" or "City"
              // column, because in the Emery wpDataTable those generic columns
              // hold the OWNER MAILING address (PO Boxes, out-of-state). When
              // the table only exposes a generic Address column with mailing
              // data, this leaves situs empty and the row's mailing fields
              // below capture the data correctly. Same convention as
              // carbon-assessor.ts (which uses propertyaddress/propertycity
              // for situs and add1/add2/city for mailing).
              address:
                getCell("property address") ||
                getCell("propertyaddress") ||
                getCell("situs address") ||
                getCell("situsaddress") ||
                getCell("prop address") ||
                undefined,
              city:
                getCell("property city") ||
                getCell("propertycity") ||
                getCell("situs city") ||
                getCell("situscity") ||
                getCell("prop city") ||
                undefined,
              // Owner mailing address — try Carbon-style "Add1/Add2/City"
              // columns first (the convention Emery is cloned from), then
              // explicit "Mailing*" / "Owner*" columns. The generic "Address"
              // and "City" columns end up here, NOT in situs above.
              mailingAddress:
                getCell("add1") ||
                getCell("address1") ||
                getCell("address 1") ||
                getCell("mailing address") ||
                getCell("mailingaddress") ||
                getCell("owner address") ||
                getCell("owneraddress") ||
                getCell("address") ||
                undefined,
              mailingCity:
                getCell("mailing city") ||
                getCell("mailingcity") ||
                getCell("owner city") ||
                getCell("ownercity") ||
                getCell("city") ||
                undefined,
              mailingState:
                getCell("mailing state") ||
                getCell("mailingstate") ||
                getCell("owner state") ||
                getCell("ownerstate") ||
                getCell("state") ||
                undefined,
              mailingZip:
                getCell("mailing zip") ||
                getCell("mailingzip") ||
                getCell("owner zip") ||
                getCell("ownerzip") ||
                getCell("zip") ||
                getCell("zipcode") ||
                getCell("zip code") ||
                undefined,
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
                getCell("tax 2024") ||
                getCell("taxroll") ||
                getCell("tax roll"),
              mortgageInfo:
                getCell("mortgage") ||
                getCell("mortgageinfo") ||
                getCell("mortgage info"),
              propertyType: propertyType || undefined,
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
