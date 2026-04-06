"use client";

/**
 * FloorPlanSketch — stub component for Plan 15-03.
 * The interactive sketch tool will be implemented in Phase 15 Plan 03.
 */

import { Pencil } from "lucide-react";
import type { SketchRoom } from "@/types";

interface FloorPlanSketchProps {
  dealId: string;
  floorLabel: string;
  version: string;
  onSave?: () => void;
  planId?: string;
  initialRooms?: SketchRoom[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function FloorPlanSketch(_props: FloorPlanSketchProps) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border p-10 text-center">
      <Pencil className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm font-medium text-muted-foreground mb-1">
        Sketch Tool Coming Soon
      </p>
      <p className="text-xs text-muted-foreground">
        The interactive room sketch tool will be available in the next update.
      </p>
    </div>
  );
}
