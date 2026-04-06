"use server";

import { db } from "@/db/client";
import { floorPlans, floorPlanPins, deals } from "@/db/schema";
import { eq, sum } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { uploadFloorPlanBlob } from "@/lib/blob-storage";
import { randomUUID } from "crypto";

// Allowed MIME types for floor plan uploads
type FloorPlanMimeType = "application/pdf" | "image/jpeg" | "image/png";

function getExtFromMime(mimeType: string): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return "bin";
  }
}

/**
 * Recalculate deal.sqft as the sum of all floor plans' totalSqft for a deal.
 * Called after createFloorPlan, updateFloorPlan, and deleteFloorPlan.
 */
async function recalculateDealSqft(dealId: string): Promise<void> {
  const result = await db
    .select({ total: sum(floorPlans.totalSqft) })
    .from(floorPlans)
    .where(eq(floorPlans.dealId, dealId));

  const totalSqft = result[0]?.total ? Number(result[0].total) : null;

  await db
    .update(deals)
    .set({ sqft: totalSqft })
    .where(eq(deals.id, dealId));
}

/**
 * createFloorPlan — create a new floor plan record.
 * Handles both upload and sketch sourceType.
 * For uploads: reads file from FormData, uploads to blob storage.
 * For sketch: stores sketchData JSON string.
 */
