"use server";

import { db } from "@/db/client";
import { deals, dealNotes, buyers, ownerContacts, propertyPhotos, floorPlans, floorPlanPins } from "@/db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { DEAL_STATUSES } from "@/types";
import { userCan } from "@/lib/permissions";
import type { Role } from "@/lib/permissions";
import { logAudit } from "@/lib/audit-log";

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

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "deal.create")) {
    throw new Error("Forbidden: insufficient role");
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

  // Auto-fill sellerPhone from owner_contacts if not provided and propertyId given
  let resolvedPhone = parsed.sellerPhone ?? null;
  if (!resolvedPhone && parsed.propertyId) {
    const contacts = await db
      .select({ phone: ownerContacts.phone, email: ownerContacts.email })
      .from(ownerContacts)
      .where(eq(ownerContacts.propertyId, parsed.propertyId))
      .orderBy(desc(ownerContacts.isManual), desc(ownerContacts.createdAt))
      .limit(5);
    const primaryPhone = contacts.find((c) => c.phone)?.phone ?? null;
    if (primaryPhone) resolvedPhone = primaryPhone;
  }

  // Auto-compute MAO: ARV * 0.65 - repairEstimate - wholesaleFee
  let mao: number | null = null;
  if (
    parsed.arv !== undefined &&
    parsed.repairEstimate !== undefined
  ) {
    const fee = parsed.wholesaleFee ?? 15000;
    mao = Math.round(parsed.arv * 0.65 - parsed.repairEstimate - fee);
  }

  const [inserted] = await db
    .insert(deals)
    .values({
      address: parsed.address,
      city: parsed.city,
      sellerName: parsed.sellerName ?? null,
      sellerPhone: resolvedPhone,
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

  // Carry over property photos to the new deal (best-effort)
  if (parsed.propertyId) {
    try {
      await db
        .update(propertyPhotos)
        .set({ dealId: inserted.id, isInbox: false })
        .where(
          and(
            eq(propertyPhotos.propertyId, parsed.propertyId),
            isNull(propertyPhotos.dealId)
          )
        );

      // Auto-set cover: find first exterior photo for this deal with no existing cover
      const existingCover = await db
        .select({ id: propertyPhotos.id })
        .from(propertyPhotos)
        .where(
          and(
            eq(propertyPhotos.dealId, inserted.id),
            eq(propertyPhotos.isCover, true)
          )
        )
        .limit(1);

      if (existingCover.length === 0) {
        const firstExterior = await db
          .select({ id: propertyPhotos.id })
          .from(propertyPhotos)
          .where(
            and(
              eq(propertyPhotos.dealId, inserted.id),
              eq(propertyPhotos.category, "exterior")
            )
          )
          .limit(1);

        if (firstExterior.length > 0) {
          await db
            .update(propertyPhotos)
            .set({ isCover: true })
            .where(eq(propertyPhotos.id, firstExterior[0].id));
        }
      }
    } catch (err) {
      console.error("[createDeal] Failed to carry over property photos:", err);
    }
  }

  // Floor plan carry-over (best-effort — deal creation never blocked by failure)
  if (parsed.propertyId) {
    try {
      const propertyPlans = await db
        .select()
        .from(floorPlans)
        .where(eq(floorPlans.propertyId, parsed.propertyId));

      let totalCarriedSqft = 0;

      for (const plan of propertyPlans) {
        const newPlanId = randomUUID();

        await db.insert(floorPlans).values({
          id: newPlanId,
          dealId: inserted.id,
          propertyId: null,
          floorLabel: plan.floorLabel,
          version: plan.version,
          sourceType: plan.sourceType,
          blobName: plan.blobName,
          blobUrl: plan.blobUrl,
          mimeType: plan.mimeType,
          naturalWidth: plan.naturalWidth,
          naturalHeight: plan.naturalHeight,
          totalSqft: plan.totalSqft,
          sortOrder: plan.sortOrder,
          sketchData: plan.sketchData,
          shareToken: null,
          shareExpiresAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        totalCarriedSqft += plan.totalSqft ?? 0;

        // Copy pins for this plan
        const pins = await db
          .select()
          .from(floorPlanPins)
          .where(eq(floorPlanPins.floorPlanId, plan.id));

        if (pins.length > 0) {
          await db.insert(floorPlanPins).values(
            pins.map((pin) => ({
              id: randomUUID(),
              floorPlanId: newPlanId,
              xPct: pin.xPct,
              yPct: pin.yPct,
              category: pin.category,
              note: pin.note,
              budgetCategoryId: null, // budget categories don't carry over
              sortOrder: pin.sortOrder,
              createdAt: new Date(),
            }))
          );
        }
      }

      // Set deal.sqft from sum of carried-over plans
      if (totalCarriedSqft > 0) {
        await db
          .update(deals)
          .set({ sqft: totalCarriedSqft })
          .where(eq(deals.id, inserted.id));
      }
    } catch (err) {
      console.error("[createDeal] Failed to carry over floor plans:", err);
    }
  }

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "deal.created",
    entityType: "deal",
    entityId: inserted.id,
    newValue: { address: parsed.address, city: parsed.city, offerPrice: parsed.arv, mao },
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

  const roles = ((session.user as any).roles ?? []) as Role[];
  // Gate based on destination status
  const dispositionStatuses = ["marketing", "assigned"];
  const closingStatuses = ["under_contract", "closing", "closed"];
  let requiredAction: "deal.edit_terms" | "deal.edit_disposition" | "deal.edit_closing_logistics" = "deal.edit_terms";
  if (dispositionStatuses.includes(status)) requiredAction = "deal.edit_disposition";
  if (closingStatuses.includes(status)) requiredAction = "deal.edit_closing_logistics";
  if (!userCan(roles, requiredAction)) {
    throw new Error("Forbidden: insufficient role");
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

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "deal.status_changed",
    entityType: "deal",
    entityId: parsed.dealId,
    oldValue: { status: previousStatus },
    newValue: { status: parsed.status },
  });

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

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "deal.edit_terms")) {
    throw new Error("Forbidden: insufficient role");
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
        updateFields.mao = Math.round(arv * 0.65 - repairEstimate - fee);
      }
    }
  }

  await db.update(deals).set(updateFields).where(eq(deals.id, dealId));

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "deal.terms_updated",
    entityType: "deal",
    entityId: dealId,
    newValue: { arv: parsed.arv, offerPrice: parsed.offerPrice, mao: updateFields.mao },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

