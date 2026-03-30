"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadReceipt } from "@/lib/receipt-actions";
import { addExpense } from "@/lib/budget-actions";
import type { BudgetCategory } from "@/types";

interface ReceiptUploadProps {
  budgetId: string;
  categories: BudgetCategory[];
  dealId: string;
  onExpenseCreated?: () => void;
}

interface PreFillState {
  receiptId: string;
  vendor: string;
  amount: string; // dollars as string for input
  date: string;
  categoryId: string;
  imageUrl: string; // local object URL for thumbnail
  ocrFailed: boolean;
}

/**
 * resizeImage — client-side canvas resize to max 1920px longest side, JPEG 0.8 quality.
 * Reduces a ~5MB phone photo to ~400KB.
 */
async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
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

export function ReceiptUpload({
  budgetId,
  categories,
  dealId,
  onExpenseCreated,
}: ReceiptUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<PreFillState | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError(null);

    // Create local thumbnail URL before resizing
    const imageUrl = URL.createObjectURL(file);

    try {
      // Resize image client-side
      const resized = await resizeImage(file);
      const resizedFile = new File([resized], file.name, {
        type: "image/jpeg",
      });

      // Upload + OCR via server action
      const formData = new FormData();
      formData.append("file", resizedFile);
      formData.append("budgetId", budgetId);
      formData.append("dealId", dealId);
      const result = await uploadReceipt(formData);

      const allNull =
        result.vendor === null &&
        result.date === null &&
        result.totalCents === null;

      setPrefill({
        receiptId: result.receiptId,
        vendor: result.vendor ?? "",
        amount:
          result.totalCents != null
            ? (result.totalCents / 100).toFixed(2)
            : "",
        date: result.date ?? new Date().toISOString().split("T")[0],
        categoryId: categories[0]?.id ?? "",
        imageUrl,
        ocrFailed: allNull,
      });
    } catch (err) {
      console.error("Receipt upload error:", err);
      setError("Upload failed. Please try again.");
      URL.revokeObjectURL(imageUrl);
    } finally {
      setScanning(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSaveExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prefill) return;

    setSaving(true);
    setError(null);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set("budgetId", budgetId);
      formData.set("dealId", dealId);
      formData.set(
        "amountCents",
        String(Math.round(parseFloat(formData.get("amount") as string) * 100))
      );
      formData.set("receiptId", prefill.receiptId);
      formData.delete("amount");

      await addExpense(formData);

      // Cleanup thumbnail
      URL.revokeObjectURL(prefill.imageUrl);
      setPrefill(null);
      onExpenseCreated?.();
    } catch (err) {
      console.error("Save expense error:", err);
      setError("Failed to save expense. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (prefill) URL.revokeObjectURL(prefill.imageUrl);
    setPrefill(null);
    setError(null);
  }

  return (
    <div className="space-y-4">
      {/* Scan Receipt button — hidden input triggers camera on mobile, file picker on desktop */}
      {!prefill && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-2"
          >
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning receipt...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                Scan Receipt
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Pre-fill form shown after upload + OCR */}
      {prefill && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="flex gap-4">
            {/* Receipt thumbnail */}
            <div className="flex-shrink-0">
              <img
                src={prefill.imageUrl}
                alt="Receipt"
                className="h-24 w-24 object-cover rounded-md border"
              />
            </div>

            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Receipt Uploaded</p>
              {prefill.ocrFailed ? (
                <p className="text-xs text-muted-foreground">
                  Could not auto-detect receipt details — please enter manually.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Review and confirm the auto-detected details below.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveExpense} className="space-y-3">
            {/* Vendor */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Vendor
              </label>
              <input
                type="text"
                name="vendor"
                defaultValue={prefill.vendor}
                placeholder="e.g. Home Depot"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Amount ($)
              </label>
              <input
                type="number"
                name="amount"
                defaultValue={prefill.amount}
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Date
              </label>
              <input
                type="date"
                name="expenseDate"
                defaultValue={prefill.date}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <select
                name="categoryId"
                defaultValue={prefill.categoryId}
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Description (optional)
              </label>
              <input
                type="text"
                name="description"
                placeholder="e.g. Lumber, nails, drywall"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  "Save Expense"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
