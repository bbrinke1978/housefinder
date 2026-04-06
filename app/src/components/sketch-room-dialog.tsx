"use client";

import { useState, useEffect } from "react";
import type { SketchRoom } from "@/types";

const PRESET_LABELS = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Dining Room",
  "Office",
  "Closet",
  "Hallway",
  "Laundry",
  "Storage",
  "Garage",
  "Custom",
] as const;

interface SketchRoomDialogProps {
  room: SketchRoom | null;
  open: boolean;
  onSave: (updates: Pick<SketchRoom, "label" | "lengthFt" | "widthFt" | "sqft">) => void;
  onCancel: () => void;
}

export function SketchRoomDialog({
  room,
  open,
  onSave,
  onCancel,
}: SketchRoomDialogProps) {
  const [label, setLabel] = useState(room?.label ?? "Bedroom");
  const [customLabel, setCustomLabel] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [lengthFt, setLengthFt] = useState(room?.lengthFt ?? 12);
  const [widthFt, setWidthFt] = useState(room?.widthFt ?? 10);

  useEffect(() => {
    if (room) {
      const isPreset = PRESET_LABELS.slice(0, -1).includes(
        room.label as (typeof PRESET_LABELS)[number]
      );
      if (isPreset) {
        setLabel(room.label);
        setIsCustom(false);
        setCustomLabel("");
      } else {
        setLabel("Custom");
        setIsCustom(true);
        setCustomLabel(room.label);
      }
      setLengthFt(room.lengthFt);
      setWidthFt(room.widthFt);
    }
  }, [room]);

  if (!open) return null;

  const sqft = Math.round(lengthFt * widthFt * 10) / 10;
  const finalLabel = isCustom ? (customLabel.trim() || "Room") : label;

  function handleSave() {
    onSave({ label: finalLabel, lengthFt, widthFt, sqft });
  }

  function handleLabelChange(val: string) {
    if (val === "Custom") {
      setIsCustom(true);
      setLabel("Custom");
    } else {
      setIsCustom(false);
      setLabel(val);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-xl p-5 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold mb-4">
          {room ? "Edit Room" : "Add Room"}
        </h2>

        {/* Room label */}
        <div className="space-y-1 mb-3">
          <label className="text-sm font-medium text-foreground">Room Type</label>
          <select
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
          >
            {PRESET_LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Custom label input */}
        {isCustom && (
          <div className="space-y-1 mb-3">
            <label className="text-sm font-medium text-foreground">Room Name</label>
            <input
              type="text"
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              placeholder="e.g. Master Suite"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Length (ft)</label>
            <input
              type="number"
              min={1}
              max={200}
              step={0.5}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              value={lengthFt}
              onChange={(e) => setLengthFt(Math.max(1, parseFloat(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Width (ft)</label>
            <input
              type="number"
              min={1}
              max={200}
              step={0.5}
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              value={widthFt}
              onChange={(e) => setWidthFt(Math.max(1, parseFloat(e.target.value) || 1))}
            />
          </div>
        </div>

        {/* Auto-calculated sqft */}
        <div className="bg-muted rounded-md px-3 py-2 mb-4 text-sm text-center">
          <span className="text-muted-foreground">Area: </span>
          <span className="font-semibold">{sqft.toLocaleString("en-US")} sq ft</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-9 rounded-md border border-border bg-background hover:bg-accent text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-9 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors"
          >
            {room ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
