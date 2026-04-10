"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Mail, Loader2, X, ChevronDown, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bulkEnrollLeads } from "@/lib/enrollment-actions";
import type { EmailSequenceSummary } from "@/types";

interface BulkEnrollProps {
  selectedLeadIds: string[];
  sequences: EmailSequenceSummary[];
  onClear: () => void;
  /** Optional extra actions to render alongside the enroll button */
  extra?: ReactNode;
}

type BulkResult = {
  enrolled: number;
  skipped: number;
  errors: string[];
};

export function BulkEnroll({ selectedLeadIds, sequences, onClear, extra }: BulkEnrollProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSequences = sequences.filter((s) => s.isActive);
  const count = selectedLeadIds.length;

  if (count === 0) return null;

  function handleEnroll(sequenceId: string) {
    setOpen(false);
    setError(null);
    setResult(null);
    setProgress({ done: 0, total: count });

    startTransition(async () => {
      // Process leads in batches with progress updates
      // We call bulkEnrollLeads which handles rate limiting internally
      setProgress({ done: 0, total: count });

      const bulkResult = await bulkEnrollLeads(selectedLeadIds, sequenceId);
      setResult(bulkResult);
      setProgress(null);
    });
  }

  function handleDismiss() {
    setResult(null);
    onClear();
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
      {/* Mobile nav clearance — assume bottom nav is ~56px on mobile */}
      <div className="mx-auto max-w-5xl px-4 py-3">
        {result ? (
          /* Result summary */
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-emerald-600">
                  {result.enrolled} enrolled
                </span>
                {result.skipped > 0 && (
                  <span className="text-muted-foreground ml-1.5">
                    · {result.skipped} skipped (no email)
                  </span>
                )}
                {result.errors.length > 0 && (
                  <span className="text-destructive ml-1.5">
                    · {result.errors.length} failed
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              Dismiss
            </Button>
          </div>
        ) : isPending && progress ? (
          /* Progress indicator */
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span className="text-sm font-medium">
                Enrolling leads...{" "}
                <span className="text-muted-foreground">
                  {count} {count === 1 ? "lead" : "leads"}
                </span>
              </span>
            </div>
            <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(((progress.done) / progress.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : (
          /* Selection bar */
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {count} {count === 1 ? "lead" : "leads"} selected
              </span>
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2">
              {extra}
              {error && <p className="text-xs text-destructive">{error}</p>}

              {activeSequences.length === 0 ? (
                <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-50">
                  <Mail className="h-3.5 w-3.5" />
                  No Sequences — Create One First
                </Button>
              ) : (
                <div className="relative">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setOpen((v) => !v)}
                    disabled={isPending}
                    className="gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Enroll in Sequence
                    <ChevronDown className="h-3 w-3 ml-0.5" />
                  </Button>

                  {open && (
                    <div className="absolute bottom-full right-0 mb-1 z-50 w-60 rounded-md border border-border bg-popover shadow-lg">
                      <div className="p-1">
                        <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          Select Sequence
                        </p>
                        {activeSequences.map((seq) => (
                          <button
                            key={seq.id}
                            type="button"
                            onClick={() => handleEnroll(seq.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                          >
                            <span className="truncate">{seq.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {seq.stepCount} steps · {seq.activeEnrollments} active
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
