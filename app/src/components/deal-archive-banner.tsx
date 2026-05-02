"use client";

/**
 * DealArchiveBanner — shown on deal detail page.
 *
 * When archived: gray banner with reason + un-archive button + owner permanent-delete
 * When active:   archive button + owner permanent-delete button
 */

import { Archive, Trash2 } from "lucide-react";
import { useState } from "react";
import { ArchiveDealButton } from "@/components/archive-deal-button";
import { PermanentDeleteModal } from "@/components/permanent-delete-modal";

interface DealArchiveBannerProps {
  dealId: string;
  dealAddress: string;
  archivedAt: Date | null | undefined;
  archivedReason: string | null;
  isOwner: boolean;
}

export function DealArchiveBanner({
  dealId,
  dealAddress,
  archivedAt,
  archivedReason,
  isOwner,
}: DealArchiveBannerProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const isArchived = !!archivedAt;

  return (
    <div className="space-y-2">
      {/* Archived banner */}
      {isArchived && (
        <div className="flex items-center gap-2 rounded-xl border border-muted bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <Archive className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <span>
            Deal archived
            {archivedReason ? ` — ${archivedReason}` : ""}
          </span>
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <ArchiveDealButton
          dealId={dealId}
          variant={isArchived ? "unarchive" : "archive"}
        />

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

      {isOwner && (
        <PermanentDeleteModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          entity="deal"
          entityId={dealId}
          address={dealAddress}
        />
      )}
    </div>
  );
}
