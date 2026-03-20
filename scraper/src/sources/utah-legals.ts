import {
  launchBrowser,
  createPage,
} from "../lib/scraper-utils.js";

// County indexes in the Utah Legals county checkbox list (0-based)
// Verified from the HTML: Beaver=0, Box Elder=1, Cache=2, Carbon=3, Daggett=4,
// Davis=5, Duchesne=6, Emery=7, Garfield=8, Grand=9, Iron=10, Juab=11,
// Kane=12, Millard=13, Morgan=14, Piute=15, Rich=16, Salt Lake=17,
// Salt Lake/ Utah=18, San Juan=19, Sanpete=20, Sevier=21, Summit=22,
// temp=23, Tooele=24, Uintah=25, Utah=26, Wasatch=27, Washington=28,
// Wayne=29, Weber=30
const TARGET_COUNTY_INDEXES = [3, 7, 11, 13]; // Carbon, Emery, Juab, Millard

export interface UtahLegalsNotice {
  title: string;
  county: string;
  noticeDate?: string;
  bodyText: string;
  detailUrl?: string;
  /** Extracted address from notice text, if found */
  propertyAddress?: string;
  /** Extracted owner/grantor name from notice text, if found */
  ownerName?: string;
  /** Extracted parcel/serial number from notice text, if found */
  parcelId?: string;
}

/**
 * Extract a property address from trustee sale notice text.
 * Looks for patterns like "commonly known as 123 Main St, Price, UT"
 * or "property located at ..." or street address patterns.
 */
function extractAddress(text: string): string | undefined {
  // Pattern: "commonly known as <address>" or "known as <address>"
  const knownAs = text.match(/commonly known as\s+([^,\n]+(?:,[^,\n]+)?)/i);
  if (knownAs) return knownAs[1].trim();

  // Pattern: "property located at <address>"
  const locatedAt = text.match(/property (?:located|situate[d]?) at\s+([^,\n]+(?:,[^,\n]+)?)/i);
  if (locatedAt) return locatedAt[1].trim();

  // Pattern: street address at end of sentence (e.g., "2024 East 100 North, Price, UT")
  // Look for number + direction + street name before a city/state
  const streetAddr = text.match(/\b(\d+\s+(?:[A-Z]\w+\s+){1,4}(?:St(?:reet)?|Ave(?:nue)?|Rd|Road|Dr(?:ive)?|Blvd|Ln|Lane|Ct|Court|Way|Cir|Pl(?:ace)?)[.,\s][^,\n]{1,40})/i);
  if (streetAddr) return streetAddr[1].trim();

  return undefined;
}

/**
 * Extract owner/grantor name from trustee sale notice text.
 * Looks for "Trustor: NAME" or "Grantor: NAME" or "made by NAME" patterns.
 */
