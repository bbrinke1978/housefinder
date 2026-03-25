import { db } from "@/db/client";
import { properties, leads, distressSignals, leadNotes, ownerContacts, scraperConfig } from "@/db/schema";
import { eq, and, sql, desc, asc, ilike, exists, isNotNull, notInArray } from "drizzle-orm";
import type {
  PropertyWithLead,
  MapProperty,
  PipelineLead,
  DistressSignalRow,
  LeadNote,
  SignalType,
  OwnerContact,
} from "@/types";

// -- Big Operator Filter --

/**
 * Returns owner names that appear on 10 or more properties that have at least
 * one distress signal. Used to exclude big operators from the dashboard.
 *
 * Result is an array of owner_name strings (may be empty).
 */
export async function getBigOperatorNames(): Promise<string[]> {
  const rows = await db.execute<{ owner_name: string }>(sql`
    SELECT p.owner_name
    FROM properties p
    JOIN distress_signals ds ON ds.property_id = p.id
    WHERE p.owner_name IS NOT NULL
    GROUP BY p.owner_name
    HAVING count(DISTINCT p.id) >= 10
  `);
  return (rows.rows ?? []).map((r) => r.owner_name).filter(Boolean);
}

/**
 * Returns true when the dashboard.hideBigOperators setting is enabled (or absent,
 * since the default is ON).
 */
export async function shouldHideBigOperators(): Promise<boolean> {
  const rows = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, "dashboard.hideBigOperators"))
    .limit(1);

  if (rows.length === 0) return true; // default ON
  return rows[0].value !== "false";
}

/**
 * Get full property + lead data by property ID.
 * Returns null if the property or its lead is not found.
 */
