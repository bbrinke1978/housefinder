"use client";

import { useTransition } from "react";
import { updateLeadStatus } from "@/lib/actions";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow Up" },
  { value: "closed", label: "Closed" },
  { value: "dead", label: "Dead" },
];

interface InboundLeadStatusSelectProps {
  leadId: string;
  currentStatus: string;
}

export function InboundLeadStatusSelect({ leadId, currentStatus }: InboundLeadStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;

    startTransition(async () => {
      await updateLeadStatus(leadId, newStatus);
    });
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
