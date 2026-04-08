"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuyerDealInteraction } from "@/types";

interface BuyerDealHistoryProps {
  interactions: BuyerDealInteraction[];
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "blasted":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "interested":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "closed":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "blasted":
      return "Blasted";
    case "interested":
      return "Interested";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function BuyerDealHistory({ interactions }: BuyerDealHistoryProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 text-primary" />
        Deal History
        {interactions.length > 0 && (
          <span className="text-xs font-normal text-muted-foreground">
            ({interactions.length})
          </span>
        )}
      </h2>

      {interactions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <Briefcase className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No deal interactions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {interactions.map((interaction) => (
            <div
              key={interaction.id}
              className="rounded-xl border border-border bg-card p-3.5 space-y-1.5"
            >
              {/* Address link + status badge */}
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/deals/${interaction.dealId}`}
                  className="text-sm font-medium text-primary hover:underline leading-snug"
                >
                  {interaction.dealAddress}
                </Link>
                <span
                  className={cn(
                    "shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    getStatusBadgeClass(interaction.status)
                  )}
                >
                  {getStatusLabel(interaction.status)}
                </span>
              </div>

              {/* City */}
              {interaction.dealCity && (
                <p className="text-xs text-muted-foreground">
                  {interaction.dealCity}
                </p>
              )}

              {/* Dates */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Added {format(new Date(interaction.createdAt), "MMM d, yyyy")}
                </span>
                {interaction.updatedAt.getTime() !== interaction.createdAt.getTime() && (
                  <span>
                    Updated {format(new Date(interaction.updatedAt), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
