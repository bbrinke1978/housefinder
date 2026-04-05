"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { DealWithBuyer } from "@/types";
import { DealKanban } from "@/components/deal-kanban";
import { DealList } from "@/components/deal-list";

interface DealsSearchWrapperProps {
  deals: DealWithBuyer[];
  view: string;
  coverPhotos?: Record<string, string>;
}

export function DealsSearchWrapper({ deals, view, coverPhotos = {} }: DealsSearchWrapperProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) => {
      return (
        d.address.toLowerCase().includes(q) ||
        d.city.toLowerCase().includes(q) ||
        (d.sellerName ?? "").toLowerCase().includes(q)
      );
    });
  }, [deals, query]);

  return (
    <div className="space-y-4">
      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by address, seller, or city..."
          className="w-full rounded-xl border border-input bg-background pl-9 pr-9 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Result count when searching */}
      {query && (
        <p className="text-xs text-muted-foreground">
          {filtered.length === 0 ? (
            "No deals match your search"
          ) : (
            <>
              <span className="font-semibold text-foreground">{filtered.length}</span>
              {" "}of{" "}
              <span className="font-semibold text-foreground">{deals.length}</span>
              {" "}deals
            </>
          )}
        </p>
      )}

      {/* Deals content */}
      {view === "list" ? (
        <DealList deals={filtered} coverPhotos={coverPhotos} />
      ) : (
        <DealKanban deals={filtered} coverPhotos={coverPhotos} />
      )}
    </div>
  );
}
