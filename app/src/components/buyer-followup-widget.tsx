"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import type { OverdueBuyer } from "@/types";

interface BuyerFollowupWidgetProps {
  buyers: OverdueBuyer[];
}

export function BuyerFollowupWidget({ buyers }: BuyerFollowupWidgetProps) {
  if (buyers.length === 0) return null;

  const today = new Date();
  const displayed = buyers.slice(0, 5);
  const remaining = buyers.length - displayed.length;

  return (
    <div className="rounded-xl border border-l-4 border-l-amber-500 bg-card animate-fade-in-up stagger-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">
            Overdue Follow-Ups
          </span>
          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500/15 text-amber-600 text-xs font-medium px-2 py-0.5">
            {buyers.length}
          </span>
        </div>
      </div>

      {/* Buyer rows */}
      <ul className="divide-y">
        {displayed.map((buyer) => {
          const followUpDate = parseISO(buyer.followUpDate);
          const daysOverdue = differenceInDays(today, followUpDate);
          return (
            <li
              key={buyer.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/buyers/${buyer.id}`}
                  className="text-sm font-medium text-foreground hover:text-primary truncate block"
                >
                  {buyer.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Due {format(followUpDate, "MMM d, yyyy")}
                </p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-red-500">
                {daysOverdue === 0
                  ? "Today"
                  : `${daysOverdue}d overdue`}
              </span>
            </li>
          );
        })}
      </ul>

      {/* View all link */}
      {remaining > 0 && (
        <div className="px-4 py-2 border-t">
          <Link
            href="/buyers?status=active"
            className="text-xs text-primary hover:underline"
          >
            View all {buyers.length} overdue follow-ups
          </Link>
        </div>
      )}
    </div>
  );
}
