"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SkipTraceConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyCount: number;
  estimatedCost: number;
  currentBalance: number | null;
  lowBalanceThreshold: number;
  onConfirm: () => void;
  isPending: boolean;
  balanceLoading: boolean;
}

export function SkipTraceConfirmDialog({
  open,
  onOpenChange,
  propertyCount,
  estimatedCost,
  currentBalance,
  lowBalanceThreshold,
  onConfirm,
  isPending,
  balanceLoading,
}: SkipTraceConfirmDialogProps) {
  const propertyWord = propertyCount === 1 ? "property" : "properties";
  const showLowBalance =
    currentBalance !== null && currentBalance < lowBalanceThreshold;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-xl">
          <Dialog.Title className="text-base font-semibold text-foreground">
            Confirm Skip Trace
          </Dialog.Title>

          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Skip trace {propertyCount} {propertyWord}? Estimated cost:{" "}
              <span className="font-medium text-foreground">
                ${estimatedCost.toFixed(2)}
              </span>
            </p>

            {/* Balance line */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Current balance:</span>
              {balanceLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : currentBalance !== null ? (
                <span className="font-medium text-foreground">
                  ${currentBalance.toFixed(2)}
                </span>
              ) : (
                <span className="text-muted-foreground italic">
                  Balance unavailable
                </span>
              )}
            </div>

            {/* Low balance warning */}
            {showLowBalance && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-300">
                Low balance — consider topping up your Tracerfy account before
                tracing.
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              disabled={isPending}
            >
              Cancel
            </Dialog.Close>
            <Button
              type="button"
              size="sm"
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending ? "Tracing..." : "Run Skip Trace"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
