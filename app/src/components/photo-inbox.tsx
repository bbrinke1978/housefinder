"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { X, ImageOff } from "lucide-react";
import type { PhotoWithSasUrl } from "@/lib/photo-queries";
import { assignPhotosToDeal, deletePhoto } from "@/lib/photo-actions";

interface DealOption {
  id: string;
  address: string;
}

interface PhotoInboxProps {
  photos: PhotoWithSasUrl[];
  deals: DealOption[];
}

const PHOTO_CATEGORIES = [
  { value: "exterior", label: "Exterior" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "living", label: "Living" },
  { value: "bedroom", label: "Bedroom" },
  { value: "garage", label: "Garage" },
  { value: "roof", label: "Roof" },
  { value: "foundation", label: "Foundation" },
  { value: "yard", label: "Yard" },
  { value: "other", label: "Other" },
] as const;

export function PhotoInbox({ photos, deals }: PhotoInboxProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dealId, setDealId] = useState("");
  const [category, setCategory] = useState("exterior");
  const [isPending, startTransition] = useTransition();

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAssign() {
    if (selected.size === 0 || !dealId) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await assignPhotosToDeal(ids, dealId);
      setSelected(new Set());
    });
  }

  function handleDelete(photoId: string) {
    startTransition(async () => {
      await deletePhoto(photoId);
    });
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ImageOff className="h-10 w-10 opacity-40" />
        <p className="text-sm">No photos in inbox.</p>
        <p className="text-xs text-center max-w-xs">
          Use the camera button on mobile to capture photos in the field.
        </p>
      </div>
    );
  }

  const canAssign = selected.size > 0 && dealId.length > 0;

  return (
    <div className="space-y-4">
      {/* Assign toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border bg-muted/40">
        <span className="text-sm text-muted-foreground shrink-0">
          {selected.size > 0
            ? `${selected.size} selected`
            : "Select photos to assign"}
        </span>

        <select
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          className="flex-1 min-w-[160px] rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Choose deal…</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>
              {d.address}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {PHOTO_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!canAssign || isPending}
          onClick={handleAssign}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          {isPending ? "Assigning…" : "Assign"}
        </button>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {photos.map((photo) => {
          const isSelected = selected.has(photo.id);
          return (
            <div
              key={photo.id}
              className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-border"
              }`}
              onClick={() => toggleSelect(photo.id)}
            >
              <div className="aspect-square relative bg-muted">
                <Image
                  src={photo.sasUrl}
                  alt={photo.caption || photo.category}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />
              </div>

              {/* Checkbox overlay */}
              <div
                className={`absolute top-2 left-2 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-primary border-primary"
                    : "bg-background/80 border-border group-hover:border-primary/50"
                }`}
              >
                {isSelected && (
                  <svg
                    className="h-3 w-3 text-primary-foreground"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Delete button */}
              <button
                type="button"
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(photo.id);
                }}
                aria-label="Delete photo"
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Caption */}
              {photo.caption && (
                <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                  {photo.caption}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
