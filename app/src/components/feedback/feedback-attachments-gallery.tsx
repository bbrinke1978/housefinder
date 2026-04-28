"use client";

import { useState } from "react";
import { X, RefreshCw, ZoomIn } from "lucide-react";

export interface GalleryAttachment {
  id: string;
  blobName: string;
  sasUrl: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName?: string | null;
  uploadedAt: Date;
}

interface FeedbackAttachmentsGalleryProps {
  attachments: GalleryAttachment[];
  /** The feedback item ID — used to build DELETE attachment URL */
  itemId: string;
  /** If true, current user can delete any attachment (admin). Otherwise only their own. */
  canDeleteAll?: boolean;
  /** The ID of the current user — used to compare against uploadedBy for uploader-only delete. */
  currentUserId?: string;
  /** uploadedBy UUID stored in DB (may differ from uploadedByName). Pass to enable delete button. */
  attachmentUploaderIds?: Record<string, string>; // attachmentId -> uploaderId UUID
  /** Called after a deletion so the parent can refresh. */
  onDeleted?: (attachmentId: string) => void;
  /** Timestamp (epoch ms) when the SAS URLs were generated. Warn if > 50 min old. */
  sasGeneratedAt?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortBlobName(blobName: string): string {
  const parts = blobName.split("/");
  return parts[parts.length - 1] ?? blobName;
}

/**
 * FeedbackAttachmentsGallery — 3-column thumbnail grid for feedback image attachments.
 * Clicking a thumbnail opens a Dialog-based lightbox with the full-size image.
 * Admin or uploader sees a delete button that calls DELETE /api/feedback/[id]/attachments/[attachmentId].
 * Shows a "Refresh" button if SAS URLs appear stale (> 50 min since page load).
 */
export function FeedbackAttachmentsGallery({
  attachments,
  itemId,
  canDeleteAll = false,
  currentUserId,
  attachmentUploaderIds = {},
  onDeleted,
  sasGeneratedAt,
}: FeedbackAttachmentsGalleryProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [localAttachments, setLocalAttachments] = useState(attachments);

  // Stale SAS URL detection (50 min threshold)
  const now = Date.now();
  const isStale = sasGeneratedAt ? now - sasGeneratedAt > 50 * 60 * 1000 : false;

  async function handleDelete(attachmentId: string) {
    setDeletingId(attachmentId);
    try {
      const res = await fetch(`/api/feedback/${itemId}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        alert(json.error ?? "Failed to delete attachment");
        return;
      }
      setLocalAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      onDeleted?.(attachmentId);
    } catch {
      alert("Network error deleting attachment");
    } finally {
      setDeletingId(null);
    }
  }

  if (localAttachments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No attachments.</p>
    );
  }

  return (
    <>
      {isStale && (
        <div className="mb-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
          <RefreshCw className="h-4 w-4" />
          <span>Image links may have expired.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="underline underline-offset-2 hover:no-underline"
          >
            Refresh page
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
        {localAttachments.map((attachment) => {
          const isUploader =
            currentUserId &&
            attachmentUploaderIds[attachment.id] === currentUserId;
          const canDelete = canDeleteAll || isUploader;
          const name = shortBlobName(attachment.blobName);

          return (
            <div
              key={attachment.id}
              className="group relative rounded-md overflow-hidden border border-border aspect-square bg-muted"
            >
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.sasUrl}
                alt={name}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Hover overlay: metadata + actions */}
              <div className="absolute inset-0 flex flex-col justify-between p-1.5 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Top-right: delete button */}
                {canDelete && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deletingId === attachment.id}
                      className="rounded-full bg-black/60 p-1 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      title="Delete attachment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Bottom: filename, size, uploader */}
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs text-white font-medium truncate" title={name}>
                    {name}
                  </p>
                  <p className="text-xs text-white/70">
                    {formatBytes(attachment.sizeBytes)}
                    {attachment.uploadedByName ? ` · ${attachment.uploadedByName}` : ""}
                  </p>
                </div>
              </div>

              {/* Click-to-zoom */}
              <button
                type="button"
                onClick={() => {
                  setLightboxSrc(attachment.sasUrl);
                  setLightboxAlt(name);
                }}
                className="absolute inset-0 cursor-zoom-in"
                aria-label={`View full size: ${name}`}
              />
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxSrc(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxSrc}
              alt={lightboxAlt}
              className="max-w-full max-h-[85vh] rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setLightboxSrc(null)}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-white/70 text-xs">
              <ZoomIn className="h-3 w-3" />
              Click outside to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
