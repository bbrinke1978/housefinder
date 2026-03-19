import {
  launchBrowser,
  createPage,
} from "../lib/scraper-utils.js";
import {
  delinquentRecordSchema,
  type DelinquentRecord,
} from "../lib/validation.js";
// Lazy import to avoid DOMMatrix error from @napi-rs/canvas at module load time
async function getPDFParse() {
  const mod = await import("pdf-parse");
  return mod.PDFParse;
}

/**
 * Parses Emery County annual delinquent tax PDF.
 *
 * Step 1: Use Playwright to navigate to the treasurer page and dynamically
 *         discover the current year's delinquent PDF link.
 * Step 2: Download the PDF via fetch() and parse with pdf-parse.
 * Step 3: Extract parcel numbers, owner names, and amounts due line-by-line.
 *
 * The PDF URL is discovered dynamically (not hardcoded) so it auto-updates
 * when the county publishes a new year's list.
 *
 * @returns Validated array of DelinquentRecord objects
 */
export async function parseEmeryDelinquentPdf(): Promise<DelinquentRecord[]> {
  const startTime = Date.now();
  const records: DelinquentRecord[] = [];
  let totalParsed = 0;
  let invalidCount = 0;

  // Step 1: Discover the delinquent PDF URL dynamically
  const browser = await launchBrowser();
  let pdfUrl: string | null = null;
  let pageUrl = "https://emery.utah.gov/home/offices/treasurer/";

  try {
    const page = await createPage(browser);

    await page.goto(
      "https://emery.utah.gov/home/offices/treasurer/",
      { waitUntil: "networkidle", timeout: 60000 }
    );

    // Collect all links for diagnostics
    const allLinks = await page.$$("a");
    const linkData: Array<{ text: string; href: string }> = [];
    for (const a of allLinks) {
      const text = (await a.textContent() ?? "").trim();
      const href = (await a.getAttribute("href") ?? "").trim();
      if (text || href) linkData.push({ text, href });
    }

    console.log(`[emery-delinquent-pdf] Found ${linkData.length} links on treasurer page:`);
    for (const entry of linkData.slice(0, 30)) {
      console.log(`[emery-delinquent-pdf]   "${entry.text}" -> ${entry.href}`);
    }

    // Strategy 1: href contains "delinquent" (case-insensitive) and ends in .pdf
    for (const { text, href } of linkData) {
      if (href && /delinquent/i.test(href) && href.toLowerCase().endsWith(".pdf")) {
        pdfUrl = href;
        console.log(`[emery-delinquent-pdf] Matched by href-delinquent+pdf-ext: "${text}" -> ${href}`);
        break;
      }
    }

    // Strategy 2: link text contains "delinquent" and href ends in .pdf
    if (!pdfUrl) {
      for (const { text, href } of linkData) {
        if (text && /delinquent/i.test(text) && href && href.toLowerCase().endsWith(".pdf")) {
          pdfUrl = href;
          console.log(`[emery-delinquent-pdf] Matched by text-delinquent+pdf-ext: "${text}" -> ${href}`);
          break;
        }
      }
    }

    // Strategy 3: link text contains "delinquent", any href (no .pdf extension required)
    if (!pdfUrl) {
      for (const { text, href } of linkData) {
        if (text && /delinquent/i.test(text) && href) {
          pdfUrl = href;
          console.log(`[emery-delinquent-pdf] Matched by text-delinquent (no ext): "${text}" -> ${href}`);
          break;
        }
      }
    }

    pageUrl = page.url(); // capture actual URL for relative URL resolution
  } finally {
    await browser.close();
  }

  if (!pdfUrl) {
    console.log("[emery-delinquent-pdf] No delinquent PDF link found on treasurer page. Check link log above.");
    return [];
  }

  // Resolve relative URLs against the actual page URL
  try {
    const resolved = new URL(pdfUrl, pageUrl);
    pdfUrl = resolved.href;
  } catch {
    // If URL construction fails, try basic resolution
    if (pdfUrl.startsWith("/")) {
      pdfUrl = `https://emery.utah.gov${pdfUrl}`;
    } else if (!pdfUrl.startsWith("http")) {
      pdfUrl = `https://emery.utah.gov/home/offices/treasurer/${pdfUrl}`;
    }
  }

  console.log(`[emery-delinquent-pdf] Found PDF URL: ${pdfUrl}`);

  // Step 2: Download and parse the PDF
  let pdfText: string;
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.log(`[emery-delinquent-pdf] Failed to download PDF: ${response.status} ${response.statusText}`);
      return [];
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const PDFParse = await getPDFParse();
    const parser = new PDFParse({ data: buffer });
    const textResult = await parser.getText();
    pdfText = textResult.text;
    await parser.destroy();
  } catch (err) {
    console.log("[emery-delinquent-pdf] Error downloading/parsing PDF:", err);
    return [];
  }

  // Step 3: Parse line-by-line for parcel, owner, amount
  // Emery County parcel format: XX-XXXX-XXXX or XX-XXX-XXXX
  const parcelRegex = /^(\d{2}-\d{3,4}-\d{4})\s+(.+?)\s+\$?([\d,]+\.?\d*)\s*$/;

  const lines = pdfText.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(parcelRegex);
    if (match) {
      totalParsed++;
      const raw = {
        parcelId: match[1],
        ownerName: match[2].trim(),
        amountDue: match[3].replace(/,/g, ""),
      };

      const result = delinquentRecordSchema.safeParse(raw);
      if (result.success) {
        records.push(result.data);
      } else {
        invalidCount++;
        console.log(
          "[emery-delinquent-pdf] Invalid record skipped:",
          JSON.stringify(raw),
          result.error.issues.map((i) => i.message).join(", ")
        );
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[emery-delinquent-pdf] Complete: ${totalParsed} lines parsed, ${records.length} valid, ${invalidCount} invalid, ${elapsed}s elapsed`
  );

  return records;
}
