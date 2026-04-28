import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { getFeedbackItemDetail } from "@/lib/feedback-queries";
import { isAdmin } from "@/lib/feedback-actions";
import { FeedbackDetail } from "@/components/feedback/feedback-detail";
import type { Session } from "next-auth";

interface FeedbackDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FeedbackDetailPage({
  params,
}: FeedbackDetailPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;

  // Parallel fetch: item detail + users list
  const [data, allUsers] = await Promise.all([
    getFeedbackItemDetail(id),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users),
  ]);

  if (!data) {
    notFound();
  }

  // Map FeedbackAttachment[] to DetailAttachment shape (add uploadedByName = null,
  // since the query returns uploadedBy UUID, not joined name).
  const mappedData = {
    ...data,
    attachments: data.attachments.map((a) => ({
      id: a.id,
      itemId: a.itemId,
      commentId: a.commentId,
      blobName: a.blobName,
      sasUrl: a.sasUrl,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedByName: null as string | null, // v1: not joined; show nothing
      uploadedAt: a.uploadedAt,
    })),
  };

  return (
    <FeedbackDetail
      data={mappedData}
      users={allUsers}
      currentUserId={session.user.id as string}
      isAdmin={isAdmin(session as Session)}
    />
  );
}
