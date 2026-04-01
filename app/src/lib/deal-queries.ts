import { db } from "@/db/client";
import { deals, buyers, dealNotes, ownerContacts } from "@/db/schema";
import { eq, desc, gte, lte, or, isNull, and } from "drizzle-orm";
import type { DealWithBuyer, DealNote, Buyer, OwnerContact } from "@/types";

/**
 * getDeals — returns all deals joined with buyer name, newest-updated first.
 */
export async function getDeals(): Promise<DealWithBuyer[]> {
  const rows = await db
    .select({
      id: deals.id,
      propertyId: deals.propertyId,
      address: deals.address,
      city: deals.city,
      state: deals.state,
      sellerName: deals.sellerName,
      sellerPhone: deals.sellerPhone,
      condition: deals.condition,
      timeline: deals.timeline,
      motivation: deals.motivation,
      askingPrice: deals.askingPrice,
      arv: deals.arv,
      repairEstimate: deals.repairEstimate,
      wholesaleFee: deals.wholesaleFee,
      mao: deals.mao,
      offerPrice: deals.offerPrice,
      status: deals.status,
      assignedBuyerId: deals.assignedBuyerId,
      assignmentFee: deals.assignmentFee,
      closingDate: deals.closingDate,
      contractStatus: deals.contractStatus,
      earnestMoney: deals.earnestMoney,
      inspectionDeadline: deals.inspectionDeadline,
      earnestMoneyRefundable: deals.earnestMoneyRefundable,
      comps: deals.comps,
      arvNotes: deals.arvNotes,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      buyerName: buyers.name,
    })
    .from(deals)
    .leftJoin(buyers, eq(deals.assignedBuyerId, buyers.id))
    .orderBy(desc(deals.updatedAt));

  return rows as unknown as DealWithBuyer[];
}

/**
 * getDeal — returns a single deal by ID with buyer name.
 * Returns null if not found.
 */
export async function getDeal(id: string): Promise<DealWithBuyer | null> {
  const rows = await db
    .select({
      id: deals.id,
      propertyId: deals.propertyId,
      address: deals.address,
      city: deals.city,
      state: deals.state,
      sellerName: deals.sellerName,
      sellerPhone: deals.sellerPhone,
      condition: deals.condition,
      timeline: deals.timeline,
      motivation: deals.motivation,
      askingPrice: deals.askingPrice,
      arv: deals.arv,
      repairEstimate: deals.repairEstimate,
      wholesaleFee: deals.wholesaleFee,
      mao: deals.mao,
      offerPrice: deals.offerPrice,
      status: deals.status,
      assignedBuyerId: deals.assignedBuyerId,
      assignmentFee: deals.assignmentFee,
      closingDate: deals.closingDate,
      contractStatus: deals.contractStatus,
      earnestMoney: deals.earnestMoney,
      inspectionDeadline: deals.inspectionDeadline,
      earnestMoneyRefundable: deals.earnestMoneyRefundable,
      comps: deals.comps,
      arvNotes: deals.arvNotes,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      buyerName: buyers.name,
    })
    .from(deals)
    .leftJoin(buyers, eq(deals.assignedBuyerId, buyers.id))
    .where(eq(deals.id, id))
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0] as unknown as DealWithBuyer;
}

/**
 * getBuyers — returns all active buyers ordered by name ascending.
 */
export async function getBuyers(): Promise<Buyer[]> {
  const rows = await db
    .select()
    .from(buyers)
    .where(eq(buyers.isActive, true))
    .orderBy(buyers.name);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    buyBox: r.buyBox,
    minPrice: r.minPrice,
    maxPrice: r.maxPrice,
    fundingType: r.fundingType,
    targetAreas: r.targetAreas,
    rehabTolerance: r.rehabTolerance,
    notes: r.notes,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * getMatchingBuyers — returns active buyers whose price range includes dealPrice.
 * Buyers with no min/max are considered a match (open to any price).
 */
export async function getMatchingBuyers(dealPrice: number): Promise<Buyer[]> {
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
    .orderBy(buyers.name);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    buyBox: r.buyBox,
    minPrice: r.minPrice,
    maxPrice: r.maxPrice,
    fundingType: r.fundingType,
    targetAreas: r.targetAreas,
    rehabTolerance: r.rehabTolerance,
    notes: r.notes,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * getDealContacts — returns owner contacts for the property linked to a deal.
 * Returns empty array if the deal has no propertyId.
 */
export async function getDealContacts(dealId: string): Promise<OwnerContact[]> {
  // Fetch the propertyId for this deal
  const [row] = await db
    .select({ propertyId: deals.propertyId })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!row?.propertyId) return [];

  const contacts = await db
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
    .where(eq(ownerContacts.propertyId, row.propertyId))
    .orderBy(desc(ownerContacts.isManual), desc(ownerContacts.createdAt));

  return contacts as unknown as OwnerContact[];
}

/**
 * getDealNotes — returns all notes for a deal in reverse chronological order.
 */
export async function getDealNotes(dealId: string): Promise<DealNote[]> {
  const rows = await db
    .select()
    .from(dealNotes)
    .where(eq(dealNotes.dealId, dealId))
    .orderBy(desc(dealNotes.createdAt));

  return rows.map((r) => ({
    id: r.id,
    dealId: r.dealId,
    noteText: r.noteText,
    noteType: r.noteType as "user" | "status_change",
    previousStatus: r.previousStatus,
    newStatus: r.newStatus,
    createdAt: r.createdAt,
  }));
}
