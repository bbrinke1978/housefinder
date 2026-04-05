"use client";

import Link from "next/link";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { DealWithBuyer, DealStatus } from "@/types";

const STATUS_BADGE: Record<DealStatus, string> = {
  lead: "bg-muted text-muted-foreground",
  qualified: "bg-primary/10 text-primary",
  analyzed: "bg-primary/10 text-primary",
  offered: "bg-primary/15 text-primary",
  under_contract: "bg-amber-500/10 text-amber-500",
  marketing: "bg-orange-500/10 text-orange-500",
  assigned: "bg-amber-500/10 text-amber-500",
  closing: "bg-emerald-500/10 text-emerald-500",
  closed: "bg-emerald-500/15 text-emerald-600",
  dead: "bg-muted text-muted-foreground",
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
  coverPhotos?: Record<string, string>;
}

export function DealList({ deals, coverPhotos = {} }: DealListProps) {
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
            <tr key={deal.id} className="hover:bg-accent transition-colors min-h-[44px]">
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <div className="shrink-0 h-9 w-9 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                    {coverPhotos[deal.id] ? (
                      <Image
                        src={coverPhotos[deal.id]}
                        alt="Cover"
                        width={36}
                        height={36}
                        className="h-9 w-9 object-cover"
                      />
                    ) : (
                      <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/deals/${deal.id}`}
                      className="hover:underline font-medium"
                    >
                      {deal.address}
                    </Link>
                    <p className="text-xs text-muted-foreground">{deal.city}</p>
                  </div>
                </div>
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
