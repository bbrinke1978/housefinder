"use client";

import Link from "next/link";
import type { DealWithBuyer, DealStatus } from "@/types";

const STATUS_BADGE: Record<DealStatus, string> = {
  lead: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  qualified: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  analyzed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  offered: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  under_contract: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  marketing: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  assigned: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  closing: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  closed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  dead: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABELS: Record<DealStatus, string> = {
  lead: "Lead",
  qualified: "Qualified",
  analyzed: "Analyzed",
  offered: "Offered",
  under_contract: "Under Contract",
  marketing: "Marketing",
  assigned: "Assigned",
  closing: "Closing",
  closed: "Closed",
  dead: "Dead",
};

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString()}`;
}

interface DealListProps {
  deals: DealWithBuyer[];
}

export function DealList({ deals }: DealListProps) {
  if (deals.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No deals yet.{" "}
        <Link href="/deals/new" className="underline hover:no-underline">
          Create your first deal
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Address</th>
            <th className="pb-2 pr-4 font-medium hidden sm:table-cell">Seller</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium hidden md:table-cell text-right">ARV</th>
            <th className="pb-2 pr-4 font-medium hidden md:table-cell text-right">MAO</th>
            <th className="pb-2 pr-4 font-medium hidden lg:table-cell text-right">Offer</th>
            <th className="pb-2 font-medium hidden lg:table-cell">Closing</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {deals.map((deal) => (
            <tr key={deal.id} className="hover:bg-muted/30 transition-colors">
              <td className="py-2.5 pr-4">
                <Link
                  href={`/deals/${deal.id}`}
                  className="hover:underline font-medium"
                >
                  {deal.address}
                </Link>
                <p className="text-xs text-muted-foreground">{deal.city}</p>
              </td>
              <td className="py-2.5 pr-4 hidden sm:table-cell text-muted-foreground">
                {deal.sellerName ?? "—"}
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_BADGE[deal.status as DealStatus] ?? STATUS_BADGE.lead
                  }`}
                >
                  {STATUS_LABELS[deal.status as DealStatus] ?? deal.status}
                </span>
              </td>
              <td className="py-2.5 pr-4 hidden md:table-cell text-right text-muted-foreground">
                {formatCurrency(deal.arv)}
              </td>
              <td className="py-2.5 pr-4 hidden md:table-cell text-right text-muted-foreground">
                {formatCurrency(deal.mao)}
              </td>
              <td className="py-2.5 pr-4 hidden lg:table-cell text-right font-medium">
                {formatCurrency(deal.offerPrice)}
              </td>
              <td className="py-2.5 hidden lg:table-cell text-muted-foreground">
                {deal.closingDate ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
