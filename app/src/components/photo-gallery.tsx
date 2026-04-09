"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Star, Trash2, Camera, Pencil, Check, X } from "lucide-react";
import { setPhotoCover, deletePhoto, updatePhotoCaption } from "@/lib/photo-actions";
import type { PhotoWithSasUrl } from "@/lib/photo-queries";
import type { Plugin } from "yet-another-react-lightbox";
// Captions is a plain function plugin (not a React component) — import statically, safe in "use client"
import Captions from "yet-another-react-lightbox/plugins/captions";

import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";

// Dynamic import YARL Lightbox with ssr: false (uses browser APIs like document)
const Lightbox = dynamic(() => import("yet-another-react-lightbox"), { ssr: false });

interface PhotoGalleryProps {
  photos: PhotoWithSasUrl[];
  dealId?: string;
  canManage?: boolean;
}

// Group photos by category
function groupByCategory(photos: PhotoWithSasUrl[]): Map<string, PhotoWithSasUrl[]> {
  const map = new Map<string, PhotoWithSasUrl[]>();
  for (const photo of photos) {
    const key = photo.category ?? "other";
    const group = map.get(key) ?? [];
    group.push(photo);
    map.set(key, group);
  }
  return map;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PhotoGallery({ photos, dealId, canManage = false }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const groupedPhotos = groupByCategory(photos);

  // Build slides array from all photos for lightbox
  const slides = photos.map((photo) => ({
    src: photo.sasUrl,
    title: capitalize(photo.category ?? "other"),
    description: photo.caption ?? undefined,
  }));

  async function handleSetCover(photoId: string) {
    if (!dealId) return;
    try {
      await setPhotoCover(photoId, dealId);
    } catch (err) {
      console.error("Failed to set cover:", err);
    }
  }

  async function handleDelete(photoId: string) {
    if (!window.confirm("Delete this photo? This cannot be undone.")) return;
    setPendingDelete(photoId);
    try {
      await deletePhoto(photoId);
    } catch (err) {
      console.error("Failed to delete photo:", err);
    } finally {
      setPendingDelete(null);
    }
  }

  function startEditCaption(photo: PhotoWithSasUrl) {
    setEditingCaptionId(photo.id);
    setCaptionDraft(photo.caption ?? "");
  }

  async function saveCaption(photoId: string) {
    try {
      await updatePhotoCaption(photoId, captionDraft);
      setEditingCaptionId(null);
    } catch (err) {
      console.error("Failed to update caption:", err);
    }
  }

  function cancelEditCaption() {
    setEditingCaptionId(null);
    setCaptionDraft("");
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <Camera className="h-10 w-10 opacity-30" />
        <p className="text-sm">No photos yet. Add photos to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(groupedPhotos.entries()).map(([category, categoryPhotos]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {capitalize(category)}
            <span className="ml-2 text-xs font-normal normal-case text-muted-foreground/70">
              ({categoryPhotos.length})
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {categoryPhotos.map((photo) => {
              // Find global index in slides array for lightbox
              const slideIndex = photos.findIndex((p) => p.id === photo.id);
              const isEditingCaption = editingCaptionId === photo.id;
              const isDeleting = pendingDelete === photo.id;

              return (
                <div key={photo.id} className="space-y-1">
                  <div
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border bg-muted"
                    onClick={() => !isEditingCaption && setLightboxIndex(slideIndex)}
                  >
                    <img
                      src={photo.sasUrl}
                      alt={photo.caption ?? capitalize(category)}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />

                    {/* Cover badge */}
                    {photo.isCover && (
                      <div className="absolute left-1 top-1">
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          Cover
                        </span>
                      </div>
                    )}

                    {/* Management controls overlay */}
                    {canManage && !isDeleting && (
                      <div
                        className="absolute inset-0 flex items-end justify-end gap-1 bg-black/40 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Set cover */}
                        {dealId && !photo.isCover && (
                          <button
                            type="button"
                            onClick={() => handleSetCover(photo.id)}
                            title="Set as cover"
                            className="rounded bg-black/50 p-1 text-yellow-300 hover:bg-black/70 hover:text-yellow-200"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Edit caption */}
                        <button
                          type="button"
                          onClick={() => startEditCaption(photo)}
                          title="Edit caption"
                          className="rounded bg-black/50 p-1 text-white hover:bg-black/70"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(photo.id)}
                          title="Delete photo"
                          className="rounded bg-black/50 p-1 text-red-400 hover:bg-black/70 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Deleting spinner overlay */}
                    {isDeleting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </div>
                    )}
                  </div>

                  {/* Caption inline edit */}
                  {isEditingCaption ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        placeholder="Caption..."
                        autoFocus
                        className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveCaption(photo.id);
                          if (e.key === "Escape") cancelEditCaption();
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => saveCaption(photo.id)}
                        className="rounded p-1 text-green-600 hover:text-green-500"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditCaption}
                        className="rounded p-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : photo.caption ? (
                    <p className="truncate text-xs text-muted-foreground">{photo.caption}</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* YARL Lightbox */}
      {lightboxIndex >= 0 && (
        <Lightbox
          open={lightboxIndex >= 0}
          close={() => setLightboxIndex(-1)}
          index={lightboxIndex}
          slides={slides}
          plugins={[Captions as unknown as Plugin]}
        />
      )}
    </div>
  );
}
