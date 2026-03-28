"use client";

import type { DealWithBuyer } from "@/types";

// Stub — full implementation in plan 08-03
export function DealMaoCalculator({ deal }: { deal: DealWithBuyer }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
      <p>MAO calculator for {deal.address} — coming soon.</p>
    </div>
  );
}
