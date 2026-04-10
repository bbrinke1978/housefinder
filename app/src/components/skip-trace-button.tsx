"use client";

import { useState, useTransition } from "react";
import { Search, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkipTraceConfirmDialog } from "@/components/skip-trace-confirm-dialog";
import {
  runSkipTrace,
  getTracerfyStatus,
  getTracerfyConfig,
} from "@/lib/tracerfy-actions";

interface SkipTraceButtonProps {
  propertyId: string;
  hasTracerfyResult: boolean;
  onTraceComplete?: () => void;
}

export function SkipTraceButton({
  propertyId,
  hasTracerfyResult,
  onTraceComplete,
}: SkipTraceButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(2.0);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (hasTracerfyResult) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400"
        >
          <CheckCircle className="h-3 w-3" />
          Skip traced
        </Badge>
      </div>
    );
  }

  async function handleOpen() {
    setResult(null);
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
      const res = await runSkipTrace(propertyId);

      if ("error" in res) {
        setResult({ type: "error", message: res.error });
      } else if (res.success && res.found) {
        setResult({
          type: "success",
          message: `Found ${res.phoneCount} phone(s), ${res.emailCount} email(s)`,
        });
        onTraceComplete?.();
      } else {
        setResult({ type: "success", message: "No results found" });
      }
    });
  }

  const COST_PER_TRACE = 0.02;

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={handleOpen}
        disabled={isPending}
      >
        <Search className="h-3.5 w-3.5" />
        {isPending ? "Tracing..." : "Skip Trace"}
      </Button>

      {result && (
        <p
          className={`text-xs ${
            result.type === "error" ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {result.message}
        </p>
      )}

      <SkipTraceConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyCount={1}
        estimatedCost={COST_PER_TRACE}
        currentBalance={balance}
        lowBalanceThreshold={lowBalanceThreshold}
        onConfirm={handleConfirm}
        isPending={isPending}
        balanceLoading={balanceLoading}
      />
    </div>
  );
}
