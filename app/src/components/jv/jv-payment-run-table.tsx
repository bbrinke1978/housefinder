"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markMilestonesPaid } from "@/lib/jv-actions";
import type { JvPaymentRunPartner } from "@/lib/jv-queries";

interface JvPaymentRunTableProps {
  partners: JvPaymentRunPartner[];
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const MILESTONE_LABELS: Record<string, string> = {
  qualified: "Qualified Lead",
  active_follow_up: "Active Follow-Up",
  deal_closed: "Deal Closed",
};

function getMilestoneLabel(type: string): string {
  return MILESTONE_LABELS[type] ?? type;
}

interface PartnerCardProps {
  partner: JvPaymentRunPartner;
}

function PartnerCard({ partner }: PartnerCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Checkbox state: milestone id → checked
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(partner.unpaidMilestones.map((m) => m.id))
  );

  // Payment method state: pre-fill from user profile if available
  const [paymentMethod, setPaymentMethod] = useState(partner.jvPaymentMethod ?? "");

  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  if (partner.unpaidTotalCents === 0 || paid) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 print:border print:border-green-300">
        <div className="flex items-center gap-3">
          <span className="text-green-600 font-semibold text-lg">&#10003;</span>
          <div>
            <p className="font-semibold text-sm">{partner.name}</p>
            <p className="text-xs text-muted-foreground">{partner.email}</p>
          </div>
          <span className="ml-auto text-sm text-green-700 font-medium">Paid in full this month</span>
        </div>
      </div>
    );
  }

  const selectedIds = partner.unpaidMilestones
    .filter((m) => checkedIds.has(m.id))
    .map((m) => m.id);
  const selectedTotal = partner.unpaidMilestones
    .filter((m) => checkedIds.has(m.id))
    .reduce((sum, m) => sum + m.amountCents, 0);

  function toggleAll() {
    if (checkedIds.size === partner.unpaidMilestones.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(partner.unpaidMilestones.map((m) => m.id)));
    }
  }

  function toggleOne(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleMarkPaid() {
    if (selectedIds.length === 0) return;
    if (!paymentMethod.trim()) {
      setError("Payment method is required before marking paid.");
      return;
    }
    const confirmed = window.confirm(
      `Mark ${selectedIds.length} milestone(s) paid (${formatDollars(selectedTotal)}) via "${paymentMethod}" for ${partner.name}?`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await markMilestonesPaid({
          milestoneIds: selectedIds,
          paymentMethod: paymentMethod.trim(),
        });
        setPaid(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to mark milestones paid.");
      }
    });
  }

  const allChecked = checkedIds.size === partner.unpaidMilestones.length;

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-semibold text-base">{partner.name}</p>
          <p className="text-sm text-muted-foreground">{partner.email}</p>
          {!partner.isActive && (
            <span className="text-xs text-orange-600 font-medium">(inactive)</span>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatDollars(partner.unpaidTotalCents)}</p>
          <p className="text-xs text-muted-foreground">unpaid total</p>
        </div>
      </div>

      {/* Milestone list */}
      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-8 p-2 text-center print:hidden">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="cursor-pointer print:hidden"
                  aria-label="Select all milestones"
                />
              </th>
              <th className="p-2 text-left font-medium text-muted-foreground">Address</th>
              <th className="p-2 text-left font-medium text-muted-foreground whitespace-nowrap">Type</th>
              <th className="p-2 text-right font-medium text-muted-foreground whitespace-nowrap">Amount</th>
              <th className="p-2 text-right font-medium text-muted-foreground whitespace-nowrap">Earned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {partner.unpaidMilestones.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30">
                <td className="p-2 text-center print:hidden">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(m.id)}
                    onChange={() => toggleOne(m.id)}
                    className="cursor-pointer print:hidden"
                    aria-label={`Select milestone for ${m.address}`}
                  />
                </td>
                <td className="p-2 font-medium">{m.address}</td>
                <td className="p-2 text-muted-foreground whitespace-nowrap">
                  {getMilestoneLabel(m.milestoneType)}
                </td>
                <td className="p-2 text-right font-medium text-green-700">
                  {formatDollars(m.amountCents)}
                </td>
                <td className="p-2 text-right text-muted-foreground whitespace-nowrap">
                  {m.earnedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment method + actions */}
      <div className="flex items-end gap-3 flex-wrap print:hidden">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1" htmlFor={`pm-${partner.userId}`}>
            Payment method
          </label>
          <input
            id={`pm-${partner.userId}`}
            type="text"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="e.g. Venmo, Zelle, Check"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={handleMarkPaid}
          disabled={isPending || selectedIds.length === 0 || !paymentMethod.trim()}
          className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-semibold hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPending ? "Marking paid..." : `Mark ${formatDollars(selectedTotal)} paid`}
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted whitespace-nowrap"
          type="button"
        >
          Print summary
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 print:hidden">{error}</p>
      )}
    </div>
  );
}

export function JvPaymentRunTable({ partners }: JvPaymentRunTableProps) {
  const partnersWithBalance = partners.filter((p) => p.unpaidTotalCents > 0);
  const partnersAllPaid = partners.filter((p) => p.unpaidTotalCents === 0);

  if (partners.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">No JV partners found.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add JV partner accounts in{" "}
          <a href="/admin/users" className="underline">
            /admin/users
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          button, input[type="checkbox"] { display: none !important; }
          body { background: white; }
        }
      `}</style>

      <div className="space-y-4">
        {partnersWithBalance.map((partner) => (
          <PartnerCard key={partner.userId} partner={partner} />
        ))}
        {partnersAllPaid.map((partner) => (
          <PartnerCard key={partner.userId} partner={partner} />
        ))}
      </div>
    </>
  );
}
