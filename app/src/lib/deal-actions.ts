"use server";

import { db } from "@/db/client";
import { deals, dealNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { DEAL_STATUSES } from "@/types";

// -- Create Deal --

const createDealSchema = z.object({
  address: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  sellerName: z.string().max(255).optional(),
  sellerPhone: z.string().max(50).optional(),
  condition: z.enum(["light", "medium", "heavy", "tear_down"]).optional(),
  timeline: z.enum(["asap", "1_month", "3_months", "flexible"]).optional(),
  motivation: z
    .enum(["inherited", "financial_distress", "vacant", "divorce", "other"])
    .optional(),
  askingPrice: z.number().int().positive().optional(),
  arv: z.number().int().positive().optional(),
  repairEstimate: z.number().int().nonnegative().optional(),
  wholesaleFee: z.number().int().nonnegative().optional(),
  propertyId: z.uuid().optional(),
});

/**
 * createDeal — insert a new deal record.
 * Auto-computes MAO if arv + repairEstimate provided.
 * Redirects to /deals/[id] on success.
 */
export async function createDeal(formData: FormData): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const raw = {
    address: formData.get("address") as string,
    city: formData.get("city") as string,
    sellerName: formData.get("sellerName") as string | null,
    sellerPhone: formData.get("sellerPhone") as string | null,
    condition: formData.get("condition") as string | null,
    timeline: formData.get("timeline") as string | null,
    motivation: formData.get("motivation") as string | null,
    askingPrice: formData.get("askingPrice")
      ? parseInt(formData.get("askingPrice") as string, 10)
      : undefined,
    arv: formData.get("arv")
      ? parseInt(formData.get("arv") as string, 10)
      : undefined,
    repairEstimate: formData.get("repairEstimate")
      ? parseInt(formData.get("repairEstimate") as string, 10)
      : undefined,
    wholesaleFee: formData.get("wholesaleFee")
      ? parseInt(formData.get("wholesaleFee") as string, 10)
      : undefined,
    propertyId: formData.get("propertyId") as string | null,
  };

  // Strip empty strings to undefined for optional fields
  const cleaned = {
    address: raw.address,
    city: raw.city,
    sellerName: raw.sellerName || undefined,
    sellerPhone: raw.sellerPhone || undefined,
    condition: raw.condition || undefined,
    timeline: raw.timeline || undefined,
    motivation: raw.motivation || undefined,
    askingPrice: raw.askingPrice,
    arv: raw.arv,
    repairEstimate: raw.repairEstimate,
    wholesaleFee: raw.wholesaleFee,
    propertyId: raw.propertyId || undefined,
  };

  const parsed = createDealSchema.parse(cleaned);

  // Auto-compute MAO: ARV * 0.70 - repairEstimate - wholesaleFee
  let mao: number | null = null;
  if (
    parsed.arv !== undefined &&
    parsed.repairEstimate !== undefined
  ) {
    const fee = parsed.wholesaleFee ?? 15000;
    mao = Math.round(parsed.arv * 0.7 - parsed.repairEstimate - fee);
  }

  const [inserted] = await db
    .insert(deals)
    .values({
      address: parsed.address,
      city: parsed.city,
      sellerName: parsed.sellerName ?? null,
      sellerPhone: parsed.sellerPhone ?? null,
      condition: parsed.condition ?? null,
      timeline: parsed.timeline ?? null,
      motivation: parsed.motivation ?? null,
      askingPrice: parsed.askingPrice ?? null,
      arv: parsed.arv ?? null,
      repairEstimate: parsed.repairEstimate ?? null,
      wholesaleFee: parsed.wholesaleFee ?? 15000,
      mao: mao,
      propertyId: parsed.propertyId ?? null,
      status: "lead",
    })
    .returning({ id: deals.id });

  // Auto-create "Deal created" status_change note
  await db.insert(dealNotes).values({
    dealId: inserted.id,
    noteText: "Deal created",
    noteType: "status_change",
    newStatus: "lead",
  });

  revalidatePath("/deals");
  redirect(`/deals/${inserted.id}`);
}

// -- Update Deal Status --

const updateDealStatusSchema = z.object({
  dealId: z.uuid(),
  status: z.enum(DEAL_STATUSES),
  note: z.string().max(2000).optional(),
});

/**
 * updateDealStatus — change a deal's pipeline status.
 * Auto-logs the status change as a note.
 */