export async function getPropertyDetail(
  propertyId: string
): Promise<PropertyWithLead | null> {
  const rows = await db
    .select({
      id: properties.id,
      leadId: leads.id,
      parcelId: properties.parcelId,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      zip: properties.zip,
      county: properties.county,
      ownerName: properties.ownerName,
      ownerType: properties.ownerType,
      propertyType: properties.propertyType,
      distressScore: leads.distressScore,
      isHot: leads.isHot,
      leadStatus: leads.status,
      newLeadStatus: leads.newLeadStatus,
      firstSeenAt: leads.firstSeenAt,
      lastViewedAt: leads.lastViewedAt,
      lastContactedAt: leads.lastContactedAt,
    })
    .from(properties)
    .innerJoin(leads, eq(leads.propertyId, properties.id))
    .where(eq(properties.id, propertyId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return row as unknown as PropertyWithLead;
}

/**
 * Get all distress signals for a property, newest first.
 */
export async function getPropertySignals(
  propertyId: string
): Promise<DistressSignalRow[]> {
  const rows = await db
    .select({
      id: distressSignals.id,
      signalType: distressSignals.signalType,
      status: distressSignals.status,
      recordedDate: distressSignals.recordedDate,
      sourceUrl: distressSignals.sourceUrl,
      createdAt: distressSignals.createdAt,
      resolvedAt: distressSignals.resolvedAt,
    })
    .from(distressSignals)
    .where(eq(distressSignals.propertyId, propertyId))
    .orderBy(desc(distressSignals.createdAt));

  return rows as unknown as DistressSignalRow[];
}

/**
 * Get all notes for a lead, newest first.
 */
export async function getPropertyNotes(leadId: string): Promise<LeadNote[]> {
  const rows = await db
    .select({
      id: leadNotes.id,
      leadId: leadNotes.leadId,
      noteText: leadNotes.noteText,
      noteType: leadNotes.noteType,
      previousStatus: leadNotes.previousStatus,
      newStatus: leadNotes.newStatus,
      createdAt: leadNotes.createdAt,
    })
    .from(leadNotes)
    .where(eq(leadNotes.leadId, leadId))
    .orderBy(desc(leadNotes.createdAt));

  return rows as unknown as LeadNote[];
}

// -- Dashboard stats --

export interface DashboardStats {
  total: number;
  hot: number;
  newToday: number;
  needsFollowUp: number;
  needsSkipTrace: number;
  critical: number;
  warm: number;
  cool: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Precompute exclusion lists once
  const [hideBigOps, bigOpNames, targetCities] = await Promise.all([
    shouldHideBigOperators(),
    getBigOperatorNames(),
    getTargetCitiesList(),
  ]);

  const statsConditions = [
    sql`${leads.distressScore} > 0`,
  ];

  if (hideBigOps && bigOpNames.length > 0) {
    statsConditions.push(sql`(${properties.ownerName} IS NULL OR ${properties.ownerName} NOT IN (${sql.join(bigOpNames.map(n => sql`${n}`), sql`, `)}))`);
  }

  // Filter to target cities only
  if (targetCities.length > 0) {
    statsConditions.push(sql`lower(${properties.city}) IN (${sql.join(targetCities.map(c => sql`lower(${c})`), sql`, `)})`);
  }

  // Only count properties that have at least one distress signal
  const result = await db
    .select({
      total: sql<number>`count(*)::int`,
      hot: sql<number>`count(*) filter (where ${leads.isHot} = true)::int`,
      newToday: sql<number>`count(*) filter (where ${leads.firstSeenAt} > now() - interval '24 hours')::int`,
      needsFollowUp: sql<number>`count(*) filter (where ${leads.status} = 'follow_up')::int`,
      needsSkipTrace: sql<number>`count(*) filter (where not exists (
        select 1 from owner_contacts oc
        where oc.property_id = ${properties.id} and oc.phone is not null
      ) and ${properties.ownerType} in ('individual', 'unknown'))::int`,
      critical: sql<number>`count(*) filter (where ${leads.distressScore} >= 7)::int`,
      warm: sql<number>`count(*) filter (where ${leads.distressScore} >= 2 and ${leads.distressScore} < 4)::int`,
      cool: sql<number>`count(*) filter (where ${leads.distressScore} >= 1 and ${leads.distressScore} < 2)::int`,
    })
    .from(leads)
    .innerJoin(properties, eq(leads.propertyId, properties.id))
    .where(and(...statsConditions));

  const row = result[0];
  return {
    total: row?.total ?? 0,
    hot: row?.hot ?? 0,
    newToday: row?.newToday ?? 0,
    needsFollowUp: row?.needsFollowUp ?? 0,
    needsSkipTrace: row?.needsSkipTrace ?? 0,
    critical: row?.critical ?? 0,
    warm: row?.warm ?? 0,
    cool: row?.cool ?? 0,
  };
}

/**
 * Get all owner contacts for a property.
 * Manual entries first, then by creation date descending.
 */
export async function getOwnerContacts(propertyId: string): Promise<OwnerContact[]> {
  const rows = await db
    .select({
      id: ownerContacts.id,
      propertyId: ownerContacts.propertyId,
      phone: ownerContacts.phone,
      email: ownerContacts.email,
      source: ownerContacts.source,
      isManual: ownerContacts.isManual,
      needsSkipTrace: ownerContacts.needsSkipTrace,
      createdAt: ownerContacts.createdAt,
      updatedAt: ownerContacts.updatedAt,
    })
    .from(ownerContacts)
    .where(eq(ownerContacts.propertyId, propertyId))
    .orderBy(desc(ownerContacts.isManual), desc(ownerContacts.createdAt));

  return rows as unknown as OwnerContact[];
}

// -- Property list with filters and sorting --

export interface GetPropertiesParams {
  city?: string;
  distressType?: string;
  hot?: string;
  status?: string;
  sort?: string;
  skipTrace?: string;
  minScore?: string;
  ownerType?: string;
  /** Tier filter: "critical" (7+), "hot" (4+), "warm" (2+) */
  tier?: string;
}

export async function getProperties(
  params: GetPropertiesParams = {}
): Promise<PropertyWithLead[]> {
  // Precompute exclusion lists once (parallel with query building)
  const [hideBigOps, bigOpNames, targetCities] = await Promise.all([
    shouldHideBigOperators(),
    getBigOperatorNames(),
    getTargetCitiesList(),
  ]);

  const conditions = [];

  // Only show properties with a distress score > 0
  conditions.push(sql`${leads.distressScore} > 0`);

  // Exclude big operators when setting is enabled (handle NULL owner names)
  if (hideBigOps && bigOpNames.length > 0) {
    conditions.push(sql`(${properties.ownerName} IS NULL OR ${properties.ownerName} NOT IN (${sql.join(bigOpNames.map(n => sql`${n}`), sql`, `)}))`);
  }

  // Filter to target cities only (unless a specific city filter is set)
  if (!params.city && targetCities.length > 0) {
    conditions.push(sql`lower(${properties.city}) IN (${sql.join(targetCities.map(c => sql`lower(${c})`), sql`, `)})`);
  }

  // Filter by tier (overrides minScore when present)
  if (params.tier) {
    const tierScoreMap: Record<string, number> = {
      critical: 7,
      hot: 4,
      warm: 2,
    };
    const tierMin = tierScoreMap[params.tier];
    if (tierMin !== undefined) {
      conditions.push(sql`${leads.distressScore} >= ${tierMin}`);
    }
  } else {
    // Filter by minimum distress score (legacy)
    const minScore = params.minScore ? parseInt(params.minScore, 10) : 0;
    if (minScore > 0) {
      conditions.push(sql`${leads.distressScore} >= ${minScore}`);
    }
  }

  if (params.city) {
    conditions.push(ilike(properties.city, params.city));
  }

  if (params.ownerType) {
    conditions.push(sql`${properties.ownerType} = ${params.ownerType}`);
  }

  if (params.distressType) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(distressSignals)
          .where(
            and(
              eq(distressSignals.propertyId, properties.id),
              eq(distressSignals.signalType, params.distressType as SignalType)
            )
          )
      )
    );
  }

  if (params.hot === "true") {
    conditions.push(eq(leads.isHot, true));
  }

  if (params.status) {
    conditions.push(eq(leads.status, params.status));
  }

  if (params.skipTrace === "true") {
    conditions.push(
      sql`NOT EXISTS (
        SELECT 1 FROM owner_contacts oc
        WHERE oc.property_id = ${properties.id} AND oc.phone IS NOT NULL
      ) AND ${properties.ownerType} IN ('individual', 'unknown')`
    );
  }

  // Sort
  let orderBy;
  switch (params.sort) {
    case "date":
      orderBy = desc(leads.firstSeenAt);
      break;
    case "city":
      orderBy = asc(properties.city);
      break;
    case "score":
    default:
      orderBy = desc(leads.distressScore);
      break;
  }

  const rows = await db
    .select({
      id: properties.id,
      parcelId: properties.parcelId,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      zip: properties.zip,
      county: properties.county,
      ownerName: properties.ownerName,
      ownerType: properties.ownerType,
      propertyType: properties.propertyType,
      distressScore: leads.distressScore,
      isHot: leads.isHot,
      leadStatus: leads.status,
      newLeadStatus: leads.newLeadStatus,
      firstSeenAt: leads.firstSeenAt,
      lastViewedAt: leads.lastViewedAt,
      lastContactedAt: leads.lastContactedAt,
    })
    .from(properties)
    .innerJoin(leads, eq(leads.propertyId, properties.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .limit(100);

  return rows as PropertyWithLead[];
}

// -- Target cities from settings (for filter dropdown + dashboard filtering) --

export async function getTargetCitiesList(): Promise<string[]> {
  const configRows = await db
    .select({ value: scraperConfig.value })
    .from(scraperConfig)
    .where(eq(scraperConfig.key, "target_cities"))
    .limit(1);

  if (configRows.length > 0 && configRows[0].value) {
    try {
      const cities = JSON.parse(configRows[0].value) as string[];
      if (cities.length > 0) return cities.sort();
    } catch { /* fall through */ }
  }
  return [];
}

export async function getDistinctCities(): Promise<string[]> {
  return getTargetCitiesList();
}

// -- Pipeline leads --

/**
 * getPipelineLeads — returns all leads joined with property data for the pipeline view.
 * Ordered by distress score descending.
 */
export async function getPipelineLeads(): Promise<PipelineLead[]> {
  const rows = await db
    .select({
      id: leads.id,
      propertyId: leads.propertyId,
      parcelId: properties.parcelId,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      zip: properties.zip,
      county: properties.county,
      ownerName: properties.ownerName,
      ownerType: properties.ownerType,
      propertyType: properties.propertyType,
      distressScore: leads.distressScore,
      isHot: leads.isHot,
      leadStatus: leads.status,
      newLeadStatus: leads.newLeadStatus,
      firstSeenAt: properties.firstSeenAt,
      lastViewedAt: leads.lastViewedAt,
      lastContactedAt: leads.lastContactedAt,
    })
    .from(leads)
    .innerJoin(properties, eq(leads.propertyId, properties.id))
    .orderBy(desc(leads.distressScore));

  return rows as unknown as PipelineLead[];
}

// -- Distinct counties for map filter dropdown --

export async function getDistinctCounties(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ county: properties.county })
    .from(properties)
    .orderBy(asc(properties.county));

  return rows.map((r) => r.county);
}

