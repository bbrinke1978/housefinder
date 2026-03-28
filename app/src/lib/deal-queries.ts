import { db } from "@/db/client";
import { deals, buyers, dealNotes } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { DealWithBuyer, DealNote } from "@/types";

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
