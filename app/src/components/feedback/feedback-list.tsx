"use client";

import { useCallback, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Bug } from "lucide-react";
import type { FeedbackListItem, FeedbackListFilters } from "@/lib/feedback-queries";
import { FeedbackTypeBadge } from "@/components/feedback/feedback-type-badge";
import { FeedbackStatusBadge } from "@/components/feedback/feedback-status-badge";
import { FeedbackPriorityBadge } from "@/components/feedback/feedback-priority-badge";

interface FeedbackListProps {
  items: FeedbackListItem[];
  filters: FeedbackListFilters;
  currentUserId: string;
  isMine: boolean;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "shipped", label: "Shipped" },
  { value: "wontfix", label: "Won't Fix" },
  { value: "duplicate", label: "Duplicate" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "idea", label: "Idea" },
  { value: "question", label: "Question" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function FeedbackList({ items, filters, currentUserId, isMine }: FeedbackListProps) {
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

        {/* Status filter */}
        <select
          value={filters.status ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={filters.type ?? ""}
          onChange={(e) => updateParam("type", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Priority filter */}
        <select
          value={filters.priority ?? ""}
          onChange={(e) => updateParam("priority", e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

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

        {/* Result count */}
        <span className="text-sm text-muted-foreground ml-auto">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Bug className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No feedback yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click{" "}
            <Link href="/feedback/new" className="underline underline-offset-4 hover:text-foreground">
              New
            </Link>{" "}
            to create the first item, or adjust your filters.
          </p>
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
        <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
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