// -- Map properties with coordinates and signal types --

/**
 * getMapProperties — returns all properties that have lat/lng coordinates,
 * joined with lead data and aggregated active distress signal types.
 * No limit — returns all for map display.
 */
export async function getMapProperties(): Promise<MapProperty[]> {
  const rows = await db
    .select({
      id: properties.id,
      leadId: leads.id,
      parcelId: properties.parcelId,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      zip: properties.zip,
      county: properties.county,
      ownerName: properties.ownerName,
      ownerType: properties.ownerType,
      propertyType: properties.propertyType,
      latitude: properties.latitude,
      longitude: properties.longitude,
      distressScore: leads.distressScore,
      isHot: leads.isHot,
      leadStatus: leads.status,
      newLeadStatus: leads.newLeadStatus,
      firstSeenAt: leads.firstSeenAt,
      lastViewedAt: leads.lastViewedAt,
      lastContactedAt: leads.lastContactedAt,
    })
    .from(properties)
    .innerJoin(leads, eq(leads.propertyId, properties.id))
    .where(and(isNotNull(properties.latitude), isNotNull(properties.longitude)))
    .orderBy(desc(leads.distressScore));

  // Fetch active signal types for all properties
  const signalRows = await db
    .select({
      propertyId: distressSignals.propertyId,
      signalType: distressSignals.signalType,
    })
    .from(distressSignals)
    .where(eq(distressSignals.status, "active"));

  // Build lookup: propertyId -> SignalType[]
  const signalMap = new Map<string, SignalType[]>();
  for (const row of signalRows) {
    const existing = signalMap.get(row.propertyId) ?? [];
    existing.push(row.signalType);
    signalMap.set(row.propertyId, existing);
  }

  // Merge signal types into property rows
  return rows.map((row) => ({
    ...row,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    signalTypes: signalMap.get(row.id) ?? [],
  })) as MapProperty[];
}
