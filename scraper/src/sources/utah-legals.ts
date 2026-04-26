import {
  launchBrowser,
  createPage,
} from "../lib/scraper-utils.js";

// County checkbox indexes in the Utah Legals checkbox list (0-based, verified from HTML)
// Beaver=0, Box Elder=1, Cache=2, Carbon=3, Daggett=4, Davis=5, Duchesne=6,
// Emery=7, Garfield=8, Grand=9, Iron=10, Juab=11, Kane=12, Millard=13,
// Morgan=14, Piute=15, Rich=16, Salt Lake=17, Salt Lake/Utah=18 (WRONG — combined, do NOT use index 18)
const TARGET_COUNTIES: Array<{ index: number; name: string }> = [
  { index: 3,  name: "carbon" },
  { index: 7,  name: "emery" },
  { index: 11, name: "juab" },
  { index: 13, name: "millard" },
  { index: 17, name: "salt lake" }, // Salt Lake County only — NOT index 18 ("Salt Lake/Utah" combined)
];

export interface UtahLegalsNotice {
  title: string;
  county: string;
  city: string;
  noticeDate?: string;
  bodyText: string;
  detailUrl?: string;
  /** Extracted property address from notice snippet, if found */
  propertyAddress?: string;
  /** Extracted owner/grantor name from notice snippet, if found */
  ownerName?: string;
  /** Extracted parcel/serial number from notice snippet, if found */
  parcelId?: string;
  /** '84116' for SLC notices that pass the 84116 zip-area city allowlist; undefined otherwise */
  zip?: string;
}

/**
 * Extract a property address from trustee sale notice text.
 * Looks for patterns like "commonly known as 123 Main St, Price, UT"
 * or "property located at ..." or street address patterns.
 */
function extractAddress(text: string): string | undefined {
  // Pattern: "commonly known as <address>"
  const knownAs = text.match(/commonly known as\s+([^,\n]+(?:,[^,\n]+)?)/i);
  if (knownAs) return knownAs[1].trim();

  // Pattern: "property located at <address>"
  const locatedAt = text.match(/property (?:located|situate[d]?) at\s+([^,\n]+(?:,[^,\n]+)?)/i);
  if (locatedAt) return locatedAt[1].trim();

  // Pattern: street address (number + direction/street name)
  const streetAddr = text.match(/\b(\d+\s+(?:[A-Z]\w+\s+){1,4}(?:St(?:reet)?|Ave(?:nue)?|Rd|Road|Dr(?:ive)?|Blvd|Ln|Lane|Ct|Court|Way|Cir|Pl(?:ace)?)[.,\s][^,\n]{1,40})/i);
  if (streetAddr) return streetAddr[1].trim();

  return undefined;
}

/**
 * Extract owner/grantor name from trustee sale notice text.
 */
