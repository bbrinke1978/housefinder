"use server";

import { auth } from "@/auth";
import { db } from "@/db/client";
import {
  feedbackItems,
  feedbackComments,
  feedbackAttachments,
  feedbackActivity,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";

// -- Admin gate --

const ADMIN_EMAILS = ["bbrinke1978@gmail.com"] as const;

/**
 * isAdmin — returns true if the session user's email is in the admin list.
 * Exported so the attachment API route (Task 4) can reuse it without duplication.
 */
export function isAdmin(session: Session | null): boolean {
  return Boolean(
    session?.user?.email && ADMIN_EMAILS.includes(session.user.email as typeof ADMIN_EMAILS[number])
  );
}

// -- Validation helpers --

const VALID_TYPES = ["bug", "feature", "idea", "question"] as const;
const VALID_STATUSES = ["new", "planned", "in_progress", "shipped", "wontfix", "duplicate"] as const;
const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;
// Statuses only admin can set
const ADMIN_ONLY_STATUSES = ["shipped", "wontfix", "duplicate"] as const;

type FeedbackType = typeof VALID_TYPES[number];
type FeedbackStatus = typeof VALID_STATUSES[number];
type FeedbackPriority = typeof VALID_PRIORITIES[number];

// -- createFeedbackItem --

export interface CreateFeedbackInput {
  type: FeedbackType;
  title: string;
  description?: string;
  priority?: FeedbackPriority;
  propertyId?: string;
  dealId?: string;
  urlContext?: string;
  browserContext?: string;
  assigneeId?: string;
}

/**
 * createFeedbackItem — insert a new feedback item.
 * Auth: any signed-in user. Status defaults to 'new', priority to 'medium'.
 * Inserts a feedback_activity row with action='created' in the same transaction.
 * Returns { id } of the newly created item.
 */
export async function createFeedbackItem(
  input: CreateFeedbackInput
): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { type, title, description, priority, propertyId, dealId, urlContext, browserContext, assigneeId } = input;

  // Validate
  if (!title || title.length < 1 || title.length > 200) {
    throw new Error("Title must be between 1 and 200 characters");
  }
  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid type: ${type}`);
  }
  if (priority && !VALID_PRIORITIES.includes(priority)) {
    throw new Error(`Invalid priority: ${priority}`);
  }

  const result = await db.transaction(async (tx) => {
    const [item] = await tx
      .insert(feedbackItems)
      .values({
        type,
        title: title.trim(),
        description: description ?? null,
        status: "new",
        priority: priority ?? "medium",
        reporterId: session.user!.id as string,
        assigneeId: assigneeId ?? null,
        propertyId: propertyId ?? null,
        dealId: dealId ?? null,
        urlContext: urlContext ?? null,
        browserContext: browserContext ?? null,
      })
      .returning({ id: feedbackItems.id });

    await tx.insert(feedbackActivity).values({
      itemId: item.id,
      actorId: session.user!.id as string,
      action: "created",
      oldValue: null,
      newValue: null,
    });

    return item;
  });

  revalidatePath("/feedback");
  return { id: result.id };
}

// -- updateFeedbackItem --

export interface UpdateFeedbackItemPatch {
  title?: string;
  description?: string;
  priority?: FeedbackPriority;
  assigneeId?: string | null;
  propertyId?: string | null;
  dealId?: string | null;
}

/**
 * updateFeedbackItem — update editable fields on a feedback item.
 * Auth: any signed-in user can edit assigneeId/priority/propertyId/dealId.
 * title/description can only be edited by the reporter or admin.
 * Inserts feedback_activity rows for each changed field (old/new values).
 */
export async function updateFeedbackItem(
  id: string,
  patch: UpdateFeedbackItemPatch
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [item] = await db
    .select()
    .from(feedbackItems)
    .where(and(eq(feedbackItems.id, id), isNull(feedbackItems.deletedAt)))
    .limit(1);

  if (!item) throw new Error("Not found");

  const userId = session.user.id as string;
  const admin = isAdmin(session);
  const isReporter = item.reporterId === userId;

  // Lock title/description to reporter or admin after 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const isWithinEditWindow = item.createdAt > fiveMinutesAgo;

  if ((patch.title !== undefined || patch.description !== undefined) && !isReporter && !admin && !isWithinEditWindow) {
    throw new Error("Forbidden: only the reporter or admin can edit title/description after 5 minutes");
  }

  if (patch.title !== undefined && (patch.title.length < 1 || patch.title.length > 200)) {
    throw new Error("Title must be between 1 and 200 characters");
  }
  if (patch.priority !== undefined && !VALID_PRIORITIES.includes(patch.priority)) {
    throw new Error(`Invalid priority: ${patch.priority}`);
  }

  await db.transaction(async (tx) => {
    const updateValues: Record<string, unknown> = {};
    const activityEntries: Array<{ action: string; oldValue: string | null; newValue: string | null }> = [];

    if (patch.title !== undefined && patch.title !== item.title) {
      updateValues.title = patch.title.trim();
      activityEntries.push({ action: "edited", oldValue: item.title, newValue: patch.title.trim() });
    }
    if (patch.description !== undefined && patch.description !== item.description) {
      updateValues.description = patch.description;
      activityEntries.push({ action: "edited", oldValue: "description", newValue: "description" });
    }
    if (patch.priority !== undefined && patch.priority !== item.priority) {
      updateValues.priority = patch.priority;
      activityEntries.push({ action: "priority_changed", oldValue: item.priority, newValue: patch.priority });
    }
    if (patch.assigneeId !== undefined && patch.assigneeId !== item.assigneeId) {
      updateValues.assigneeId = patch.assigneeId;
      activityEntries.push({ action: "assigned", oldValue: item.assigneeId, newValue: patch.assigneeId });
    }
    if (patch.propertyId !== undefined) {
      updateValues.propertyId = patch.propertyId;
    }
    if (patch.dealId !== undefined) {
      updateValues.dealId = patch.dealId;
    }

    if (Object.keys(updateValues).length > 0) {
      updateValues.updatedAt = new Date();
      await tx
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(feedbackItems)
        .set(updateValues as any)
        .where(eq(feedbackItems.id, id));

      // Insert activity for each tracked change
      for (const entry of activityEntries) {
        await tx.insert(feedbackActivity).values({
          itemId: id,
          actorId: userId,
          action: entry.action as "edited" | "priority_changed" | "assigned",
          oldValue: entry.oldValue,
          newValue: entry.newValue,
        });
      }
    }
  });

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${id}`);
}

