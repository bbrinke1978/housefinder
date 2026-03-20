"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface DashboardFiltersProps {
  cities: string[];
}

const DISTRESS_TYPES = [
  { value: "nod", label: "NOD" },
  { value: "tax_lien", label: "Tax Lien" },
  { value: "lis_pendens", label: "Lis Pendens" },
  { value: "probate", label: "Probate" },
  { value: "code_violation", label: "Code Violation" },
  { value: "vacant", label: "Vacant" },
];

const MIN_SIGNALS_OPTIONS = [
  { value: "", label: "Any Signals" },
  { value: "1", label: "1+ Signals" },
  { value: "2", label: "2+ Signals" },
  { value: "3", label: "3+ Signals" },
  { value: "4", label: "4+ Signals" },
];

const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "date", label: "Date Added" },
  { value: "city", label: "City" },
];

export function DashboardFilters({ cities }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCity = searchParams.get("city") ?? "";
  const currentDistressType = searchParams.get("distressType") ?? "";
  const currentHot = searchParams.get("hot") ?? "";
  const currentMinSignals = searchParams.get("minSignals") ?? "";
  const currentSort = searchParams.get("sort") ?? "score";

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push("/");
  }, [router]);

  const hasFilters =
    currentCity || currentDistressType || currentHot || currentMinSignals || currentSort !== "score";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {/* City filter */}
      <Select
        value={currentCity}
        onValueChange={(val) => updateParams("city", val ?? "")}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="All Cities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Cities</SelectItem>
          {cities.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Distress type filter */}
      <Select
        value={currentDistressType}
        onValueChange={(val) => updateParams("distressType", val ?? "")}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Types</SelectItem>
          {DISTRESS_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Min signals filter */}
      <Select
        value={currentMinSignals}
        onValueChange={(val) => updateParams("minSignals", val ?? "")}
      >
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Any Signals" />
        </SelectTrigger>
        <SelectContent>
          {MIN_SIGNALS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Hot leads toggle */}
      <Button
        variant={currentHot === "true" ? "default" : "outline"}
        size="sm"
        onClick={() => updateParams("hot", currentHot === "true" ? "" : "true")}
        className="w-full sm:w-auto"
      >
        Hot Leads Only
      </Button>

      {/* Sort */}
      <Select
        value={currentSort}
        onValueChange={(val) => updateParams("sort", val ?? "")}
      >
        <SelectTrigger className="w-full sm:w-[150px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="w-full sm:w-auto"
        >
          <X className="mr-1 h-4 w-4" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
