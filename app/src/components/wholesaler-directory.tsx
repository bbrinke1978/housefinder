"use client";

import Link from "next/link";
import type { WholesalerWithStats } from "@/types";

interface WholesalerDirectoryProps {
  wholesalers: WholesalerWithStats[];
}

function formatDollars(value: number | null): string {
  if (value === null) return "N/A";
  if (Math.abs(value) >= 1000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return `$${Math.round(value)}`;
}

function conversionRate(sent: number, promoted: number): string {
  if (sent === 0) return "0%";
  return `${Math.round((promoted / sent) * 100)}%`;
}

export function WholesalerDirectory({ wholesalers }: WholesalerDirectoryProps) {
  // Sort by totalSent descending (best sources first)
  const sorted = [...wholesalers].sort((a, b) => b.totalSent - a.totalSent);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No wholesalers tracked yet. They&apos;ll appear here as deals come in.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">Company</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden lg:table-cell">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground hidden md:table-cell">Phone</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Sent</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Promoted</th>
              <th className="px-4 py-3 text-right font-semibold text-muted-foreground hidden sm:table-cell">Avg Spread</th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((w, i) => (
              <tr key={w.id} className={i < sorted.length - 1 ? "border-b" : ""}>
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/wholesale?wholesaler=${w.id}`}
                    className="text-primary hover:underline"
                  >
                    {w.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {w.company ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {w.email ? (
                    <a
                      href={`mailto:${w.email}`}
                      className="hover:text-foreground hover:underline transition-colors"
                    >
                      {w.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {w.phone ? (
                    <a
                      href={`tel:${w.phone}`}
                      className="hover:text-foreground hover:underline transition-colors"
                    >
                      {w.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-right">{w.totalSent}</td>
                <td className="px-4 py-3 text-right">
                  <span>{w.totalPromoted}</span>
                  {w.totalSent > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({conversionRate(w.totalSent, w.totalPromoted)})
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  {formatDollars(w.avgSpread)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      w.isActive
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {w.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
