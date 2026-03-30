"use client";

import { AlertTriangle } from "lucide-react";

interface BudgetAlertBannerProps {
  percentUsed: number;
  remainingCents: number;
  contingencyCents: number;
  totalPlannedCents: number;
  totalSpentCents: number;
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * BudgetAlertBanner — shows yellow/orange/red banners based on budget thresholds.
 * Returns null if percentUsed < 80 (no alert needed).
 */
export function BudgetAlertBanner({
  percentUsed,
  remainingCents,
  contingencyCents,
  totalPlannedCents,
  totalSpentCents,
}: BudgetAlertBannerProps) {
  if (percentUsed < 80) return null;

  const overContingency = totalSpentCents > totalPlannedCents + contingencyCents;
  const overPlanned = totalSpentCents > totalPlannedCents;

  if (overContingency) {
    const overBy = totalSpentCents - totalPlannedCents - contingencyCents;
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-400 bg-red-50 dark:bg-red-950/20 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-800 dark:text-red-300 font-medium">
          OVER BUDGET by {formatDollars(overBy)} — review expenses
        </p>
      </div>
    );
  }

  if (overPlanned) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-orange-400 bg-orange-50 dark:bg-orange-950/20 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
          Over planned budget — eating into contingency reserve
        </p>
      </div>
    );
  }

  // 80–99%: approaching budget warning
  return (
    <div className="flex items-start gap-3 rounded-lg border border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
        Approaching budget — {formatDollars(remainingCents)} remaining
      </p>
    </div>
  );
}
