# Phase 4: County Expansion - Research

**Researched:** 2026-03-18
**Domain:** Utah county property records portals, Utah XChange court system, multi-county scraper architecture
**Confidence:** MEDIUM (county portal findings verified by direct inspection; XChange terms verified from official subscription agreement; city demographics from census/population data; code violation availability LOW - no rural Utah city has online database)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**City Selection Criteria:**
- Target ~10 cities similar to Price, UT: population 5,000-15,000, rural character (not SLC/Provo suburbs), low investor competition
- Within ~2.5 hours of SLC — if not enough listings, expand later
- Can include cities in Carbon County (same county as Price is OK)
- Research should identify the specific cities — user will approve the list
- Only include cities whose county has online property records — skip counties with no online data

**Scraper Approach:**
- Each county scraper runs independently (own try/catch — one failure doesn't stop others)
- Stagger county scrapes across the morning (5:00, 5:15, 5:30...) — less load, less likely to get blocked
- Skip counties that have no online property records — don't waste effort on manual-only counties
- Each county may need a custom scraper (different HTML structure per portal)

**Probate Detection:**
- Pay for Utah XChange court system subscription (~$30-40/year) — one subscription covers all Utah courts
- Automate probate lead detection: scrape estate/probate filings, match to property addresses
- Probate becomes a new distress signal type feeding into the existing scoring engine

**Vacant/Neglected Detection:**
- Claude's discretion on which cities have online code violation data — best effort, skip where unavailable
- Manual "vacant" signal: user can flag a property as vacant from the property detail page
- Both automated (where available) + manual flagging for field observations
- Vacant/code_violation as new distress signal types in the scoring engine

### Claude's Discretion
- Which specific ~10 cities to recommend (within criteria above)
- Which county portals are scrapeable vs not
- Vacant data source assessment per city
- Exact stagger timing between county scrapes
- How to handle XChange court data parsing (probate filing → property address matching)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-04 | System expands scraping to ~10 similar small Utah towns/counties | City selection table + portal type assessment per county; Emery/Sevier use same wpDataTables pattern as Carbon; Juab/Millard use Tyler EagleWeb with required search input |
| DATA-05 | System detects probate/estate filings from Utah court records and matches to property addresses | XChange subscription required ($25 setup + $40/month); automated scraping explicitly prohibited by subscription agreement; manual session-based Playwright approach is the only viable path; case types ES, CO, GT, TR are the target probate codes |
| DATA-06 | System detects vacant/neglected properties from code violation records and utility shutoff data where available | No rural Utah city has a public online code violation database; vacant signal must be manual-only flagging via property detail UI; code_violation and vacant signal types already defined in schema |

</phase_requirements>

---

## Summary

Phase 4 expands HouseFinder from Carbon County (Price, UT) to approximately 10 similar small Utah cities. The research identified that these cities cluster into 4-5 counties, each with a distinct portal type, requiring 2-3 unique scraper implementations rather than 10. The most important finding is a split between counties using the same wpDataTables WordPress pattern as Carbon County (Emery) versus counties using Tyler Technologies EagleWeb (Juab, Millard, Sevier) or PDF-only delinquent lists. The Tyler EagleWeb portals require a specific parcel number, owner name, or address — they cannot be bulk-browsed — so delinquent data from those counties will come from annual PDF downloads rather than live scrapes.

For probate detection (DATA-05), the Utah XChange subscription agreement explicitly prohibits automated access: "Subscriber will not use any robot, spider, scraper or other automated means to access XChange for any purpose." This is a critical constraint. The correct architecture is authenticated manual Playwright sessions where the user (not an automated bot) initiates searches, or alternatively, treating XChange as manual-entry-only and flagging it as a low-frequency task the user does monthly. The $25 setup + $40/month subscription cost confirmed, not the $30-40/year initially estimated.

For vacant/code violation detection (DATA-06), no rural Utah city or county in the target list has a publicly accessible online code violation database. This signal type must be manual-only: a flag the user sets on the property detail page after a drive-by. The `code_violation` and `vacant` signal types are already defined in the schema and scoring engine, so only the UI flag needs to be built.

**Primary recommendation:** Build scrapers for Emery (wpDataTables clone of Carbon pattern), Sevier, Juab, and Millard (PDF delinquent parsers). Probate: subscribe to XChange but implement as human-assisted monthly workflow, not automated scraping. Vacant: manual flag UI only.

---

## Recommended City List (for User Approval)

Research identified the following ~10 cities matching Price's demographics within 2.5 hours of SLC:

| City | County | Pop (2024) | Drive from SLC | Portal Type | Include? |
|------|--------|------------|----------------|-------------|----------|
| Price | Carbon | ~8,300 | ~2h 00m | wpDataTables (already built) | YES - already live |
| Huntington | Emery | ~1,944 | ~2h 10m | wpDataTables (same as Carbon) | YES - below pop threshold but Emery County total = 9,825 |
| Castle Dale | Emery | ~1,510 | ~2h 15m | Same Emery scraper | YES - same county as Huntington |
| Richfield | Sevier | ~8,518 | ~2h 25m | PDF delinquent + Tyler recorder | YES |
| Nephi | Juab | ~7,122 | ~1h 20m | Tyler EagleWeb (no bulk browse) | YES |
| Ephraim | Sanpete | ~6,514 | ~1h 55m | Tyler recorder portal | YES |
| Manti | Sanpete | ~3,677 | ~2h 00m | Same Sanpete scraper | YES - same county |
| Fillmore | Millard | ~2,633 | ~1h 50m | PDF delinquent + Tyler recorder | MARGINAL - small, include for county coverage |
| Delta | Millard | ~3,751 | ~2h 00m | Same Millard scraper | YES - same county as Fillmore |
| Vernal | Uintah | ~10,254 | ~2h 55m | Oracle APEX custom portal | BORDERLINE - 2:55 drive; distinct scraper needed |

**Note on Emery County:** Individual Emery city populations are below 5,000, but the county total (~9,825) and rural mining character match Price closely. The Emery County wpDataTables portal covers the whole county. Include for scraper efficiency.

**Note on Vernal:** Drive time is ~2h 55m, just outside the 2.5-hour guideline. The Uintah County system (Oracle APEX custom portal at apps.uintah.utah.gov) requires specific search criteria and cannot be bulk-browsed. Flag for user decision.

**Recommended 10 cities to cover with 4 scraper implementations:**
1. Huntington + Castle Dale (Emery County) — 1 wpDataTables scraper
2. Richfield (Sevier County) — 1 PDF parser + Tyler recorder
3. Nephi (Juab County) — 1 Tyler EagleWeb scraper (requires search input)
4. Ephraim + Manti (Sanpete County) — 1 Tyler recorder scraper
5. Fillmore + Delta (Millard County) — 1 PDF parser + Tyler recorder
6. Optional: Vernal (Uintah County) — separate Oracle APEX scraper (user decides on drive time)

---

## County Portal Assessment

### Tier 1: wpDataTables (Same Pattern as Carbon County)

| County | Cities | Portal URL | Data Available | Confidence |
|--------|--------|-----------|----------------|------------|
| Emery | Huntington, Castle Dale, Ferron | https://emery.utah.gov/home/offices/treasurer/tax-roll/ | Tax roll (all parcels), owner name, parcel number, address, city | HIGH — verified wpDataTables, same CSS class `.wpDataTable`, paginated |
| Carbon | Price | Already built | Already scraped | HIGH |

**Emery delinquent list:** Annual PDF at `https://emery.utah.gov/wp-content/uploads/2024/12/Delinquent-Tax-Listing-2024.pdf`. URL pattern is predictable by year. Parse PDF annually, not daily.

### Tier 2: PDF-Only Delinquent Lists (Annual Parse Strategy)

| County | Cities | Delinquent URL Pattern | Format | Confidence |
|--------|--------|----------------------|--------|------------|
| Sevier | Richfield, Monroe, Salina | `sevier.utah.gov/Treasurer/[year]%20Delinquent%20Tax%20List...pdf` | PDF, annual December | MEDIUM — verified PDF only |
| Juab | Nephi | `juabcounty.gov/wp-content/uploads/[year]/12/[year]_Delinquent_Tax_List.pdf` | PDF, annual December | MEDIUM — inferred from URL pattern |
| Millard | Fillmore, Delta | `millardcounty.gov/wp-content/uploads/[year]/12/[year]-Deliquent-List.pdf` | PDF, annual December | MEDIUM — URL pattern verified |
| Sanpete | Ephraim, Manti, Gunnison | Listed on treasurer page as searchable via self-service | Tyler portal, annual | LOW — not directly verified as PDF |

**Strategy for PDF counties:** Use `pdf-parse` library to extract text from annual delinquent PDFs. Parse once per year (December/January), seed as `tax_lien` signals. Do not poll daily — these PDFs update once a year.

### Tier 3: Tyler Technologies EagleWeb (Search-Required)

| County | Portal URL | Limitation | Confidence |
|--------|-----------|-----------|------------|
| Juab | https://juabcountyut-recorder.tylerhost.net/recorder/web/ | Requires specific input (name, parcel, address) — cannot bulk-browse | HIGH — verified Tyler copyright footer |
| Millard | Via millardcounty.gov treasurer link | Same Tyler hosted system | HIGH |
| Sanpete | https://selfservice.sanpetecountyutah.gov/web/ | Requires login; search criteria required | HIGH — verified Tyler copyright |

**Tyler EagleWeb limitation:** These portals cannot be iterated to download all properties. They require a known parcel number, owner name, or address. Use these portals for targeted lookups of specific leads found via PDF delinquent list. Do NOT attempt bulk property enumeration.

### Tier 4: Custom Portals (Special Handling Needed)

| County | City | Portal | Type | Strategy |
|--------|------|--------|------|----------|
| Grand | Moab | http://tax.grandcountyutah.net | Custom tax search (parcel, owner, address) | Search-required only; Moab excluded — 4h drive |
| Uintah | Vernal | https://apps.uintah.utah.gov/ords/ucdev/r/public-searches/property-search | Oracle APEX (requires 4+ char input) | Cannot bulk-browse; PDF delinquent at Uintah site |

### Excluded Counties (No Scrapeable Online Records)

| County | Reason | Alternative |
|--------|--------|-------------|
| Wayne | No online portal found | GRAMA request only |
| Piute | No online portal found | GRAMA request only |
| San Juan | Only delinquent taxes PDF (sparse data) | Skip for now |
| Garfield | No online portal found | GRAMA request only |

---

## Standard Stack

### Core (No New Dependencies Needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| playwright | Already installed | Browser automation for wpDataTables scraping | Already in use for Carbon County; same pattern works for Emery |
| pdf-parse | ~1.1.1 | Parse annual delinquent PDF lists from Sevier/Juab/Millard | Best-maintained PDF text extractor for Node.js |
| drizzle-orm | Already installed | Database upserts | Already in use |
| @azure/functions | Already installed | Timer triggers for staggered scrapes | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pdf-parse | ~1.1.1 | Extract text from annual delinquent PDF lists | Counties where delinquent data is PDF-only (Sevier, Juab, Millard) |
| node-fetch | Built-in (Node 18+) | Download PDF files from county URLs | Use native `fetch` — no extra dependency |

**Installation:**
```bash
npm install pdf-parse
npm install --save-dev @types/pdf-parse
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pdf-parse | pdfjs-dist | pdfjs-dist is heavier and browser-oriented; pdf-parse is Node-native and simpler |
| pdf-parse | Tesseract OCR | Only needed if PDFs are scanned images; Utah county PDFs are digital text |
| Staggered Azure Functions | Single function with sequential scraping | Single function risks timeout; staggered is the established pattern |

---

## Architecture Patterns

### Recommended Project Structure (New Files)
```
scraper/src/sources/
├── carbon-assessor.ts          # Already exists
├── carbon-delinquent.ts        # Already exists
├── carbon-recorder.ts          # Already exists
├── emery-tax-roll.ts           # NEW: wpDataTables, same pattern as carbon-assessor
├── emery-delinquent-pdf.ts     # NEW: Annual PDF parser for Emery delinquent list
├── sevier-delinquent-pdf.ts    # NEW: Annual PDF parser for Sevier delinquent list
├── juab-delinquent-pdf.ts      # NEW: Annual PDF parser for Juab delinquent list
├── millard-delinquent-pdf.ts   # NEW: Annual PDF parser for Millard delinquent list
└── sanpete-delinquent-pdf.ts   # NEW: Annual PDF parser for Sanpete delinquent list

scraper/src/functions/
├── dailyScrape.ts              # Extend with Emery county calls
├── emery-scrape.ts             # NEW: Dedicated Azure Function timer @ 5:15 AM
├── sevier-scrape.ts            # NEW: Dedicated Azure Function timer @ 5:30 AM
├── juab-scrape.ts              # NEW: Dedicated Azure Function timer @ 5:45 AM
├── millard-scrape.ts           # NEW: Dedicated Azure Function timer @ 6:00 AM
├── sanpete-scrape.ts           # NEW: Dedicated Azure Function timer @ 6:15 AM
└── probate-check.ts            # NEW: Monthly manual-assist probate lookup
```

### Pattern 1: wpDataTables Scraper Reuse (Emery County)
**What:** Emery County's tax roll page (emery.utah.gov/home/offices/treasurer/tax-roll/) uses identical wpDataTables WordPress plugin as Carbon County. The `.wpDataTable` CSS class, `parseHeaderMap()`, and pagination pattern work without modification.
**When to use:** Any county portal running WordPress with wpDataTables
**Example:**
```typescript
// Source: emery.utah.gov/home/offices/treasurer/tax-roll/ (verified wpDataTables)
// Pattern identical to scraper/src/sources/carbon-assessor.ts
export async function scrapeEmeryTaxRoll(): Promise<PropertyRecord[]> {
  const browser = await launchBrowser();
  try {
    const page = await createPage(browser);
    await page.goto(
      "https://emery.utah.gov/home/offices/treasurer/tax-roll/",
      { waitUntil: "networkidle", timeout: 60000 }
    );
    await page.waitForSelector(".wpDataTable tbody tr", { timeout: 30000 });
    const headerMap = await parseHeaderMap(page);
    // ... rest identical to carbon-assessor.ts pattern
  } finally {
    await browser.close();
  }
}
```

### Pattern 2: Annual PDF Delinquent Parser
**What:** Counties publish annual delinquent tax lists as PDF files in December. Parse once per year to seed `tax_lien` signals. URL patterns follow predictable year-based naming.
**When to use:** Sevier, Juab, Millard, Sanpete delinquent lists
**Example:**
```typescript
// Source: Pattern inferred from Sevier/Juab/Millard verified PDF URLs
import pdfParse from "pdf-parse";

export async function parseSevierDelinquentPdf(year: number): Promise<DelinquentRecord[]> {
  const url = `https://www.sevier.utah.gov/Treasurer/${year}%20Delinquent%20Tax%20List%20as%20of%2012%2013%20${year}.pdf`;
  const response = await fetch(url);
  if (!response.ok) {
    console.log(`[sevier-delinquent] PDF not available for ${year}: ${response.status}`);
    return [];
  }
  const buffer = await response.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));
  // Parse data.text — line-by-line tab/space-separated parcel data
  return parseDelinquentLines(data.text, "sevier");
}
```

### Pattern 3: Staggered Azure Function Timer Triggers
**What:** Each county gets its own Azure Function with a timer trigger staggered 15 minutes apart. Uses NCRONTAB (6-field: second minute hour day month weekday).
**When to use:** All new county scrapes
**Example:**
```typescript
// Source: Microsoft Learn - Timer trigger for Azure Functions
// Emery: 5:15 AM MT, Sevier: 5:30 AM, Juab: 5:45 AM, Millard: 6:00 AM, Sanpete: 6:15 AM
app.timer("emery-scrape", {
  schedule: "0 15 5 * * *",  // 5:15 AM
  runOnStartup: false,         // NEVER true in production
  handler: emeryScrapeHandler,
});

