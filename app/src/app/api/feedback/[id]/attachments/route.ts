import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { feedbackItems, feedbackAttachments, feedbackActivity } from "@/db/schema";
import { eq } from "drizzle-orm";
import { uploadFeedbackBlob, generateFeedbackSasUrl } from "@/lib/blob-storage";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

/**
 * POST /api/feedback/[id]/attachments
 * Accepts multipart/form-data with a "file" field (image only, max 5MB).
 * Optional "commentId" field links the attachment to a specific comment.
 * Uploads to Azure Blob Storage "feedback" container, inserts feedback_attachments row,
 * and returns { id, sasUrl }.
 * Auth: any signed-in user.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await params;

  // Verify the parent item exists and isn't soft-deleted
  const [item] = await db
    .select()
    .from(feedbackItems)
    .where(eq(feedbackItems.id, itemId))
    .limit(1);

  if (!item || item.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const commentId = formData.get("commentId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  // Validate file type and size
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
  }

  // Upload to Azure Blob Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const attachmentId = randomUUID();
  const ext = file.name.split(".").pop() || "png";
  const blobName = `${itemId}/${attachmentId}.${ext}`;

  try {
    await uploadFeedbackBlob(buffer, blobName, file.type);
  } catch (err) {
    console.error("[feedback-attachments] blob upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Insert attachment row + audit entry in a transaction
  await db.transaction(async (tx) => {
    await tx.insert(feedbackAttachments).values({
      id: attachmentId,
      itemId,
      commentId: commentId || null,
      blobName,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedBy: session.user!.id as string,
    });

    await tx.insert(feedbackActivity).values({
      itemId,
      actorId: session.user!.id as string,
      action: "attachment_added",
      oldValue: null,
      newValue: attachmentId,
    });
  });

  return NextResponse.json({
    id: attachmentId,
    sasUrl: generateFeedbackSasUrl(blobName),
  });
}
