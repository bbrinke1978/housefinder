"use client";

import { useState, useTransition } from "react";
import { Search, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkipTraceConfirmDialog } from "@/components/skip-trace-confirm-dialog";
import {
  runBulkSkipTrace,
  getTracerfyStatus,
  getTracerfyConfig,
} from "@/lib/tracerfy-actions";

const COST_PER_TRACE = 0.02;

interface BulkSkipTraceProps {
  selectedPropertyIds: string[];
  onClear: () => void;
}

type BulkResult = {
  found: number;
  notFound: number;
  creditsUsed: number;
};

export function BulkSkipTrace({ selectedPropertyIds, onClear }: BulkSkipTraceProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(2.0);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const count = selectedPropertyIds.length;

  if (count === 0) return null;

  async function handleOpen() {
    setResult(null);
    setError(null);
    setBalanceLoading(true);
    setDialogOpen(true);

    try {
      const [status, config] = await Promise.all([
        getTracerfyStatus(),
        getTracerfyConfig(),
      ]);
      setBalance(status.balance);
      setLowBalanceThreshold(config.lowBalanceThreshold);
    } catch {
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }

  function handleConfirm() {
    startTransition(async () => {
      setDialogOpen(false);
      const res = await runBulkSkipTrace(selectedPropertyIds);

      if ("error" in res) {
        setError(res.error);
      } else {
        setResult({
          found: res.found,
          notFound: res.notFound,
          creditsUsed: res.creditsUsed,
        });
        onClear();
      }
    });
  }

  function handleDismiss() {
    setResult(null);
    setError(null);
  }

  return (
    <>
      {/* Result/error toast — shown after selection is cleared */}
      {(result || error) && (
        <div className="fixed bottom-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 shadow-lg text-sm">
            {result && (
              <>
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>
                  <span className="font-semibold text-emerald-600">{result.found} found</span>
                  {result.notFound > 0 && (
                    <span className="text-muted-foreground ml-1.5">
                      · {result.notFound} not found
                    </span>
                  )}
                  <span className="text-muted-foreground ml-1.5">
                    · {result.creditsUsed.toFixed(2)} credits used
                  </span>
                </span>
              </>
            )}
            {error && <span className="text-destructive">{error}</span>}
            <button
              type="button"
              onClick={handleDismiss}
              className="ml-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Skip Trace action rendered as a fragment — intended to be used inside a shared bottom bar */}
      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Tracing {count} {count === 1 ? "property" : "properties"}...</span>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          disabled={isPending}
          className="gap-1.5"
        >
          <Search className="h-3.5 w-3.5" />
          Skip Trace {count} selected
        </Button>
      )}

      <SkipTraceConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyCount={count}
        estimatedCost={count * COST_PER_TRACE}
        currentBalance={balance}
        lowBalanceThreshold={lowBalanceThreshold}
        onConfirm={handleConfirm}
        isPending={isPending}
        balanceLoading={balanceLoading}
      />
    </>
  );
}
