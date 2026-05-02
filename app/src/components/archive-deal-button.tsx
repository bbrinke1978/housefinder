"use client";

/**
 * ArchiveDealButton — button + inline popover to archive or un-archive a deal.
 *
 * variant="archive": shows "Archive Deal" button → confirm popover with optional reason
 * variant="unarchive": shows "Un-archive" button → immediate action
 */

import { useState, useTransition, useRef, useEffect } from "react";
import { Archive, Loader2, RotateCcw } from "lucide-react";
import { archiveDeal, unarchiveDeal } from "@/lib/deal-actions";

interface ArchiveDealButtonProps {
  dealId: string;
  variant: "archive" | "unarchive";
  onSuccess?: () => void;
}

export function ArchiveDealButton({ dealId, variant, onSuccess }: ArchiveDealButtonProps) {
  const [showPopover, setShowPopover] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    if (!showPopover) return;
    function handle(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showPopover]);

  function handleUnarchive() {
    startTransition(async () => {
      try {
        await unarchiveDeal(dealId);
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unarchive deal");
      }
    });
  }

  function handleArchive(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await archiveDeal(dealId, reason.trim() || undefined);
        setShowPopover(false);
        setReason("");
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to archive deal");
      }
    });
  }

  if (variant === "unarchive") {
    return (
      <div>
        <button
          type="button"
          onClick={handleUnarchive}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Un-archive
        </button>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setShowPopover((v) => !v)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-50"
      >
        <Archive className="h-3.5 w-3.5" />
        Archive Deal
      </button>

      {showPopover && (
        <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-xl border border-border bg-card shadow-lg p-4">
          <form onSubmit={handleArchive} className="space-y-3">
            <p className="text-sm font-medium">Archive this deal?</p>
            <p className="text-xs text-muted-foreground">
              Archived deals are hidden from the kanban but can be restored with the &quot;Show archived&quot; toggle.
            </p>
            <div className="space-y-1">
              <label htmlFor="archive-reason" className="text-xs font-medium text-muted-foreground">
                Reason (optional)
              </label>
              <input
                id="archive-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. seller backed out"
                className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowPopover(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Archive
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
