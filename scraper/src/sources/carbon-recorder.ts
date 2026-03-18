import type { RecorderRecord } from "../lib/validation.js";

// Re-export the type for consumers of this module
export type { RecorderRecord } from "../lib/validation.js";

/**
 * Scrapes Carbon County recorder for NOD (Notice of Default) and
 * lis pendens filings.
 *
 * STATUS: PLACEHOLDER -- Carbon County recorder has NO confirmed public
 * online document search portal. Research found:
 *   - Recorder website mentions "access select records online" but provides no URL
 *   - E-recording is "coming soon" (via Simplifile)
 *   - NETR Online has paid document image datastore at datastore.netronline.com/search/8309
 *   - No free grantor/grantee index or instrument-type search found
 *
 * CONTACT: Carbon County Recorder's Office
 *   Phone: 435-636-3265
 *   Email: recorders@carbon.utah.gov
 *
 * This function returns an empty array so the daily scrape orchestrator
 * can call scrapeRecorder() without special-casing. When a portal is
 * confirmed or an alternative data source is identified, this function
 * should be updated to perform actual scraping.
 *
 * TODO: If a portal is found, the scraper WOULD:
 *   1. Navigate to the recorder's document search portal
 *   2. Search for document type "Notice of Default" and "Lis Pendens"
 *   3. Filter by date range (last 90 days for NODs, broader for lis pendens)
 *   4. Extract parcel ID, recording date, document number, and parties
 *   5. Validate with recorderRecordSchema from validation.ts
 *   6. Return RecorderRecord[] shaped for distress_signals table insert
 *
 * TODO: Alternative approaches to investigate:
 *   - NETR Online datastore subscription (datastore.netronline.com/search/8309)
 *   - GRAMA (Government Records Access and Management Act) bulk data request
 *   - Third-party aggregators (HomeInfoMax, PropertyChecker)
 *   - Manual entry via admin UI (Phase 2+)
 *
 * @returns Empty array (placeholder until recorder portal is confirmed)
 */
export async function scrapeRecorder(): Promise<RecorderRecord[]> {
  console.warn(
    "[recorder] Carbon County recorder online portal not confirmed. " +
      "NOD/lis pendens data requires manual entry or alternative data source. " +
      "See: recorders@carbon.utah.gov or 435-636-3265"
  );

  return [];
}
