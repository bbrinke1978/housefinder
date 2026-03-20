import { db } from "@/db/client";
import { properties, leads, distressSignals, leadNotes, ownerContacts } from "@/db/schema";
import { eq, and, sql, desc, asc, ilike, exists, isNotNull, or } from "drizzle-orm";
import type {
  PropertyWithLead,
  MapProperty,
  PipelineLead,
  DistressSignalRow,
  LeadNote,
  SignalType,
  OwnerContact,
} from "@/types";

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
}

export async function getDashboardStats(): Promise<DashboardStats> {
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
    })
    .from(leads)
    .innerJoin(properties, eq(leads.propertyId, properties.id))
    .where(
      exists(
        db
          .select({ one: sql`1` })
          .from(distressSignals)
          .where(eq(distressSignals.propertyId, properties.id))
      )
    );

  const row = result[0];
  return {
    total: row?.total ?? 0,
    hot: row?.hot ?? 0,
    newToday: row?.newToday ?? 0,
    needsFollowUp: row?.needsFollowUp ?? 0,
    needsSkipTrace: row?.needsSkipTrace ?? 0,
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
  minSignals?: string;
}

export async function getProperties(
  params: GetPropertiesParams = {}
): Promise<PropertyWithLead[]> {
  const conditions = [];

  // Only show properties with at least N distress signals (default: 1)
  const minSignals = params.minSignals ? parseInt(params.minSignals, 10) : 1;
  if (minSignals <= 1) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(distressSignals)
          .where(eq(distressSignals.propertyId, properties.id))
      )
    );
  } else {
    conditions.push(
      sql`(SELECT count(*) FROM distress_signals ds WHERE ds.property_id = ${properties.id}) >= ${minSignals}`
    );
  }

  if (params.city) {
    conditions.push(ilike(properties.city, params.city));
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

// -- Distinct cities for filter dropdown --

export async function getDistinctCities(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ city: properties.city })
    .from(properties)
    .orderBy(asc(properties.city));

  return rows.map((r) => r.city);
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
