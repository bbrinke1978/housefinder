"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Trash2 } from "lucide-react";
import { deleteInboundLead } from "@/lib/actions";
import { Button } from "@/components/ui/button";

interface DeleteInboundLeadButtonProps {
  leadId: string;
  leadLabel: string;
}

export function DeleteInboundLeadButton({ leadId, leadLabel }: DeleteInboundLeadButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteInboundLead(leadId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete lead");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-6 shadow-xl">
            <Dialog.Title className="text-base font-semibold text-foreground">
              Delete this lead?
            </Dialog.Title>

            <div className="mt-3 space-y-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">{leadLabel}</span>
                ? This will permanently remove the lead and all its notes,
                call logs, contact events, and campaign history.
              </p>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone.
              </p>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
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
                onClick={handleConfirm}
                disabled={isPending}
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                {isPending ? "Deleting..." : "Delete Lead"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
