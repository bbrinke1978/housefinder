/**
 * Salt Lake County tax-delinquent properties scraper.
 *
 * Pulls from the SLCo Auditor's TaxMQ JSON endpoint at
 *   https://apps.saltlakecounty.gov/Services/Treasurer/TaxMQ/api/TaxDue/GetTaxSale
 * which backs the public-facing /auditor/tax-sale/ page. The endpoint returns
 * the annually-published tax-sale list (typically loaded a few days before
 * the May tax sale and remains available year-round per the Auditor's portal).
 *
 * No HTML scraping or Playwright needed — this is a clean JSON API.
 *
 * IMPORTANT — TAX_SALE_ADDRESS is the OWNER MAILING ADDRESS, not the property
 * situs. Live data inspection (2026-04-27) showed PO Boxes, out-of-state
 * mailing addresses (Michigan, Texas, Florida), and out-of-county Utah
 * addresses (Lehi, Ogden, Park City). The API exposes no separate situs
 * field. Property situs comes later from UGRC enrichment by parcel_id.
 *
 * Each row is mapped to a DelinquentRecord with:
 *   - parcelId: 14-digit numeric (the API may return 13 digits, prefixed with 0)
 *   - ownerName: trimmed
 *   - year: TSL_YEAR_CNT (the delinquency year — single year per row, not multi)
 *   - amountDue: trimmed of whitespace and commas
 *   - mailingAddress / mailingCity / mailingState / mailingZip: parsed from
 *     TAX_SALE_ADDRESS (this is the owner mailing address)
 *   - rawAddress: the raw TAX_SALE_ADDRESS string preserved for traceability
 *
 * propertyAddress / propertyCity / propertyZip are LEFT EMPTY — the upsert
 * layer treats those as "no situs known yet" and UGRC fills them in later.
 *
 * Each record produces a `tax_lien` distress signal via upsertFromDelinquent.
 *
 * The parcel ID matches the same canonical SLC format used by Phase 25.5
 * (no hyphens, normalized via normalizeParcelIdForAllowlist), so signals
 * stack with NOD signals from utah-legals.ts on the same property.
 */

import { delinquentRecordSchema, type DelinquentRecord } from "../lib/validation.js";

const TAX_SALE_ENDPOINT =
  "https://apps.saltlakecounty.gov/Services/Treasurer/TaxMQ/api/TaxDue/GetTaxSale";

interface TaxSaleApiRow {
  TSL_ADNO: number;
  TSL_PARCEL_NUMBER: number | string;
  TSL_PS_NUMBER: number | string;
  TSL_OWNER_NAME: string;
  TSL_YEAR_CNT: number | string;
  TSL_SALE_CATEGORY?: string;
  TSL_BALANCE: string;
  TSL_PROP_TYPE?: string;
  TSL_LOAD_TIMESTAMP?: string;
  TAX_SALE_ADDRESS?: string;
}

interface TaxSaleApiResponse {
  Result: TaxSaleApiRow[];
}

/**
 * Pad parcel number to 14 digits (the SLCo Auditor API returns numeric
 * parcel IDs that lose leading zeros). Mirrors the JS in au-TaxSaleList.js.
 */
function normalizeParcel(raw: number | string): string {
  const s = String(raw).trim();
  if (s.length === 13) return "0" + s;
  return s;
}

/**
 * Parse a TAX_SALE_ADDRESS string (the OWNER MAILING ADDRESS) into components.
 *
 * Examples of inputs we must handle:
 *   "615 E 4030 S MURRAY UT 84107-1927-15"     → street + city + UT + zip
 *   "5289 W WOODASH CIR WEST VALLEY UT 84120-5628-89" → multi-word city, no internal grid digits
 *   "PO BOX 1099 RIVERTON UT 84065-1099"       → PO Box mailing
 *   "11898 S WEST BAY SHORE DR TRAVERSE CITY MI 49684-5257" → out-of-state
 *   "PO BOX 13464 OGDEN UT 84412-3464"         → out-of-county Utah
 *
 * Strategy: anchor on the trailing "<STATE> <ZIP>" pattern, then walk
 * backwards through the preceding tokens to extract the city as the trailing
 * letters-only run. Everything before that is the street.
 *
 * The previous regex `^(.+?)\s+([A-Z][A-Z\s]+?)\s+UT\s+(\d{5})\b` collapsed
 * on named-street addresses (no internal digits to anchor the street boundary)
 * because the city group `[A-Z\s]+?` was free to absorb the entire street.
 *
 * Returns nulls when parsing fails (the row is skipped).
 */