function extractOwnerName(text: string): string | undefined {
  // Pattern: "Trustor: NAME" or "Grantor(s): NAME"
  const trustor = text.match(/(?:Trustor|Grantor)[s]?:?\s+([A-Z][A-Za-z\s,.']+?)(?:\n|,|\band\b|$)/i);
  if (trustor) return trustor[1].trim().replace(/,\s*$/, "");

  // Pattern: "made by NAME and NAME"
  const madeBy = text.match(/(?:deed of trust|trust deed) made by\s+([A-Z][A-Za-z\s,.']+?)(?:\s+to\s+|\n|$)/i);
  if (madeBy) return madeBy[1].trim();

  return undefined;
}

/**
 * Extract parcel / serial number from notice text.
 * Utah parcel formats vary by county: XX-XXXX-XXXX, alphanumeric, etc.
 */
function extractParcelId(text: string): string | undefined {
  // Pattern: "Parcel No." or "Serial No." or "Tax ID"
  const parcelNo = text.match(/(?:Parcel|Serial|Tax ID|Parcel No\.?|Serial No\.?)[:\s#]+([A-Z0-9][\w-]{3,})/i);
  if (parcelNo) return parcelNo[1].trim();

  // Pattern: Carbon-style parcel XX-XXXX-XXXX
  const carbonParcel = text.match(/\b(\d{2}-\d{4}-\d{4})\b/);
  if (carbonParcel) return carbonParcel[1];

  return undefined;
}

/**
 * Scrapes Utah Legals (utahlegals.com) for trustee sale / foreclosure notices
 * in Carbon, Emery, Juab, and Millard counties.
 *
 * Uses Playwright because the site is ASP.NET WebForms with VIEWSTATE.
 *
 * Process:
 * 1. Navigate to the search page
 * 2. Select "Foreclosures" category
 * 3. Check target county checkboxes
 * 4. Submit the search form
 * 5. Collect all notice titles, dates, and links from the results
 * 6. Visit each notice detail page to extract property address / owner name
 *
 * @returns Array of UtahLegalsNotice objects
 */
export async function scrapeUtahLegalsForeclosures(): Promise<UtahLegalsNotice[]> {
  const startTime = Date.now();
  const notices: UtahLegalsNotice[] = [];
  const tag = "[utah-legals]";

  const browser = await launchBrowser();

  try {
    const page = await createPage(browser);

    // Navigate to search page
    await page.goto("https://www.utahlegals.com/search.aspx", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    console.log(`${tag} Page loaded: ${await page.title()}`);

    // Select "Foreclosures" from the category quick-search dropdown
    // The select has ID ctl00_ContentPlaceHolder1_as1_ddlQuickSearch (or similar)
    // Value "3" corresponds to Foreclosures based on the dropdown options
    try {
      const categorySelect = await page.$(
        'select[id*="ddlQuickSearch"], select[id*="QuickSearch"]'
      );
      if (categorySelect) {
        await categorySelect.selectOption({ label: "Foreclosures" });
        console.log(`${tag} Selected Foreclosures from quick search`);
        // Wait for the page to partially reload / update county options
        await page.waitForTimeout(1500);
      }
    } catch (err) {
      console.log(`${tag} Quick search dropdown not found, trying advanced search`);
    }

    // Check target county checkboxes (Carbon=3, Emery=7, Juab=11, Millard=13)
    const countyNames = ["Carbon", "Emery", "Juab", "Millard"];
    for (const countyName of countyNames) {
      try {
        // Find checkbox by its associated label text
        const label = await page.$(
          `label:has-text("${countyName}"), label:text-is("${countyName}")`
        );
        if (label) {
          const forAttr = await label.getAttribute("for");
          if (forAttr) {
            const checkbox = await page.$(`#${forAttr}`);
            if (checkbox) {
              const checked = await checkbox.isChecked();
              if (!checked) {
                await checkbox.check();
                console.log(`${tag} Checked county: ${countyName}`);
              }
            }
          }
        } else {
          // Fallback: look for checkbox near text
          const checkboxes = await page.$$('input[type="checkbox"]');
          for (const cb of checkboxes) {
            const name = await cb.getAttribute("name") ?? "";
            if (name.toLowerCase().includes(countyName.toLowerCase())) {
              await cb.check();
              console.log(`${tag} Checked county by name attr: ${countyName}`);
              break;
            }
          }
        }
      } catch (err) {
        console.log(`${tag} Could not check county ${countyName}:`, err);
      }
    }

    // Also select "Foreclosures" from the category checkboxes in the advanced section
    try {
      const foreclosureLabel = await page.$(
        'label:has-text("Foreclosure"), label:text-is("Foreclosures")'
      );
      if (foreclosureLabel) {
        const forAttr = await foreclosureLabel.getAttribute("for");
        if (forAttr) {
          const cb = await page.$(`#${forAttr}`);
          if (cb && !(await cb.isChecked())) {
            await cb.check();
            console.log(`${tag} Checked Foreclosures category`);
          }
        }
      }
    } catch {
      // Category might be set via dropdown already
    }

    // Submit the search form
    try {
      const searchBtn = await page.$(
        'input[type="submit"][value*="Search"], button:has-text("Search"), input[id*="btnSearch"]'
      );
      if (searchBtn) {
        await searchBtn.click();
        console.log(`${tag} Clicked search button`);
      } else {
        // Try form submit
        await page.keyboard.press("Enter");
      }
      await page.waitForLoadState("networkidle", { timeout: 30000 });
    } catch (err) {
      console.log(`${tag} Search submit issue:`, err);
    }

    console.log(`${tag} Search submitted, collecting results...`);

    // Collect all notice links from results
    // Results are typically in a table or list with links to individual notice pages
    let hasNextPage = true;
    let pageNum = 0;
    const noticeLinks: Array<{ href: string; title: string; date: string; county: string }> = [];

    while (hasNextPage && pageNum < 20) {
      pageNum++;

      // Extract notice links from current page
      const pageLinks = await page.$$eval(
        'a[href*="notice"], a[href*="Notice"], table.search-results a, #searchResults a, .notice-result a',
        (anchors: Element[]) => {
          return anchors.map((a) => {
            const href = (a as HTMLAnchorElement).href;
            const text = a.textContent?.trim() ?? "";
            // Look for date in parent row
            const row = a.closest("tr");
            const dateCell = row?.querySelector("td:nth-child(1)")?.textContent?.trim() ?? "";
            const countyCell = row?.querySelector("td:nth-child(3)")?.textContent?.trim() ?? "";
            return { href, title: text, date: dateCell, county: countyCell };
          }).filter((l) => l.href && l.title);
        }
      );

      noticeLinks.push(...pageLinks);
      console.log(
        `${tag} Page ${pageNum}: found ${pageLinks.length} notice links (total: ${noticeLinks.length})`
      );

      // Check for pagination
      const nextBtn = await page.$(
        '.pagination a:has-text("Next"), a.next-page, input[value="Next >"]'
      );
      if (nextBtn && pageLinks.length > 0) {
        await nextBtn.click();
        await page.waitForLoadState("networkidle", { timeout: 20000 });
      } else {
        hasNextPage = false;
      }
    }

    console.log(`${tag} Total notice links collected: ${noticeLinks.length}`);

    // Visit each notice detail page to extract property info
    // Limit to 100 notices to avoid excessive scraping
    const linksToProcess = noticeLinks.slice(0, 100);

    for (const link of linksToProcess) {
      try {
        await page.goto(link.href, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(800);

        const bodyText = await page.$eval(
          "#notice-body, .notice-content, .notice-text, #noticeBody, article, .content-area",
          (el: Element) => el.textContent?.trim() ?? ""
        ).catch(() => "");

        const fullText = bodyText || (await page.textContent("body") ?? "");

        // Determine which county this is for
        let county = link.county;
        for (const c of countyNames) {
          if (fullText.toLowerCase().includes(c.toLowerCase() + " county")) {
            county = c.toLowerCase();
            break;
          }
        }

        const notice: UtahLegalsNotice = {
          title: link.title,
          county: county.toLowerCase() || "unknown",
          noticeDate: link.date || undefined,
          bodyText: fullText.slice(0, 2000), // limit stored text
          detailUrl: link.href,
          propertyAddress: extractAddress(fullText),
          ownerName: extractOwnerName(fullText),
          parcelId: extractParcelId(fullText),
        };

        notices.push(notice);
        console.log(
          `${tag} Processed notice: "${link.title.slice(0, 60)}" | address: ${notice.propertyAddress ?? "none"} | parcel: ${notice.parcelId ?? "none"}`
        );

        await page.waitForTimeout(1000); // polite delay between detail pages
      } catch (err) {
        console.log(`${tag} Error processing notice ${link.href}:`, err);
      }
    }
  } finally {
    await browser.close();
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `${tag} Complete: ${notices.length} notices processed, ${elapsed}s elapsed`
  );

  return notices;
}
