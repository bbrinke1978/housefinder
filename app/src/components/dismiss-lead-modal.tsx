"use client";

/**
 * DismissLeadModal — modal to dismiss a lead with a required reason dropdown.
 *
 * Reason options: wrong_owner / already_sold / not_in_target / duplicate / other
 * When reason='other', notes are required (min 5 chars).
 *
 * Uses @base-ui/react/dialog (same pattern as FloatingReportButton / ActivityLogModal).
 */

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { dismissLead } from "@/lib/actions";

const DISMISS_REASONS = [
  { value: "wrong_owner", label: "Wrong owner data (LLC parsing, etc.)" },
  { value: "already_sold", label: "Already sold / off market" },
  { value: "not_in_target", label: "Not in target area or price range" },
  { value: "duplicate", label: "Duplicate of another lead" },
  { value: "other", label: "Other (describe in notes)" },
] as const;

type DismissReason = (typeof DISMISS_REASONS)[number]["value"];

interface DismissLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  /** Displayed in the modal header for context */
  propertyAddress?: string;
  onSuccess?: () => void;
}

export function DismissLeadModal({
  open,
  onOpenChange,
  leadId,
  propertyAddress,
  onSuccess,
}: DismissLeadModalProps) {
  const [reason, setReason] = useState<DismissReason | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (isPending) return;
    setReason("");
    setNotes("");
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      setError("Please select a reason");
      return;
    }
    if (reason === "other" && notes.trim().length < 5) {
      setError("Notes are required (min 5 chars) when reason is 'Other'");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await dismissLead(leadId, reason, notes.trim() || undefined);
        handleClose();
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to dismiss lead");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-border bg-card shadow-2xl",
            "max-h-[90vh] flex flex-col overflow-y-auto",
            "transition-all duration-150",
            "data-ending-style:opacity-0 data-ending-style:scale-95",
            "data-starting-style:opacity-0 data-starting-style:scale-95",
            "p-6"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <Dialog.Title className="text-base font-semibold">Dismiss Lead</Dialog.Title>
              {propertyAddress && (
                <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[300px]">
                  {propertyAddress}
                </p>
              )}
            </div>
            <Dialog.Close
              onClick={handleClose}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason */}
            <div className="space-y-1.5">
              <label htmlFor="dismiss-reason" className="text-sm font-medium">
                Reason <span className="text-destructive">*</span>
              </label>
              <select
                id="dismiss-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as DismissReason)}
                required
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>Select a reason...</option>
                {DISMISS_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label htmlFor="dismiss-notes" className="text-sm font-medium">
                Notes
                {reason === "other" && (
                  <span className="text-destructive ml-1">* required</span>
                )}
              </label>
              <textarea
                id="dismiss-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={reason === "other" ? "Describe why..." : "Optional notes..."}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !reason}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Dismiss Lead
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
