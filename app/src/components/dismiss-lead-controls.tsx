"use client";

/**
 * DismissLeadControls — shown on the property detail page.
 *
 * When dismissed:  gray banner + "Un-dismiss" button + owner "Permanently delete" link
 * When active:     "Dismiss lead" button + owner "Permanently delete" link
 */

import { useState, useTransition } from "react";
import { TriangleAlert, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { undismissLead } from "@/lib/actions";
import { DismissLeadModal } from "@/components/dismiss-lead-modal";
import { PermanentDeleteModal } from "@/components/permanent-delete-modal";

interface DismissLeadControlsProps {
  leadId: string;
  propertyAddress: string;
  dismissedAt: Date | null | undefined;
  dismissedReason: string | null | undefined;
  isOwner: boolean;
}

export function DismissLeadControls({
  leadId,
  propertyAddress,
  dismissedAt,
  dismissedReason,
  isOwner,
}: DismissLeadControlsProps) {
  const [dismissModalOpen, setDismissModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDismissed = !!dismissedAt;

  function handleUndismiss() {
    startTransition(async () => {
      try {
        await undismissLead(leadId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to un-dismiss");
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Dismissed banner */}
      {isDismissed && (
        <div className="flex items-center gap-2 rounded-xl border border-muted bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <TriangleAlert className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <span>
            Lead dismissed
            {dismissedReason ? ` — ${dismissedReason.replace(/_/g, " ")}` : ""}
          </span>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {isDismissed ? (
          <button
            type="button"
            onClick={handleUndismiss}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Un-dismiss
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDismissModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-border hover:bg-muted transition-colors"
          >
            Dismiss lead
          </button>
        )}

        {isOwner && (
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Permanently delete
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DismissLeadModal
        open={dismissModalOpen}
        onOpenChange={setDismissModalOpen}
        leadId={leadId}
        propertyAddress={propertyAddress}
      />

      {isOwner && (
        <PermanentDeleteModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          entity="lead"
          entityId={leadId}
          address={propertyAddress}
        />
      )}
    </div>
  );
}
