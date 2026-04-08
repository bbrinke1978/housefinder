"use client";

import { useTransition, useState } from "react";
import { Send, Eye, XCircle, RefreshCw, Download, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { ContractStatusBadge } from "@/components/contract-status-badge";
import {
  sendForSigning,
  voidContract,
  resendSigningLink,
  downloadSignedPdf,
} from "@/lib/contract-actions";
import type { ContractWithSigners } from "@/types";
import { formatDate } from "@/lib/format-date";

interface ContractListItemProps {
  contract: ContractWithSigners;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  purchase_agreement: "Purchase Agreement",
  assignment: "Assignment",
};

export function ContractListItem({ contract }: ContractListItemProps) {
  const [isPending, startTransition] = useTransition();
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const counterparty =
    contract.signers.find((s) => s.signerOrder === 1)?.signerName ??
    contract.sellerName ??
    contract.buyerName ??
    "—";

  const canSend = contract.status === "draft";
  const canVoid = contract.status !== "executed" && contract.status !== "voided";
  const canResend =
    (contract.status === "sent" ||
      contract.status === "seller_signed" ||
      contract.status === "countersigned" ||
      contract.status === "expired") &&
    contract.signers.some((s) => !s.signedAt);

  const activeSigner = contract.signers.find(
    (s) => !s.signedAt && s.tokenExpiresAt !== null
  );

  const isExecuted =
    contract.status === "executed" && !!contract.signedPdfBlobName;

  // Expiration countdown: show for in-flight contracts with an active signer
  const expirationLabel: string | null = (() => {
    if (
      contract.status === "sent" ||
      contract.status === "seller_signed" ||
      contract.status === "countersigned"
    ) {
      const expiry = activeSigner?.tokenExpiresAt;
      if (!expiry) return null;
      const expiresAt = new Date(expiry);
      if (expiresAt < new Date()) return "Expired";
      return `Expires ${formatDistanceToNow(expiresAt, { addSuffix: true })}`;
    }
    return null;
  })();

  function handleSend() {
    startTransition(async () => {
      await sendForSigning(contract.id);
    });
  }

  function handleVoid() {
    const reason = window.prompt("Reason for voiding this contract?");
    if (reason === null) return; // cancelled
    startTransition(async () => {
      await voidContract(contract.id, reason || "Voided by user");
    });
  }

  function handleResend() {
    if (!activeSigner) return;
    startTransition(async () => {
      await resendSigningLink(activeSigner.id);
    });
  }

  function handleDownload() {
    setDownloadError(null);
    startTransition(async () => {
      const result = await downloadSignedPdf(contract.id);
      if ("error" in result) {
        setDownloadError(result.error);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    });
  }

  const createdDate = contract.createdAt
    ? formatDate(contract.createdAt)
    : "—";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-4 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">
            {CONTRACT_TYPE_LABELS[contract.contractType] ?? contract.contractType}
          </span>
          <ContractStatusBadge status={contract.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {counterparty} &middot; Created {createdDate}
        </p>
        {expirationLabel && (
          <p className="text-xs flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            {expirationLabel}
          </p>
        )}
        {downloadError && (
          <p className="text-xs text-destructive">{downloadError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Download Signed PDF — executed contracts only */}
        {isExecuted && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isPending}
            className="h-7 text-xs"
          >
            <Download className="h-3 w-3 mr-1" />
            Download PDF
          </Button>
        )}

        {/* Preview PDF — always available */}
        <a
          href={`/api/contracts/${contract.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          <Eye className="h-3 w-3" />
          PDF
        </a>

        {canSend && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSend}
            disabled={isPending}
            className="h-7 text-xs"
          >
            <Send className="h-3 w-3 mr-1" />
            Send
          </Button>
        )}

        {canResend && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isPending || !activeSigner}
            className="h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Resend
          </Button>
        )}

        {canVoid && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleVoid}
            disabled={isPending}
            className="h-7 text-xs text-destructive hover:text-destructive hover:border-destructive/50"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Void
          </Button>
        )}
      </div>
    </div>
  );
}
