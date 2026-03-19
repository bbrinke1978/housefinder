import {
  launchBrowser,
  createPage,
} from "../lib/scraper-utils.js";
import {
  delinquentRecordSchema,
  type DelinquentRecord,
} from "../lib/validation.js";
// Lazy import to avoid DOMMatrix error from @napi-rs/canvas at module load time
// pdf-parse v2 depends on @napi-rs/canvas which needs native bindings
async function getPDFParse() {
  const mod = await import("pdf-parse");
  return mod.PDFParse;
}

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * Per-county configuration for PDF delinquent tax list parsing.
 * Each county provides its own treasurer page URL, link discovery pattern,
 * and line parser to handle county-specific PDF formatting.
 */
export type PdfCountyConfig = {
  county: string;
  treasurerPageUrl: string;
  pdfLinkTextPattern: RegExp;
  lineParser: (line: string) => DelinquentRecord | null;
};

// ── Generic line parser factory ─────────────────────────────────────────────

/**
 * Creates a generic delinquent tax line parser for a given county.
 * Intentionally generous — better to parse too many records (and let
 * validation filter) than miss data.
 *
 * Expected line format: parcel-number  owner-name  $amount
 * Parcel patterns: XX-XXXX-XXXX, XX-XXX-XXXX, or similar dash/space separated digits.
 */
export function makeGenericDelinquentLineParser(
  county: string
): (line: string) => DelinquentRecord | null {
  return (line: string): DelinquentRecord | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Skip header-like lines
    if (/\bPARCEL\b/i.test(trimmed) && /\bOWNER\b/i.test(trimmed)) return null;
    if (/^[-=]+$/.test(trimmed)) return null;

    // Try to match a parcel number at the beginning of the line
    // Formats: XX-XXXX-XXXX, XX-XXX-XXXX, X-XXX-XXXX, etc.
    const parcelMatch = trimmed.match(/^(\d{1,3}[-\s]\d{3,5}[-\s]\d{3,5})/);
    if (!parcelMatch) return null;

    const parcelId = parcelMatch[1].replace(/\s/g, "-");
    const remainder = trimmed.slice(parcelMatch[0].length).trim();

    // Try to extract dollar amount from end of line
    let ownerName: string | undefined;
    let amountDue: string | undefined;

    const amountMatch = remainder.match(/\$?([\d,]+\.?\d*)\s*$/);
    if (amountMatch) {
      amountDue = amountMatch[1].replace(/,/g, "");
      ownerName = remainder.slice(0, remainder.lastIndexOf(amountMatch[0])).trim() || undefined;
    } else {
      ownerName = remainder || undefined;
    }

    return {
      parcelId,
      ownerName,
      amountDue,
      county,
    };
  };
}

// ── Shared PDF parser ───────────────────────────────────────────────────────

/**
 * Shared PDF delinquent tax list parser.
 *
 * 1. Launches Playwright to discover the PDF link on the treasurer page.
 * 2. Downloads the PDF via fetch().
 * 3. Parses with pdf-parse and applies the county-specific line parser.
 * 4. Validates each record with delinquentRecordSchema.
 *
 * @returns Validated array of DelinquentRecord objects
 */
