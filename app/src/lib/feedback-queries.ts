import { db } from "@/db/client";
import {
  feedbackItems,
  feedbackComments,
  feedbackAttachments,
  feedbackActivity,
  users,
} from "@/db/schema";
import { eq, and, isNull, notInArray, desc, sql, inArray } from "drizzle-orm";
import { generateFeedbackSasUrl } from "@/lib/blob-storage";

// -- Types --

export interface FeedbackListItem {
  id: string;
  displayNumber: number;
  type: string;
  title: string;
  status: string;
  priority: string;
  reporterId: string;
  reporterName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  propertyId: string | null;
  dealId: string | null;
  urlContext: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface FeedbackComment {
  id: string;
  itemId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: Date;
}

export interface FeedbackAttachment {
  id: string;
  itemId: string | null;
  commentId: string | null;
  blobName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: Date;
  sasUrl: string;
}

export interface FeedbackActivityEntry {
  id: string;
  itemId: string;
  actorId: string;
  actorName: string | null;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
}

export interface FeedbackItemDetail extends FeedbackListItem {
  description: string | null;
  browserContext: string | null;
  comments: FeedbackComment[];
  attachments: FeedbackAttachment[];
  activity: FeedbackActivityEntry[];
}

// -- listFeedbackItems --

type FeedbackStatus = "new" | "planned" | "in_progress" | "shipped" | "wontfix" | "duplicate";
type FeedbackType = "bug" | "feature" | "idea" | "question";
type FeedbackPriority = "low" | "medium" | "high" | "critical";

const ARCHIVED_STATUSES: FeedbackStatus[] = ["shipped", "wontfix", "duplicate"];

export interface FeedbackListFilters {
  /** Comma-separated values supported via parseCsvFilter; arrays applied as inArray */
  status?: string[];
  type?: string[];
  priority?: string[];
  assigneeId?: string;
  reporterId?: string;
  search?: string;
  includeDeleted?: boolean;
  /** archive: false/undefined → hide shipped/wontfix/duplicate; true → show ONLY those. */
  archive?: boolean;
}

/**
 * listFeedbackItems — returns filtered feedback items joined with reporter + assignee names.
 * FTS search via Postgres to_tsquery on title + description if search param provided.
 * Sort: priority desc, then created_at desc.
 * Default scope: hides shipped/wontfix/duplicate (auto-archived). Pass archive:true to view those.
 * Excludes soft-deleted items unless includeDeleted is true. Capped at 200 rows.
 */
export async function listFeedbackItems(
  filters: FeedbackListFilters = {}
): Promise<FeedbackListItem[]> {
  const { status, type, priority, assigneeId, reporterId, search, includeDeleted, archive } = filters;

  const rows = await db
    .select({
      id: feedbackItems.id,
      displayNumber: feedbackItems.displayNumber,
      type: feedbackItems.type,
      title: feedbackItems.title,
      status: feedbackItems.status,
      priority: feedbackItems.priority,
      reporterId: feedbackItems.reporterId,
      reporterName: users.name,
      assigneeId: feedbackItems.assigneeId,
      assigneeName: sql<string | null>`assignee.name`,
      propertyId: feedbackItems.propertyId,
      dealId: feedbackItems.dealId,
      urlContext: feedbackItems.urlContext,
      createdAt: feedbackItems.createdAt,
      updatedAt: feedbackItems.updatedAt,
      resolvedAt: feedbackItems.resolvedAt,
    })
    .from(feedbackItems)
    .leftJoin(users, eq(feedbackItems.reporterId, users.id))
    .leftJoin(
      sql`users assignee`,
      sql`${feedbackItems.assigneeId} = assignee.id`
    )
    .where(
      and(
        // Soft-delete filter
        includeDeleted ? undefined : isNull(feedbackItems.deletedAt),
        // Archive scope: explicit status[] filter wins; otherwise hide archived by default,
        // or show only archived when archive=true.
        status && status.length > 0
          ? inArray(feedbackItems.status, status as FeedbackStatus[])
          : archive
            ? inArray(feedbackItems.status, ARCHIVED_STATUSES)
            : notInArray(feedbackItems.status, ARCHIVED_STATUSES),
        // Type filter
        type && type.length > 0
          ? inArray(feedbackItems.type, type as FeedbackType[])
          : undefined,
        // Priority filter
        priority && priority.length > 0
          ? inArray(feedbackItems.priority, priority as FeedbackPriority[])
          : undefined,
        // Assignee filter
        assigneeId ? eq(feedbackItems.assigneeId, assigneeId) : undefined,
        // Reporter filter
        reporterId ? eq(feedbackItems.reporterId, reporterId) : undefined,
        // FTS search
        search
          ? sql`to_tsvector('english', coalesce(${feedbackItems.title}, '') || ' ' || coalesce(${feedbackItems.description}, '')) @@ to_tsquery('english', ${search.trim().split(/\s+/).join(" & ")})`
          : undefined
      )
    )
    .orderBy(
      // Priority desc: critical > high > medium > low
      sql`CASE ${feedbackItems.priority} WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END DESC`,
      desc(feedbackItems.createdAt)
    )
    .limit(200);

  return rows as unknown as FeedbackListItem[];
}

// -- getFeedbackItemDetail --

/**
 * getFeedbackItemDetail — returns a single feedback item with joined comments, attachments,
 * and activity entries. Uses parallel Promise.all for the four selects.
 * SAS URLs are generated server-side for all attachments (1-hour TTL for the viewing session).
 * Excludes soft-deleted child rows from comments and attachments.
 * Returns null if item not found or soft-deleted.
 */
export async function getFeedbackItemDetail(
  id: string
): Promise<FeedbackItemDetail | null> {
  // Fetch item + reporter + assignee in one query
  const [itemRows, commentsRaw, attachmentsRaw, activityRaw] = await Promise.all([
    db
      .select({
        id: feedbackItems.id,
        displayNumber: feedbackItems.displayNumber,
        type: feedbackItems.type,
        title: feedbackItems.title,
        description: feedbackItems.description,
        status: feedbackItems.status,
        priority: feedbackItems.priority,
        reporterId: feedbackItems.reporterId,
        reporterName: users.name,
        assigneeId: feedbackItems.assigneeId,
        assigneeName: sql<string | null>`assignee.name`,
        propertyId: feedbackItems.propertyId,
        dealId: feedbackItems.dealId,
        urlContext: feedbackItems.urlContext,
        browserContext: feedbackItems.browserContext,
        createdAt: feedbackItems.createdAt,
        updatedAt: feedbackItems.updatedAt,
        resolvedAt: feedbackItems.resolvedAt,
        deletedAt: feedbackItems.deletedAt,
      })
      .from(feedbackItems)
      .leftJoin(users, eq(feedbackItems.reporterId, users.id))
      .leftJoin(
        sql`users assignee`,
        sql`${feedbackItems.assigneeId} = assignee.id`
      )
      .where(eq(feedbackItems.id, id))
      .limit(1),

    db
      .select({
        id: feedbackComments.id,
        itemId: feedbackComments.itemId,
        authorId: feedbackComments.authorId,
        authorName: users.name,
        body: feedbackComments.body,
        createdAt: feedbackComments.createdAt,
      })
      .from(feedbackComments)
      .leftJoin(users, eq(feedbackComments.authorId, users.id))
      .where(
        and(
          eq(feedbackComments.itemId, id),
          isNull(feedbackComments.deletedAt)
        )
      )
      .orderBy(feedbackComments.createdAt),

    db
      .select()
      .from(feedbackAttachments)
      .where(
        and(
          eq(feedbackAttachments.itemId, id),
          isNull(feedbackAttachments.deletedAt)
        )
      )
      .orderBy(feedbackAttachments.uploadedAt),

    db
      .select({
        id: feedbackActivity.id,
        itemId: feedbackActivity.itemId,
        actorId: feedbackActivity.actorId,
        actorName: users.name,
        action: feedbackActivity.action,
        oldValue: feedbackActivity.oldValue,
        newValue: feedbackActivity.newValue,
        createdAt: feedbackActivity.createdAt,
      })
      .from(feedbackActivity)
      .leftJoin(users, eq(feedbackActivity.actorId, users.id))
      .where(eq(feedbackActivity.itemId, id))
      .orderBy(desc(feedbackActivity.createdAt))
      .limit(50),
  ]);

  const item = itemRows[0];
  if (!item || item.deletedAt) return null;

  // Generate SAS URLs for attachments
  const attachments: FeedbackAttachment[] = attachmentsRaw.map((a) => ({
    id: a.id,
    itemId: a.itemId,
    commentId: a.commentId,
    blobName: a.blobName,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    uploadedBy: a.uploadedBy,
    uploadedAt: a.uploadedAt,
    sasUrl: generateFeedbackSasUrl(a.blobName),
  }));

  return {
    id: item.id,
    displayNumber: item.displayNumber,
    type: item.type,
    title: item.title,
    description: item.description,
    status: item.status,
    priority: item.priority,
    reporterId: item.reporterId,
    reporterName: item.reporterName,
    assigneeId: item.assigneeId,
    assigneeName: item.assigneeName,
    propertyId: item.propertyId,
    dealId: item.dealId,
    urlContext: item.urlContext,
    browserContext: item.browserContext,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    resolvedAt: item.resolvedAt,
    comments: commentsRaw as unknown as FeedbackComment[],
    attachments,
    activity: activityRaw as unknown as FeedbackActivityEntry[],
  };
}

// -- countArchivedFeedback --

/**
 * countArchivedFeedback — number of items in shipped/wontfix/duplicate, excluding soft-deleted.
 * Used by the "Archive (N)" toggle on the feedback list.
 */
export async function countArchivedFeedback(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedbackItems)
    .where(
      and(
        isNull(feedbackItems.deletedAt),
        inArray(feedbackItems.status, ARCHIVED_STATUSES)
      )
    );

  return result[0]?.count ?? 0;
}

// -- countOpenFeedbackForUser --

/**
 * countOpenFeedbackForUser — returns count of open items assigned to a specific user.
 * Used by the nav-bar badge (Plan 03). Open = status NOT IN (shipped, wontfix, duplicate).
 * @param userId  The user's UUID from session
 */
export async function countOpenFeedbackForUser(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(feedbackItems)
    .where(
      and(
        eq(feedbackItems.assigneeId, userId),
        isNull(feedbackItems.deletedAt),
        notInArray(feedbackItems.status, ["shipped", "wontfix", "duplicate"])
      )
    );

  return result[0]?.count ?? 0;
}
