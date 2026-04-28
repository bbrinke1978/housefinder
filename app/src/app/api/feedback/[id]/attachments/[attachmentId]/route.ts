import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { feedbackAttachments, feedbackActivity } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { isAdmin } from "@/lib/feedback-actions";

export const runtime = "nodejs";

/**
 * DELETE /api/feedback/[id]/attachments/[attachmentId]
 * Soft-deletes a feedback attachment. Auth: uploader or admin only.
 * Inserts a feedback_activity row with action='attachment_removed'.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId, attachmentId } = await params;

  const [attachment] = await db
    .select()
    .from(feedbackAttachments)
    .where(
      and(
        eq(feedbackAttachments.id, attachmentId),
        eq(feedbackAttachments.itemId, itemId),
        isNull(feedbackAttachments.deletedAt)
      )
    )
    .limit(1);

  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = session.user.id as string;

  // Only uploader or admin can delete
  if (attachment.uploadedBy !== userId && !isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(feedbackAttachments)
      .set({ deletedAt: new Date() })
      .where(eq(feedbackAttachments.id, attachmentId));

    await tx.insert(feedbackActivity).values({
      itemId: attachment.itemId!,
      actorId: userId,
      action: "attachment_removed",
      oldValue: attachmentId,
      newValue: null,
    });
  });

  return NextResponse.json({ success: true });
}
