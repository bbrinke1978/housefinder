import { db } from "@/db/client";
import {
  wholesaleLeads,
  wholesalers,
  wholesaleLeadNotes,
} from "@/db/schema";
import { eq, desc, and, ne, count, avg, sql } from "drizzle-orm";
import type {
  WholesaleLeadWithWholesaler,
  WholesalerWithStats,
} from "@/types";

export interface WholesaleLeadNote {
  id: string;
  wholesaleLeadId: string;
  noteText: string;
  noteType: string;
  previousStatus: string | null;
  newStatus: string | null;
  createdAt: Date;
}

// -- Filters --

export interface WholesaleLeadFilters {
  status?: string;
  verdict?: string;
  wholesalerId?: string;
}

// -- getWholesaleLeads --

/**
 * getWholesaleLeads — returns WholesaleLeadWithWholesaler[] with left join to wholesalers.
 * Ordered by createdAt desc.
 */
export async function getWholesaleLeads(
  filters?: WholesaleLeadFilters
): Promise<WholesaleLeadWithWholesaler[]> {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(wholesaleLeads.status, filters.status));
  }
  if (filters?.verdict) {
    conditions.push(eq(wholesaleLeads.verdict, filters.verdict));
  }
  if (filters?.wholesalerId) {
    conditions.push(eq(wholesaleLeads.wholesalerId, filters.wholesalerId));
  }

  const rows = await db
    .select({
      id: wholesaleLeads.id,
      address: wholesaleLeads.address,
      addressNormalized: wholesaleLeads.addressNormalized,
      city: wholesaleLeads.city,
      state: wholesaleLeads.state,
      zip: wholesaleLeads.zip,
      askingPrice: wholesaleLeads.askingPrice,
      arv: wholesaleLeads.arv,
      repairEstimate: wholesaleLeads.repairEstimate,
      sqft: wholesaleLeads.sqft,
      beds: wholesaleLeads.beds,
      baths: wholesaleLeads.baths,
      lotSize: wholesaleLeads.lotSize,
      yearBuilt: wholesaleLeads.yearBuilt,
      taxId: wholesaleLeads.taxId,
      mao: wholesaleLeads.mao,
      dealScore: wholesaleLeads.dealScore,
      verdict: wholesaleLeads.verdict,
      scoreBreakdown: wholesaleLeads.scoreBreakdown,
      status: wholesaleLeads.status,
      sourceChannel: wholesaleLeads.sourceChannel,
      rawEmailText: wholesaleLeads.rawEmailText,
      promotedDealId: wholesaleLeads.promotedDealId,
      wholesalerId: wholesaleLeads.wholesalerId,
      createdAt: wholesaleLeads.createdAt,
      updatedAt: wholesaleLeads.updatedAt,
      wholesalerName: wholesalers.name,
      wholesalerEmail: wholesalers.email,
      wholesalerPhone: wholesalers.phone,
      wholesalerCompany: wholesalers.company,
    })
    .from(wholesaleLeads)
    .leftJoin(wholesalers, eq(wholesaleLeads.wholesalerId, wholesalers.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(wholesaleLeads.createdAt));

  return rows as unknown as WholesaleLeadWithWholesaler[];
}

// -- getWholesaleLead --

/**
 * getWholesaleLead — returns a single wholesale lead with wholesaler join.
 */