export async function parsePdfDelinquent(
  config: PdfCountyConfig
): Promise<DelinquentRecord[]> {
  const startTime = Date.now();
  const records: DelinquentRecord[] = [];
  let totalParsed = 0;
  let invalidCount = 0;
  const tag = `[${config.county}-delinquent-pdf]`;

  // Step 1: Discover the PDF URL on the treasurer page
  const browser = await launchBrowser();
  let pdfUrl: string | null = null;
  let pageUrl = config.treasurerPageUrl;

  try {
    const page = await createPage(browser);
    await page.goto(config.treasurerPageUrl, {
      // "load" waits for window.load (all scripts/images). "networkidle" waits for
      // no network activity for 500ms, which can timeout on Elementor/WordPress sites
      // that make continuous background requests (analytics, telemetry, etc.).
      waitUntil: "load",
      timeout: 60000,
    });

    // Collect all links for diagnostics and matching
    const allLinks = await page.$$("a");
    const linkSummary: string[] = [];
    const linkData: Array<{ text: string; href: string }> = [];

    for (const a of allLinks) {
      const text = (await a.textContent() ?? "").trim();
      const href = (await a.getAttribute("href") ?? "").trim();
      if (text || href) {
        linkData.push({ text, href });
        linkSummary.push(`"${text}" -> ${href}`);
      }
    }

    console.log(`${tag} Found ${linkData.length} links on treasurer page:`);
    // Log first 30 links so we can diagnose mismatches without flooding logs
    for (const entry of linkSummary.slice(0, 30)) {
      console.log(`${tag}   ${entry}`);
    }

    // Helper: check if href pathname ends in .pdf (ignores query strings like ?t=...)
    const hrefIsPdf = (href: string): boolean => {
      try {
        // Handle relative URLs by resolving against current page
        const url = new URL(href, config.treasurerPageUrl);
        return url.pathname.toLowerCase().endsWith(".pdf");
      } catch {
        return href.toLowerCase().split("?")[0].endsWith(".pdf");
      }
    };

    // Strategy 1: link text matches pattern AND href pathname ends in .pdf
    for (const { text, href } of linkData) {
      if (
        text &&
        config.pdfLinkTextPattern.test(text) &&
        href &&
        hrefIsPdf(href)
      ) {
        pdfUrl = href;
        console.log(`${tag} Matched by text+pdf-ext: "${text}" -> ${href}`);
        break;
      }
    }

    // Strategy 2: href itself contains the pattern and pathname ends in .pdf (no text match needed)
    if (!pdfUrl) {
      for (const { text, href } of linkData) {
        if (href && config.pdfLinkTextPattern.test(href) && hrefIsPdf(href)) {
          pdfUrl = href;
          console.log(`${tag} Matched by href-pattern+pdf-ext: "${text}" -> ${href}`);
          break;
        }
      }
    }

    // Strategy 3: link text matches pattern, any href (PDF might serve without .pdf extension)
    if (!pdfUrl) {
      for (const { text, href } of linkData) {
        if (text && config.pdfLinkTextPattern.test(text) && href) {
          pdfUrl = href;
          console.log(`${tag} Matched by text-only (no .pdf ext required): "${text}" -> ${href}`);
          break;
        }
      }
    }

    pageUrl = page.url(); // capture actual URL for relative resolution
  } finally {
    await browser.close();
  }

  if (!pdfUrl) {
    console.log(`${tag} No PDF link found on treasurer page. Check link log above for available links.`);
    return [];
  }

  // Resolve relative URLs against the page URL
  try {
    const resolved = new URL(pdfUrl, pageUrl);
    pdfUrl = resolved.href;
  } catch {
    // If URL construction fails, try basic resolution
    if (pdfUrl.startsWith("/")) {
      const base = new URL(config.treasurerPageUrl);
      pdfUrl = `${base.origin}${pdfUrl}`;
    }
  }

  console.log(`${tag} Found PDF URL: ${pdfUrl}`);

  // Step 2: Download and parse the PDF
  let pdfText: string;
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.log(
        `${tag} Failed to download PDF: ${response.status} ${response.statusText}`
      );
      return [];
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const PDFParse = await getPDFParse();
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    pdfText = textResult.text;
    await parser.destroy();
  } catch (err) {
    console.log(`${tag} Error downloading/parsing PDF:`, err);
    return [];
  }

  // Step 3: Parse line-by-line using the county-specific line parser
  const lines = pdfText.split("\n");
  for (const line of lines) {
    const parsed = config.lineParser(line);
    if (!parsed) continue;

    totalParsed++;
    const result = delinquentRecordSchema.safeParse(parsed);
    if (result.success) {
      records.push(result.data);
    } else {
      invalidCount++;
      console.log(
        `${tag} Invalid record skipped:`,
        JSON.stringify(parsed),
        result.error.issues.map((i) => i.message).join(", ")
      );
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `${tag} Parsed ${records.length} records from PDF (${totalParsed} lines matched, ${invalidCount} invalid, ${elapsed}s elapsed)`
  );

  return records;
}

/**
 * Downloads and parses a PDF from a known direct URL, bypassing Playwright.
 *
 * Used when the PDF URL is already known (e.g. extracted from the WordPress
 * REST API response) so there's no need to launch a browser to discover it.
 * Applies the same line parser and validation as parsePdfDelinquent().
 *
 * @param pdfUrl  Direct URL to the PDF file
 * @param config  County config (uses county name, lineParser, and tag)
 * @returns Validated array of DelinquentRecord objects
 */
export async function parsePdfDelinquentFromUrl(
  pdfUrl: string,
  config: PdfCountyConfig
): Promise<DelinquentRecord[]> {
  const startTime = Date.now();
  const records: DelinquentRecord[] = [];
  let totalParsed = 0;
  let invalidCount = 0;
  const tag = `[${config.county}-delinquent-pdf]`;

  console.log(`${tag} Downloading PDF directly (bypassing Playwright): ${pdfUrl}`);

  // Download and parse the PDF
  let pdfText: string;
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.log(`${tag} Failed to download PDF: ${response.status} ${response.statusText}`);
      return [];
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const PDFParse = await getPDFParse();
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    pdfText = textResult.text;
    await parser.destroy();
  } catch (err) {
    console.log(`${tag} Error downloading/parsing PDF:`, err);
    return [];
  }

  // Parse line-by-line using the county-specific line parser
  const lines = pdfText.split("\n");
  for (const line of lines) {
    const parsed = config.lineParser(line);
    if (!parsed) continue;

    totalParsed++;
    const result = delinquentRecordSchema.safeParse(parsed);
    if (result.success) {
      records.push(result.data);
    } else {
      invalidCount++;
      console.log(
        `${tag} Invalid record skipped:`,
        JSON.stringify(parsed),
        result.error.issues.map((i) => i.message).join(", ")
      );
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `${tag} Parsed ${records.length} records from PDF (${totalParsed} lines matched, ${invalidCount} invalid, ${elapsed}s elapsed)`
  );

  return records;
}

