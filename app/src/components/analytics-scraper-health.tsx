"use client";

import { formatDistanceToNow } from "date-fns";
import type { ScraperHealthRow } from "@/lib/analytics-queries";

interface ScraperHealthTableProps {
  data: ScraperHealthRow[];
}

const STATUS_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

function formatDate(date: Date | null): string {
  if (!date) return "Never";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function ScraperHealthTable({ data }: ScraperHealthTableProps) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No scraper health data available. Scrapers will report their status after their first run.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4">County</th>
            <th className="pb-2 pr-4">Status</th>
            <th className="pb-2 pr-4">Last Run</th>
            <th className="pb-2 pr-4">Last Success</th>
            <th className="pb-2 pr-4">Last Count</th>
            <th className="pb-2 pr-4">Zero Streak</th>
            <th className="pb-2">Freshness</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const freshnessColor =
              row.freshnessHours === null
                ? "text-muted-foreground"
                : row.freshnessHours > 72
                  ? "text-red-500 font-semibold"
                  : row.freshnessHours > 36
                    ? "text-amber-500 font-semibold"
                    : "text-foreground";

            return (
              <tr key={row.county} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium capitalize">
                  {row.consecutiveZeroResults >= 3 && (
                    <span className="mr-1.5 text-xs font-bold text-red-500">ALERT</span>
                  )}
                  {row.county}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT[row.status]}`}
                    aria-label={row.status}
                  />
                </td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {formatDate(row.lastRunAt)}
                </td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {formatDate(row.lastSuccessAt)}
                </td>
                <td className="py-2 pr-4">{row.lastResultCount}</td>
                <td className="py-2 pr-4">
                  {row.consecutiveZeroResults > 0 ? (
                    <span className="text-amber-500">{row.consecutiveZeroResults}</span>
                  ) : (
                    "0"
                  )}
                </td>
                <td className={`py-2 ${freshnessColor}`}>
                  {row.freshnessHours !== null ? `${row.freshnessHours}h` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