export async function updateDealStatus(
  dealId: string,
  status: string,
  note?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const parsed = updateDealStatusSchema.parse({ dealId, status, note });

  // Fetch current status
  const [existing] = await db
    .select({ status: deals.status })
    .from(deals)
    .where(eq(deals.id, parsed.dealId))
    .limit(1);

  if (!existing) {
    throw new Error("Deal not found");
  }

  const previousStatus = existing.status;

  await db
    .update(deals)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(deals.id, parsed.dealId));

  // Auto-log status change
  if (previousStatus !== parsed.status) {
    await db.insert(dealNotes).values({
      dealId: parsed.dealId,
      noteText: `Status changed from ${previousStatus} to ${parsed.status}`,
      noteType: "status_change",
      previousStatus,
      newStatus: parsed.status,
    });
  }

  // Optional user note
  if (parsed.note && parsed.note.trim().length > 0) {
    await db.insert(dealNotes).values({
      dealId: parsed.dealId,
      noteText: parsed.note.trim(),
      noteType: "user",
    });
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${parsed.dealId}`);
}

// -- Update Deal --

const updateDealSchema = z.object({
  dealId: z.uuid(),
  address: z.string().min(1).max(255).optional(),
  city: z.string().min(1).max(100).optional(),
  sellerName: z.string().max(255).optional(),
  sellerPhone: z.string().max(50).optional(),
  condition: z.enum(["light", "medium", "heavy", "tear_down"]).optional(),
  timeline: z.enum(["asap", "1_month", "3_months", "flexible"]).optional(),
  motivation: z
    .enum(["inherited", "financial_distress", "vacant", "divorce", "other"])
    .optional(),
  askingPrice: z.number().int().positive().optional(),
  arv: z.number().int().positive().optional(),
  repairEstimate: z.number().int().nonnegative().optional(),
  wholesaleFee: z.number().int().nonnegative().optional(),
  offerPrice: z.number().int().positive().optional(),
  assignmentFee: z.number().int().nonnegative().optional(),
  closingDate: z.string().optional(),
  contractStatus: z.string().optional(),
  earnestMoney: z.number().int().nonnegative().optional(),
  inspectionDeadline: z.string().optional(),
  earnestMoneyRefundable: z.boolean().optional(),
});

/**
 * updateDeal — update editable deal fields.
 * Auto-recomputes MAO if arv/repairEstimate/wholesaleFee changed.
 */
export async function updateDeal(
  dealId: string,
  data: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const parseOptionalInt = (key: string) => {
    const val = data.get(key) as string | null;
    if (!val) return undefined;
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  };

  const parseOptionalString = (key: string) => {
    const val = data.get(key) as string | null;
    return val || undefined;
  };

  const raw = {
    dealId,
    address: parseOptionalString("address"),
    city: parseOptionalString("city"),
    sellerName: parseOptionalString("sellerName"),
    sellerPhone: parseOptionalString("sellerPhone"),
    condition: parseOptionalString("condition"),
    timeline: parseOptionalString("timeline"),
    motivation: parseOptionalString("motivation"),
    askingPrice: parseOptionalInt("askingPrice"),
    arv: parseOptionalInt("arv"),
    repairEstimate: parseOptionalInt("repairEstimate"),
    wholesaleFee: parseOptionalInt("wholesaleFee"),
    offerPrice: parseOptionalInt("offerPrice"),
    assignmentFee: parseOptionalInt("assignmentFee"),
    closingDate: parseOptionalString("closingDate"),
    contractStatus: parseOptionalString("contractStatus"),
    earnestMoney: parseOptionalInt("earnestMoney"),
    inspectionDeadline: parseOptionalString("inspectionDeadline"),
    earnestMoneyRefundable:
      data.get("earnestMoneyRefundable") !== null
        ? data.get("earnestMoneyRefundable") === "true"
        : undefined,
  };

  const parsed = updateDealSchema.parse(raw);

  // Build update object — only include fields that were provided
  const updateFields: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.address !== undefined) updateFields.address = parsed.address;
  if (parsed.city !== undefined) updateFields.city = parsed.city;
  if (parsed.sellerName !== undefined) updateFields.sellerName = parsed.sellerName;
  if (parsed.sellerPhone !== undefined) updateFields.sellerPhone = parsed.sellerPhone;
  if (parsed.condition !== undefined) updateFields.condition = parsed.condition;
  if (parsed.timeline !== undefined) updateFields.timeline = parsed.timeline;
  if (parsed.motivation !== undefined) updateFields.motivation = parsed.motivation;
  if (parsed.askingPrice !== undefined) updateFields.askingPrice = parsed.askingPrice;
  if (parsed.arv !== undefined) updateFields.arv = parsed.arv;
  if (parsed.repairEstimate !== undefined) updateFields.repairEstimate = parsed.repairEstimate;
  if (parsed.wholesaleFee !== undefined) updateFields.wholesaleFee = parsed.wholesaleFee;
  if (parsed.offerPrice !== undefined) updateFields.offerPrice = parsed.offerPrice;
  if (parsed.assignmentFee !== undefined) updateFields.assignmentFee = parsed.assignmentFee;
  if (parsed.closingDate !== undefined) updateFields.closingDate = parsed.closingDate;
  if (parsed.contractStatus !== undefined) updateFields.contractStatus = parsed.contractStatus;
  if (parsed.earnestMoney !== undefined) updateFields.earnestMoney = parsed.earnestMoney;
  if (parsed.inspectionDeadline !== undefined) updateFields.inspectionDeadline = parsed.inspectionDeadline;
  if (parsed.earnestMoneyRefundable !== undefined) updateFields.earnestMoneyRefundable = parsed.earnestMoneyRefundable;

  // Recompute MAO if financial fields changed
  if (
    parsed.arv !== undefined ||
    parsed.repairEstimate !== undefined ||
    parsed.wholesaleFee !== undefined
  ) {
    // Fetch current values for fields not supplied
    const [current] = await db
      .select({
        arv: deals.arv,
        repairEstimate: deals.repairEstimate,
        wholesaleFee: deals.wholesaleFee,
      })
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (current) {
      const arv = parsed.arv ?? current.arv;
      const repairEstimate = parsed.repairEstimate ?? current.repairEstimate;
      const wholesaleFee = parsed.wholesaleFee ?? current.wholesaleFee;
      if (arv !== null && repairEstimate !== null) {
        const fee = wholesaleFee ?? 15000;
        updateFields.mao = Math.round(arv * 0.7 - repairEstimate - fee);
      }
    }
  }

  await db.update(deals).set(updateFields).where(eq(deals.id, dealId));

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}
