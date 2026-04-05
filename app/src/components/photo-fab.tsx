"use client";

import { useRef, useState } from "react";
import { Camera, Check } from "lucide-react";
import { uploadPhoto } from "@/lib/photo-actions";

/**
 * resizeImage — client-side canvas resize to max 1600px longest side, JPEG 0.8 quality.
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

/**
 * PhotoFab — floating action button for quick single-photo capture.
 * Visible only on mobile (md:hidden). Uploads to inbox (no dealId/propertyId).
 * Position: above MobileBottomNav (56px) + safe-area + 16px gap.
 */
export function PhotoFab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [justDone, setJustDone] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be captured again
    e.target.value = "";

    setUploading(true);
    try {
      const resized = await resizeImage(file);
      const blob = new File([resized], file.name || "photo.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.append("file", blob);
      formData.append("category", "other");
      await uploadPhoto(formData);

      // Brief success feedback
      setJustDone(true);
      setTimeout(() => setJustDone(false), 1500);
    } catch (err) {
      console.error("[PhotoFab] Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="md:hidden fixed z-40 right-4"
      style={{
        bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 16px)",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        aria-label="Capture photo"
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors ${
          justDone
            ? "bg-emerald-500 text-white"
            : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
        } disabled:opacity-60`}
      >
        {justDone ? (
          <Check className="h-6 w-6" />
        ) : (
          <Camera className="h-6 w-6" />
        )}
      </button>
    </div>
  );
}
