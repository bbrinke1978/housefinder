"use client";

import Link from "next/link";
import type { WholesaleLeadWithWholesaler } from "@/types";

interface WholesaleLeadCardProps {
  lead: WholesaleLeadWithWholesaler;
  onClick?: () => void;
}

function fmtCompact(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtProfit(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

interface VerdictBadgeProps {
  verdict: string | null;
  score: number | null;
}

function VerdictBadge({ verdict, score }: VerdictBadgeProps) {
  if (!verdict) return null;

  const config = {
    green: { dot: "bg-green-500", bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Strong Deal" },
    yellow: { dot: "bg-yellow-500", bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Marginal" },
    red: { dot: "bg-red-500", bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Pass" },
  }[verdict] ?? { dot: "bg-muted-foreground", bg: "bg-muted border-border", text: "text-muted-foreground", label: verdict };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
      {score !== null && <span className="opacity-70">· {score}/10</span>}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const labels: Record<string, string> = {
    new: "New",
    analyzing: "Analyzing",
    interested: "Interested",
    pass: "Pass",
    promoted: "Promoted",
  };

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      {labels[status] ?? status}
    </span>
  );
}

export function WholesaleLeadCard({ lead, onClick }: WholesaleLeadCardProps) {
  const profit =
    lead.mao !== null && lead.askingPrice !== null
      ? lead.mao - lead.askingPrice
      : null;

  return (
    <Link
      href={`/wholesale/${lead.id}`}
      onClick={onClick}
      className="block rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow p-4 relative"
    >
      {/* Status badge — top right */}
      <div className="absolute top-3 right-3">
        <StatusBadge status={lead.status} />
      </div>

      {/* Address */}
      <p className="font-bold text-sm leading-tight truncate pr-20">{lead.address}</p>
      {(lead.city || lead.state) && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {[lead.city, lead.state].filter(Boolean).join(", ")}
        </p>
      )}

      {/* Prices row */}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          Asking: <span className="font-medium text-foreground">{fmtCompact(lead.askingPrice)}</span>
        </span>
        <span className="text-border">|</span>
        <span>
          ARV: <span className="font-medium text-foreground">{fmtCompact(lead.arv)}</span>
        </span>
      </div>

      {/* Verdict badge */}
      <div className="mt-2">
        <VerdictBadge verdict={lead.verdict} score={lead.dealScore} />
      </div>

      {/* Profit estimate */}
      {profit !== null && (
        <p className={`mt-2 text-xl font-bold tabular-nums ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
          {fmtProfit(profit)}
          <span className="text-xs font-normal text-muted-foreground ml-1">spread</span>
        </p>
      )}

      {/* Wholesaler name */}
      <p className="mt-2 text-xs text-muted-foreground">
        {lead.wholesalerName ?? "Manual entry"}
      </p>
    </Link>
  );
}