// ── Per-county configurations ───────────────────────────────────────────────

// ── Sevier County ────────────────────────────────────────────────────────────

export const sevierConfig: PdfCountyConfig = {
  county: "sevier",
  // Sevier County publishes the delinquent tax report on a dedicated PHP page.
  // The PDF link appears on this page after December each year.
  // The link text is "Delinquent Tax Report" and the href is a relative URL
  // with a query string like ?t=202512181240240 (cache buster) — does not end
  // in .pdf when checked naively. Strategy 1 in parsePdfDelinquent uses
  // URL.pathname to check extension, which handles this correctly.
  treasurerPageUrl:
    "https://www.sevier.utah.gov/departments/county_officials/treasurer/current_year_delinquent_tax_report.php",
  pdfLinkTextPattern: /delinquent.*tax/i,
  lineParser: makeGenericDelinquentLineParser("sevier"),
};

// ── Juab County ──────────────────────────────────────────────────────────────

/**
 * Juab County-specific line parser.
 *
 * PDF format (2025):
 *   <AccountID> <ParcelNumber> <OwnerName...>, Total Due $<amount>
 *   <Year> $<amount>
 *
 * Example:
 *   "0015607 XA00-0814- 90 POINT RIDE LLC, A UTAH LIMITED"
 *   "LIABILITY COMPANY, Total Due $1,708.23"
 *   "2025 $1,708.23"
 *
 * The parcel format is alphanumeric: XA00-0814-, XE00-5226-, F000-6521-, etc.
 * We extract the parcel from the "Total Due $..." line which ends the record.
 * Because records can span multiple lines, we track state within the closure.
 */
function makeJuabLineParser(): (line: string) => DelinquentRecord | null {
  // State carried across lines (for multi-line records)
  let pendingParcelId: string | null = null;
  let pendingOwnerParts: string[] = [];

  return (line: string): DelinquentRecord | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Skip header line
    if (/^Account\s+ID\s+Parcel/i.test(trimmed)) return null;

    // Skip year/amount follow-up lines like "2025 $1,708.23"
    if (/^\d{4}\s+\$?[\d,]+\.?\d*\s*$/.test(trimmed)) return null;

    // Check if line starts a new record: <AccountID> <ParcelNumber> <Name...>
    // AccountID: 7 digits. ParcelNumber: alphanumeric with dashes (e.g. XA00-0814-, XA00-3400-2112)
    const startMatch = trimmed.match(/^(\d{7})\s+([A-Z0-9][\w-]*)\s+(.+)$/i);

    // Check if line ends a record: "...Total Due $amount"
    const totalDueMatch = trimmed.match(/Total Due\s+\$?([\d,]+\.?\d*)\s*$/i);

    if (startMatch && totalDueMatch) {
      // Single-line record: starts AND ends on same line
      // e.g. "0070560 XE00-5226- ADAMS, KELLIE, (JT) Total Due $26.17"
      const rawParcel = startMatch[2].trim();
      const parcelId = rawParcel.replace(/-$/, "") || rawParcel;
      const amountDue = totalDueMatch[1].replace(/,/g, "");
      // Owner name is between parcel and "Total Due"
      const ownerPart = startMatch[3].slice(0, startMatch[3].lastIndexOf("Total Due")).trim();
      const ownerName = ownerPart.replace(/,\s*$/, "").trim() || undefined;

      // Reset any pending state from previous incomplete record
      pendingParcelId = null;
      pendingOwnerParts = [];

      return { parcelId, ownerName, amountDue, county: "juab" };
    }

    if (startMatch && !totalDueMatch) {
      // Start of a multi-line record
      const rawParcel = startMatch[2].trim();
      pendingParcelId = rawParcel.replace(/-$/, "") || rawParcel;
      pendingOwnerParts = [startMatch[3]];
      return null;
    }

    if (!startMatch && totalDueMatch) {
      // End of a multi-line record (continuation line ending with "Total Due $...")
      const amountDue = totalDueMatch[1].replace(/,/g, "");
      const ownerRemainder = trimmed.slice(0, trimmed.lastIndexOf("Total Due")).trim();
      if (ownerRemainder) pendingOwnerParts.push(ownerRemainder);

      const result: DelinquentRecord | null = pendingParcelId
        ? {
            parcelId: pendingParcelId,
            ownerName: pendingOwnerParts.join(" ").replace(/,\s*$/, "").trim() || undefined,
            amountDue,
            county: "juab",
          }
        : null;

      pendingParcelId = null;
      pendingOwnerParts = [];
      return result;
    }

    // Plain continuation line (owner name spans multiple lines, no "Total Due" yet)
    if (pendingParcelId && trimmed) {
      pendingOwnerParts.push(trimmed);
    }

    return null;
  };
}

