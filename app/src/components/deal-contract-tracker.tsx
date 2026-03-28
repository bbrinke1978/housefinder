"use client";

import type { DealWithBuyer } from "@/types";

// Stub — full implementation in plan 08-03
export function DealContractTracker({ deal }: { deal: DealWithBuyer }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
      <p>Contract tracker for {deal.address} — coming soon.</p>
    </div>
  );
}
