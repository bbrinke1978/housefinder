"use client";

import { format } from "date-fns";
import { FileText, Phone } from "lucide-react";
import type { ActivityEntry } from "@/lib/analytics-queries";

interface Props {
  data: ActivityEntry[];
}

export function ActivityLog({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No activity recorded yet. Notes, status changes, and calls will appear here as you work.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {data.map((entry) => {
        const isCall = entry.type === "call";

        // Determine display text
        let displayText: string;
        if (isCall) {
          displayText = `Called — ${entry.text}`;
        } else {
          // Note or status change — truncate to 100 chars
          displayText =
            entry.text.length > 100 ? entry.text.slice(0, 100) + "…" : entry.text;
        }

        return (
          <li
            key={entry.id}
            className="flex items-start gap-3 py-3 flex-wrap sm:flex-nowrap"
          >
            {/* Icon */}
            <div
              className={`shrink-0 mt-0.5 rounded-full p-1.5 ${
                isCall
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isCall ? (
                <Phone className="h-3.5 w-3.5" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
            </div>

            {/* Center: description + address */}
            <div className="min-w-0 flex-1">
              <p className="text-sm">{displayText}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.address}, {entry.city}
              </p>
            </div>

            {/* Right: timestamp */}
            <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(entry.createdAt), "MMM d, h:mm a")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
