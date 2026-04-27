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
 * Each row is mapped to a DelinquentRecord with:
 *   - parcelId: 14-digit numeric (the API may return 13 digits, prefixed with 0)
 *   - ownerName: trimmed
 *   - year: TSL_YEAR_CNT (the delinquency year — single year per row, not multi)
 *   - amountDue: trimmed of whitespace and commas
 *   - propertyAddress: street portion of TAX_SALE_ADDRESS
 *   - propertyCity: parsed from TAX_SALE_ADDRESS (between street and "UT")
 *   - propertyZip: 5-digit zip parsed from TAX_SALE_ADDRESS (drives the SLC
 *     neighborhood retag in upsertProperty -> normalizeCity)
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
 * Parse "615 E 4030 S MURRAY UT 84107-1927-15" into:
 *   { street: "615 E 4030 S", city: "MURRAY", zip: "84107" }
 *
 * Tolerates multi-word cities (WEST VALLEY CITY, SALT LAKE CITY) by greedily
 * matching everything between the last numeric segment of the street and "UT".
 *
 * Returns nulls if parse fails.
 */
function parseTaxSaleAddress(raw: string | undefined): {
  street: string | null;
  city: string | null;
  zip: string | null;
} {
  if (!raw) return { street: null, city: null, zip: null };
  const cleaned = raw.trim();

  // Match: <street> <CITY (1-4 words)> UT <5-digit-zip><optional suffix>
  const m = cleaned.match(/^(.+?)\s+([A-Z][A-Z\s]+?)\s+UT\s+(\d{5})\b/i);
  if (!m) return { street: null, city: null, zip: null };

  return {
    street: m[1].trim(),
    city: m[2].trim().replace(/\s+/g, " "),
    zip: m[3],
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

    const { street, city, zip } = parseTaxSaleAddress(row.TAX_SALE_ADDRESS);

    const candidate = {
      parcelId,
      county: "salt lake",
      ownerName: ownerName || undefined,
      year: /^\d{4}$/.test(year) ? year : undefined,
      amountDue: amountDue || undefined,
      propertyAddress: street ?? undefined,
      propertyCity: city ?? undefined,
      propertyZip: zip ?? undefined,
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
