"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { X, Search, SlidersHorizontal, ChevronDown, Check } from "lucide-react";

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
  { value: "critical", label: "Critical Only (7+)" },
  { value: "hot", label: "Hot & Above (4+)" },
  { value: "warm", label: "Warm & Above (2+)" },
];

const SORT_OPTIONS = [
  { value: "score", label: "Score" },
  { value: "date", label: "Date Added" },
  { value: "city", label: "City" },
];

// -- Multi-select Popover --

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  className?: string;
}

function MultiSelect({ label, options, selected, onChange, placeholder, className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const displayLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${label} (${selected.length})`;

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <span className={selected.length === 0 ? "text-muted-foreground" : ""}>{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 opacity-50 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] rounded-md border border-border bg-popover shadow-md">
          <div className="p-1 max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(opt.value)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isSelected ? "bg-primary border-primary" : "border-input"}`}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -- Single-select (for Sort) --

interface SingleSelectProps {
  options: MultiSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function SingleSelect({ options, value, onChange, className }: SingleSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <span>{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 opacity-50 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[140px] rounded-md border border-border bg-popover shadow-md">
          <div className="p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${value === opt.value ? "bg-primary border-primary" : "border-input"}`}>
                  {value === opt.value && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// -- Main Filters Component --

/** Parse a comma-separated URL param into an array of strings */
function parseMulti(value: string): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function DashboardFilters({ cities }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const currentSearch = searchParams.get("search") ?? "";
  const currentCities = parseMulti(searchParams.get("city") ?? "");
  const currentDistressTypes = parseMulti(searchParams.get("distressType") ?? "");
  const currentHot = searchParams.get("hot") ?? "";
  const currentOwnerTypes = parseMulti(searchParams.get("ownerType") ?? "");
  const currentTiers = parseMulti(searchParams.get("tier") ?? "");
  const currentSort = searchParams.get("sort") ?? "score";
  const [searchInput, setSearchInput] = useState(currentSearch);

  const updateParam = useCallback(
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

  const updateMultiParam = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (values.length > 0) {
        params.set(key, values.join(","));
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
    updateParam("search", searchInput.trim());
  }, [searchInput, updateParam]);

  const hasFilters =
    currentSearch ||
    currentCities.length > 0 ||
    currentDistressTypes.length > 0 ||
    currentHot ||
    currentOwnerTypes.length > 0 ||
    currentTiers.length > 0 ||
    currentSort !== "score";

  const activeFilterCount = [
    currentCities.length > 0 ? "city" : "",
    currentDistressTypes.length > 0 ? "distress" : "",
    currentHot ? "hot" : "",
    currentOwnerTypes.length > 0 ? "owner" : "",
    currentTiers.length > 0 ? "tier" : "",
    currentSort !== "score" ? "sort" : "",
  ].filter(Boolean).length;

  const cityOptions = cities.map((c) => ({ value: c, label: c }));

  const filterControls = (
    <>
      {/* City filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">City</label>
        <MultiSelect
          label="Cities"
          options={cityOptions}
          selected={currentCities}
          onChange={(v) => updateMultiParam("city", v)}
          placeholder="All Cities"
        />
      </div>

      {/* Owner type filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner Type</label>
        <MultiSelect
          label="Owner Types"
          options={OWNER_TYPES}
          selected={currentOwnerTypes}
          onChange={(v) => updateMultiParam("ownerType", v)}
          placeholder="All Owners"
        />
      </div>

      {/* Distress type filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Distress Type</label>
        <MultiSelect
          label="Distress Types"
          options={DISTRESS_TYPES}
          selected={currentDistressTypes}
          onChange={(v) => updateMultiParam("distressType", v)}
          placeholder="All Types"
        />
      </div>

      {/* Tier filter */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lead Tier</label>
        <MultiSelect
          label="Tiers"
          options={TIER_OPTIONS}
          selected={currentTiers}
          onChange={(v) => updateMultiParam("tier", v)}
          placeholder="All Leads"
        />
      </div>

      {/* Hot leads toggle */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hot Leads</label>
        <Button
          variant={currentHot === "true" ? "default" : "outline"}
          size="sm"
          onClick={() => updateParam("hot", currentHot === "true" ? "" : "true")}
          className="w-full"
        >
          Hot Leads Only
        </Button>
      </div>

      {/* Sort */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sort By</label>
        <SingleSelect
          options={SORT_OPTIONS}
          value={currentSort}
          onChange={(v) => updateParam("sort", v)}
        />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile layout */}
      <div className="flex gap-2 md:hidden">
        <div className="relative flex-1">
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
        <MultiSelect
          label="Cities"
          options={cityOptions}
          selected={currentCities}
          onChange={(v) => updateMultiParam("city", v)}
          placeholder="All Cities"
          className="w-[160px]"
        />

        {/* Owner type filter */}
        <MultiSelect
          label="Owner Types"
          options={OWNER_TYPES}
          selected={currentOwnerTypes}
          onChange={(v) => updateMultiParam("ownerType", v)}
          placeholder="All Owners"
          className="w-[160px]"
        />

        {/* Distress type filter */}
        <MultiSelect
          label="Distress Types"
          options={DISTRESS_TYPES}
          selected={currentDistressTypes}
          onChange={(v) => updateMultiParam("distressType", v)}
          placeholder="All Types"
          className="w-[160px]"
        />

        {/* Tier filter */}
        <MultiSelect
          label="Tiers"
          options={TIER_OPTIONS}
          selected={currentTiers}
          onChange={(v) => updateMultiParam("tier", v)}
          placeholder="All Leads"
          className="w-[180px]"
        />

        {/* Hot leads toggle */}
        <Button
          variant={currentHot === "true" ? "default" : "outline"}
          size="sm"
          onClick={() => updateParam("hot", currentHot === "true" ? "" : "true")}
        >
          Hot Leads Only
        </Button>

        {/* Sort */}
        <SingleSelect
          options={SORT_OPTIONS}
          value={currentSort}
          onChange={(v) => updateParam("sort", v)}
          className="w-[150px]"
        />

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
