import type { ParsedWholesaleDeal } from "@/types";

/**
 * parseDollars — converts "$169K", "$169,000", "$169000" -> 169000
 * Returns null on parse failure.
 */
function parseDollars(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (/k$/i.test(cleaned)) {
    const val = parseFloat(cleaned.slice(0, -1));
    if (isNaN(val)) return null;
    return Math.round(val * 1000);
  }
  const val = parseFloat(cleaned);
  if (isNaN(val)) return null;
  return Math.round(val);
}

/**
 * normalizeAddress — lowercase, remove apt/unit/#, strip punctuation, trim.
 * Used for duplicate detection.
 */
export function normalizeAddress(addr: string): string {
  return addr
    .toLowerCase()
    .replace(/\b(apt|unit|suite|ste|#)\s*[\w-]+/gi, "")
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * parseWholesaleEmail — regex parser for structured wholesaler email blasts.
 * All fields return null on parse failure. Never throws.
 */
export function parseWholesaleEmail(
  text: string,
  _fromEmail?: string,
  _subject?: string
): ParsedWholesaleDeal {
  try {
    const lines = text.split(/\r?\n/);
    const body = text;

    // Address: first non-empty line before "ASKING" or first newline
    let address: string | null = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !/^(asking|arv|sq\s?ft|beds|baths|year|tax|contact)/i.test(trimmed)) {
        address = trimmed.replace(/\s*-?\s*ASKING.*/i, "").trim() || null;
        if (address) break;
      }
    }

    // Asking price: "ASKING $169K" or "ASKING $169,000" or "ASKING PRICE: $169K"
    const askingMatch = body.match(/asking(?:\s+price)?[:\s]+\$?([\d.,]+k?)/i);
    const askingPrice = parseDollars(askingMatch?.[1]);

    // ARV: "ARV: $325K" or "ARV: $325,000"
    const arvMatch = body.match(/arv[:\s]+\$?([\d.,]+k?)/i);
    const arv = parseDollars(arvMatch?.[1]);

    // Sqft: "Sq Ft: 1,328" or "Sqft: 1328" or "SF: 1328"
    const sqftMatch = body.match(/(?:sq\.?\s?ft|sqft|sf)[:\s]+([\d,]+)/i);
    const sqft = sqftMatch
      ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) || null
      : null;

    // Beds: "Beds: 3" or "Bedrooms: 3"
    const bedsMatch = body.match(/bed(?:room)?s?[:\s]+(\d+)/i);
    const beds = bedsMatch ? parseInt(bedsMatch[1], 10) || null : null;

    // Baths: "Baths: 1.5" or "Bathrooms: 2"
    const bathsMatch = body.match(/bath(?:room)?s?[:\s]+([\d.]+)/i);
    const baths = bathsMatch ? parseFloat(bathsMatch[1]) || null : null;

    // Year built: "Year Built: 1972" or "Built: 1972"
    const yearMatch = body.match(/(?:year\s+)?built[:\s]+(\d{4})/i);
    const yearBuilt = yearMatch ? parseInt(yearMatch[1], 10) || null : null;

    // Tax ID: "Tax ID: 09-0234-0015" or "Parcel: 09-0234-0015"
    const taxIdMatch = body.match(/(?:tax\s+id|parcel(?:\s+id)?)[:\s]+([\d-]+)/i);
    const taxId = taxIdMatch?.[1] ?? null;

    // Contact: "Contact Name @ (801) 555-1234" or "Austin Howard (801) 555-1234"
    // Try to extract name and phone from contact line
    const contactLineMatch = body.match(
      /contact[:\s]+([A-Z][a-zA-Z\s]+?)\s*[@|]?\s*\(?(\d{3})\)?[\s.-](\d{3})[\s.-](\d{4})/i
    );
    const contactGenericMatch = body.match(
      /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+\(?(\d{3})\)?[\s.-](\d{3})[\s.-](\d{4})/
    );

    let wholesalerName: string | null = null;
    let wholesalerPhone: string | null = null;

    if (contactLineMatch) {
      wholesalerName = contactLineMatch[1].trim() || null;
      wholesalerPhone = `(${contactLineMatch[2]}) ${contactLineMatch[3]}-${contactLineMatch[4]}`;
    } else if (contactGenericMatch) {
      wholesalerName = contactGenericMatch[1].trim() || null;
      wholesalerPhone = `(${contactGenericMatch[2]}) ${contactGenericMatch[3]}-${contactGenericMatch[4]}`;
    }

    // Wholesaler email: look for email addresses in body (excluding common auto-sender patterns)
    const emailMatch = body.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
    const wholesalerEmail = emailMatch?.[1] ?? _fromEmail ?? null;

    // Confidence: count non-null fields out of total tracked fields
    const fields = [address, askingPrice, arv, sqft, beds, baths, yearBuilt, taxId, wholesalerName];
    const nonNull = fields.filter((f) => f !== null && f !== undefined).length;
    const confidence = nonNull / fields.length;

    return {
      address,
      askingPrice,
      arv,
      sqft,
      beds,
      baths,
      yearBuilt,
      taxId,
      wholesalerName,
      wholesalerPhone,
      wholesalerEmail,
      confidence,
    };
  } catch {
    return {
      address: null,
      askingPrice: null,
      arv: null,
      sqft: null,
      beds: null,
      baths: null,
      yearBuilt: null,
      taxId: null,
      wholesalerName: null,
      wholesalerPhone: null,
      wholesalerEmail: _fromEmail ?? null,
      confidence: 0,
    };
  }
}