function parseTaxSaleAddress(raw: string | undefined): {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  if (!raw) return { street: null, city: null, state: null, zip: null };
  const cleaned = raw.trim();

  // 1. Anchor on trailing "<STATE> <ZIP>". Accept any 2-letter state code,
  //    optionally followed by ZIP+4 and an arbitrary trailing suffix that the
  //    SLCo data sometimes appends (e.g. -1927-15, -5628-89, -3464).
  const tail = cleaned.match(/^(.+?)\s+([A-Z]{2})\s+(\d{5})(?:[-\s].*)?$/i);
  if (!tail) return { street: null, city: null, state: null, zip: null };

  const beforeState = tail[1].trim();
  const state = tail[2].toUpperCase();
  const zip = tail[3];

  // 2. Walk backwards from the end of `beforeState`, accumulating tokens that
  //    are pure letters into the city group. Stop at the first token that
  //    contains a digit — that token is part of the street.
  const tokens = beforeState.split(/\s+/);
  const cityTokens: string[] = [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (/^[A-Za-z][A-Za-z'.-]*$/.test(t)) {
      cityTokens.unshift(t);
    } else {
      break;
    }
  }
  if (cityTokens.length === 0) {
    return { street: null, city: null, state: null, zip: null };
  }
  const street = tokens.slice(0, tokens.length - cityTokens.length).join(" ").trim();
  if (!street) {
    // Whole input was letters — e.g. "RIVERTON UT 84065" with no preceding
    // street. Unusual but possible (PO-box-only owner with bad data). Treat
    // as parse failure rather than silently storing an empty street.
    return { street: null, city: null, state: null, zip: null };
  }

  return {
    street,
    city: cityTokens.join(" "),
    state,
    zip,
  };
}

export async function scrapeSlcoTaxDelinquent(): Promise<DelinquentRecord[]> {
  console.log("[slco-tax-delinquent] Fetching SLCo Auditor tax-sale list...");
  const startTime = Date.now();

  const res = await fetch(TAX_SALE_ENDPOINT, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(
      `SLCo TaxMQ endpoint returned HTTP ${res.status}: ${res.statusText}`
    );
  }

  const data = (await res.json()) as TaxSaleApiResponse;
  const rows = data.Result ?? [];
  console.log(`[slco-tax-delinquent] Endpoint returned ${rows.length} rows`);

  const records: DelinquentRecord[] = [];
  let skippedTotalsRow = 0;
  let invalidCount = 0;

  for (const row of rows) {
    // Filter out the "totals" summary rows (TSL_PARCEL_NUMBER == 0)
    if (
      row.TSL_PARCEL_NUMBER === 0 ||
      row.TSL_PARCEL_NUMBER === "0" ||
      String(row.TSL_PARCEL_NUMBER).trim() === ""
    ) {
      skippedTotalsRow++;
      continue;
    }

    const parcelId = normalizeParcel(row.TSL_PARCEL_NUMBER);
    const ownerName = (row.TSL_OWNER_NAME ?? "").trim();
    const year = String(row.TSL_YEAR_CNT ?? "").trim();
    const amountDue = (row.TSL_BALANCE ?? "")
      .replace(/[\s,$]/g, "")
      .trim();

    const { street, city, state, zip } = parseTaxSaleAddress(row.TAX_SALE_ADDRESS);
    const rawAddress = (row.TAX_SALE_ADDRESS ?? "").trim() || undefined;

    // The parsed address is the OWNER MAILING address. Property situs is
    // not available from the TaxMQ API and will be filled in later by UGRC
    // enrichment via parcel_id. Leave property* fields undefined so the
    // upsert layer's "don't blank good data" guard preserves any existing
    // situs (e.g. from a prior UGRC run).
    const candidate = {
      parcelId,
      county: "salt lake",
      ownerName: ownerName || undefined,
      year: /^\d{4}$/.test(year) ? year : undefined,
      amountDue: amountDue || undefined,
      mailingAddress: street ?? undefined,
      mailingCity: city ?? undefined,
      mailingState: state ?? undefined,
      mailingZip: zip ?? undefined,
      rawAddress,
    };

    const result = delinquentRecordSchema.safeParse(candidate);
    if (result.success) {
      records.push(result.data);
    } else {
      invalidCount++;
      if (invalidCount <= 5) {
        console.log(
          "[slco-tax-delinquent] Invalid record skipped:",
          JSON.stringify(candidate),
          result.error.issues.map((i) => i.message).join(", ")
        );
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[slco-tax-delinquent] Complete: ${rows.length} raw rows, ${records.length} valid records, ${skippedTotalsRow} totals-rows skipped, ${invalidCount} invalid, ${elapsed}s elapsed`
  );

  return records;
}
