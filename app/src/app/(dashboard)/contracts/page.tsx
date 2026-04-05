import Link from "next/link";
import { FileText } from "lucide-react";
import { getAllContracts } from "@/lib/contract-queries";
import { ContractStatusBadge } from "@/components/contract-status-badge";
import type { ContractWithSigners, ContractLifecycleStatus } from "@/types";

export const dynamic = "force-dynamic";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  purchase_agreement: "Purchase Agreement",
  assignment: "Assignment",
};

const ACTIVE_STATUSES: ContractLifecycleStatus[] = [
  "draft",
  "sent",
  "seller_signed",
  "countersigned",
];

function ContractRow({ contract }: { contract: ContractWithSigners }) {
  const counterparty =
    contract.signers.find((s) => s.signerOrder === 1)?.signerName ??
    contract.sellerName ??
    contract.buyerName ??
    "—";

  const createdDate = contract.createdAt
    ? new Date(contract.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const sentDate = contract.sentAt
    ? new Date(contract.sentAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const executedDate = contract.executedAt
    ? new Date(contract.executedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link
      href={`/deals/${contract.dealId}?tab=financials`}
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium group-hover:text-primary transition-colors">
            {contract.propertyAddress}
          </span>
          <span className="text-xs text-muted-foreground">{contract.city}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{CONTRACT_TYPE_LABELS[contract.contractType] ?? contract.contractType}</span>
          <span>&middot;</span>
          <span>{counterparty}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <ContractStatusBadge status={contract.status} />
        <div className="text-right text-xs text-muted-foreground hidden sm:block">
          {executedDate ? (
            <span>Executed {executedDate}</span>
          ) : sentDate ? (
            <span>Sent {sentDate}</span>
          ) : (
            <span>Created {createdDate}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ContractSection({
  title,
  contracts,
}: {
  title: string;
  contracts: ContractWithSigners[];
}) {
  if (contracts.length === 0) return null;
  return (
    <div className="space-y-1">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2">
        {title} ({contracts.length})
      </h2>
      <div className="rounded-xl border divide-y">
        {contracts.map((contract) => (
          <ContractRow key={contract.id} contract={contract} />
        ))}
      </div>
    </div>
  );
}

export default async function ContractsPage() {
  const allContracts = await getAllContracts();

  const active = allContracts.filter((c) =>
    (ACTIVE_STATUSES as string[]).includes(c.status)
  );
  const executed = allContracts.filter((c) => c.status === "executed");
  const terminal = allContracts.filter(
    (c) => c.status === "expired" || c.status === "voided" || c.status === "amended"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl h-44 md:h-48 animate-fade-in">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-wide">CONTRACTS</span>
          </div>
          <p className="text-white/70 text-sm">
            Manage purchase agreements and assignments across all your deals.
          </p>
        </div>
      </div>

      {/* Empty state */}
      {allContracts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 rounded-xl border border-dashed">
          <FileText className="h-10 w-10 text-muted-foreground/30" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No contracts yet</p>
            <p className="text-xs text-muted-foreground">
              Create one from a deal&apos;s Financials tab.
            </p>
          </div>
          <Link
            href="/deals"
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            Go to Deals
          </Link>
        </div>
      )}

      {/* Contract sections */}
      {allContracts.length > 0 && (
        <div className="space-y-6 animate-fade-in-up">
          <ContractSection title="Active" contracts={active} />
          <ContractSection title="Executed" contracts={executed} />
          <ContractSection title="Expired / Voided" contracts={terminal} />
        </div>
      )}
    </div>
  );
}
