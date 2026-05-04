"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitJvLead } from "@/lib/jv-actions";

/**
 * resizeImage — client-side canvas resize to max 1600px longest side, JPEG 0.8 quality.
 * Copied verbatim from photo-upload.tsx (project pattern: duplicate rather than shared util).
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

interface JvSubmitFormProps {} // no props — fully self-contained

export function JvSubmitForm(_props: JvSubmitFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [photo, setPhoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = "";
    try {
      // Revoke old preview URL to avoid memory leaks
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      const blob = await resizeImage(file);
      const preview = URL.createObjectURL(blob);
      setPhoto({ blob, preview });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo processing failed");
    }
  }

  function handleReplacePhoto() {
    if (photo) {
      URL.revokeObjectURL(photo.preview);
      setPhoto(null);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!photo) {
      setError("Photo is required — JV agreement Section 3");
      return;
    }
    if (!address.trim()) {
      setError("Address is required");
      return;
    }
    setSubmitting(true);
    try {
      setProgress("Creating lead…");
      const { id } = await submitJvLead({ address, conditionNotes: conditionNotes || undefined });
      setProgress("Uploading photo…");
      const fd = new FormData();
      fd.append("file", photo.blob, "submission.jpg");
      const res = await fetch(`/api/jv-leads/${id}/photo`, { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `Photo upload failed (HTTP ${res.status})`);
      }
      router.push("/jv-ledger?submitted=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setSubmitting(false);
      setProgress(null);
    }
  }

  const canSubmit = !!photo && !!address.trim() && !submitting;
  const buttonLabel = progress ?? "Submit Lead";

  return (
    <div className="space-y-6">
      {/* Photo block FIRST — JV partners think: see house → snap photo → type address */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Front-of-property photo <span className="text-destructive">*</span></p>

        {photo ? (
          <div className="space-y-2">
            <img
              src={photo.preview}
              alt="Property preview"
              className="w-full max-h-64 rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              onClick={handleReplacePhoto}
              className="text-sm text-muted-foreground underline hover:text-foreground transition-colors"
            >
              Replace photo
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-12 flex items-center justify-center gap-2"
              onClick={() => cameraRef.current?.click()}
              disabled={submitting}
            >
              <Camera className="h-5 w-5" />
              Take Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-12 flex items-center justify-center gap-2"
              onClick={() => galleryRef.current?.click()}
              disabled={submitting}
            >
              <ImagePlus className="h-5 w-5" />
              From Gallery
            </Button>
          </div>
        )}

        {/* Hidden: camera capture */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          className="hidden"
        />
        {/* Hidden: gallery picker (no capture attribute) */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <label htmlFor="jv-address" className="text-sm font-medium">
          Full property address <span className="text-destructive">*</span>
        </label>
        <Input
          id="jv-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          inputMode="text"
          autoComplete="street-address"
          placeholder="123 Main St, Salt Lake City, UT 84101"
          required
          disabled={submitting}
          className="min-h-12 py-3"
        />
      </div>

      {/* Condition notes */}
      <div className="space-y-2">
        <label htmlFor="jv-notes" className="text-sm font-medium">
          Condition notes <span className="text-muted-foreground text-xs">(optional)</span>
        </label>
        <textarea
          id="jv-notes"
          value={conditionNotes}
          onChange={(e) => setConditionNotes(e.target.value)}
          rows={3}
          placeholder="Peeling paint, overgrown lawn, broken windows..."
          disabled={submitting}
          className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-50"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit button — sticky on mobile above the bottom nav */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-4 right-4 md:static md:w-full min-h-12 text-base font-semibold"
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
