"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptJvLead, rejectJvLead } from "@/lib/jv-actions";
import type { JvTriageRow } from "@/lib/jv-queries";

interface JvTriageTableProps {
  leads: JvTriageRow[];
}

export function JvTriageTable({ leads }: JvTriageTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
        <MailX className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          No pending JV submissions. New submissions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LeadCard — one card per pending submission
// ---------------------------------------------------------------------------

function LeadCard({ lead }: { lead: JvTriageRow }) {
  const router = useRouter();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isRejecting = rejectingId === lead.id;

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      try {
        await acceptJvLead({ jvLeadId: lead.id });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Accept failed");
      }
    });
  }

  function handleRejectOpen() {
    setRejectingId(lead.id);
    setReason("");
    setError(null);
  }

  function handleRejectCancel() {
    setRejectingId(null);
    setReason("");
    setError(null);
  }

  function handleRejectConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await rejectJvLead({ jvLeadId: lead.id, reason });
        setRejectingId(null);
        setReason("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reject failed");
      }
    });
  }

  const hasDedupWarning =
    lead.dedupHint.matchesProperty || lead.dedupHint.matchesPriorJvLead;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
      {/* Top row: submitter + timestamp + dedup badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-sm">{lead.submitterName}</span>
          <span className="text-muted-foreground text-xs ml-2">
            {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
          </span>
        </div>
        {hasDedupWarning && (
          <span className="text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full whitespace-nowrap">
            Possible duplicate
          </span>
        )}
      </div>

      {/* Photo + address + notes */}
      <div className="flex gap-3">
        {lead.photoSasUrl ? (
          <a
            href={lead.photoSasUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0"
          >
            <img
              src={lead.photoSasUrl}
              alt={`Property at ${lead.address}`}
              className="h-28 w-28 rounded-md object-cover border border-border hover:opacity-90 transition-opacity"
            />
          </a>
        ) : (
          <div className="h-28 w-28 flex-shrink-0 rounded-md border border-border bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No photo</span>
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-medium truncate">{lead.address}</p>
          {lead.conditionNotes && (
            <p className="text-xs text-muted-foreground line-clamp-3">
              {lead.conditionNotes}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{lead.submitterEmail}</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Action row */}
      {isRejecting ? (
        <div className="space-y-2">
          <Input
            placeholder="Rejection reason (required, 3-500 chars)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={isPending || reason.trim().length < 3}
              onClick={handleRejectConfirm}
              className="flex-1"
            >
              {isPending ? "Rejecting…" : "Confirm Reject"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRejectCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? "Accepting…" : "Accept ($10)"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRejectOpen}
            disabled={isPending}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