export async function getWholesaleLead(
  id: string
): Promise<WholesaleLeadWithWholesaler | null> {
  const rows = await db
    .select({
      id: wholesaleLeads.id,
      address: wholesaleLeads.address,
      addressNormalized: wholesaleLeads.addressNormalized,
      city: wholesaleLeads.city,
      state: wholesaleLeads.state,
      zip: wholesaleLeads.zip,
      askingPrice: wholesaleLeads.askingPrice,
      arv: wholesaleLeads.arv,
      repairEstimate: wholesaleLeads.repairEstimate,
      sqft: wholesaleLeads.sqft,
      beds: wholesaleLeads.beds,
      baths: wholesaleLeads.baths,
      lotSize: wholesaleLeads.lotSize,
      yearBuilt: wholesaleLeads.yearBuilt,
      taxId: wholesaleLeads.taxId,
      mao: wholesaleLeads.mao,
      dealScore: wholesaleLeads.dealScore,
      verdict: wholesaleLeads.verdict,
      scoreBreakdown: wholesaleLeads.scoreBreakdown,
      status: wholesaleLeads.status,
      sourceChannel: wholesaleLeads.sourceChannel,
      rawEmailText: wholesaleLeads.rawEmailText,
      promotedDealId: wholesaleLeads.promotedDealId,
      wholesalerId: wholesaleLeads.wholesalerId,
      createdAt: wholesaleLeads.createdAt,
      updatedAt: wholesaleLeads.updatedAt,
      wholesalerName: wholesalers.name,
      wholesalerEmail: wholesalers.email,
      wholesalerPhone: wholesalers.phone,
      wholesalerCompany: wholesalers.company,
    })
    .from(wholesaleLeads)
    .leftJoin(wholesalers, eq(wholesaleLeads.wholesalerId, wholesalers.id))
    .where(eq(wholesaleLeads.id, id))
    .limit(1);

  return (rows[0] as unknown as WholesaleLeadWithWholesaler) ?? null;
}

// -- getWholesaleLeadNotes --

/**
 * getWholesaleLeadNotes — returns notes for a lead, ordered newest first.
 */
export async function getWholesaleLeadNotes(
  wholesaleLeadId: string
): Promise<WholesaleLeadNote[]> {
  const rows = await db
    .select({
      id: wholesaleLeadNotes.id,
      wholesaleLeadId: wholesaleLeadNotes.wholesaleLeadId,
      noteText: wholesaleLeadNotes.noteText,
      noteType: wholesaleLeadNotes.noteType,
      previousStatus: wholesaleLeadNotes.previousStatus,
      newStatus: wholesaleLeadNotes.newStatus,
      createdAt: wholesaleLeadNotes.createdAt,
    })
    .from(wholesaleLeadNotes)
    .where(eq(wholesaleLeadNotes.wholesaleLeadId, wholesaleLeadId))
    .orderBy(desc(wholesaleLeadNotes.createdAt));

  return rows as WholesaleLeadNote[];
}

// -- getWholesalers --

/**
 * getWholesalers — returns all wholesalers ordered by name.
 */
export async function getWholesalers() {
  return db
    .select()
    .from(wholesalers)
    .orderBy(wholesalers.name);
}

// -- getWholesalerStats --

/**
 * getWholesalerStats — totalSent, totalPromoted, avgSpread for one wholesaler.
 */
export async function getWholesalerStats(wholesalerId: string): Promise<{
  totalSent: number;
  totalPromoted: number;
  avgSpread: number | null;
}> {
  const [stats] = await db
    .select({
      totalSent: count(wholesaleLeads.id),
      totalPromoted: sql<number>`count(*) filter (where ${wholesaleLeads.status} = 'promoted')`,
      avgSpread: avg(
        sql<number>`${wholesaleLeads.mao} - ${wholesaleLeads.askingPrice}`
      ),
    })
    .from(wholesaleLeads)
    .where(eq(wholesaleLeads.wholesalerId, wholesalerId));

  return {
    totalSent: Number(stats?.totalSent ?? 0),
    totalPromoted: Number(stats?.totalPromoted ?? 0),
    avgSpread: stats?.avgSpread !== null && stats?.avgSpread !== undefined
      ? Number(stats.avgSpread)
      : null,
  };
}

// -- getWholesalersWithStats --

/**
 * getWholesalersWithStats — all wholesalers with aggregate stats.
 * Two-query + post-merge pattern (consistent with project convention).
 */