// -- Update Deal Comps --

/**
 * updateDealComps — save JSON array of comparable sales and optional ARV notes.
 */
export async function updateDealComps(
  dealId: string,
  comps: string,
  arvNotes: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "deal.edit_terms")) {
    throw new Error("Forbidden: insufficient role");
  }

  await db
    .update(deals)
    .set({ comps, arvNotes, updatedAt: new Date() })
    .where(eq(deals.id, dealId));

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "deal.comps_updated",
    entityType: "deal",
    entityId: dealId,
    newValue: { arvNotesLength: arvNotes.length },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

// -- Add Deal Note --

const addDealNoteSchema = z.object({
  dealId: z.uuid(),
  noteText: z.string().min(1).max(2000),
});

/**
 * addDealNote — insert a user note for a deal.
 */
export async function addDealNote(
  dealId: string,
  noteText: string
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "deal.edit_terms")) {
    throw new Error("Forbidden: insufficient role");
  }

  const parsed = addDealNoteSchema.parse({ dealId, noteText });

  await db.insert(dealNotes).values({
    dealId: parsed.dealId,
    noteText: parsed.noteText,
    noteType: "user",
  });

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "deal.note_added",
    entityType: "deal",
    entityId: parsed.dealId,
    newValue: { noteText: parsed.noteText },
  });

  revalidatePath(`/deals/${parsed.dealId}`);
}

// -- Buyer Actions --

const buyerSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  buyBox: z.string().max(2000).optional(),
  minPrice: z.number().int().nonnegative().optional(),
  maxPrice: z.number().int().nonnegative().optional(),
  fundingType: z.enum(["cash", "hard_money", "both"]).optional(),
  targetAreas: z.string().max(1000).optional(),
  rehabTolerance: z.enum(["light", "medium", "heavy", "any"]).optional(),
  notes: z.string().max(2000).optional(),
});

