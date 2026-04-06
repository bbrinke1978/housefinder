"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPin } from "@/lib/floor-plan-actions";
import { PIN_COLORS } from "@/types";
import type { PinCategory } from "@/types";

interface BudgetCategoryOption {
  id: string;
  name: string;
}

interface FloorPlanPinFormProps {
  floorPlanId: string;
  xPct: number;
  yPct: number;
  budgetCategories?: BudgetCategoryOption[];
  onCreated: () => void;
  onCancel: () => void;
}

const PIN_CATEGORY_OPTIONS: { value: PinCategory; label: string }[] = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "structural", label: "Structural" },
  { value: "cosmetic", label: "Cosmetic" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "flooring", label: "Flooring" },
  { value: "painting", label: "Painting" },
  { value: "windows_doors", label: "Windows / Doors" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "landscaping", label: "Landscaping" },
  { value: "general", label: "General" },
];

export function FloorPlanPinForm({
  floorPlanId,
  xPct,
  yPct,
  budgetCategories,
  onCreated,
  onCancel,
}: FloorPlanPinFormProps) {
  const [category, setCategory] = useState<PinCategory>("general");
  const [note, setNote] = useState("");
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("floorPlanId", floorPlanId);
      formData.append("xPct", String(xPct));
      formData.append("yPct", String(yPct));
      formData.append("category", category);
      if (note.trim()) formData.append("note", note.trim());
      if (budgetCategoryId) formData.append("budgetCategoryId", budgetCategoryId);

      await createPin(formData);
      onCreated();
    } catch (err) {
      console.error("Failed to create pin:", err);
      setError("Failed to save pin. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectedColor = PIN_COLORS[category];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Add Annotation Pin</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {PIN_CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs text-left transition-colors ${
                    category === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIN_COLORS[opt.value] }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="pin-note"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Note (optional)
            </label>
            <textarea
              id="pin-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Replace water heater, update panel..."
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Budget category link */}
          {budgetCategories && budgetCategories.length > 0 && (
            <div className="space-y-1.5">
              <label
                htmlFor="pin-budget-category"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Link to Budget Category (optional)
              </label>
              <select
                id="pin-budget-category"
                value={budgetCategoryId}
                onChange={(e) => setBudgetCategoryId(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">None</option>
                {budgetCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center gap-2"
              style={{ backgroundColor: selectedColor }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Drop Pin"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