app.timer("sevier-scrape", {
  schedule: "0 30 5 * * *",  // 5:30 AM
  runOnStartup: false,
  handler: sevierScrapeHandler,
});
```

### Pattern 4: scraperHealth Multi-County Registration
**What:** The existing `updateScrapeHealth()` function accepts `county` and `source` parameters. The `scraperHealth` table has `county` as UNIQUE. Each new county registers its own health row. Source is logged but not stored as a separate row (by design — health is county-level).
**When to use:** Every new county scraper
**Example:**
```typescript
// Source: scraper/src/lib/health.ts (existing pattern)
await updateScrapeHealth({
  county: "emery",      // New county name — creates new health row
  source: "tax-roll",   // Logged only, not stored separately
  resultCount: records.length,
  success: true,
});
await checkHealthAlert("emery");
```

### Pattern 5: XChange Probate — Manual-Assist Monthly Workflow
**What:** Utah XChange subscription agreement explicitly prohibits automated scraping ("no robot, spider, scraper or other automated means"). Implement as a manual-assist task: user logs into XChange, searches for recent probate filings by county (case types ES, CO, GT, TR), and records matching leads manually via the app's property detail page. Build UI support for manual probate signal entry, not an automated scraper.
**When to use:** Probate signal entry (DATA-05)

### Anti-Patterns to Avoid
- **Automated XChange scraping:** The subscription agreement explicitly prohibits it. Implementing a Playwright bot to log in and scrape XChange would violate the agreement and risk account termination plus potential CFAA exposure. Do not build this.
- **Bulk-browsing Tyler EagleWeb portals:** These require specific search input (4+ characters minimum). Do not attempt to enumerate all parcels by iterating through alphabet letters — this pattern will likely trigger rate limiting and produces unreliable results.
- **Daily PDF polls:** Annual delinquent PDFs update once per year (typically December). Polling daily wastes compute and returns 304/unchanged responses. Schedule PDF parses to run once in January each year (or manually triggered).
- **Hardcoding PDF URL with date in filename:** Sevier County's PDF filename includes the exact date it was published (`Delinquent Tax List as of 12 13 24.pdf`). The exact date varies year to year. Build URL discovery that checks the treasurer page for the current year's link rather than hardcoding the date.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom regex parser on raw bytes | `pdf-parse` npm library | PDF text encoding has dozens of edge cases; pdf-parse handles character encoding, multi-column layouts, and whitespace normalization |
| Dynamic PDF URL discovery | Hardcode the exact filename | Playwright to scrape the treasurer page for the PDF link, then download | Sevier County's PDF filename contains the publication date which varies year to year |
| Probate automation | Playwright bot to log into XChange | Manual monthly workflow + UI form | XChange ToS explicitly prohibits automated access |
| Property address matching for probate | Custom fuzzy match | Normalize both sides to uppercase, strip punctuation, compare parcel number if available | Simple normalization is sufficient; full fuzzy matching is overkill |

**Key insight:** The hardest problem in this phase is not the scraping technology — it's understanding which portals can be scraped at all and at what frequency. The constraint is the data source, not the code.

---

## Common Pitfalls

### Pitfall 1: Emery County Tax Roll vs Delinquent List — Different Sources, Different Frequency
**What goes wrong:** The Emery County tax roll page (wpDataTables) contains ALL parcels with owner names and addresses — updated regularly. The Emery delinquent list is a separate annual PDF listing only delinquent parcels. Building only the PDF parser misses the full property dataset; building only the tax roll scraper misses the delinquent signal tagging.
**Why it happens:** Conflating "tax roll" (all properties) with "delinquent list" (subset of properties with unpaid taxes).
**How to avoid:** Build both: (1) `emery-tax-roll.ts` scraper runs daily via wpDataTables for property/owner data; (2) `emery-delinquent-pdf.ts` runs annually (January) for delinquent tax signals.
**Warning signs:** Properties from Emery showing no owner name, or delinquent signals never appearing for Emery properties.

### Pitfall 2: PDF Delinquent Lists Are Annual — Do Not Daily-Poll
**What goes wrong:** Scheduling PDF download as a daily task. The files update once per year (December). Daily polling returns the same file, wastes bandwidth, and may look like abuse to the county web server.
**Why it happens:** Copy-pasting the daily scrape timer pattern without considering data freshness characteristics.
**How to avoid:** Set PDF parsers to `schedule: "0 0 8 1 1 *"` (8 AM on January 1) or make them manually triggerable. Add a comment explaining why they are annual.
**Warning signs:** Logs showing same PDF downloaded 365 times with identical record counts.

### Pitfall 3: Tyler EagleWeb Portals Cannot be Bulk-Browsed for Delinquent Records
**What goes wrong:** Attempting to use Juab/Millard/Sanpete Tyler portals as a source for daily delinquent scraping. These require a known parcel number, owner name, or 4+ characters minimum — no wildcard or browse-all capability.
**Why it happens:** Assuming all county portals work like Carbon County's wpDataTables which supports browse-all.
**How to avoid:** Use Tyler portals only for targeted single-property lookups (verifying a specific lead). Get delinquent data from annual PDFs. Get property/owner data from UGRC GIS parcel downloads (see Open Questions).
**Warning signs:** Playwright scraper returning empty results or being blocked after alphabet-iteration attempts.

### Pitfall 4: XChange Probate Automation Violates Subscription Agreement
**What goes wrong:** Building a Playwright bot that logs into XChange using subscription credentials and automatically searches for probate filings.
**Why it happens:** The user asked to "automate probate lead detection" — this is the natural implementation.
**How to avoid:** The XChange subscription agreement explicitly states: "Subscriber will not use any robot, spider, scraper or other automated means to access XChange for any purpose." Implement as a documented monthly manual workflow with a UI form for entering probate leads found during the session.
**Warning signs:** Any code that calls `page.goto("https://xchange.utcourts.gov/...")` with credentials.

### Pitfall 5: scraperHealth Schema Has `county` as UNIQUE — New Counties Need New Rows, Not Schema Changes
**What goes wrong:** Assuming the scraperHealth table needs a migration to add new county columns or a composite key.
**Why it happens:** Misreading the schema — `county` is a text field (not an enum), so new county names just create new rows via upsert.
**How to avoid:** Call `updateScrapeHealth({ county: "emery", source: "tax-roll", ... })` — the upsert on `county` unique constraint handles row creation automatically. No migration needed.
**Warning signs:** Attempting to add new enum values to scraperHealth or running unnecessary migrations.

### Pitfall 6: PDF Filename Date Varies — Don't Hardcode
**What goes wrong:** Hardcoding `"Delinquent Tax List as of 12 13 24.pdf"` — the exact date the list was published changes every year.
**Why it happens:** Looking at the 2024 PDF URL and assuming the pattern is fixed.
**How to avoid:** Scrape the county treasurer page with Playwright to find the current year's delinquent list link, then follow that link to download the PDF. Store the discovered URL in scraperConfig for audit trail.
**Warning signs:** 404 errors on hardcoded PDF URLs in December/January of a new year.

---

## Code Examples

### Emery Tax Roll Scraper (wpDataTables Clone)
```typescript
// Source: Verified - emery.utah.gov/home/offices/treasurer/tax-roll/ uses .wpDataTable CSS class
// Identical pattern to carbon-assessor.ts — reuse launchBrowser, createPage, parseHeaderMap
export async function scrapeEmeryTaxRoll(): Promise<PropertyRecord[]> {
  const browser = await launchBrowser();
  try {
    const page = await createPage(browser);
    await page.goto(
      "https://emery.utah.gov/home/offices/treasurer/tax-roll/",
      { waitUntil: "networkidle", timeout: 60000 }
    );
    await page.waitForSelector(".wpDataTable tbody tr", { timeout: 30000 });
    const headerMap = await parseHeaderMap(page);
    // Column names on Emery: "Parcel Number", "Primary Name", "Property Address",
    // "City", "State", "Zip", "Plat", "TaxRoll", "Tax 2025", "Tax 2024"...
    // Use same getCell() pattern with fallback column name variants
    let hasNextPage = true;
    const records: PropertyRecord[] = [];
    while (hasNextPage) {
      // ... same pagination loop as carbon-assessor.ts
      const nextButton = await page.$(".paginate_button.next:not(.disabled)");
      if (!nextButton) hasNextPage = false;
      else {
        await nextButton.click();
        await delay(rateLimitDelay());
      }
    }
    return records;
  } finally {
    await browser.close();
  }
}
```

### Annual PDF Delinquent Parser
```typescript
// Source: Pattern from verified PDF URLs for Sevier, Juab, Millard counties
import pdfParse from "pdf-parse";

