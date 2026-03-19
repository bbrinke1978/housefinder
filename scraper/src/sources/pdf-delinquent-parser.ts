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
      waitUntil: "networkidle",
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

    // Strategy 1: link text matches pattern AND href ends in .pdf
    for (const { text, href } of linkData) {
      if (
        text &&
        config.pdfLinkTextPattern.test(text) &&
        href &&
        href.toLowerCase().endsWith(".pdf")
      ) {
        pdfUrl = href;
        console.log(`${tag} Matched by text+pdf-ext: "${text}" -> ${href}`);
        break;
      }
    }

    // Strategy 2: href itself contains the pattern and ends in .pdf (no text match needed)
    if (!pdfUrl) {
      for (const { text, href } of linkData) {
        if (href && config.pdfLinkTextPattern.test(href) && href.toLowerCase().endsWith(".pdf")) {
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

// ── Per-county configurations ───────────────────────────────────────────────

export const sevierConfig: PdfCountyConfig = {
  county: "sevier",
  // Sevier County publishes the delinquent tax report on a dedicated PHP page.
  // The PDF link appears on this page after December each year.
  treasurerPageUrl:
    "https://www.sevier.utah.gov/departments/county_officials/treasurer/current_year_delinquent_tax_report.php",
  pdfLinkTextPattern: /delinquent.*tax/i,
  lineParser: makeGenericDelinquentLineParser("sevier"),
};

export const juabConfig: PdfCountyConfig = {
  county: "juab",
  // Juab County posts the annual delinquent tax list PDF on the tax-sale page.
  // Previously used the homepage (juabcounty.gov/) which has no PDF links.
  treasurerPageUrl: "https://juabcounty.gov/residents/tax-sale/",
  pdfLinkTextPattern: /delinquent/i,
  lineParser: makeGenericDelinquentLineParser("juab"),
};

export const millardConfig: PdfCountyConfig = {
  county: "millard",
  // Millard County keeps the delinquent tax listing on a specific treasurer sub-page.
  // Previously used the homepage (millardcounty.gov/) which has no PDF links.
  // Note: Millard PDFs use filename "Deliquent" (missing n) — pdfLinkTextPattern handles both spellings.
  treasurerPageUrl:
    "https://millardcounty.gov/your-government/elected-officials/treasurer/delinquent-tax-listing/",
  // Match both correct "delinquent" and typo "deliquent" found in research
  pdfLinkTextPattern: /deli[nq]*uent/i,
  lineParser: makeGenericDelinquentLineParser("millard"),
};

export const sanpeteConfig: PdfCountyConfig = {
  county: "sanpete",
  // Sanpete County links the delinquent PDF from the treasurer page, not the homepage.
  // Previously used the homepage (sanpetecountyutah.gov/) which has no PDF links.
  treasurerPageUrl: "https://www.sanpetecountyutah.gov/treasurer.html",
  pdfLinkTextPattern: /delinquent/i,
  lineParser: makeGenericDelinquentLineParser("sanpete"),
};
