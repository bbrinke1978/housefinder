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
import { db } from "../db/client.js";
import { properties, ownerContacts } from "../db/schema.js";
import { eq } from "drizzle-orm";

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

            // Carbon County table columns (from observed header structure):
            // Parcel, Year, Name (owner mailing name), Name2, Add1 (mailing addr),
            // Add2, City (mailing city), State, Zip (mailing zip), Status,
            // PropertyAddress, PropertyCity, PropertyZip, ChangeDateTime
            //
            // NOTE: "Name/Add1/City/State/Zip" are MAILING address fields.
            //       "PropertyAddress/PropertyCity/PropertyZip" are the property address.
            //
            // Property type columns vary by county — try common variants.

            const ownerName =
              getCell("name") ||
              getCell("owner") ||
              getCell("owner name") ||
              getCell("ownername") ||
              getCell("primary name") ||
              getCell("taxpayer") ||
              getCell("owner/taxpayer");

            // Property address — prefer "PropertyAddress" over generic "address"
            const address =
              getCell("propertyaddress") ||
              getCell("property address") ||
              getCell("address") ||
              getCell("situs address") ||
              getCell("prop address");

            const city =
              getCell("propertycity") ||
              getCell("property city") ||
              getCell("prop city");

            // Mailing address — Carbon County's Add1/Add2/City/State/Zip columns
            const mailingLine1 = getCell("add1") || getCell("address1") || getCell("mailing address");
            const mailingLine2 = getCell("add2") || getCell("address2");
            const mailingCity  = getCell("city");
            const mailingState = getCell("state");
            const mailingZip   = getCell("zip") || getCell("postalcode");

            // Combine Add1 + Add2 into a single mailing address string
            const mailingAddress = mailingLine2
              ? `${mailingLine1} ${mailingLine2}`.trim()
              : mailingLine1;

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
              address,
              city,
              ownerName,
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
              propertyType: propertyType || undefined,
              mailingAddress,
              mailingCity,
              mailingState,
              mailingZip,
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

/**
 * Store mailing addresses from assessor records into owner_contacts.
 *
 * Carbon County's property table has separate mailing address columns
 * (Add1, Add2, City, State, Zip) distinct from the property address
 * (PropertyAddress, PropertyCity, PropertyZip).
 *
 * This stores the mailing address as:
 *   source = 'county-assessor'
 *   email  = "MAILING: <address>, <city>, <state> <zip>"
 *
 * Only stores when the mailing address differs from the property address
 * (an identical mailing/property address provides no additional contact value).
 *
 * Called after upsertFromAssessor so property rows exist.
 *
 * @param records - Validated assessor records (with optional mailing fields)
 * @returns Summary of mailing addresses stored
 */
export async function storeAssessorMailingAddresses(
  records: PropertyRecord[]
): Promise<{ stored: number; skipped: number; errors: number }> {
  let stored = 0;
  let skipped = 0;
  let errors = 0;
  const now = new Date();

  for (const record of records) {
    // Skip records with no mailing address data
    if (!record.mailingAddress && !record.mailingCity) {
      skipped++;
      continue;
    }

    // Build the formatted mailing address string
    const parts: string[] = [];
    if (record.mailingAddress) parts.push(record.mailingAddress);
    if (record.mailingCity) {
      const cityStateZip = [
        record.mailingCity,
        record.mailingState,
        record.mailingZip,
      ]
        .filter(Boolean)
        .join(" ");
      if (cityStateZip) parts.push(cityStateZip);
    }
    const mailingFormatted = parts.join(", ");

    if (!mailingFormatted) {
      skipped++;
      continue;
    }

    // Check if mailing address is the same as the property address — skip if so
    const propAddressNorm = `${record.address} ${record.city}`
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const mailAddressNorm = `${record.mailingAddress ?? ""} ${record.mailingCity ?? ""}`
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (propAddressNorm && mailAddressNorm && propAddressNorm === mailAddressNorm) {
      skipped++;
      continue;
    }

    try {
      // Find the property by parcel ID
      const propertyRows = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.parcelId, record.parcelId))
        .limit(1);

      if (propertyRows.length === 0) {
        skipped++;
        continue;
      }

      const propertyId = propertyRows[0].id;

      await db
        .insert(ownerContacts)
        .values({
          propertyId,
          phone: null,
          email: `MAILING: ${mailingFormatted}`,
          source: "county-assessor",
          isManual: false,
          needsSkipTrace: false,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [ownerContacts.propertyId, ownerContacts.source],
          set: {
            email: `MAILING: ${mailingFormatted}`,
            updatedAt: now,
          },
        });

      stored++;
    } catch (err) {
      console.log(
        `[assessor-mailing] Error storing mailing for parcel ${record.parcelId}: ${err}`
      );
      errors++;
    }
  }

  console.log(
    `[assessor-mailing] Complete: ${stored} stored, ${skipped} skipped, ${errors} errors`
  );

  return { stored, skipped, errors };
}
