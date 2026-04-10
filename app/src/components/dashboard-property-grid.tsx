"use client";

import { useState } from "react";
import { PropertyCard } from "@/components/property-card";
import { BulkEnroll } from "@/components/campaigns/bulk-enroll";
import { BulkSkipTrace } from "@/components/bulk-skip-trace";
import type { PropertyWithLead } from "@/types";
import type { EmailSequenceSummary } from "@/types";
import { Mail } from "lucide-react";

interface DashboardPropertyGridProps {
  properties: PropertyWithLead[];
  sequences: EmailSequenceSummary[];
}

export function DashboardPropertyGrid({
  properties,
  sequences,
}: DashboardPropertyGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(leadId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedLeadIds = Array.from(selectedIds);
  const selectedPropertyIds = properties
    .filter((p) => selectedIds.has(p.leadId))
    .map((p) => p.id);

  return (
    <>
      <div
        className="stagger-children grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 relative z-0"
        style={{ paddingBottom: selectedLeadIds.length > 0 ? "80px" : undefined }}
      >
        {properties.map((property) => (
          <div key={property.id} className="relative group/selectable">
            {/* Selection checkbox overlay */}
            <div
              className="absolute top-2 left-2 z-10 opacity-0 group-hover/selectable:opacity-100 transition-opacity"
              style={{
                opacity: selectedIds.has(property.leadId) ? 1 : undefined,
              }}
            >
              <button
                type="button"
                onClick={(e) => toggleSelect(property.leadId, e)}
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                  selectedIds.has(property.leadId)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/80 hover:border-primary/60"
                }`}
                aria-label={
                  selectedIds.has(property.leadId)
                    ? "Deselect lead"
                    : "Select lead"
                }
              >
                {selectedIds.has(property.leadId) && (
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                )}
              </button>
            </div>

            {/* Email indicator dot */}
            {property.hasEmail && (
              <div className="absolute top-2 right-2 z-10" title="Has contact email">
                <Mail className="h-3 w-3 text-primary/60" />
              </div>
            )}

            <PropertyCard
              property={property}
              selected={selectedIds.has(property.leadId)}
            />
          </div>
        ))}
      </div>

      {selectedLeadIds.length > 0 && (
        <BulkEnroll
          selectedLeadIds={selectedLeadIds}
          sequences={sequences}
          onClear={clearSelection}
          extra={
            <BulkSkipTrace
              selectedPropertyIds={selectedPropertyIds}
              onClear={clearSelection}
            />
          }
        />
      )}
    </>
  );
}
