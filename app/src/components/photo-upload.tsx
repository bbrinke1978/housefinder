"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Check, X, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPhoto } from "@/lib/photo-actions";

interface PhotoUploadProps {
  dealId?: string;
  propertyId?: string;
  onUploadComplete?: () => void;
}

type UploadStatus = "pending" | "uploading" | "done" | "error";

interface PhotoUploadState {
  id: string;
  file: File;
  status: UploadStatus;
  previewUrl: string;
  caption: string;
  showCaption: boolean;
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

/**
 * resizeImage — client-side canvas resize to max 1600px longest side, JPEG 0.8 quality.
 * Reduces a ~5MB phone photo to ~400KB.
 */
async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_SIDE = 1600;
      let { width, height } = img;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width > height) {
          height = Math.round((height * MAX_SIDE) / width);
          width = MAX_SIDE;
        } else {
          width = Math.round((width * MAX_SIDE) / height);
          height = MAX_SIDE;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load error"));
    };
    img.src = objectUrl;
  });
}

export function PhotoUpload({ dealId, propertyId, onUploadComplete }: PhotoUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<PhotoUploadState[]>([]);
  const [category, setCategory] = useState<string>("other");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newItems: PhotoUploadState[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "pending",
      previewUrl: URL.createObjectURL(file),
      caption: "",
      showCaption: false,
    }));

    setQueue((prev) => [...prev, ...newItems]);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function removeFromQueue(id: string) {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  function toggleCaption(id: string) {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, showCaption: !item.showCaption } : item
      )
    );
  }

  function setCaption(id: string, caption: string) {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption } : item))
    );
  }

  function updateStatus(id: string, status: UploadStatus) {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  async function handleUpload() {
    const pending = queue.filter((item) => item.status === "pending");
    if (pending.length === 0) return;

    setUploading(true);
    setError(null);

    for (const item of pending) {
      updateStatus(item.id, "uploading");
      try {
        const resized = await resizeImage(item.file);
        const resizedFile = new File([resized], item.file.name, {
          type: "image/jpeg",
        });

        const formData = new FormData();
        formData.append("file", resizedFile);
        if (dealId) formData.append("dealId", dealId);
        if (propertyId) formData.append("propertyId", propertyId);
        formData.append("category", category);
        if (item.caption.trim()) formData.append("caption", item.caption.trim());

        await uploadPhoto(formData);
        updateStatus(item.id, "done");
      } catch (err) {
        console.error("Photo upload error:", err);
        updateStatus(item.id, "error");
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Upload failed: ${msg}`);
      }
    }

    setUploading(false);

    // Clear completed items, revoke URLs
    setQueue((prev) => {
      const remaining = prev.filter((item) => item.status === "error");
      // Revoke URLs for done items
      prev.filter((item) => item.status === "done").forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
      });
      return remaining;
    });

    onUploadComplete?.();
  }

  const pendingCount = queue.filter((item) => item.status === "pending").length;
  const hasQueue = queue.length > 0;

  return (
    <div className="space-y-4">
      {/* Dual input buttons for iOS Safari compatibility */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => galleryInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          <ImagePlus className="h-4 w-4" />
          Add from Library
        </Button>

        {/* Hidden: camera capture (single shot, no multiple) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCapture}
          className="hidden"
        />
        {/* Hidden: gallery picker (allows multiple) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleCapture}
          className="hidden"
        />
      </div>

      {/* Queue preview */}
      {hasQueue && (
        <div className="space-y-3">
          {/* Category selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={uploading}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {PHOTO_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* File queue grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {queue.map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
                  <img
                    src={item.previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  {/* Status overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    {item.status === "uploading" && (
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    )}
                    {item.status === "done" && (
                      <Check className="h-6 w-6 text-green-400" />
                    )}
                    {item.status === "error" && (
                      <X className="h-6 w-6 text-red-400" />
                    )}
                  </div>
                  {/* Remove button (pending only) */}
                  {item.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => removeFromQueue(item.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Caption toggle */}
                {item.status === "pending" && (
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleCaption(item.id)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.showCaption ? "Hide caption" : "Add caption"}
                    </button>
                    {item.showCaption && (
                      <textarea
                        value={item.caption}
                        onChange={(e) => setCaption(item.id, e.target.value)}
                        placeholder="Optional caption..."
                        rows={2}
                        className="w-full rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Upload button */}
          {pendingCount > 0 && (
            <Button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {pendingCount} {pendingCount === 1 ? "Photo" : "Photos"}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
