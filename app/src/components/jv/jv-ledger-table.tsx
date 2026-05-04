"use client";

import type { JvLedgerLead } from "@/lib/jv-queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const MILESTONE_LABELS: Record<string, string> = {
  qualified: "Qualified ($10)",
  active_follow_up: "Active Follow-Up ($15)",
  deal_closed: "Deal Closed ($500)",
};

const STATUS_PILL: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

// ---------------------------------------------------------------------------
// JvLedgerTable
// ---------------------------------------------------------------------------

interface JvLedgerTableProps {
  leads: JvLedgerLead[];
}

export function JvLedgerTable({ leads }: JvLedgerTableProps) {
  // Compute global summary totals
  const totalCurrentMonthOwed = leads.reduce(
    (sum, l) => sum + l.currentMonthOwedCents,
    0
  );
  const totalLifetimeEarned = leads.reduce(
    (sum, l) => sum + l.earnedTotalCents,
    0
  );
  const totalLifetimePaid = leads.reduce(
    (sum, l) => sum + l.paidTotalCents,
    0
  );

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No leads submitted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          This Month Owed
        </p>
        <p className="text-3xl font-bold tabular-nums">
          {formatDollars(totalCurrentMonthOwed)}
        </p>
        <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
          <span>
            Lifetime earned:{" "}
            <span className="font-medium text-foreground">
              {formatDollars(totalLifetimeEarned)}
            </span>
          </span>
          <span>
            Lifetime paid:{" "}
            <span className="font-medium text-foreground">
              {formatDollars(totalLifetimePaid)}
            </span>
          </span>
        </div>
      </div>

      {/* Lead cards */}
      {leads.map((lead) => (
        <LeadCard key={lead.jvLeadId} lead={lead} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LeadCard — per-lead milestone breakdown
// ---------------------------------------------------------------------------

function LeadCard({ lead }: { lead: JvLedgerLead }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{lead.address}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted {formatDate(lead.submittedAt)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_PILL[lead.status] ?? ""}`}
          >
            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
          </span>
          {lead.earnedTotalCents > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDollars(lead.earnedTotalCents)} earned
            </span>
          )}
        </div>
      </div>

      {/* Rejected reason */}
      {lead.status === "rejected" && lead.rejectedReason && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded px-2 py-1.5">
          Reason: {lead.rejectedReason}
        </p>
      )}

      {/* Photo thumbnail */}
      {lead.photoSasUrl && (
        <a
          href={lead.photoSasUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-24 h-16 overflow-hidden rounded border border-border"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lead.photoSasUrl}
            alt="Property photo"
            className="w-full h-full object-cover"
          />
        </a>
      )}

      {/* Milestone list — only shown for accepted leads */}
      {lead.status === "accepted" && (
        <div className="space-y-1.5">
          {(["qualified", "active_follow_up", "deal_closed"] as const).map(
            (type) => {
              const milestone = lead.milestones.find((m) => m.type === type);
              return (
                <div
                  key={type}
                  className="flex items-center justify-between text-sm gap-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={milestone ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                      {milestone ? "✓" : "○"}
                    </span>
                    <span className={milestone ? "text-foreground" : "text-muted-foreground"}>
                      {MILESTONE_LABELS[type]}
                    </span>
                  </div>
                  {milestone ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(milestone.earnedAt)}
                      </span>
                      {milestone.paidAt ? (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded-full font-medium">
                          Paid {formatDate(milestone.paidAt)}
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                          Pending payment
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground flex-shrink-0">—</span>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
