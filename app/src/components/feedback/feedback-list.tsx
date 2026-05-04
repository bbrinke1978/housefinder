"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bug, ChevronDown, Check } from "lucide-react";
import type { FeedbackListItem, FeedbackListFilters } from "@/lib/feedback-queries";
import { FeedbackTypeBadge } from "@/components/feedback/feedback-type-badge";
import { FeedbackStatusBadge } from "@/components/feedback/feedback-status-badge";
import { FeedbackPriorityBadge } from "@/components/feedback/feedback-priority-badge";

interface FeedbackListProps {
  items: FeedbackListItem[];
  filters: FeedbackListFilters;
  isMine: boolean;
  isArchive: boolean;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "shipped", label: "Shipped" },
  { value: "wontfix", label: "Won't Fix" },
  { value: "duplicate", label: "Duplicate" },
];

const TYPE_OPTIONS = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "idea", label: "Idea" },
  { value: "question", label: "Question" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// -- MultiSelect popover (mirrors dashboard-filters.tsx MultiSelect) --

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
    if (open) document.addEventListener("mousedown", handleClickOutside);
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
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
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

// -- Helpers --

/** 6-digit zero-padded display ID — e.g. 23 → "#000023" */
function formatDisplayNumber(n: number): string {
  return `#${String(n).padStart(6, "0")}`;
}

// -- Main component --

export function FeedbackList({ items, filters, isMine, isArchive }: FeedbackListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.search ?? "");
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const updateMultiParam = useCallback(
    (key: string, values: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (values.length > 0) {
        params.set(key, values.join(","));
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchValue(val);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => updateParam("q", val), 400);
    setSearchTimer(timer);
  }

  function handleMineToggle() {
    updateParam("mine", isMine ? "" : "true");
  }

  function handleArchiveToggle() {
    updateParam("archive", isArchive ? "" : "true");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <input
          type="search"
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search feedback…"
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-full sm:w-56"
        />

        {/* Status multi-select (hidden in archive view — already filtered to terminal statuses) */}
        {!isArchive && (
          <MultiSelect
            label="Statuses"
            options={STATUS_OPTIONS}
            selected={filters.status ?? []}
            onChange={(v) => updateMultiParam("status", v)}
            placeholder="All Statuses"
            className="w-full sm:w-44"
          />
        )}

        {/* Type multi-select */}
        <MultiSelect
          label="Types"
          options={TYPE_OPTIONS}
          selected={filters.type ?? []}
          onChange={(v) => updateMultiParam("type", v)}
          placeholder="All Types"
          className="w-full sm:w-40"
        />

        {/* Priority multi-select */}
        <MultiSelect
          label="Priorities"
          options={PRIORITY_OPTIONS}
          selected={filters.priority ?? []}
          onChange={(v) => updateMultiParam("priority", v)}
          placeholder="All Priorities"
          className="w-full sm:w-44"
        />

        {/* Mine toggle */}
        <button
          type="button"
          onClick={handleMineToggle}
          className={`h-9 rounded-md border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring ${
            isMine
              ? "bg-primary text-primary-foreground border-primary"
              : "border-input bg-background text-foreground hover:bg-muted"
          }`}
        >
          Mine
        </button>

        {/* Archive toggle */}
        <button
          type="button"
          onClick={handleArchiveToggle}
          className={`h-9 rounded-md border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring ${
            isArchive
              ? "bg-primary text-primary-foreground border-primary"
              : "border-input bg-background text-foreground hover:bg-muted"
          }`}
        >
          Archive
        </button>

        {/* Result count */}
        <span className="text-sm text-muted-foreground ml-auto">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Bug className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {isArchive ? "Archive is empty." : "No feedback yet."}
          </p>
          {!isArchive && (
            <p className="text-xs text-muted-foreground mt-1">
              Click{" "}
              <Link href="/feedback/new" className="underline underline-offset-4 hover:text-foreground">
                New
              </Link>{" "}
              to create the first item, or adjust your filters.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <FeedbackListCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackListCard({ item }: { item: FeedbackListItem }) {
  const ago = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

  return (
    <Link
      href={`/feedback/${item.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:gap-4"
    >
      {/* Title + context */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          <span className="text-muted-foreground font-mono mr-2">{formatDisplayNumber(item.displayNumber)}</span>
          {item.title}
        </p>
        {item.urlContext && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            From: {item.urlContext}
          </p>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <FeedbackTypeBadge type={item.type} />
        <FeedbackStatusBadge status={item.status} />
        <FeedbackPriorityBadge priority={item.priority} />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 md:text-right">
        {item.reporterName && (
          <span>{item.reporterName}</span>
        )}
        <span>{ago}</span>
      </div>
    </Link>
  );
}