type PdfDelinquentConfig = {
  county: string;
  findPdfUrl: (page: import("playwright").Page) => Promise<string | null>;
};

async function parseDelinquentPdf(config: PdfDelinquentConfig): Promise<DelinquentRecord[]> {
  // Step 1: Use Playwright to find the PDF link on the treasurer page
  const browser = await launchBrowser();
  let pdfUrl: string | null = null;
  try {
    const page = await createPage(browser);
    pdfUrl = await config.findPdfUrl(page);
  } finally {
    await browser.close();
  }

  if (!pdfUrl) {
    console.log(`[${config.county}-delinquent] No PDF link found for current year`);
    return [];
  }

  // Step 2: Download and parse the PDF
  const response = await fetch(pdfUrl);
  if (!response.ok) return [];
  const buffer = await response.arrayBuffer();
  const data = await pdfParse(Buffer.from(buffer));

  // Step 3: Parse text lines into records
  // Format varies by county but typically: parcel | owner name | property address | amount due
  return parseDelinquentLines(data.text, config.county);
}
```

### Staggered Timer Schedule for 5 Counties
```typescript
// Source: Microsoft Learn - Timer trigger for Azure Functions (NCRONTAB 6-field format)
// Carbon already runs at 5:00 AM via dailyScrape.ts

