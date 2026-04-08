import { db } from "@/db/client";
import {
  buyers,
  buyerCommunicationEvents,
  buyerDealInteractions,
  buyerTags,
  deals,
} from "@/db/schema";
import {
  eq,
  desc,
  and,
  or,
  isNull,
  gte,
  lte,
  sql,
  asc,
  inArray,
} from "drizzle-orm";
import type {
  BuyerWithTags,
  BuyerTimelineEntry,
  BuyerDealInteraction,
  BuyerWithMatchInfo,
  OverdueBuyer,
} from "@/types";

export interface BuyerListFilters {
  search?: string;
  tag?: string;
  status?: "active" | "inactive" | "all";
  targetArea?: string;
  fundingType?: string;
}

/**
 * getBuyersForList — fetch all buyers with aggregated tags.
 * Supports search (name ILIKE), tag filter, status filter, area filter, funding type filter.
 */
export async function getBuyersForList(
  filters: BuyerListFilters = {}
): Promise<BuyerWithTags[]> {
  const { search, tag, status = "active", targetArea, fundingType } = filters;

  // Fetch buyers
  let query = db
    .select({
      id: buyers.id,
      name: buyers.name,
      phone: buyers.phone,
      email: buyers.email,
      buyBox: buyers.buyBox,
      minPrice: buyers.minPrice,
      maxPrice: buyers.maxPrice,
      fundingType: buyers.fundingType,
      targetAreas: buyers.targetAreas,
      rehabTolerance: buyers.rehabTolerance,
      notes: buyers.notes,
      isActive: buyers.isActive,
      followUpDate: buyers.followUpDate,
      lastContactedAt: buyers.lastContactedAt,
      createdAt: buyers.createdAt,
      updatedAt: buyers.updatedAt,
    })
    .from(buyers)
    .$dynamic();

  const conditions = [];

  if (status === "active") {
    conditions.push(eq(buyers.isActive, true));
  } else if (status === "inactive") {
    conditions.push(eq(buyers.isActive, false));
  }

  if (search) {
    conditions.push(sql`lower(${buyers.name}) like lower(${"%" + search + "%"})`);
  }

  if (targetArea) {
    conditions.push(
      sql`lower(${buyers.targetAreas}) like lower(${"%" + targetArea + "%"})`
    );
  }

  if (fundingType) {
    conditions.push(eq(buyers.fundingType, fundingType));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(asc(buyers.name));

  if (rows.length === 0) return [];

  // Fetch tags for all buyers in one query
  const buyerIds = rows.map((r) => r.id);
  const tagRows = await db
    .select({ buyerId: buyerTags.buyerId, tag: buyerTags.tag })
    .from(buyerTags)
    .where(inArray(buyerTags.buyerId, buyerIds));

  // Build tag map
  const tagMap = new Map<string, string[]>();
  for (const t of tagRows) {
    const existing = tagMap.get(t.buyerId) ?? [];
    existing.push(t.tag);
    tagMap.set(t.buyerId, existing);
  }

  const result: BuyerWithTags[] = rows.map((r) => ({
    ...r,
    tags: tagMap.get(r.id) ?? [],
    followUpDate: r.followUpDate ?? null,
    lastContactedAt: r.lastContactedAt ?? null,
  }));

  // Filter by tag (client-side after join)
  if (tag) {
    return result.filter((b) => b.tags.includes(tag));
  }

  return result;
}

/**
 * getBuyerById — single buyer with tags.
 */
export async function getBuyerById(
  id: string
): Promise<BuyerWithTags | null> {
  const rows = await db
    .select()
    .from(buyers)
    .where(eq(buyers.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const buyer = rows[0];

  const tags = await db
    .select({ tag: buyerTags.tag })
    .from(buyerTags)
    .where(eq(buyerTags.buyerId, id));

  return {
    ...buyer,
    tags: tags.map((t) => t.tag),
    followUpDate: buyer.followUpDate ?? null,
    lastContactedAt: buyer.lastContactedAt ?? null,
  };
}

/**
 * getBuyerTimeline — parallel fetch comm events + deal interactions (with deal address/city via JOIN),
 * merge, sort desc by date. Mirrors getLeadTimeline() pattern.
 */
export async function getBuyerTimeline(
  buyerId: string
): Promise<BuyerTimelineEntry[]> {
  const [events, interactions] = await Promise.all([
    db
      .select({
        id: buyerCommunicationEvents.id,
        eventType: buyerCommunicationEvents.eventType,
        notes: buyerCommunicationEvents.notes,
        dealId: buyerCommunicationEvents.dealId,
        dealAddress: deals.address,
        occurredAt: buyerCommunicationEvents.occurredAt,
      })
      .from(buyerCommunicationEvents)
      .leftJoin(deals, eq(buyerCommunicationEvents.dealId, deals.id))
      .where(eq(buyerCommunicationEvents.buyerId, buyerId))
      .orderBy(desc(buyerCommunicationEvents.occurredAt)),

    db
      .select({
        id: buyerDealInteractions.id,
        status: buyerDealInteractions.status,
        dealId: buyerDealInteractions.dealId,
        dealAddress: deals.address,
        updatedAt: buyerDealInteractions.updatedAt,
      })
      .from(buyerDealInteractions)
      .innerJoin(deals, eq(buyerDealInteractions.dealId, deals.id))
      .where(eq(buyerDealInteractions.buyerId, buyerId))
      .orderBy(desc(buyerDealInteractions.updatedAt)),
  ]);

  const entries: BuyerTimelineEntry[] = [];

  for (const e of events) {
    entries.push({
      id: e.id,
      type: "comm_event",
      eventType: e.eventType,
      notes: e.notes,
      dealId: e.dealId,
      dealAddress: e.dealAddress ?? null,
      occurredAt: e.occurredAt,
    });
  }

  for (const i of interactions) {
    entries.push({
      id: i.id,
      type: "deal_interaction",
      status: i.status,
      dealId: i.dealId,
      dealAddress: i.dealAddress ?? null,
      occurredAt: i.updatedAt,
    });
  }

  entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return entries;
}

/**
 * getBuyerDealInteractions — fetch buyer_deal_interactions joined with deals.
 */
export async function getBuyerDealInteractions(
  buyerId: string
): Promise<BuyerDealInteraction[]> {
  const rows = await db
    .select({
      id: buyerDealInteractions.id,
      buyerId: buyerDealInteractions.buyerId,
      dealId: buyerDealInteractions.dealId,
      status: buyerDealInteractions.status,
      dealAddress: deals.address,
      dealCity: deals.city,
      createdAt: buyerDealInteractions.createdAt,
      updatedAt: buyerDealInteractions.updatedAt,
    })
    .from(buyerDealInteractions)
    .innerJoin(deals, eq(buyerDealInteractions.dealId, deals.id))
    .where(eq(buyerDealInteractions.buyerId, buyerId))
    .orderBy(desc(buyerDealInteractions.updatedAt));

  return rows;
}

/**
 * getAllBuyerTags — SELECT DISTINCT tag FROM buyer_tags ORDER BY tag.
 * For filter dropdown.
 */
export async function getAllBuyerTags(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ tag: buyerTags.tag })
    .from(buyerTags)
    .orderBy(asc(buyerTags.tag));

  return rows.map((r) => r.tag);
}

/**
 * getOverdueBuyerFollowups — buyers WHERE follow_up_date <= today AND is_active = true,
 * ordered by follow_up_date, limit 10.
 */
export async function getOverdueBuyerFollowups(): Promise<OverdueBuyer[]> {
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const rows = await db
    .select({
      id: buyers.id,
      name: buyers.name,
      followUpDate: buyers.followUpDate,
    })
    .from(buyers)
    .where(
      and(
        eq(buyers.isActive, true),
        lte(buyers.followUpDate, today)
      )
    )
    .orderBy(asc(buyers.followUpDate))
    .limit(10);

  return rows
    .filter((r): r is typeof r & { followUpDate: string } => r.followUpDate !== null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      followUpDate: r.followUpDate,
    }));
}

