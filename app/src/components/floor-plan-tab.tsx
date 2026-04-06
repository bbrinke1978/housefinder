"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { Plus, LayoutGrid, Pencil, Upload } from "lucide-react";
import { FloorPlanUpload } from "@/components/floor-plan-upload";
import type { FloorPlanWithPins, SketchRoom } from "@/types";
import type { FloorLabel, FloorPlanVersion } from "@/types";

// Dynamically import viewer to avoid SSR issues with pdfjs and react-zoom-pan-pinch
const FloorPlanViewer = dynamic(
  () => import("@/components/floor-plan-viewer").then((m) => m.FloorPlanViewer),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading viewer...</div> }
);

// Dynamically import sketch tool to avoid SSR issues with react-konva
const FloorPlanSketch = dynamic(
  () => import("@/components/floor-plan-sketch").then((m) => m.FloorPlanSketch),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading sketch tool...</div> }
);

interface BudgetCategoryOption {
  id: string;
  name: string;
}

interface FloorPlanTabProps {
  floorPlans: FloorPlanWithPins[];
  dealId: string;
  budgetCategories?: BudgetCategoryOption[];
}

const FLOOR_LABEL_DISPLAY: Record<FloorLabel, string> = {
  main: "Main",
  upper: "Upper",
  basement: "Basement",
  garage: "Garage",
  other: "Other",
};

// Floor label display order
const FLOOR_ORDER: FloorLabel[] = ["main", "upper", "basement", "garage", "other"];

export function FloorPlanTab({
  floorPlans,
  dealId,
  budgetCategories,
}: FloorPlanTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<FloorLabel | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<FloorPlanVersion>("as-is");
  const [, startTransition] = useTransition();

  // Group plans by floor label
  const plansByFloor = new Map<FloorLabel, FloorPlanWithPins[]>();
  for (const fp of floorPlans) {
    const label = fp.plan.floorLabel as FloorLabel;
    if (!plansByFloor.has(label)) plansByFloor.set(label, []);
    plansByFloor.get(label)!.push(fp);
  }

  // Available floors in display order
  const availableFloors = FLOOR_ORDER.filter((f) => plansByFloor.has(f));

  // Active floor — default to first available
  const activeFloor = selectedFloor ?? availableFloors[0] ?? null;

  // Plans for active floor
  const floorPlansForActive = activeFloor ? (plansByFloor.get(activeFloor) ?? []) : [];

  // Check which versions exist for this floor
  const versionsForFloor = new Set(floorPlansForActive.map((fp) => fp.plan.version as FloorPlanVersion));
  const hasAsIs = versionsForFloor.has("as-is");
  const hasProposed = versionsForFloor.has("proposed");
  const showVersionToggle = hasAsIs && hasProposed;

  // Active version — auto-select available version
  const effectiveVersion: FloorPlanVersion =
    showVersionToggle
      ? selectedVersion
      : hasProposed
      ? "proposed"
      : "as-is";

  // Find the active plan
  const activePlan = floorPlansForActive.find(
    (fp) => fp.plan.version === effectiveVersion
  ) ?? floorPlansForActive[0] ?? null;

  // Total sqft from all plans
  const totalSqft = floorPlans.reduce(
    (sum, fp) => sum + (fp.plan.totalSqft ?? 0),
    0
  );

  // Refresh triggered by upload completing — parent revalidatePath handles data
  function handleUploaded() {
    setShowUpload(false);
    startTransition(() => {
      // Optimistic: close upload panel. Server revalidation will refresh the data.
    });
  }

  if (floorPlans.length === 0 && !showUpload) {
    return (
      <div className="space-y-4">
        {/* Empty state */}
        <div className="rounded-lg border-2 border-dashed border-border p-10 text-center">
          <LayoutGrid className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground mb-1">
            No floor plans yet
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Upload a PDF or image, or sketch a floor plan from scratch.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Upload Floor Plan
            </button>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
              title="Coming in next plan"
            >
              <Pencil className="h-4 w-4" />
              Sketch Floor Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row: total sqft + add button */}
      <div className="flex items-center justify-between">
        {totalSqft > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {totalSqft.toLocaleString()}
            </span>{" "}
            sq ft total
          </p>
        )}
        <button
          type="button"
          onClick={() => setShowUpload((prev) => !prev)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {showUpload ? "Cancel" : "New Floor Plan"}
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <h3 className="text-sm font-medium mb-3">Upload Floor Plan</h3>
          <FloorPlanUpload
            dealId={dealId}
            onUploaded={handleUploaded}
          />
        </div>
      )}

      {/* Floor selector — horizontal scroll of floor buttons */}
      {availableFloors.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableFloors.map((floor) => {
            const count = plansByFloor.get(floor)?.length ?? 0;
            const isActive = floor === activeFloor;
            return (
              <button
                key={floor}
                type="button"
                onClick={() => {
                  setSelectedFloor(floor);
                  setSelectedVersion("as-is");
                }}
                className={`flex items-center gap-2 shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                }`}
              >
                {FLOOR_LABEL_DISPLAY[floor]}
                <span
                  className={`inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1 ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Version toggle */}
      {showVersionToggle && (
        <div className="flex gap-1 w-fit rounded-md border bg-muted p-0.5">
          {(["as-is", "proposed"] as FloorPlanVersion[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSelectedVersion(v)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                effectiveVersion === v
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "as-is" ? "As-Is" : "Proposed"}
            </button>
          ))}
        </div>
      )}

      {/* Plan viewer */}
      {activePlan ? (
        activePlan.plan.sourceType === "upload" ? (
          <FloorPlanViewer
            plan={activePlan}
            dealId={dealId}
            budgetCategories={budgetCategories}
          />
        ) : (
          // Sketch plan — Plan 15-03 will add the sketch tool
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
            <Pencil className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Sketch tool coming soon
            </p>
          </div>
        )
      ) : (
        // No plan for this floor/version — show upload prompt
        !showUpload && (
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No {effectiveVersion === "as-is" ? "as-is" : "proposed"} plan for{" "}
              {activeFloor ? FLOOR_LABEL_DISPLAY[activeFloor] : "this floor"}
            </p>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Upload Floor Plan
            </button>
          </div>
        )
      )}
    </div>
  );
}
