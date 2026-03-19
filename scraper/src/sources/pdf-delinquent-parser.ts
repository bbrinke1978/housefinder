import {
  launchBrowser,
  createPage,
} from "../lib/scraper-utils.js";
import {
  delinquentRecordSchema,
  type DelinquentRecord,
} from "../lib/validation.js";
import { PDFParse } from "pdf-parse";

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

    // Find all <a> elements and filter by text pattern + .pdf href
    const allLinks = await page.$$("a");
    for (const a of allLinks) {
      const text = await a.textContent();
      const href = await a.getAttribute("href");
      if (
        text &&
        config.pdfLinkTextPattern.test(text) &&
        href &&
        href.toLowerCase().endsWith(".pdf")
      ) {
        pdfUrl = href;
        break;
      }
    }

    // Fallback: match by text pattern alone (PDF might not have .pdf extension in href)
    if (!pdfUrl) {
      for (const a of allLinks) {
        const text = await a.textContent();
        if (text && config.pdfLinkTextPattern.test(text)) {
          pdfUrl = await a.getAttribute("href");
          if (pdfUrl) break;
        }
      }
    }

    pageUrl = page.url(); // capture actual URL for relative resolution
  } finally {
    await browser.close();
  }

  if (!pdfUrl) {
    console.log(`${tag} No PDF link found on treasurer page`);
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
  treasurerPageUrl:
    "https://www.sevier.utah.gov/departments/county_officials/treasurer/current_year_delinquent_tax_report.php",
  pdfLinkTextPattern: /delinquent.*tax/i,
  lineParser: makeGenericDelinquentLineParser("sevier"),
};

export const juabConfig: PdfCountyConfig = {
  county: "juab",
  treasurerPageUrl: "https://juabcounty.gov/",
  pdfLinkTextPattern: /delinquent/i,
  lineParser: makeGenericDelinquentLineParser("juab"),
};

export const millardConfig: PdfCountyConfig = {
  county: "millard",
  treasurerPageUrl: "https://millardcounty.gov/",
  // Match both correct "delinquent" and typo "deliquent" found in research
  pdfLinkTextPattern: /deli[nq]*uent/i,
  lineParser: makeGenericDelinquentLineParser("millard"),
};

export const sanpeteConfig: PdfCountyConfig = {
  county: "sanpete",
  treasurerPageUrl: "https://sanpetecountyutah.gov/",
  pdfLinkTextPattern: /delinquent/i,
  lineParser: makeGenericDelinquentLineParser("sanpete"),
};
