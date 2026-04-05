import { db } from "@/db/client";
import { propertyPhotos } from "@/db/schema";
import type { PropertyPhotoRow } from "@/db/schema";
import { eq, and, desc, asc, count } from "drizzle-orm";
import { generatePhotoSasUrl } from "@/lib/blob-storage";

export type PhotoWithSasUrl = PropertyPhotoRow & { sasUrl: string };

function withSasUrl(row: PropertyPhotoRow): PhotoWithSasUrl {
  return { ...row, sasUrl: generatePhotoSasUrl(row.blobName) };
}

/**
 * getDealPhotos — fetch all photos for a deal, ordered by category then sortOrder.
 */
export async function getDealPhotos(dealId: string): Promise<PhotoWithSasUrl[]> {
  const rows = await db
    .select()
    .from(propertyPhotos)
    .where(eq(propertyPhotos.dealId, dealId))
    .orderBy(asc(propertyPhotos.category), asc(propertyPhotos.sortOrder));
  return rows.map(withSasUrl);
}

/**
 * getPropertyPhotos — fetch all photos for a property, ordered by category then sortOrder.
 */
export async function getPropertyPhotos(
  propertyId: string
): Promise<PhotoWithSasUrl[]> {
  const rows = await db
    .select()
    .from(propertyPhotos)
    .where(eq(propertyPhotos.propertyId, propertyId))
    .orderBy(asc(propertyPhotos.category), asc(propertyPhotos.sortOrder));
  return rows.map(withSasUrl);
}

/**
 * getInboxPhotos — fetch all unassigned inbox photos, newest first.
 */
export async function getInboxPhotos(): Promise<PhotoWithSasUrl[]> {
  const rows = await db
    .select()
    .from(propertyPhotos)
    .where(eq(propertyPhotos.isInbox, true))
    .orderBy(desc(propertyPhotos.createdAt));
  return rows.map(withSasUrl);
}

/**
 * getDealCoverPhoto — fetch the cover photo for a deal. Returns null if none set.
 */
export async function getDealCoverPhoto(
  dealId: string
): Promise<{ blobName: string; sasUrl: string } | null> {
  const rows = await db
    .select({ blobName: propertyPhotos.blobName })
    .from(propertyPhotos)
    .where(
      and(
        eq(propertyPhotos.dealId, dealId),
        eq(propertyPhotos.isCover, true)
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  const { blobName } = rows[0];
  return { blobName, sasUrl: generatePhotoSasUrl(blobName) };
}

/**
 * getInboxCount — return the number of unassigned inbox photos.
 */
export async function getInboxCount(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(propertyPhotos)
    .where(eq(propertyPhotos.isInbox, true));
  return Number(result[0]?.count ?? 0);
}
