"use server";

import { db } from "@/db/client";
import {
  buyers,
  buyerCommunicationEvents,
  buyerDealInteractions,
  buyerTags,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

const BUYER_COMM_EVENT_TYPES = [
  "called_buyer",
  "left_voicemail",
  "emailed_buyer",
  "sent_text",
  "met_in_person",
  "deal_blast",
  "note",
] as const;

const BUYER_DEAL_INTERACTION_STATUSES = [
  "blasted",
  "interested",
  "closed",
] as const;

// -- Schemas --

const logBuyerCommEventSchema = z.object({
  buyerId: z.uuid(),
  eventType: z.enum(BUYER_COMM_EVENT_TYPES),
  notes: z.string().max(2000).optional(),
  dealId: z.uuid().optional(),
});

const setBuyerFollowUpSchema = z.object({
  buyerId: z.uuid(),
  followUpDate: z.string().nullable(),
});

const addBuyerTagSchema = z.object({
  buyerId: z.uuid(),
  tag: z.string().trim().min(1).max(50),
});

const removeBuyerTagSchema = z.object({
  buyerId: z.uuid(),
  tag: z.string().trim().min(1),
});

const updateBuyerDealInteractionSchema = z.object({
  buyerId: z.uuid(),
  dealId: z.uuid(),
  status: z.enum(BUYER_DEAL_INTERACTION_STATUSES),
});

// -- Action return types --

export type BuyerActionResult = { success: true } | { error: string };
export type ImportBuyersResult = { imported: number; errors: string[] };

// -- Actions --

/**
 * logBuyerCommEvent — insert into buyer_communication_events,
 * also update buyers.lastContactedAt.
 */
export async function logBuyerCommEvent(
  formData: FormData
): Promise<BuyerActionResult> {
  const parsed = logBuyerCommEventSchema.safeParse({
    buyerId: String(formData.get("buyerId") ?? ""),
    eventType: String(formData.get("eventType") ?? ""),
    notes: formData.get("notes") ? String(formData.get("notes")) : undefined,
    dealId: formData.get("dealId")
      ? String(formData.get("dealId"))
      : undefined,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  const { buyerId, eventType, notes, dealId } = parsed.data;

  await db.insert(buyerCommunicationEvents).values({
    buyerId,
    eventType,
    notes: notes ?? null,
    dealId: dealId ?? null,
  });

  await db
    .update(buyers)
    .set({ lastContactedAt: new Date() })
    .where(eq(buyers.id, buyerId));

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyerId}`);
  return { success: true };
}

/**
 * setBuyerFollowUp — update buyers.followUpDate.
 * Pass null followUpDate to clear the reminder.
 */
export async function setBuyerFollowUp(
  formData: FormData
): Promise<BuyerActionResult> {
  const rawFollowUpDate = formData.get("followUpDate");
  const parsed = setBuyerFollowUpSchema.safeParse({
    buyerId: String(formData.get("buyerId") ?? ""),
    followUpDate: rawFollowUpDate ? String(rawFollowUpDate) : null,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  const { buyerId, followUpDate } = parsed.data;

  await db
    .update(buyers)
    .set({ followUpDate: followUpDate ?? null })
    .where(eq(buyers.id, buyerId));

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyerId}`);
  return { success: true };
}

/**
 * addBuyerTag — insert into buyer_tags with onConflictDoNothing.
 */
export async function addBuyerTag(
  formData: FormData
): Promise<BuyerActionResult> {
  const parsed = addBuyerTagSchema.safeParse({
    buyerId: String(formData.get("buyerId") ?? ""),
    tag: String(formData.get("tag") ?? ""),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  const { buyerId, tag } = parsed.data;

  await db
    .insert(buyerTags)
    .values({ buyerId, tag })
    .onConflictDoNothing();

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyerId}`);
  return { success: true };
}

/**
 * removeBuyerTag — delete from buyer_tags WHERE buyerId AND tag.
 */
export async function removeBuyerTag(
  formData: FormData
): Promise<BuyerActionResult> {
  const parsed = removeBuyerTagSchema.safeParse({
    buyerId: String(formData.get("buyerId") ?? ""),
    tag: String(formData.get("tag") ?? ""),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  const { buyerId, tag } = parsed.data;

  await db
    .delete(buyerTags)
    .where(and(eq(buyerTags.buyerId, buyerId), eq(buyerTags.tag, tag)));

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyerId}`);
  return { success: true };
}

/**
 * updateBuyerDealInteraction — upsert buyer_deal_interactions on (buyerId, dealId).
 */
export async function updateBuyerDealInteraction(
  formData: FormData
): Promise<BuyerActionResult> {
  const parsed = updateBuyerDealInteractionSchema.safeParse({
    buyerId: String(formData.get("buyerId") ?? ""),
    dealId: String(formData.get("dealId") ?? ""),
    status: String(formData.get("status") ?? ""),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return { error: firstIssue?.message ?? "Invalid input" };
  }

  const { buyerId, dealId, status } = parsed.data;

  await db
    .insert(buyerDealInteractions)
    .values({ buyerId, dealId, status })
    .onConflictDoUpdate({
      target: [buyerDealInteractions.buyerId, buyerDealInteractions.dealId],
      set: {
        status,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyerId}`);
  return { success: true };
}

/**
 * importBuyers — batch insert with per-row try/catch.
 * Called directly (not FormData) via useTransition.
 */
export async function importBuyers(
  rows: Array<{
    name: string;
    phone?: string;
    email?: string;
    buyBox?: string;
    minPrice?: number;
    maxPrice?: number;
    fundingType?: string;
    targetAreas?: string;
    rehabTolerance?: string;
    notes?: string;
  }>
): Promise<ImportBuyersResult> {
  let imported = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name?.trim()) {
      errors.push(`Row ${i + 1}: name is required`);
      continue;
    }

    try {
      await db.insert(buyers).values({
        name: row.name.trim(),
        phone: row.phone?.trim() ?? null,
        email: row.email?.trim() ?? null,
        buyBox: row.buyBox?.trim() ?? null,
        minPrice: row.minPrice ?? null,
        maxPrice: row.maxPrice ?? null,
        fundingType: row.fundingType?.trim() ?? null,
        targetAreas: row.targetAreas?.trim() ?? null,
        rehabTolerance: row.rehabTolerance?.trim() ?? null,
        notes: row.notes?.trim() ?? null,
      });
      imported++;
    } catch (err) {
      errors.push(
        `Row ${i + 1} (${row.name}): ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  revalidatePath("/buyers");
  return { imported, errors };
}

/**
 * logDealBlast — insert buyer_communication_events with eventType "deal_blast"
 * + upsert buyer_deal_interactions with status "blasted" (onConflictDoNothing).
 * Also update buyers.lastContactedAt.
 */
export async function logDealBlast(
  buyerId: string,
  dealId: string
): Promise<BuyerActionResult> {
  if (!buyerId || !dealId) {
    return { error: "buyerId and dealId are required" };
  }

  await db.insert(buyerCommunicationEvents).values({
    buyerId,
    dealId,
    eventType: "deal_blast",
  });

  await db
    .insert(buyerDealInteractions)
    .values({ buyerId, dealId, status: "blasted" })
    .onConflictDoNothing();

  await db
    .update(buyers)
    .set({ lastContactedAt: new Date() })
    .where(eq(buyers.id, buyerId));

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${buyerId}`);
  return { success: true };
}
