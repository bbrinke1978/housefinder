"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Clock } from "lucide-react";
import { FeedbackTypeBadge } from "./feedback-type-badge";
import { FeedbackStatusBadge } from "./feedback-status-badge";
import { FeedbackPriorityBadge } from "./feedback-priority-badge";
import { FeedbackMarkdown } from "./feedback-markdown";
import { FeedbackAttachmentsGallery, type GalleryAttachment } from "./feedback-attachments-gallery";
import { FeedbackCommentThread, type CommentData } from "./feedback-comment-thread";
import { FeedbackActivityTimeline, type ActivityEntry } from "./feedback-activity-timeline";
import { FeedbackStatusControls } from "./feedback-status-controls";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface DetailAttachment extends GalleryAttachment {
  itemId: string | null;
  commentId: string | null;
}

interface FeedbackDetailData {
  id: string;
  displayNumber: number;
  type: string;
  title: string;
  description: string | null;
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
  comments: CommentData[];
  attachments: DetailAttachment[];
  activity: ActivityEntry[];
}

interface FeedbackDetailProps {
  data: FeedbackDetailData;
  users: UserOption[];
  currentUserId: string;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function absoluteDate(date: Date): string {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Sidebar section wrapper
// ---------------------------------------------------------------------------

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main detail component
// ---------------------------------------------------------------------------

export function FeedbackDetail({
  data,
  users,
  currentUserId,
  isAdmin,
}: FeedbackDetailProps) {
  const sasGeneratedAt = Date.now(); // approximation — page rendered just now

  // Map attachments for gallery
  const itemAttachments: GalleryAttachment[] = data.attachments.filter(
    (a) => a.itemId === data.id
  );

  // Map comments with their attachments
  const comments: CommentData[] = data.comments.map((comment) => ({
    ...comment,
    attachments: data.attachments.filter(
      (a) => a.commentId === comment.id
    ) as (GalleryAttachment & { commentId: string | null })[],
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/feedback"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to feedback
      </Link>

      {/* Two-column layout: main content + sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">

        {/* ------------------------------------------------------------------ */}
        {/* Main content column                                                  */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* Header */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <FeedbackTypeBadge type={data.type} />
              <FeedbackStatusBadge status={data.status} />
              <FeedbackPriorityBadge priority={data.priority} />
            </div>

            <h1 className="text-2xl font-display font-bold tracking-tight">
              <span className="text-muted-foreground font-mono text-base mr-2 align-middle">
                #{String(data.displayNumber).padStart(6, "0")}
              </span>
              {data.title}
            </h1>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                Reported by{" "}
                <span className="font-medium text-foreground">
                  {data.reporterName ?? "Unknown"}
                </span>
              </span>
              {data.assigneeName && (
                <span>
                  Assigned to{" "}
                  <span className="font-medium text-foreground">
                    {data.assigneeName}
                  </span>
                </span>
              )}
              <span
                className="inline-flex items-center gap-1"
                title={absoluteDate(data.createdAt)}
              >
                <Clock className="h-3.5 w-3.5" />
                {relativeTime(data.createdAt)}
              </span>
              {data.updatedAt.getTime() !== data.createdAt.getTime() && (
                <span
                  className="text-xs"
                  title={absoluteDate(data.updatedAt)}
                >
                  Updated {relativeTime(data.updatedAt)}
                </span>
              )}
            </div>

            {/* Linked context badges */}
            <div className="flex flex-wrap gap-2">
              {data.propertyId && (
                <Link
                  href={`/properties/${data.propertyId}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Property
                </Link>
              )}
              {data.dealId && (
                <Link
                  href={`/deals/${data.dealId}`}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium hover:bg-muted/80 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Deal
                </Link>
              )}
              {data.urlContext && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  URL: {data.urlContext}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {data.description ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-2">Description</h2>
              <FeedbackMarkdown>{data.description}</FeedbackMarkdown>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground italic">No description provided.</p>
            </div>
          )}

          {/* Attachments */}
          {itemAttachments.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold mb-3">
                Attachments ({itemAttachments.length})
              </h2>
              <FeedbackAttachmentsGallery
                attachments={itemAttachments}
                itemId={data.id}
                canDeleteAll={isAdmin}
                currentUserId={currentUserId}
                sasGeneratedAt={sasGeneratedAt}
              />
            </div>
          )}

          {/* Comments */}
          <div className="rounded-lg border border-border bg-card p-4">
            <FeedbackCommentThread
              itemId={data.id}
              comments={comments}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          </div>

          {/* Activity timeline */}
          {data.activity.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <FeedbackActivityTimeline activities={data.activity} />
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Sidebar column                                                       */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col gap-6 lg:pt-0">
          {/* Status controls */}
          <div className="rounded-lg border border-border bg-card p-4">
            <SidebarSection title="Controls">
              <FeedbackStatusControls
                item={{
                  id: data.id,
                  status: data.status,
                  priority: data.priority,
                  assigneeId: data.assigneeId,
                }}
                users={users}
                isAdmin={isAdmin}
                currentUserId={currentUserId}
              />
            </SidebarSection>
          </div>

          {/* Item metadata */}
          <div className="rounded-lg border border-border bg-card p-4">
            <SidebarSection title="Details">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reporter</span>
                  <span className="font-medium">{data.reporterName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-xs" title={absoluteDate(data.createdAt)}>
                    {relativeTime(data.createdAt)}
                  </span>
                </div>
                {data.resolvedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolved</span>
                    <span className="text-xs" title={absoluteDate(data.resolvedAt)}>
                      {relativeTime(data.resolvedAt)}
                    </span>
                  </div>
                )}
              </div>
            </SidebarSection>
          </div>
        </div>
      </div>
    </div>
  );
}
