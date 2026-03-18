"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Flame, AlertTriangle } from "lucide-react";
import type { PipelineLead } from "@/types";

interface LeadCardProps {
  lead: PipelineLead;
}

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <Link
      href={`/properties/${lead.propertyId ?? lead.id}`}
      className="block rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{lead.address}</p>
          <p className="text-xs text-muted-foreground">{lead.city}</p>
        </div>
        {lead.isHot && (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <Flame className="h-3 w-3" />
            Hot
          </span>
        )}
      </div>

      {lead.ownerName && (
        <p className="mt-1 text-xs text-muted-foreground truncate">
          {lead.ownerName}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Score: {lead.distressScore}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
          <AlertTriangle className="h-3 w-3" />
          Skip trace needed
        </span>
      </div>

      {lead.lastContactedAt && (
        <p className="mt-2 text-xs text-muted-foreground">
          Contacted{" "}
          {formatDistanceToNow(new Date(lead.lastContactedAt), {
            addSuffix: true,
          })}
        </p>
      )}
    </Link>
  );
}