export const juabConfig: PdfCountyConfig = {
  county: "juab",
  // Juab County posts the annual delinquent tax list PDF on a WordPress post
  // with a URL slug like /notice-2025-delinquent-tax-list-copy/.
  // We use the WordPress REST API to discover the most recent post containing
  // "Delinquent Tax List" in the title, then scrape the PDF from that post.
  // The tax-sale page (juabcounty.gov/residents/tax-sale/) does NOT link the PDF.
  //
  // REST API search: juabcounty.gov/wp-json/wp/v2/posts?search=delinquent+tax+list&per_page=1
  // Returns the most recent matching post with its link, which we navigate to find the PDF.
  //
  // Since parsePdfDelinquent() navigates to treasurerPageUrl, we'll use the current
  // known post URL. A separate findJuabPdfUrl() function handles dynamic discovery.
  // For robustness, treasurerPageUrl is left as the REST API approach via a wrapper.
  treasurerPageUrl: "https://juabcounty.gov/notice-2025-delinquent-tax-list-copy/",
  // The PDF filename is "Account-Balance28.pdf" but the link text is "2025 Delinquent Tax List"
  pdfLinkTextPattern: /delinquent.*tax/i,
  lineParser: makeJuabLineParser(),
};

// ── Millard County ───────────────────────────────────────────────────────────

/**
 * Millard County-specific line parser.
 *
 * PDF format (2025):
 *   <AccountID> <OwnerName> Parcel: <ParcelID> Total Due: $<amount>
 *
 * Examples:
 *   "0195486 583 W MAIN LLC Parcel: D-4176-1-1 Total Due: $115.12"
 *   "0184927 A NEW DIG Parcel: ZZZ-312 Total Due: $1,288.40"
 *   "0154238 ADAMS, DAVID 1/2INT Parcel: 8252-1 Total Due: $1,317.30"
 *
 * The parcel format uses letters, digits, and dashes: D-4176-1-1, ZZZ-312, 8252-1, K-1954-3.
 */
function makeMillardLineParser(): (line: string) => DelinquentRecord | null {
  return (line: string): DelinquentRecord | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Match: <AccountID> <OwnerName> Parcel: <ParcelID> Total Due: $<amount>
    // The "Parcel:" keyword separates owner from parcel
    const match = trimmed.match(
      /^\d+\s+(.+?)\s+Parcel:\s*([A-Z0-9][\w.-]*(?:-[\w.-]*)*)\s+Total Due:\s*\$?([\d,]+\.?\d*)\s*$/i
    );
    if (!match) return null;

    const ownerName = match[1].trim() || undefined;
    const parcelId = match[2].trim();
    const amountDue = match[3].replace(/,/g, "");

    if (!parcelId) return null;

    return {
      parcelId,
      ownerName,
      amountDue,
      county: "millard",
    };
  };
}

export const millardConfig: PdfCountyConfig = {
  county: "millard",
  // Millard County keeps the delinquent tax listing on a specific treasurer sub-page.
  // PDF link text: "2025 DELINQUENT TAX LISTING"
  // PDF href: https://millardcounty.gov/wp-content/uploads/2025/12/2025-Deliquent-List.pdf
  // Note: filename uses typo "Deliquent" — pdfLinkTextPattern matches the link TEXT not the filename.
  treasurerPageUrl:
    "https://millardcounty.gov/your-government/elected-officials/treasurer/delinquent-tax-listing/",
  // Match both correct "delinquent" and typo "deliquent" in filenames
  pdfLinkTextPattern: /deli[nq]*uent/i,
  lineParser: makeMillardLineParser(),
};

// ── Sanpete County ───────────────────────────────────────────────────────────

export const sanpeteConfig: PdfCountyConfig = {
  county: "sanpete",
  // Sanpete County publishes the delinquent tax listing from the treasurer page.
  // Per research (March 2026): the page says "Delinquent tax listing will be
  // posted on or before December 31, 2026." No PDF is available until then.
  // parsePdfDelinquent() will find no matching link and return [] gracefully.
  treasurerPageUrl: "https://www.sanpetecountyutah.gov/treasurer.html",
  pdfLinkTextPattern: /delinquent.*tax.*list/i,
  lineParser: makeGenericDelinquentLineParser("sanpete"),
};
