"use server";

import { db } from "@/db/client";
import { receipts } from "@/db/schema";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { uploadBlob } from "@/lib/blob-storage";
import { analyzeReceipt } from "@/lib/ocr";

export interface UploadReceiptResult {
  receiptId: string;
  vendor: string | null;
  date: string | null;
  totalCents: number | null;
}

/**
 * uploadReceipt — server action to upload a receipt image and run OCR.
 *
 * Steps:
 * 1. Read file as ArrayBuffer, convert to Buffer
 * 2. Generate blobName: {budgetId}/{uuid}-{filename}
 * 3. Upload to Azure Blob Storage
 * 4. Run OCR via Azure Document Intelligence (graceful — returns nulls on failure)
 * 5. Insert receipt row into DB
 * 6. Return receiptId + OCR fields for expense form pre-fill
 */
export async function uploadReceipt(
  formData: FormData
): Promise<UploadReceiptResult> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const file = formData.get("file") as File | null;
  const budgetId = formData.get("budgetId") as string | null;
  const dealId = formData.get("dealId") as string | null;

  if (!file || !budgetId) {
    throw new Error("Missing required fields: file and budgetId");
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Generate blob name organized by budgetId
  const blobName = `${budgetId}/${crypto.randomUUID()}-${file.name}`;
  const contentType = file.type || "image/jpeg";

  // Upload to Azure Blob Storage
  const blobUrl = await uploadBlob(buffer, blobName, contentType);

  // Run OCR — never blocks on failure (analyzeReceipt always returns)
  const { vendor, date, totalCents } = await analyzeReceipt(blobUrl);

  // Store raw OCR response is not available from the current simplified return
  // ocrRawJson is optional — we store the extracted fields only
  const ocrRawJson = JSON.stringify({ vendor, date, totalCents });

  // Insert receipt row
  const [inserted] = await db
    .insert(receipts)
    .values({
      budgetId,
      blobUrl,
      blobName,
      ocrRawJson,
      vendor: vendor ?? null,
      receiptDate: date ?? null,
      totalCents: totalCents ?? null,
    })
    .returning({ id: receipts.id });

  if (dealId) {
    revalidatePath(`/deals/${dealId}`);
  }

  return {
    receiptId: inserted.id,
    vendor,
    date,
    totalCents,
  };
}
