"use server";

import { db } from "@/db/client";
import { propertyPhotos } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { uploadPhotoBlob, deletePhotoBlob } from "@/lib/blob-storage";
import { randomUUID } from "crypto";

type PhotoCategoryValue =
  | "exterior"
  | "kitchen"
  | "bathroom"
  | "living"
  | "bedroom"
  | "garage"
  | "roof"
  | "foundation"
  | "yard"
  | "other";

// Sanitize a filename to safe characters for use in blob paths
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

/**
 * uploadPhoto — upload a photo from a form submission.
 * Handles: file buffer conversion, blob path generation, DB insert, inbox/cover logic.
 */
export async function uploadPhoto(formData: FormData): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session) return { error: "Not authenticated" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided" };

  const dealId = (formData.get("dealId") as string | null) || null;
  const propertyId = (formData.get("propertyId") as string | null) || null;
  const category = (formData.get("category") as string) || "other";
  const caption = (formData.get("caption") as string | null) || null;

  const buffer = Buffer.from(await file.arrayBuffer());
  const photoId = randomUUID();
  const sanitizedName = sanitizeFilename(file.name || "photo.jpg");

  // Build blob path: deals/{dealId}/... | properties/{propertyId}/... | inbox/...
  let blobPrefix: string;
  if (dealId) {
    blobPrefix = `deals/${dealId}`;
  } else if (propertyId) {
    blobPrefix = `properties/${propertyId}`;
  } else {
    blobPrefix = "inbox";
  }
  const blobName = `${blobPrefix}/${photoId}-${sanitizedName}`;

  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    return { error: "Photo storage not configured. Add AZURE_STORAGE_CONNECTION_STRING to Netlify environment variables." };
  }

  let blobUrl: string;
  try {
    blobUrl = await uploadPhotoBlob(buffer, blobName);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown upload error";
    return { error: `Photo upload failed: ${msg}` };
  }

  // isInbox = true when no dealId and no propertyId
  const isInbox = !dealId && !propertyId;

  // Check if this exterior photo should be auto-set as cover
  let isCover = false;
  if (category === "exterior" && dealId) {
    const existingCover = await db
      .select({ id: propertyPhotos.id })
      .from(propertyPhotos)
      .where(
        and(
          eq(propertyPhotos.dealId, dealId),
          eq(propertyPhotos.category, "exterior"),
          eq(propertyPhotos.isCover, true)
        )
      )
      .limit(1);
    if (existingCover.length === 0) {
      isCover = true;
    }
  }

  try {
    const [inserted] = await db
      .insert(propertyPhotos)
      .values({
        id: photoId,
        dealId: dealId || undefined,
        propertyId: propertyId || undefined,
        isInbox,
        blobName,
        blobUrl,
        category: category as PhotoCategoryValue,
        caption: caption || undefined,
        isCover,
        fileSizeBytes: file.size || undefined,
      })
      .returning({ id: propertyPhotos.id });

    // Revalidate relevant paths
    if (dealId) {
      revalidatePath(`/deals/${dealId}`);
    } else if (propertyId) {
      revalidatePath(`/properties/${propertyId}`);
    } else {
      revalidatePath("/photos/inbox");
    }

    return { id: inserted.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database error";
    return { error: `Failed to save photo: ${msg}` };
  }
}

/**
 * setPhotoCover — set a photo as the cover for a deal (clears all other covers first).
 */
export async function setPhotoCover(
  photoId: string,
  dealId: string
): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  await db.transaction(async (tx) => {
    // Clear all existing covers for this deal
    await tx
      .update(propertyPhotos)
      .set({ isCover: false })
      .where(eq(propertyPhotos.dealId, dealId));

    // Set the new cover
    await tx
      .update(propertyPhotos)
      .set({ isCover: true })
      .where(eq(propertyPhotos.id, photoId));
  });

  revalidatePath(`/deals/${dealId}`);
}

/**
 * deletePhoto — delete a photo from blob storage and the database.
 */
export async function deletePhoto(photoId: string): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const rows = await db
    .select()
    .from(propertyPhotos)
    .where(eq(propertyPhotos.id, photoId))
    .limit(1);

  if (rows.length === 0) throw new Error("Photo not found");
  const photo = rows[0];

  await deletePhotoBlob(photo.blobName);
  await db.delete(propertyPhotos).where(eq(propertyPhotos.id, photoId));

  // Revalidate relevant paths
  if (photo.dealId) {
    revalidatePath(`/deals/${photo.dealId}`);
  } else if (photo.propertyId) {
    revalidatePath(`/properties/${photo.propertyId}`);
  } else {
    revalidatePath("/photos/inbox");
  }
}

/**
 * assignPhotosToDeal — move inbox photos to a deal, optionally auto-setting cover.
 */
export async function assignPhotosToDeal(
  photoIds: string[],
  dealId: string
): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  if (photoIds.length === 0) return;

  // Check if deal already has a cover photo
  const existingCover = await db
    .select({ id: propertyPhotos.id })
    .from(propertyPhotos)
    .where(
      and(eq(propertyPhotos.dealId, dealId), eq(propertyPhotos.isCover, true))
    )
    .limit(1);

  const hasCover = existingCover.length > 0;

  // Assign specified photos to deal
  await db
    .update(propertyPhotos)
    .set({ dealId, isInbox: false })
    .where(inArray(propertyPhotos.id, photoIds));

  // If no cover exists, find first exterior photo and set as cover
  if (!hasCover) {
    const firstExterior = await db
      .select({ id: propertyPhotos.id })
      .from(propertyPhotos)
      .where(
        and(
          eq(propertyPhotos.dealId, dealId),
          eq(propertyPhotos.category, "exterior")
        )
      )
      .limit(1);

    if (firstExterior.length > 0) {
      await setPhotoCover(firstExterior[0].id, dealId);
    }
  }

  revalidatePath("/photos/inbox");
  revalidatePath(`/deals/${dealId}`);
}

/**
 * updatePhotoCaption — update the caption for a photo.
 */
export async function updatePhotoCaption(
  photoId: string,
  caption: string
): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const rows = await db
    .select({ dealId: propertyPhotos.dealId, propertyId: propertyPhotos.propertyId, isInbox: propertyPhotos.isInbox })
    .from(propertyPhotos)
    .where(eq(propertyPhotos.id, photoId))
    .limit(1);

  if (rows.length === 0) throw new Error("Photo not found");
  const photo = rows[0];

  await db
    .update(propertyPhotos)
    .set({ caption, updatedAt: new Date() })
    .where(eq(propertyPhotos.id, photoId));

  // Revalidate relevant paths
  if (photo.dealId) {
    revalidatePath(`/deals/${photo.dealId}`);
  } else if (photo.propertyId) {
    revalidatePath(`/properties/${photo.propertyId}`);
  } else {
    revalidatePath("/photos/inbox");
  }
}