app.timer("emery-scrape",   { schedule: "0 15 5 * * *", runOnStartup: false, handler: emeryScrapeHandler });
app.timer("sevier-scrape",  { schedule: "0 30 5 * * *", runOnStartup: false, handler: sevierScrapeHandler });
app.timer("juab-scrape",    { schedule: "0 45 5 * * *", runOnStartup: false, handler: juabScrapeHandler });
app.timer("millard-scrape", { schedule: "0 0  6 * * *", runOnStartup: false, handler: millardScrapeHandler });
app.timer("sanpete-scrape", { schedule: "0 15 6 * * *", runOnStartup: false, handler: sanpeteScrapeHandler });
```

### XChange Probate Manual Entry API
```typescript
// Source: Existing distressSignals table schema (schema.ts)
// Probate case types from XChange: ES = Estate Personal Rep, CO = Conservatorship,
//   GT = Guardian Adult, TR = Trust, OT = Other Probate
// User manually searches XChange monthly, enters leads via this endpoint

// POST /api/properties/[propertyId]/signals
// body: { signalType: "probate", recordedDate: "2026-03-01", rawData: "XChange Case ES-2026-001234" }
// Uses existing upsertFromRecorder pattern with signalType = "probate"
```

### Manual Vacant Flag UI
```typescript
// Source: Existing schema.ts — signalTypeEnum already includes "vacant" and "code_violation"
// New UI element: Property detail page "Field Observations" section
// Toggle: "Mark as Vacant" → inserts distress_signal with type="vacant", status="active"
// Toggle off → updates signal status to "resolved"