export async function createFloorPlan(
  formData: FormData
): Promise<{ id: string }> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const dealId = (formData.get("dealId") as string | null) || null;
  const propertyId = (formData.get("propertyId") as string | null) || null;
  const floorLabel = (formData.get("floorLabel") as string) || "main";
  const version = (formData.get("version") as string) || "as-is";
  const sourceType = formData.get("sourceType") as string;
  const naturalWidthStr = formData.get("naturalWidth") as string | null;
  const naturalHeightStr = formData.get("naturalHeight") as string | null;
  const totalSqftStr = formData.get("totalSqft") as string | null;
  const sortOrderStr = formData.get("sortOrder") as string | null;

  const naturalWidth = naturalWidthStr ? parseInt(naturalWidthStr, 10) : null;
  const naturalHeight = naturalHeightStr ? parseInt(naturalHeightStr, 10) : null;
  const totalSqft = totalSqftStr ? parseInt(totalSqftStr, 10) : null;
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;

  const planId = randomUUID();

  if (sourceType === "upload") {
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("No file provided for upload floor plan");

    const mimeType = (file.type || "image/jpeg") as FloorPlanMimeType;
    const ext = getExtFromMime(mimeType);
    const blobName = `${dealId ?? propertyId ?? "unlinked"}/${planId}-${floorLabel}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const blobUrl = await uploadFloorPlanBlob(buffer, blobName, mimeType);

    await db.insert(floorPlans).values({
      id: planId,
      dealId,
      propertyId,
      floorLabel,
      version,
      sourceType: "upload",
      blobName,
      blobUrl,
      mimeType,
      naturalWidth,
      naturalHeight,
      totalSqft,
      sortOrder,
    });
  } else {
    // sketch
    const sketchData = (formData.get("sketchData") as string | null) || null;

    await db.insert(floorPlans).values({
      id: planId,
      dealId,
      propertyId,
      floorLabel,
      version,
      sourceType: "sketch",
      sketchData,
      naturalWidth,
      naturalHeight,
      totalSqft,
      sortOrder,
    });
  }

  // Recalculate deal sqft if linked to a deal
  if (dealId) {
    await recalculateDealSqft(dealId);
    revalidatePath(`/deals/${dealId}`);
  } else if (propertyId) {
    revalidatePath(`/properties/${propertyId}`);
  }

  return { id: planId };
}

/**
 * updateFloorPlan — update floor plan metadata (floorLabel, version, sketchData, totalSqft).
 * When totalSqft changes and dealId exists, recalculates deal.sqft.
 */
export async function updateFloorPlan(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const planId = formData.get("planId") as string;
  if (!planId) throw new Error("planId is required");

  const floorLabel = formData.get("floorLabel") as string | null;
  const version = formData.get("version") as string | null;
  const sketchData = formData.get("sketchData") as string | null;
  const totalSqftStr = formData.get("totalSqft") as string | null;

  const updateValues: Partial<typeof floorPlans.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (floorLabel !== null) updateValues.floorLabel = floorLabel;
  if (version !== null) updateValues.version = version;
  if (sketchData !== null) updateValues.sketchData = sketchData;
  if (totalSqftStr !== null)
    updateValues.totalSqft = totalSqftStr ? parseInt(totalSqftStr, 10) : null;

  await db.update(floorPlans).set(updateValues).where(eq(floorPlans.id, planId));

  // Recalculate deal sqft if this plan belongs to a deal
  if (totalSqftStr !== null) {
    const rows = await db
      .select({ dealId: floorPlans.dealId })
      .from(floorPlans)
      .where(eq(floorPlans.id, planId))
      .limit(1);

    const dealId = rows[0]?.dealId;
    if (dealId) {
      await recalculateDealSqft(dealId);
      revalidatePath(`/deals/${dealId}`);
    }
  } else {
    // Still revalidate the deal path if linked
    const rows = await db
      .select({ dealId: floorPlans.dealId, propertyId: floorPlans.propertyId })
      .from(floorPlans)
      .where(eq(floorPlans.id, planId))
      .limit(1);

    const row = rows[0];
    if (row?.dealId) {
      revalidatePath(`/deals/${row.dealId}`);
    } else if (row?.propertyId) {
      revalidatePath(`/properties/${row.propertyId}`);
    }
  }
}

/**
 * deleteFloorPlan — delete a floor plan (cascade deletes pins).
 * Does NOT delete the blob for safety. Recalculates deal sqft after deletion.
 */
export async function deleteFloorPlan(planId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  // Fetch before delete to get dealId/propertyId for revalidation
  const rows = await db
    .select({ dealId: floorPlans.dealId, propertyId: floorPlans.propertyId })
    .from(floorPlans)
    .where(eq(floorPlans.id, planId))
    .limit(1);

  if (rows.length === 0) return;
  const { dealId, propertyId } = rows[0];

  await db.delete(floorPlans).where(eq(floorPlans.id, planId));

  if (dealId) {
    await recalculateDealSqft(dealId);
    revalidatePath(`/deals/${dealId}`);
  } else if (propertyId) {
    revalidatePath(`/properties/${propertyId}`);
  }
}

/**
 * createPin — insert a new annotation pin on a floor plan.
 */
export async function createPin(
  formData: FormData
): Promise<{ id: string }> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const floorPlanId = formData.get("floorPlanId") as string;
  if (!floorPlanId) throw new Error("floorPlanId is required");

  const xPct = parseFloat(formData.get("xPct") as string);
  const yPct = parseFloat(formData.get("yPct") as string);
  const category = (formData.get("category") as string) || "general";
  const note = (formData.get("note") as string | null) || null;
  const budgetCategoryId =
    (formData.get("budgetCategoryId") as string | null) || null;
  const sortOrderStr = formData.get("sortOrder") as string | null;
  const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : 0;

  const [inserted] = await db
    .insert(floorPlanPins)
    .values({
      floorPlanId,
      xPct,
      yPct,
      category,
      note,
      budgetCategoryId,
      sortOrder,
    })
    .returning({ id: floorPlanPins.id });

  // Revalidate the deal page that contains this floor plan
  const planRows = await db
    .select({ dealId: floorPlans.dealId, propertyId: floorPlans.propertyId })
    .from(floorPlans)
    .where(eq(floorPlans.id, floorPlanId))
    .limit(1);

  const row = planRows[0];
  if (row?.dealId) {
    revalidatePath(`/deals/${row.dealId}`);
  } else if (row?.propertyId) {
    revalidatePath(`/properties/${row.propertyId}`);
  }

  return { id: inserted.id };
}

/**
 * deletePin — delete a single annotation pin.
 */
export async function deletePin(pinId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  // Fetch before delete for revalidation
  const pinRows = await db
    .select({ floorPlanId: floorPlanPins.floorPlanId })
    .from(floorPlanPins)
    .where(eq(floorPlanPins.id, pinId))
    .limit(1);

  if (pinRows.length === 0) return;
  const { floorPlanId } = pinRows[0];

  await db.delete(floorPlanPins).where(eq(floorPlanPins.id, pinId));

  const planRows = await db
    .select({ dealId: floorPlans.dealId, propertyId: floorPlans.propertyId })
    .from(floorPlans)
    .where(eq(floorPlans.id, floorPlanId))
    .limit(1);

  const row = planRows[0];
  if (row?.dealId) {
    revalidatePath(`/deals/${row.dealId}`);
  } else if (row?.propertyId) {
    revalidatePath(`/properties/${row.propertyId}`);
  }
}

/**
 * updatePin — update pin category, note, and budgetCategoryId.
 */
export async function updatePin(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const pinId = formData.get("pinId") as string;
  if (!pinId) throw new Error("pinId is required");

  const category = formData.get("category") as string | null;
  const note = formData.get("note") as string | null;
  const budgetCategoryId =
    (formData.get("budgetCategoryId") as string | null) || null;

  const updateValues: Partial<typeof floorPlanPins.$inferInsert> = {};
  if (category !== null) updateValues.category = category;
  if (note !== null) updateValues.note = note;
  updateValues.budgetCategoryId = budgetCategoryId;

  await db
    .update(floorPlanPins)
    .set(updateValues)
    .where(eq(floorPlanPins.id, pinId));

  // Revalidate
  const pinRows = await db
    .select({ floorPlanId: floorPlanPins.floorPlanId })
    .from(floorPlanPins)
    .where(eq(floorPlanPins.id, pinId))
    .limit(1);

  if (pinRows.length > 0) {
    const planRows = await db
      .select({ dealId: floorPlans.dealId, propertyId: floorPlans.propertyId })
      .from(floorPlans)
      .where(eq(floorPlans.id, pinRows[0].floorPlanId))
      .limit(1);

    const row = planRows[0];
    if (row?.dealId) {
      revalidatePath(`/deals/${row.dealId}`);
    } else if (row?.propertyId) {
      revalidatePath(`/properties/${row.propertyId}`);
    }
  }
}

/**
 * generateShareLink — generate a share token with 7-day expiry for contractor view.
 * Returns the token and expiresAt timestamp string.
 */
export async function generateShareLink(
  planId: string
): Promise<{ token: string; expiresAt: string }> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const token = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db
    .update(floorPlans)
    .set({ shareToken: token, shareExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(floorPlans.id, planId));

  // Revalidate
  const rows = await db
    .select({ dealId: floorPlans.dealId, propertyId: floorPlans.propertyId })
    .from(floorPlans)
    .where(eq(floorPlans.id, planId))
    .limit(1);

  const row = rows[0];
  if (row?.dealId) {
    revalidatePath(`/deals/${row.dealId}`);
  } else if (row?.propertyId) {
    revalidatePath(`/properties/${row.propertyId}`);
  }

  return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * revokeShareLink — clear shareToken and shareExpiresAt for a floor plan.
 */
export async function revokeShareLink(planId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  await db
    .update(floorPlans)
    .set({ shareToken: null, shareExpiresAt: null, updatedAt: new Date() })
    .where(eq(floorPlans.id, planId));

  // Revalidate
  const rows = await db
    .select({ dealId: floorPlans.dealId, propertyId: floorPlans.propertyId })
    .from(floorPlans)
    .where(eq(floorPlans.id, planId))
    .limit(1);

  const row = rows[0];
  if (row?.dealId) {
    revalidatePath(`/deals/${row.dealId}`);
  } else if (row?.propertyId) {
    revalidatePath(`/properties/${row.propertyId}`);
  }
}