function parseBuyerFormData(data: FormData) {
  const parseOptionalInt = (key: string) => {
    const val = data.get(key) as string | null;
    if (!val || val.trim() === "") return undefined;
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
  };
  const parseOptionalStr = (key: string) => {
    const val = data.get(key) as string | null;
    return val && val.trim().length > 0 ? val.trim() : undefined;
  };
  return {
    name: (data.get("name") as string) ?? "",
    phone: parseOptionalStr("phone"),
    email: parseOptionalStr("email"),
    buyBox: parseOptionalStr("buyBox"),
    minPrice: parseOptionalInt("minPrice"),
    maxPrice: parseOptionalInt("maxPrice"),
    fundingType: parseOptionalStr("fundingType"),
    targetAreas: parseOptionalStr("targetAreas"),
    rehabTolerance: parseOptionalStr("rehabTolerance"),
    notes: parseOptionalStr("notes"),
  };
}

/**
 * createBuyer — insert a new buyer record.
 */
export async function createBuyer(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "buyer.create_or_edit")) {
    throw new Error("Forbidden: insufficient role");
  }

  const raw = parseBuyerFormData(formData);
  const parsed = buyerSchema.parse(raw);

  const [inserted] = await db.insert(buyers).values({
    name: parsed.name,
    phone: parsed.phone ?? null,
    email: parsed.email ?? null,
    buyBox: parsed.buyBox ?? null,
    minPrice: parsed.minPrice ?? null,
    maxPrice: parsed.maxPrice ?? null,
    fundingType: parsed.fundingType ?? null,
    targetAreas: parsed.targetAreas ?? null,
    rehabTolerance: parsed.rehabTolerance ?? null,
    notes: parsed.notes ?? null,
  }).returning({ id: buyers.id });

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "buyer.created",
    entityType: "buyer",
    entityId: inserted.id,
    newValue: { name: parsed.name, email: parsed.email },
  });

  revalidatePath("/deals/buyers");
}

/**
 * updateBuyer — update an existing buyer's fields.
 */
export async function updateBuyer(
  buyerId: string,
  formData: FormData
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "buyer.create_or_edit")) {
    throw new Error("Forbidden: insufficient role");
  }

  const raw = parseBuyerFormData(formData);
  const parsed = buyerSchema.parse(raw);

  await db
    .update(buyers)
    .set({
      name: parsed.name,
      phone: parsed.phone ?? null,
      email: parsed.email ?? null,
      buyBox: parsed.buyBox ?? null,
      minPrice: parsed.minPrice ?? null,
      maxPrice: parsed.maxPrice ?? null,
      fundingType: parsed.fundingType ?? null,
      targetAreas: parsed.targetAreas ?? null,
      rehabTolerance: parsed.rehabTolerance ?? null,
      notes: parsed.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(buyers.id, buyerId));

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "buyer.updated",
    entityType: "buyer",
    entityId: buyerId,
    newValue: { name: parsed.name },
  });

  revalidatePath("/deals/buyers");
}

/**
 * deactivateBuyer — soft-delete a buyer (set isActive = false).
 */
export async function deactivateBuyer(buyerId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "buyer.create_or_edit")) {
    throw new Error("Forbidden: insufficient role");
  }

  await db
    .update(buyers)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(buyers.id, buyerId));

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "buyer.deactivated",
    entityType: "buyer",
    entityId: buyerId,
  });

  revalidatePath("/deals/buyers");
}

/**
 * assignBuyerToDeal — assign a buyer to a deal and set assignment fee.
 * Auto-advances deal status to "assigned" if currently "marketing".
 */
export async function assignBuyerToDeal(
  dealId: string,
  buyerId: string,
  assignmentFee: number
): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const roles = ((session.user as any).roles ?? []) as Role[];
  if (!userCan(roles, "deal.edit_disposition")) {
    throw new Error("Forbidden: insufficient role");
  }

  const [existing] = await db
    .select({ status: deals.status })
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!existing) {
    throw new Error("Deal not found");
  }

  const newStatus =
    existing.status === "marketing" ? "assigned" : existing.status;

  await db
    .update(deals)
    .set({
      assignedBuyerId: buyerId,
      assignmentFee,
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));

  if (newStatus !== existing.status) {
    await db.insert(dealNotes).values({
      dealId,
      noteText: `Status changed from ${existing.status} to ${newStatus}`,
      noteType: "status_change",
      previousStatus: existing.status,
      newStatus,
    });
  }

  await logAudit({
    actorUserId: (session.user as any).id ?? null,
    action: "deal.buyer_assigned",
    entityType: "deal",
    entityId: dealId,
    newValue: { buyerId, assignmentFee, status: newStatus },
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}