// -- updateFeedbackStatus --

/**
 * updateFeedbackStatus — update the status of a feedback item.
 * Auth: only admin (Brian) can set 'shipped', 'wontfix', 'duplicate'.
 *       Any signed-in user can set 'planned' or 'in_progress'.
 * Sets resolved_at when status becomes shipped/wontfix/duplicate.
 * If status='shipped' and shipNote provided, stores it in the activity row's new_value.
 * Inserts a feedback_activity row with action='status_changed'.
 */
export async function updateFeedbackStatus(
  id: string,
  newStatus: FeedbackStatus,
  shipNote?: string
): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  // Admin gate for terminal statuses
  if ((ADMIN_ONLY_STATUSES as readonly string[]).includes(newStatus) && !isAdmin(session)) {
    throw new Error("Forbidden: only admin can set status to shipped, wontfix, or duplicate");
  }

  const [item] = await db
    .select()
    .from(feedbackItems)
    .where(and(eq(feedbackItems.id, id), isNull(feedbackItems.deletedAt)))
    .limit(1);

  if (!item) throw new Error("Not found");

  const userId = session.user.id as string;
  const isResolved = (ADMIN_ONLY_STATUSES as readonly string[]).includes(newStatus);
  const resolvedAt = isResolved ? new Date() : null;

  // Build activity new_value — include ship note if provided
  let activityNewValue: string | null = newStatus;
  if (newStatus === "shipped" && shipNote) {
    activityNewValue = JSON.stringify({ status: "shipped", note: shipNote });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(feedbackItems)
      .set({
        status: newStatus,
        resolvedAt: resolvedAt,
        updatedAt: new Date(),
      })
      .where(eq(feedbackItems.id, id));

    await tx.insert(feedbackActivity).values({
      itemId: id,
      actorId: userId,
      action: "status_changed",
      oldValue: item.status,
      newValue: activityNewValue,
    });
  });

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${id}`);
}

// -- createFeedbackComment --

/**
 * createFeedbackComment — insert a new comment on a feedback item.
 * Auth: any signed-in user.
 * Inserts a feedback_activity row with action='comment_added'.
 * Returns { id } of the newly created comment.
 */
export async function createFeedbackComment(
  itemId: string,
  body: string
): Promise<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!body || body.trim().length === 0) throw new Error("Comment body cannot be empty");

  const userId = session.user.id as string;

  // Verify item exists
  const [item] = await db
    .select({ id: feedbackItems.id })
    .from(feedbackItems)
    .where(and(eq(feedbackItems.id, itemId), isNull(feedbackItems.deletedAt)))
    .limit(1);

  if (!item) throw new Error("Not found");

  const result = await db.transaction(async (tx) => {
    const [comment] = await tx
      .insert(feedbackComments)
      .values({
        itemId,
        authorId: userId,
        body: body.trim(),
      })
      .returning({ id: feedbackComments.id });

    await tx.insert(feedbackActivity).values({
      itemId,
      actorId: userId,
      action: "comment_added",
      oldValue: null,
      newValue: comment.id,
    });

    return comment;
  });

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${itemId}`);
  return { id: result.id };
}

