"use client";

/**
 * PermanentDeleteModal — Owner-only two-step confirm-by-typing-address modal.
 *
 * Step 1: Warning screen listing what gets deleted
 * Step 2: Confirm by typing the exact address (case-insensitive, whitespace-trimmed)
 *
 * entity="lead"  → calls permanentDeleteLead
 * entity="deal"  → calls permanentDeleteDeal
 *
 * Uses @base-ui/react/dialog (same pattern as FloatingReportButton).
 */

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X, TriangleAlert, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { permanentDeleteLead } from "@/lib/actions";
import { permanentDeleteDeal } from "@/lib/deal-actions";

interface PermanentDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: "lead" | "deal";
  entityId: string;
  /** Address to require the user to type for confirmation */
  address: string;
  onSuccess?: () => void;
}

const LEAD_CASCADE = [
  "All contact events (calls, emails, texts)",
  "All lead notes and status history",
  "All campaign enrollments and email send logs",
  "Alert history",
  "Call logs",
  "The lead record itself",
];

const DEAL_CASCADE = [
  "All deal notes and status history",
  "All contracts and contract signers",
  "All buyer-deal interactions",
  "Budget, categories, expenses, and receipts",
  "Floor plans and pins",
  "Property photos linked to this deal",
  "The deal record itself",
];

export function PermanentDeleteModal({
  open,
  onOpenChange,
  entity,
  entityId,
  address,
  onSuccess,
}: PermanentDeleteModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typedAddress, setTypedAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const addressMatches =
    typedAddress.trim().length > 0 &&
    normalize(typedAddress) === normalize(address);

  function handleClose() {
    if (isPending) return;
    setStep(1);
    setTypedAddress("");
    setError(null);
    onOpenChange(false);
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        if (entity === "lead") {
          await permanentDeleteLead(entityId, typedAddress);
        } else {
          await permanentDeleteDeal(entityId, typedAddress);
        }
        handleClose();
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      }
    });
  }

  const cascadeList = entity === "lead" ? LEAD_CASCADE : DEAL_CASCADE;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-destructive/30 bg-card shadow-2xl",
            "max-h-[90vh] flex flex-col overflow-y-auto",
            "transition-all duration-150",
            "data-ending-style:opacity-0 data-ending-style:scale-95",
            "data-starting-style:opacity-0 data-starting-style:scale-95",
            "p-6"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-destructive flex-shrink-0" />
              <Dialog.Title className="text-base font-semibold text-destructive">
                Permanently Delete {entity === "lead" ? "Lead" : "Deal"}
              </Dialog.Title>
            </div>
            <Dialog.Close
              onClick={handleClose}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This action is <strong className="text-foreground">irreversible</strong>. The following data will be permanently deleted:
              </p>
              <ul className="space-y-1">
                {cascadeList.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-destructive mt-1 flex-shrink-0">×</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                The scraper suppression entry (dismissed_parcels) will be preserved so this parcel is not re-scraped.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/30 transition-colors"
                >
                  I understand, continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To confirm, type the property address exactly:
              </p>
              <div className="bg-muted rounded-lg px-3 py-2">
                <p className="text-sm font-mono font-medium">{address}</p>
              </div>
              <input
                type="text"
                value={typedAddress}
                onChange={(e) => {
                  setTypedAddress(e.target.value);
                  setError(null);
                }}
                placeholder="Type the address here..."
                autoFocus
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!addressMatches || isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete Permanently
                </button>
              </div>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
