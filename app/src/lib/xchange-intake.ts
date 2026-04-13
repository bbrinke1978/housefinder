import { z } from "zod/v4";
import { eq, sql } from "drizzle-orm";
import { parse as parseDate, format as formatDate, isValid } from "date-fns";
import { db } from "@/db/client";
import {
  courtIntakeRuns,
  distressSignals,
  properties,
  leads,
  scraperConfig,
} from "@/db/schema";

// ---------------------------------------------------------------------------
// Case type → signal type mapping (from XChange research)
// ---------------------------------------------------------------------------

const CASE_TYPE_TO_SIGNAL: Record<
  string,
  "lis_pendens" | "probate" | "code_violation"
> = {
  LM: "lis_pendens",
  WG: "lis_pendens",
  EV: "lis_pendens",
  ES: "probate",
  CO: "probate",
  GM: "probate",
  GT: "probate",
  OT: "probate",
  TR: "probate",
  IF: "code_violation",
  MO: "code_violation",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CourtCase {
  caseNumber: string;
  caseType: string;
  filingDate?: string;
  partyName?: string;
  partyAddress?: string;
  county: string;
  rawText?: string;
}

export interface IntakeResult {
  matched: number;
  unmatched: number;
  signalsCreated: number;
  newHotLeads: number;
}

interface UnmatchedCase extends CourtCase {
  reason: string;
  nameMatchSuggestion?: string;
}

// ---------------------------------------------------------------------------
// Address normalization
// ---------------------------------------------------------------------------

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract city hint from address string.
 * Handles "123 Main St, Price, UT 84501" → "Price"
 */
function extractCityFromAddress(address: string): string | null {
  const parts = address.split(",");
  if (parts.length >= 2) {
    return parts[1].trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Three-tier property matching
// ---------------------------------------------------------------------------

/**
 * Attempt to match a party address to a property in the DB.
 * Returns property UUID on first match, null if no match across all tiers.
 * Tier 3 (name-only) returns null — caller handles review suggestion.
 */
export async function matchCaseToProperty(
  partyAddress: string,
  county: string,
  partyName?: string
): Promise<{ propertyId: string | null; nameMatchSuggestion?: string }> {
  if (!partyAddress.trim()) {
    return { propertyId: null };
  }

  const normalizedAddress = normalizeForMatch(partyAddress);
  const cityHint = extractCityFromAddress(partyAddress);
  const cityFilter = cityHint ?? county;

  // Tier 1: Normalized full address ILIKE + city
  try {
    const tier1 = await db.execute(
      sql`SELECT id FROM properties
          WHERE lower(regexp_replace(address, '[^a-zA-Z0-9 ]', '', 'g'))
                ILIKE ${"%" + normalizedAddress + "%"}
            AND city ILIKE ${cityFilter}
          LIMIT 1`
    );
    const rows1 = tier1.rows as Array<{ id: string }>;
    if (rows1.length > 0) {
      return { propertyId: rows1[0].id };
    }
  } catch {
    // Tier 1 failed — fall through to tier 2
  }

  // Tier 2: House number + primary street name ILIKE, same city
  const tokens = normalizedAddress.split(" ");
  if (tokens.length >= 2) {
    const houseNumber = tokens[0];
    const streetName = tokens[1];
    try {
      const tier2 = await db.execute(
        sql`SELECT id FROM properties
            WHERE address ILIKE ${houseNumber + "%" + streetName + "%"}
              AND city ILIKE ${cityFilter}
            LIMIT 1`
      );
      const rows2 = tier2.rows as Array<{ id: string }>;
      if (rows2.length > 0) {
        return { propertyId: rows2[0].id };
      }
    } catch {
      // Tier 2 failed — fall through to tier 3
    }
  }

  // Tier 3: Owner name match (review flag only — no auto-signal)
  if (partyName) {
    const normalizedName = normalizeForMatch(partyName);
    try {
      const tier3 = await db.execute(
        sql`SELECT id FROM properties
            WHERE lower(regexp_replace(owner_name, '[^a-zA-Z0-9 ]', '', 'g'))
                  ILIKE ${"%" + normalizedName + "%"}
            LIMIT 1`
      );
      const rows3 = tier3.rows as Array<{ id: string }>;
      if (rows3.length > 0) {
        return {
          propertyId: null, // No auto-match on name — too ambiguous
          nameMatchSuggestion: rows3[0].id,
        };
      }
    } catch {
      // Tier 3 failed
    }
  }

  return { propertyId: null };
}

// ---------------------------------------------------------------------------
// Signal insertion (mirrors upsertSignal from scraper — safe to call multiple
// times for the same signal due to onConflictDoNothing)
// ---------------------------------------------------------------------------

async function insertSignal(
  propertyId: string,
  signalType: "lis_pendens" | "probate" | "code_violation",
  recordedDate: string | undefined,
  caseNumber: string,
  rawText: string | undefined
): Promise<void> {
  await db
    .insert(distressSignals)
    .values({
      propertyId,
      signalType,
      status: "active",
      recordedDate: recordedDate ?? "1970-01-01",
      sourceUrl: "https://xchange.utcourts.gov",
      rawData: JSON.stringify({ caseNumber, rawText }),
    })
    .onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Local scoring (mirrors scraper/src/scoring/score.ts using app db client)
// ---------------------------------------------------------------------------

interface SignalRow {
  signal_type: string;
  recorded_date: string | null;
  status: string;
  raw_data: string | null;
}

interface ScoringSignalConfig {
  signal_type: string;
  weight: number;
  freshness_days: number;
}

function taxLienAmountWeight(rawData: string | null | undefined): number {
  if (!rawData) return 1;
  try {
    const parsed = JSON.parse(rawData) as Record<string, unknown>;
    const amountStr = parsed.amountDue;
    if (!amountStr || typeof amountStr !== "string" || amountStr === "") return 1;
    const amount = parseFloat(amountStr.replace(/,/g, ""));
    if (isNaN(amount)) return 1;
    if (amount >= 1000) return 4;
    if (amount >= 500) return 3;
    if (amount >= 100) return 2;
    return 1;
  } catch {
    return 1;
  }
}

function yearsDelinquentBonus(taxLienSignals: SignalRow[]): number {
  if (taxLienSignals.length === 0) return 0;
  const years = new Set<string>();
  let undatedCount = 0;
  for (const s of taxLienSignals) {
    if (s.recorded_date !== null) {
      years.add(new Date(s.recorded_date).getFullYear().toString());
    } else {
      undatedCount++;
    }
  }
  const distinctYears = years.size + (years.size === 0 ? undatedCount : 0);
  if (distinctYears >= 5) return 4;
  if (distinctYears === 4) return 3;
  if (distinctYears === 3) return 2;
  if (distinctYears === 2) return 1;
  return 0;
}

/**
 * Score all properties with active distress signals and upsert their lead rows.
 * Mirrors scraper/src/scoring/score.ts but uses the app's Drizzle client.
 */
async function scoreAllPropertiesLocal(): Promise<{ scored: number; hot: number }> {
  // Load config from DB
  const configRows = await db
    .select()
    .from(scraperConfig)
    .where(
      sql`${scraperConfig.key} IN ('scoring_signals', 'hot_lead_threshold')`
    );

  let signals: ScoringSignalConfig[] = [];
  let hotLeadThreshold = 4;

  for (const row of configRows) {
    if (row.key === "scoring_signals") {
      signals = JSON.parse(row.value) as ScoringSignalConfig[];
    } else if (row.key === "hot_lead_threshold") {
      hotLeadThreshold = Number(row.value);
    }
  }

  const configMap = new Map<string, ScoringSignalConfig>();
  for (const sc of signals) {
    configMap.set(sc.signal_type, sc);
  }

  // Fetch all properties with active signals
  const rows = await db
    .select({
      propertyId: properties.id,
      signalType: distressSignals.signalType,
      status: distressSignals.status,
      recordedDate: distressSignals.recordedDate,
      rawData: distressSignals.rawData,
    })
    .from(properties)
    .innerJoin(distressSignals, eq(distressSignals.propertyId, properties.id))
    .where(eq(distressSignals.status, "active"));

  // Group signals by property
  const propertySignals = new Map<string, SignalRow[]>();
  for (const row of rows) {
    const existing = propertySignals.get(row.propertyId) ?? [];
    existing.push({
      signal_type: row.signalType,
      recorded_date: row.recordedDate ?? null,
      status: row.status,
      raw_data: row.rawData ?? null,
    });
    propertySignals.set(row.propertyId, existing);
  }

  let scored = 0;
  let hot = 0;
  const now = new Date();

  for (const [propertyId, propertySignalRows] of propertySignals) {
    // Score property
    let score = 0;
    let scoredCount = 0;
    const scoredTaxLiens: SignalRow[] = [];

    for (const signal of propertySignalRows) {
      if (signal.status !== "active") continue;
      const signalCfg = configMap.get(signal.signal_type);
      if (!signalCfg) continue;

      // Freshness check
      if (signal.recorded_date !== null) {
        const d = new Date(signal.recorded_date);
        const year = d.getFullYear();
        if (year > 1970) {
          const ageDays = Math.floor(
            (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (ageDays > signalCfg.freshness_days) continue;
        }
      }

      if (signal.signal_type === "tax_lien") {
        score += taxLienAmountWeight(signal.raw_data);
        scoredTaxLiens.push(signal);
      } else {
        score += signalCfg.weight;
      }
      scoredCount++;
    }

    score += yearsDelinquentBonus(scoredTaxLiens);
    const isHot = score >= hotLeadThreshold;

    await db
      .insert(leads)
      .values({
        propertyId,
        distressScore: score,
        isHot,
        status: "new",
        newLeadStatus: "new",
        firstSeenAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: leads.propertyId,
        set: {
          distressScore: score,
          isHot,
          updatedAt: now,
        },
      });

    scored++;
    if (isHot) hot++;
  }

  return { scored, hot };
}

// ---------------------------------------------------------------------------
// Main intake function
// ---------------------------------------------------------------------------

/**
 * Process an array of XChange court cases:
 *  1. Match each case to a property via three-tier address matching
 *  2. Insert a distress_signals row for matched cases
 *  3. Score all properties once at the end
 *  4. Write a court_intake_runs audit row
 *
 * @returns { matched, unmatched, signalsCreated, newHotLeads }
 */
export async function processCourtIntake(
  cases: CourtCase[],
  agentNotes?: string
): Promise<IntakeResult> {
  let matchedCount = 0;
  let signalsCreated = 0;
  const unmatchedCases: UnmatchedCase[] = [];

  for (const courtCase of cases) {
    const { propertyId, nameMatchSuggestion } = await matchCaseToProperty(
      courtCase.partyAddress ?? "",
      courtCase.county,
      courtCase.partyName
    );

    if (!propertyId) {
      unmatchedCases.push({
        ...courtCase,
        reason: nameMatchSuggestion ? "name_match_only" : "no_address_match",
        ...(nameMatchSuggestion ? { nameMatchSuggestion } : {}),
      });
      continue;
    }

    // Map case type to signal type
    const signalType = CASE_TYPE_TO_SIGNAL[courtCase.caseType];
    if (!signalType) {
      unmatchedCases.push({
        ...courtCase,
        reason: "unknown_case_type",
      });
      continue;
    }

    // Parse filing date
    let recordedDate: string | undefined;
    if (courtCase.filingDate) {
      try {
        const parsed = parseDate(courtCase.filingDate, "MM/dd/yyyy", new Date());
        if (isValid(parsed)) {
          recordedDate = formatDate(parsed, "yyyy-MM-dd");
        }
      } catch {
        // Invalid date — leave undefined, sentinel will be used
      }
    }

    await insertSignal(
      propertyId,
      signalType,
      recordedDate,
      courtCase.caseNumber,
      courtCase.rawText
    );

    matchedCount++;
    signalsCreated++;
  }

  // Score all properties once after all signals inserted
  const scoreResult = await scoreAllPropertiesLocal();

  // Write audit row
  await db.insert(courtIntakeRuns).values({
    county: cases[0]?.county ?? null,
    casesProcessed: cases.length,
    propertiesMatched: matchedCount,
    signalsCreated,
    newHotLeads: scoreResult.hot,
    unmatchedCases: JSON.stringify(unmatchedCases),
    agentNotes: agentNotes ?? null,
  });

  return {
    matched: matchedCount,
    unmatched: unmatchedCases.length,
    signalsCreated,
    newHotLeads: scoreResult.hot,
  };
}

// Re-export Zod schema for use in route validation
export const CourtCaseZodSchema = z.object({
  caseNumber: z.string().min(1).max(50),
  caseType: z.string().min(2).max(5),
  filingDate: z.string().optional(),
  partyName: z.string().optional(),
  partyAddress: z.string().optional(),
  county: z.string().min(1),
  rawText: z.string().optional(),
});
