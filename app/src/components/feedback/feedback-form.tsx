"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFeedbackItem } from "@/lib/feedback-actions";

type FeedbackType = "bug" | "feature" | "idea" | "question";
type FeedbackPriority = "low" | "medium" | "high" | "critical";

interface PendingImage {
  blob: Blob;
  preview: string;
  name: string;
}

interface FormValues {
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  propertyId: string;
  dealId: string;
}

interface FeedbackFormProps {
  urlContext?: string;
  browserContext?: string;
  onSuccess?: () => void;
  defaultValues?: Partial<FormValues>;
}

export function FeedbackForm({
  urlContext,
  browserContext,
  onSuccess,
  defaultValues,
}: FeedbackFormProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<FormValues>({
    type: defaultValues?.type ?? "bug",
    title: defaultValues?.title ?? "",
    description: defaultValues?.description ?? "",
    priority: defaultValues?.priority ?? "medium",
    propertyId: defaultValues?.propertyId ?? "",
    dealId: defaultValues?.dealId ?? "",
  });

  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Paste-from-clipboard handler (per RESEARCH.md section 3)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const handler = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (!blob) continue;
          if (blob.size > 5 * 1024 * 1024) {
            setError("Image too large — max 5 MB per image");
            continue;
          }
          if (pendingImages.length >= 5) {
            setError("Maximum 5 images per submission");
            continue;
          }
          const preview = URL.createObjectURL(blob);
          const ext = item.type.split("/")[1] || "png";
          setPendingImages((prev) => [
            ...prev,
            { blob, preview, name: `paste-${Date.now()}.${ext}` },
          ]);
        }
      }
    };
    el.addEventListener("paste", handler);
    return () => el.removeEventListener("paste", handler);
  }, [pendingImages.length]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - pendingImages.length;
    if (files.length > remaining) {
      setError(`Maximum 5 images total. You can add ${remaining} more.`);
    }
    for (const file of files.slice(0, remaining)) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds 5 MB limit — skipped`);
        continue;
      }
      const preview = URL.createObjectURL(file);
      setPendingImages((prev) => [
        ...prev,
        { blob: file, preview, name: file.name },
      ]);
    }
    // Reset so same file can be re-added after removal
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

    if (!values.title.trim()) {
      setError("Title is required");
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await createFeedbackItem({
        type: values.type,
        title: values.title.trim(),
        description: values.description || undefined,
        priority: values.priority,
        propertyId: values.propertyId || undefined,
        dealId: values.dealId || undefined,
        urlContext: urlContext || undefined,
        browserContext: browserContext || undefined,
      });

      // Upload pending images one at a time
      if (pendingImages.length > 0) {
        let failedCount = 0;
        for (let i = 0; i < pendingImages.length; i++) {
          const img = pendingImages[i];
          setUploadProgress(`Uploading image ${i + 1} of ${pendingImages.length}…`);
          try {
            const formData = new FormData();
            formData.append("file", img.blob, img.name);
            const res = await fetch(`/api/feedback/${id}/attachments`, {
              method: "POST",
              body: formData,
            });
            if (!res.ok) failedCount++;
          } catch {
            failedCount++;
          }
        }
        setUploadProgress(null);
        if (failedCount > 0) {
          setError(
            `Item created but ${failedCount} image${failedCount > 1 ? "s" : ""} failed to upload. ` +
              `You can add them from the item's detail page at /feedback/${id}`
          );
          // Don't block navigation — item was created
        }
      }

      // Cleanup object URLs
      for (const img of pendingImages) {
        URL.revokeObjectURL(img.preview);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/feedback/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Report a bug or request a feature</h2>
        <p className="text-sm text-muted-foreground">
          Your feedback helps improve No BS Workbench.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Type */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-type" className="text-sm font-medium">
          Type <span className="text-destructive">*</span>
        </label>
        <select
          id="fb-type"
          value={values.type}
          onChange={(e) => setValues((v) => ({ ...v, type: e.target.value as FeedbackType }))}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={submitting}
        >
          <option value="bug">Bug</option>
          <option value="feature">Feature request</option>
          <option value="idea">Idea</option>
          <option value="question">Question</option>
        </select>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-title" className="text-sm font-medium">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="fb-title"
          type="text"
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          maxLength={200}
          placeholder="Short summary…"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={submitting}
          required
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="fb-description"
          ref={textareaRef}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          maxLength={10000}
          rows={5}
          placeholder="Steps to reproduce, expected behavior, screenshots… Markdown supported. You can also paste images directly here."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
          disabled={submitting}
        />
        <p className="text-xs text-muted-foreground">
          Markdown supported. Paste screenshots directly into the text area above.
        </p>
      </div>

      {/* Pending images */}
      {pendingImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingImages.map((img, i) => (
            <div key={img.preview} className="relative group rounded-md overflow-hidden border border-border w-20 h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt={img.name}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium"
                title="Remove image"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File picker */}
      <div>
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
          className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pendingImages.length === 0
            ? "Attach image (or paste directly into description)"
            : `Add more images (${pendingImages.length}/5)`}
        </button>
      </div>

      {/* Priority */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-priority" className="text-sm font-medium">Priority</label>
        <select
          id="fb-priority"
          value={values.priority}
          onChange={(e) => setValues((v) => ({ ...v, priority: e.target.value as FeedbackPriority }))}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          disabled={submitting}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Optional property/deal IDs (v1: plain text inputs) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fb-property" className="text-sm font-medium text-muted-foreground">
            Property ID <span className="font-normal">(optional)</span>
          </label>
          <input
            id="fb-property"
            type="text"
            value={values.propertyId}
            onChange={(e) => setValues((v) => ({ ...v, propertyId: e.target.value }))}
            placeholder="Paste property ID"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={submitting}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fb-deal" className="text-sm font-medium text-muted-foreground">
            Deal ID <span className="font-normal">(optional)</span>
          </label>
          <input
            id="fb-deal"
            type="text"
            value={values.dealId}
            onChange={(e) => setValues((v) => ({ ...v, dealId: e.target.value }))}
            placeholder="Paste deal ID"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={submitting}
          />
        </div>
      </div>

      {/* Hidden context fields rendered as read-only info when present */}
      {urlContext && (
        <p className="text-xs text-muted-foreground">
          Page context: <code className="bg-muted px-1 rounded text-xs">{urlContext}</code>
        </p>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <p className="text-sm text-muted-foreground animate-pulse">{uploadProgress}</p>
      )}

      {/* Submit */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="submit"
          disabled={submitting || !values.title.trim()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting…" : "Submit feedback"}
        </button>
      </div>
    </form>
  );
}