function extractOwnerName(text: string): string | undefined {
  const trustor = text.match(/(?:Trustor|Grantor)[s]?:?\s+([A-Z][A-Za-z\s,.']+?)(?:\n|,|\band\b|$)/i);
  if (trustor) return trustor[1].trim().replace(/,\s*$/, "");

  const madeBy = text.match(/(?:deed of trust|trust deed) made by\s+([A-Z][A-Za-z\s,.']+?)(?:\s+to\s+|\n|$)/i);
  if (madeBy) return madeBy[1].trim();

  return undefined;
}

/**
 * Extract parcel / serial number from notice text.
 * Supports A.P.N., Parcel No., Serial No., Tax ID formats.
 */
function extractParcelId(text: string): string | undefined {
  // Pattern: "A.P.N.: XX-XXX-XXXX" (common in Utah trustee sale notices)
  const apn = text.match(/A\.P\.N\.?:?\s*([A-Z0-9][\w\-./]{3,})/i);
  if (apn) return apn[1].trim();

  // Pattern: "Parcel No." or "Serial No." or "Tax ID"
  const parcelNo = text.match(/(?:Parcel|Serial|Tax ID|Parcel No\.?|Serial No\.?)[:\s#]+([A-Z0-9][\w-]{3,})/i);
  if (parcelNo) return parcelNo[1].trim();

  // Pattern: Carbon-style parcel XX-XXXX-XXXX
  const carbonParcel = text.match(/\b(\d{2}-\d{4}-\d{4})\b/);
  if (carbonParcel) return carbonParcel[1];

  // Branch 4: SLC multi-segment bare pattern (defensive fallback — Branch 2 catches labeled SLC parcels)
  // Matches: 26-24-406-084-0000, 08-22-327-004-0000 (format: DD-DD-DDD-DDD-DDDD)
  // Branch 2 handles labeled SLC parcels (Serial No., Tax Serial Number, etc.)
  // Branch 4 catches any unlabeled SLC bare number not matched by Branch 3.
  const slcParcel = text.match(/\b(\d{2}-\d{1,3}-\d{3,4}-\d{3,4}-\d{3,4})\b/);
  if (slcParcel) return slcParcel[1];

  return undefined;
}

/** Cities whose Utah Legals notices indicate a property in the 84116 zip-code area (Rose Park / West SLC). */
const SLC_84116_CITIES = new Set(['salt lake city', 'rose park', 'north salt lake']);

/**
 * Scrapes Utah Legals (utahlegals.com) for trustee sale / foreclosure notices
 * in Carbon, Emery, Juab, and Millard counties.
 *
 * Uses Playwright with the correct interaction sequence for the ASP.NET WebForms site:
 * 1. Select "Foreclosures" from the quick-search dropdown (triggers __doPostBack redirect)
 * 2. Expand the County filter panel (click label.header to show div#countyDiv)
 * 3. For each target county: set checkbox.checked=true, then call __doPostBack via JS
 * 4. Click the search button (id="ctl00_ContentPlaceHolder1_as1_btnGo")
 * 5. Parse results from the WSExtendedGridNP1 grid (input.viewButton + td.info cells)
 *
 * NOTE: Does NOT visit individual detail pages because Details.aspx requires
 * reCAPTCHA completion. All usable data (parcel, county, city, snippet) is
 * extracted from the search results list.
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
    // Use a wide viewport so the footer doesn't overlay the county checkboxes
    await page.setViewportSize({ width: 1280, height: 900 });

    // Navigate to search page — ASP.NET will redirect to a session URL
    await page.goto("https://www.utahlegals.com/Search.aspx", {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    console.log(`${tag} Page loaded: ${page.url()}`);

    // Step 1: Select "Foreclosures" (value "3") from the quick-search dropdown.
    // This triggers a __doPostBack which redirects and sets the category filter.
    const ddl = await page.$(
      "#ctl00_ContentPlaceHolder1_as1_ddlPopularSearches"
    );
    if (!ddl) {
      console.log(`${tag} Quick search dropdown not found — aborting`);
      return notices;
    }
    await ddl.selectOption("3");
    await page.waitForLoadState("networkidle", { timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log(`${tag} Foreclosures category selected, URL: ${page.url()}`);

    // Step 2: Expand the County filter panel (div#countyDiv starts collapsed).
    try {
      await page.click(
        "#ctl00_ContentPlaceHolder1_as1_divCounty label.header"
      );
      await page.waitForTimeout(500);
      console.log(`${tag} County panel expanded`);
    } catch (err) {
      console.log(`${tag} Could not expand county panel:`, err);
    }

    // Step 3: Check each target county checkbox.
    // Standard Playwright .check() fails because the footer element overlaps the checkboxes
    // and because the ASP.NET __doPostBack requires the checkbox to already be in the
    // checked state when the form is serialized.
    // Solution: set checked=true in the DOM, then trigger __doPostBack via page.evaluate().
    for (const county of TARGET_COUNTIES) {
      try {
        const checked = await page.evaluate((idx) => {
          const cb = document.getElementById(
            `ctl00_ContentPlaceHolder1_as1_lstCounty_${idx}`
          ) as HTMLInputElement | null;
          if (!cb) return false;
          if (cb.checked) return true; // already checked
          cb.checked = true;
          // Trigger the async UpdatePanel postback that the onclick attribute would fire.
          // __doPostBack is an ASP.NET WebForms global injected at runtime by ScriptManager.
          // We cast to any to avoid TS2304 ("Cannot find name '__doPostBack'").
          const doPostBack = (window as unknown as Record<string, unknown>)["__doPostBack"] as
            | ((target: string, argument: string) => void)
            | undefined;
          if (typeof doPostBack === "function") {
            doPostBack(
              `ctl00$ContentPlaceHolder1$as1$lstCounty$${idx}`,
              ""
            );
          }
          return true;
        }, county.index);

        if (checked) {
          await page.waitForTimeout(500);
          await page.waitForLoadState("networkidle", { timeout: 15000 });
          await page.waitForTimeout(800);
          console.log(`${tag} Checked county: ${county.name} (index ${county.index})`);
        } else {
          console.log(`${tag} County checkbox not found: ${county.name} (index ${county.index})`);
        }
      } catch (err) {
        console.log(`${tag} Error checking county ${county.name}:`, err);
      }
    }

    // Step 4: Click the search button.
    // The button has value="" and class="goButton" - NOT value="Search".
    // Use page.evaluate to avoid footer overlay interception.
    try {
      await page.evaluate(() => {
        const btn = document.getElementById(
          "ctl00_ContentPlaceHolder1_as1_btnGo"
        ) as HTMLInputElement | null;
        if (btn) (btn as HTMLElement).click();
      });
      await page.waitForLoadState("networkidle", { timeout: 30000 });
      await page.waitForTimeout(3000);
      console.log(`${tag} Search submitted`);
    } catch (err) {
      console.log(`${tag} Error clicking search button:`, err);
    }

    // Step 5: Parse results and paginate.
    let hasNextPage = true;
    let pageNum = 0;

    while (hasNextPage && pageNum < 20) {
      pageNum++;

      // Extract all notice rows from the WSExtendedGridNP1 grid.
      // Each row is a table.nested inside the wsResultsGrid.
      // - viewButton input has onclick="location.href='Details.aspx?SID=...&ID=...'"
      // - td.info .left: publication name and date
      // - td.info .right: City/County (hidden in CSS but still in DOM)
      // - td[colspan="3"]: snippet text (~300 chars) including A.P.N. / trustee info
      const pageResults = await page.$$eval(
        "table.wsResultsGrid table.nested",
        (tables: Element[]) => {
          return tables
            .map((t) => {
              const viewBtn = t.querySelector(
                'input.viewButton[onclick*="Details.aspx"]'
              ) as HTMLInputElement | null;
              if (!viewBtn) return null;

              const onclick = viewBtn.getAttribute("onclick") ?? "";
              const idMatch = onclick.match(/ID=(\d+)/);
              const sidMatch = onclick.match(/SID=([^&']+)/);
              if (!idMatch) return null;

              const infoCell = t.querySelector("td.info");
              const pubEl = infoCell?.querySelector("strong");
              const publication = pubEl?.textContent?.trim() ?? "";
              const leftText =
                infoCell
                  ?.querySelector(".left")
                  ?.textContent?.replace(publication, "")
                  .trim() ?? "";
              const rightText =
                infoCell?.querySelector(".right")?.textContent?.trim() ?? "";

              // Extract city and county from the hidden .right cell text
              // Format: "City: <city>\n                                    County: <county>"
              const cityMatch = rightText.match(/City:\s*([^\n]+)/);
              const countyMatch = rightText.match(/County:\s*([^\n]+)/);
              const city = cityMatch?.[1]?.trim() ?? "";
              const county = countyMatch?.[1]?.trim() ?? "";

              const snippet =
                t
                  .querySelector("td[colspan='3']")
                  ?.textContent?.trim() ?? "";

              return {
                noticeId: idMatch[1],
                sid: sidMatch?.[1] ?? "",
                publication,
                dateText: leftText,
                city,
                county,
                snippet: snippet.substring(0, 2000),
              };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);
        }
      );

      console.log(
        `${tag} Page ${pageNum}: found ${pageResults.length} notices`
      );

      for (const result of pageResults) {
        const snippet = result.snippet;
        const countyLower = result.county.toLowerCase();

        // Filter: only keep notices from our target counties
        const isTargetCounty = TARGET_COUNTIES.some(
          (c) => c.name === countyLower
        );
        if (!isTargetCounty) {
          console.log(
            `${tag} Skipping non-target county: ${result.county} (ID: ${result.noticeId})`
          );
          continue;
        }

        // Filter: only keep trustee sale / foreclosure notices
        // (results may include summons, ordinances, etc. because Foreclosures
        //  category can include all notice types from the selected publications)
        const isForeclosure =
          snippet.toLowerCase().includes("trustee") ||
          snippet.toLowerCase().includes("foreclos") ||
          snippet.toLowerCase().includes("notice of default") ||
          snippet.toLowerCase().includes("nod");
        if (!isForeclosure) {
          console.log(
            `${tag} Skipping non-foreclosure notice in ${result.county} (ID: ${result.noticeId}): ${snippet.substring(0, 80)}`
          );
          continue;
        }

        // RP-11: For Salt Lake County notices, only retain those in the 84116 zip-area.
        // SLC returns notices for ALL Salt Lake County cities (Sandy, Midvale, Holladay, etc.).
        // Filter to city names that correspond to the 84116 area (Rose Park / West SLC).
        // Empty city is allowed through with a warning — will receive the "Rose Park" COUNTY_CITY default.
        if (countyLower === 'salt lake') {
          const noticeCity = result.city.toLowerCase().trim();
          if (noticeCity && !SLC_84116_CITIES.has(noticeCity)) {
            console.log(
              `${tag} SLC notice excluded (city outside 84116): "${result.city}" (ID: ${result.noticeId})`
            );
            continue;
          }
          if (!noticeCity) {
            console.log(
              `${tag} SLC notice: empty city field, allowing through (ID: ${result.noticeId})`
            );
          }
        }

        // Parse notice date from dateText (e.g., "Friday, March 20, 2026" or "Wednesday, Mar 18, 2026")
        let noticeDate: string | undefined;
        if (result.dateText) {
          const d = new Date(result.dateText.replace(/\s+/g, " ").trim());
          if (!isNaN(d.getTime())) {
            noticeDate = d.toISOString().split("T")[0];
          }
        }

        const detailUrl = result.sid
          ? `https://www.utahlegals.com/Details.aspx?SID=${result.sid}&ID=${result.noticeId}`
          : `https://www.utahlegals.com/Details.aspx?ID=${result.noticeId}`;

        const notice: UtahLegalsNotice = {
          title: `NOTICE OF TRUSTEE'S SALE - ${result.county} County`,
          county: countyLower,
          city: result.city,
          noticeDate,
          bodyText: snippet,
          detailUrl,
          propertyAddress: extractAddress(snippet),
          ownerName: extractOwnerName(snippet),
          parcelId: extractParcelId(snippet),
          zip: countyLower === 'salt lake' ? '84116' : undefined,  // RP-11: enables normalizeCity() retag
        };

        notices.push(notice);
        console.log(
          `${tag} Notice ID:${result.noticeId} county:${notice.county} city:${notice.city} parcel:${notice.parcelId ?? "none"} addr:${notice.propertyAddress ?? "none"}`
        );
      }

      // Check for next page
      const nextBtn = await page.$(
        "#ctl00_ContentPlaceHolder1_WSExtendedGridNP1_GridView1_ctl01_btnNext:not([disabled])"
      );
      if (nextBtn && pageResults.length > 0) {
        try {
          await page.evaluate(() => {
            const btn = document.getElementById(
              "ctl00_ContentPlaceHolder1_WSExtendedGridNP1_GridView1_ctl01_btnNext"
            ) as HTMLInputElement | null;
            if (btn) btn.click();
          });
          await page.waitForLoadState("networkidle", { timeout: 20000 });
          await page.waitForTimeout(1500);
          console.log(`${tag} Navigated to page ${pageNum + 1}`);
        } catch (err) {
          console.log(`${tag} Pagination error:`, err);
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
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
