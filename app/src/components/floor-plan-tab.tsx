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
  // For new plan creation: "upload" or "sketch" mode toggle
  const [newPlanMode, setNewPlanMode] = useState<"upload" | "sketch">("upload");
  // For new sketch: floor label and version
  const [sketchFloorLabel, setSketchFloorLabel] = useState<FloorLabel>("main");
  const [sketchVersion, setSketchVersion] = useState<FloorPlanVersion>("as-is");

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
              onClick={() => {
                setNewPlanMode("sketch");
                setShowUpload(true);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
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

      {/* New plan panel — Upload or Sketch */}
      {showUpload && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">New Floor Plan</h3>
          </div>
          {/* Mode toggle: Upload vs Sketch */}
          <div className="flex gap-1 w-fit rounded-md border bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setNewPlanMode("upload")}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${
                newPlanMode === "upload"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-3 w-3" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => setNewPlanMode("sketch")}
              className={`inline-flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition-colors ${
                newPlanMode === "sketch"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pencil className="h-3 w-3" />
              Sketch
            </button>
          </div>

          {newPlanMode === "upload" && (
            <FloorPlanUpload
              dealId={dealId}
              onUploaded={handleUploaded}
            />
          )}

          {newPlanMode === "sketch" && (
            <div className="space-y-3">
              {/* Floor label + version pickers for new sketch */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Floor</label>
                  <select
                    className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                    value={sketchFloorLabel}
                    onChange={(e) => setSketchFloorLabel(e.target.value as FloorLabel)}
                  >
                    <option value="main">Main</option>
                    <option value="upper">Upper</option>
                    <option value="basement">Basement</option>
                    <option value="garage">Garage</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Version</label>
                  <div className="flex items-center border border-border rounded-md overflow-hidden h-8">
                    <button
                      type="button"
                      onClick={() => setSketchVersion("as-is")}
                      className={`px-3 text-xs h-full transition-colors ${
                        sketchVersion === "as-is"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      As-Is
                    </button>
                    <button
                      type="button"
                      onClick={() => setSketchVersion("proposed")}
                      className={`px-3 text-xs h-full transition-colors border-l border-border ${
                        sketchVersion === "proposed"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      Proposed
                    </button>
                  </div>
                </div>
              </div>
              <FloorPlanSketch
                dealId={dealId}
                floorLabel={sketchFloorLabel}
                version={sketchVersion}
                onSave={handleUploaded}
              />
            </div>
          )}
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
          // Sketch plan — render FloorPlanSketch with existing rooms from sketchData
          <FloorPlanSketch
            dealId={dealId}
            planId={activePlan.plan.id}
            initialRooms={
              activePlan.plan.sketchData
                ? (JSON.parse(activePlan.plan.sketchData) as SketchRoom[])
                : []
            }
            floorLabel={activePlan.plan.floorLabel}
            version={activePlan.plan.version}
            onSave={() => {
              startTransition(() => {
                // revalidatePath in server action refreshes data after save
              });
            }}
          />
        )
      ) : (
        // No plan for this floor/version — show upload prompt
        !showUpload && (
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No {effectiveVersion === "as-is" ? "as-is" : "proposed"} plan for{" "}
              {activeFloor ? FLOOR_LABEL_DISPLAY[activeFloor] : "this floor"}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  setNewPlanMode("upload");
                  setShowUpload(true);
                }}
                className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewPlanMode("sketch");
                  if (activeFloor) setSketchFloorLabel(activeFloor);
                  setSketchVersion(effectiveVersion);
                  setShowUpload(true);
                }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Sketch
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
