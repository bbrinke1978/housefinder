"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { X, Search, SlidersHorizontal } from "lucide-react";

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

const OWNER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "llc", label: "LLC / Corp" },
  { value: "trust", label: "Trust" },
  { value: "estate", label: "Estate" },
];

const TIER_OPTIONS = [
  { value: "", label: "All Leads" },
  { value: "critical", label: "Critical Only (7+)" },
  { value: "hot", label: "Hot & Above (4+)" },
  { value: "warm", label: "Warm & Above (2+)" },
];

const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "date", label: "Date Added" },
  { value: "city", label: "City" },
];

export function DashboardFilters({ cities }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const currentSearch = searchParams.get("search") ?? "";
  const currentCity = searchParams.get("city") ?? "";
  const currentDistressType = searchParams.get("distressType") ?? "";
  const currentHot = searchParams.get("hot") ?? "";
  const currentOwnerType = searchParams.get("ownerType") ?? "";
  const currentTier = searchParams.get("tier") ?? "";
  const currentSort = searchParams.get("sort") ?? "score";
  const [searchInput, setSearchInput] = useState(currentSearch);

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

  const handleSearch = useCallback(() => {
    updateParams("search", searchInput.trim());
  }, [searchInput, updateParams]);

  const hasFilters =
    currentSearch || currentCity || currentDistressType || currentHot || currentOwnerType || currentTier || currentSort !== "score";

  // Count active non-default filters (excluding search which is always visible)
  const activeFilterCount = [
    currentCity,
    currentDistressType,
    currentHot,
    currentOwnerType,
    currentTier,
    currentSort !== "score" ? currentSort : "",
  ].filter(Boolean).length;

  const searchInputEl = (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search name or address..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSearch();
          }
        }}
        className="pl-9"
      />
    </div>
  );

  const filterControls = (
    <>
      {/* City filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">City</label>
        <Select
          value={currentCity}
          onValueChange={(val) => updateParams("city", val ?? "")}
        >
          <SelectTrigger className="w-full">
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
      </div>

      {/* Owner type filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner Type</label>
        <Select
          value={currentOwnerType}
          onValueChange={(val) => updateParams("ownerType", val ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Owners</SelectItem>
            {OWNER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Distress type filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distress Type</label>
        <Select
          value={currentDistressType}
          onValueChange={(val) => updateParams("distressType", val ?? "")}
        >
          <SelectTrigger className="w-full">
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
      </div>

      {/* Tier filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Tier</label>
        <Select
          value={currentTier}
          onValueChange={(val) => updateParams("tier", val ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Leads" />
          </SelectTrigger>
          <SelectContent>
            {TIER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hot leads toggle */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hot Leads</label>
        <Button
          variant={currentHot === "true" ? "default" : "outline"}
          size="sm"
          onClick={() => updateParams("hot", currentHot === "true" ? "" : "true")}
          className="w-full"
        >
          Hot Leads Only
        </Button>
      </div>

      {/* Sort */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sort By</label>
        <Select
          value={currentSort}
          onValueChange={(val) => updateParams("sort", val ?? "")}
        >
          <SelectTrigger className="w-full">
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
      </div>
    </>
  );

  return (
    <>
      {/* Mobile layout */}
      <div className="flex gap-2 md:hidden">
        <div className="flex-1">{searchInputEl}</div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="relative flex-shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <span className="sr-only">Filters</span>
          </button>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter Leads</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 pt-4 px-4">
              {filterControls}
            </div>
            <SheetFooter className="px-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  clearFilters();
                  setSheetOpen(false);
                }}
              >
                Clear All
              </Button>
              <Button
                className="flex-1"
                onClick={() => setSheetOpen(false)}
              >
                Apply
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex md:flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or address..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            className="pl-9"
          />
        </div>

        {/* City filter */}
        <Select
          value={currentCity}
          onValueChange={(val) => updateParams("city", val ?? "")}
        >
          <SelectTrigger className="w-[160px]">
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

        {/* Owner type filter */}
        <Select
          value={currentOwnerType}
          onValueChange={(val) => updateParams("ownerType", val ?? "")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Owners</SelectItem>
            {OWNER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Distress type filter */}
        <Select
          value={currentDistressType}
          onValueChange={(val) => updateParams("distressType", val ?? "")}
        >
          <SelectTrigger className="w-[160px]">
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

        {/* Tier filter */}
        <Select
          value={currentTier}
          onValueChange={(val) => updateParams("tier", val ?? "")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Leads" />
          </SelectTrigger>
          <SelectContent>
            {TIER_OPTIONS.map((opt) => (
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
        >
          Hot Leads Only
        </Button>

        {/* Sort */}
        <Select
          value={currentSort}
          onValueChange={(val) => updateParams("sort", val ?? "")}
        >
          <SelectTrigger className="w-[150px]">
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
          >
            <X className="mr-1 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>
    </>
  );
}
