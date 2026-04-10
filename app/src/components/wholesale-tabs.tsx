"use client";

import { useState } from "react";
import { WholesaleLeadGrid } from "@/components/wholesale-lead-grid";
import { WholesalerDirectory } from "@/components/wholesaler-directory";
import type { WholesaleLeadWithWholesaler, WholesalerWithStats } from "@/types";
import { cn } from "@/lib/utils";

type Tab = "leads" | "wholesalers";

interface WholesaleTabsProps {
  leads: WholesaleLeadWithWholesaler[];
  wholesalers: { id: string; name: string }[];
  wholesalersWithStats: WholesalerWithStats[];
}

export function WholesaleTabs({
  leads,
  wholesalers,
  wholesalersWithStats,
}: WholesaleTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("leads");

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        <button
          onClick={() => setActiveTab("leads")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "leads"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Leads
          {leads.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              {leads.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("wholesalers")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "wholesalers"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Wholesalers
          {wholesalersWithStats.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground">
              {wholesalersWithStats.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "leads" ? (
        <WholesaleLeadGrid leads={leads} wholesalers={wholesalers} />
      ) : (
        <WholesalerDirectory wholesalers={wholesalersWithStats} />
      )}
    </div>
  );
}
