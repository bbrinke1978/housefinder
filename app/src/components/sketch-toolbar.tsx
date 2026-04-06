"use client";

import { Plus, Save, ZoomIn, ZoomOut, Home } from "lucide-react";

interface SketchToolbarProps {
  onAddRoom: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  totalSqft: number;
  isSaving: boolean;
  readOnly?: boolean;
}

export function SketchToolbar({
  onAddRoom,
  onSave,
  onZoomIn,
  onZoomOut,
  onResetView,
  totalSqft,
  isSaving,
  readOnly = false,
}: SketchToolbarProps) {
  const formattedSqft = totalSqft > 0
    ? totalSqft.toLocaleString("en-US") + " sq ft"
    : "0 sq ft";

  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg flex-wrap">
      {/* Total sqft display */}
      <div className="flex items-center gap-1 font-semibold text-sm text-foreground min-w-[110px]">
        <span className="text-muted-foreground text-xs font-normal">Total:</span>
        <span>{formattedSqft}</span>
      </div>

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomIn}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border bg-background hover:bg-accent transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border bg-background hover:bg-accent transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onResetView}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border bg-background hover:bg-accent transition-colors"
          title="Reset view"
        >
          <Home className="h-4 w-4" />
        </button>
      </div>

      {/* Action buttons (hidden in readOnly) */}
      {!readOnly && (
        <>
          <button
            type="button"
            onClick={onAddRoom}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background hover:bg-accent text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Room
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving…" : "Save"}
          </button>
        </>
      )}
    </div>
  );
}