// Server action:
async function setVacantFlag(propertyId: string, isVacant: boolean) {
  if (isVacant) {
    await db.insert(distressSignals).values({
      propertyId,
      signalType: "vacant",
      status: "active",
      recordedDate: new Date().toISOString().split("T")[0],
      rawData: "Manual flag - field observation",
    }).onConflictDoNothing(); // uq_distress_signal_dedup handles duplicate prevention
  } else {
    await db.update(distressSignals)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(and(
        eq(distressSignals.propertyId, propertyId),
        eq(distressSignals.signalType, "vacant"),
        eq(distressSignals.status, "active"),
      ));
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single monolithic daily scrape | Staggered per-county Azure Function timers | Established in Phase 1 (01-04) | Partial failure tolerance; one county failing does not block others |
| Manual probate tracking | XChange subscription (manual-assist, not automated) | Phase 4 | Structured monthly workflow; XChange ToS prohibits automation |
| Boolean "delinquent" flag per property | Individual distress_signals rows with recorded_date | Phase 1 | Freshness tracking, signal stacking for scoring |

**Deprecated/outdated:**
- Netlify Scheduled Functions: Already replaced with Azure Functions (not applicable here, documented in PITFALLS.md)
- Monolithic scraper: Already split into per-source functions (Phase 1 decision)

---

## Open Questions

1. **Emery County Delinquent Live vs PDF**
   - What we know: Emery has a PDF delinquent list (annual, December) AND a wpDataTables tax roll (daily-browsable). The tax roll shows `TaxRoll` column — unclear if this column indicates delinquency status.
   - What's unclear: Does the `TaxRoll` column on the Emery tax roll page indicate current delinquency? If yes, the PDF parser is redundant for Emery.
   - Recommendation: During implementation, manually inspect the Emery tax roll table and check what values appear in `TaxRoll` column. If it shows "delinquent"/"paid" etc., use the live table instead of PDF.

2. **Sanpete County Property Data for Daily Scraping**
   - What we know: Sanpete's Tyler self-service portal requires login and specific search input — no bulk browse. Delinquent list is annual PDF.
   - What's unclear: Is there a wpDataTables or similarly browsable assessor page on sanpetecountyutah.gov for general property data (non-delinquent)?
   - Recommendation: During Wave 1, manually visit sanpetecountyutah.gov and check all pages under Assessor, Treasurer, and Auditor departments for any table-based property search. If none found, Sanpete gets PDF-only coverage.

3. **Vernal / Uintah County Inclusion**
   - What we know: Uintah County (Vernal, pop ~10,254) is 2h 55m from SLC — 25 minutes outside the 2.5-hour guideline. The portal is an Oracle APEX system that requires specific search input.
   - What's unclear: User has not explicitly approved or rejected Vernal.
   - Recommendation: Present Vernal to user as "borderline — 2:55 drive, distinct scraper needed." If included, implement as separate function; if excluded, skip entirely.

4. **XChange Monthly Cost vs Annual Claim**
   - What we know: The verified subscription agreement states $25 setup + $40/month. The initial discussion estimated $30-40/year.
   - What's unclear: Whether there is an annual prepay option not reflected in the web-facing pricing page.
   - Recommendation: The $40/month ($480/year) cost should be disclosed to user before proceeding. User may prefer $10 one-time use option for occasional manual lookups instead of monthly subscription.

5. **UGRC GIS Parcel Data for Seeding New County Properties**
   - What we know: UGRC provides downloadable LIR parcel data for all Utah counties, updated annually. Attributes include parcel ID, address, city, tax exemption status, assessed value — but NOT owner name (owner name is not in the LIR dataset).
   - What's unclear: Whether the UGRC data could be used to pre-seed properties table for new counties before the live scrapers run.
   - Recommendation: Use UGRC LIR data as a one-time seed to populate property records for new counties (parcel ID + address + city). Then live scrapers fill in owner names. This reduces Day 1 "cold start" where no properties exist for new counties.

---

## Sources

### Primary (HIGH confidence)
- `https://emery.utah.gov/home/offices/treasurer/tax-roll/` — Directly verified: wpDataTables `.wpDataTable` CSS class, WordPress-based, same technology as Carbon County
- `https://www.utcourts.gov/content/dam/xchange/subscribe/docs/XChangeAgreement20.doc` — Directly read subscription agreement: automated access explicitly prohibited
- `https://www.utcourts.gov/en/court-records-publications/records/xchange/case.html` — Case type codes: ES, CO, GT, TR, OT confirmed as probate-related
- `https://juabcountyut-recorder.tylerhost.net/recorder/web/` — Tyler Technologies copyright verified, EagleWeb system confirmed
- `https://selfservice.sanpetecountyutah.gov/web/` — Tyler Technologies copyright verified, requires login + search criteria
- `https://millardcountyut-recorder.tylerhost.net/recorder/web/login.jsp` — Tyler hosted system confirmed
- `scraper/src/db/schema.ts` — Reviewed: `probate`, `code_violation`, `vacant` signal types already in enum; `scraperHealth.county` is UNIQUE text (no migration needed for new counties)
- `scraper/src/functions/dailyScrape.ts` — Reviewed: per-source independent try/catch pattern established; `updateScrapeHealth()` accepts county + source params
- `https://gis.utah.gov/products/sgid/cadastre/parcels/` — UGRC parcel data confirmed for all 29 Utah counties, LIR version updated annually

### Secondary (MEDIUM confidence)
- `https://www.sevier.utah.gov/departments/county_officials/treasurer/current_year_delinquent_tax_report.php` — Sevier delinquent is PDF only (verified page content)
- `juabcounty.gov/wp-content/uploads/2022/12/2022_Delinquent_Tax_List.pdf` — Juab delinquent is PDF (URL pattern confirms WordPress upload)
- `https://millardcounty.gov/wp-content/uploads/2024/12/2024-Deliquent-List.pdf` — Millard delinquent is PDF (URL confirmed)
- `https://www.utcourts.gov/en/court-records-publications/records/xchange/subscribe.html` — Subscription pricing: $25 setup + $40/month for 500 searches confirmed
- Census/population data for all target cities — Multiple cross-referenced sources (census.gov, worldpopulationreview.com, city-data.com)
- Drive times from SLC — Multiple cross-referenced sources (travelmath.com, trippy.com)

### Tertiary (LOW confidence)
- Code violation availability for rural Utah cities — No portal found for any target city; absence of evidence is not proof, but consistent null results across multiple searches support LOW availability conclusion
- Sanpete County delinquent format — Assumed PDF based on pattern from adjacent counties; not directly verified
- Emery `TaxRoll` column delinquency meaning — Inferred from column name; not verified by direct inspection of live values

---

## Metadata

**Confidence breakdown:**
- City selection: HIGH — population/drive time data verified from multiple census and travel sources
- Emery County portal (wpDataTables): HIGH — directly inspected HTML, confirmed `.wpDataTable` class
- XChange ToS: HIGH — read actual subscription agreement document
- Tyler EagleWeb limitations: HIGH — verified footer, confirmed search-required behavior
- PDF delinquent formats (Sevier/Juab/Millard): MEDIUM — URL patterns verified; actual content not parsed
- Sanpete portal details: MEDIUM — Tyler confirmed, but exact delinquent format not verified
- Code violations availability: LOW — absence of findings consistent but not definitive

**Research date:** 2026-03-18
**Valid until:** 2026-09-18 (county portal technologies are slow-moving; XChange ToS stable; 6-month validity)

---

*Phase: 04-county-expansion*
*Research produced: 2026-03-18*
