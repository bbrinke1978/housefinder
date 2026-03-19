"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flame, X } from "lucide-react";

const DISTRESS_TYPES = [
  { value: "nod", label: "NOD" },
  { value: "tax_lien", label: "Tax Lien" },
  { value: "lis_pendens", label: "Lis Pendens" },
  { value: "probate", label: "Probate" },
  { value: "code_violation", label: "Code Violation" },
  { value: "vacant", label: "Vacant" },
];

interface MapFiltersProps {
  cities: string[];
  counties: string[];
  filters: { county: string; distressType: string; hot: boolean };
  onFilterChange: (filters: {
    county: string;
    distressType: string;
    hot: boolean;
  }) => void;
}

export function MapFilters({
  counties,
  filters,
  onFilterChange,
}: MapFiltersProps) {
  const hasFilters =
    filters.county || filters.distressType || filters.hot;

  return (
    <div className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center gap-2 rounded-lg bg-background/90 p-2 shadow-lg backdrop-blur-sm">
      {/* County filter */}
      <Select
        value={filters.county}
        onValueChange={(val) =>
          onFilterChange({ ...filters, county: val === "__all__" || val === null ? "" : val })
        }
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="All Counties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Counties</SelectItem>
          {counties.map((county) => (
            <SelectItem key={county} value={county}>
              {county}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Distress type filter */}
      <Select
        value={filters.distressType}
        onValueChange={(val) =>
          onFilterChange({
            ...filters,
            distressType: val === "__all__" || val === null ? "" : val,
          })
        }
      >
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Types</SelectItem>
          {DISTRESS_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Hot leads toggle */}
      <Button
        variant={filters.hot ? "default" : "outline"}
        size="sm"
        className="h-8 text-xs"
        onClick={() => onFilterChange({ ...filters, hot: !filters.hot })}
      >
        <Flame className="mr-1 h-3 w-3" />
        Hot Leads
      </Button>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() =>
            onFilterChange({ county: "", distressType: "", hot: false })
          }
        >
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