export async function getWholesalersWithStats(): Promise<WholesalerWithStats[]> {
  const allWholesalers = await db
    .select({
      id: wholesalers.id,
      name: wholesalers.name,
      phone: wholesalers.phone,
      email: wholesalers.email,
      company: wholesalers.company,
      isActive: wholesalers.isActive,
      createdAt: wholesalers.createdAt,
    })
    .from(wholesalers)
    .orderBy(wholesalers.name);

  if (allWholesalers.length === 0) return [];

  const statsRows = await db
    .select({
      wholesalerId: wholesaleLeads.wholesalerId,
      totalSent: count(wholesaleLeads.id),
      totalPromoted: sql<number>`count(*) filter (where ${wholesaleLeads.status} = 'promoted')`,
      avgSpread: avg(
        sql<number>`case when ${wholesaleLeads.mao} is not null and ${wholesaleLeads.askingPrice} is not null then ${wholesaleLeads.mao} - ${wholesaleLeads.askingPrice} else null end`
      ),
    })
    .from(wholesaleLeads)
    .groupBy(wholesaleLeads.wholesalerId);

  const statsMap = new Map(
    statsRows.map((r) => [
      r.wholesalerId,
      {
        totalSent: Number(r.totalSent),
        totalPromoted: Number(r.totalPromoted),
        avgSpread: r.avgSpread !== null && r.avgSpread !== undefined ? Number(r.avgSpread) : null,
      },
    ])
  );

  return allWholesalers.map((w) => {
    const stats = statsMap.get(w.id) ?? {
      totalSent: 0,
      totalPromoted: 0,
      avgSpread: null,
    };
    return {
      ...w,
      ...stats,
    };
  });
}

// -- checkDuplicateAddress --

/**
 * checkDuplicateAddress — returns leads with same normalized address for duplicate warning.
 */
export async function checkDuplicateAddress(
  addressNormalized: string,
  excludeId?: string
): Promise<WholesaleLeadWithWholesaler[]> {
  const conditions = [
    eq(wholesaleLeads.addressNormalized, addressNormalized),
  ];
  if (excludeId) {
    conditions.push(ne(wholesaleLeads.id, excludeId));
  }

  const rows = await db
    .select({
      id: wholesaleLeads.id,
      address: wholesaleLeads.address,
      addressNormalized: wholesaleLeads.addressNormalized,
      city: wholesaleLeads.city,
      state: wholesaleLeads.state,
      zip: wholesaleLeads.zip,
      askingPrice: wholesaleLeads.askingPrice,
      arv: wholesaleLeads.arv,
      repairEstimate: wholesaleLeads.repairEstimate,
      sqft: wholesaleLeads.sqft,
      beds: wholesaleLeads.beds,
      baths: wholesaleLeads.baths,
      lotSize: wholesaleLeads.lotSize,
      yearBuilt: wholesaleLeads.yearBuilt,
      taxId: wholesaleLeads.taxId,
      mao: wholesaleLeads.mao,
      dealScore: wholesaleLeads.dealScore,
      verdict: wholesaleLeads.verdict,
      scoreBreakdown: wholesaleLeads.scoreBreakdown,
      status: wholesaleLeads.status,
      sourceChannel: wholesaleLeads.sourceChannel,
      rawEmailText: wholesaleLeads.rawEmailText,
      promotedDealId: wholesaleLeads.promotedDealId,
      wholesalerId: wholesaleLeads.wholesalerId,
      createdAt: wholesaleLeads.createdAt,
      updatedAt: wholesaleLeads.updatedAt,
      wholesalerName: wholesalers.name,
      wholesalerEmail: wholesalers.email,
      wholesalerPhone: wholesalers.phone,
      wholesalerCompany: wholesalers.company,
    })
    .from(wholesaleLeads)
    .leftJoin(wholesalers, eq(wholesaleLeads.wholesalerId, wholesalers.id))
    .where(and(...conditions))
    .orderBy(desc(wholesaleLeads.createdAt));

  return rows as unknown as WholesaleLeadWithWholesaler[];
}
