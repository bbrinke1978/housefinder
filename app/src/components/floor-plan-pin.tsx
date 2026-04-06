"use client";

import { useState } from "react";
import { Trash2, ExternalLink } from "lucide-react";
import { deletePin } from "@/lib/floor-plan-actions";
import type { FloorPlanPinRow } from "@/db/schema";

interface FloorPlanPinProps {
  pin: FloorPlanPinRow;
  color: string;
  onDelete?: (id: string) => void;
  dealId?: string;
}

/** Human-readable labels for pin categories. */
const CATEGORY_LABELS: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  structural: "Structural",
  cosmetic: "Cosmetic",
  hvac: "HVAC",
  roofing: "Roofing",
  flooring: "Flooring",
  painting: "Painting",
  windows_doors: "Windows / Doors",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  landscaping: "Landscaping",
  general: "General",
};

export function FloorPlanPin({ pin, color, onDelete, dealId }: FloorPlanPinProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!onDelete) return;
    setDeleting(true);
    try {
      await deletePin(pin.id);
      onDelete(pin.id);
    } catch (err) {
      console.error("Failed to delete pin:", err);
    } finally {
      setDeleting(false);
    }
  }

  const categoryLabel = CATEGORY_LABELS[pin.category] ?? pin.category;
  const budgetLink =
    pin.budgetCategoryId && dealId
      ? `/deals/${dealId}?tab=financials&category=${pin.budgetCategoryId}`
      : null;

  return (
    <div className="relative" style={{ position: "absolute" }}>
      {/* Pin marker */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-white"
        style={{ backgroundColor: color }}
        aria-label={`${categoryLabel} pin${pin.note ? `: ${pin.note}` : ""}`}
        title={categoryLabel}
      >
        <span className="text-white text-[10px] font-bold leading-none">
          {categoryLabel.charAt(0).toUpperCase()}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute z-50 w-52 rounded-lg border bg-popover text-popover-foreground shadow-lg p-3 space-y-2"
          style={{
            // Position above pin, horizontally centered
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50 space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0 border border-white/30"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-semibold">{categoryLabel}</span>
            </div>

            {pin.note && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pin.note}
              </p>
            )}

            <div className="flex items-center justify-between pt-1 border-t border-border">
              {budgetLink ? (
                <a
                  href={budgetLink}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  onClick={() => setOpen(false)}
                >
                  View in Budget
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span />
              )}

              {onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  {deleting ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
