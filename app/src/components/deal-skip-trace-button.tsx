"use client";

import { useState, useTransition } from "react";
import { Search, Loader2, CheckCircle } from "lucide-react";
import { findOrCreatePropertyForDeal } from "@/lib/tracerfy-actions";
import { SkipTraceButton } from "@/components/skip-trace-button";

interface Props {
  dealId: string;
  address: string;
  city: string;
  sellerName?: string | null;
}

/**
 * DealSkipTraceButton — for deals without a propertyId.
 * First finds or creates a property by address, then shows the standard SkipTraceButton.
 * sellerName is critical: Tracerfy matches by owner name + address; without the
 * seller name the trace returns ~0% match rate and stores a sentinel "not found".
 */
export function DealSkipTraceButton({ dealId, address, city, sellerName }: Props) {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (propertyId) {
    return <SkipTraceButton propertyId={propertyId} hasTracerfyResult={false} />;
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await findOrCreatePropertyForDeal(dealId, address, city, sellerName);
        if ("error" in result) {
          setError(result.error);
        } else {
          setPropertyId(result.propertyId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to link property");
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Finding property...
          </>
        ) : (
          <>
            <Search className="h-3.5 w-3.5" />
            Skip Trace
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
