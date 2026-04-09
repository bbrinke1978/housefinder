"use client";

import dynamic from "next/dynamic";
import type { FloorPlanWithPins } from "@/types";
import type { FloorPlanPinRow } from "@/db/schema";

// Category colors matching the main viewer/annotator
const PIN_CATEGORY_COLORS: Record<string, string> = {
  general: "#6b7280",
  plumbing: "#3b82f6",
  electrical: "#f59e0b",
  hvac: "#10b981",
  structural: "#ef4444",
  cosmetic: "#1e4d8c",
  appliance: "#f97316",
  roofing: "#06b6d4",
  foundation: "#84cc16",
  exterior: "#ec4899",
};

const PIN_CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  structural: "Structural",
  cosmetic: "Cosmetic",
  appliance: "Appliance",
  roofing: "Roofing",
  foundation: "Foundation",
  exterior: "Exterior",
};

// Dynamically import viewers to avoid SSR issues
const FloorPlanViewer = dynamic(
  () => import("@/components/floor-plan-viewer").then((m) => m.FloorPlanViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-sm text-gray-500">
        Loading floor plan...
      </div>
    ),
  }
);

const FloorPlanSketch = dynamic(
  () => import("@/components/floor-plan-sketch").then((m) => m.FloorPlanSketch),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center text-sm text-gray-500">
        Loading sketch...
      </div>
    ),
  }
);

interface FloorPlanShareViewProps {
  plan: FloorPlanWithPins;
}

export function FloorPlanShareView({ plan }: FloorPlanShareViewProps) {
  const { plan: floorPlan, pins } = plan;

  // Floor label display
  const floorLabelDisplay =
    floorPlan.floorLabel.charAt(0).toUpperCase() + floorPlan.floorLabel.slice(1);
  const versionDisplay =
    floorPlan.version === "as-is" ? "As-Is" : "Proposed";

  // Used categories for legend
  const usedCategories = Array.from(new Set(pins.map((p) => p.category)));

  // Sketch rooms from sketchData
  const sketchRooms =
    floorPlan.sketchData ? JSON.parse(floorPlan.sketchData) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Floor Plan — {floorLabelDisplay} ({versionDisplay})
            </h1>
            {floorPlan.totalSqft != null && floorPlan.totalSqft > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                {floorPlan.totalSqft.toLocaleString()} sq ft
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {pins.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1 font-medium">
                {pins.length} annotation{pins.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Floor plan display */}
      <div className="p-4">
        {floorPlan.sourceType === "upload" ? (
          <FloorPlanViewer
            plan={plan}
            dealId=""
            readOnly={true}
          />
        ) : (
          <FloorPlanSketch
            dealId=""
            planId={floorPlan.id}
            initialRooms={sketchRooms}
            floorLabel={floorPlan.floorLabel}
            version={floorPlan.version}
            readOnly={true}
            onSave={() => {}}
          />
        )}
      </div>

      {/* Pin list */}
      {pins.length > 0 && (
        <div className="px-6 pb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Annotations
          </h2>
          <div className="space-y-2">
            {pins.map((pin: FloorPlanPinRow, i: number) => {
              const color = PIN_CATEGORY_COLORS[pin.category] ?? "#6b7280";
              const label = PIN_CATEGORY_LABELS[pin.category] ?? pin.category;
              return (
                <div
                  key={pin.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                    style={{ backgroundColor: color }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-xs font-medium"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    {pin.note && (
                      <p className="text-sm text-gray-700 mt-0.5">{pin.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category legend */}
      {usedCategories.length > 0 && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Legend
          </h2>
          <div className="flex flex-wrap gap-2">
            {usedCategories.map((cat) => {
              const color = PIN_CATEGORY_COLORS[cat] ?? "#6b7280";
              const label = PIN_CATEGORY_LABELS[cat] ?? cat;
              return (
                <div
                  key={cat}
                  className="flex items-center gap-1.5 text-xs text-gray-700"
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
