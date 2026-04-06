"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Image, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createFloorPlan } from "@/lib/floor-plan-actions";
import type { FloorLabel, FloorPlanVersion } from "@/types";

interface FloorPlanUploadProps {
  dealId: string;
  propertyId?: string;
  onUploaded: () => void;
}

const FLOOR_LABELS: { value: FloorLabel; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "upper", label: "Upper" },
  { value: "basement", label: "Basement" },
  { value: "garage", label: "Garage" },
  { value: "other", label: "Other" },
];

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * resizeImage — client-side canvas resize to max 1920px longest side, JPEG 0.8.
 * Reduces phone photos before upload. Returns dimensions of the resized image.
 */
async function resizeImage(
  file: File
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_SIDE = 1920;
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
          if (blob) resolve({ blob, width, height });
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

export function FloorPlanUpload({
  dealId,
  propertyId,
  onUploaded,
}: FloorPlanUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [floorLabel, setFloorLabel] = useState<FloorLabel>("main");
  const [version, setVersion] = useState<FloorPlanVersion>("as-is");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Size check for PDFs
    if (file.type === "application/pdf" && file.size > MAX_PDF_BYTES) {
      setError("PDF files must be 10 MB or smaller.");
      setSelectedFile(null);
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    e.target.value = "";
  }

  function clearFile() {
    setSelectedFile(null);
    setError(null);
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("dealId", dealId);
      if (propertyId) formData.append("propertyId", propertyId);
      formData.append("floorLabel", floorLabel);
      formData.append("version", version);
      formData.append("sourceType", "upload");

      const isPdf = selectedFile.type === "application/pdf";

      if (isPdf) {
        formData.append("file", selectedFile, selectedFile.name);
        // No dimensions for PDFs
      } else {
        // Client-side resize for images
        const { blob, width, height } = await resizeImage(selectedFile);
        const resizedFile = new File([blob], selectedFile.name, {
          type: "image/jpeg",
        });
        formData.append("file", resizedFile, resizedFile.name);
        formData.append("naturalWidth", String(width));
        formData.append("naturalHeight", String(height));
      }

      await createFloorPlan(formData);
      setSelectedFile(null);
      onUploaded();
    } catch (err) {
      console.error("Floor plan upload error:", err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const isPdf = selectedFile?.type === "application/pdf";
  const isImage =
    selectedFile?.type === "image/jpeg" ||
    selectedFile?.type === "image/png";

  return (
    <div className="space-y-4">
      {/* File picker */}
      {!selectedFile ? (
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-8 w-8" />
            <p className="text-sm font-medium">Click to upload floor plan</p>
            <p className="text-xs">PDF, JPG, or PNG — PDF max 10 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          {isPdf ? (
            <FileText className="h-5 w-5 shrink-0 text-primary" />
          ) : (
            <Image className="h-5 w-5 shrink-0 text-primary" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(0)} KB
              {isImage ? " — will be resized to 1920px max" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Floor label + version selectors (shown once file selected) */}
      {selectedFile && (
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Floor
            </label>
            <select
              value={floorLabel}
              onChange={(e) => setFloorLabel(e.target.value as FloorLabel)}
              disabled={uploading}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {FLOOR_LABELS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Version
            </label>
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="floor-plan-version"
                  value="as-is"
                  checked={version === "as-is"}
                  onChange={() => setVersion("as-is")}
                  disabled={uploading}
                  className="accent-primary"
                />
                <span className="text-sm">As-Is</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="floor-plan-version"
                  value="proposed"
                  checked={version === "proposed"}
                  onChange={() => setVersion("proposed")}
                  disabled={uploading}
                  className="accent-primary"
                />
                <span className="text-sm">Proposed</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {selectedFile && (
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
              Upload Floor Plan
            </>
          )}
        </Button>
      )}
    </div>
  );
}