/**
 * getBuyersForExport — same as getBuyersForList but returns flat rows suitable for CSV.
 * Tags joined as semicolon-separated string.
 */
export async function getBuyersForExport(
  filters: BuyerListFilters = {}
): Promise<Array<Record<string, unknown>>> {
  const buyerList = await getBuyersForList(filters);

  return buyerList.map((b) => ({
    Name: b.name,
    Phone: b.phone ?? "",
    Email: b.email ?? "",
    "Buy Box": b.buyBox ?? "",
    "Min Price": b.minPrice ?? "",
    "Max Price": b.maxPrice ?? "",
    "Funding Type": b.fundingType ?? "",
    "Target Areas": b.targetAreas ?? "",
    "Rehab Tolerance": b.rehabTolerance ?? "",
    Tags: b.tags.join("; "),
    Status: b.isActive ? "Active" : "Inactive",
    "Last Contacted": b.lastContactedAt
      ? b.lastContactedAt.toISOString().slice(0, 10)
      : "",
    "Follow-Up Date": b.followUpDate ?? "",
    Notes: b.notes ?? "",
  }));
}

/**
 * getInteractionsForDeal — returns a map of buyerId -> interaction status
 * for all buyers that have interacted with a specific deal.
 */
export async function getInteractionsForDeal(
  dealId: string
): Promise<Map<string, string>> {
  const rows = await db
    .select({
      buyerId: buyerDealInteractions.buyerId,
      status: buyerDealInteractions.status,
    })
    .from(buyerDealInteractions)
    .where(eq(buyerDealInteractions.dealId, dealId));

  const map = new Map<string, string>();
  for (const r of rows) {
    map.set(r.buyerId, r.status);
  }
  return map;
}

/**
 * getMatchingBuyersForDeal — enhanced version of getMatchingBuyers:
 * price range AND case-insensitive city match on target_areas.
 * Returns BuyerWithMatchInfo[] with tags via left join.
 */
export async function getMatchingBuyersForDeal(
  dealPrice: number,
  dealCity: string
): Promise<BuyerWithMatchInfo[]> {
  const rows = await db
    .select()
    .from(buyers)
    .where(
      and(
        eq(buyers.isActive, true),
        or(isNull(buyers.maxPrice), gte(buyers.maxPrice, dealPrice)),
        or(isNull(buyers.minPrice), lte(buyers.minPrice, dealPrice))
      )
    )
    .orderBy(asc(buyers.name));

  if (rows.length === 0) return [];

  // Fetch tags for all matching buyers
  const buyerIds = rows.map((r) => r.id);
  const tagRows = await db
    .select({ buyerId: buyerTags.buyerId, tag: buyerTags.tag })
    .from(buyerTags)
    .where(inArray(buyerTags.buyerId, buyerIds));

  const tagMap = new Map<string, string[]>();
  for (const t of tagRows) {
    const existing = tagMap.get(t.buyerId) ?? [];
    existing.push(t.tag);
    tagMap.set(t.buyerId, existing);
  }

  return rows.map((r) => {
    const matchesArea =
      !r.targetAreas ||
      r.targetAreas.toLowerCase().includes(dealCity.toLowerCase());
    return {
      ...r,
      tags: tagMap.get(r.id) ?? [],
      followUpDate: r.followUpDate ?? null,
      lastContactedAt: r.lastContactedAt ?? null,
      matchesArea,
      isFullMatch: matchesArea,
    };
  });
}