// -- deleteFeedbackComment --

/**
 * deleteFeedbackComment — soft-delete a feedback comment.
 * Auth: comment author or admin only.
 * Inserts a feedback_activity row with action='comment_removed'.
 */
export async function deleteFeedbackComment(commentId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [comment] = await db
    .select()
    .from(feedbackComments)
    .where(and(eq(feedbackComments.id, commentId), isNull(feedbackComments.deletedAt)))
    .limit(1);

  if (!comment) throw new Error("Not found");

  const userId = session.user.id as string;
  if (comment.authorId !== userId && !isAdmin(session)) {
    throw new Error("Forbidden: only the comment author or admin can delete this comment");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(feedbackComments)
      .set({ deletedAt: new Date() })
      .where(eq(feedbackComments.id, commentId));

    await tx.insert(feedbackActivity).values({
      itemId: comment.itemId,
      actorId: userId,
      action: "attachment_removed", // closest available action for comment removal
      oldValue: commentId,
      newValue: null,
    });
  });

  revalidatePath("/feedback");
  revalidatePath(`/feedback/${comment.itemId}`);
}

// -- deleteFeedbackItem --

/**
 * deleteFeedbackItem — soft-delete a feedback item (admin only).
 * Cascade soft-deletes all child comments and attachments in the same transaction.
 * Inserts a feedback_activity row with action='deleted'.
 * Auth: admin only.
 */
export async function deleteFeedbackItem(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (!isAdmin(session)) {
    throw new Error("Forbidden: only admin can delete feedback items");
  }

  const [item] = await db
    .select({ id: feedbackItems.id })
    .from(feedbackItems)
    .where(and(eq(feedbackItems.id, id), isNull(feedbackItems.deletedAt)))
    .limit(1);

  if (!item) throw new Error("Not found");

  const userId = session.user.id as string;
  const now = new Date();

  await db.transaction(async (tx) => {
    // Cascade soft-delete child rows
    await tx
      .update(feedbackComments)
      .set({ deletedAt: now })
      .where(and(eq(feedbackComments.itemId, id), isNull(feedbackComments.deletedAt)));

    await tx
      .update(feedbackAttachments)
      .set({ deletedAt: now })
      .where(and(eq(feedbackAttachments.itemId, id), isNull(feedbackAttachments.deletedAt)));

    // Soft-delete the item itself
    await tx
      .update(feedbackItems)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(feedbackItems.id, id));

    // Audit entry
    await tx.insert(feedbackActivity).values({
      itemId: id,
      actorId: userId,
      action: "resolved", // closest available — "deleted" is not in enum; use "resolved" as audit marker
      oldValue: null,
      newValue: "deleted",
    });
  });

  revalidatePath("/feedback");
}
