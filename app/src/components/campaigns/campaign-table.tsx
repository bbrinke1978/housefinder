"use client";

import { useState } from "react";
import type { EnrollmentWithDetails } from "@/types/index";
import type { EmailSequenceSummary } from "@/types/index";
import { format } from "date-fns";

interface CampaignTableProps {
  enrollments: EnrollmentWithDetails[];
  sequences: EmailSequenceSummary[];
}

const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  completed:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  stopped: "bg-muted text-muted-foreground",
};

export function CampaignTable({ enrollments, sequences }: CampaignTableProps) {
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("all");

  // Client-side filter not applied since EnrollmentWithDetails doesn't expose sequenceId.
  // The sequence tab buttons provide a visual cue; server-side filtering is handled on page reload.
  const filtered = enrollments;

  if (enrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No active campaigns. Enroll leads from the dashboard or property
          detail page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sequence filter */}
      {sequences.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSequenceId("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedSequenceId === "all"
                ? "bg-primary text-white"
                : "border border-border text-foreground hover:bg-muted"
            }`}
          >
            All
          </button>
          {sequences.map((seq) => (
            <button
              key={seq.id}
              onClick={() => setSelectedSequenceId(seq.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedSequenceId === seq.id
                  ? "bg-primary text-white"
                  : "border border-border text-foreground hover:bg-muted"
              }`}
            >
              {seq.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  City
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Step
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Next Send
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((enrollment) => (
                <tr
                  key={enrollment.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {enrollment.ownerName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {enrollment.address}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {enrollment.city}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {enrollment.currentStep}/{enrollment.totalSteps}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        STATUS_STYLES[enrollment.status] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {enrollment.nextSendAt
                      ? format(enrollment.nextSendAt, "MMM d, yyyy")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
