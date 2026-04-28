"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import {
  createFeedbackComment,
  deleteFeedbackComment,
} from "@/lib/feedback-actions";
import { FeedbackMarkdown } from "./feedback-markdown";
import {
  FeedbackAttachmentsGallery,
  type GalleryAttachment,
} from "./feedback-attachments-gallery";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommentAttachment extends GalleryAttachment {
  commentId: string | null;
}

export interface CommentData {
  id: string;
  itemId: string;
  authorId: string;
  authorName: string | null;
  body: string;
  createdAt: Date;
  attachments?: CommentAttachment[];
}

interface FeedbackCommentThreadProps {
  itemId: string;
  comments: CommentData[];
  currentUserId: string;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Paste-image hook — extracted for reuse
// ---------------------------------------------------------------------------

interface PendingImage {
  blob: Blob;
  preview: string;
  name: string;
}

function usePasteImageHandler(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  pendingCount: number,
  onAdd: (img: PendingImage) => void,
  onError: (msg: string) => void
) {
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (!item.type.startsWith("image/")) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        if (blob.size > 5 * 1024 * 1024) {
          onError("Image too large — max 5 MB");
          continue;
        }
        if (pendingCount >= 5) {
          onError("Maximum 5 images per comment");
          continue;
        }
        const ext = item.type.split("/")[1] || "png";
        onAdd({
          blob,
          preview: URL.createObjectURL(blob),
          name: `paste-${Date.now()}.${ext}`,
        });
      }
    };
    el.addEventListener("paste", handler);
    return () => el.removeEventListener("paste", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCount]);
}

// ---------------------------------------------------------------------------
// Single comment card
// ---------------------------------------------------------------------------

interface CommentCardProps {
  comment: CommentData;
  itemId: string;
  currentUserId: string;
  isAdmin: boolean;
  onDeleted: (commentId: string) => void;
}

function CommentCard({
  comment,
  itemId,
  currentUserId,
  isAdmin,
  onDeleted,
}: CommentCardProps) {
  const [deleting, setDeleting] = useState(false);

  const canDelete = isAdmin || comment.authorId === currentUserId;

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    try {
      await deleteFeedbackComment(comment.id);
      onDeleted(comment.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setDeleting(false);
    }
  }

  const commentAttachments = comment.attachments ?? [];

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary select-none">
        {initials(comment.authorName)}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {comment.authorName ?? "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">
              {relativeTime(comment.createdAt)}
            </span>
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
              title="Delete comment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Body */}
        <FeedbackMarkdown>{comment.body}</FeedbackMarkdown>

        {/* Attached images */}
        {commentAttachments.length > 0 && (
          <div className="mt-2">
            <FeedbackAttachmentsGallery
              attachments={commentAttachments}
              itemId={itemId}
              canDeleteAll={isAdmin}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post-a-comment form
// ---------------------------------------------------------------------------

interface CommentFormProps {
  itemId: string;
  onPosted: (comment: CommentData) => void;
}

function CommentForm({ itemId, onPosted }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  usePasteImageHandler(
    textareaRef,
    pendingImages.length,
    (img) => setPendingImages((prev) => [...prev, img]),
    setError
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - pendingImages.length;
    if (files.length > remaining) {
      setError(`You can add ${remaining} more image${remaining !== 1 ? "s" : ""}`);
    }
    for (const file of files.slice(0, remaining)) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds 5 MB — skipped`);
        continue;
      }
      setPendingImages((prev) => [
        ...prev,
        { blob: file, preview: URL.createObjectURL(file), name: file.name },
      ]);
    }
    e.target.value = "";
  }

  function removeImage(index: number) {
    setPendingImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) {
      setError("Comment cannot be empty");
      return;
    }
    setSubmitting(true);
    try {
      const { id: commentId } = await createFeedbackComment(itemId, body.trim());

      // Upload images attached to this comment
      let failedCount = 0;
      for (let i = 0; i < pendingImages.length; i++) {
        const img = pendingImages[i];
        setUploadProgress(`Uploading image ${i + 1} of ${pendingImages.length}…`);
        try {
          const fd = new FormData();
          fd.append("file", img.blob, img.name);
          fd.append("commentId", commentId);
          const res = await fetch(`/api/feedback/${itemId}/attachments`, {
            method: "POST",
            body: fd,
          });
          if (!res.ok) failedCount++;
        } catch {
          failedCount++;
        }
      }
      setUploadProgress(null);
      if (failedCount > 0) {
        setError(`Comment posted but ${failedCount} image${failedCount > 1 ? "s" : ""} failed to upload.`);
      }

      // Cleanup
      for (const img of pendingImages) URL.revokeObjectURL(img.preview);

      // Optimistic new comment for the list
      const newComment: CommentData = {
        id: commentId,
        itemId,
        authorId: "", // populated from server on next revalidation
        authorName: null,
        body: body.trim(),
        createdAt: new Date(),
        attachments: [],
      };

      setBody("");
      setPendingImages([]);
      onPosted(newComment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Add a comment… Markdown supported. Paste screenshots directly here."
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
        disabled={submitting}
      />

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Pending image thumbnails */}
      {pendingImages.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pendingImages.map((img, i) => (
            <div
              key={img.preview}
              className="relative group rounded overflow-hidden border border-border w-14 h-14"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt={img.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium"
                title="Remove"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadProgress && (
        <p className="text-xs text-muted-foreground animate-pulse">{uploadProgress}</p>
      )}

      <div className="flex items-center gap-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={submitting || pendingImages.length >= 5}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting || pendingImages.length >= 5}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pendingImages.length === 0 ? "Attach image" : `Images (${pendingImages.length}/5)`}
        </button>

        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="ml-auto inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Posting…" : "Post comment"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FeedbackCommentThread({
  itemId,
  comments: initialComments,
  currentUserId,
  isAdmin,
}: FeedbackCommentThreadProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments);

  function handleDeleted(commentId: string) {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  function handlePosted(comment: CommentData) {
    setComments((prev) => [...prev, comment]);
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </h3>

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No comments yet. Be the first to add context.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              itemId={itemId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <CommentForm itemId={itemId} onPosted={handlePosted} />
      </div>
    </div>
  );
}
